"use client";

import { useState } from "react";
import type { PendingPrompt } from "@/lib/games/veld-eran/types";

interface Props {
  pending: PendingPrompt;
  onRoll: (result: number) => void;
}

export default function DiceModal({ pending, onRoll }: Props) {
  const [rolled, setRolled] = useState<number | null>(null);

  if (pending.kind !== "dice-move") return null;
  const needLabel = pending.needed === "even" ? "чётное" : "нечётное";

  const handleRoll = () => {
    const r = 1 + Math.floor(Math.random() * 6);
    setRolled(r);
    setTimeout(() => onRoll(r), 800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-neutral-900 border border-white/10 rounded-2xl p-6 max-w-md w-full text-center text-gray-100">
        <h3 className="text-lg font-bold mb-2">Бросок кубика</h3>
        <p className="text-sm text-gray-400 mb-4">
          Для прохода нужно {needLabel} число.
        </p>
        <div className="w-24 h-24 mx-auto bg-white text-slate-900 rounded-2xl border-4 border-slate-400 flex items-center justify-center text-5xl font-bold shadow-xl mb-4">
          {rolled ?? "?"}
        </div>
        <button
          disabled={rolled !== null}
          onClick={handleRoll}
          className="px-6 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-medium disabled:opacity-50"
        >
          Бросить
        </button>
      </div>
    </div>
  );
}
