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

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function populate(notes) {
  const db = await getDB();

  return new Promise((resolve, reject) => {
    const transaction = db.transaction("notes", "readwrite");

    const store = transaction.objectStore("notes");
    for (const note of notes) {
      store.put({ ...note, syncStatus: "synced", isDeleted: false });
    }
    transaction.oncomplete = () => resolve();
    transaction.onsuccess = () => resolve(transaction.result);
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
