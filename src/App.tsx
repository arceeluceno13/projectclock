import PhilippineClock from "./components/PhilippineClock";
import AwayTimer30s from "./components/AwayTimer30s";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold">
            RC lazy project
          </h1>
          <p className="text-slate-400 mt-1">
            Everything is based on Asia/Manila time.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhilippineClock />
          <AwayTimer30s />
        </div>
      </div>
    </div>
  );
}
