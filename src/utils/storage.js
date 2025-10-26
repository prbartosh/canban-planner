export const LS = {
  getJSON: (k, fallback) => {
    try { const s = localStorage.getItem(k); return s ? JSON.parse(s) : fallback; }
    catch { return fallback; }
  },
  setJSON: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};
