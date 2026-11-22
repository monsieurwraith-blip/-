/**
 * Sound effects synthesized with the Web Audio API — no audio files, works offline
 * in the browser and the desktop app. One shared AudioContext, created lazily.
 */
import type { SoundClip } from "./gameSounds";

let ctx: AudioContext | null = null;
let noiseBuffer: AudioBuffer | null = null;

function context(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  if (ctx.state === "suspended") void ctx.resume();
  return ctx;
}

function noise(ac: AudioContext): AudioBuffer {
  if (noiseBuffer && noiseBuffer.sampleRate === ac.sampleRate) return noiseBuffer;
  const buf = ac.createBuffer(1, Math.floor(ac.sampleRate * 0.25), ac.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  noiseBuffer = buf;
  return buf;
}

/** Short wooden "tok": filtered noise click + a low body thump. */
function tap(ac: AudioContext, out: AudioNode, at: number, gain: number, pitch: number) {
  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = pitch;
  band.Q.value = 1.4;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, at + 0.06);
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + 0.08);

  const body = ac.createOscillator();
  body.type = "sine";
  body.frequency.setValueAtTime(pitch / 9, at);
  body.frequency.exponentialRampToValueAtTime(pitch / 18, at + 0.08);
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0, at);
  bg.gain.linearRampToValueAtTime(gain * 0.9, at + 0.003);
  bg.gain.exponentialRampToValueAtTime(0.0008, at + 0.09);
  body.connect(bg).connect(out);
  body.start(at);
  body.stop(at + 0.1);
}

function tone(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  freq: number,
  duration: number,
  gain: number,
  type: OscillatorType = "triangle",
) {
  const osc = ac.createOscillator();
  osc.type = type;
  osc.frequency.value = freq;
  const g = ac.createGain();
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0008, at + duration);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + duration + 0.02);
}

/** Plays a clip at volume 0–100. Silently does nothing where Web Audio is unavailable. */
export function playClip(clip: SoundClip, volume: number): void {
  const ac = context();
  if (!ac || volume <= 0) return;
  const master = ac.createGain();
  // Perceptual curve: small slider values stay quiet.
  master.gain.value = Math.pow(Math.max(0, Math.min(100, volume)) / 100, 1.6) * 0.9;
  master.connect(ac.destination);
  const t = ac.currentTime + 0.005;

  switch (clip) {
    case "move":
      tap(ac, master, t, 0.9, 1700);
      break;
    case "capture":
      tap(ac, master, t, 0.75, 2300);
      tap(ac, master, t + 0.045, 1, 1500);
      break;
    case "check":
      tap(ac, master, t, 0.7, 1700);
      tone(ac, master, t + 0.02, 880, 0.16, 0.22, "sine");
      tone(ac, master, t + 0.11, 1174.7, 0.22, 0.2, "sine");
      break;
    case "gameEnd":
      for (const f of [392, 523.25, 659.25]) tone(ac, master, t, f, 0.9, 0.12);
      break;
    case "win":
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        tone(ac, master, t + i * 0.11, f, i === 3 ? 0.8 : 0.28, 0.2),
      );
      break;
    case "loss":
      [392, 311.13, 261.63].forEach((f, i) =>
        tone(ac, master, t + i * 0.17, f, i === 2 ? 0.9 : 0.32, 0.2, "sine"),
      );
      break;
  }
  setTimeout(() => master.disconnect(), 1600);
}
