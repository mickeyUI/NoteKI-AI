import { supabase } from "../supabaseClient"; // adjust path if needed

const BASE_URL = import.meta.env.VITE_API_URL || "";

export async function apiRequest(endpoint, options = {}) {
  // Get the current Supabase session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

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
      }),
    }),

  uploadImg: (note) =>
    apiRequest("/UploadImg", {
      method: "POST",
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url || "",
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
        tags: note.tags,
        source_url: note.sourceUrl || "",
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

  pgSearch: (Question) =>
    apiRequest("/search", {
      method: "POST",
      body: JSON.stringify({
        question: Question,
      }),
    }),
};
