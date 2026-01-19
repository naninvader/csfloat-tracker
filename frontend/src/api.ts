const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

export const apiFetch = async (path: string, options: RequestInit = {}, token?: string | null) => {
  const headers = new Headers(options.headers || {});
  headers.set('Content-Type', 'application/json');
  if (token) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    headers
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed.' }));
    throw new Error(error.error || 'Request failed.');
  }

  return response.json();
};
