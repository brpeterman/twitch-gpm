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

    const action = this._bot.getActionForCommand(command);
    if (action) {
      this._bot.raiseEvent(command, channel, user, args);
      const handler = action.handler;
      if (handler) {
        handler.call(this, this._bot, channel, user, args);
      }
    }
  }

  /*
    These functions are wrappers for the actual TMI client.
  */

  connect() {
    this._tmiClient.connect();
  }

  disconnect() {
    this._tmiClient.disconnect();
  }

  say(channel, message) {
    this._tmiClient.say(channel, message);
  }
}

module.exports = TMIClient;
