export function getSocketUrl(): string {
  if (process.env.NEXT_PUBLIC_SOCKET_URL) {
    return process.env.NEXT_PUBLIC_SOCKET_URL;
  }
  if (typeof window === "undefined") {
    return "http://127.0.0.1:43128";
  }
  const { protocol, hostname } = window.location;
  return `${protocol}//${hostname}:43128`;
}
