"use client";

import { useState, useEffect } from "react";
import { getOrCreateKeyPair, getKeyFingerprint, exportKeyPair, importKeyPair } from "@/lib/e2ee";

export default function E2EESettings() {
  const [fingerprint, setFingerprint] = useState("");
  const [showExport, setShowExport] = useState(false);
  const [exportData, setExportData] = useState("");
  const [importInput, setImportInput] = useState("");
  const [importStatus, setImportStatus] = useState<"idle" | "success" | "error">("idle");

  useEffect(() => {
    const kp = getOrCreateKeyPair();
    setFingerprint(getKeyFingerprint(kp.publicKey));
  }, []);

  const handleExport = () => {
    const data = exportKeyPair();
    if (data) {
      setExportData(data);
      setShowExport(true);
    }
  };

  const handleImport = () => {
    if (!importInput.trim()) return;
    const success = importKeyPair(importInput.trim());
    setImportStatus(success ? "success" : "error");
    if (success) {
      const kp = getOrCreateKeyPair();
      setFingerprint(getKeyFingerprint(kp.publicKey));
      // Re-register on server
      fetch("/api/e2ee", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ publicKey: kp.publicKey }),
      });
      setImportInput("");
    }
    setTimeout(() => setImportStatus("idle"), 3000);
  };

  const handleCopyExport = () => {
    navigator.clipboard.writeText(exportData);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-medium text-neutral-900 dark:text-white">Сквозное шифрование (E2EE)</h3>
          <p className="text-xs text-neutral-500 dark:text-gray-400">Личные сообщения зашифрованы — сервер не видит содержимое</p>
        </div>
      </div>

      <div className="bg-neutral-50 dark:bg-white/5 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs text-neutral-500 dark:text-gray-400">Отпечаток ключа:</span>
          <code className="text-xs font-mono text-emerald-600 dark:text-emerald-400">{fingerprint}</code>
        </div>
        <p className="text-[10px] text-neutral-400">Сравните отпечаток с собеседником для верификации</p>
      </div>

      <div className="flex gap-2">
        <button
          onClick={handleExport}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
        >
          Экспорт ключей
        </button>
        <button
          onClick={() => setShowExport(false)}
          className="flex-1 text-xs px-3 py-2 rounded-lg border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
        >
          Импорт ключей
        </button>
      </div>

      {showExport && exportData && (
        <div className="space-y-2">
          <p className="text-[11px] text-amber-500">Сохраните эти данные в надёжном месте. Без них переписка не будет расшифрована на новом устройстве.</p>
          <textarea
            readOnly
            value={exportData}
            className="w-full h-20 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg p-2 text-neutral-700 dark:text-gray-300 resize-none"
          />
          <button onClick={handleCopyExport} className="text-xs text-violet-500 dark:text-cyan-400 hover:underline">
            Копировать
          </button>
        </div>
      )}

      {!showExport && (
        <div className="space-y-2">
          <textarea
            value={importInput}
            onChange={(e) => setImportInput(e.target.value)}
            placeholder="Вставьте экспортированные ключи..."
            className="w-full h-20 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg p-2 text-neutral-700 dark:text-gray-300 placeholder:text-neutral-400 resize-none"
          />
          <div className="flex items-center gap-2">
            <button onClick={handleImport} className="text-xs px-3 py-1.5 bg-violet-500 dark:bg-cyan-500 text-white rounded-lg hover:opacity-90 transition-opacity">
              Импортировать
            </button>
            {importStatus === "success" && <span className="text-xs text-emerald-500">Ключи импортированы</span>}
            {importStatus === "error" && <span className="text-xs text-red-500">Неверный формат ключей</span>}
          </div>
        </div>
      )}
    </div>
  );
}
