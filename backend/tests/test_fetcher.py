"""Unit tests for the safe HTTP fetcher using httpx.MockTransport (no real network)."""

import httpx
import pytest

from link_preview.config import MAX_BODY_BYTES
from link_preview.fetcher import (
    FetchFailed,
    FetchTimeout,
    NotHTML,
    TooManyRedirects,
    fetch_html,
)
from link_preview.url_validation import BlockedAddress


@pytest.mark.anyio
async def test_redirect_to_internal_ip_is_blocked():
    """A public URL that 302-redirects to 127.0.0.1 or 169.254.169.254 must raise BlockedAddress."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            302,
            headers={"Location": "http://169.254.169.254/latest/meta-data/"},
        )

    transport = httpx.MockTransport(handler)
    with pytest.raises(BlockedAddress):
        await fetch_html("https://example.com/start", transport=transport)


@pytest.mark.anyio
async def test_redirect_loop_stops_at_max_redirects(monkeypatch):
    """A redirect loop must stop after MAX_REDIRECTS and raise TooManyRedirects."""
    monkeypatch.setattr(
        "link_preview.fetcher.validate_and_normalize_url",
        lambda url: (url, ["93.184.216.34"]),
    )

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(302, headers={"Location": "https://example.com/loop"})

    transport = httpx.MockTransport(handler)
    with pytest.raises(TooManyRedirects):
        await fetch_html("https://example.com/loop", transport=transport)


@pytest.mark.anyio
async def test_oversized_body_is_truncated():
    """Responses larger than MAX_BODY_BYTES must be truncated cleanly without OOM."""
    huge_html = "<html><head><title>Big</title></head><body>" + ("A" * (MAX_BODY_BYTES + 50_000)) + "</body></html>"

    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"Content-Type": "text/html; charset=utf-8"},
            content=huge_html.encode("utf-8"),
        )

    transport = httpx.MockTransport(handler)
    final_url, html = await fetch_html("https://example.com/big", transport=transport)
    assert final_url == "https://example.com/big"
    assert len(html.encode("utf-8")) <= MAX_BODY_BYTES
    assert "<title>Big</title>" in html


@pytest.mark.anyio
async def test_non_html_content_type_raises_not_html():
    """Non-HTML responses like PDFs or images must raise NotHTML rather than crashing."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(
            200,
            headers={"Content-Type": "application/pdf"},
            content=b"%PDF-1.4...",
        )

    transport = httpx.MockTransport(handler)
    with pytest.raises(NotHTML):
        await fetch_html("https://example.com/doc.pdf", transport=transport)


@pytest.mark.anyio
async def test_timeout_raises_fetch_timeout():
    """Slow/hanging responses must raise FetchTimeout."""
    def handler(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("timed out", request=request)

    transport = httpx.MockTransport(handler)
    with pytest.raises(FetchTimeout):
        await fetch_html("https://example.com/slow", transport=transport)


@pytest.mark.anyio
async def test_http_500_raises_fetch_failed():
    """Server error responses from the target site must raise FetchFailed."""
    def handler(request: httpx.Request) -> httpx.Response:
        return httpx.Response(500, headers={"Content-Type": "text/html"}, text="Server Error")

    transport = httpx.MockTransport(handler)
    with pytest.raises(FetchFailed):
        await fetch_html("https://example.com/err", transport=transport)
