/**
 * The room's sound, synthesised.
 *
 * There are no audio files here and nothing is fetched. Every sound in this
 * module is built out of oscillators and a noise buffer at the moment it is
 * played, which is not a compromise for this particular room: a dissonant
 * cluster, a filter sweep and a noise swell IS how a stinger is made, and
 * building it live means it can be tuned by changing a number rather than by
 * re-rendering a file.
 *
 * Two rules the browser imposes, and one this site imposes:
 *
 *   - An AudioContext created before a user gesture starts suspended. `unlock`
 *     is therefore called from the click that enters the room, never on mount.
 *   - Nothing is constructed until that first call, so a visitor who never
 *     presses the button never pays for any of it.
 *   - Muting is remembered. Somebody who turned the sound off once did not
 *     mean "off until I reload".
 */

const MUTE_KEY = "experiments:muted";

type Kit = {
  ctx: AudioContext;
  master: GainNode;
  noise: AudioBuffer;
  drone: { stop: () => void } | null;
};

let kit: Kit | null = null;
let muted = false;

/* ---------------------------------------------------------------------------
   Setup
   ------------------------------------------------------------------------- */

export function isMuted(): boolean {
  return muted;
}

/** Read the remembered preference. Safe to call during render. */
export function loadMuted(): boolean {
  if (typeof window === "undefined") return false;
  try {
    muted = window.localStorage.getItem(MUTE_KEY) === "1";
  } catch {
    // A locked-down profile is not a reason to be silent, only a reason not
    // to remember.
  }
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    window.localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {
    /* preference is not persisted; the toggle still works for this visit */
  }
  if (kit) {
    kit.master.gain.setTargetAtTime(value ? 0 : 1, kit.ctx.currentTime, 0.04);
  }
}

/** Two seconds of white noise, reused by every sound that needs any. */
function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buf;
}

/**
 * Build the audio graph, or resume it.
 *
 * Must be called from inside a user gesture. Returns false when the browser
 * has no Web Audio at all, so callers can carry on silently rather than
 * branching on it everywhere.
 */
export function unlock(): boolean {
  if (typeof window === "undefined") return false;

  if (!kit) {
    const Ctor =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext })
        .webkitAudioContext;
    if (!Ctor) return false;

    const ctx = new Ctor();
    const master = ctx.createGain();
    master.gain.value = muted ? 0 : 1;
    master.connect(ctx.destination);
    kit = { ctx, master, noise: makeNoise(ctx), drone: null };
  }

  // Safari in particular hands back a context that is already running but
  // suspended again by the time anything is scheduled on it.
  if (kit.ctx.state === "suspended") void kit.ctx.resume();
  return true;
}

export function dispose() {
  if (!kit) return;
  kit.drone?.stop();
  void kit.ctx.close();
  kit = null;
}

/* ---------------------------------------------------------------------------
   Voices
   ------------------------------------------------------------------------- */

function noiseSource(k: Kit) {
  const src = k.ctx.createBufferSource();
  src.buffer = k.noise;
  src.loop = true;
  return src;
}

/**
 * The hit on the cut to black.
 *
 * Three things at once, which is what makes a stinger land rather than just
 * being loud: a low cluster tuned a semitone apart so it beats against itself,
 * a noise swell pushed up through a rising band-pass, and a hard transient on
 * the front so the ear registers an impact before it registers a pitch. The
 * long tail is the cluster alone under a lowpass closing down to nothing.
 */
export function sting() {
  if (!kit || muted) return;
  const { ctx, master } = kit;
  const t = ctx.currentTime;

  const bus = ctx.createGain();
  bus.gain.value = 0.9;
  bus.connect(master);

  // The cluster. A minor second at the bottom of hearing is the whole trick.
  const tone = ctx.createGain();
  tone.gain.setValueAtTime(0.0001, t);
  tone.gain.exponentialRampToValueAtTime(0.5, t + 0.012);
  tone.gain.exponentialRampToValueAtTime(0.0001, t + 3.6);

  const shape = ctx.createBiquadFilter();
  shape.type = "lowpass";
  shape.frequency.setValueAtTime(2200, t);
  shape.frequency.exponentialRampToValueAtTime(140, t + 3.2);
  shape.Q.value = 1.2;

  tone.connect(shape);
  shape.connect(bus);

  for (const [hz, type, gain] of [
    [41.2, "sawtooth", 0.5],
    [43.65, "sawtooth", 0.42],
    [82.4, "triangle", 0.3],
    [110.0, "triangle", 0.16],
  ] as const) {
    const osc = ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(hz * 1.06, t);
    // A slight downward bend. Nothing in a room settles exactly on pitch.
    osc.frequency.exponentialRampToValueAtTime(hz, t + 1.4);
    const g = ctx.createGain();
    g.gain.value = gain;
    osc.connect(g);
    g.connect(tone);
    osc.start(t);
    osc.stop(t + 3.8);
  }

  // The swell: noise climbing a band-pass, cut off hard at the top.
  const swell = noiseSource(kit);
  const band = ctx.createBiquadFilter();
  band.type = "bandpass";
  band.Q.value = 5;
  band.frequency.setValueAtTime(320, t);
  band.frequency.exponentialRampToValueAtTime(4200, t + 0.42);
  const sg = ctx.createGain();
  sg.gain.setValueAtTime(0.0001, t);
  sg.gain.exponentialRampToValueAtTime(0.28, t + 0.4);
  sg.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  swell.connect(band);
  band.connect(sg);
  sg.connect(bus);
  swell.start(t);
  swell.stop(t + 1.3);

  // The transient. 40ms, and it is what you actually flinch at.
  const hit = noiseSource(kit);
  const hp = ctx.createBiquadFilter();
  hp.type = "highpass";
  hp.frequency.value = 1400;
  const hg = ctx.createGain();
  hg.gain.setValueAtTime(0.5, t);
  hg.gain.exponentialRampToValueAtTime(0.0001, t + 0.22);
  hit.connect(hp);
  hp.connect(hg);
  hg.connect(bus);
  hit.start(t);
  hit.stop(t + 0.3);
}

