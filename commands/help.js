"use strict";

const help = {
  description: 'Help',
  handler: displayHelp
}

function displayHelp(bot, channel, user, args) {
  let helpString = '';
  let command = null;
  for (command in bot.commands) {
      helpString += '!' + command + ' (' + bot.commands[command].description + '), ';
  }
  helpString = helpString.slice(0, -2);
  bot.tmiClient.say(channel, 'Commands: ' + helpString);
}

module.exports = help;
