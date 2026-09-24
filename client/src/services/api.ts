const API_BASE = '/api';
export async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem('token');
  const customUserId = localStorage.getItem('demo_user_id');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (customUserId) headers['x-user-id'] = customUserId;

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers,
  });

  const text = await response.text();
  let data: { error?: string; [key: string]: unknown } = {};

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      throw new Error('Server ne valid response nahi bheja. Server restart karke phir try karo.');
    }
  }

  if (!response.ok) {
    throw new Error(data.error || `Login failed (status ${response.status})`);
  }

  if (!text) {
    throw new Error('Server ne empty response bheja.');
  }

  return data as T;
}
