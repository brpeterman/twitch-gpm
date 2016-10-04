"use strict";

const tmi = require('tmi.js');

class TMIClient {
  constructor(bot, config) {
    this._bot = bot;
    this._config = config;

    const tmi_options = {
      options: {
        debug: true
      },
      connection: {
        cluster: 'aws',
        reconnect: true
      },
      identity: {
        username: config.twitch.username,
        password: config.twitch.token
      },
      channels: config.twitch.channels
    };

    this._tmiClient = new tmi.client(tmi_options);

    this._setupHandlers();
    this._registerCommands();
  }

  _registerCommands() {
    this.commands = {
      'song': {
        description: 'Play song',
        handler: this._requestSong
      },
      'help': {
        description: 'Help',
        handler: this._displayHelp
      },
      'next': {
        description: 'Show next track in queue',
        handler: this._displayNext
      },
      'playing': {
        description: 'Show the currently playing song',
        handler: this._displayNowPlaying
      },
      'queue': {
        description: 'Display the song queue on-screen',
        handler: null
      }
    };
  }

  _setupHandlers() {
    this._tmiClient.on('chat', (channel, user, message, self) => {
      this._handleChat(channel, user, message, self);
    });
  }

  _handleChat(channel, user, message, self) {
    if (message.slice(0,1) !== '!') return;

    message = message.slice(1);
    const msg_tokens = message.split(' ');
    if (msg_tokens.length === 0) return;

    const command = msg_tokens[0].toLowerCase();
    const args = msg_tokens.slice(1);

    const action = this.commands[command];
    if (action) {
      this._bot.raiseEvent(command, channel, user, args);
      const handler = action.handler;
      if (handler) {
        handler.call(this, channel, user, args);
      }
    }
  }

  _requestSong(channel, user, args) {
    const searchText = args.join(' ');
    this._bot.findSong(searchText).then((track) => {
      this._tmiClient.say(channel, user['display-name'] + ', added ' + this._bot.songString(track) + '.');
      if (this._bot.queue.length === 0) {
        this._bot.playNext('', track);
      }
      this._bot.addToQueue(track);
    }).catch((msg) => {
      if (msg instanceof Error) {
        this._tmiClient.say(channel, user['display-name'] + ', there was an error processing your request.');
        console.log(msg.stack);
      }
      else {
        this._tmiClient.say(channel, user['display-name'] + ', ' + msg + '.');
      }
    });
  }

  _displayHelp(channel, user, args) {
    let helpString = '';
    let command = null;
    for (command in this.commands) {
        helpString += '!' + command + ' (' + this.commands[command].description + '), ';
    }
    helpString = helpString.slice(0, -2);
    this._tmiClient.say(channel, 'Commands: ' + helpString);
  }

  _displayNext(channel, user, args) {
    const nextSong = this._bot.queue[0];
    if (nextSong) {
      this._tmiClient.say(channel, 'Next song: ' + this._bot.songString(nextSong));
    }
    else {
      this._tmiClient.say(channel, 'No songs are queued.');
    }
  }

  _displayNowPlaying(channel, user, args) {
    const currentTrack = this._bot.nowPlaying();
    if (!currentTrack) {
      this._tmiClient.say(channel, 'No song currently playing');
    }
    else {
      this._tmiClient.say(channel, 'Now playing ' + this._bot.songString(currentTrack));
    }
  }

  connect() {
    this._tmiClient.connect();
  }

  disconnect() {
    this._tmiClient.disconnect();
  }
}

module.exports = TMIClient;
