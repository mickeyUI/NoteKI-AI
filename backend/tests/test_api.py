"""API integration tests for GET /health and GET /preview (Phase 4)."""

import os
import socket
from unittest.mock import AsyncMock, patch
import pytest
from fastapi.testclient import TestClient

# Provide dummy env vars before importing Main so DB/Supabase module imports don't fail in tests.
os.environ.setdefault("DATABASE_URL", "sqlite:///./test_dummy.db")

from Main import app, limiter  # noqa: E402
from link_preview.cache import clear_caches  # noqa: E402
from link_preview.fetcher import FetchTimeout  # noqa: E402


@pytest.fixture(autouse=True)
def reset_state():
    """Clear TTL caches and rate-limiter storage between tests for isolation."""
    clear_caches()
    limiter._storage.reset()
    yield
    clear_caches()


def _mock_public_dns(hostname, port, family=0, type=0, proto=0, flags=0):
    """Return a deterministic public IP so API tests never make real DNS calls."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]


def test_health_endpoint():
    """GET /health returns 200 OK with {"status": "ok"}."""
    client = TestClient(app)
    res = client.get("/health")
    assert res.status_code == 200
    assert res.json() == {"status": "ok"}


def test_preview_success_and_cache_hit():
    """Second request for the same URL must be served from cache without calling fetch_html again."""
    sample_html = """
    <html><head>
      <meta property="og:title" content="Second Brain" />
      <meta property="og:description" content="Personal knowledge base" />
      <meta property="og:image" content="https://example.com/og.png" />
    </head></html>
    """
    mock_fetch = AsyncMock(return_value=("https://example.com/article", sample_html))

    with (
        patch("link_preview.url_validation.socket.getaddrinfo", side_effect=_mock_public_dns),
        patch("link_preview.service.fetch_html", mock_fetch),
    ):
        client = TestClient(app)
        res1 = client.get("/preview", params={"url": "https://example.com/article#top"})
        res2 = client.get("/preview", params={"url": "https://example.com/article"})

    assert res1.status_code == 200
    assert res2.status_code == 200
    data = res1.json()
    assert data["title"] == "Second Brain"
    assert data["image"] == "https://example.com/og.png"
    assert data["fallback"] is False
    assert mock_fetch.await_count == 1


def test_preview_failure_returns_200_fallback():
    """Target fetch timeouts must return HTTP 200 with fallback=true and domain populated."""
    mock_fetch = AsyncMock(side_effect=FetchTimeout("timed out"))

    with (
        patch("link_preview.url_validation.socket.getaddrinfo", side_effect=_mock_public_dns),
        patch("link_preview.service.fetch_html", mock_fetch),
    ):
        client = TestClient(app)
        res = client.get("/preview", params={"url": "https://slow.example.com/page"})

    assert res.status_code == 200
    data = res.json()
    assert data["fallback"] is True
    assert data["domain"] == "slow.example.com"
    assert data["title"] is None


def test_preview_invalid_url_returns_400():
    """Malformed URLs or disallowed schemes must return HTTP 400."""
    client = TestClient(app)
    res = client.get("/preview", params={"url": "ftp://example.com/file"})
    assert res.status_code == 400


def test_preview_blocked_address_returns_403():
    """Private/loopback/metadata URLs must return HTTP 403."""
    client = TestClient(app)
    for blocked in ("http://127.0.0.1", "http://169.254.169.254/latest/meta-data/"):
        res = client.get("/preview", params={"url": blocked})
        assert res.status_code == 403


def test_preview_rate_limit_returns_429():
    """Exceeding RATE_LIMIT from the same IP must return HTTP 429."""
    mock_fetch = AsyncMock(
        return_value=("https://example.com/ok", "<html><head><title>OK</title></head></html>")
    )
    with (
        patch("link_preview.url_validation.socket.getaddrinfo", side_effect=_mock_public_dns),
        patch("link_preview.service.fetch_html", mock_fetch),
    ):
        client = TestClient(app)
        statuses = []
        # Default RATE_LIMIT is 30/minute; request 32 times to trigger 429.
        for i in range(32):
            res = client.get(
                "/preview",
                params={"url": f"https://example.com/p/{i}"},
                headers={"X-Forwarded-For": "203.0.113.99"},
            )
            statuses.append(res.status_code)

    assert 429 in statuses
