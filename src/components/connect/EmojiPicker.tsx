"use client";

import { useState, useRef, useEffect } from "react";

const EMOJI_CATEGORIES: { label: string; emojis: string[] }[] = [
  {
    label: "Смайлы",
    emojis: [
      "😀", "😃", "😄", "😁", "😆", "😅", "🤣", "😂", "🙂", "😊",
      "😇", "🥰", "😍", "🤩", "😘", "😋", "😛", "😜", "🤪", "😝",
      "🤑", "🤗", "🤭", "🤫", "🤔", "😐", "😑", "😶", "😏", "😒",
      "🙄", "😬", "😮‍💨", "🤥", "😌", "😔", "😪", "🤤", "😴", "😷",
      "🤒", "🤕", "🤢", "🤮", "🥵", "🥶", "🥴", "😵", "🤯", "😎",
    ],
  },
  {
    label: "Жесты",
    emojis: [
      "👋", "🤚", "🖐️", "✋", "🖖", "👌", "🤌", "🤏", "✌️", "🤞",
      "🤟", "🤘", "🤙", "👈", "👉", "👆", "👇", "☝️", "👍", "👎",
      "✊", "👊", "🤛", "🤜", "👏", "🙌", "👐", "🤲", "🤝", "🙏",
    ],
  },
  {
    label: "Сердца",
    emojis: [
      "❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "🤎", "💔",
      "❤️‍🔥", "💕", "💞", "💓", "💗", "💖", "💘", "💝",
    ],
  },
  {
    label: "Объекты",
    emojis: [
      "🔥", "⭐", "🌟", "✨", "💫", "🎉", "🎊", "🏆", "🥇", "🎯",
      "💡", "📌", "📎", "🔗", "⚡", "💎", "🔔", "🚀", "💬", "👀",
    ],
  },
];

interface EmojiPickerProps {
  onSelect: (emoji: string) => void;
  onClose: () => void;
}

export default function EmojiPicker({ onSelect, onClose }: EmojiPickerProps) {
  const [activeTab, setActiveTab] = useState(0);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        onClose();
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  return (
    <div
      ref={ref}
      className="absolute bottom-full left-0 mb-2 w-72 bg-[var(--cn-sidebar)] border border-[var(--cn-border)] rounded-xl shadow-2xl z-50 overflow-hidden"
    >
      {/* Category tabs */}
      <div className="flex border-b border-[var(--cn-border)] px-1 pt-1">
        {EMOJI_CATEGORIES.map((cat, i) => (
          <button
            key={cat.label}
            onClick={() => setActiveTab(i)}
            className={`flex-1 text-[10px] py-1.5 rounded-t-lg transition-colors ${
              activeTab === i
                ? "text-violet-500 dark:text-cyan-400 bg-violet-50 dark:bg-cyan-400/10 font-semibold"
                : "text-neutral-400 hover:text-neutral-600 dark:hover:text-gray-300"
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Emoji grid */}
      <div className="p-2 h-48 overflow-y-auto">
        <div className="grid grid-cols-8 gap-0.5">
          {EMOJI_CATEGORIES[activeTab].emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => { onSelect(emoji); onClose(); }}
              className="w-8 h-8 text-lg hover:bg-[var(--cn-hover)] rounded-lg flex items-center justify-center transition-colors"
            >
              {emoji}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
