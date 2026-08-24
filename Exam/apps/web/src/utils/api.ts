export function getAuthHeaders(token?: string | null): HeadersInit {
  const effectiveToken = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (effectiveToken) {
    headers['Authorization'] = `Bearer ${effectiveToken}`;
  }
  return headers;
}
