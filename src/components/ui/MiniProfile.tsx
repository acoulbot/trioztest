"use client";

import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import GlowAvatar from "@/components/ui/GlowAvatar";
import { isOnline, timeAgo } from "@/lib/timeAgo";

interface MiniProfileUser {
  id: string;
  name: string;
  username: string;
  avatar: string | null;
  role: string;
  avatarGlowEnabled?: boolean;
  avatarGlowColors?: string | null;
  lastSeen?: string | null;
  customStatus?: string | null;
  statusEmoji?: string | null;
}

interface MiniProfileProps {
  user: MiniProfileUser;
  children: React.ReactNode;
  position?: "top" | "bottom" | "left" | "right";
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN: { label: "Администратор", color: "text-red-400" },
  EDITOR: { label: "Редактор", color: "text-violet-400" },
  CONSULTANT: { label: "Консультант", color: "text-blue-400" },
  USER: { label: "Пользователь", color: "text-gray-400" },
};

export default function MiniProfile({ user, children, position = "top" }: MiniProfileProps) {
  const [show, setShow] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(true), 400);
  };

  const handleMouseLeave = () => {
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setShow(false), 200);
  };

  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  const role = ROLE_LABELS[user.role] ?? ROLE_LABELS.USER;

  const positionClasses: Record<string, string> = {
    top: "bottom-full left-0 mb-2",
    bottom: "top-full left-0 mt-2",
    left: "right-full top-0 mr-2",
    right: "left-full top-0 ml-2",
  };

  return (
    <div
      ref={containerRef}
      className="relative inline-block"
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {children}
      <AnimatePresence>
        {show && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className={`absolute z-50 ${positionClasses[position]} w-64 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl p-4`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
          >
            <div className="flex items-start gap-3">
              <GlowAvatar user={user} size={40} onlineColor={isOnline(user.lastSeen) ? "green" : undefined} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-neutral-900 dark:text-white truncate">{user.name}</p>
                <p className="text-xs text-neutral-500 dark:text-gray-400">@{user.username}</p>
                <span className={`text-[10px] font-medium ${role.color}`}>{role.label}</span>
              </div>
            </div>

            {user.customStatus && (
              <div className="mt-2 flex items-center gap-1 text-xs text-neutral-500 dark:text-gray-400">
                {user.statusEmoji && <span>{user.statusEmoji}</span>}
                <span className="truncate">{user.customStatus}</span>
              </div>
            )}

            {user.lastSeen && (
              <p className="text-[10px] text-neutral-400 mt-1.5">
                {isOnline(user.lastSeen) ? "🟢 Онлайн" : `Был(а) ${timeAgo(user.lastSeen)}`}
              </p>
            )}

            <div className="mt-3 pt-3 border-t border-neutral-200 dark:border-white/5">
              <Link
                href={`/user/${user.username}`}
                className="block w-full text-center px-3 py-1.5 bg-violet-50 dark:bg-cyan-400/10 text-violet-600 dark:text-cyan-400 rounded-lg text-xs font-medium hover:bg-violet-100 dark:hover:bg-cyan-400/20 transition-colors"
              >
                Открыть профиль
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
