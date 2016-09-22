# twitch-gpm

This is a NodeJS bot for Twitch. It controls an instance of [Google Play Music Desktop Player](https://github.com/MarshallOfSound/Google-Play-Music-Desktop-Player-UNOFFICIAL-) on the host's machine.

## Configuration

Create a file called `config.js` with the following contents:

```javascript
config = {};

config.gpm = {};
config.twitch = {};

config.gpm.uri = 'ws://url:port'; // URI of your music player's websocket interface 
config.gpm.token = 'token'; // Token granted to your app by GPMPD

config.twitch.username = 'MyBot'; // Bot's Twitch username
config.twitch.token = 'oauth:secrettoken'; // Your bot's twitch OAuth token
config.twitch.channels = ['MyChannel']; // Channels to join

module.exports = config;
```

Unfortunately, this application is not able to request a token from Google Play Music Desktop Player. You'll have to handle that yourself. The application name is `twitch-gpm`.

## Twitch commands

* !help - Display commands
* !song - Search for a song to play and queue it up

