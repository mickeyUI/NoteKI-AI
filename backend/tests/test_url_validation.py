"""Unit tests for URL validation, normalization, and SSRF protection (Phase 1)."""

import socket
from unittest.mock import patch
import pytest

from link_preview.url_validation import (
    BlockedAddress,
    InvalidURL,
    validate_and_normalize_url,
)


def _mock_public_dns(hostname, port, family=0, type=0, proto=0, flags=0):
    """Return a deterministic public IPv4 address so tests never touch real DNS/network."""
    return [(socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port))]


@pytest.mark.parametrize(
    "blocked_url",
    [
        "http://localhost",
        "http://localhost:8000/test",
        "http://127.0.0.1",
        "http://0.0.0.0",
        "http://[::1]",
        "http://10.0.0.1",
        "http://172.16.0.1",
        "http://192.168.1.1",
        "http://169.254.169.254/latest/meta-data/",
        "http://2130706433",       # Decimal-encoded 127.0.0.1
        "http://0x7f000001",       # Hex-encoded 127.0.0.1
        "http://0177.0.0.1",       # Octal-encoded 127.0.0.1
        "http://[::ffff:127.0.0.1]",  # IPv4-mapped IPv6 loopback
    ],
)
def test_ssrf_blocks_internal_and_encoded_addresses(blocked_url):
    """All loopback, private, link-local, unspecified, and encoded internal IPs must be blocked."""
    with pytest.raises(BlockedAddress):
        validate_and_normalize_url(blocked_url)


def test_ssrf_blocks_hostname_resolving_to_private_ip():
    """A public-looking domain that resolves to a private IP in DNS must be blocked."""
    def fake_dns(hostname, port, family=0, type=0, proto=0, flags=0):
        return [
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("93.184.216.34", port)),
            (socket.AF_INET, socket.SOCK_STREAM, 6, "", ("10.0.0.5", port)),
        ]

    with patch("link_preview.url_validation.socket.getaddrinfo", side_effect=fake_dns):
        with pytest.raises(BlockedAddress):
            validate_and_normalize_url("https://sneaky.example.com")


@pytest.mark.parametrize(
    "invalid_url",
    [
        "",
        "   ",
        "ftp://example.com/file",
        "file:///etc/passwd",
        "javascript:alert(1)",
        "data:text/html,<h1>hi</h1>",
        "http://user:pass@example.com",
        "https://user@example.com/path",
        "https://example.com/" + "a" * 3000,
        "not-a-url",
    ],
)
def test_invalid_urls_rejected(invalid_url):
    """Disallowed schemes, embedded credentials, oversized URLs, and malformed inputs raise InvalidURL."""
    with pytest.raises(InvalidURL):
        validate_and_normalize_url(invalid_url)


def test_normal_public_url_is_normalized():
    """A valid public URL is normalized (lowercase scheme/host, no default port, no fragment)."""
    with patch("link_preview.url_validation.socket.getaddrinfo", side_effect=_mock_public_dns):
        normalized, ips = validate_and_normalize_url(
            "HTTPS://Example.COM:443/article?id=42#section-2"
        )

    assert normalized == "https://example.com/article?id=42"
    assert ips == ["93.184.216.34"]
