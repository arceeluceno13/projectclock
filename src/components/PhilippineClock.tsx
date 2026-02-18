import { useEffect, useMemo, useState } from "react";

type PartsResult = {
  dateText: string;
  hh: string;
  mm: string;
  ss: string;
  period: string;
};

function formatPH(date: Date): PartsResult {
  const dateFmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    weekday: "long",
    year: "numeric",
    month: "long",
    day: "2-digit",
  });

  const timeFmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: "Asia/Manila",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  const parts = timeFmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((p) => p.type === type)?.value ?? "";

  return {
    dateText: dateFmt.format(date),
    hh: get("hour"),
    mm: get("minute"),
    ss: get("second"),
    period: (get("dayPeriod") || "").toUpperCase(),
  };
}

export default function PhilippineClock() {
  const [now, setNow] = useState<Date>(() => new Date());

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 250);
    return () => window.clearInterval(t);
  }, []);

  const { dateText, hh, mm, ss, period } = useMemo(() => formatPH(now), [now]);

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Philippine Time</h2>
          <p className="text-slate-400 text-sm">Asia/Manila (PHT)</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          LIVE
        </span>
      </div>

      <div className="mt-6 text-center font-mono">
        <div className="text-5xl sm:text-6xl font-bold tabular-nums">
          {hh}
          <span className="text-slate-500">:</span>
          {mm}
          <span className="text-slate-500">:</span>
          {ss}
        </div>
        <div className="mt-2 text-slate-300 tracking-wide">{period}</div>
        <div className="mt-4 text-slate-400 text-sm">{dateText}</div>
      </div>
    </div>
  );
}
