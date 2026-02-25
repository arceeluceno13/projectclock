export type AlarmSound = "beep" | "chime" | "siren" | "none";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function withAudioCtx(fn: (ctx: AudioContext, t0: number) => void): void {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const t0 = ctx.currentTime;

  try {
    fn(ctx, t0);
  } finally {
    // close after a short delay (let sound finish)
    setTimeout(() => {
      ctx.close().catch(() => {});
    }, 1500);
  }
}

function beep(ctx: AudioContext, t: number, freq: number, dur: number, gainValue = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(gainValue, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + dur);
}

export function playWarningTick(sound: AlarmSound, secondsLeft: number): void {
  if (sound === "none") return;

  // short tick on 3,2,1
  withAudioCtx((ctx, t0) => {
    const base = t0;
    if (sound === "beep") beep(ctx, base, 1100, 0.12, 0.18);
    else if (sound === "chime") beep(ctx, base, 880 + (3 - secondsLeft) * 120, 0.10, 0.16);
    else if (sound === "siren") beep(ctx, base, 1400, 0.08, 0.14);
  });
}

export function playTimeUp(sound: AlarmSound): void {
  if (sound === "none") return;

  withAudioCtx((ctx, t0) => {
    if (sound === "beep") {
      // long low beep
      beep(ctx, t0, 600, 0.9, 0.25);
    } else if (sound === "chime") {
      // pleasant 3-note chime
      beep(ctx, t0 + 0.00, 784, 0.18, 0.22);
      beep(ctx, t0 + 0.22, 988, 0.18, 0.22);
      beep(ctx, t0 + 0.44, 1175, 0.22, 0.22);
    } else if (sound === "siren") {
      // siren sweep
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      const t = t0;
      gain.gain.exponentialRampToValueAtTime(0.22, t + 0.02);
      osc.frequency.setValueAtTime(600, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.35);
      osc.frequency.linearRampToValueAtTime(600, t + 0.70);
      gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.95);

      osc.start(t);
      osc.stop(t + 1.0);
    }
  });
}