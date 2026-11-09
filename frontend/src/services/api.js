import { supabase } from "../supabaseClient"; // adjust path if needed

// In local dev, use local backend so new backend routes work immediately before deploying
const rawBaseUrl = import.meta.env.DEV
  ? (import.meta.env.VITE_DEV_API_URL || "http://127.0.0.1:8000")
  : (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000");
const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

export async function apiRequest(endpoint, options = {}) {
  // Get the current Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    ...options.headers,
  };

  // Only set application/json if body is not FormData
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  // Send Supabase's access token to FastAPI
  if (session?.access_token) {
    headers["Authorization"] = `Bearer ${session.access_token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    await supabase.auth.signOut();
    window.dispatchEvent(new Event("auth-failed"));
  }

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
        // group: note.group,
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
};
