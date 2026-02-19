import PhilippineClock from "./components/PhilippineClock";
import AwayTimer30s from "./components/AwayTimer30s";

export default function App() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6">
      <div className="max-w-6xl mx-auto">
        <div className="justify-center flex">
        <header className="mb-6">
          <h1 className="text-2xl sm:text-3xl font-semibold ">
            Boys at the Back
          </h1>
        </header>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PhilippineClock />
          <AwayTimer30s />
        </div>
      </div>
      <footer className="justify-center flex">
        <div className="max-w-6xl mx-auto mt-12 text-sm text-slate-500">
          all rights reserved © RC 2026.
           </div>
      </footer>
    </div>
  );
}
