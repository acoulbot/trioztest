"use client";

import { signIn } from "next-auth/react";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import Link from "next/link";

type Step = "form" | "verify";
type AuthType = "login" | "register";

function CodeInput({
  length,
  value,
  onChange,
}: {
  length: number;
  value: string;
  onChange: (val: string) => void;
}) {
  const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (idx: number, char: string) => {
    if (!/^\d?$/.test(char)) return;
    const arr = value.split("");
    arr[idx] = char;
    const next = arr.join("").slice(0, length);
    onChange(next);
    if (char && idx < length - 1) {
      inputsRef.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (idx: number, e: React.KeyboardEvent) => {
    if (e.key === "Backspace" && !value[idx] && idx > 0) {
      inputsRef.current[idx - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, length);
    onChange(pasted);
    const focusIdx = Math.min(pasted.length, length - 1);
    inputsRef.current[focusIdx]?.focus();
  };

  return (
    <div className="flex gap-2 justify-center">
      {Array.from({ length }).map((_, i) => (
        <input
          key={i}
          ref={(el) => { inputsRef.current[i] = el; }}
          type="text"
          inputMode="numeric"
          maxLength={1}
          value={value[i] || ""}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onPaste={handlePaste}
          className="w-12 h-14 text-center text-2xl font-bold rounded-xl border-2 
            border-neutral-200 dark:border-white/10 bg-neutral-50 dark:bg-neutral-800
            text-neutral-900 dark:text-white
            focus:border-violet-500 dark:focus:border-cyan-400 focus:outline-none
            transition-colors"
        />
      ))}
    </div>
  );
}

export default function SignInPage() {
  const router = useRouter();
  const [authType, setAuthType] = useState<AuthType>("login");
  const [step, setStep] = useState<Step>("form");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown <= 0) return;
    const t = setTimeout(() => setCountdown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown]);

  const handleLogin = async () => {
    setError("");
    if (!email || !password) {
      setError("Введите email и пароль");
      return;
    }
    setLoading(true);
    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError("Неверный email или пароль");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Произошла ошибка");
    }
    setLoading(false);
  };

  const sendCode = async () => {
    setError("");
    setLoading(true);

    try {
      if (!email || !name || !username || !password) {
        setError("Заполните все поля");
        setLoading(false);
        return;
      }
      if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) {
        setError("Юзернейм: 3-20 символов, латиница, цифры и _");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/auth/send-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, type: "register" }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Ошибка отправки кода");
        setLoading(false);
        return;
      }

      setStep("verify");
      setCode("");
      setCountdown(60);
    } catch {
      setError("Произошла ошибка");
    }
    setLoading(false);
  };

  const verifyAndAuth = async () => {
    setError("");
    setLoading(true);

    try {
      const verifyRes = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code, type: "register" }),
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok) {
        setError(verifyData.error || "Неверный код");
        setLoading(false);
        return;
      }

      const regRes = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name, username, verificationCode: code }),
      });

      const regData = await regRes.json();
      if (!regRes.ok) {
        setError(regData.error || "Ошибка регистрации");
        setLoading(false);
        return;
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        setError("Ошибка входа");
      } else {
        router.push("/");
        router.refresh();
      }
    } catch {
      setError("Произошла ошибка");
    }
    setLoading(false);
  };

  const resendCode = async () => {
    if (countdown > 0) return;
    await sendCode();
  };

  useEffect(() => {
    if (code.length === 6 && step === "verify") {
      verifyAndAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-neutral-50 dark:bg-neutral-950">
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/3 left-1/3 w-96 h-96 bg-violet-400/5 dark:bg-cyan-400/5 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/3 w-96 h-96 bg-indigo-400/5 dark:bg-fantasy-purple/5 rounded-full blur-[120px]" />
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.6 }}
        className="bg-white dark:bg-neutral-900/80 backdrop-blur-xl border border-neutral-200 dark:border-white/10 rounded-2xl p-8 w-full max-w-md relative shadow-xl"
      >
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2 mb-4">
            <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-indigo-600 dark:from-cyan-400 dark:to-fantasy-purple rounded-xl flex items-center justify-center">
              <span className="text-white font-bold">TZ</span>
            </div>
          </Link>

          {step === "form" ? (
            <>
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                {authType === "register" ? "Регистрация" : "Вход в TrioZ"}
              </h1>
              <p className="text-neutral-500 dark:text-gray-400 text-sm mt-1">
                {authType === "register"
                  ? "Создайте аккаунт — код подтверждения придёт на email"
                  : "Введите email и пароль"}
              </p>
            </>
          ) : (
            <>
              <h1 className="text-2xl font-display font-bold text-neutral-900 dark:text-white">
                Введите код
              </h1>
              <p className="text-neutral-500 dark:text-gray-400 text-sm mt-1">
                Отправлен на <span className="text-violet-600 dark:text-cyan-400">{email}</span>
              </p>
            </>
          )}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 dark:bg-red-500/10 border border-red-200 dark:border-red-500/30 rounded-xl text-red-600 dark:text-red-400 text-sm text-center">
            {error}
          </div>
        )}

        {step === "form" ? (
          <>
            <div className="space-y-4">
              {authType === "register" && (
                <>
                  <div>
                    <label className="block text-sm text-neutral-600 dark:text-gray-400 mb-1">Имя</label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                      placeholder="Ваше имя"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-neutral-600 dark:text-gray-400 mb-1">Юзернейм</label>
                    <input
                      type="text"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      className="input-field"
                      placeholder="my_username"
                      pattern="[a-zA-Z0-9_]{3,20}"
                      title="3-20 символов: латиница, цифры и _"
                      required
                    />
                  </div>
                </>
              )}
              <div>
                <label className="block text-sm text-neutral-600 dark:text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input-field"
                  placeholder="email@example.com"
                  required
                />
              </div>
              <div>
                <label className="block text-sm text-neutral-600 dark:text-gray-400 mb-1">Пароль</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { if (authType === "login") { handleLogin(); } else { sendCode(); } } }}
                  className="input-field"
                  placeholder="••••••••"
                  required
                />
              </div>

              <button
                onClick={authType === "login" ? handleLogin : sendCode}
                disabled={loading}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? (authType === "login" ? "Вход..." : "Отправка...")
                  : (authType === "login" ? "Войти" : "Получить код на email")}
              </button>
            </div>

            <div className="mt-6 text-center">
              <button
                onClick={() => {
                  setAuthType(authType === "login" ? "register" : "login");
                  setError("");
                  setStep("form");
                }}
                className="text-sm text-violet-600 dark:text-cyan-400 hover:text-violet-500 dark:hover:text-cyan-300 transition-colors"
              >
                {authType === "register" ? "Уже есть аккаунт? Войти" : "Нет аккаунта? Зарегистрироваться"}
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="space-y-6">
              <CodeInput length={6} value={code} onChange={setCode} />

              {loading && (
                <p className="text-center text-sm text-neutral-500 dark:text-gray-400">
                  Проверка кода...
                </p>
              )}

              <div className="text-center">
                <button
                  onClick={resendCode}
                  disabled={countdown > 0}
                  className="text-sm text-violet-600 dark:text-cyan-400 hover:text-violet-500 dark:hover:text-cyan-300 transition-colors disabled:text-neutral-400 dark:disabled:text-gray-600 disabled:cursor-not-allowed"
                >
                  {countdown > 0
                    ? `Отправить повторно (${countdown}с)`
                    : "Отправить код повторно"}
                </button>
              </div>

              <button
                onClick={() => {
                  setStep("form");
                  setCode("");
                  setError("");
                }}
                className="w-full text-sm text-neutral-500 dark:text-gray-400 hover:text-neutral-700 dark:hover:text-gray-200 transition-colors text-center py-2"
              >
                ← Назад
              </button>
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
}
