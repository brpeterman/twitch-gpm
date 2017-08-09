"use strict";

const ws = require('ws');

class WSServer {
  constructor(bot, config) {
    this._config = config;
    this._bot = bot;

    this._wsServer = new ws.Server({port: config.websocket.port});

    this._setupSubscriptions();
    this._setupHandlers();

    this._clientID = 0;
    this._clients = [];
  }

  _setupHandlers() {
    const server = this;
    this._wsServer.on('connection', (ws) => {
      let clientID = ++server._clientID;
      server._clients[clientID] = ws;
      ((id) => {
        ws.on('message', (data, flags) => server._handleMessage(id, JSON.parse(data)));
        ws.on('close', (code, message) => server._removeClient(id));
      })(clientID);
    });
  }

  _setupSubscriptions() {
    this._subscriptions = [];

    for (let command in this._bot.getCommands()) {
      this._subscriptions[command] = [];
    }
  }

  _handleMessage(clientID, message) {
    switch(message.action) {
    case 'subscribe':
      this._handleSubscribe(clientID, message.event);
      break;
    case 'unsubscribe':
      this._handleUnsubscribe(clientID, message.event);
      break;
    case 'getQueue':
      this._handleGetQueue(clientID, message.arguments);
      break;
    case 'getPlaying':
      this._handleGetPlaying(clientID);
      break;
    }
  }

  _removeClient(clientID) {
    this._purgeSubscriptions(clientID);
    delete this._clients[clientID];
  }

  _purgeSubscriptions(clientID) {
    for (let eventType in this._subscriptions) {
      this._unsubscribe(clientID, eventType);
    }
  }

  _handleSubscribe(clientID, eventType) {
    const sub = this._subscriptions[eventType];
    if (!sub) return;

    sub[clientID] = this._clients[clientID];
  }

  _handleUnsubscribe(clientID, eventType) {
    this._unsubscribe(clientID, eventType);
  }

  _unsubscribe(clientID, eventType) {
    const sub = this._subscriptions[eventType];
    if (!sub) return;

    if (sub[clientID]) {
      delete sub[clientID];
    }
  }

  _handleGetQueue(clientID, args) {
    const ws = this._clients[clientID];

    const reply = {
      action: 'getQueue',
      value: this._bot.getQueue()
    };
    ws.send(JSON.stringify(reply));
  }

  _handleGetPlaying(clientID) {
    const ws = this.clients[clientID];

    const reply = {
      action: 'getPlaying',
      value: this._bot.nowPlaying()
    }
    ws.send(JSON.stringify(reply));
  }

  _alertSubscribers(eventType, channel, user, args) {
    const data = {
      event: eventType,
      channel: channel,
      user: user['display-name'],
      arguments: args
    }
    const sub = this._subscriptions[eventType];
    for (let client in sub) {
      let ws = sub[client];
      if (ws) {
        ws.send(JSON.stringify(data));
      }
    }
  }

  handleUserEvent(eventType, channel, user, args) {
    this._alertSubscribers(eventType, channel, user, args);
  }
}

module.exports = WSServer;
