"use strict";

const song = {
    description: 'Play song',
    handler: requestSong
}

function requestSong(bot, channel, user, args) {
  const searchText = args.join(' ');
  bot.findSong(searchText).then((track) => {
    bot.tmiClient.say(channel, user['display-name'] + ', added ' + bot.songString(track) + '.');
    if (bot.queue.length === 0) {
      bot.playNext('', track);
    }
    bot.addToQueue(track);
  }).catch((msg) => {
    if (msg instanceof Error) {
      bot.tmiClient.say(channel, user['display-name'] + ', there was an error processing your request.');
      console.log(msg.stack);
    }
    else {
      bot.tmiClient.say(channel, user['display-name'] + ', ' + msg + '.');
    }
  });
}

module.exports = song;
