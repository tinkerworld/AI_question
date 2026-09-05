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

  // In a browser environment, route through relative path '/api/v1'
  // to leverage Vite's dev server reverse proxy (or production reverse proxy).
  // This guarantees zero CORS issues, immunity to external firewall (UFW) port restrictions on port 4043,
  // and seamless access whether browsing via localhost, LAN IP (192.168.x.x, 10.x.x.x), or domain.
  if (typeof window !== 'undefined' && window.location) {
    const { hostname } = window.location;
    const isClientOnLocalhost = hostname === 'localhost' || hostname === '127.0.0.1';

    // 1. If explicit external URL is provided in env
    if (envUrl) {
      if (!isClientOnLocalhost && /https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?/i.test(envUrl)) {
        return '/api/v1';
      }
      return envUrl;
    }

    // 2. Default: route through current origin's proxy
    return '/api/v1';
  }

  // 3. Non-browser / SSR / backend test scripts fallback
  return envUrl || 'http://localhost:4043/api/v1';
};

export const API_BASE = getApiBase();


