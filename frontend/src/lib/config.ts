/**
 * Single, validated source of truth for the backend API URL.
 *
 * The build MUST fail if NEXT_PUBLIC_API_URL is unset in production. We do
 * not fall back to a localhost default at runtime — that only fails silently
 * in production. Instead we expose a helper that throws loudly, and a
 * next.config prebuild hook that blocks the build entirely.
 */
const raw = process.env.NEXT_PUBLIC_API_URL;

const isDev = process.env.NODE_ENV !== "production";

function resolveApiUrl(): string {
  let url = (raw && raw.trim().length > 0) ? raw.trim().replace(/\/$/, "") : (isDev ? "http://127.0.0.1:3001" : "");
  if (!url) {
    throw new Error(
      "NEXT_PUBLIC_API_URL is not set. Set it to the deployed backend URL " +
        "before building for production (e.g. https://modliq.onrender.com)."
    );
  }
  // Replace localhost with 127.0.0.1 for server-side Node fetch to avoid IPv6 (::1) ECONNREFUSED
  if (typeof window === "undefined") {
    url = url.replace("http://localhost:", "http://127.0.0.1:");
  }
  return url;
}

export const API_URL = resolveApiUrl();
