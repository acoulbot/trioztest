"use client";

import { useState, useEffect, useCallback, useRef } from "react";

/* ════════════════════════════════════════════════════════════════════════
   Types
   ════════════════════════════════════════════════════════════════════ */

interface UserStub { id: string; name: string | null; avatar: string | null }

interface PollOptionData {
  id: string;
  text: string;
  votes: { userId: string }[];
}
interface PollData {
  id: string;
  question: string;
  anonymous: boolean;
  multiple: boolean;
  closed: boolean;
  userId: string;
  user: UserStub;
  options: PollOptionData[];
  createdAt: string;
}

interface TaskData {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  dueDate: string | null;
  creator: UserStub;
  assignee: UserStub | null;
  createdAt: string;
}

/* ════════════════════════════════════════════════════════════════════════
   + Menu (dropdown for creating polls / tasks)
   ════════════════════════════════════════════════════════════════════ */

export function PlusMenu({
  channelId,
  channelMembers,
  currentUserId,
  onCreated,
}: {
  channelId: string;
  channelMembers: { id: string; name: string | null }[];
  currentUserId: string;
  onCreated: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<"menu" | "poll" | "task">("menu");
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
        setMode("menu");
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => { setOpen(!open); setMode("menu"); }}
        className="p-2.5 text-neutral-400 hover:text-violet-500 dark:hover:text-cyan-400 transition-colors"
        aria-label="Добавить"
        title="Опрос / Задача"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="5" x2="12" y2="19" />
          <line x1="5" y1="12" x2="19" y2="12" />
        </svg>
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl shadow-xl z-50 overflow-hidden">
          {mode === "menu" && (
            <div className="p-2 space-y-1">
              <button onClick={() => setMode("poll")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 text-sm text-neutral-700 dark:text-gray-300">
                <span className="text-lg">📊</span> Создать опрос
              </button>
              <button onClick={() => setMode("task")} className="w-full flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-white/5 text-sm text-neutral-700 dark:text-gray-300">
                <span className="text-lg">✅</span> Создать задачу
              </button>
            </div>
          )}

          {mode === "poll" && (
            <CreatePollForm
              channelId={channelId}
              onDone={() => { setOpen(false); setMode("menu"); onCreated(); }}
              onCancel={() => setMode("menu")}
            />
          )}

          {mode === "task" && (
            <CreateTaskForm
              channelId={channelId}
              members={channelMembers}
              currentUserId={currentUserId}
              onDone={() => { setOpen(false); setMode("menu"); onCreated(); }}
              onCancel={() => setMode("menu")}
            />
          )}
        </div>
      )}
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Create Poll Form
   ════════════════════════════════════════════════════════════════════ */

function CreatePollForm({ channelId, onDone, onCancel }: { channelId: string; onDone: () => void; onCancel: () => void }) {
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState(["", ""]);
  const [anonymous, setAnonymous] = useState(false);
  const [multiple, setMultiple] = useState(false);
  const [sending, setSending] = useState(false);

  const addOption = () => setOptions([...options, ""]);
  const removeOption = (i: number) => setOptions(options.filter((_, idx) => idx !== i));
  const updateOption = (i: number, v: string) => { const n = [...options]; n[i] = v; setOptions(n); };

  const submit = async () => {
    const valid = options.filter((o) => o.trim());
    if (!question.trim() || valid.length < 2) return;
    setSending(true);
    await fetch("/api/channels/polls", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ channelId, question, options: valid, anonymous, multiple }),
    });
    setSending(false);
    onDone();
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Новый опрос</h4>
        <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs">← Назад</button>
      </div>
      <input
        value={question}
        onChange={(e) => setQuestion(e.target.value)}
        placeholder="Вопрос"
        className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
      />
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1.5">
            <input
              value={opt}
              onChange={(e) => updateOption(i, e.target.value)}
              placeholder={`Вариант ${i + 1}`}
              className="flex-1 px-3 py-1.5 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
            />
            {options.length > 2 && (
              <button onClick={() => removeOption(i)} className="px-2 text-red-400 hover:text-red-300 text-xs">✕</button>
            )}
          </div>
        ))}
        {options.length < 10 && (
          <button onClick={addOption} className="text-xs text-violet-500 dark:text-cyan-400 hover:underline">+ Добавить вариант</button>
        )}
      </div>
      <div className="flex gap-4 text-xs text-neutral-500 dark:text-gray-400">
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={anonymous} onChange={(e) => setAnonymous(e.target.checked)} className="rounded" />
          Анонимный
        </label>
        <label className="flex items-center gap-1.5 cursor-pointer">
          <input type="checkbox" checked={multiple} onChange={(e) => setMultiple(e.target.checked)} className="rounded" />
          Несколько ответов
        </label>
      </div>
      <button
        onClick={submit}
        disabled={sending || !question.trim() || options.filter((o) => o.trim()).length < 2}
        className="w-full py-2 bg-violet-600 dark:bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-violet-700 dark:hover:bg-cyan-600 disabled:opacity-50"
      >
        {sending ? "Создание..." : "Создать опрос"}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Create Task Form
   ════════════════════════════════════════════════════════════════════ */

