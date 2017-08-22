"use strict";

const readline = require('readline-sync');
const ws = require('ws');

class GPMClient {
  constructor(bot, config) {
    this._bot = bot;
    this._config = config;

    this._gpmClient = new ws(config.gpm.uri);

    this._setupHandlers();

    this._requests = [];
    this._nextRequest = 1;
  }

  _setupHandlers() {
    this._gpmClient.on('open', () => {
      this._sendControlRequest('');
      this._bot.connectTMI();
    });

    this._gpmClient.on('close', () => this._bot.disconnectTMI());

    this._gpmClient.on('message', (data, flags) => {
      const message = JSON.parse(data);
      this._handleMessage(message);
    });
  }

  _handleMessage(message) {
    switch(message.channel) {
    case 'connect':
      var code = '';
      if (message.payload === 'CODE_REQUIRED') {
        code = this._promptAuthCode();
      }
      else if (message.payload) {
        config.gpm.token = message.payload;
        console.log('Your token is ' + config.gpm.token);
        console.log('Save this value to config.gpm.token.');
      }
      this._sendControlRequest(code);
      break;

    case 'track':
      this._handleTrackChange(message.payload);
      break;

    case 'playState':
      this._handlePlayState(message.payload);

    default:
      if (message.namespace === 'result') {
        this._handleResponse(message.requestID, message.value);
      }
    }
  }

  _sendControlRequest(code) {
    let token = code;
    if (token === '' && this._config.gpm.token) {
        token = this._config.gpm.token;
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
          this._removeRequest(request);
          reject(new Error('Timeout'));
        }

        if (request.response !== null) {
          clearInterval(waitForResponse);
          this._removeRequest(request);
          if (request.response instanceof Error) {
            reject(request.response);
          }
          else {
            resolve(request);
          }
        }
      }, 100);
    });
  }

  _removeRequest(request) {
    delete this._requests[request.ID];
  }

  _createRequest(requestSource) {
    return {
      requestID: requestSource.ID,
      namespace: requestSource.namespace,
      method: requestSource.method,
      arguments: requestSource.arguments
    }
  }

  _handlePlayState(playing) {
    this._bot.playing = playing;
    if (!playing) {
      this._bot.writeSong('');
    }
    else {
      this._bot.updateSong(this._bot.currentSong);
    }
  }

  _handleTrackChange(data) {
    this._bot.updateSong(data);

    if (this._bot.nextInQueue() === null) {
      // nothing to do!
      return;
    }

    let nextTrack = this._bot.nextInQueue();
    if (nextTrack) {
      if (data.title.toLowerCase() === nextTrack.title.toLowerCase() &&
          data.artist.toLowerCase() === nextTrack.artist.toLowerCase()) {
        // currently playing is first on queue. remove it.
        this._bot.dequeue();
      }
    }

    // if there's a song still on the queue, make it next up
    if (this._bot.nextInQueue()) {
      nextTrack = this._bot.nextInQueue();
      this._bot.playNext(nextTrack.title + ' ' + nextTrack.artist);
    }
  }

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

  playNext(track) {
    this._sendRequest('search', 'playTrackNext', [track]);
  }
}

module.exports = GPMClient;
