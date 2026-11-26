/**
 * Sound effects synthesized with the Web Audio API — no audio files, works offline
 * in the browser and the desktop app. Supports 5 selectable ProChess sound packs.
 */
import type { SoundPackId } from "@/lib/settings/settings";

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

/** Short wooden/metallic tap depending on pack. */
function tap(
  ac: AudioContext,
  out: AudioNode,
  at: number,
  gain: number,
  pitch: number,
  pack: SoundPackId,
) {
  const packPitch =
    pack === "metal"
      ? pitch * 1.65
      : pack === "soft"
        ? pitch * 0.65
        : pack === "minimal"
          ? pitch * 1.15
          : pack === "premium"
            ? pitch * 0.92
            : pitch;

  const src = ac.createBufferSource();
  src.buffer = noise(ac);
  const band = ac.createBiquadFilter();
  band.type = "bandpass";
  band.frequency.value = packPitch;
  band.Q.value = pack === "metal" ? 5.2 : pack === "soft" ? 0.9 : 1.5;
  const g = ac.createGain();
  const len = pack === "minimal" ? 0.032 : pack === "soft" ? 0.075 : 0.06;
  g.gain.setValueAtTime(0, at);
  g.gain.linearRampToValueAtTime(gain, at + 0.002);
  g.gain.exponentialRampToValueAtTime(0.0008, at + len);
  src.connect(band).connect(g).connect(out);
  src.start(at);
  src.stop(at + len + 0.02);

  const body = ac.createOscillator();
  body.type = pack === "metal" ? "triangle" : "sine";
  body.frequency.setValueAtTime(packPitch / (pack === "metal" ? 4.2 : 9), at);
  body.frequency.exponentialRampToValueAtTime(packPitch / 18, at + 0.08);
  const bg = ac.createGain();
  bg.gain.setValueAtTime(0, at);
  bg.gain.linearRampToValueAtTime(gain * (pack === "minimal" ? 0.55 : 0.9), at + 0.003);
  bg.gain.exponentialRampToValueAtTime(0.0008, at + (pack === "premium" ? 0.12 : 0.09));
  body.connect(bg).connect(out);
  body.start(at);
  body.stop(at + 0.13);
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

/** Plays a clip at volume 0–100 using the selected ProChess sound pack. */
export function playClip(clip: SoundClip, volume: number, pack: SoundPackId = "wood"): void {
  const ac = context();
  if (!ac || volume <= 0) return;
  const master = ac.createGain();
  const packMul =
    pack === "soft" ? 0.72 : pack === "minimal" ? 0.65 : pack === "premium" ? 0.95 : 0.85;
  master.gain.value = Math.pow(Math.max(0, Math.min(100, volume)) / 100, 1.6) * packMul;
  master.connect(ac.destination);
  const t = ac.currentTime + 0.005;

  switch (clip) {
    case "move":
      tap(ac, master, t, 0.9, 1700, pack);
      break;
    case "capture":
      tap(ac, master, t, 0.75, 2300, pack);
      tap(ac, master, t + 0.045, 1, 1500, pack);
      break;
    case "check":
      tap(ac, master, t, 0.7, 1700, pack);
      tone(ac, master, t + 0.02, 880, 0.16, 0.22, "sine");
      tone(ac, master, t + 0.11, 1174.7, 0.22, 0.2, "sine");
      break;
    case "checkmate":
      tap(ac, master, t, 0.85, 1500, pack);
      tone(ac, master, t + 0.02, 587.33, 0.28, 0.22, "triangle");
      tone(ac, master, t + 0.12, 880, 0.45, 0.24, "sine");
      break;
    case "mistake":
      tone(ac, master, t, 293.66, 0.16, 0.16, "sawtooth");
      tone(ac, master, t + 0.11, 220, 0.22, 0.14, "triangle");
      break;
    case "achievement":
      [587.33, 739.99, 880, 1174.66].forEach((f, i) =>
        tone(ac, master, t + i * 0.08, f, 0.35, 0.18, "sine"),
      );
      break;
    case "menu": {
      // Soft, deep, damped mechanical button "thock" — warm low-passed body, zero harsh highs
      const baseFreq =
        pack === "metal" ? 245 : pack === "soft" ? 160 : pack === "minimal" ? 190 : 205;
      const noiseSrc = ac.createBufferSource();
      noiseSrc.buffer = noise(ac);
      const lpf = ac.createBiquadFilter();
      lpf.type = "lowpass";
      lpf.frequency.value = pack === "metal" ? 1050 : pack === "soft" ? 580 : 780;
      lpf.Q.value = 0.7;
      const ng = ac.createGain();
      ng.gain.setValueAtTime(0, t);
      ng.gain.linearRampToValueAtTime(0.16, t + 0.002);
      ng.gain.exponentialRampToValueAtTime(0.0008, t + 0.022);
      noiseSrc.connect(lpf).connect(ng).connect(master);
      noiseSrc.start(t);
      noiseSrc.stop(t + 0.03);

      const thock = ac.createOscillator();
      thock.type = "sine";
      thock.frequency.setValueAtTime(baseFreq, t);
      thock.frequency.exponentialRampToValueAtTime(baseFreq * 0.48, t + 0.036);
      const tg = ac.createGain();
      tg.gain.setValueAtTime(0, t);
      tg.gain.linearRampToValueAtTime(0.24, t + 0.0025);
      tg.gain.exponentialRampToValueAtTime(0.0008, t + 0.042);
      thock.connect(tg).connect(master);
      thock.start(t);
      thock.stop(t + 0.05);
      break;
    }
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