function CreateTaskForm({
  channelId,
  members,
  currentUserId,
  onDone,
  onCancel,
}: {
  channelId: string;
  members: { id: string; name: string | null }[];
  currentUserId: string;
  onDone: () => void;
  onCancel: () => void;
}) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [assigneeId, setAssigneeId] = useState("");
  const [assigneeQuery, setAssigneeQuery] = useState("");
  const [showAssigneeList, setShowAssigneeList] = useState(false);
  const [priority, setPriority] = useState("normal");
  const [dueDate, setDueDate] = useState("");
  const [sending, setSending] = useState(false);

  const filteredMembers = members.filter((m) => {
    if (!assigneeQuery.trim()) return true;
    const q = assigneeQuery.toLowerCase();
    return (m.name || "").toLowerCase().includes(q);
  });

  const submit = async () => {
    if (!title.trim()) return;
    setSending(true);
    await fetch("/api/channels/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        channelId,
        title: title.trim(),
        description: description.trim() || null,
        assigneeId: assigneeId || null,
        priority,
        dueDate: dueDate || null,
      }),
    });
    setSending(false);
    onDone();
  };

  return (
    <div className="p-3 space-y-3">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-semibold text-neutral-900 dark:text-white">Новая задача</h4>
        <button onClick={onCancel} className="text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs">← Назад</button>
      </div>
      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        placeholder="Название задачи"
        className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
      />
      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        placeholder="Описание (необязательно)"
        rows={2}
        className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400 resize-none"
      />
      <div className="grid grid-cols-2 gap-2">
        <div className="relative">
          <input
            value={assigneeQuery}
            onChange={(e) => { setAssigneeQuery(e.target.value); setShowAssigneeList(true); if (!e.target.value.trim()) { setAssigneeId(""); } }}
            onFocus={() => setShowAssigneeList(true)}
            placeholder={assigneeId ? (members.find(m => m.id === assigneeId)?.name || "Назначен") : "Поиск по нику..."}
            className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white placeholder-neutral-400"
          />
          {assigneeId && (
            <button
              type="button"
              onClick={() => { setAssigneeId(""); setAssigneeQuery(""); }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-neutral-600 dark:hover:text-white text-xs"
            >✕</button>
          )}
          {showAssigneeList && !assigneeId && (
            <div className="absolute top-full left-0 right-0 mt-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-white/10 rounded-lg shadow-lg z-50 max-h-32 overflow-y-auto">
              {filteredMembers.length === 0 ? (
                <div className="px-3 py-2 text-xs text-neutral-400">Не найдено</div>
              ) : (
                filteredMembers.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => { setAssigneeId(m.id); setAssigneeQuery(m.name || ""); setShowAssigneeList(false); }}
                    className="w-full text-left px-3 py-1.5 text-sm text-neutral-700 dark:text-gray-300 hover:bg-neutral-100 dark:hover:bg-white/10"
                  >
                    {m.name || "Без имени"} {m.id === currentUserId && <span className="text-neutral-400">(Я)</span>}
                  </button>
                ))
              )}
            </div>
          )}
        </div>
        <select
          value={priority}
          onChange={(e) => setPriority(e.target.value)}
          className="px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white"
        >
          <option value="low">Низкий</option>
          <option value="normal">Обычный</option>
          <option value="high">Высокий</option>
          <option value="urgent">Срочный</option>
        </select>
      </div>
      <input
        type="date"
        value={dueDate}
        onChange={(e) => setDueDate(e.target.value)}
        className="w-full px-3 py-2 bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10 rounded-lg text-sm text-neutral-900 dark:text-white"
      />
      <button
        onClick={submit}
        disabled={sending || !title.trim()}
        className="w-full py-2 bg-violet-600 dark:bg-cyan-500 text-white text-sm font-medium rounded-lg hover:bg-violet-700 dark:hover:bg-cyan-600 disabled:opacity-50"
      >
        {sending ? "Создание..." : "Создать задачу"}
      </button>
    </div>
  );
}

