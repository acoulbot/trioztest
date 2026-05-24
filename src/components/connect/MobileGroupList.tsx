"use client";

interface Group {
  id: string;
  name: string;
  icon: string | null;
  description: string;
  _count: { members: number; channels: number };
}

interface MobileGroupListProps {
  groups: Group[];
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onToggleFriends: () => void;
}

export default function MobileGroupList({ groups, onSelectGroup, onCreateGroup, onJoinGroup, onToggleFriends }: MobileGroupListProps) {
  return (
    <div className="flex-1 flex flex-col h-full bg-neutral-50 dark:bg-neutral-950">
      <header className="p-4 border-b border-neutral-200 dark:border-white/5">
        <h1 className="text-xl font-bold text-neutral-900 dark:text-white">TZ.Connect</h1>
      </header>

      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {groups.length === 0 ? (
          <div className="text-center py-12">
            <span className="text-5xl block mb-4">{"\uD83D\uDCAC"}</span>
            <p className="text-neutral-400 text-sm mb-4">Вы ещё не состоите в группах</p>
          </div>
        ) : (
          groups.map((g) => (
            <button
              key={g.id}
              onClick={() => onSelectGroup(g.id)}
              className="w-full text-left p-4 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-white/10 rounded-xl hover:border-violet-300 dark:hover:border-cyan-400/30 transition-all flex items-center gap-3"
            >
              <div className="w-12 h-12 rounded-xl bg-violet-100 dark:bg-cyan-400/10 flex items-center justify-center text-xl flex-shrink-0">
                {g.icon || g.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-medium text-neutral-900 dark:text-white text-sm truncate">{g.name}</div>
                {g.description && <p className="text-[11px] text-neutral-400 truncate">{g.description}</p>}
                <div className="text-[10px] text-neutral-400 mt-0.5">
                  {g._count.members} участников &middot; {g._count.channels} каналов
                </div>
              </div>
              <svg className="w-4 h-4 text-neutral-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          ))
        )}
      </div>

      <div className="p-4 border-t border-neutral-200 dark:border-white/5 flex gap-2">
        <button onClick={onCreateGroup} className="flex-1 btn-primary text-sm py-2.5">Создать</button>
        <button onClick={onJoinGroup} className="flex-1 btn-secondary text-sm py-2.5">Присоединиться</button>
        <button onClick={onToggleFriends} className="p-2.5 bg-amber-100 dark:bg-amber-400/10 text-amber-600 dark:text-amber-400 rounded-xl" aria-label="Friends">
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
