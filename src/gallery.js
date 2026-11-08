const indices = count => Array.from({ length: count }, (_, index) => index);
const sequence = (images, index) => ({ remaining: indices(images.length).filter(item => item !== index), history: images.length ? [index] : [], cursor: 0 });
export function initialGallery(paused = false) {
  return { status: 'loading', images: [], index: 0, random: true, seconds: 60, paused, imageReady: false, revision: 0, error: '', ...sequence([], 0) };
}
function move(state, index, extra = {}) {
  return { ...state, ...extra, index, imageReady: state.images[index].url === state.images[state.index]?.url && state.imageReady, revision: state.revision + 1 };
}
function visit(state, index, remaining) {
  const history = [...state.history.slice(0, state.cursor + 1), index].slice(-1000);
  return move(state, index, { remaining, history, cursor: history.length - 1 });
}

export function galleryReducer(state, action) {
  switch (action.type) {
    case 'loading': return { ...state, status: 'loading', images: [], index: 0, imageReady: false, error: '', ...sequence([], 0) };
    case 'loaded': return { ...state, status: action.images.length ? 'ready' : 'error', images: action.images, index: 0, imageReady: false, error: action.images.length ? '' : 'No viewable artwork is available.', ...sequence(action.images, 0) };
    case 'error': return { ...state, status: 'error', images: [], imageReady: false, error: action.message };
    case 'step': {
      const count = state.images.length;
      if (state.status !== 'ready' || count < 2) return state;
      if (!state.random) return move(state, (state.index + action.direction + count) % count);
      if (action.direction < 0) return state.cursor > 0 ? move(state, state.history[state.cursor - 1], { cursor: state.cursor - 1 }) : state;
      if (state.cursor < state.history.length - 1) return move(state, state.history[state.cursor + 1], { cursor: state.cursor + 1 });
      const pool = state.remaining.length ? state.remaining : indices(count);
      const choices = pool.filter(index => index !== state.index);
      const random = Number.isFinite(action.random) ? Math.max(0, Math.min(0.999999999, action.random)) : 0;
      const index = choices[Math.floor(random * choices.length)];
      return visit(state, index, pool.filter(item => item !== index));
    }
    case 'select': {
      const index = action.index;
      if (!Number.isInteger(index) || index < 0 || index >= state.images.length) return state;
      if (index === state.index) return move(state, index);
      return visit(state, index, state.remaining.filter(item => item !== index));
    }
    case 'imageReady': return state.images[state.index]?.url === action.url ? { ...state, imageReady: true } : state;
    case 'imageFailed': {
      if (state.images[state.index]?.url !== action.url) return state;
      const kept = indices(state.images.length).filter(index => state.images[index].url !== action.url);
      const images = kept.map(index => state.images[index]);
      const remap = values => values.map(index => kept.indexOf(index)).filter(index => index >= 0);
      const remaining = remap(state.remaining);
      const index = state.random && remaining.length ? remaining[0] : state.index % (images.length || 1);
      const history = [...remap(state.history.slice(0, state.cursor + 1)), ...(images.length ? [index] : [])].slice(-1000);
      return { ...state, images, index, imageReady: false, remaining: remaining.filter(item => item !== index), history, cursor: Math.max(0, history.length - 1),
        status: images.length ? 'ready' : 'error', error: images.length ? '' : 'The artwork images could not be loaded. Please try again.', revision: state.revision + 1 };
    }
    case 'seconds': {
      const seconds = Number(action.value);
      return Number.isFinite(seconds) ? { ...state, seconds: Math.max(1, Math.min(120, Math.round(seconds))) } : state;
    }
    case 'random': return { ...state, random: action.value, ...sequence(state.images, state.index) };
    case 'pause': return { ...state, paused: !state.paused };
    default: return state;
  }
}
