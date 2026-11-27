"""Configuration for the link preview service, loaded from environment variables with sane defaults."""

import os


def _get_int(name: str, default: int) -> int:
    """Read an integer environment variable, falling back to default if unset or invalid."""
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return int(raw)
    except ValueError:
        return default


def _get_float(name: str, default: float) -> float:
    """Read a float environment variable, falling back to default if unset or invalid."""
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    try:
        return float(raw)
    except ValueError:
        return default


def _get_origins(name: str, default: str) -> list[str]:
    """Parse a comma-separated list of allowed CORS origins from an environment variable."""
    raw = os.getenv(name, default)
    return [origin.strip() for origin in raw.split(",") if origin.strip()]


# Maximum allowed URL length; prevents memory abuse and oversized cache keys.
MAX_URL_LENGTH: int = _get_int("MAX_URL_LENGTH", 2048)

# Total HTTP request timeout (seconds) so slow/tarpit targets cannot tie up worker slots.
FETCH_TIMEOUT_SECONDS: float = _get_float("FETCH_TIMEOUT_SECONDS", 5.0)

# Maximum manual redirect hops; each hop is re-validated against SSRF rules.
MAX_REDIRECTS: int = _get_int("MAX_REDIRECTS", 3)

# Cap downloaded HTML body at ~1 MB; Open Graph and meta tags live in <head> near the top.
MAX_BODY_BYTES: int = _get_int("MAX_BODY_BYTES", 1_000_000)

# Cache successful previews for 24 hours (in-memory) to avoid re-fetching popular links.
SUCCESS_CACHE_TTL_SECONDS: int = _get_int("SUCCESS_CACHE_TTL_SECONDS", 86400)
SUCCESS_CACHE_MAX_ITEMS: int = _get_int("SUCCESS_CACHE_MAX_ITEMS", 1000)

# Cache failed previews briefly (5 min) so broken/slow URLs don't get hammered repeatedly.
FAILURE_CACHE_TTL_SECONDS: int = _get_int("FAILURE_CACHE_TTL_SECONDS", 300)
FAILURE_CACHE_MAX_ITEMS: int = _get_int("FAILURE_CACHE_MAX_ITEMS", 1000)

# Per-IP rate limit string understood by slowapi.
RATE_LIMIT: str = os.getenv("RATE_LIMIT", "30/minute")

# Comma-separated frontend origins allowed by CORS.
ALLOWED_ORIGINS: list[str] = _get_origins(
    "ALLOWED_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,https://note-ki-ai.vercel.app",
)

# Honest, descriptive User-Agent so target site operators know what is fetching their page.
USER_AGENT: str = os.getenv(
    "LINK_PREVIEW_USER_AGENT",
    "LinkPreviewBot/1.0 (+https://github.com/second-brain-project)",
)
