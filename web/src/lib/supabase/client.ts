"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseEnv } from "./env";

type BrowserClient = ReturnType<typeof createBrowserClient>;

declare global {
  var __clinicQueueSupabaseBrowserClient: BrowserClient | undefined;
}

export function createSupabaseBrowserClient(): BrowserClient {
  // Keep a singleton client to avoid opening multiple realtime sockets.
  if (globalThis.__clinicQueueSupabaseBrowserClient) {
    return globalThis.__clinicQueueSupabaseBrowserClient;
  }

  const { url, anonKey } = getSupabaseEnv();
  const client = createBrowserClient(url, anonKey);
  globalThis.__clinicQueueSupabaseBrowserClient = client;
  return client;
}