/**
 * Room tone: the building, not the scene.
 *
 * Deliberately almost inaudible. Its whole job is to stop the room sounding
 * like a switched-off speaker, and the moment anybody can identify it as a
 * hum it is too loud.
 */
export function startDrone() {
  if (!kit || kit.drone || muted) return;
  const { ctx, master } = kit;
  const t = ctx.currentTime;

  const bus = ctx.createGain();
  bus.gain.setValueAtTime(0.0001, t);
  bus.gain.exponentialRampToValueAtTime(0.055, t + 4);
  bus.connect(master);

  const parts: Array<OscillatorNode | AudioBufferSourceNode> = [];

  for (const hz of [42, 63.5, 84.5]) {
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.value = hz > 80 ? 0.18 : 0.5;
    osc.connect(g);
    g.connect(bus);
    osc.start(t);
    parts.push(osc);
  }

  // Air: noise with everything above a few hundred hertz taken off it.
  const air = noiseSource(kit);
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 380;
  const ag = ctx.createGain();
  ag.gain.value = 0.16;
  air.connect(lp);
  lp.connect(ag);
  ag.connect(bus);
  air.start(t);
  parts.push(air);

  // A very slow wobble, so it never sits perfectly still.
  const lfo = ctx.createOscillator();
  lfo.frequency.value = 0.07;
  const lfoGain = ctx.createGain();
  lfoGain.gain.value = 0.014;
  lfo.connect(lfoGain);
  lfoGain.connect(bus.gain);
  lfo.start(t);
  parts.push(lfo);

  kit.drone = {
    stop: () => {
      const now = ctx.currentTime;
      bus.gain.cancelScheduledValues(now);
      bus.gain.setTargetAtTime(0.0001, now, 0.5);
      for (const p of parts) {
        try {
          p.stop(now + 2);
        } catch {
          /* already stopped */
        }
      }
    },
  };
}

export function stopDrone() {
  if (!kit?.drone) return;
  kit.drone.stop();
  kit.drone = null;
}

/** A short filtered noise burst. The basis of paper, latches and clicks. */
function burst(
  gain: number,
  ms: number,
  filter: BiquadFilterType,
  from: number,
  to: number,
  q = 1,
) {
  if (!kit || muted) return;
  const { ctx, master } = kit;
  const t = ctx.currentTime;
  const dur = ms / 1000;

  const src = noiseSource(kit);
  const f = ctx.createBiquadFilter();
  f.type = filter;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + dur);

  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + Math.min(0.02, dur * 0.3));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  src.connect(f);
  f.connect(g);
  g.connect(master);
  src.start(t);
  src.stop(t + dur + 0.05);
}

/** One sheet turning. */
export const page = () => burst(0.14, 260, "bandpass", 1800, 5200, 1.4);

/** A file coming off the shelf, or a cover falling open. */
export const latch = () => burst(0.12, 130, "bandpass", 700, 2400, 2.2);

/**
 * One key going down.
 *
 * Short and dry, with a little more top than the latch: a keyboard is a small
 * hard thing hitting a small hard thing, and the whole sound is the attack. It
 * is detuned very slightly at random so that typing does not come out as the
 * same click repeated, which is the thing that makes synthesised keys sound
 * synthesised.
 */
export const keypress = () =>
  burst(0.09, 42, "bandpass", 2600 + Math.random() * 1400, 900, 3.2);

/** A pen leaving the pot, and again when it lands. */
export const toss = () => burst(0.07, 90, "highpass", 1200, 3800, 1.1);

/** The camera settling somewhere new. Very quiet, almost a felt thing. */
export const settle = () => burst(0.05, 200, "lowpass", 900, 220);

/** A piece recovered: the one sound in the room that is not sinister. */
export function recovered() {
  if (!kit || muted) return;
  const { ctx, master } = kit;
  const t = ctx.currentTime;

  const bus = ctx.createGain();
  bus.gain.value = 0.16;
  bus.connect(master);

  // A fifth, arriving a beat apart, with a soft attack so it reads as relief
  // rather than as a notification.
  [
    [196.0, 0],
    [293.66, 0.1],
    [392.0, 0.2],
  ].forEach(([hz, delay]) => {
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = hz;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t + delay);
    g.gain.exponentialRampToValueAtTime(0.32, t + delay + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + delay + 1.5);
    osc.connect(g);
    g.connect(bus);
    osc.start(t + delay);
    osc.stop(t + delay + 1.7);
  });
}
