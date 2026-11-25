import { getOfflineAuth } from "./offlineAuth";

const dbPromiseMap = new Map();
let migrationChecked = false;

/**
 * Resolve the database name scoped to the user ID.
 */
export function resolveDBName(userId) {
  const resolved = userId || getOfflineAuth()?.id;
  return resolved ? `MyAppDB_${resolved}` : "MyAppDB_guest";
}

/**
 * One-time migration: if the legacy unpartitioned "MyAppDB" exists and the
 * current user's scoped database is empty, transfer any existing notes and
 * remove the legacy unpartitioned database.
 */
async function checkAndMigrateLegacyDB(currentUserId) {
  if (
    migrationChecked ||
    !currentUserId ||
    typeof window === "undefined" ||
    !window.indexedDB
  ) {
    return;
  }
  migrationChecked = true;

  try {
    const legacyExists = await new Promise((resolve) => {
      const req = indexedDB.open("MyAppDB");
      req.onsuccess = (e) => {
        const db = e.target.result;
        const hasNotes = db.objectStoreNames.contains("notes");
        db.close();
        resolve(hasNotes);
      };
      req.onerror = () => resolve(false);
    });

    if (!legacyExists) return;

    const legacyNotes = await new Promise((resolve) => {
      const req = indexedDB.open("MyAppDB");
      req.onsuccess = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains("notes")) {
          db.close();
          return resolve([]);
        }
        const tx = db.transaction("notes", "readonly");
        const getReq = tx.objectStore("notes").getAll();
        getReq.onsuccess = () => {
          db.close();
          resolve(getReq.result || []);
        };
        getReq.onerror = () => {
          db.close();
          resolve([]);
        };
      };
      req.onerror = () => resolve([]);
    });

    if (legacyNotes.length > 0) {
      const targetDb = await getDB(currentUserId);
      await new Promise((resolve) => {
        const tx = targetDb.transaction("notes", "readwrite");
        const store = tx.objectStore("notes");
        const countReq = store.count();
        countReq.onsuccess = () => {
          if (countReq.result === 0) {
            for (const note of legacyNotes) {
              store.put(note);
            }
          }
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => resolve();
      });
    }

    indexedDB.deleteDatabase("MyAppDB");
  } catch (err) {
    console.warn("Legacy IndexedDB migration warning:", err);
  }
}

export function getDB(userId) {
  const dbName = resolveDBName(userId);

  if (!dbPromiseMap.has(dbName)) {
    const promise = new Promise((resolve, reject) => {
      const request = indexedDB.open(dbName, 2);

      // Create database structure
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => {
        const resolvedUserId = userId || getOfflineAuth()?.id;
        if (resolvedUserId) {
          void checkAndMigrateLegacyDB(resolvedUserId);
        }
        resolve(request.result);
      };

      request.onerror = () => reject(request.error);
    });

    dbPromiseMap.set(dbName, promise);
  }

  return dbPromiseMap.get(dbName);
}

export async function getAll(userId) {
  const db = await getDB(userId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readonly");

    const request = transaction.objectStore("notes").getAll();

    request.onsuccess = () => {
      const notes = (request.result || []).map((note) => {
        // Generate a fresh local Blob URL from cached media whenever offline,
        // or when source_url is missing or holds a dead blob: URL from a prior session.
        if (
          note.mediaBlob instanceof Blob &&
          (!navigator.onLine ||
            !note.source_url ||
            note.source_url.startsWith("blob:"))
        ) {
          try {
            return {
              ...note,
              source_url: URL.createObjectURL(note.mediaBlob),
            };
          } catch (err) {
            console.warn("Failed to create blob URL for offline media:", err);
            return note;
          }
        }
        return note;
      });
      resolve(notes);
    };
    request.onerror = () => reject(request.error);
  });
}

export async function populate(notes, userId) {
  const db = await getDB(userId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");
    const store = transaction.objectStore("notes");

    const getAllReq = store.getAll();
    getAllReq.onsuccess = () => {
      const existing = getAllReq.result || [];
      const pendingIds = new Set(
        existing
          .filter(
            (n) => n && (n.syncStatus === "pending" || n.syncStatus === "error"),
          )
          .map((n) => n.id),
      );

      const existingMap = new Map(existing.map((e) => [e.id, e]));
      const serverNoteIds = new Set(notes.map((n) => n.id));

      // Clean up server-deleted notes that were marked as synced
      for (const item of existing) {
        if (item && item.syncStatus === "synced" && !serverNoteIds.has(item.id)) {
          store.delete(item.id);
        }
      }

      for (const note of notes) {
        if (!pendingIds.has(note.id)) {
          const localMatch = existingMap.get(note.id);
          store.put({
            ...note,
            mediaBlob: localMatch?.mediaBlob || note.mediaBlob || undefined,
            syncStatus: "synced",
            isDeleted: false,
          });
        }
      }
    };

    transaction.oncomplete = () => resolve();
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function updateNote(note, userId) {
  const db = await getDB(userId || note?.user_id);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");

    const request = transaction.objectStore("notes").put(note);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function indexedDelete(id, userId) {
  const db = await getDB(userId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");

    const request = transaction.objectStore("notes").delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateLocalSyncStatus(id, status, userId) {
  const db = await getDB(userId);

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");
    const store = transaction.objectStore("notes");

    const request = store.get(id);

    request.onsuccess = () => {
      const note = request.result;
      if (note) {
        store.put({ ...note, syncStatus: status });
      }
    };

    transaction.oncomplete = resolve;
    transaction.onerror = () => reject(transaction.error);
  });
}

export async function clearUserDB(userId) {
  const dbName = resolveDBName(userId);
  const existingPromise = dbPromiseMap.get(dbName);
  dbPromiseMap.delete(dbName);
  if (existingPromise) {
    try {
      const db = await existingPromise;
      db?.close?.();
    } catch {
      // ignore
    }
  }
  if (typeof window !== "undefined" && window.indexedDB) {
    return new Promise((resolve) => {
      const req = indexedDB.deleteDatabase(dbName);
      req.onsuccess = () => resolve(true);
      req.onerror = () => resolve(false);
      req.onblocked = () => resolve(false);
    });
  }
}

// Background-cache remote image and voice media blobs into IndexedDB while online
// so server-fetched notes remain previewable and playable when the user goes offline.
export async function cacheNoteMedia(notes, userId) {
  if (!navigator.onLine || !Array.isArray(notes) || notes.length === 0) return;

  const mediaNotes = notes.filter(
    (n) =>
      n &&
      (n.note_type === "img" || n.note_type === "voice") &&
      typeof n.source_url === "string" &&
      (n.source_url.startsWith("http://") || n.source_url.startsWith("https://")),
  );
  if (mediaNotes.length === 0) return;

  try {
    const db = await getDB(userId);
    for (const note of mediaNotes) {
      if (!navigator.onLine) break;
      try {
        const stored = await new Promise((resolve) => {
          const tx = db.transaction("notes", "readonly");
          const req = tx.objectStore("notes").get(note.id);
          req.onsuccess = () => resolve(req.result);
          req.onerror = () => resolve(null);
        });

        if (stored?.mediaBlob instanceof Blob) continue;

        const res = await fetch(note.source_url);
        if (!res.ok) continue;
        const blob = await res.blob();
        if (!blob || blob.size === 0) continue;

        await updateNote(
          {
            ...(stored || note),
            mediaBlob: blob,
          },
          userId,
        );
      } catch (err) {
        console.warn("Failed to cache media blob for note:", note.id, err);
      }
    }
  } catch (err) {
    console.warn("Media background caching failed:", err);
  }
}
