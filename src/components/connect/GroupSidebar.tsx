"use client";

interface Group {
  id: string;
  name: string;
  icon: string | null;
}

interface GroupSidebarProps {
  groups: Group[];
  selectedGroup: string | null;
  showFriends: boolean;
  onSelectGroup: (id: string) => void;
  onCreateGroup: () => void;
  onJoinGroup: () => void;
  onToggleFriends: () => void;
}

export default function GroupSidebar({
  groups, selectedGroup, showFriends,
  onSelectGroup, onCreateGroup, onJoinGroup, onToggleFriends,
}: GroupSidebarProps) {
  return (
    <nav
      className="w-[72px] bg-neutral-100 dark:bg-neutral-950 border-r border-neutral-200 dark:border-white/5 flex flex-col items-center py-3 gap-2 h-full overflow-y-auto flex-shrink-0 max-md:hidden"
      aria-label="Groups"
    >
      {groups.map((group) => (
        <button
          key={group.id}
          onClick={() => onSelectGroup(group.id)}
          className={`w-12 h-12 rounded-2xl flex items-center justify-center text-lg transition-all duration-300 hover:rounded-xl ${
            selectedGroup === group.id
              ? "bg-violet-500 dark:bg-cyan-500 text-white rounded-xl shadow-lg"
              : "bg-neutral-200 dark:bg-neutral-800 text-neutral-600 dark:text-gray-400 hover:bg-violet-200 dark:hover:bg-cyan-400/20 hover:text-violet-700 dark:hover:text-cyan-400"
          }`}
          title={group.name}
          aria-label={group.name}
          aria-current={selectedGroup === group.id ? "true" : undefined}
        >
          {group.icon || group.name.charAt(0).toUpperCase()}
        </button>
      ))}

      <div className="w-8 h-px bg-neutral-300 dark:bg-white/10 my-1" aria-hidden="true" />

      <button
        onClick={onCreateGroup}
        className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-green-600 dark:text-green-400 flex items-center justify-center hover:bg-green-100 dark:hover:bg-green-400/20 hover:rounded-xl transition-all duration-300"
        title="Создать группу"
        aria-label="Создать группу"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
        </svg>
      </button>

      <button
        onClick={onJoinGroup}
        className="w-12 h-12 rounded-2xl bg-neutral-200 dark:bg-neutral-800 text-blue-600 dark:text-blue-400 flex items-center justify-center hover:bg-blue-100 dark:hover:bg-blue-400/20 hover:rounded-xl transition-all duration-300"
        title="Присоединиться"
        aria-label="Присоединиться"
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
        </svg>
      </button>

      <div className="w-8 h-px bg-neutral-300 dark:bg-white/10 my-1" aria-hidden="true" />

      <button
        onClick={onToggleFriends}
        className={`w-12 h-12 rounded-2xl flex items-center justify-center hover:rounded-xl transition-all duration-300 ${
          showFriends
            ? "bg-amber-500 dark:bg-amber-500 text-white rounded-xl shadow-lg"
            : "bg-neutral-200 dark:bg-neutral-800 text-amber-600 dark:text-amber-400 hover:bg-amber-100 dark:hover:bg-amber-400/20"
        }`}
        title="Друзья"
        aria-label="Друзья"
        aria-pressed={showFriends}
      >
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>
    </nav>
  );
}
