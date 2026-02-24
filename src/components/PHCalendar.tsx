import { useEffect, useMemo, useState } from "react";

const TZ = "Asia/Manila";

type PHParts = { year: number; month: number; day: number };

function pad2(n: number): string {
  return String(n).padStart(2, "0");
}

// Get "today" based on Philippine time (safe: PH has no DST)
function getPHTodayParts(date: Date): PHParts {
  const fmt = new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });

  const parts = fmt.formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "00";

  return {
    year: Number(get("year")),
    month: Number(get("month")), // 1..12
    day: Number(get("day")),
  };
}

function monthLabel(year: number, monthIndex0: number): string {
  // Use a fixed date just for formatting month name
  const d = new Date(year, monthIndex0, 1);
  return new Intl.DateTimeFormat("en-PH", {
    timeZone: TZ,
    month: "long",
    year: "numeric",
  }).format(d);
}

function startOfMonth(year: number, monthIndex0: number): Date {
  return new Date(year, monthIndex0, 1);
}

function daysInMonth(year: number, monthIndex0: number): number {
  // day 0 of next month = last day of this month
  return new Date(year, monthIndex0 + 1, 0).getDate();
}

function weekdayIndexMon0(date: Date): number {
  // JS: Sun=0..Sat=6. We want Mon=0..Sun=6
  const js = date.getDay(); // 0..6
  return (js + 6) % 7;
}

export default function PHCalendar() {
  // keep "now" ticking so "today" updates correctly
  const [now, setNow] = useState<Date>(() => new Date());
  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000); // every minute
    return () => window.clearInterval(t);
  }, []);

  const today = useMemo(() => getPHTodayParts(now), [now]);

  // View state (year + monthIndex0)
  const [viewYear, setViewYear] = useState<number>(() => today.year);
  const [viewMonth0, setViewMonth0] = useState<number>(() => today.month - 1);

  // When PH date changes (midnight), keep view snapped to current month if user hasn’t moved
  useEffect(() => {
    // If currently viewing the old "today month", update to new month automatically
    // (simple rule: always sync on mount; if user navigates, they can keep navigating)
  }, [today.year, today.month]);

  const grid = useMemo(() => {
    const first = startOfMonth(viewYear, viewMonth0);
    const firstIdx = weekdayIndexMon0(first); // 0..6 (Mon..Sun)
    const dim = daysInMonth(viewYear, viewMonth0);

    // 6 rows x 7 cols = 42 cells
    const cells: Array<{ day: number | null; key: string }> = [];
    for (let i = 0; i < 42; i++) {
      const dayNum = i - firstIdx + 1;
      if (dayNum >= 1 && dayNum <= dim) {
        cells.push({ day: dayNum, key: `${viewYear}-${viewMonth0}-${dayNum}` });
      } else {
        cells.push({ day: null, key: `empty-${viewYear}-${viewMonth0}-${i}` });
      }
    }
    return { firstIdx, dim, cells };
  }, [viewYear, viewMonth0]);

  const isToday = (day: number): boolean =>
    viewYear === today.year && viewMonth0 === today.month - 1 && day === today.day;

  const goPrev = () => {
    setViewMonth0((m) => {
      if (m === 0) {
        setViewYear((y) => y - 1);
        return 11;
      }
      return m - 1;
    });
  };

  const goNext = () => {
    setViewMonth0((m) => {
      if (m === 11) {
        setViewYear((y) => y + 1);
        return 0;
      }
      return m + 1;
    });
  };

  const goToday = () => {
    setViewYear(today.year);
    setViewMonth0(today.month - 1);
  };

  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">PH Calendar</h2>
          <p className="text-slate-400 text-sm">Month view • Asia/Manila</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={goPrev}
            className="rounded-2xl px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            aria-label="Previous month"
            title="Previous month"
          >
            ←
          </button>

          <button
            onClick={goToday}
            className="rounded-2xl px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            title="Go to current month"
          >
            Today
          </button>

          <button
            onClick={goNext}
            className="rounded-2xl px-3 py-2 text-sm bg-slate-800 hover:bg-slate-700 border border-slate-700 transition"
            aria-label="Next month"
            title="Next month"
          >
            →
          </button>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between">
        <div className="text-xl font-semibold">{monthLabel(viewYear, viewMonth0)}</div>
        <div className="text-xs text-slate-500">
          Today (PH): {today.year}-{pad2(today.month)}-{pad2(today.day)}
        </div>
      </div>

      <div className="mt-4 grid grid-cols-7 gap-2 text-xs text-slate-400">
        {weekdays.map((w) => (
          <div key={w} className="text-center">
            {w}
          </div>
        ))}
      </div>

      <div className="mt-2 grid grid-cols-7 gap-2">
        {grid.cells.map((c) => {
          if (c.day === null) {
            return (
              <div
                key={c.key}
                className="h-12 rounded-2xl border border-slate-800 bg-slate-950/20"
              />
            );
          }

          const todayCell = isToday(c.day);

          return (
            <div
              key={c.key}
              className={[
                "h-12 rounded-2xl border flex items-center justify-center font-medium transition",
                todayCell
                  ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-200"
                  : "border-slate-800 bg-slate-950/20 text-slate-100 hover:bg-slate-900/40",
              ].join(" ")}
              title={todayCell ? "Today (PH)" : undefined}
            >
              {c.day}
            </div>
          );
        })}
      </div>
    </div>
  );
}