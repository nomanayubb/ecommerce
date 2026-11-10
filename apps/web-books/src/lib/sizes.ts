/** Remembers the size a shopper picked last, so the next product opens on it when it is available. */
export const rememberSize = (v: string) => { try { localStorage.setItem("last-size", v); } catch {} };
export const lastSize = () => { try { return localStorage.getItem("last-size"); } catch { return null; } };
