"""HTML metadata parser for extracting Open Graph, Twitter Card, and standard HTML tags."""

import re
from urllib.parse import urljoin, urlsplit
from bs4 import BeautifulSoup

TITLE_MAX_LEN = 200
DESCRIPTION_MAX_LEN = 300


def _clean_text(value: str | None, max_len: int | None = None) -> str | None:
    """Trim whitespace, collapse internal newlines/spaces, and optionally truncate."""
    if not value:
        return None
    collapsed = re.sub(r"\s+", " ", value).strip()
    if not collapsed:
        return None
    if max_len is not None and len(collapsed) > max_len:
        return collapsed[: max_len - 1].rstrip() + "…"
    return collapsed


def _safe_http_url(raw_url: str | None, base_url: str) -> str | None:
    """Resolve a potentially relative URL against base_url and allow only http/https schemes."""
    if not raw_url:
        return None
    cleaned = raw_url.strip()
    if not cleaned:
        return None
    resolved = urljoin(base_url, cleaned)
    try:
        scheme = urlsplit(resolved).scheme.lower()
    except ValueError:
        return None
    # Problem solved: reject javascript: or data: URLs in og:image/favicon to prevent XSS/abuse.
    if scheme not in ("http", "https"):
        return None
    return resolved


def _build_meta_lookup(soup: BeautifulSoup) -> dict[str, str]:
    """Collect meta tag values keyed by lowercased property or name attribute (first wins)."""
    meta_map: dict[str, str] = {}
    for tag in soup.find_all("meta"):
        content = tag.get("content")
        if not content or not isinstance(content, str):
            continue
        # Handle both property= (Open Graph) and name= (Twitter/standard) case-insensitively.
        for attr in ("property", "name"):
            key = tag.get(attr)
            if isinstance(key, str):
                norm_key = key.strip().lower()
                if norm_key and norm_key not in meta_map and content.strip():
                    meta_map[norm_key] = content
    return meta_map


def _extract_favicon(soup: BeautifulSoup, final_url: str) -> str | None:
    """Find the best favicon <link> tag, falling back to /favicon.ico on the site origin."""
    preferred_rels = ("icon", "shortcut icon", "apple-touch-icon")
    rel_candidates: dict[str, str] = {}

    for link in soup.find_all("link"):
        rel_attr = link.get("rel")
        href = link.get("href")
        if not rel_attr or not isinstance(href, str):
            continue
        # BeautifulSoup returns link[rel] as a list of tokens (e.g. ["shortcut", "icon"]).
        rel_str = " ".join(rel_attr).lower() if isinstance(rel_attr, list) else str(rel_attr).lower()
        for target_rel in preferred_rels:
            if rel_str == target_rel and target_rel not in rel_candidates:
                safe_href = _safe_http_url(href, final_url)
                if safe_href:
                    rel_candidates[target_rel] = safe_href

    for target_rel in preferred_rels:
        if target_rel in rel_candidates:
            return rel_candidates[target_rel]

    parsed = urlsplit(final_url)
    origin = f"{parsed.scheme}://{parsed.netloc}"
    return urljoin(origin, "/favicon.ico")


def parse_html_metadata(html_text: str, final_url: str) -> dict:
    """Extract normalized link preview metadata from HTML without raising on malformed markup."""
    parsed_url = urlsplit(final_url)
    domain = (parsed_url.hostname or "").lower()

    if not html_text or not html_text.strip():
        return {
            "url": final_url,
            "title": None,
            "description": None,
            "image": None,
            "site_name": domain or None,
            "favicon": _safe_http_url("/favicon.ico", final_url),
            "domain": domain,
            "fallback": False,
        }

    try:
        soup = BeautifulSoup(html_text, "html.parser")
    except Exception:
        # Never raise on severely malformed HTML; return safe domain-level metadata.
        return {
            "url": final_url,
            "title": None,
            "description": None,
            "image": None,
            "site_name": domain or None,
            "favicon": _safe_http_url("/favicon.ico", final_url),
            "domain": domain,
            "fallback": False,
        }

    meta = _build_meta_lookup(soup)
    html_title = soup.title.get_text() if soup.title else None

    title = (
        _clean_text(meta.get("og:title"), TITLE_MAX_LEN)
        or _clean_text(meta.get("twitter:title"), TITLE_MAX_LEN)
        or _clean_text(html_title, TITLE_MAX_LEN)
    )
    description = (
        _clean_text(meta.get("og:description"), DESCRIPTION_MAX_LEN)
        or _clean_text(meta.get("twitter:description"), DESCRIPTION_MAX_LEN)
        or _clean_text(meta.get("description"), DESCRIPTION_MAX_LEN)
    )
    image = (
        _safe_http_url(meta.get("og:image"), final_url)
        or _safe_http_url(meta.get("og:image:secure_url"), final_url)
        or _safe_http_url(meta.get("twitter:image"), final_url)
        or _safe_http_url(meta.get("twitter:image:src"), final_url)
    )
    site_name = _clean_text(meta.get("og:site_name")) or domain or None
    favicon = _extract_favicon(soup, final_url)

    return {
        "url": final_url,
        "title": title,
        "description": description,
        "image": image,
        "site_name": site_name,
        "favicon": favicon,
        "domain": domain,
        "fallback": False,
    }
