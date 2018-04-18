import * as messaging from "messaging";

var current_timeout;
var day_offset = 0;

for ( var x = 10; x <= 50; x++ ) {
  var result = Math.sqrt(Math.pow(x, 2) * 3 / 4);
  if (Math.abs(Math.round(result) - result) <= 0.01) {
    console.log(x, result);
  }
}

/**
 * Returns a boolean indicating if DST is currently in effect for the user
 * @return {Boolean} Is DST in effect
 */
Date.prototype.isDst = function() {
  var jan = new Date(this.getFullYear(), 0, 1);
  var jul = new Date(this.getFullYear(), 6, 1);

  var standard_offset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());

  return this.getTimezoneOffset() < standard_offset;
}

/**
 * Returns a friendly tiemzone name from the offset returned from
 * getTimezoneOffset
 * @param  {Integer} offset The offset in seconds from getTimezoneOffset
 * @return {String}         The friendly timezone name
 */
function getTimezone(offset) {
  var timezones = {
    240: 'AST',
    300: 'EST',
    360: 'CST',
    420: 'MST',
    480: 'PST',
    540: 'AKST',
    600: 'HAST',
  };
  var dst_timezones = {
    180: 'ADT',
    240: 'EDT',
    300: 'CDT',
    360: 'MDT',
    420: 'PDT',
    480: 'AKDT',
    540: 'HADT',
  };

  if ((new Date()).isDst()) {
    timezones = dst_timezones;
  }

  if (typeof timezones[offset] !== 'undefined') {
    return timezones[offset];
  } else if (offset === 0) {
    return 'UTC';
  } else if (offset < 0) {
    return 'UTC+' + (offset / 60);
  } else {
    return 'UTC-' + (offset / 60);
  }
}

/**
 * Returns a time string
 * @param  {Date}    date        A javascript date object
 * @param  {Boolean} addTimezone Whether or not to add the timezone to the
 *                               string (default true)
 * @return {String}              H:MM AMPM TZ (e.g. 12:00 PM CST or 1:00 AM EST)
 */
function getTimeString(date, addTimezone = true) {
  // Get the hour
  var hour = date.getHours();
  var ampm = 'AM';
  if (hour === 0) {
    hour = 12;
  } else if (hour === 12) {
    ampm = 'PM';
  } else if (hour > 12) {
    ampm = 'PM';
    hour = hour - 12;
  }

  if (addTimezone) {
    return hour + ':' + ('00' + date.getMinutes()).slice(-2) + ' ' + ampm + ' ' + getTimezone(date.getTimezoneOffset());
  } else {
    return hour + ':' + ('00' + date.getMinutes()).slice(-2) + ' ' + ampm;
  }
}

/**
 * Sends a message to the watch and logs failures
 * @param {Object} data The data to send
 */
function sendMessage(data) {
  if (messaging.peerSocket.readyState === messaging.peerSocket.OPEN) {
    try {
      messaging.peerSocket.send(data);
    } catch (e) {
      console.log(e);
    }
  } else {
    console.log('Message not sent');
  }
}

/**
 * Return a team object (name and score) from information from the API
 * @param  {Object} team      game.teams.{TEAM} from the API
 * @param  {Object} linescore game.linescore.teams.{TEAM} from the API
 * @return {Object}           The team object with a name and score. The name
 *                            will include the status (PP, EN)
 */
function getTeam(team, linescore, period) {
  var status_string = '';
  if (linescore.powerPlay && linescore.goaliePulled) {
    status_string = ' (PP, EN)';
  } else if (linescore.powerPlay) {
    status_string = ' (PP)';
  } else if (linescore.goaliePulled) {
    status_string = ' (EN)';
  }

  return {
    name: team.team.abbreviation + status_string,
    score: period === 0 ? '' : linescore.goals,
  };
}

/**
 * Return the game object for the message
 * @param  {Object} game The game object from the API
 * @return {Object}      The game object for the watch with top and bottom text
 */
function getGameState(game) {
  if (game.linescore.currentPeriod === 0) {
    return {
      top: getTimeString(new Date(game.gameDate), false),
      bottom: '',
    };
  } else if (game.status.abstractGameState === 'Final') {
    return {
      top: game.linescore.currentPeriodTimeRemaining,
      bottom: game.linescore.currentPeriodOrdinal,
    };
  } else {
    return {
      top: game.linescore.currentPeriodOrdinal,
      bottom: game.linescore.currentPeriodTimeRemaining,
    };
  }
}

/**
 * Retrieve and send the games to the watch
 * @param {String} date The date to pass into the URL (optional)
 */
function getGameStatus(date) {
  // Check the state
  if (messaging.peerSocket.readyState !== messaging.peerSocket.OPEN) {
    console.log('NOT CONNECTED');
    return;
  }

  // Get today's date (if needed)
  if (typeof date === 'undefined') {
    var now = new Date();

    // Get the current timestamp
    var current_time = now.getTime();

    if (now.isDst()) {
      current_time -= (1000 * 60 * 60);
    }

    // Offset so any time before 3AM PST registers as the day before
    current_time -= (1000 * 60 * 60 * 8);

    // Handle day offset from the client
    current_time = current_time + (day_offset * 1000 * 60 * 60 * 24);

    // Get that date
    var today = new Date(current_time);
    date = today.getUTCFullYear() + '-' + (today.getUTCMonth() + 1) + '-' + today.getUTCDate();
  }

  var url = `https://statsapi.web.nhl.com/api/v1/schedule?startDate=${date}&endDate=${date}&expand=schedule.teams,schedule.linescore&site=en_nhl`;

  fetch(url, {
    method: 'GET',
  })
    .then(response => response.json())
    .then(data => {
      if (data.dates.length === 0) {
        sendMessage({
          action: 'no_games',
          date: date
        });
        return {
          dates: [
            {
              games: []
            }
          ]
        };
      }

      return data;
    })
    .then(data => data.dates[0].games)
    .then(games => games.map((game, i) => sendMessage({
      action: 'add_game',
      id: game.gamePk,
      home: getTeam(game.teams.home, game.linescore.teams.home, game.linescore.currentPeriod),
      away: getTeam(game.teams.away, game.linescore.teams.away, game.linescore.currentPeriod),
      game: getGameState(game),
      count: games.length,
      updated: getTimeString(new Date()),
      i: i,
      date: date
    })))
    .then(() => current_timeout = setTimeout(getGameStatus, 30000))
    .catch(e => {
      console.log(e);
    });
}

/**
 * Alter the offset that is used to get the games
 * @param  {Integer} offset The offset (in days)
 */
function changeDate(offset) {
  day_offset = offset;
  clearInterval(current_timeout);
  getGameStatus();
}

messaging.peerSocket.onclose = () => {
  console.log('Connection Closed');
  clearTimeout(current_timeout);
}

if (messaging.peerSocket.readyState !== messaging.peerSocket.OPEN) {
  messaging.peerSocket.onopen = getGameStatus.bind(null, undefined);
} else {
  getGameStatus();
}

messaging.peerSocket.onmessage = evt => {
  switch (evt.data.action) {
    case 'change_date':
      changeDate(evt.data.offset);
      break;
    default:
      console.log(evt.data.action);
      break;
  }
}
