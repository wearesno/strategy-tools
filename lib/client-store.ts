'use client';

import type { DemandTrackerConfig, ClientData } from './types';

// ─── Config Store (localStorage) ────────────────────────────────────────────

const CONFIG_PREFIX = 'dt-config-';

export function saveConfig(slug: string, config: DemandTrackerConfig): void {
  try {
    localStorage.setItem(CONFIG_PREFIX + slug, JSON.stringify(config));
  } catch {
    // localStorage full or unavailable
  }
}

export function loadConfig(slug: string): DemandTrackerConfig | null {
  try {
    const raw = localStorage.getItem(CONFIG_PREFIX + slug);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// ─── Keyword Data Store (IndexedDB) ─────────────────────────────────────────

const DB_NAME = 'strategy-tools';
const DB_VERSION = 1;
const DATA_STORE = 'keyword-data';

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(DATA_STORE)) {
        db.createObjectStore(DATA_STORE);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function saveData(slug: string, data: ClientData): Promise<void> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATA_STORE, 'readwrite');
      tx.objectStore(DATA_STORE).put(data, slug);
      tx.oncomplete = () => { db.close(); resolve(); };
      tx.onerror = () => { db.close(); reject(tx.error); };
    });
  } catch {
    // IndexedDB unavailable
  }
}

export async function loadData(slug: string): Promise<ClientData | null> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(DATA_STORE, 'readonly');
      const request = tx.objectStore(DATA_STORE).get(slug);
      request.onsuccess = () => { db.close(); resolve(request.result || null); };
      request.onerror = () => { db.close(); reject(request.error); };
    });
  } catch {
    return null;
  }
}
