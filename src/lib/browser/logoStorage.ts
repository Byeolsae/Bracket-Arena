"use client";

const logoRefPrefix = "idb-logo:";
const dbName = "bracket-arena-logo-storage";
const storeName = "logos";
const cache = new Map<string, string>();

export function isStoredLogoRef(value: string | undefined): value is string {
  return Boolean(value?.startsWith(logoRefPrefix));
}

export async function storeLogoDataUrl(dataUrl: string): Promise<string> {
  if (!dataUrl.startsWith("data:image/") || typeof indexedDB === "undefined") return dataUrl;
  const id = `${logoRefPrefix}${globalThis.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  await withLogoStore("readwrite", (store) => store.put(dataUrl, id));
  return id;
}

export async function resolveStoredLogo(value: string): Promise<string> {
  if (!isStoredLogoRef(value) || typeof indexedDB === "undefined") return value;
  const cached = cache.get(value);
  if (cached) return cached;
  const dataUrl = await withLogoStore<string | undefined>("readonly", (store) => store.get(value));
  if (!dataUrl) return "";
  cache.set(value, dataUrl);
  return dataUrl;
}

export async function removeStoredLogo(value: string | undefined): Promise<void> {
  if (!isStoredLogoRef(value) || typeof indexedDB === "undefined") return;
  cache.delete(value);
  await withLogoStore("readwrite", (store) => store.delete(value));
}

function openLogoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(storeName)) db.createObjectStore(storeName);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Failed to open logo storage"));
  });
}

async function withLogoStore<T>(mode: IDBTransactionMode, action: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openLogoDb();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode);
    const request = action(transaction.objectStore(storeName));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("Logo storage request failed"));
    transaction.oncomplete = () => db.close();
    transaction.onerror = () => {
      db.close();
      reject(transaction.error ?? new Error("Logo storage transaction failed"));
    };
  });
}
