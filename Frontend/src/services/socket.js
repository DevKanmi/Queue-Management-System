/**
 * Single Socket.IO client connection to the queue server.
 * Server runs on same host as API; socket path is root.
 */
let socket = null;

function getSocketBaseUrl() {
  const apiUrl = import.meta.env.VITE_API_URL || '';
  if (apiUrl) {
    try {
      const u = new URL(apiUrl);
      return `${u.protocol}//${u.host}`;
    } catch (_) {
      return window.location.origin;
    }
  }
  return window.location.origin;
}

/**
 * Returns a promise that resolves to the socket client (or null if socket.io-client not installed).
 * Reuses a single connection.
 */
export function getSocket() {
  if (socket) return Promise.resolve(socket);
  if (typeof window === 'undefined') return Promise.resolve(null);
  return import('socket.io-client')
    .then((mod) => {
      socket = mod.io(getSocketBaseUrl(), { path: '/', transports: ['websocket', 'polling'] });
      return socket;
    })
    .catch(() => null);
}
