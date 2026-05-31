"use client";

import { useSession, signOut } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Image from "next/image";
import { useTheme } from "@/components/Providers";
import { useConnectTheme } from "@/contexts/ThemeContext";

interface ProfileData {
  id: string;
  name: string;
  username: string;
  email: string;
  avatar: string | null;
  role: string;
  emailVerified: boolean;
  bio: string | null;
  socialLinks: string | null;
  customStatus: string | null;
  statusEmoji: string | null;
  privacyOnline: string;
  privacyFriends: string;
  privacyEmail: boolean;
  notifySound: boolean;
  notifyPush: boolean;
  createdAt: string;
  lastSeen: string | null;
  _count: { messages: number; friendsSent: number; friendsReceived: number; gamePlayers: number };
}

const ROLE_LABELS: Record<string, { label: string; color: string }> = {
  ADMIN:      { label: "Администратор", color: "text-red-400" },
  EDITOR:     { label: "Редактор",      color: "text-violet-400" },
  CONSULTANT: { label: "Консультант",   color: "text-blue-400" },
  USER:       { label: "Пользователь",  color: "text-gray-400" },
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-2xl p-6 space-y-5">
      <h2 className="text-base font-semibold text-neutral-900 dark:text-white">{title}</h2>
      {children}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm text-neutral-500 dark:text-gray-400">{label}</label>
      {children}
    </div>
  );
}

function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      {...props}
      className="w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-violet-500 dark:focus:border-cyan-500 text-sm transition-colors"
    />
  );
}

function SaveButton({ loading, label = "Сохранить" }: { loading: boolean; label?: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="px-5 py-2 bg-violet-600 dark:bg-cyan-600 hover:bg-violet-500 dark:hover:bg-cyan-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50"
    >
      {loading ? "Сохранение..." : label}
    </button>
  );
}

