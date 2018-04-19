import * as messaging from 'messaging';
import document from 'document';
import store from './redux.js';

const elements = {
  screens: {
    loading: document.getElementById('loading'),
    no_games: document.getElementById('no-games'),
    game_list: document.getElementById('game-list'),
  },
  buttons: {
    previous: [
      document.getElementById('no-games').getElementById('previous'),
      document.getElementById('game-list').getElementById('previous'),
    ],
    next: [
      document.getElementById('no-games').getElementById('next'),
      document.getElementById('game-list').getElementById('next'),
    ],
  },
  games: [],
};
let date_offset = 0;
let game_index = 0;
let game_div_init;
while ((game_div_init = document.getElementById(`game-${game_index}`)) !== null) {
  elements.games.push(game_div_init);
  game_index++;
}

/**
 * Change a div's property ONLY IF the new value is different
 * @param {DOMElement} div The element to alter
 * @param {String} prop The proeprty to change
 * @param {Mixed} value The new value
 * @return {void}
 */
function conditionalChangeProperty(div, prop, value) {
  // Determine if the value is different
  if (div[prop] === value) {
    return;
  }

  // Set the new value
  div[prop] = value;
}

/**
 * Hide or show a div ONLY IF the new state is different from the current state
 * @param {DOMElement} div The element to hide or show
 * @param {Boolean} state The new state for the div
 * @return {void}
 */
function conditionalHideOrShowDiv(div, state) {
  // Determine if we should change the state
  if (state && div.style.display === 'inline') {
    return;
  } else if (!state && div.style.display === 'none') {
    return;
  }

  div.style.display = state
    ? 'inline'
    : 'none';
}

/**
 * Renders the GUI from the state
 * @return {void}
 */
function render() {
  // Get the state
  var state = store.getState();

  // Handle screen state changes
  Object.keys(state.screens)
    .map((screen) => conditionalHideOrShowDiv(
      elements.screens[screen],
      state.screens[screen]
    ));

  // Handle game rendering
  if (state.screens.game_list) {
    // Loop over the games list
    elements.games.map((game_div, index) => {
      // Get the game info
      var game_info = state.games[index];

      // Determine if there is a game associated
      if (typeof game_info === 'undefined') {
        return conditionalHideOrShowDiv(game_div, false);
      }

      // Show the game div (if necessary)
      conditionalHideOrShowDiv(game_div, true);

      // Verify the team data
      [
        'home',
        'away'
      ].map((team) => {
        conditionalChangeProperty(
          game_div.getElementById(`${team}-score`),
          'text',
          typeof game_info[team].score === 'undefined'
            ? ''
            : game_info[team].score
        );
        conditionalChangeProperty(
          game_div.getElementById(`${team}-name`),
          'text',
          game_info[team].name
        );
      });

      // Verify the game data
      conditionalChangeProperty(
        game_div.getElementById('game-top'),
        'text',
        game_info.game.top
      );
      conditionalChangeProperty(
        game_div.getElementById('game-bottom'),
        'text',
        game_info.game.bottom
      );

      return null;
    });

    // Set up the updated bar
    var bar_div = elements.screens.game_list.getElementById('bar');
    var bar_fill_div = elements.screens.game_list.getElementById('bar-fill');
    conditionalHideOrShowDiv(
      bar_div,
      state.progress.done !== state.progress.total
    );
    conditionalHideOrShowDiv(
      bar_fill_div,
      state.progress.done !== state.progress.total
    );
    if (state.progress.done !== state.progress.total) {
      var bar_length = 272;
      var x_start = 38;
      var done_pixels = Math.round((state.progress.done + 1) * bar_length / state.progress.total);

      conditionalChangeProperty(
        bar_div,
        'x',
        x_start + done_pixels
      );
      conditionalChangeProperty(
        bar_div,
        'width',
        bar_length - done_pixels
      );
    }

    // Set the updated at
    var updated_div = elements.screens.game_list.getElementById('updated');
    conditionalChangeProperty(
      updated_div,
      'text',
      state.updated
    );
    conditionalHideOrShowDiv(
      updated_div,
      state.progress.done === state.progress.total
    );
  }

  // Handle date
  if (state.screens.game_list || state.screens.no_games) {
    // Get the screen div
    var screen_div = elements.screens[
      state.screens.game_list
        ? 'game_list'
        : 'no_games'
    ];

    // Set the date
    conditionalChangeProperty(
      screen_div.getElementById('date'),
      'text',
      state.date
    );
  }
}

/**
 * This function changes the day being displayed
 * @param {Integer} delta The change to the date_offset
 * @return {void}
 */
function changeOffset(delta) {
  date_offset += delta;
  sendMessage({
    action: 'change_date',
    offset: date_offset,
  });
  store.dispatch({
    action: 'SHOW_LOADING'
  });
  store.dispatch({
    action: 'CLEAR_GAMES'
  });
}

/**
 * Sends a message to the watch and logs failures
 * @param {Object} data The data to send
 * @return {void}
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

store.subscribe(render);

// Attach button listeners
document.getElementById('no-games')
  .getElementById('previous').onclick = changeOffset.bind(null, -1);
document.getElementById('game-list')
  .getElementById('previous').onclick = changeOffset.bind(null, -1);
document.getElementById('no-games')
  .getElementById('next').onclick = changeOffset.bind(null, 1);
document.getElementById('game-list')
  .getElementById('next').onclick = changeOffset.bind(null, 1);

// Show the loading screen
store.dispatch({
  action: 'SHOW_LOADING'
});

messaging.peerSocket.onmessage = (evt) => {
  // Update the date
  if (typeof evt.data.date !== 'undefined') {
    store.dispatch({
      action: 'SET_DATE',
      value: evt.data.date
    });
  }

  switch (evt.data.action) {
    case 'add_game':
      store.dispatch({
        ...evt.data,
        action: 'ADD_GAME',
      });
      store.dispatch({
        action: 'SET_PROGRESS_TOTAL',
        value: evt.data.count,
      });
      store.dispatch({
        action: 'SET_PROGRESS_DONE',
        value: evt.data.i + 1,
      });
      store.dispatch({
        action: 'SHOW_GAME_LIST',
      });
      store.dispatch({
        action: 'SET_UPDATED',
        value: evt.data.updated,
      });
      break;
    case 'no_games':
      store.dispatch({
        action: 'SHOW_NO_GAMES',
      });
      break;
    default:
      console.log(JSON.stringify(evt.data));
      break;
  }
};
