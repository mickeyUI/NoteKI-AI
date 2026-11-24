import { supabase } from "../supabaseClient";

const OFFLINE_AUTH_KEY = "lore_offline_auth";

/**
 * Return the localStorage key used by the Supabase auth client.
 */
export function getSupabaseStorageKey() {
  return supabase?.auth?.storageKey || null;
}

/**
 * Read and parse a JSON object from localStorage safely.
 */
function readStorageJson(key) {
  if (!key || typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * Check whether Supabase still has a persisted session object in localStorage.
 */
export function hasPersistedSupabaseSession() {
  const stored = readStorageJson(getSupabaseStorageKey());
  return Boolean(
    stored &&
      typeof stored === "object" &&
      stored.access_token &&
      stored.refresh_token,
  );
}

/**
 * Persist the authenticated user's identity for offline session recovery.
 */
export function saveOfflineAuth(user) {
  if (!user?.id || typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      OFFLINE_AUTH_KEY,
      JSON.stringify({ user, savedAt: Date.now() }),
    );
  } catch (err) {
    console.warn("Failed to persist offline auth user:", err);
  }
}

/**
 * Retrieve the cached user for offline sessions, migrating from Supabase's
 * persisted session if needed.
 */
export function getOfflineAuth() {
  const cached = readStorageJson(OFFLINE_AUTH_KEY);
  if (cached?.user?.id) {
    return cached.user;
  }

  // Fallback for users already signed in before offline auth caching existed
  const sbSession = readStorageJson(getSupabaseStorageKey());
  if (sbSession?.user?.id && sbSession?.refresh_token) {
    saveOfflineAuth(sbSession.user);
    return sbSession.user;
  }

  return null;
}

/**
 * Clear the locally cached offline auth identity.
 */
export function clearOfflineAuth() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(OFFLINE_AUTH_KEY);
  } catch (err) {
    console.warn("Failed to clear offline auth:", err);
  }
}

/**
 * Remove Supabase's persisted local session keys directly (used when logging out offline).
 */
export function clearSupabaseLocalSession() {
  if (typeof window === "undefined") return;
  const storageKey = getSupabaseStorageKey();
  if (!storageKey) return;
  try {
    window.localStorage.removeItem(storageKey);
    window.localStorage.removeItem(`${storageKey}-user`);
  } catch (err) {
    console.warn("Failed to clear Supabase local session:", err);
  }
}

/**
 * Build a minimal session object for offline usage while tokens wait to refresh online.
 */
export function buildOfflineSession(user) {
  if (!user?.id) return null;
  return {
    user,
    access_token: null,
    isOfflineSession: true,
  };
}

/**
 * Detect transient network or retryable fetch errors from Supabase auth.
 */
export function isNetworkAuthError(error) {
  if (!error) return false;
  if (error.name === "AuthRetryableFetchError" || error.status === 0) {
    return true;
  }
  if (error.__isAuthError && typeof error.status === "number" && error.status >= 500) {
    return true;
  }
  if (error instanceof TypeError) {
    return true;
  }
  return (
    typeof error.message === "string" &&
    /failed to fetch|network|offline|load failed/i.test(error.message)
  );
}

/**
 * Detect definitive client/token rejections where the session can no longer be refreshed.
 */
export function isInvalidAuthError(error) {
  if (!error || isNetworkAuthError(error)) return false;
  if (error.name === "AuthSessionMissingError") return true;
  return (
    error.__isAuthError === true &&
    typeof error.status === "number" &&
    error.status >= 400 &&
    error.status < 500
  );
}
