"use client";

import { useState, useEffect } from "react";
import { getOrCreateKeyPair, generateCallVerificationCode, getKeyFingerprint } from "@/lib/e2ee";

interface CallVerificationProps {
  remoteUserId: string;
  remoteUsername: string;
  onClose: () => void;
}

export default function CallVerification({ remoteUserId, remoteUsername, onClose }: CallVerificationProps) {
  const [verificationCode, setVerificationCode] = useState<string | null>(null);
  const [localFingerprint, setLocalFingerprint] = useState("");
  const [remoteFingerprint, setRemoteFingerprint] = useState("");
  const [verified, setVerified] = useState(false);

  useEffect(() => {
    const init = async () => {
      const localKP = getOrCreateKeyPair();
      setLocalFingerprint(getKeyFingerprint(localKP.publicKey));

      // Fetch remote user's public key
      const res = await fetch(`/api/e2ee?userId=${remoteUserId}`);
      if (res.ok) {
        const data = await res.json();
        if (data.publicKey) {
          setRemoteFingerprint(getKeyFingerprint(data.publicKey));
          const code = generateCallVerificationCode(localKP.publicKey, data.publicKey);
          setVerificationCode(code);
        }
      }
    };
    init();
  }, [remoteUserId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-white dark:bg-neutral-900 rounded-2xl p-6 max-w-sm w-full mx-4 space-y-4 shadow-xl border border-neutral-200 dark:border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-500/20 flex items-center justify-center">
            <svg className="w-5 h-5 text-emerald-600 dark:text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
          <div>
            <h3 className="text-sm font-bold text-neutral-900 dark:text-white">Верификация звонка</h3>
            <p className="text-xs text-neutral-500 dark:text-gray-400">Звонок с @{remoteUsername}</p>
          </div>
        </div>

        <div className="bg-neutral-50 dark:bg-white/5 rounded-xl p-4 text-center space-y-2">
          <p className="text-xs text-neutral-500 dark:text-gray-400">Код безопасности:</p>
          {verificationCode ? (
            <p className="text-3xl font-mono font-bold tracking-[0.3em] text-emerald-600 dark:text-emerald-400">
              {verificationCode.slice(0, 3)} {verificationCode.slice(3)}
            </p>
          ) : (
            <p className="text-sm text-neutral-400">Загрузка...</p>
          )}
          <p className="text-[10px] text-neutral-400">
            Попросите собеседника открыть верификацию и сравните коды
          </p>
        </div>

        <div className="space-y-1.5 text-[11px]">
          <div className="flex justify-between text-neutral-500 dark:text-gray-400">
            <span>Ваш ключ:</span>
            <code className="font-mono text-neutral-700 dark:text-gray-300">{localFingerprint}</code>
          </div>
          <div className="flex justify-between text-neutral-500 dark:text-gray-400">
            <span>Ключ @{remoteUsername}:</span>
            <code className="font-mono text-neutral-700 dark:text-gray-300">{remoteFingerprint || "—"}</code>
          </div>
        </div>

        <div className="flex gap-2">
          {!verified ? (
            <>
              <button
                onClick={() => setVerified(true)}
                className="flex-1 px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl text-sm font-medium transition-colors"
              >
                Коды совпадают
              </button>
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2 border border-neutral-200 dark:border-white/10 text-neutral-600 dark:text-gray-300 rounded-xl text-sm hover:bg-neutral-100 dark:hover:bg-white/5 transition-colors"
              >
                Закрыть
              </button>
            </>
          ) : (
            <div className="flex-1 text-center py-2">
              <p className="text-sm text-emerald-500 font-medium">Звонок верифицирован</p>
              <p className="text-[10px] text-neutral-400 mt-1">WebRTC DTLS-SRTP шифрование активно</p>
              <button onClick={onClose} className="mt-2 text-xs text-neutral-400 hover:text-neutral-600 dark:hover:text-white">
                Закрыть
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
