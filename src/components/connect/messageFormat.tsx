import type { ReactNode } from "react";
import type { Attachment } from "./messageTypes";


// Render formatted content: **bold**, *italic*, `code`, - lists, #channel mentions, @mentions
export function renderContent(text: string): ReactNode {
    const parts: ReactNode[] = [];
    const regex = /(\*\*(.+?)\*\*|\*(.+?)\*|`(.+?)`|^- (.+)$|#(\S+)|@(everyone|[A-Za-z0-9_а-яА-ЯёЁ]+))/gm;
    let lastIndex = 0;
    let match;
    let key = 0;
    while ((match = regex.exec(text)) !== null) {
      if (match.index > lastIndex) parts.push(text.slice(lastIndex, match.index));
      if (match[2]) parts.push(<strong key={key++}>{match[2]}</strong>);
      else if (match[3]) parts.push(<em key={key++}>{match[3]}</em>);
      else if (match[4]) parts.push(<code key={key++} className="bg-neutral-200 dark:bg-white/10 px-1 rounded text-xs">{match[4]}</code>);
      else if (match[5]) parts.push(<span key={key++} className="flex items-start gap-1"><span className="text-violet-500 dark:text-cyan-400">•</span>{match[5]}</span>);
      else if (match[6]) parts.push(<span key={key++} className="text-violet-500 dark:text-cyan-400 cursor-pointer hover:underline">#{match[6]}</span>);
      else if (match[7]) parts.push(<span key={key++} className="bg-violet-500/20 dark:bg-cyan-400/20 text-violet-600 dark:text-cyan-300 px-1 rounded font-medium">@{match[7]}</span>);
      lastIndex = match.index + match[0].length;
    }
    if (lastIndex < text.length) parts.push(text.slice(lastIndex));
    return parts.length > 0 ? parts : text;
}

export function parseAttachments(raw: string | null | undefined): Attachment[] {
  if (!raw) return [];
  try { return JSON.parse(raw); } catch { return []; }
}
