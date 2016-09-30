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

