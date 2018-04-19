import * as messaging from 'messaging';
import document from 'document';
import store from './redux.js';

const elements = {
  screens: {
    loading: document.getElementById('loading'),
    no_games: document.getElementById('no-games'),
    game_list: document.getElementById('game-list'),
    game_events: document.getElementById('game-events'),
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
  game_events: [],
};
let date_offset = 0;
let div_index = 0;
let div_element;
while ((div_element = document.getElementById(`game-${div_index}`)) !== null) {
  elements.games.push(div_element);
  div_index++;
}
div_index = 0;
while ((div_element = document.getElementById(`game-event-${div_index}`)) !== null) {
  elements.game_events.push(div_element);
  div_index++;
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

      // Determine if the ID is different
      if (game_div['data-game-id'] !== game_info.id) {
        game_div['data-game-id'] = game_info.id;
        game_div.onclick = setActiveGame.bind(null, game_info.id);
      }

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

      // Show the game div (if necessary)
      return conditionalHideOrShowDiv(game_div, true);
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
      var done_pixels = Math.round(state.progress.done * bar_length / state.progress.total);

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

  // Handle the game events screen
  if (state.screens.game_events && state.active_game !== null) {
    // Label the correct game
    var game_info = state.games
      .filter((game) => game.id === state.active_game)[0];
    conditionalChangeProperty(
      elements.screens.game_events.getElementById('date'),
      'text',
      typeof game_info === 'undefined'
        ? 'Unknown Game'
        : `${game_info.away.name} at ${game_info.home.name}`
    );

    elements.game_events.map((event_div, index) => {
      // Get the event info
      var event_info = state.game_events[index];

      // Hide the event if there is none
      if (typeof event_info === 'undefined') {
        return conditionalHideOrShowDiv(event_div, false);
      }

      // Set up the event divs
      conditionalChangeProperty(
        event_div.getElementById('scorer'),
        'text',
        event_info.scorer
      );
      conditionalChangeProperty(
        event_div.getElementById('assists'),
        'text',
        event_info.assists
      );
      conditionalChangeProperty(
        event_div.getElementById('game-state'),
        'text',
        event_info.game_state
      );
      conditionalChangeProperty(
        event_div.getElementById('time'),
        'text',
        event_info.time
      );

      // Show the event
      return conditionalHideOrShowDiv(event_div, true);
    });
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
 * Set the active game and display the events for that game
 * @param {Integer} game_id The gamePk
 * @return {void}
 */
function setActiveGame(game_id) {
  store.dispatch({
    action: 'SET_ACTIVE_GAME',
    value: game_id,
  });
  store.dispatch({
    action: 'SHOW_GAME_EVENTS'
  });
  sendMessage({
    action: 'active_game',
    value: game_id
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

document.onkeypress = function(e) {
  if (e.key === 'back' && store.getState().active_game !== null) {
    e.preventDefault();
    store.dispatch({
      action: 'SET_ACTIVE_GAME',
      value: null,
    });
    store.dispatch({
      action: 'CLEAR_GAME_EVENTS',
    });
    store.dispatch({
      action: 'SHOW_GAME_LIST'
    });
  }
};

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
      if (store.getState().active_game === null) {
        store.dispatch({
          action: 'SHOW_GAME_LIST',
        });
      }
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
    case 'add_event':
      // Verify the game ID
      if (store.getState().active_game === evt.data.game_id) {
        store.dispatch({
          ...evt.data,
          action: 'ADD_GAME_EVENT',
        });
      }
      break;
    default:
      console.log(JSON.stringify(evt.data));
      break;
  }
};
