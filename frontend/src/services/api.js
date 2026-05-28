const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

export async function apiRequest(endpoint, options = {}) {
  const token = localStorage.getItem('token');
  
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const config = {
    ...options,
    headers,
  };

  const response = await fetch(`${BASE_URL}${endpoint}`, config);

  if (response.status === 401) {
    localStorage.removeItem('token');
    window.dispatchEvent(new Event('auth-failed'));
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || errorData.detail || `Request failed with status ${response.status}`);
  }

  return response.json();
}

export const api = {
  baseUrl: BASE_URL,
  
  register: (email, password) => 
    apiRequest('/Register', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  login: (email, password) => 
    apiRequest('/Login', {
      method: 'POST',
      body: JSON.stringify({ email, password })
    }),

  getNotes: () => 
    apiRequest('/GetNotes', {
      method: 'GET'
    }),

  addNote: (note) => 
    apiRequest('/AddNote', {
      method: 'POST',
      body: JSON.stringify({
        title: note.title,
        content: note.content,
        tags: note.tags,
        source_url: note.source_url || ""
      })
    }),

  getChats: () => 
    apiRequest('/Chats', {
      method: 'GET'
    }),

  addChat: (title) => 
    apiRequest('/AddChat', {
      method: 'POST',
      body: JSON.stringify({ 
        title: title,
        name: title 
      })
    }),

  addMessage: (chatId, question, responseText) => 
    apiRequest('/AddMessage', {
      method: 'POST',
      body: JSON.stringify({ 
        chat_id: chatId, 
        question: question, 
        query: question,
        response: responseText,
        answer: responseText
      })
    })
};
