"use strict";

const help = {
  description: 'Help',
  help: 'Enter [!help <command>] to get help for a command.',
  handler: displayHelp
}

function displayHelp(bot, channel, user, args) {
  if (args.length > 0) {
    displayCommandHelp(bot, channel, user, args[0]);
  }
  else {
    let helpString = '';
    let command = null;
    for (command in bot.commands) {
        helpString += '!' + command + ' (' + bot.commands[command].description + '), ';
    }
    helpString = helpString.slice(0, -2);
    bot.tmiClient.say(channel, 'Commands: ' + helpString);
  }
}

function displayCommandHelp(bot, channel, user, command) {
  if (!bot.commands[command] || !bot.commands[command].help) {
    return;
  }

  const commandHelp = bot.commands[command].help;
  bot.tmiClient.say(channel, user['display-name'] + ': ' + commandHelp);
}

module.exports = help;
