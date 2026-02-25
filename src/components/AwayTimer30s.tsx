import { useEffect, useMemo, useRef, useState } from "react";
import type { AlarmSound } from "../utils/alarmSounds";
import { playTimeUp, playWarningTick } from "../utils/alarmSounds";

const DEFAULT_MS = 30_000;
const WARNING_SECONDS = 3;

const pad2 = (n: number): string => String(n).padStart(2, "0");

type AwayTimer30sProps = {
  alarmEnabled: boolean;
  alarmSound: AlarmSound;
};

export default function AwayTimer30s({ alarmEnabled, alarmSound }: AwayTimer30sProps) {
  const [enabled, setEnabled] = useState<boolean>(true);
  const [remainingMs, setRemainingMs] = useState<number>(DEFAULT_MS);
  const [away, setAway] = useState<boolean>(false);
  const [finished, setFinished] = useState<boolean>(false);

  const intervalRef = useRef<number | null>(null);
  const lastRef = useRef<number | null>(null);
  const lastWarnedSecond = useRef<number | null>(null);

  const remaining = useMemo(() => {
    const totalSec = Math.max(0, Math.ceil(remainingMs / 1000));
    return { mm: Math.floor(totalSec / 60), ss: totalSec % 60, totalSec };
  }, [remainingMs]);

  const isWarning = enabled && away && remaining.totalSec > 0 && remaining.totalSec <= WARNING_SECONDS;

  // Detect away (mouse leave OR tab hidden)
  useEffect(() => {
    const onMouseOver = (): void => setAway(false);

    const onMouseOut = (e: MouseEvent): void => {
      if ((e as any).relatedTarget === null) setAway(true);
    };

    const onVisibility = (): void => setAway(document.visibilityState !== "visible");

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

  // Reset if timer disabled
  useEffect(() => {
    if (!enabled) {
      setRemainingMs(DEFAULT_MS);
      setFinished(false);
      lastWarnedSecond.current = null;
    }
  }, [enabled]);

  // Countdown loop
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

  // Warning ticks
  useEffect(() => {
    if (!isWarning) return;
    if (!alarmEnabled) return;

    if (lastWarnedSecond.current !== remaining.totalSec) {
      lastWarnedSecond.current = remaining.totalSec;
      playWarningTick(alarmSound, remaining.totalSec);
    }
  }, [isWarning, remaining.totalSec, alarmEnabled, alarmSound]);

  // Final alarm at 0
  useEffect(() => {
    if (enabled && away && remaining.totalSec === 0 && !finished) {
      setFinished(true);
      if (alarmEnabled) playTimeUp(alarmSound);
    }
  }, [enabled, away, remaining.totalSec, finished, alarmEnabled, alarmSound]);

  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 dark:border-slate-800 dark:bg-slate-950/40">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">30s Away Timer</h2>
          <p className="text-slate-600 dark:text-slate-400 text-sm">
            Leaves tab = countdown. Return = reset.
          </p>
        </div>
        <div className="items-center">
          <span
            className={[
              "text-xs px-3 py-1 rounded-full border",
              enabled
                ? "bg-emerald-500/10 text-emerald-700 border-emerald-500/20 dark:text-emerald-300"
                : "bg-slate-500/10 text-slate-700 border-slate-500/20 dark:text-slate-300",
            ].join(" ")}
          >
            {enabled ? "ENABLED" : "DISABLED"}
          </span>
        </div>
      </div>

      <div
        className={[
          "mt-6 rounded-3xl border p-6 text-center font-mono transition-all duration-200",
          isWarning
            ? "border-red-500 bg-red-500/10 animate-pulse"
            : "border-slate-200 bg-slate-50 dark:border-slate-800 dark:bg-slate-900/30",
        ].join(" ")}
      >
        <div className={["text-5xl sm:text-6xl font-bold tabular-nums", isWarning ? "text-red-500" : ""].join(" ")}>
          {pad2(remaining.mm)}:{pad2(remaining.ss)}
        </div>

        {isWarning && <div className="mt-3 text-red-500 font-semibold">⚠ {remaining.totalSec} seconds left!</div>}
        {finished && away && enabled && <div className="mt-4 text-rose-500 font-semibold">⏰ Time’s up!</div>}
      </div>

      {/* ✅ Buttons stay here */}
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

      <div className="flex mt-4 text-xs text-slate-500 justify-center">
        Alarm: <span className="text-slate-300">{alarmEnabled ? alarmSound : "OFF"}</span>
      </div>
    </div>
  );
}