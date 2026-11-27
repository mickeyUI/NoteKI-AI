import { supabase } from "../supabaseClient"; // adjust path if needed
import {
  clearOfflineAuth,
  clearSupabaseLocalSession,
  hasPersistedSupabaseSession,
  isInvalidAuthError,
  isNetworkAuthError,
} from "./offlineAuth";

// In local dev, use local backend so new backend routes work immediately before deploying
const rawBaseUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_API_URL || "http://127.0.0.1:8000")
  : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");
const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

function createOfflineError(message = "You are currently offline.") {
  const err = new Error(message);
  err.isOfflineError = true;
  return err;
}

function createPendingAuthError(
  message = "Session refresh is pending reconnection.",
) {
  const err = new Error(message);
  err.isAuthRefreshPending = true;
  return err;
}

async function signOutLocallyAndNotify() {
  clearOfflineAuth();
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch (err) {
    console.warn("Local signOut warning:", err);
  }
  clearSupabaseLocalSession();
  window.dispatchEvent(new Event("auth-failed"));
}

async function resolveAccessToken() {
  if (!navigator.onLine) {
    throw createOfflineError();
  }

  const {
    data: { session },
    error,
  } = await supabase.auth.getSession();

  if (session?.access_token) {
    return session.access_token;
  }

  if (!navigator.onLine) {
    throw createOfflineError();
  }

  if (isNetworkAuthError(error)) {
    throw createPendingAuthError();
  }

  if (isInvalidAuthError(error)) {
    await signOutLocallyAndNotify();
    throw new Error("Session expired. Please sign in again.");
  }

  // Try an explicit refresh if a persisted session still exists (e.g. transient miss)
  if (hasPersistedSupabaseSession()) {
    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshData?.session?.access_token) {
      return refreshData.session.access_token;
    }

    if (!navigator.onLine || isNetworkAuthError(refreshError)) {
      throw createPendingAuthError();
    }

    if (isInvalidAuthError(refreshError) || !hasPersistedSupabaseSession()) {
      await signOutLocallyAndNotify();
      throw new Error("Session expired. Please sign in again.");
    }

    throw createPendingAuthError();
  }

  await signOutLocallyAndNotify();
  throw new Error("Authentication required");
}

/**
 * Perform an authenticated fetch request, refreshing an expired JWT once on 401
 * without clearing the user's offline session on network/transient failures.
 */
export async function authorizedFetch(endpoint, options = {}) {
  const accessToken = await resolveAccessToken();

  const buildConfig = (token) => {
    const headers = {
      ...options.headers,
      Authorization: `Bearer ${token}`,
    };
    if (!(options.body instanceof FormData)) {
      headers["Content-Type"] = headers["Content-Type"] || "application/json";
    }
    return {
      ...options,
      headers,
    };
  };

  let response;
  try {
    response = await fetch(`${BASE_URL}${endpoint}`, buildConfig(accessToken));
  } catch (err) {
    if (!navigator.onLine || isNetworkAuthError(err)) {
      throw createOfflineError();
    }
    throw err;
  }

  if (response.status === 401) {
    if (!navigator.onLine) {
      throw createOfflineError();
    }

    const { data: refreshData, error: refreshError } =
      await supabase.auth.refreshSession();

    if (refreshData?.session?.access_token) {
      try {
        response = await fetch(
          `${BASE_URL}${endpoint}`,
          buildConfig(refreshData.session.access_token),
        );
      } catch (retryErr) {
        if (!navigator.onLine || isNetworkAuthError(retryErr)) {
          throw createOfflineError();
        }
        throw retryErr;
      }

      if (response.status === 401 && navigator.onLine) {
        await signOutLocallyAndNotify();
      }
      return response;
    }

    if (!navigator.onLine || isNetworkAuthError(refreshError)) {
      throw createPendingAuthError();
    }

    if (isInvalidAuthError(refreshError) || !hasPersistedSupabaseSession()) {
      await signOutLocallyAndNotify();
    }
  }

  return response;
}

export async function apiRequest(endpoint, options = {}) {
  const response = await authorizedFetch(endpoint, options);

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));

    throw new Error(
      errorData.message ||
        errorData.detail ||
        `Request failed with status ${response.status}`,
    );
  }

  return response.json();
}

export const api = {
  baseUrl: BASE_URL,

  getNotes: () =>
    apiRequest("/GetNotes", {
      method: "GET",
    }),

  addNote: (note) =>
    apiRequest("/AddNote", {
      method: "POST",
      body: JSON.stringify({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url || "",
        note_type: note.note_type || "text",
        group: note.group,
      }),
    }),

  transcribeAudio: (formData) =>
    apiRequest("/TranscribeAudio", {
      method: "POST",
      body: formData,
    }),

  uploadImg: (note) =>
    apiRequest("/UploadImg", {
      method: "POST",
      body: JSON.stringify({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url || "",
        group: note.group,
      }),
    }),

  deleteNote: (noteid) =>
    apiRequest("/DelNote", {
      method: "DELETE",
      body: JSON.stringify({ id: noteid }),
    }),

  editNote: (note) =>
    apiRequest("/UpdateNote", {
      method: "PUT",
      body: JSON.stringify({
        id: note.id,
        title: note.title,
        content: note.content,
        tags: note.tags ?? "",
        source_url: note.source_url ?? note.sourceUrl ?? "",
        ...(note.group !== undefined ? { group: note.group } : {}),
      }),
    }),

  getChats: () =>
    apiRequest("/Chats", {
      method: "GET",
    }),

  getMessages: (convoID) =>
    apiRequest("/Messages", {
      method: "POST",
      body: JSON.stringify({ id: convoID }),
    }),

  addChat: (title) =>
    apiRequest("/AddChat", {
      method: "POST",
      body: JSON.stringify({
        title,
        name: title,
      }),
    }),

  deleteChat: (chatid) =>
    apiRequest("/DelChat", {
      method: "DELETE",
      body: JSON.stringify({ id: chatid }),
    }),

  addMessage: (chatId, question, role) =>
    apiRequest("/AddMessage", {
      method: "POST",
      body: JSON.stringify({
        conversation_id: chatId,
        content: question,
        role,
      }),
    }),

  groupNotes: () =>
    apiRequest("/Group", {
      method: "PUT",
    }),

  ungroupNotes: (folder) =>
    apiRequest("/UnGroup", {
      method: "PUT",
      body: JSON.stringify({
        group: folder,
      }),
    }),

  customGroup: (notes, collectionName) =>
    apiRequest("/CustomGroup", {
      method: "PUT",
      body: JSON.stringify({
        notes: notes,
        groupName: collectionName,
      }),
    }),

  pgSearch: (Question) =>
    apiRequest("/search", {
      method: "POST",
      body: JSON.stringify({
        question: Question,
      }),
    }),

  submitFeedback: (message) =>
    apiRequest("/Feedback", {
      method: "POST",
      body: JSON.stringify({
        message,
      }),
    }),
};
