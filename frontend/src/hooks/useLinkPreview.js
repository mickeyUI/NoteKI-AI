import { useQuery } from "@tanstack/react-query";
import { fetchLinkPreview } from "../api/linkPreview";

/**
 * Validate that a string is a well-formed http or https URL before querying the backend.
 */
export function isValidHttpUrl(value) {
  if (!value || typeof value !== "string") return false;
  try {
    const parsed = new URL(value.trim());
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * TanStack Query hook to fetch and cache link preview metadata for 24 hours.
 */
export function useLinkPreview(url) {
  const trimmed = typeof url === "string" ? url.trim() : "";
  const enabled = isValidHttpUrl(trimmed);

  return useQuery({
    queryKey: ["link-preview", trimmed],
    queryFn: () => fetchLinkPreview(trimmed),
    enabled,
    staleTime: 24 * 60 * 60 * 1000, // 24 hours, matching backend success cache TTL
    retry: 1,
  });
}
