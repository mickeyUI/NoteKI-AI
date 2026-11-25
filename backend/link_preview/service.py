"""Service layer orchestrating URL validation, caching, in-flight coalescing, fetch, and parse."""

import asyncio
import logging
from urllib.parse import urlsplit

from link_preview.cache import (
    get_cached_preview,
    set_failure_preview,
    set_success_preview,
)
from link_preview.fetcher import (
    FetchFailed,
    FetchTimeout,
    NotHTML,
    TooManyRedirects,
    fetch_html,
)
from link_preview.parser import parse_html_metadata
from link_preview.url_validation import validate_and_normalize_url

logger = logging.getLogger("link_preview")

# Problem solved: collapses concurrent identical requests (e.g. two users opening the same link
# at once) into a single outbound HTTP fetch instead of duplicating work.
_in_flight: dict[str, asyncio.Future] = {}


def _build_fallback(normalized_url: str) -> dict:
    """Construct a minimal safe fallback payload containing only the URL and domain."""
    domain = (urlsplit(normalized_url).hostname or "").lower()
    return {
        "url": normalized_url,
        "title": None,
        "description": None,
        "image": None,
        "site_name": None,
        "favicon": None,
        "domain": domain,
        "fallback": True,
    }


async def _fetch_and_parse(normalized_url: str, host_only: str) -> dict:
    """Execute the outbound fetch and HTML parse, caching either the result or a safe fallback."""
    try:
        final_url, html_text = await fetch_html(normalized_url)
        metadata = parse_html_metadata(html_text, final_url)
        set_success_preview(normalized_url, metadata)
        logger.info("link_preview=fetched host=%s fallback=false", host_only)
        return metadata
    except (FetchTimeout, TooManyRedirects, NotHTML, FetchFailed) as exc:
        fallback_data = _build_fallback(normalized_url)
        set_failure_preview(normalized_url, fallback_data)
        logger.info("link_preview=fallback host=%s reason=%s", host_only, type(exc).__name__)
        return fallback_data


async def get_link_preview(raw_url: str) -> dict:
    """Validate a URL, check caches, coalesce concurrent fetches, and return preview metadata."""
    normalized_url, _validated_ips = validate_and_normalize_url(raw_url)
    # Log only the hostname—never full URLs with query strings—to avoid leaking tokens/secrets.
    host_only = (urlsplit(normalized_url).hostname or "").lower()

    cached, source = get_cached_preview(normalized_url)
    if cached is not None:
        logger.info("link_preview=cache_hit source=%s host=%s", source, host_only)
        return cached

    existing_future = _in_flight.get(normalized_url)
    if existing_future is not None:
        logger.info("link_preview=coalesced host=%s", host_only)
        return await asyncio.shield(existing_future)

    loop = asyncio.get_running_loop()
    future: asyncio.Future = loop.create_future()
    _in_flight[normalized_url] = future

    try:
        result = await _fetch_and_parse(normalized_url, host_only)
        if not future.done():
            future.set_result(result)
        return result
    except BaseException as exc:
        if not future.done():
            future.set_exception(exc)
        raise
    finally:
        _in_flight.pop(normalized_url, None)
