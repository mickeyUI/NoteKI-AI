"""In-memory TTL caches for successful link previews and short-lived failure fallbacks."""

from cachetools import TTLCache

from link_preview.config import (
    FAILURE_CACHE_MAX_ITEMS,
    FAILURE_CACHE_TTL_SECONDS,
    SUCCESS_CACHE_MAX_ITEMS,
    SUCCESS_CACHE_TTL_SECONDS,
)

# Cache full previews for 24h so repeated views of the same note don't re-fetch external sites.
_success_cache: TTLCache[str, dict] = TTLCache(
    maxsize=SUCCESS_CACHE_MAX_ITEMS,
    ttl=SUCCESS_CACHE_TTL_SECONDS,
)

# Cache failures briefly (5 min) so broken or slow URLs don't get hammered repeatedly.
_failure_cache: TTLCache[str, dict] = TTLCache(
    maxsize=FAILURE_CACHE_MAX_ITEMS,
    ttl=FAILURE_CACHE_TTL_SECONDS,
)


def get_cached_preview(normalized_url: str) -> tuple[dict | None, str | None]:
    """Look up a normalized URL in success then failure caches; returns (data, source)."""
    if normalized_url in _success_cache:
        return _success_cache[normalized_url], "success_cache"
    if normalized_url in _failure_cache:
        return _failure_cache[normalized_url], "failure_cache"
    return None, None


def set_success_preview(normalized_url: str, data: dict) -> None:
    """Store a successful preview dictionary in the success TTL cache."""
    _success_cache[normalized_url] = data


def set_failure_preview(normalized_url: str, data: dict) -> None:
    """Store a fallback preview dictionary in the failure TTL cache."""
    _failure_cache[normalized_url] = data


def clear_caches() -> None:
    """Clear both caches (primarily used by automated tests)."""
    _success_cache.clear()
    _failure_cache.clear()
