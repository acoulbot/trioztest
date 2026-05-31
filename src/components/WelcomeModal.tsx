"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { motion, AnimatePresence } from "framer-motion";

export default function WelcomeModal() {
  const { data: session, status } = useSession();
  const [show, setShow] = useState(false);
  const [text, setText] = useState("");
  const [accepting, setAccepting] = useState(false);

  const checkTos = useCallback(async () => {
    if (status !== "authenticated" || !session?.user) return;
    try {
      const res = await fetch("/api/profile/me");
      if (!res.ok) return;
      const data = await res.json();
      if (data.tosAccepted) return;

      const wRes = await fetch("/api/welcome");
      if (!wRes.ok) return;
      const wData = await wRes.json();
      setText(wData.text);
      setShow(true);
    } catch {
      // silent
    }
  }, [status, session]);

  useEffect(() => {
    checkTos();
  }, [checkTos]);

  const handleAccept = async () => {
    setAccepting(true);
    try {
      await fetch("/api/welcome/accept", { method: "POST" });
      setShow(false);
    } catch {
      // retry
    } finally {
      setAccepting(false);
    }
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            className="bg-white dark:bg-neutral-900 rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden border border-neutral-200 dark:border-white/10"
          >
            <div className="p-6 border-b border-neutral-100 dark:border-white/5">
              <div className="flex items-center gap-3 mb-1">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-black text-sm">TZ</div>
                <h2 className="text-lg font-bold text-neutral-900 dark:text-white">Добро пожаловать в TrioZ!</h2>
              </div>
            </div>

            <div className="p-6 max-h-[50vh] overflow-y-auto">
              <div className="text-sm text-neutral-600 dark:text-neutral-300 whitespace-pre-wrap leading-relaxed">
                {text}
              </div>
            </div>

            <div className="p-6 border-t border-neutral-100 dark:border-white/5">
              <button
                onClick={handleAccept}
                disabled={accepting}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white font-semibold text-sm hover:shadow-lg hover:shadow-violet-500/20 disabled:opacity-50 transition-all"
              >
                {accepting ? "Подтверждение..." : "Принять и продолжить"}
              </button>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 text-center mt-3">
                Нажимая кнопку, вы подтверждаете ознакомление с правовой информацией
              </p>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
