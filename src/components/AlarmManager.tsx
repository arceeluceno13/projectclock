import { useEffect, useMemo, useRef, useState } from "react";

const TZ = "Asia/Manila";

type AlarmSound = "beep" | "chime" | "siren" | "bell" | "digital" | "none";

type AlarmItem = {
  id: string;
  label: string;
  time: string; // "HH:MM"
  enabled: boolean;
  sound: AlarmSound;
  snoozeUntilMs?: number | null;
  lastFiredKey?: string | null;
};

function uid(): string {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

function parseHHMM(value: string): { hh: number; mm: number } {
  const [h, m] = value.split(":").map((x) => Number(x));
  return {
    hh: Number.isFinite(h) ? Math.min(23, Math.max(0, h)) : 0,
    mm: Number.isFinite(m) ? Math.min(59, Math.max(0, m)) : 0,
  };
}

function getPHParts(date: Date) {
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    year: Number(get("year")),
    month: Number(get("month")),
    day: Number(get("day")),
    hh: Number(get("hour")),
    mm: Number(get("minute")),
    ss: Number(get("second")),
  };
}

function msToClock(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  return `${pad2(hh)}:${pad2(mm)}:${pad2(ss)}`;
}

// ---------- Sound engine ----------
declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

function withAudioCtx(run: (ctx: AudioContext, t0: number) => void): void {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return;

  const ctx = new AudioCtx();
  const t0 = ctx.currentTime;

  run(ctx, t0);

  setTimeout(() => {
    ctx.close().catch(() => {});
  }, 1800);
}

function beep(ctx: AudioContext, t: number, freq: number, dur: number, vol = 0.22) {
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sine";
  osc.frequency.value = freq;

  gain.gain.setValueAtTime(0.0001, t);
  gain.gain.exponentialRampToValueAtTime(vol, t + 0.01);
  gain.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(t);
  osc.stop(t + dur);
}

function playAlarmSound(sound: AlarmSound): void {
  if (sound === "none") return;

  withAudioCtx((ctx, t0) => {
    if (sound === "beep") {
      beep(ctx, t0 + 0.0, 880, 0.18);
      beep(ctx, t0 + 0.22, 880, 0.18);
      beep(ctx, t0 + 0.44, 880, 0.18);
      return;
    }
    if (sound === "chime") {
      beep(ctx, t0 + 0.00, 784, 0.16);
      beep(ctx, t0 + 0.20, 988, 0.16);
      beep(ctx, t0 + 0.40, 1175, 0.22);
      return;
    }
    if (sound === "bell") {
      beep(ctx, t0 + 0.00, 1200, 0.10, 0.18);
      beep(ctx, t0 + 0.00, 1320, 0.10, 0.14);
      beep(ctx, t0 + 0.16, 1200, 0.10, 0.18);
      beep(ctx, t0 + 0.16, 1320, 0.10, 0.14);
      return;
    }
    if (sound === "digital") {
      beep(ctx, t0 + 0.00, 900, 0.08, 0.18);
      beep(ctx, t0 + 0.12, 1100, 0.08, 0.18);
      beep(ctx, t0 + 0.24, 1300, 0.08, 0.18);
      beep(ctx, t0 + 0.36, 1500, 0.08, 0.18);
      return;
    }
    if (sound === "siren") {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      gain.gain.value = 0.0001;

      osc.connect(gain);
      gain.connect(ctx.destination);

      gain.gain.exponentialRampToValueAtTime(0.22, t0 + 0.02);
      osc.frequency.setValueAtTime(600, t0);
      osc.frequency.linearRampToValueAtTime(1400, t0 + 0.35);
      osc.frequency.linearRampToValueAtTime(600, t0 + 0.70);
      gain.gain.exponentialRampToValueAtTime(0.0001, t0 + 1.0);

      osc.start(t0);
      osc.stop(t0 + 1.05);
    }
  });
}

