/// <reference types="vite/client" />

/**
 * Resolves the backend API Base URL dynamically.
 * Enables seamless access across any network topology:
 * - Localhost / 127.0.0.1 (development on the same host)
 * - Local Area Network (LAN / Wi-Fi, e.g. http://192.168.x.x:3000 or http://10.x.x.x:3000)
 * - Custom domain names / local mDNS (.local)
 * - IPv6 local networks (e.g. http://[::1]:3000)
 * - Production reverse proxies (NGINX / Cloudflare)
 */
export const getApiBase = (): string => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;

  // In a browser environment, resolve host dynamically from the active network connection
  if (typeof window !== 'undefined' && window.location) {
    const { protocol, hostname, port } = window.location;
    const formattedHost =
      hostname.includes(':') && !hostname.startsWith('[')
        ? `[${hostname}]`
        : hostname;

    const isClientOnLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. If explicit URL is provided in env
    if (envUrl) {
      // If the client is accessing over LAN/remote IP, but the env was hardcoded to localhost/127.0.0.1,
      // dynamically swap the host to match the client's network connection to prevent ERR_CONNECTION_REFUSED.
      if (!isClientOnLocalhost && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl)) {
        return envUrl.replace(/localhost|127\.0\.0\.1/i, formattedHost);
      }
      return envUrl;
    }

    const apiPort = import.meta.env.VITE_API_PORT || '4043';

    // 2. If served via standard HTTP/HTTPS ports (80/443) or reverse proxy without port
    if (!port || port === '80' || port === '443') {
      return `${protocol}//${formattedHost}/api/v1`;
    }

    // 3. Dynamic LAN/WAN/Localhost: connect to backend API server on current host machine
    return `${protocol}//${formattedHost}:${apiPort}/api/v1`;
  }

  // 4. Non-browser / SSR / fallback
  return envUrl || 'http://localhost:4043/api/v1';
};

export const API_BASE = getApiBase();


