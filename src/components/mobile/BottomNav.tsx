"use client";

import { usePathname, useRouter } from "next/navigation";
import Link from "next/link";

/* ── Icons ──────────────────────────────────────────────────────────── */

function HomeIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
      <polyline points="9 22 9 12 15 12 15 22" />
    </svg>
  );
}
function ConnectIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}
function LibraryIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}
function ProjectsIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}
function ProfileIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
      <circle cx="12" cy="7" r="4" />
    </svg>
  );
}
function BackIcon() {
  return (
    <svg width={22} height={22} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
      <path d="M19 12H5m0 0l7 7m-7-7l7-7" />
    </svg>
  );
}

/* ── Config ─────────────────────────────────────────────────────────── */

const TABS = [
  { href: "/",         label: "Главная",   icon: <HomeIcon /> },
  { href: "/connect",  label: "Connect",   icon: <ConnectIcon /> },
  { href: "/library",  label: "Библиотека",icon: <LibraryIcon /> },
  { href: "/projects", label: "Проекты",   icon: <ProjectsIcon /> },
  { href: "/settings", label: "Профиль",   icon: <ProfileIcon /> },
];

/** Pages where BottomNav is hidden entirely */
const HIDDEN: string[] = ["/", "/about"];

/** Sub-pages that show a back button in slot 0 */
const BACK_PREFIXES: { prefix: string; label: string }[] = [
  { prefix: "/library/",  label: "Библиотека" },
  { prefix: "/projects/", label: "Проекты" },
];

const BAR_STYLE: React.CSSProperties = {
  height: "calc(56px + env(safe-area-inset-bottom, 0px))",
  paddingBottom: "env(safe-area-inset-bottom, 0px)",
};

/* ── Component ──────────────────────────────────────────────────────── */

export default function BottomNav() {
  const pathname = usePathname() ?? "";
  const router   = useRouter();

  // Entirely hidden
  if (HIDDEN.includes(pathname) || pathname.startsWith("/auth")) return null;

  // Sub-page → replace first slot with ← Back
  const backMatch = BACK_PREFIXES.find((b) => pathname.startsWith(b.prefix));

  const tabClass = (active: boolean) =>
    `flex flex-col items-center justify-center gap-0.5 flex-1 h-full
     transition-colors duration-150 active:opacity-60 select-none
     ${active ? "text-violet-600 dark:text-cyan-400" : "text-neutral-400 dark:text-neutral-500"}`;

  const label = (text: string) => (
    <span className="text-[10px] font-medium leading-none tracking-wide">{text}</span>
  );

  return (
    <nav
      className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex items-stretch
        bg-white/95 dark:bg-neutral-950/95 backdrop-blur-lg
        border-t border-neutral-200 dark:border-white/5"
      style={BAR_STYLE}
      aria-label="Навигация"
    >
      {backMatch ? (
        /* ── Back + tabs (without Главная) ── */
        <>
          <button
            onClick={() => router.back()}
            aria-label="Назад"
            className={tabClass(false) + " text-violet-600 dark:text-cyan-400"}
          >
            <BackIcon />
            {label("Назад")}
          </button>

          {TABS.filter((t) => t.href !== "/").map((tab) => {
            const active = pathname.startsWith(tab.href);
            return (
              <Link key={tab.href} href={tab.href} className={tabClass(active)}>
                {tab.icon}
                {label(tab.label)}
              </Link>
            );
          })}
        </>
      ) : (
        /* ── Standard 5-tab nav ── */
        TABS.map((tab) => {
          const active = tab.href === "/" ? pathname === "/" : pathname.startsWith(tab.href);
          return (
            <Link key={tab.href} href={tab.href} className={tabClass(active)}>
              {tab.icon}
              {label(tab.label)}
            </Link>
          );
        })
      )}
    </nav>
  );
}
