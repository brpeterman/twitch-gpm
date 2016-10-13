"use strict";

const playing = {
    description: 'Show the currently playing song',
    help: 'Enter [!playing] to display the currently playing song.',
    handler: displayNowPlaying
}

function displayNowPlaying(bot, channel, user, args) {
  const currentTrack = bot.nowPlaying();
  if (!currentTrack) {
    bot.tmiClient.say(channel, 'No song currently playing');
  }
  else {
    bot.tmiClient.say(channel, 'Now playing ' + bot.songString(currentTrack));
  }
}

module.exports = playing;
