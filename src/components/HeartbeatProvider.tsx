"use client";

import { useHeartbeat } from "@/hooks/useHeartbeat";

export function HeartbeatProvider() {
  useHeartbeat();
  return null;
}
