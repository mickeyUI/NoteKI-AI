let dbPromise;

export function getDB() {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open("MyAppDB", 2);

      // Create database structure
      request.onupgradeneeded = (event) => {
        const db = event.target.result;

        if (!db.objectStoreNames.contains("notes")) {
          db.createObjectStore("notes", {
            keyPath: "id",
          });
        }
      };

      request.onsuccess = () => resolve(request.result);

      request.onerror = () => reject(request.error);
    });
  }

  return dbPromise;
}

export async function getAll() {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readonly");

    const request = transaction.objectStore("notes").getAll();

    request.onsuccess = () => {
      const notes = (request.result || []).map((note) => {
        // If note has a stored mediaBlob and its source_url is either missing or an old blob url,
        // create a fresh blob URL for local offline playback / rendering.
        if (
          note.mediaBlob &&
          (!note.source_url || note.source_url.startsWith("blob:"))
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

export async function populate(notes) {
  const db = await getDB();

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

export async function updateNote(note) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");

    const request = transaction.objectStore("notes").put(note);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function indexedDelete(id) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");

    const request = transaction.objectStore("notes").delete(id);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

export async function updateLocalSyncStatus(id, status) {
  const db = await getDB();

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
