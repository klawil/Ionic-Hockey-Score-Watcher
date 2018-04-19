const createStore = (reducer) => {
  let state;
  let listeners = [];

  const getState = () => state;

  const dispatch = (action) => {
    state = reducer(state, action);
    listeners.forEach((listener) => listener());
  };

  const subscribe = (listener) => {
    listeners.push(listener);
    return () => {
      listeners = listeners.filter((l) => l !== listener);
    };
  };

  dispatch({});

  return { getState, dispatch, subscribe };
};

const reduce_screen_state = (screens, show) => Object
  .keys(screens)
  .reduce((previous, screen) => {
    previous[screen] = screen === show;
    return previous;
  }, {});

const reducer = (state = {
  screens: {
    loading: true,
    no_games: true,
    game_list: true,
    game_events: true,
  },
  games: [],
  game_events: [],
  active_game: null,
  date: 'loading',
  updated: 'loading',
  progress: {
    done: 0,
    total: 1,
  },
}, action) => {
  switch (action.action) {
    // DISPLAY ITEMS
    case 'SHOW_LOADING':
      return {
        ...state,
        screens: reduce_screen_state(state.screens, 'loading')
      };
    case 'SHOW_GAME_LIST':
      return {
        ...state,
        screens: reduce_screen_state(state.screens, 'game_list')
      };
    case 'SHOW_NO_GAMES':
      return {
        ...state,
        screens: reduce_screen_state(state.screens, 'no_games')
      };
    case 'SHOW_GAME_EVENTS':
      return {
        ...state,
        screens: reduce_screen_state(state.screens, 'game_events')
      };

    // Handle the date changing
    case 'SET_DATE':
      return {
        ...state,
        date: action.value
      };

    // Updated at values
    case 'SET_UPDATED':
      return {
        ...state,
        updated: action.value
      };
    case 'SET_PROGRESS_DONE':
      return {
        ...state,
        progress: {
          ...state.progress,
          done: action.value
        }
      };
    case 'SET_PROGRESS_TOTAL':
      return {
        ...state,
        progress: {
          ...state.progress,
          total: action.value
        }
      };

    // Update games
    case 'ADD_GAME':
      // Build the game object
      var new_game = {
        id: action.id,
        home: action.home,
        away: action.away,
        game: action.game,
      };

      // Determine if the game already exists
      if (
        state
          .games
          .filter((game) => game.id === action.id)
          .length === 0
      ) {
        return {
          ...state,
          games: [
            ...state.games,
            new_game
          ]
        };
      }

      return {
        ...state,
        games: state.games.map((game) => {
          if (game.id !== new_game.id) {
            return game;
          }

          return new_game;
        })
      };
    case 'CLEAR_GAMES':
      return {
        ...state,
        games: [],
      };

    // Handle game events
    case 'SET_ACTIVE_GAME':
      return {
        ...state,
        active_game: action.value,
      };
    case 'ADD_GAME_EVENT':
      // Build the event
      var new_event = {
        id: action.id,
        scorer: action.scorer,
        assists: action.assists,
        game_state: action.game_state,
        time: action.time,
      };

      if (
        state
          .game_events
          .filter((event) => event.id === new_event.id)
          .length === 0
      ) {
        return {
          ...state,
          game_events: [
            ...state.game_events,
            new_event,
          ],
        };
      }

      return {
        ...state,
        game_events: state.game_events.map((event) => {
          if (event.id !== new_event.id) {
            return event;
          }

          return new_event;
        })
      };
    case 'CLEAR_GAME_EVENTS':
      return {
        ...state,
        game_events: [],
      };

    default:
      return state;
  }
};

export default createStore(reducer);
