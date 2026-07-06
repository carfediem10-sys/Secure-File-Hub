// API base URL — 로컬(Replit) 확장자와 배포 환경 모두 지원
export const API_BASE = import.meta.env.VITE_API_URL || "";

export function api(path: string): string {
  // Remove leading slash duplication
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  return `${API_BASE}${cleanPath}`;
}
