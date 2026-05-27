"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import GlowAvatar from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";

interface MiniProfileUser {
  id: string;
  name: string;
  username?: string;
  avatar: string | null;
  role: string;
  lastSeen?: string | null;
  avatarGlowEnabled?: boolean;
  avatarGlowColors?: string | null;
}

interface MiniProfileProps {
  user: MiniProfileUser;
  children: React.ReactNode;
  onMessageClick?: (userId: string) => void;
  /** Which side to open the card: right (default) or left */
  side?: "right" | "left";
}

const ROLE_BADGE: Record<string, { label: string; color: string }> = {
  ADMIN:      { label: "Администратор", color: "text-red-500 dark:text-red-400" },
  EDITOR:     { label: "Редактор",      color: "text-amber-500 dark:text-amber-400" },
  MODERATOR:  { label: "Модератор",     color: "text-violet-500 dark:text-cyan-400" },
  CONSULTANT: { label: "Консультант",   color: "text-sky-500" },
  USER:       { label: "Участник",      color: "text-neutral-400" },
};

export default function MiniProfile({ user, children, onMessageClick, side = "right" }: MiniProfileProps) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const online = isOnline(user.lastSeen ?? null);
  const badge = ROLE_BADGE[user.role] ?? ROLE_BADGE.USER;

  const show = () => {
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(true), 350);
  };
  const hide = () => {
    timerRef.current && clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setVisible(false), 120);
  };

  useEffect(() => () => { timerRef.current && clearTimeout(timerRef.current); }, []);

  return (
    <div className="relative inline-block" onMouseEnter={show} onMouseLeave={hide}>
      {children}

      <AnimatePresence>
        {visible && (
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 4 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.92, y: 4 }}
            transition={{ type: "spring", damping: 22, stiffness: 320 }}
            onMouseEnter={show}
            onMouseLeave={hide}
            className={`absolute z-[9999] w-56 rounded-2xl overflow-hidden shadow-2xl
              bg-white dark:bg-neutral-800
              border border-neutral-200 dark:border-white/10
              ${side === "left" ? "right-full mr-2" : "left-full ml-2"} top-0`}
          >
            {/* Banner */}
            <div className="h-14 bg-gradient-to-br from-violet-500/30 to-indigo-600/20 dark:from-cyan-500/20 dark:to-violet-600/20" />

            <div className="px-3 pb-3 -mt-6">
              {/* Avatar */}
              <div className="mb-2">
                <GlowAvatar user={user} size={40} />
              </div>

              {/* Name + role */}
              <div className="mb-2">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold text-sm text-neutral-900 dark:text-white truncate">{user.name}</span>
                  {online && <span className="w-2 h-2 rounded-full bg-green-400 flex-shrink-0" />}
                </div>
                {user.username && <div className="text-[11px] text-neutral-400">@{user.username}</div>}
                <div className={`text-[11px] font-medium mt-0.5 ${badge.color}`}>{badge.label}</div>
              </div>

              {/* Status */}
              <div className="text-[11px] text-neutral-500 mb-2.5">
                {online ? "В сети" : user.lastSeen ? `Был(а) ${timeAgo(user.lastSeen)}` : "Не в сети"}
              </div>

              {/* Action */}
              {onMessageClick && (
                <button
                  onClick={() => { onMessageClick(user.id); setVisible(false); }}
                  className="w-full py-1.5 rounded-lg text-xs font-medium transition-all
                    bg-violet-600 dark:bg-cyan-500 text-white dark:text-neutral-900
                    hover:opacity-90"
                >
                  Написать
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
