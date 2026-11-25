"""Safe async HTTP fetcher with manual redirect SSRF checks, streaming size cap, and timeout."""

import time
from urllib.parse import urljoin
import httpx

from link_preview.config import (
    FETCH_TIMEOUT_SECONDS,
    MAX_BODY_BYTES,
    MAX_REDIRECTS,
    USER_AGENT,
)
from link_preview.url_validation import validate_and_normalize_url


class FetchTimeout(Exception):
    """Raised when the target site exceeds the total fetch timeout."""


class TooManyRedirects(Exception):
    """Raised when a URL exceeds MAX_REDIRECTS hops."""


class NotHTML(Exception):
    """Raised when the target responds with a non-HTML Content-Type (e.g. PDF, image, JSON)."""


class FetchFailed(Exception):
    """Raised on network errors or non-2xx HTTP status codes."""


def _is_html_content_type(content_type: str | None) -> bool:
    """Check if the Content-Type header indicates HTML or XHTML."""
    if not content_type:
        return False
    # Strip charset/boundary parameters (e.g. "text/html; charset=utf-8" -> "text/html").
    mime = content_type.split(";", 1)[0].strip().lower()
    return mime in ("text/html", "application/xhtml+xml")


def _extract_charset(content_type: str | None) -> str:
    """Extract charset parameter from Content-Type header, defaulting to utf-8."""
    if not content_type:
        return "utf-8"
    for part in content_type.split(";")[1:]:
        part = part.strip()
        if part.lower().startswith("charset="):
            charset = part.split("=", 1)[1].strip().strip('"\'')
            if charset:
                return charset
    return "utf-8"


async def fetch_html(
    initial_url: str,
    transport: httpx.AsyncBaseTransport | None = None,
) -> tuple[str, str]:
    """Fetch HTML safely from a pre-validated URL, enforcing redirect SSRF checks and a 1 MB cap.

    Note on DNS rebinding (TOCTOU): We validate DNS before connecting, and httpx resolves DNS
    again when opening the socket. Pinning the exact validated IP with custom TLS SNI in httpx
    adds significant complexity, so this implementation documents the small TOCTOU window.
    """
    current_url = initial_url
    deadline = time.monotonic() + FETCH_TIMEOUT_SECONDS
    headers = {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml;q=0.9,*/*;q=0.1",
    }

    # Problem solved: follow_redirects=False forces manual redirect handling so we can re-run
    # SSRF validation on every hop; otherwise a public URL could 302 to 169.254.169.254.
    async with httpx.AsyncClient(
        follow_redirects=False,
        transport=transport,
    ) as client:
        for hop in range(MAX_REDIRECTS + 1):
            remaining = deadline - time.monotonic()
            if remaining <= 0:
                raise FetchTimeout("Total fetch timeout exceeded.")

            try:
                async with client.stream(
                    "GET",
                    current_url,
                    headers=headers,
                    timeout=remaining,
                ) as response:
                    # Handle 3xx redirects manually and validate each Location target.
                    if 300 <= response.status_code < 400:
                        location = response.headers.get("location")
                        if not location:
                            raise FetchFailed("Redirect response missing Location header.")
                        if hop >= MAX_REDIRECTS:
                            raise TooManyRedirects(
                                f"Exceeded maximum of {MAX_REDIRECTS} redirects."
                            )
                        next_raw = urljoin(current_url, location)
                        # Re-validate every redirect hop against SSRF rules.
                        current_url, _ips = validate_and_normalize_url(next_raw)
                        continue

                    if response.status_code >= 400:
                        raise FetchFailed(f"Target returned HTTP {response.status_code}.")

                    content_type = response.headers.get("content-type")
                    if not _is_html_content_type(content_type):
                        raise NotHTML(f"Unsupported Content-Type: {content_type}")

                    # Stream body chunks and stop at MAX_BODY_BYTES to prevent memory exhaustion.
                    chunks: list[bytes] = []
                    total_bytes = 0
                    async for chunk in response.aiter_bytes():
                        if total_bytes + len(chunk) > MAX_BODY_BYTES:
                            needed = MAX_BODY_BYTES - total_bytes
                            if needed > 0:
                                chunks.append(chunk[:needed])
                            break
                        chunks.append(chunk)
                        total_bytes += len(chunk)

                    raw_bytes = b"".join(chunks)
                    charset = _extract_charset(content_type)
                    try:
                        html_text = raw_bytes.decode(charset, errors="replace")
                    except LookupError:
                        # Unknown charset name in header: safely fall back to utf-8.
                        html_text = raw_bytes.decode("utf-8", errors="replace")

                    return current_url, html_text

            except httpx.TimeoutException as exc:
                raise FetchTimeout("Request timed out while fetching target URL.") from exc
            except httpx.RequestError as exc:
                raise FetchFailed(f"Network error while fetching URL: {type(exc).__name__}") from exc

    raise TooManyRedirects(f"Exceeded maximum of {MAX_REDIRECTS} redirects.")
