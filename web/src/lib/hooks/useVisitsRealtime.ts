"use client";

import { useEffect, useRef } from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";

import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export type UseVisitsRealtimeOptions = {
  clinicId?: string;
  day: string;
  enabled?: boolean;
  onChange: () => void;
  debounceMs?: number;
  fallbackPollMs?: number;
};

function todayISODateClient(): string {
  return new Date().toISOString().slice(0, 10);
}

function getVisitDateFromRow(row: unknown): string {
  if (!row || typeof row !== "object") return "";
  if (!("visit_date" in row)) return "";
  const value = (row as { visit_date?: unknown }).visit_date;
  if (typeof value === "string") return value;
  return value == null ? "" : String(value);
}

export function useVisitsRealtime({
  clinicId,
  day,
  enabled = true,
  onChange,
  debounceMs = 250,
  // True realtime by default: no polling fallback unless explicitly enabled.
  fallbackPollMs = 0,
}: UseVisitsRealtimeOptions) {
  const onChangeRef = useRef(onChange);
  const debounceMsRef = useRef(debounceMs);
  const pendingRefreshRef = useRef(false);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    debounceMsRef.current = debounceMs;
  }, [debounceMs]);

  useEffect(() => {
    if (!enabled) return;

    const supabase = createSupabaseBrowserClient();

    let timeoutId: number | null = null;
    const trigger = () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      timeoutId = window.setTimeout(() => {
        onChangeRef.current();
      }, debounceMsRef.current);
    };

    // NOTE:
    // We intentionally subscribe WITHOUT a server-side filter.
    // Filtering by a non-updated column can miss UPDATE events depending on replica identity.
    // We do a lightweight client-side check instead.
    const effectiveDay = day || todayISODateClient();

    let pollId: number | null = null;

    const onVisibilityChange = () => {
      if (!document.hidden && pendingRefreshRef.current) {
        pendingRefreshRef.current = false;
        trigger();
      }
    };

    document.addEventListener("visibilitychange", onVisibilityChange);

    const channelName = clinicId
      ? `visits-${clinicId}-${effectiveDay}`
      : `visits-${effectiveDay}`;

    const changesConfig: {
      event: "*";
      schema: "public";
      table: "visits";
      filter?: string;
    } = {
      event: "*",
      schema: "public",
      table: "visits",
    };

    // IMPORTANT:
    // With multi-clinic, we MUST filter to avoid receiving other clinics' row data.
    // Filtering by clinic_id is safe because clinic_id is immutable for a row.
    if (clinicId) {
      changesConfig.filter = `clinic_id=eq.${clinicId}`;
    }

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        changesConfig,
        (
          payload: RealtimePostgresChangesPayload<{
            visit_date?: string | null;
          }>,
        ) => {
          if (document.hidden) {
            pendingRefreshRef.current = true;
            return;
          }

          const rowDay =
            getVisitDateFromRow(payload.new) ||
            getVisitDateFromRow(payload.old);

          // If we can detect the day, only refresh when it matches.
          // If not, refresh anyway (safe; server action filters by day).
          if (!rowDay || rowDay === effectiveDay) {
            trigger();
          }
        },
      )
      .subscribe((status: string) => {
        if (status === "SUBSCRIBED") {
          trigger();
        }

        if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          pendingRefreshRef.current = true;

          if (process.env.NODE_ENV !== "production") {
            console.warn("[useVisitsRealtime] channel status:", status);
          }
        }
      });

    // Fallback polling: refresh periodically as a safety net.
    // NOTE: We intentionally do not gate on `subscribed` because a channel can be
    // SUBSCRIBED while still receiving no events (e.g. table not in publication).
    if (fallbackPollMs > 0) {
      pollId = window.setInterval(
        () => {
          if (document.hidden) return;
          trigger();
        },
        Math.max(2000, fallbackPollMs),
      );
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
      if (pollId) window.clearInterval(pollId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      supabase.removeChannel(channel);
    };
  }, [clinicId, day, enabled, fallbackPollMs]);
}
