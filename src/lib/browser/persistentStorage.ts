"use client";

let persistRequest: Promise<boolean> | undefined;

export function requestPersistentStorage() {
  if (typeof navigator === "undefined" || !navigator.storage?.persist) return;
  persistRequest ??= navigator.storage.persist().catch(() => false);
}