/* ════════════════════════════════════════════════════════════════════════
   Polls & Tasks Panel (shown in message area)
   ════════════════════════════════════════════════════════════════════ */

const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  low: { label: "Низкий", color: "text-neutral-400" },
  normal: { label: "Обычный", color: "text-blue-400" },
  high: { label: "Высокий", color: "text-orange-400" },
  urgent: { label: "Срочный", color: "text-red-400" },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  open: { label: "Открыта", color: "bg-blue-400/20 text-blue-400" },
  in_progress: { label: "В работе", color: "bg-yellow-400/20 text-yellow-500" },
  done: { label: "Выполнена", color: "bg-green-400/20 text-green-400" },
  closed: { label: "Закрыта", color: "bg-neutral-400/20 text-neutral-400" },
};

export function ChannelToolsPanel({
  channelId,
  currentUserId,
  members,
}: {
  channelId: string;
  currentUserId: string;
  members: { id: string; name: string | null }[];
}) {
  const [tab, setTab] = useState<"polls" | "tasks">("polls");
  const [polls, setPolls] = useState<PollData[]>([]);
  const [tasks, setTasks] = useState<TaskData[]>([]);

  const fetchPolls = useCallback(() => {
    fetch(`/api/channels/polls?channelId=${channelId}`).then((r) => r.json()).then(setPolls).catch(() => {});
  }, [channelId]);

  const fetchTasks = useCallback(() => {
    fetch(`/api/channels/tasks?channelId=${channelId}`).then((r) => r.json()).then(setTasks).catch(() => {});
  }, [channelId]);

  useEffect(() => { fetchPolls(); fetchTasks(); }, [fetchPolls, fetchTasks]);

  const vote = async (optionId: string) => {
    await fetch("/api/channels/polls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ optionId }),
    });
    fetchPolls();
  };

  const closePoll = async (pollId: string) => {
    await fetch("/api/channels/polls", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pollId, action: "close" }),
    });
    fetchPolls();
  };

  const updateTaskStatus = async (taskId: string, status: string) => {
    await fetch("/api/channels/tasks", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ taskId, status }),
    });
    fetchTasks();
  };

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/channels/tasks?taskId=${taskId}`, { method: "DELETE" });
    fetchTasks();
  };

  const hasContent = polls.length > 0 || tasks.length > 0;
  if (!hasContent) return null;

  return (
    <div className="border-b border-[var(--cn-border)] bg-[var(--cn-main)]">
      <div className="flex items-center gap-1 px-4 pt-2">
        <button
          onClick={() => setTab("polls")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            tab === "polls"
              ? "bg-violet-500/10 dark:bg-cyan-400/10 text-violet-600 dark:text-cyan-400"
              : "text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
          }`}
        >
          📊 Опросы ({polls.length})
        </button>
        <button
          onClick={() => setTab("tasks")}
          className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
            tab === "tasks"
              ? "bg-violet-500/10 dark:bg-cyan-400/10 text-violet-600 dark:text-cyan-400"
              : "text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
          }`}
        >
          ✅ Задачи ({tasks.length})
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto p-3 space-y-2">
        {tab === "polls" && polls.map((poll) => {
          const totalVotes = poll.options.reduce((s, o) => s + o.votes.length, 0);
          return (
            <div key={poll.id} className="p-3 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-neutral-900 dark:text-white">{poll.question}</p>
                {!poll.closed && (poll.userId === currentUserId) && (
                  <button onClick={() => closePoll(poll.id)} className="text-[10px] text-red-400 hover:text-red-300 whitespace-nowrap">Закрыть</button>
                )}
              </div>
              <p className="text-[10px] text-neutral-400 mb-2">{poll.user.name} • {totalVotes} гол.</p>
              <div className="space-y-1">
                {poll.options.map((opt) => {
                  const pct = totalVotes ? Math.round((opt.votes.length / totalVotes) * 100) : 0;
                  const voted = opt.votes.some((v) => v.userId === currentUserId);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => !poll.closed && vote(opt.id)}
                      disabled={poll.closed}
                      className={`w-full text-left relative overflow-hidden rounded-lg px-3 py-1.5 text-xs transition-colors ${
                        voted
                          ? "bg-violet-500/20 dark:bg-cyan-400/20 text-violet-700 dark:text-cyan-300 font-medium"
                          : "bg-neutral-200/50 dark:bg-white/5 text-neutral-600 dark:text-gray-400 hover:bg-neutral-200 dark:hover:bg-white/10"
                      } ${poll.closed ? "cursor-default" : "cursor-pointer"}`}
                    >
                      <div
                        className="absolute inset-0 bg-violet-400/10 dark:bg-cyan-400/10 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                      <span className="relative z-10 flex justify-between">
                        <span>{opt.text}</span>
                        <span>{pct}%</span>
                      </span>
                    </button>
                  );
                })}
              </div>
              {poll.closed && <p className="text-[10px] text-neutral-400 mt-1">Опрос завершён</p>}
            </div>
          );
        })}

        {tab === "tasks" && tasks.map((task) => {
          const st = STATUS_LABELS[task.status] || STATUS_LABELS.open;
          const pr = PRIORITY_LABELS[task.priority] || PRIORITY_LABELS.normal;
          const isOwner = task.creator.id === currentUserId;
          const isAssignee = task.assignee?.id === currentUserId;

          return (
            <div key={task.id} className="p-3 rounded-xl bg-neutral-100 dark:bg-white/5 border border-neutral-200 dark:border-white/10">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${st.color}`}>{st.label}</span>
                    <span className={`text-[10px] ${pr.color}`}>● {pr.label}</span>
                  </div>
                  <p className="text-sm font-medium text-neutral-900 dark:text-white mt-1">{task.title}</p>
                  {task.description && <p className="text-xs text-neutral-500 dark:text-gray-400 mt-0.5">{task.description}</p>}
                </div>
                {isOwner && (
                  <button onClick={() => deleteTask(task.id)} className="text-red-400 hover:text-red-300 text-xs">✕</button>
                )}
              </div>
              <div className="flex items-center gap-3 mt-2 text-[10px] text-neutral-400">
                <span>От: {task.creator.name}</span>
                {task.assignee && <span>→ {task.assignee.name}</span>}
                {task.dueDate && <span>До: {new Date(task.dueDate).toLocaleDateString("ru")}</span>}
              </div>
              {(isOwner || isAssignee) && task.status !== "done" && task.status !== "closed" && (
                <div className="flex gap-1.5 mt-2">
                  {task.status === "open" && (
                    <button onClick={() => updateTaskStatus(task.id, "in_progress")} className="text-[10px] px-2 py-0.5 rounded bg-yellow-400/20 text-yellow-500 hover:bg-yellow-400/30">
                      В работу
                    </button>
                  )}
                  <button onClick={() => updateTaskStatus(task.id, "done")} className="text-[10px] px-2 py-0.5 rounded bg-green-400/20 text-green-400 hover:bg-green-400/30">
                    Выполнено
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
