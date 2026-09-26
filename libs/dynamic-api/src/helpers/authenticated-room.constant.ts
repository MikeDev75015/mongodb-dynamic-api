/**
 * Socket.IO room every authenticated socket joins on connection (`SocketAdapter`) and after an
 * `auth-login` event. When `useAuth` is enabled, a broadcast without `rooms` and without
 * `public: true` is sent to this room only. Join it yourself if you use your own adapter.
 */
export const DYNAMIC_API_AUTHENTICATED_ROOM = 'dynamic-api:authenticated';
