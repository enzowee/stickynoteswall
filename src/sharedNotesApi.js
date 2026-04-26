const API_BASE = import.meta.env.VITE_API_BASE_URL || '';

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });

  if (!response.ok) {
    throw new Error(`API error: ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export async function fetchNotes() {
  const data = await request('/api/notes');
  return data.notes || [];
}

export async function createNote(payload) {
  const data = await request('/api/notes', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
  return data.note;
}

export async function patchNote(id, updates) {
  const data = await request(`/api/notes/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(updates),
  });
  return data.note;
}

export async function removeNote(id) {
  await request(`/api/notes/${id}`, {
    method: 'DELETE',
  });
}
