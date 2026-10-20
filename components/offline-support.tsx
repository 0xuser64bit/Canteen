"use client";

import { useEffect } from "react";

/** Optional navigation recovery; it never caches conversations or queues actions. */
export function OfflineSupport() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    void navigator.serviceWorker
      .register("/sw.js", { scope: "/", updateViaCache: "none" })
      .catch(() => {
        // Browsing and sign-in still work when the browser blocks registration.
      });
  }, []);
  return null;
}
