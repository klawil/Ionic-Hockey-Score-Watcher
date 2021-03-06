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

const reducer = (state = {
  screens: {
    loading: true,
    no_games: true,
    game_list: true,
  },
  games: [],
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
        screens: Object
          .keys(state.screens)
          .reduce((previous, screen) => {
            previous[screen] = screen === 'loading';
            return previous;
          }, {})
      };
    case 'SHOW_GAME_LIST':
      return {
        ...state,
        screens: Object
          .keys(state.screens)
          .reduce((previous, screen) => ({
            ...previous,
            [screen]: screen === 'game_list'
          }), {})
      };
    case 'SHOW_NO_GAMES':
      return {
        ...state,
        screens: Object
          .keys(state.screens)
          .reduce((previous, screen) => ({
            ...previous,
            [screen]: screen === 'no_games'
          }), {})
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
          if (game.id !== action.id) {
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

    default:
      return state;
  }
};

export default createStore(reducer);
