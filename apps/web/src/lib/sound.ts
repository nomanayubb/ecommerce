/**
 * Tiny synthesized UI sounds (no audio files). Off unless the store enables sound (html[data-sound="1"])
 * AND the visitor switched it on (localStorage "sound" = "on"). Never plays before the visitor has interacted.
 */
let ctx: AudioContext | null = null;

export const soundEnabled = () => {
  if (typeof document === "undefined" || document.documentElement.dataset.sound !== "1") return false;
  try { return localStorage.getItem("sound") === "on"; } catch { return false; }
};

const audio = () => {
  if (!ctx) {
    const C = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!C) return null;
    ctx = new C();
  }
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
};

function tone(c: AudioContext, freq: number, start: number, dur: number, gain: number, type: OscillatorType = "sine", slideTo?: number) {
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, c.currentTime + start);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, c.currentTime + start + dur);
  g.gain.setValueAtTime(0.0001, c.currentTime + start);
  g.gain.exponentialRampToValueAtTime(gain, c.currentTime + start + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + start + dur);
  o.connect(g).connect(c.destination);
  o.start(c.currentTime + start);
  o.stop(c.currentTime + start + dur + 0.05);
}

export type SoundKind = "tick" | "pop" | "chime" | "jingle" | "meow";

export function playSound(kind: SoundKind) {
  if (!soundEnabled()) return;
  const c = audio();
  if (!c) return;
  switch (kind) {
    case "tick": tone(c, 1800, 0, 0.04, 0.025, "triangle"); break;
    case "pop": tone(c, 520, 0, 0.12, 0.08, "sine", 880); break;
    case "chime": [784, 988, 1175].forEach((f, i) => tone(c, f, i * 0.11, 0.5, 0.07)); break;
    case "jingle": [523, 659, 784, 1047].forEach((f, i) => tone(c, f, i * 0.09, 0.35, 0.06, "triangle")); break;
    case "meow": tone(c, 420, 0, 0.25, 0.05, "sawtooth", 620); break;
  }
}

/** Mascot voice line (browser speech synthesis). Same opt-in rules as the sounds: store enables it, visitor switched sound on. */
export function speak(text: string) {
  if (!soundEnabled() || document.documentElement.dataset.voice !== "1" || typeof speechSynthesis === "undefined") return;
  try {
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 1.05; u.pitch = 1.25; u.volume = 0.7; u.lang = document.documentElement.lang || "en-US";
    speechSynthesis.speak(u);
  } catch {}
}