export default function AlarmManager() {
  const STORAGE_KEY = "alarmManager.alarms.v1";

  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(t);
  }, []);

  const [alarms, setAlarms] = useState<AlarmItem[]>(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw) as AlarmItem[];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(alarms));
  }, [alarms]);

  // ✅ queue collapsed by default
  const [showQueue, setShowQueue] = useState<boolean>(false);

  // If no alarms, auto-open queue so user sees the area
  useEffect(() => {
    if (alarms.length === 0) setShowQueue(true);
  }, [alarms.length]);

  // form state
  const [label, setLabel] = useState<string>("New Alarm");
  const [time, setTime] = useState<string>("08:00");
  const [sound, setSound] = useState<AlarmSound>("chime");
  const [enabled, setEnabled] = useState<boolean>(true);

  const [ringing, setRinging] = useState<{ alarmId: string; label: string; sound: AlarmSound } | null>(null);
  const ringIntervalRef = useRef<number | null>(null);

  const ph = useMemo(() => getPHParts(now), [now]);
  const todayKey = `${ph.year}-${pad2(ph.month)}-${pad2(ph.day)}`;
  const nowMinutes = ph.hh * 60 + ph.mm;

  const computed = useMemo(() => {
    const nowLocalApprox = new Date(ph.year, ph.month - 1, ph.day, ph.hh, ph.mm, ph.ss, 0).getTime();

    const list = alarms.map((a) => {
      const { hh, mm } = parseHHMM(a.time);
      const alarmMinutes = hh * 60 + mm;

      let nextMs = new Date(ph.year, ph.month - 1, ph.day, hh, mm, 0, 0).getTime();
      if (alarmMinutes < nowMinutes || (alarmMinutes === nowMinutes && ph.ss > 0)) {
        nextMs += 24 * 60 * 60 * 1000;
      }

      if (a.snoozeUntilMs && a.snoozeUntilMs > nowLocalApprox) nextMs = a.snoozeUntilMs;

      return { alarm: a, nextMs, msToNext: Math.max(0, nextMs - nowLocalApprox) };
    });

    const nextActive =
      list.filter((x) => x.alarm.enabled).sort((a, b) => a.nextMs - b.nextMs)[0] ?? null;

    return { list, nextActive };
  }, [alarms, ph, nowMinutes]);

  // Fire alarms when due
  useEffect(() => {
    const nowLocalApprox = new Date(ph.year, ph.month - 1, ph.day, ph.hh, ph.mm, ph.ss, 0).getTime();

    setAlarms((prev) => {
      let changed = false;

      const next = prev.map((a) => {
        if (!a.enabled) return a;

        const { hh, mm } = parseHHMM(a.time);
        const dueByTime = ph.hh === hh && ph.mm === mm;
        const dueBySnooze = a.snoozeUntilMs != null && nowLocalApprox >= a.snoozeUntilMs;

        if (!dueByTime && !dueBySnooze) return a;

        const fireKey = dueBySnooze
          ? `SNOOZE-${a.id}-${a.snoozeUntilMs}`
          : `${todayKey}-${a.id}-${a.time}`;

        if (a.lastFiredKey === fireKey) return a;

        queueMicrotask(() => {
          setRinging({ alarmId: a.id, label: a.label, sound: a.sound });
          playAlarmSound(a.sound);

          if (ringIntervalRef.current !== null) window.clearInterval(ringIntervalRef.current);
          ringIntervalRef.current = window.setInterval(() => playAlarmSound(a.sound), 1300);
        });

        changed = true;
        return { ...a, lastFiredKey: fireKey, snoozeUntilMs: null };
      });

      return changed ? next : prev;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ph.hh, ph.mm, ph.ss, todayKey]);

  useEffect(() => {
    return () => {
      if (ringIntervalRef.current !== null) window.clearInterval(ringIntervalRef.current);
    };
  }, []);

  const stopRinging = () => {
    setRinging(null);
    if (ringIntervalRef.current !== null) {
      window.clearInterval(ringIntervalRef.current);
      ringIntervalRef.current = null;
    }
  };

  const snooze5 = () => {
    if (!ringing) return;
    const nowLocalApprox = new Date(ph.year, ph.month - 1, ph.day, ph.hh, ph.mm, ph.ss, 0).getTime();
    const snoozeUntil = nowLocalApprox + 5 * 60 * 1000;

    setAlarms((p) => p.map((a) => (a.id === ringing.alarmId ? { ...a, snoozeUntilMs: snoozeUntil } : a)));
    stopRinging();
  };

  const addAlarm = () => {
    const item: AlarmItem = {
      id: uid(),
      label: label.trim() || "Alarm",
      time,
      enabled,
      sound,
      snoozeUntilMs: null,
      lastFiredKey: null,
    };
    setAlarms((p) => [item, ...p]);
    setShowQueue(true); // show when user adds
  };

  const toggleAlarm = (id: string, v: boolean) =>
    setAlarms((p) => p.map((a) => (a.id === id ? { ...a, enabled: v } : a)));
  const changeSound = (id: string, v: AlarmSound) =>
    setAlarms((p) => p.map((a) => (a.id === id ? { ...a, sound: v } : a)));
  const changeTime = (id: string, v: string) =>
    setAlarms((p) => p.map((a) => (a.id === id ? { ...a, time: v } : a)));
  const changeLabel = (id: string, v: string) =>
    setAlarms((p) => p.map((a) => (a.id === id ? { ...a, label: v } : a)));
  const removeAlarm = (id: string) => {
    setAlarms((p) => p.filter((a) => a.id !== id));
    if (ringing?.alarmId === id) stopRinging();
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      {/* Ringing overlay */}
      {ringing && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/70">
          <div className="w-[min(520px,92vw)] rounded-3xl border border-rose-500/30 bg-slate-950 p-6">
            <div className="text-sm text-rose-300">ALARM RINGING</div>
            <div className="mt-1 text-2xl font-semibold">{ringing.label}</div>
            <div className="mt-1 text-sm text-slate-400">
              Sound: <span className="text-slate-200">{ringing.sound}</span>
            </div>

            <div className="mt-6 flex gap-3">
              <button
                onClick={stopRinging}
                className="rounded-2xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition font-medium"
              >
                Stop
              </button>
              <button
                onClick={snooze5}
                className="rounded-2xl px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
              >
                Snooze 5 min
              </button>
            </div>

            <p className="mt-4 text-xs text-slate-500">
              Some browsers require user interaction before audio plays.
            </p>
          </div>
        </div>
      )}

      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Alarms</h2>
        </div>

        <button
          onClick={() => setShowQueue((v) => !v)}
          className="rounded-2xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
          title="Show/Hide alarms queue"
        >
          {showQueue ? `Hide Alarms` : `Show Alarms (${alarms.length})`}
        </button>
      </div>

      {/* Current status (always visible) */}
      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/30 p-5">
        {computed.nextActive ? (
          <div className="flex items-center justify-between gap-4">
            <div>
              <div className="text-sm text-slate-400">Next alarm</div>
              <div className="text-xl font-semibold">
                {computed.nextActive.alarm.label} • {computed.nextActive.alarm.time}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                Starts in:{" "}
                <span className="font-mono text-slate-200">
                  {msToClock(computed.nextActive.msToNext)}
                </span>{" "}
                • Sound: <span className="text-slate-300">{computed.nextActive.alarm.sound}</span>
              </div>
            </div>
            <span className="text-xs px-3 py-1 rounded-full border bg-emerald-500/10 text-emerald-300 border-emerald-500/20">
              ARMED
            </span>
          </div>
        ) : (
          <div className="text-slate-400">No enabled alarms. Turn one on to see the next alarm.</div>
        )}
      </div>

      {/* Queue (collapsible) */}
      {showQueue && (
        <>
          {/* Add alarm */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <label className="block text-sm text-slate-400">Label</label>
              <input
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <label className="block text-sm text-slate-400">Time</label>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
              />
            </div>

            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
              <label className="block text-sm text-slate-400">Sound</label>
              <select
                value={sound}
                onChange={(e) => setSound(e.target.value as AlarmSound)}
                className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
              >
                <option value="beep">Beep</option>
                <option value="chime">Chime</option>
                <option value="siren">Siren</option>
                <option value="bell">Bell</option>
                <option value="digital">Digital</option>
                <option value="none">None</option>
              </select>
            </div>

            <div className="sm:col-span-4 flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="h-4 w-4 accent-emerald-500"
                />
                Enabled
              </label>

              <button
                onClick={addAlarm}
                className="rounded-2xl px-4 py-2 bg-emerald-600 hover:bg-emerald-500 transition font-medium"
              >
                Add Alarm
              </button>
            </div>
          </div>

          {/* List */}
          <div className="mt-5">
            <div className="text-sm text-slate-400 mb-2">Your alarms ({alarms.length})</div>

            <div className="grid grid-cols-1 gap-2">
              {alarms.length === 0 ? (
                <div className="text-slate-500 text-sm">No alarms yet. Add one above.</div>
              ) : (
                computed.list
                  .slice()
                  .sort((a, b) => a.nextMs - b.nextMs)
                  .map(({ alarm, msToNext }) => (
                    <div key={alarm.id} className="rounded-2xl border border-slate-800 bg-slate-950/20 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <input
                              value={alarm.label}
                              onChange={(e) => changeLabel(alarm.id, e.target.value)}
                              className="w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
                            />
                            <span
                              className={[
                                "text-xs px-3 py-1 rounded-full border whitespace-nowrap",
                                alarm.enabled
                                  ? "bg-emerald-500/10 text-emerald-300 border-emerald-500/20"
                                  : "bg-slate-500/10 text-slate-300 border-slate-500/20",
                              ].join(" ")}
                            >
                              {alarm.enabled ? "ON" : "OFF"}
                            </span>
                          </div>

                          <div className="mt-2 grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <div className="text-xs text-slate-500">Time</div>
                              <input
                                type="time"
                                value={alarm.time}
                                onChange={(e) => changeTime(alarm.id, e.target.value)}
                                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
                              />
                            </div>

                            <div>
                              <div className="text-xs text-slate-500">Sound</div>
                              <select
                                value={alarm.sound}
                                onChange={(e) => changeSound(alarm.id, e.target.value as AlarmSound)}
                                className="mt-1 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
                              >
                                <option value="beep">Beep</option>
                                <option value="chime">Chime</option>
                                <option value="siren">Siren</option>
                                <option value="bell">Bell</option>
                                <option value="digital">Digital</option>
                                <option value="none">None</option>
                              </select>
                            </div>

                            <div>
                              <div className="text-xs text-slate-500">Next in</div>
                              <div className="mt-1 rounded-xl border border-slate-800 bg-slate-900/30 px-3 py-2 font-mono text-slate-200">
                                {alarm.enabled ? msToClock(msToNext) : "—"}
                              </div>
                            </div>
                          </div>
                        </div>

                        <div className="flex flex-col gap-2">
                          <button
                            onClick={() => toggleAlarm(alarm.id, !alarm.enabled)}
                            className="rounded-2xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
                          >
                            {alarm.enabled ? "Disable" : "Enable"}
                          </button>

                          <button
                            onClick={() => playAlarmSound(alarm.sound)}
                            className="rounded-2xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
                            title="Test sound"
                          >
                            Test
                          </button>

                          <button
                            onClick={() => removeAlarm(alarm.id)}
                            className="rounded-2xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}