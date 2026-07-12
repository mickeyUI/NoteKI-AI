const BASE_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem("token");

  const headers = {
    "Content-Type": "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem("token");
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

  register: (email, password) =>
    apiRequest("/Register", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  login: (email, password) =>
    apiRequest("/Login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

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
        title: title,
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
        role: role,
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
};
