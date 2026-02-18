import { useEffect, useMemo, useRef, useState } from "react";

const DEFAULT_MS = 30_000;
const WARNING_SECONDS = 3;

const pad2 = (n: number): string => String(n).padStart(2, "0");

// Extend Window typing for Safari
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function playBeep(freq = 880, durationMs = 200): void {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.value = freq;
  gain.gain.value = 0.0001;

  osc.connect(gain);
  gain.connect(ctx.destination);

  const t = ctx.currentTime;
  gain.gain.exponentialRampToValueAtTime(0.25, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + durationMs / 1000);

  osc.start();
  osc.stop(t + durationMs / 1000);

  osc.onended = () => {
    ctx.close().catch(() => {});
  };
}

export default function AwayTimer30s() {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_MS);
  const [away, setAway] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);

  // ✅ Fix ref types
  const intervalRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const lastWarnedSecond = useRef<number | null>(null);

  const remaining = useMemo(() => {
    const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
    return {
      mm: Math.floor(totalSec / 60),
      ss: totalSec % 60,
      totalSec,
    };
  }, [remainingMs]);

  const isWarning =
    enabled && away && remaining.totalSec > 0 && remaining.totalSec <= WARNING_SECONDS;

  // Detect away
  useEffect(() => {
    const onMouseOver = (): void => setAway(false);

    const onMouseOut = (e: MouseEvent): void => {
      // relatedTarget === null -> left window
      if ((e as any).relatedTarget === null) setAway(true);
    };

    const onVisibility = (): void => {
      setAway(document.visibilityState !== "visible");
    };

    document.addEventListener("mouseover", onMouseOver);
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("visibilitychange", onVisibility);

    onVisibility();

    return () => {
      document.removeEventListener("mouseover", onMouseOver);
      document.removeEventListener("mouseout", onMouseOut);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, []);

  // Reset when user comes back
  useEffect(() => {
    if (!away) {
      setRemainingMs(DEFAULT_MS);
      setFinished(false);
      lastWarnedSecond.current = null;
    }
  }, [away]);

  // Reset if disabled
  useEffect(() => {
    if (!enabled) {
      setRemainingMs(DEFAULT_MS);
      setFinished(false);
      lastWarnedSecond.current = null;
    }
  }, [enabled]);

  // Countdown
  useEffect(() => {
    const shouldRun = enabled && away && remainingMs > 0 && !finished;

    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    lastRef.current = null;

    if (!shouldRun) return;

    lastRef.current = performance.now();

    intervalRef.current = window.setInterval(() => {
      const now = performance.now();
      const last = lastRef.current ?? now;
      const delta = now - last;
      lastRef.current = now;

      setRemainingMs((prev) => Math.max(0, prev - delta));
    }, 100);

    return () => {
      if (intervalRef.current !== null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [enabled, away, remainingMs, finished]);

  // Warning beeps at 3,2,1
  useEffect(() => {
    if (!isWarning) return;

    if (lastWarnedSecond.current !== remaining.totalSec) {
      lastWarnedSecond.current = remaining.totalSec;
      playBeep(1000, 150);
    }
  }, [isWarning, remaining.totalSec]);

  // Final alarm at 0
  useEffect(() => {
    if (enabled && away && remaining.totalSec === 0 && !finished) {
      setFinished(true);
      playBeep(600, 1000);
    }
  }, [enabled, away, remaining.totalSec, finished]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">30s Away Timer</h2>
          <p className="text-slate-400 text-sm">Leaves tab = countdown. Return = reset.</p>
        </div>

        <span
          className={[
            "text-xs px-3 py-1 rounded-full border",
            enabled
              ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
              : "bg-slate-500/10 text-slate-300 border-slate-500/20",
          ].join(" ")}
        >
          {enabled ? "ENABLED" : "DISABLED"}
        </span>
      </div>

      <div
        className={[
          "mt-6 rounded-3xl border p-6 text-center font-mono transition-all duration-200",
          isWarning ? "border-red-500 bg-red-500/10 animate-pulse" : "border-slate-800 bg-slate-900/30",
        ].join(" ")}
      >
        <div
          className={[
            "text-5xl sm:text-6xl font-bold tabular-nums transition-colors",
            isWarning ? "text-red-400" : "",
          ].join(" ")}
        >
          {pad2(remaining.mm)}:{pad2(remaining.ss)}
        </div>

        {isWarning && (
          <div className="mt-3 text-red-400 font-semibold">⚠ {remaining.totalSec} seconds left!</div>
        )}

        {finished && away && enabled && (
          <div className="mt-4 text-rose-400 font-semibold">⏰ Time’s up!</div>
        )}
      </div>

      <div className="mt-6 flex gap-3 justify-center">
        <button
          onClick={() => setEnabled(true)}
          className="rounded-2xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition font-medium"
        >
          Enable
        </button>

        <button
          onClick={() => setEnabled(false)}
          className="rounded-2xl px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
        >
          Disable
        </button>
      </div>
    </div>
  );
}
