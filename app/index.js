import * as messaging from "messaging";
import document from "document";

var games = [];
var games_visible = true;
var date_offset = 0;
var old_date = null;

/**
 * Displays a team inside the div
 * @param {DOMElement} div  The game's div
 * @param {DOMElement} team The team data
 * @param {DOMElement} type The team type (away, home)
 */
function showTeam(div, team, type) {
  div.getElementById(`${type}-score`).text = typeof team.score === 'undefined'
    ? ''
    : team.score;
  div.getElementById(`${type}-name`).text = team.name;
}

/**
 * Adds a game to the displayed item
 * @param {Object} game The game information from the message
 */
function addGame(game) {
  // Check for a date change
  if (game.date !== old_date) {
    old_date = game.date;
    clearGames();
  }

  // See if the game already exists
  var existing_game = games.filter(possible_game => possible_game.id === game.id);
  if (existing_game.length === 0) {
    game.div_id = games.length;
    games.push(game);
  } else {
    existing_game[0].home = game.home;
    existing_game[0].away = game.away;
    existing_game[0].cast = game.cast;
    existing_game[0].game = game.game;
    existing_game[0].updated = game.updated;
    game = existing_game[0];
  }

  // Get and update the div
  var game_div = document.getElementById(`game-${game.div_id}`);
  game_div.style.display = 'inline';
  showTeam(game_div, game.away, 'away');
  showTeam(game_div, game.home, 'home');

  game_div.getElementById('game-top').text = game.game.top;
  game_div.getElementById('game-bottom').text = game.game.bottom;

  // Hide the remaining divs
  var i = games.length;
  var div;
  while ((div = document.getElementById(`game-${i}`)) !== null) {
    div.style.display = 'none';
    i++;
  }

  // Mark as updating or updated
  var list = document.getElementById('game-list');
  var bar = list.getElementById('bar');
  var bar_fill = list.getElementById('bar-fill');
  var updated = list.getElementById('updated');
  if ((game.i + 1) < game.count) {
    // Calculate the percentage
    var length = 272;
    var x_start = 38;
    var done_pixels = Math.round((game.i + 1) * length / game.count);

    bar.x = x_start + done_pixels;
    bar.width = length - done_pixels;
    bar.style.display = 'inline';
    bar_fill.style.display = 'inline';
    updated.style.display = 'none';
  } else {
    bar.style.display = 'none';
    bar_fill.style.display = 'none';
    updated.style.display = 'inline';
    updated.text = `Updated ${game.updated}`;
  }

  // Show the games list
  showGames(true, true);
}

/**
 * Show or hide the games screen
 * @param {Boolean} state To show or hide the game list
 * @param {Boolean} games Are there games for this date?
 */
function showGames(state, games) {
  if (state === games_visible && games) {
    return;
  }

  // Show game-list if state is true
  document.getElementById('game-list').style.display = state
    ? 'inline'
    : 'none';

  // Show loading if state is false and games is true
  document.getElementById('loading').style.display = !state && games
    ? 'inline'
    : 'none';

  // Show no games if state is false and games is false
  document.getElementById('no-games').style.display = !state && !games
    ? 'inline'
    : 'none';

  games_visible = state;
}

/**
 * Set the date in the navigation bar
 * @param {String} date The date for the current games
 */
function setDateLabel(date) {
  document.getElementById('game-list').getElementById('date').text = date;
  document.getElementById('no-games').getElementById('date').text = date;
}

/**
 * This function changes the day being displayed
 * @param {Integer} delta The change to the date_offset
 */
function changeOffset(delta) {
  date_offset += delta;
  sendMessage({
    action: 'change_date',
    offset: date_offset
  });
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
 * Hide all of the game divs
 */
function clearGames() {
  games.map(game => document.getElementById(`game-${game.div_id}`).style.display = 'none');
  games = [];
}

showGames(false, true);

// Attach button listeners
document.getElementById('no-games').getElementById('previous').onclick = changeOffset.bind(null, -1);
document.getElementById('game-list').getElementById('previous').onclick = changeOffset.bind(null, -1);
document.getElementById('no-games').getElementById('next').onclick = changeOffset.bind(null, 1);
document.getElementById('game-list').getElementById('next').onclick = changeOffset.bind(null, 1);

messaging.peerSocket.onmessage = evt => {
  if (typeof evt.data.date !== 'undefined') {
    setDateLabel(evt.data.date);
  }

  switch (evt.data.action) {
    case 'add_game':
      addGame(evt.data);
      break;
    case 'no_games':
      showGames(false, false);
      break;
  }
};
