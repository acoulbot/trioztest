"use client";

import { useConnectTheme } from "@/contexts/ThemeContext";
import GlowAvatar, { GlowAvatarUser } from "@/components/ui/GlowAvatar";

export type NavSection = "communities" | "friends" | "dm";

interface NavRailProps {
  activeSection: NavSection;
  onChangeSection: (s: NavSection) => void;
  myProfileUser: GlowAvatarUser;
  userName: string;
  userUsername: string;
  onProfileSettings: () => void;
  /** optional: show mic active state */
  micActive?: boolean;
  onToggleMic?: () => void;
}

/* ── Icons ─────────────────────────────────────────────────────────────── */

function CommunitiesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  );
}

function FriendsIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}

function MessagesIcon() {
  return (
    <svg width={20} height={20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

function MicIcon({ active }: { active?: boolean }) {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active ? 2.5 : 1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}

function ThemeToggleIcon({ isCyber }: { isCyber: boolean }) {
  return isCyber ? (
    /* Moon → switch to Velvet */
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  ) : (
    /* Sun → switch to Cyber */
    <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

/* ── NavSection tooltip labels ─────────────────────────────────────────── */
const SECTIONS: { key: NavSection; label: string; icon: React.ReactNode }[] = [
  { key: "communities", label: "Сообщества", icon: <CommunitiesIcon /> },
  { key: "friends",     label: "Друзья",      icon: <FriendsIcon /> },
  { key: "dm",          label: "Сообщения",   icon: <MessagesIcon /> },
];

/* ══════════════════════════════════════════════════════════════════════════ */

export default function NavRail({
  activeSection,
  onChangeSection,
  myProfileUser,
  userName,
  userUsername,
  onProfileSettings,
  micActive,
  onToggleMic,
}: NavRailProps) {
  const { theme, toggleTheme } = useConnectTheme();

  return (
    <nav
      className="cn-rail flex-shrink-0 flex flex-col items-center max-md:hidden"
      style={{ width: 68, paddingTop: 12, paddingBottom: 12 }}
      aria-label="Основная навигация"
    >
      {/* ── Logo mark ── */}
      <div
        className="w-10 h-10 rounded-2xl flex items-center justify-center mb-2 font-black text-base select-none"
        style={{
          background: "var(--cn-accent-dim)",
          color: "var(--cn-accent-text)",
          border: "1px solid color-mix(in srgb, var(--cn-accent) 20%, transparent)",
          letterSpacing: "-0.5px",
        }}
      >
        TZ
      </div>

      {/* ── Divider ── */}
      <div style={{ width: 32, height: 2, borderRadius: 1, background: "var(--cn-border)", margin: "6px 0" }} />

      {/* ── 3 Main Navigation Buttons ── */}
      <div className="flex flex-col items-center gap-1 flex-1 w-full px-3">
        {SECTIONS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => onChangeSection(key)}
            className={`cn-nav-btn ${activeSection === key ? "active" : ""}`}
            title={label}
            aria-label={label}
            aria-current={activeSection === key ? "page" : undefined}
          >
            {icon}
          </button>
        ))}
      </div>

      {/* ── Bottom: theme toggle + user panel ── */}
      <div className="flex flex-col items-center gap-2 w-full px-3">
        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: "var(--cn-accent-dim)",
            color: "var(--cn-accent-text)",
            border: "none",
          }}
          title={theme === "cyber" ? "Переключить на Velvet" : "Переключить на Cyber"}
        >
          <ThemeToggleIcon isCyber={theme === "cyber"} />
        </button>

        {/* Mic */}
        {onToggleMic && (
          <button
            onClick={onToggleMic}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
            style={{
              background: micActive ? "rgba(239,68,68,0.15)" : "var(--cn-accent-dim)",
              color: micActive ? "#ef4444" : "var(--cn-muted)",
              border: "none",
            }}
            title={micActive ? "Выкл. микрофон" : "Вкл. микрофон"}
          >
            <MicIcon active={micActive} />
          </button>
        )}

        {/* Settings */}
        <button
          onClick={onProfileSettings}
          className="w-8 h-8 rounded-lg flex items-center justify-center transition-all duration-200"
          style={{
            background: "var(--cn-accent-dim)",
            color: "var(--cn-muted)",
            border: "none",
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.color = "var(--cn-accent-text)"; }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.color = "var(--cn-muted)"; }}
          title="Настройки профиля"
        >
          <SettingsIcon />
        </button>

        {/* ── Divider ── */}
        <div style={{ width: 32, height: 1, borderRadius: 1, background: "var(--cn-border)" }} />

        {/* User avatar */}
        <button
          onClick={onProfileSettings}
          className="relative flex-shrink-0 rounded-full overflow-hidden"
          style={{ width: 34, height: 34 }}
          title={`${userName} (@${userUsername})`}
          aria-label="Настройки профиля"
        >
          <GlowAvatar user={myProfileUser} size={34} />
          {/* Online dot */}
          <span
            className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 block"
            style={{ border: "2px solid var(--cn-rail)" }}
          />
        </button>
      </div>
    </nav>
  );
}
