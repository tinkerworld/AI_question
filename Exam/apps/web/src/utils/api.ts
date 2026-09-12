export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('token') || localStorage.getItem('token');
}

export function getAuthHeaders(token?: string | null): HeadersInit {
  const effectiveToken = token || getAuthToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }
  return headers;
}
