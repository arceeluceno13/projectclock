import type { AlarmSound } from "../utils/alarmSounds";

type SettingsPanelProps = {
  open: boolean;
  onClose: () => void;

  showCalendar: boolean;
  setShowCalendar: (v: boolean) => void;

  showCalculator: boolean;
  setShowCalculator: (v: boolean) => void;

  awayTimerEnabled: boolean;
  setAwayTimerEnabled: (v: boolean) => void;

  awayTimerAlarmEnabled: boolean;
  setAwayTimerAlarmEnabled: (v: boolean) => void;

  awayTimerAlarmSound: AlarmSound;
  setAwayTimerAlarmSound: (v: AlarmSound) => void;
};

export default function SettingsPanel({
  open,
  onClose,
  showCalendar,
  setShowCalendar,
  showCalculator,
  setShowCalculator,
  awayTimerAlarmEnabled,
  setAwayTimerAlarmEnabled,
  awayTimerAlarmSound,
  setAwayTimerAlarmSound,
}: SettingsPanelProps) {
  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <button
        onClick={onClose}
        className="absolute inset-0 bg-black/60"
        aria-label="Close settings"
      />

      {/* Panel */}
      <div className="absolute right-0 top-0 h-full w-full sm:w-[420px] bg-slate-950 border-l border-slate-800 p-6 overflow-y-auto">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="text-xl font-semibold">Settings</h2>
            <p className="text-slate-400 text-sm mt-1">Toggle features on/off.</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-2xl px-3 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
          >
            Close
          </button>
        </div>

        <div className="mt-6 space-y-3">
          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <div>
              <div className="font-medium">Calendar</div>
              <div className="text-sm text-slate-400">Show/Hide PH month calendar</div>
            </div>

            <input
              type="checkbox"
              checked={showCalendar}
              onChange={(e) => setShowCalendar(e.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>

          <label className="flex items-center justify-between gap-4 rounded-2xl border border-slate-800 bg-slate-900/30 p-4">
            <div>
              <div className="font-medium">Calculator</div>
              <div className="text-sm text-slate-400">Show/Hide calculator widget</div>
            </div>

            <input
              type="checkbox"
              checked={showCalculator}
              onChange={(e) => setShowCalculator(e.target.checked)}
              className="h-5 w-5 accent-emerald-500"
            />
          </label>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-4 space-y-3">
            <div className="font-medium">Away Timer</div>

            <label className="flex items-center justify-between gap-4">
              <span className="text-sm text-slate-400">Enable alarm</span>
              <input
                type="checkbox"
                checked={awayTimerAlarmEnabled}
                onChange={(e) => setAwayTimerAlarmEnabled(e.target.checked)}
                className="h-5 w-5 accent-emerald-500"
              />
            </label>

            <label className="block">
              <span className="text-sm text-slate-400">Alarm sound</span>
              <select
                value={awayTimerAlarmSound}
                onChange={(e) => setAwayTimerAlarmSound(e.target.value as AlarmSound)}
                className="mt-2 w-full rounded-xl bg-slate-900 border border-slate-700 px-3 py-2 outline-none"
                disabled={!awayTimerAlarmEnabled}
              >
                <option value="beep">Beep</option>
                <option value="chime">Chime</option>
                <option value="siren">Siren</option>
                <option value="none">None</option>
              </select>
            </label>
          </div>
        </div>

        <p className="mt-6 text-xs text-slate-500">
          More features coming soon! If you have any suggestions, feel free to contact me:{" "}
          <a
            href="mailto:lucenoarcee0@gmail.com"
            className="text-emerald-400 hover:text-emerald-300"
          >
            Arcee Luceno
          </a>
        </p>
      </div>
    </div>
  );
}