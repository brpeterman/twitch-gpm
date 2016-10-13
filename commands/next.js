"use strict";

const next = {
  description: 'Show next track in queue',
  handler: displayNext
}

function displayNext(bot, channel, user, args) {
  const nextSong = bot.queue[0];
  if (nextSong) {
    bot.tmiClient.say(channel, 'Next song: ' + bot.songString(nextSong));
  }
  else {
    bot.tmiClient.say(channel, 'No songs are queued.');
  }
}

module.exports = next;
