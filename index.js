#!/usr/bin/env node

var irc = require('irc')
var minimist = require('minimist')
var hypercore = require('hypercore')
var discovery = require('hyperdiscovery')
var extend = require('xtend')
var prettyTime = require('pretty-time')

var argv = minimist(process.argv.slice(2), {
  alias: {
    tail: 'key',
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
var feed = hypercore(argv.cwd, argv.key, {valueEncoding: 'json'})
feed.ready(function () {
  discovery(feed, {live: true})
  console.log(`Sharing feed ${feed.key.toString('hex')}`)
  if (argv.channel || argv.echoChannel) joinIrc()
})

function joinIrc () {
  var channels = []
  if (argv.channel) channels.push(argv.channel)
  if (argv.echoChannel) channels.push(argv.echoChannel)
  console.log(channels)
  var ircOpts = extend({}, argv, {
    channels: channels,
    retryCount: 1000,
    autoRejoin: true
  })
  ircOpts.port = argv.ircPort

  console.log('Connecting to IRC', argv.server, 'as', argv.name)
  client = new irc.Client(argv.server, argv.name, ircOpts)

  client.on('registered', function (msg) {
    console.log('Connected to IRC, listening for messages')
  })

  client.on('error', function (err) {
    console.error('IRC Error', err)
  })

  if (argv.echoChannel) {
    if (!argv.tail) echoFeed()
    feed.on('sync', echoFeed) // do not echo old data
  }

  if (argv.channel) {
    client.on('message', function (from, to, message) {
      var op = parse(message, from)
      var channel = (to === argv.name) ? from : argv.channel
      if (!op) {
        if (message.indexOf('!standup') === -1) return
        var err = new Error('Could not parse standup message.')
        return sendMessage(err, channel)
      }
      switch (op.command) {
        case 'standup':
          delete op.command // don't need this in our hypercore feed
          feed.append(op, function (err) {
            if (err) return sendMessage(err, channel)
          })
          return
        case 'status':
          return status(function (err, msg) {
            sendMessage(err, channel, msg)
          })
        default:
          console.error(op, 'bad command')
          // sendMessage(new Error('Did not understand your command. Sad beep boop.'), channel)
          return
      }
    })
  }
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

function echoFeed () {
  feed.createReadStream({live: true, start: feed.length})
    .on('data', function (data) {
       // Echo to our standup channel
      sendMessage(null, argv.echoChannel, `${data.person}: ${data.standup}`)
    })
}

function parse (message, from) {
  message = message.trim()

  if (message[0] !== '!') return // Only want ! command

  message = message.slice(1)
  if (message.indexOf(' ') === -1) return {command: message, standup: null}
  var parts = message.split(' ')
  return {
    time: new Date().toUTCString(),
    command: parts.shift(),
    standup: parts.join(' '),
    person: from
  }
}
