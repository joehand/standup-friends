#!/usr/bin/env node

var irc = require('irc')
var minimist = require('minimist')
var hypercore = require('hypercore')
var discovery = require('hyperdiscovery')
var extend = require('xtend')
var prettyTime = require('pretty-time')

var argv = minimist(process.argv.slice(2), {
  alias: {
    channel: 'c',
    echoChannel: 'echo',
    cwd: 'd',
    server: 's',
    name: 'n',
    port: 'p',
    ircPort: 'irc-port'
  },
  default: {
    port: 3282,
    cwd: 'standup-data',
    name: 'standup-bot',
    server: 'irc.freenode.net'
  },
  boolean: []
})

var started = process.hrtime()
var client = null
var server = null
var feed = hypercore(argv.cwd, {valueEncoding: 'json'})
feed.ready(function () {
  discovery(feed, {live: true})
  console.log(`Sharing feed ${feed.key.toString('hex')}`)
})

if (argv.channel) {
  var ircOpts = extend({}, argv, {
    channels: [argv.channel, argv.echoChannel],
    retryCount: 1000,
    autoRejoin: true
  })
  ircOpts.port = argv.ircPort

  console.log('Connecting to IRC', argv.server, 'as', argv.name)
  client = new irc.Client(argv.server, argv.name, ircOpts)

  client.on('registered', function (msg) {
    console.log('Connected to IRC, listening for messages')
  })

  client.on('message', function (from, to, message) {
    var op = parse(message, from)
    if (!op) return
    var channel = (to === argv.name) ? from : argv.channel
    switch (op.command) {
      case 'standup':
        delete op.command // don't need this in our hypercore feed
        feed.append(op, function (err) {
          if (err) return sendMessage(err, channel)
          if (argv.echoChannel) {
            var msg = `${op.person}: ${op.standup}`
            // Echo to our standup channel
            return sendMessage(null, argv.echoChannel, msg)
          }
        })
        return
      case 'status':
        return status(function (err, msg) {
          sendMessage(err, channel, msg)
        })
      default:
        // sendMessage(new Error('Did not understand your command. Sad beep boop.'), channel)
        return
    }
  })
}

function sendMessage (err, channel, msg) {
  if (err) return client.say(channel, 'Error: ' + err.message)
  client.say(channel, msg)
}

function status (cb) {
  var msg = `Uptime: ${prettyTime(process.hrtime(started))},`
  if (feed.length) msg += ` Standups: ${feed.length},`
  msg += ` Key: ${feed.key.toString('hex')}`
  cb(null, msg)
}

function parse (message, from) {
  message = message.trim()

  if (message[0] === '!') {
    message = message.slice(1)
  } else {
    // TODO: what is this case?
    var name = (message.indexOf(':') > -1 ? message.split(':')[0] : '').trim().replace(/\d+$/, '')
    if (name !== argv.name) return null
  }

  message = message.split(':').pop().trim()
  if (message.indexOf(' ') === -1) return {command: message, standup: null}
  var parts = message.split(' ')
  return {
    time: new Date(), // TODO: local date
    command: parts.shift(),
    standup: parts.join(' '),
    person: from
  }
}
