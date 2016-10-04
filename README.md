# twitch-gpm

This is a NodeJS bot for Twitch. It controls an instance of [Google Play Music Desktop Player](https://github.com/MarshallOfSound/Google-Play-Music-Desktop-Player-UNOFFICIAL-) on the host's machine.

## Configuration

Create a file called `config.js` with the following contents:

```javascript
config = {};

config.gpm = {};
config.twitch = {};
config.nowplaying = {};
config.websocket = {};

config.gpm.uri = 'ws://url:port'; // URI of your music player's websocket interface 
config.gpm.token = 'token'; // Token granted to your app by GPMPD

config.twitch.username = 'MyBot'; // Bot's Twitch username
config.twitch.token = 'oauth:secrettoken'; // Your bot's twitch OAuth token
config.twitch.channels = ['MyChannel']; // Channels to join

config.nowplaying.output = '/path/to/output.txt'; // Bot will write the currently playing song to this file

config.websocket.port = portToListenOn;

module.exports = config;
```

To get your GPMDP token:
* Start up the bot with everything configured except for the token.
* GPMDP will show a four-digit code on screen. Enter this code into the bot's console when prompted.
* The bot will output a token (it will look like a random string of characters). Save this value to `config.gpm.token`.

To get a Twitch OAuth token:
* http://www.twitchapps.com/tmi/

## Twitch commands

* !help - Display commands
* !song - Search for a song to play and queue it up
* !next - Display the next song in the request queue
* !playing - Display the song that is currently playing
* !queue - Raise a 'queue' event. This has no effect in chat, but can be used by a client to display the queue somewhere.

## WebSocket API

The bot listens on a websocket port defined in the config file. Clients can connect to it an be notified when a user enters a command.

To subscribe to a command notification, a client should send a message like this:

```javascript
{
  action: 'subscribe',
  event: 'queue'
}
```

Now, whenever a user enters the `queue` command, the bot will send a message to your client:

```javascript
{
  event: 'queue',
  channel: '#myChannel',
  user: 'myUsername',
}
```

If you've subscribed to a command that takes arguments, the arguments will be included:

```javascript
{
  event: 'song'
  channel: '#myChannel',
  user: 'myUsername',
  arguments: [
    'list',
    'of',
    'tokens'
  ]
}
```

To unsubscribe from notifications, just send an `unsubscribe` action:

```javascript
{
  action: 'unsubscribe',
  event: 'queue'
}
```

Responses to actions with a return value will have this format:

```javascript
{
  action: 'actionYouRequested',
  value: returnValue
}
```

### Actions

#### subscribe

Opt in to notifications when a user enters a specified command.

Parameters:
* `event` - Event (from the commands list above) to subscribe to.

Returns:
* Nothing

#### unsubscribe

Opt out of a previously subscribed-to event.

Parameters:
* `event` - Event to unsubscribe from.

Returns:
* Nothing

#### getQueue

Get a list of the songs currently queued by users.

Parameters:
* None

Returns:
* `value` - an array of songs in the queue. Example:

```javascript
[
  {
    title: 'Song 1',
    artist: 'Artist 1'
  },
  {
    title: 'Song 2',
    artist: 'Artist 2'
  }
]
```

#### getPlaying

Get the song that is currently playing.

Parameters:
* None

Returns:
* `value` - An object containing the song title and artist. Example:

```javascript
{
  title: 'My Song',
  artist: 'My Artist'
}
```
