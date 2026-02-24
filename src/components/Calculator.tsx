import { useMemo, useState } from "react";

function isSafeExpression(expr: string): boolean {
  // allow only numbers, spaces, basic operators, decimal points, parentheses
  return /^[0-9+\-*/().\s]+$/.test(expr);
}

function evaluateExpression(expr: string): string {
  const cleaned = expr.trim();
  if (!cleaned) return "";
  if (!isSafeExpression(cleaned)) return "Invalid characters";

  // Evaluate using Function after strict validation
  try {
    // eslint-disable-next-line no-new-func
    const result = Function(`"use strict"; return (${cleaned});`)();
    if (typeof result !== "number" || Number.isNaN(result)) return "Error";
    if (!Number.isFinite(result)) return "∞";
    return String(result);
  } catch {
    return "Error";
  }
}

export default function Calculator() {
  const [expr, setExpr] = useState<string>("");

  const result = useMemo(() => evaluateExpression(expr), [expr]);

  const add = (s: string) => setExpr((p) => p + s);
  const backspace = () => setExpr((p) => p.slice(0, -1));
  const clear = () => setExpr("");

  const onKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") e.currentTarget.blur();
  };

  return (
    <div className="rounded-3xl border border-slate-800 bg-slate-950/40 p-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold">Calculator</h2>
          <p className="text-slate-400 text-sm">Type an expression (e.g. 12/3 + 7*(2-1))</p>
        </div>
        <span className="text-xs px-3 py-1 rounded-full bg-sky-500/10 text-sky-300 border border-sky-500/20">
          BASIC
        </span>
      </div>

      <div className="mt-5 rounded-3xl border border-slate-800 bg-slate-900/30 p-4">
        <input
          value={expr}
          onChange={(e) => setExpr(e.target.value)}
          onKeyDown={onKey}
          placeholder="0"
          className="w-full bg-transparent outline-none font-mono text-xl text-slate-100"
        />
        <div className="mt-2 text-sm text-slate-400">
          Result: <span className="font-mono text-slate-200">{result || "—"}</span>
        </div>
      </div>

      <div className="mt-4 grid grid-cols-4 gap-2">
        {["7", "8", "9", "/"].map((k) => (
          <button
            key={k}
            onClick={() => add(k)}
            className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
          >
            {k}
          </button>
        ))}
        {["4", "5", "6", "*"].map((k) => (
          <button
            key={k}
            onClick={() => add(k)}
            className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
          >
            {k}
          </button>
        ))}
        {["1", "2", "3", "-"].map((k) => (
          <button
            key={k}
            onClick={() => add(k)}
            className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
          >
            {k}
          </button>
        ))}
        {["0", ".", "(", ")"].map((k) => (
          <button
            key={k}
            onClick={() => add(k)}
            className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
          >
            {k}
          </button>
        ))}

        <button
          onClick={() => add("+")}
          className="col-span-2 rounded-2xl py-3 bg-emerald-600 hover:bg-emerald-500 transition font-medium"
        >
          +
        </button>
        <button
          onClick={backspace}
          className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
        >
          ⌫
        </button>
        <button
          onClick={clear}
          className="rounded-2xl py-3 bg-slate-800 hover:bg-slate-700 border border-slate-700 transition font-medium"
        >
          C
        </button>
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Allowed: numbers, + - * /, decimals, parentheses.
      </p>
    </div>
  );
}