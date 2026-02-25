import { useState } from "react";
import PhilippineClock from "./components/PhilippineClock";
import AwayTimer30s from "./components/AwayTimer30s";
import PHCalendar from "./components/PHCalendar";
import Calculator from "./components/Calculator";
import SettingsPanel from "./components/SettingsPanel";
import uchiha from "./assets/uchiha.jpg";
import type { AlarmSound } from "./utils/alarmSounds";


export default function App() {
  const [settingsOpen, setSettingsOpen] = useState<boolean>(false);
  const [showCalendar, setShowCalendar] = useState<boolean>(false);
  const [showCalculator, setShowCalculator] = useState<boolean>(false);
  const [awayTimerEnabled, setAwayTimerEnabled] = useState(true);
  const [awayTimerAlarmEnabled, setAwayTimerAlarmEnabled] = useState(true);
  const [awayTimerAlarmSound, setAwayTimerAlarmSound] = useState<AlarmSound>("beep");

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-semibold">
              <img
                src={uchiha}
                alt="Uchiha"
                className="inline-block w-11 h-8 mr-2 -mt-1"
              />
            </h1>
          </div>

          <button
            onClick={() => setSettingsOpen(true)}
            className="rounded-2xl px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition text-sm"
          >
            Settings
          </button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhilippineClock />
          <AwayTimer30s
            alarmEnabled={awayTimerAlarmEnabled}
            alarmSound={awayTimerAlarmSound}
          />
          {showCalendar ? <PHCalendar /> : null}


          {showCalculator ? (
            <Calculator />
          ) : null}

        </div>
      </div>

      <SettingsPanel
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        showCalendar={showCalendar}
        setShowCalendar={setShowCalendar}
        showCalculator={showCalculator}
        setShowCalculator={setShowCalculator}
        awayTimerEnabled={awayTimerEnabled}
        setAwayTimerEnabled={setAwayTimerEnabled}
        awayTimerAlarmEnabled={awayTimerAlarmEnabled}
        setAwayTimerAlarmEnabled={setAwayTimerAlarmEnabled}
        awayTimerAlarmSound={awayTimerAlarmSound}
        setAwayTimerAlarmSound={setAwayTimerAlarmSound}
      />
    </div>
  );
}