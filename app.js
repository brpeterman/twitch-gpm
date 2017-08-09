"use strict";

const ws = require('ws');
const Promise = require('bluebird');
const fs = require('fs');
const config = require('./config.js');
const tmiClient = require('./tmi-client.js');
const gpmClient = require('./gpm-client.js');
const wsServer = require('./ws-server.js');

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

    this._registerCommands();

    this.tmiClient = new tmiClient(this, config);
    this.gpmClient = new gpmClient(this, config);
    this._wsServer = new wsServer(this, config);

    this._setupQueue();

    this.currentSong = {};
    this.playing = false;
  }

  _setupQueue() {
    this._queue = [];
  }

  _registerCommands() {
    this._commands = [];

    let files = fs.readdirSync('./commands')

    for (let i in files) {
      let fileName = files[i];
      let commandName = fileName.split('.', 2)[0];
      this._commands[commandName] = require('./commands/' + fileName);
    }
  }

  getQueue() {
    return this._queue;
  }

  addToQueue(track) {
    this._queue.push({
      title: track.title,
      artist: track.artist
    });
    console.log('Queued: ' + this.songString(track));
  }

  dequeue() {
    return this._queue.shift();
  }

  nextInQueue() {
    return this.bot._queue[0];
  }

  updateSong(songData) {
    this.currentSong = songData;
    if (this.playing) {
      const songText = this.songString(songData);
      if (songText.length > 0) {
        this.writeSong(songText);
      }
    }
  }

  songString(songData) {
    const title = songData.title;
    const artist = songData.artist;

    if (!title || !artist) return '';

    return (title + ' by ' + artist);
  }

  writeSong(text) {
    if (!config.nowplaying || !config.nowplaying.output) return;

    fs.writeFile(config.nowplaying.output, text, (error) => {
      if (error) {
        console.log('Failed to write current song to [' + config.nowplaying.output + ']: ' + error);
      }
    });
  }

  connectTMI() {
    this.tmiClient.connect();
  }

  disconnectTMI() {
    this.tmiClient.disconnect();
  }

  raiseEvent(eventType, channel, user, args) {
    this._wsServer.handleUserEvent(eventType, channel, user, args);
  }

  // if we're already on a search page, use track to pass the track directly
  playNext(searchTerm, track) {
    if (searchTerm === '' && !track) return;

    if (track) {
      this.gpmClient.playNext(track);
    }
    else {
      this.findSong(searchTerm).then((foundTrack) => this.gpmClient.playNext(foundTrack));
    }
  }

  // return a promise that resolves when we have a track reference
  findSong(searchTerm) {
    return this.gpmClient.findSong(searchTerm);
  }

  nowPlaying() {
    if (!this.currentSong || !this.playing) {
      return null;
    }
    else if (this.currentSong) {
      return this.currentSong;
    }
    return null;
  }

  getCommands() {
    return this._commands;
  }

  getActionForCommand(command) {
      return this._commands[command];
  }
}

const bot = new TwitchGPM();
