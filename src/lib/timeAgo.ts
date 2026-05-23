export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return "давно";
  const now = Date.now();
  const then = new Date(date).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "только что";
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return `${m} мин. назад`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return `${h} ч. назад`;
  }
  const d = Math.floor(diff / 86400);
  if (d === 1) return "вчера";
  return `${d} дн. назад`;
}

export function isOnline(lastSeen: string | Date | null | undefined): boolean {
  if (!lastSeen) return false;
  const diff = Date.now() - new Date(lastSeen).getTime();
  return diff < 60_000; // online if seen in last 60 seconds
}
