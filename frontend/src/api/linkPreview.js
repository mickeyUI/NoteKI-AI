/**
 * Client for fetching link preview metadata from the FastAPI /preview endpoint.
 */

const rawBaseUrl = import.meta.env.DEV
  ? import.meta.env.VITE_DEV_API_URL || "http://127.0.0.1:8000"
  : import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

const BASE_URL = rawBaseUrl.replace(/\/+$/, "");

/**
 * Fetch link preview JSON for a given http(s) URL.
 * Throws an Error on non-OK HTTP responses so TanStack Query can handle retries/fallback.
 */
export async function fetchLinkPreview(url) {
  const endpoint = `${BASE_URL}/preview?url=${encodeURIComponent(url)}`;
  const res = await fetch(endpoint, { method: "GET" });

  if (!res.ok) {
    throw new Error(`Link preview request failed with status ${res.status}`);
  }

  return res.json();
}
