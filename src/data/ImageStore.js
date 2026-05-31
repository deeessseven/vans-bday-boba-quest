export function makeImageStore(prefix) {
  return {
    _bundled: new Set(),
    markBundled(key)   { this._bundled.add(key); },
    unmarkBundled(key) { this._bundled.delete(key); },

    set(key, dataUrl) {
      try {
        localStorage.setItem(prefix + key, dataUrl);
        return true;
      } catch {
        return false; // storage quota exceeded
      }
    },

    get(key) {
      return localStorage.getItem(prefix + key);
    },

    remove(key) {
      localStorage.removeItem(prefix + key);
    },

    hasCustom(key) {
      return this._bundled.has(key) || localStorage.getItem(prefix + key) !== null;
    },

  };
}
