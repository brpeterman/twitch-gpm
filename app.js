"use strict";

const tmi = require('tmi.js');
const ws = require('ws');
const readline = require('readline-sync');
const Promise = require('bluebird');
const config = require('./config.js');

Promise.longStackTraces();

class TwitchGPM {
  constructor() {
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
    this._gpmClient = new ws(config.gpm.uri);

    this._registerCommands();
    this._setupQueue();
    this._setupGPMHandlers();
    this._setupTMIHandlers();

    this._requests = [];
    this._nextRequest = 1;
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
      }
    };
  }

  _setupQueue() {
    this._queue = [];
  }

  _setupGPMHandlers() {
    this._gpmClient.on('open', () => {
      this._sendControlRequest('');
      this._tmiClient.connect();
    });

    this._gpmClient.on('close', () => this._tmiClient.disconnect());

    this._gpmClient.on('message', (data, flags) => {
      const message = JSON.parse(data);
      this._handleWSMessage(message);
    });
  }

  _setupTMIHandlers() {
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
        const handler = action.handler;
        handler.call(this, channel, user, args);
    }
  }

  _handleWSMessage(message) {
    switch(message.channel) {
    case 'connect':
      console.log("Using _handleWSMessage");
      var code = '';
      if (message.payload === 'CODE_REQUIRED') {
        code = this._promptAuthCode();
      }
      else if (message.payload) {
        config.gpm.token = message.payload;
        console.log('Your token is ' + config.gpm.token);
        console.log('Save this value to config.gpm.token');
      }
      this._sendControlRequest(code);
      break;

    case 'track':
      this._handleTrackChange(message.payload);
      break;

    default:
      if (message.namespace === 'result') {
        this._handleResponse(message.requestID, message.value);
      }
    }
  }

  _sendControlRequest(code) {
    let token = code;
    if (token === '' && config.gpm.token) {
        token = config.gpm.token;
    }

    const app_auth = ['twitch-gpm'];
    if (token !== '') {
        app_auth[1] = token;
    }

    this._sendRequest('connect', 'connect', app_auth).catch((error) => {
      // A timeout here is perfectly normal, since a successful auth has no reply
      if (error instanceof Error && error.message !== 'Timeout') {
        console.log(error.stack);
      }
    });
  }

  _promptAuthCode() {
    return readline.question('Input 4-digit code from GPM: ');
  }

  _handleResponse(ID, value) {
    const request = this._requests[ID];
    if (!request) {
      return;
    }

    request.response = value;
  }

  _sendRequest(namespace, method, args, options, timeout) {
    if (!timeout || timeout < 0) timeout = 5000;

    const request = {
      ID: this._nextRequest,
      namespace: namespace,
      method: method,
      arguments: args,
      options: options,
      response: null,
      initiated: (new Date()).getTime()
    };

    return new Promise((resolve, reject) => {
      this._requests[this._nextRequest++] = request;
      const wsRequest = this._createRequest(request);
      this._gpmClient.send(JSON.stringify(wsRequest));
      const waitForResponse = setInterval(() => {
        if ((new Date()).getTime() - request.initiated > timeout) {
          clearInterval(waitForResponse);
          reject(new Error('Timeout'));
        }

        if (request.response !== null) {
          clearInterval(waitForResponse);
          if (request.response instanceof Error) {
            reject(request);
          }
          else {
            resolve(request);
          }
        }
      }, 100);
    });
  }

  _createRequest(requestSource) {
    return {
      requestID: requestSource.ID,
      namespace: requestSource.namespace,
      method: requestSource.method,
      arguments: requestSource.arguments
    }
  }

  _addToQueue(track) {
    this._queue.push({
      title: track.title,
      artist: track.artist
    });
    console.log('Queued: ' + track.title + ' by ' + track.artist);
  }

  _requestSong(channel, user, args) {
    const searchText = args.join(' ');
    this.findSong(searchText).then((track) => {
      this._tmiClient.say(channel, user['display-name'] + ', added ' + track.title + ' by ' + track.artist + '.');
      if (this._queue.length === 0) {
        this.playNext('', track);
      }
      this._addToQueue(track);
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

  _handleTrackChange(data) {
    if (this._queue.length === 0) {
      // nothing to do!
      return;
    }

    let nextTrack = this._queue[0];
    if (data.title.toLowerCase() === nextTrack.title.toLowerCase() &&
        data.artist.toLowerCase() === nextTrack.artist.toLowerCase()) {
      // currently playing is first on queue. remove it.
      this._queue.shift();
    }

    // if there's a song still on the queue, make it next up
    if (this._queue[0]) {
      nextTrack = this._queue[0];
      this.playNext(nextTrack.title + ' ' + nextTrack.artist);
    }
  }

  _displayHelp(channel, user, args) {
      let helpString = '';
      for (command in this.commands) {
          helpString += '!' + command + ' (' + this.commands[command].description + '), ';
      }
      helpString = helpString.slice(0, -2);
      this._tmiClient.say(channel, 'Commands: ' + helpString);
  }

  _displayNext(channel, user, args) {
    const nextSong = this._queue[0];
    if (nextSong) {
      this._tmiClient.say(channel, 'Next song: ' + nextSong.title + ' by ' + nextSong.artist);
    }
    else {
      this._tmiClient.say(channel, 'No songs are queued.');
    }
  }

  // if we're already on a search page, use track to pass the track directly
  playNext(searchTerm, track) {
    if (searchTerm === '' && !track) return;

    if (track) {
      this._sendRequest('search', 'playTrackNext', [track]);
    }
    else {
      this.findSong(searchTerm).then((foundTrack) => this._sendRequest('search', 'playTrackNext', [foundTrack]));
    }
  }

  // return a promise that resolves when we have a track reference
  findSong(searchTerm) {
    return this._sendRequest('search', 'performSearch', [searchTerm]).then((request) =>
      // Search doesn't return anything useful. We need to send a request for search results.
      this._sendRequest('search', 'getCurrentResults', null).then((getResultsRq) => {
        // Now we have useful results.
        let track = null;
        const results = getResultsRq.response;
        // if we have a "best match" and it's a track, use it
        if (results.bestMatch && results.bestMatch.type === 'track') {
          track = results.bestMatch.value;
        }
        // Otherwise pick the first track we found
        else {
          track = results.tracks[0];
        }

        if (!track) {
          return Promise.reject('failed to find a match');
        }

        return Promise.resolve(track);
      })
    ).then((result) => Promise.resolve(result)).catch((result) => Promise.reject(result));
  }
}

const bot = new TwitchGPM();
