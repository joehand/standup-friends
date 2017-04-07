# standup-friends

Echo standup messages to a dedicated channel and record them to a [hypercore](https://github.com/mafintosh/hypercore) feed.

[![npm][npm-image]][npm-url]
[![standard][standard-image]][standard-url]

* **Problem:** We have a #standup channel but we'd often get in discussion around standup items people posted and lose everyone's standup message.
* **Solution:** Keep all human messages in a single channel but have a bot echo standup messages to a dedicated channel and a hypercore feed.

For example, we have to channels `#general` and `#standup`:

In `#general` I'd add my standup message for the day:

```
!standup Building a standup bot this morning and then doing hyperdrive SLEEP work next.
```

And the bot would echo it to `#standup`:

```
standup-bot: jhand: Building a standup bot this morning and then doing hyperdrive SLEEP work next.
```

## Install

```
npm install -g standup-friends
```

## Usage

The bot takes messages in one channel `--channel` and echos them to another channel `echo`. This makes it easy to see all standup messages in on place while still allowing discussion in the main channel.

```
standup-friends --cwd=data --channel=#your-irc --echo=#standup-channel
```

Data will be stored in `cwd` via hypercore.

The command will print out a hypercore key. You can then view standup messages via [hyperpipe](https://github.com/mafintosh/hyperpipe):

```
npm install -g hyperpipe
hyperpipe standup-data <key>
```

### IRC Commands

```
!status
!standup building things
```

## License

[MIT](LICENSE.md)

[npm-image]: https://img.shields.io/npm/v/standup-friends.svg?style=flat-square
[npm-url]: https://www.npmjs.com/package/standup-friends
[travis-image]: https://img.shields.io/travis/joehand/standup-friends.svg?style=flat-square
[travis-url]: https://travis-ci.org/joehand/standup-friends
[standard-image]: https://img.shields.io/badge/code%20style-standard-brightgreen.svg?style=flat-square
[standard-url]: http://npm.im/standard
