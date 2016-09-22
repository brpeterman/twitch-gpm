var tmi = require('tmi.js');
var ws = require('ws');
var config = require('./config.js');

var nextRequest = 1;
var requests = [];

var commands = {
    'song': {
        description: 'Play song',
        handler: requestSong
    },
    'help': {
        description: 'Help',
        handler: displayHelp
    }
};

// Twitch connection config
var tmi_options = {
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

// Clients
var tmi_client = new tmi.client(tmi_options);
var ws_client = new ws(config.gpm.uri);

// Assume control of the music player
ws_client.on('open', function() {
    var control_request = {
        namespace: 'connect',
        method: 'connect',
        arguments: ['twitch-gpm', config.gpm.token]
    };
    ws_client.send(JSON.stringify(control_request));
    tmi_client.connect(tmi_options);
});

// Handle music player events
ws_client.on('message', function(data, flags) {
    var message = JSON.parse(data);
    
    if (message.namespace === 'result') {
        handleResponse(message.requestID, message.value);
    }
});

// Handle Twitch chat events
tmi_client.on('chat', (channel, user, message, self) => {
    if (message.slice(0,1) !== '!') return;

    var message = message.slice(1);
    var msg_tokens = message.split(' ');
    if (msg_tokens.length === 0) return;

    var command = msg_tokens[0].toLowerCase();
    var arguments = msg_tokens.slice(1);
    
    var action = commands[command];
    if (action) {
        var handler = action.handler;
        handler.call(this, channel, user, arguments);
    }
});

// User requests a song. Send the text as search text.
function requestSong(channel, user, args) {
    var searchText = args.join(' ');
    var request = createRequest(channel, user, 'search');
    var data = {
        namespace: 'search',
        method: 'performSearch',
        arguments: [searchText],
        requestID: request.ID
    };
    ws_client.send(JSON.stringify(data));
}

// Create a request object to hold onto and later match up to a response
function createRequest(channel, user, type) {
    var request = {
        ID: nextRequest,
        type: type,
        channel: channel,
        user: user
    };
    requests[nextRequest++] = request;
    return request;
}

// Handle music player response events
function handleResponse(requestID, returnValue) {
    var request = requests[requestID];
    if (!request) return;

    delete requests[requestID];
    
    switch(request.type) {
    case 'search':
        handleSearch(request);
        break;

    case 'searchResults':
        handleSearchResults(request, returnValue);
        break;
    }
}

function handleSearch(request) {
    var newRequest = createRequest(request.channel, request.user, 'searchResults');
    var data = {
        namespace: 'search',
        method: 'getCurrentResults',
        requestID: newRequest.ID
    }

    // Use a timeout to ensure that the search is done.
    // We could query isSearching, but that complicates things quite a bit
    setTimeout(function() {
        ws_client.send(JSON.stringify(data));
    }, 2000);
}

function handleSearchResults(request, results) {
    var track;
    // if we have a "best match" and it's a track, use it
    if (results.bestMatch && results.bestMatch.type === 'track') {
        track = results.bestMatch.value;
    }
    // Otherwise pick the first track we found
    else {
        track = results.tracks[0];
    }

    if (!track) {
        tmi_client.say(request.channel, request.user['display-name'] + ', failed to find a match.');
    }

    // Report action to user
    tmi_client.say(request.channel, request.user['display-name'] + ', added ' + track.title + ' by ' + track.artist + '.');

    // Add track to queue (doesn't exist yet...)
}

function displayHelp(channel, user, args) {
    var helpString = '';
    for (command in commands) {
        helpString += '!' + command + ' (' + commands[command].description + '), ';
    }
    helpString = helpString.slice(0, -2);
    tmi_client.say(channel, 'Commands: ' + helpString);
}
