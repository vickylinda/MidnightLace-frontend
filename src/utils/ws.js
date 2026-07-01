import { API_BASE_URL } from './config';
import { getAccessToken } from './session';

export function connectUserSocket(onEvent, options = {}) {
  let ws = null;
  let closed = false;
  let delay = 1000;

  function connect() {
    if (closed) return;
    const base = API_BASE_URL.replace(/^https?/, (m) => (m === 'https' ? 'wss' : 'ws'));
    const token = getAccessToken() ?? '';
    ws = new WebSocket(`${base}/v1/ws/usuario?token=${encodeURIComponent(token)}`);

    ws.onopen = () => {
      delay = 1000;
      options.onOpen?.();
    };

    ws.onmessage = (e) => {
      try { onEvent(JSON.parse(e.data)); } catch {}
    };

    ws.onclose = (e) => {
      options.onClose?.(e);
      // 4001 = invalid/expired token, no retry
      if (closed || e.code === 4001) return;
      const d = delay;
      delay = Math.min(delay * 2, 30000);
      setTimeout(connect, d);
    };

    ws.onerror = (e) => {
      options.onError?.(e);
    };
  }

  connect();

  return {
    close() {
      closed = true;
      if (ws) ws.close();
    },
  };
}
