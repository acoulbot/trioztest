"use client";

import { useEffect } from "react";
import { useSession } from "next-auth/react";

const HEARTBEAT_INTERVAL = 30_000; // 30 seconds

export function useHeartbeat() {
  const { data: session } = useSession();

  useEffect(() => {
    if (!session?.user) return;

    const ping = () => {
      fetch("/api/heartbeat", { method: "POST" }).catch(() => {});
    };

    ping();
    const interval = setInterval(ping, HEARTBEAT_INTERVAL);
    return () => clearInterval(interval);
  }, [session]);
}
