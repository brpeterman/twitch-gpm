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

Initially, you won't have a GPMDP token. The first time you start the bot, it will ask GPMDP for authorization. GPMDP will show a four-digit code on screen; enter this code into the bot's console when prompted. The bot will then output a token (it will look like a random string of characters); save this value to `config.gpm.token`.

You can get your Twitch OAuth token here (make sure to log in as your bot): http://www.twitchapps.com/tmi/

## Twitch commands

* !help - Display commands
* !song - Search for a song to play and queue it up

