/**
 * API Configuration
 * 
 * In development: frontend runs on :5173, backend on :8000 → use full URL
 * In production (Render): both served from same origin → use relative URLs
 */

const isDev = window.location.port === '5173' || window.location.hostname === 'localhost' && window.location.port !== '';

// If we're on the Vite dev server, proxy to backend. Otherwise, use same origin.
export const API_BASE = isDev ? 'http://localhost:8000' : '';

export const WS_BASE = isDev
    ? 'ws://localhost:8000'
    : `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}`;

export const apiUrl = (path: string) => `${API_BASE}${path}`;
export const wsUrl = (path: string) => `${WS_BASE}${path}`;