function Toast({ message, type }: { message: string; type: "success" | "error" }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-xl text-sm font-medium shadow-lg ${
        type === "success"
          ? "bg-green-500 text-white"
          : "bg-red-500 text-white"
      }`}
    >
      {message}
    </motion.div>
  );
}

export default function SettingsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { theme: darkVariant, toggleTheme: toggleDarkVariant, lightVariant, toggleLightVariant } = useConnectTheme();
  const fileRef = useRef<HTMLInputElement>(null);

  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" } | null>(null);

  // Form states
  const [nameForm, setNameForm] = useState({ name: "", username: "" });
  const [emailForm, setEmailForm] = useState({ email: "" });
  const [passForm, setPassForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [bioForm, setBioForm] = useState("");
  const [statusForm, setStatusForm] = useState({ customStatus: "", statusEmoji: "" });
  const [linksForm, setLinksForm] = useState({ telegram: "", vk: "", github: "", website: "" });
  const [privacyForm, setPrivacyForm] = useState({ privacyOnline: "everyone", privacyFriends: "everyone", privacyEmail: false });
  const [notifyForm, setNotifyForm] = useState({ notifySound: true, notifyPush: true });
  const [deletePassword, setDeletePassword] = useState("");

  // Loading states
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingEmail, setSavingEmail] = useState(false);
  const [savingPass, setSavingPass] = useState(false);
  const [savingBio, setSavingBio] = useState(false);
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingLinks, setSavingLinks] = useState(false);
  const [savingPrivacy, setSavingPrivacy] = useState(false);
  const [savingNotify, setSavingNotify] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [avatarError, setAvatarError] = useState(false);

  useEffect(() => {
    if (status === "unauthenticated") router.push("/auth/signin?callbackUrl=/settings");
  }, [status, router]);

  useEffect(() => {
    if (session?.user) {
      fetch("/api/profile")
        .then((r) => r.json())
        .then((data) => {
          setProfile(data);
          setNameForm({ name: data.name, username: data.username });
          setEmailForm({ email: data.email });
          setBioForm(data.bio || "");
          setStatusForm({ customStatus: data.customStatus || "", statusEmoji: data.statusEmoji || "" });
          const links = data.socialLinks ? JSON.parse(data.socialLinks) : {};
          setLinksForm({ telegram: links.telegram || "", vk: links.vk || "", github: links.github || "", website: links.website || "" });
          setPrivacyForm({ privacyOnline: data.privacyOnline || "everyone", privacyFriends: data.privacyFriends || "everyone", privacyEmail: data.privacyEmail ?? false });
          setNotifyForm({ notifySound: data.notifySound ?? true, notifyPush: data.notifyPush ?? true });
        });
    }
  }, [session]);

  const showToast = (message: string, type: "success" | "error") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3500);
  };

  const patchProfile = async (body: Record<string, unknown>) => {
    const res = await fetch("/api/profile", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Ошибка");
    return data;
  };

  // Avatar upload
  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    const fd = new FormData();
    fd.append("avatar", file);
    const res = await fetch("/api/profile/avatar", { method: "POST", body: fd });
    const data = await res.json();
    setUploadingAvatar(false);
    if (!res.ok) { showToast(data.error || "Ошибка загрузки", "error"); return; }
    setAvatarError(false);
    setProfile((p) => p ? { ...p, avatar: data.avatar } : p);
    showToast("Аватарка обновлена!", "success");
  };

  // Profile (name + username)
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      await patchProfile({ name: nameForm.name, username: nameForm.username });
      setProfile((p) => p ? { ...p, name: nameForm.name, username: nameForm.username } : p);
      showToast("Профиль обновлён!", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingProfile(false);
    }
  };

  // Email
  const handleSaveEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingEmail(true);
    try {
      await patchProfile({ email: emailForm.email });
      setProfile((p) => p ? { ...p, email: emailForm.email, emailVerified: false } : p);
      showToast("Email обновлён! Потребуется повторная верификация.", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingEmail(false);
    }
  };

  // Password
  const handleSavePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (passForm.newPassword !== passForm.confirmPassword) {
      showToast("Пароли не совпадают", "error"); return;
    }
    setSavingPass(true);
    try {
      await patchProfile({ currentPassword: passForm.currentPassword, newPassword: passForm.newPassword });
      setPassForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
      showToast("Пароль изменён!", "success");
    } catch (err) {
      showToast((err as Error).message, "error");
    } finally {
      setSavingPass(false);
    }
  };

  if (status === "loading" || !profile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-2 border-violet-500 dark:border-cyan-400 border-t-transparent rounded-full" />
      </div>
    );
  }

  const role = ROLE_LABELS[profile.role] ?? ROLE_LABELS.USER;
  const friendCount = profile._count.friendsSent + profile._count.friendsReceived;

  return (
    <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950 pt-20 max-md:pt-4 pb-12 px-4 max-md:px-3">
      <div className="max-w-2xl mx-auto space-y-6">

        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <Link href="/" className="text-violet-600 dark:text-cyan-400 hover:opacity-70 transition-opacity">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </Link>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-white">Настройки профиля</h1>
        </div>

        {/* ── Avatar + stats ── */}
        <Section title="Аккаунт">
          <div className="flex items-center gap-5">
            {/* Avatar */}
            <div className="relative flex-shrink-0">
              <div
                className="w-20 h-20 rounded-2xl overflow-hidden bg-gradient-to-br from-violet-400 to-indigo-500 dark:from-cyan-400 dark:to-blue-500 flex items-center justify-center cursor-pointer"
                onClick={() => fileRef.current?.click()}
                title="Нажмите для смены аватарки"
              >
                {profile.avatar && !avatarError ? (
                  <Image src={profile.avatar} alt="avatar" width={80} height={80} className="object-cover w-full h-full" onError={() => setAvatarError(true)} />
                ) : (
                  <span className="text-white text-3xl font-bold">{profile.name.charAt(0).toUpperCase()}</span>
                )}
              </div>
              {/* Upload overlay */}
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploadingAvatar}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-violet-600 dark:bg-cyan-600 rounded-lg flex items-center justify-center text-white shadow-lg hover:opacity-90 transition-opacity"
                title="Загрузить аватарку"
              >
                {uploadingAvatar ? (
                  <div className="w-3 h-3 border border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                  </svg>
                )}
              </button>
              <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp,image/gif" onChange={handleAvatarChange} className="hidden" />
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <p className="text-lg font-semibold text-neutral-900 dark:text-white truncate">{profile.name}</p>
              <p className="text-sm text-neutral-500 dark:text-gray-400">@{profile.username}</p>
              <span className={`text-xs font-medium ${role.color}`}>{role.label}</span>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 pt-2">
            {[
              { label: "Сообщений", value: profile._count.messages },
              { label: "Друзей", value: friendCount },
              { label: "Игр сыграно", value: profile._count.gamePlayers },
            ].map((stat) => (
              <div key={stat.label} className="bg-neutral-100 dark:bg-white/5 rounded-xl p-3 text-center">
                <p className="text-lg font-bold text-neutral-900 dark:text-white">{stat.value}</p>
                <p className="text-xs text-neutral-500 dark:text-gray-500">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Meta */}
          <div className="flex flex-wrap gap-x-6 gap-y-1 text-xs text-neutral-400 pt-1">
            <span>На сайте с {new Date(profile.createdAt).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" })}</span>
            <span className={profile.emailVerified ? "text-green-500" : "text-yellow-500"}>
              {profile.emailVerified ? "✓ Email подтверждён" : "⚠ Email не подтверждён"}
            </span>
          </div>
        </Section>

        {/* ── Name + username ── */}
        <Section title="Имя и юзернейм">
          <form onSubmit={handleSaveProfile} className="space-y-4">
            <Field label="Отображаемое имя">
              <Input
                value={nameForm.name}
                onChange={(e) => setNameForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ваше имя"
                minLength={2}
                maxLength={50}
                required
              />
            </Field>
            <Field label="Юзернейм">
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-neutral-400 text-sm">@</span>
                <Input
                  value={nameForm.username}
                  onChange={(e) => setNameForm((f) => ({ ...f, username: e.target.value }))}
                  placeholder="username"
                  pattern="[a-zA-Z0-9_]{3,20}"
                  title="3–20 символов: буквы, цифры, _"
                  required
                  className="!pl-8"
                  style={{ paddingLeft: "2rem" }}
                />
              </div>
              <p className="text-xs text-neutral-400 mt-1">3–20 символов, только латиница, цифры и _</p>
            </Field>
            <SaveButton loading={savingProfile} />
          </form>
        </Section>

        {/* ── Email ── */}
        <Section title="Email">
          <form onSubmit={handleSaveEmail} className="space-y-4">
            <Field label="Адрес электронной почты">
              <Input
                type="email"
                value={emailForm.email}
                onChange={(e) => setEmailForm({ email: e.target.value })}
                placeholder="you@example.com"
                required
              />
            </Field>
            <p className="text-xs text-neutral-400">При смене email потребуется повторная верификация.</p>
            <SaveButton loading={savingEmail} />
          </form>
        </Section>

        {/* ── Password ── */}
        <Section title="Смена пароля">
          <form onSubmit={handleSavePassword} className="space-y-4">
            <Field label="Текущий пароль">
              <Input
                type="password"
                value={passForm.currentPassword}
                onChange={(e) => setPassForm((f) => ({ ...f, currentPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </Field>
            <Field label="Новый пароль">
              <Input
                type="password"
                value={passForm.newPassword}
                onChange={(e) => setPassForm((f) => ({ ...f, newPassword: e.target.value }))}
                placeholder="Минимум 8 символов"
                minLength={8}
                required
              />
            </Field>
            <Field label="Повторите новый пароль">
              <Input
                type="password"
                value={passForm.confirmPassword}
                onChange={(e) => setPassForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                placeholder="••••••••"
                required
              />
            </Field>
            <SaveButton loading={savingPass} label="Изменить пароль" />
          </form>
        </Section>

        {/* ── Appearance ── */}
        <Section title="Внешний вид">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Тема интерфейса</p>
              <p className="text-xs text-neutral-400 mt-0.5">{theme === "dark" ? "Тёмная тема" : "Светлая тема"}</p>
            </div>
            <button
              onClick={toggleTheme}
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 rounded-xl text-sm text-neutral-700 dark:text-gray-300 transition-colors"
            >
              {theme === "dark" ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              ) : (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              Переключить
            </button>
          </div>

          {theme === "dark" ? (
            <div className="mt-4">
              <p className="text-sm text-neutral-900 dark:text-white font-medium mb-2">Цветовая схема (тёмная тема)</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (darkVariant !== "cyber") toggleDarkVariant(); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    darkVariant === "cyber"
                      ? "bg-cyan-500/10 border-cyan-500/30 text-cyan-400"
                      : "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-gray-400"
                  }`}
                >
                  Cyber
                </button>
                <button
                  onClick={() => { if (darkVariant !== "velvet") toggleDarkVariant(); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    darkVariant === "velvet"
                      ? "bg-purple-500/10 border-purple-500/30 text-purple-400"
                      : "bg-neutral-100 dark:bg-white/5 border-neutral-200 dark:border-white/10 text-neutral-500 dark:text-gray-400"
                  }`}
                >
                  Velvet
                </button>
              </div>
            </div>
          ) : (
            <div className="mt-4">
              <p className="text-sm text-neutral-900 dark:text-white font-medium mb-2">Цветовая схема (светлая тема)</p>
              <div className="flex gap-2">
                <button
                  onClick={() => { if (lightVariant !== "default") toggleLightVariant(); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    lightVariant === "default"
                      ? "bg-violet-500/10 border-violet-500/30 text-violet-600"
                      : "bg-neutral-100 border-neutral-200 text-neutral-500"
                  }`}
                >
                  Violet
                </button>
                <button
                  onClick={() => { if (lightVariant !== "warm") toggleLightVariant(); }}
                  className={`flex-1 py-2 rounded-xl text-sm font-medium transition-all border ${
                    lightVariant === "warm"
                      ? "bg-orange-500/10 border-orange-500/30 text-orange-600"
                      : "bg-neutral-100 border-neutral-200 text-neutral-500"
                  }`}
                >
                  Warm
                </button>
              </div>
            </div>
          )}
        </Section>

        {/* ── Notifications ── */}
        <Section title="Уведомления">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Центр уведомлений</p>
              <p className="text-xs text-neutral-400 mt-0.5">Все уведомления из игр и TZ.Connect</p>
            </div>
            <Link
              href="/settings/notifications"
              className="flex items-center gap-2 px-4 py-2 bg-neutral-100 dark:bg-white/10 hover:bg-neutral-200 dark:hover:bg-white/15 rounded-xl text-sm text-neutral-700 dark:text-gray-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
              </svg>
              Открыть
            </Link>
          </div>
        </Section>

        {/* ── Bio ── */}
        <Section title="О себе">
          <form onSubmit={async (e) => { e.preventDefault(); setSavingBio(true); try { await patchProfile({ bio: bioForm || null }); showToast("Био обновлено!", "success"); } catch (err) { showToast((err as Error).message, "error"); } finally { setSavingBio(false); } }} className="space-y-4">
            <Field label="Коротко о себе (до 200 символов)">
              <textarea
                value={bioForm}
                onChange={(e) => setBioForm(e.target.value)}
                maxLength={200}
                rows={3}
                placeholder="Расскажите немного о себе..."
                className="w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white placeholder-neutral-400 focus:outline-none focus:border-violet-500 dark:focus:border-cyan-500 text-sm transition-colors resize-none"
              />
              <p className="text-xs text-neutral-400">{bioForm.length}/200</p>
            </Field>
            <SaveButton loading={savingBio} />
          </form>
        </Section>

        {/* ── Custom status ── */}
        <Section title="Статус">
          <form onSubmit={async (e) => { e.preventDefault(); setSavingStatus(true); try { await fetch("/api/profile/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(statusForm) }); showToast("Статус обновлён!", "success"); } catch { showToast("Ошибка", "error"); } finally { setSavingStatus(false); } }} className="space-y-4">
            <div className="flex gap-3">
              <div className="w-16">
                <Field label="Emoji">
                  <Input value={statusForm.statusEmoji} onChange={(e) => setStatusForm((f) => ({ ...f, statusEmoji: e.target.value }))} placeholder="🎮" maxLength={10} />
                </Field>
              </div>
              <div className="flex-1">
                <Field label="Текст статуса">
                  <Input value={statusForm.customStatus} onChange={(e) => setStatusForm((f) => ({ ...f, customStatus: e.target.value }))} placeholder="Чем занимаетесь?" maxLength={100} />
                </Field>
              </div>
            </div>
            <div className="flex gap-2">
              <SaveButton loading={savingStatus} />
              <button type="button" onClick={async () => { setSavingStatus(true); setStatusForm({ customStatus: "", statusEmoji: "" }); await fetch("/api/profile/status", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ customStatus: null, statusEmoji: null }) }); setSavingStatus(false); showToast("Статус очищен", "success"); }} className="px-4 py-2 bg-neutral-100 dark:bg-white/5 text-neutral-600 dark:text-gray-400 rounded-xl text-sm hover:bg-neutral-200 dark:hover:bg-white/10 transition-colors">
                Очистить
              </button>
            </div>
          </form>
        </Section>

        {/* ── Social links ── */}
        <Section title="Ссылки">
          <form onSubmit={async (e) => { e.preventDefault(); setSavingLinks(true); try { const hasLinks = Object.values(linksForm).some(Boolean); await patchProfile({ socialLinks: hasLinks ? linksForm : null }); showToast("Ссылки обновлены!", "success"); } catch (err) { showToast((err as Error).message, "error"); } finally { setSavingLinks(false); } }} className="space-y-4">
            <Field label="Telegram">
              <Input value={linksForm.telegram} onChange={(e) => setLinksForm((f) => ({ ...f, telegram: e.target.value }))} placeholder="https://t.me/username" />
            </Field>
            <Field label="VK">
              <Input value={linksForm.vk} onChange={(e) => setLinksForm((f) => ({ ...f, vk: e.target.value }))} placeholder="https://vk.com/id" />
            </Field>
            <Field label="GitHub">
              <Input value={linksForm.github} onChange={(e) => setLinksForm((f) => ({ ...f, github: e.target.value }))} placeholder="https://github.com/username" />
            </Field>
            <Field label="Личный сайт">
              <Input value={linksForm.website} onChange={(e) => setLinksForm((f) => ({ ...f, website: e.target.value }))} placeholder="https://mysite.ru" />
            </Field>
            <SaveButton loading={savingLinks} />
          </form>
        </Section>

        {/* ── Notifications ── */}
        <Section title="Уведомления">
          <form onSubmit={async (e) => { e.preventDefault(); setSavingNotify(true); try { await fetch("/api/profile/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(notifyForm) }); showToast("Настройки уведомлений сохранены!", "success"); } catch { showToast("Ошибка", "error"); } finally { setSavingNotify(false); } }} className="space-y-4">
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifyForm.notifySound} onChange={(e) => setNotifyForm((f) => ({ ...f, notifySound: e.target.checked }))} className="w-4 h-4 rounded border-neutral-300 dark:border-white/20 text-violet-500 dark:text-cyan-500 focus:ring-violet-500 dark:focus:ring-cyan-500" />
              <span className="text-sm text-neutral-900 dark:text-white">Звуковые уведомления</span>
            </label>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={notifyForm.notifyPush} onChange={(e) => setNotifyForm((f) => ({ ...f, notifyPush: e.target.checked }))} className="w-4 h-4 rounded border-neutral-300 dark:border-white/20 text-violet-500 dark:text-cyan-500 focus:ring-violet-500 dark:focus:ring-cyan-500" />
              <span className="text-sm text-neutral-900 dark:text-white">Push-уведомления</span>
            </label>
            <SaveButton loading={savingNotify} />
          </form>
        </Section>

        {/* ── Privacy ── */}
        <Section title="Приватность">
          <form onSubmit={async (e) => { e.preventDefault(); setSavingPrivacy(true); try { await fetch("/api/profile/privacy", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(privacyForm) }); showToast("Настройки приватности сохранены!", "success"); } catch { showToast("Ошибка", "error"); } finally { setSavingPrivacy(false); } }} className="space-y-4">
            <Field label="Кто видит мой онлайн-статус">
              <select value={privacyForm.privacyOnline} onChange={(e) => setPrivacyForm((f) => ({ ...f, privacyOnline: e.target.value }))} className="w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm">
                <option value="everyone">Все</option>
                <option value="friends">Только друзья</option>
                <option value="nobody">Никто</option>
              </select>
            </Field>
            <Field label="Кто может добавлять в друзья">
              <select value={privacyForm.privacyFriends} onChange={(e) => setPrivacyForm((f) => ({ ...f, privacyFriends: e.target.value }))} className="w-full bg-neutral-50 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-neutral-900 dark:text-white text-sm">
                <option value="everyone">Все</option>
                <option value="friends">Друзья друзей</option>
                <option value="nobody">Никто</option>
              </select>
            </Field>
            <label className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={privacyForm.privacyEmail} onChange={(e) => setPrivacyForm((f) => ({ ...f, privacyEmail: e.target.checked }))} className="w-4 h-4 rounded border-neutral-300 dark:border-white/20 text-violet-500 dark:text-cyan-500 focus:ring-violet-500 dark:focus:ring-cyan-500" />
              <span className="text-sm text-neutral-900 dark:text-white">Скрыть email из профиля</span>
            </label>
            <SaveButton loading={savingPrivacy} />
          </form>
        </Section>

        {/* ── Danger zone ── */}
        <Section title="Выход">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-neutral-900 dark:text-white font-medium">Выйти из аккаунта</p>
              <p className="text-xs text-neutral-400 mt-0.5">Завершить текущую сессию</p>
            </div>
            <button
              onClick={() => signOut({ callbackUrl: "/" })}
              className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-xl text-sm font-medium transition-colors"
            >
              Выйти
            </button>
          </div>
        </Section>

        {/* ── Delete account ── */}
        <Section title="Удаление аккаунта">
          <div className="space-y-3">
            <p className="text-sm text-neutral-500 dark:text-gray-400">
              Это действие необратимо. Все ваши данные, сообщения и друзья будут удалены.
            </p>
            <div className="flex gap-3">
              <Input type="password" value={deletePassword} onChange={(e) => setDeletePassword(e.target.value)} placeholder="Введите пароль для подтверждения" />
              <button
                onClick={async () => {
                  if (!deletePassword) { showToast("Введите пароль", "error"); return; }
                  if (!confirm("Вы уверены? Это действие нельзя отменить.")) return;
                  setDeletingAccount(true);
                  const res = await fetch("/api/profile/delete", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ password: deletePassword }) });
                  if (res.ok) { await signOut({ callbackUrl: "/" }); } else { const data = await res.json(); showToast(data.error || "Ошибка", "error"); setDeletingAccount(false); }
                }}
                disabled={deletingAccount}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 whitespace-nowrap"
              >
                {deletingAccount ? "..." : "Удалить аккаунт"}
              </button>
            </div>
          </div>
        </Section>
      </div>

      {/* Toast */}
      {toast && <Toast message={toast.message} type={toast.type} />}
    </div>
  );
}
