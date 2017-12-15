import * as messaging from "messaging";

var current_timeout;

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
 * @param  {Date}   date A javascript date object
 * @return {String}      H:MM AMPM TZ (e.g. 12:00 PM CST or 1:00 AM EST)
 */
function getTimeString(date) {
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

  return hour + ':' + ('00' + date.getMinutes()).slice(-2) + ' ' + ampm + ' ' + getTimezone(date.getTimezoneOffset());
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
      top: getTimeString(new Date(game.gameDate)),
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
    var today = new Date();
    date = today.getFullYear() + '-' + (today.getMonth() + 1) + '-' + today.getDate();
  }

  var url = `https://statsapi.web.nhl.com/api/v1/schedule?startDate=${date}&endDate=${date}&expand=schedule.teams,schedule.linescore&site=en_nhl`;

  fetch(url, {
    method: 'GET',
  })
    .then(response => response.json())
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
    })))
    .then(() => current_timeout = setTimeout(getGameStatus, 30000))
    .catch(e => {
      console.log(e);
    });
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
