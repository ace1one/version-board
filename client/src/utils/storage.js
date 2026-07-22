const STORAGE_KEY = 'vb_config_v1';

export function loadConfig() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed.rememberToken) parsed.token = '';
    return parsed;
  } catch (e) {
    console.warn('Failed to load config', e);
    return null;
  }
}

export function saveConfig(state) {
  const toStore = { ...state };
  if (!state.rememberToken) toStore.token = '';
  localStorage.setItem(STORAGE_KEY, JSON.stringify(toStore));
}