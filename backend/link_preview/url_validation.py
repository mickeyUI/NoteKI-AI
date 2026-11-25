"""URL validation, normalization, and SSRF protection for the link preview service."""

import ipaddress
import socket
from urllib.parse import urlsplit, urlunsplit

from link_preview.config import MAX_URL_LENGTH


class InvalidURL(Exception):
    """Raised when a URL is missing, malformed, too long, or uses a disallowed scheme."""


class BlockedAddress(Exception):
    """Raised when a URL resolves to a private, loopback, link-local, or reserved IP."""


def _is_blocked_ip(ip_obj: ipaddress.IPv4Address | ipaddress.IPv6Address) -> bool:
    """Return True if an IP address belongs to any internal, local, or reserved range."""
    # Unwrap IPv4-mapped IPv6 addresses (e.g. ::ffff:127.0.0.1) so they cannot bypass IPv4 checks.
    if isinstance(ip_obj, ipaddress.IPv6Address) and ip_obj.ipv4_mapped is not None:
        ip_obj = ip_obj.ipv4_mapped

    return (
        ip_obj.is_private
        or ip_obj.is_loopback
        or ip_obj.is_link_local
        or ip_obj.is_multicast
        or ip_obj.is_reserved
        or ip_obj.is_unspecified
    )


def _parse_literal_ip(hostname: str) -> ipaddress.IPv4Address | ipaddress.IPv6Address | None:
    """Attempt to parse a hostname as a literal IP (standard, decimal, octal, or hex encoding)."""
    # Strip IPv6 zone ID if present (e.g. fe80::1%eth0) before parsing.
    clean_host = hostname.split("%", 1)[0]
    try:
        return ipaddress.ip_address(clean_host)
    except ValueError:
        pass

    # Problem solved: odd IPv4 encodings like decimal (2130706433), hex (0x7f000001), or octal
    # (0177.0.0.1) are accepted by OS resolvers on Linux; socket.inet_aton catches them portably.
    try:
        packed = socket.inet_aton(clean_host)
        return ipaddress.IPv4Address(packed)
    except OSError:
        return None


def _resolve_and_check_ips(hostname: str, port: int) -> list[str]:
    """Resolve all A/AAAA records for hostname and ensure none point to a blocked IP range."""
    literal_ip = _parse_literal_ip(hostname)
    if literal_ip is not None:
        if _is_blocked_ip(literal_ip):
            raise BlockedAddress("Target IP address is in a blocked range.")
        return [str(literal_ip)]

    # Explicitly block "localhost" and "*.localhost" even before DNS resolution.
    lowered = hostname.rstrip(".").lower()
    if lowered == "localhost" or lowered.endswith(".localhost"):
        raise BlockedAddress("Localhost addresses are blocked.")

    try:
        # Request both IPv4 (AF_INET) and IPv6 (AF_INET6) records via AF_UNSPEC.
        addr_infos = socket.getaddrinfo(hostname, port, family=socket.AF_UNSPEC, type=socket.SOCK_STREAM)
    except socket.gaierror as exc:
        raise InvalidURL(f"Could not resolve hostname: {hostname}") from exc

    resolved_ips: list[str] = []
    for _family, _type, _proto, _canonname, sockaddr in addr_infos:
        raw_ip = sockaddr[0].split("%", 1)[0]
        try:
            ip_obj = ipaddress.ip_address(raw_ip)
        except ValueError as exc:
            raise InvalidURL("Resolved address is not a valid IP.") from exc

        # Reject if ANY returned A or AAAA record is internal; prevents multi-record SSRF bypass.
        if _is_blocked_ip(ip_obj):
            raise BlockedAddress("Target hostname resolves to a blocked IP address.")
        if raw_ip not in resolved_ips:
            resolved_ips.append(raw_ip)

    if not resolved_ips:
        raise InvalidURL("Hostname did not resolve to any IP address.")

    return resolved_ips


def _normalize_url(parsed, scheme: str, hostname: str) -> str:
    """Rebuild a canonical URL (lowercase scheme/host, no #fragment, no default port)."""
    port = parsed.port
    # Drop default ports so http://example.com:80 and http://example.com share one cache key.
    is_default_port = (scheme == "http" and port == 80) or (scheme == "https" and port == 443)

    # Wrap IPv6 literals in brackets when reconstructing netloc.
    host_part = f"[{hostname}]" if ":" in hostname else hostname
    netloc = host_part if (port is None or is_default_port) else f"{host_part}:{port}"

    # Default empty path to "/" if there is no path, or keep original path; strip #fragment.
    path = parsed.path or "/"
    return urlunsplit((scheme, netloc, path, parsed.query, ""))


def validate_and_normalize_url(raw_url: str) -> tuple[str, list[str]]:
    """Validate URL syntax, normalize it for caching, and verify all resolved IPs are public.

    Returns (normalized_url, validated_ips) or raises InvalidURL / BlockedAddress.
    """
    if not isinstance(raw_url, str):
        raise InvalidURL("URL must be a string.")

    trimmed = raw_url.strip()
    if not trimmed:
        raise InvalidURL("URL is required.")

    if len(trimmed) > MAX_URL_LENGTH:
        raise InvalidURL(f"URL exceeds maximum length of {MAX_URL_LENGTH} characters.")

    try:
        parsed = urlsplit(trimmed)
    except ValueError as exc:
        raise InvalidURL("Malformed URL.") from exc

    scheme = parsed.scheme.lower()
    # Restrict strictly to http/https to block file://, ftp://, gopher://, data:, javascript:.
    if scheme not in ("http", "https"):
        raise InvalidURL("Only http and https URLs are supported.")

    # Reject embedded credentials (user:pass@host) to prevent credential-leak / parser-confusion attacks.
    if parsed.username is not None or parsed.password is not None:
        raise InvalidURL("URLs with embedded credentials are not allowed.")

    if not parsed.hostname:
        raise InvalidURL("URL must include a valid hostname.")

    hostname = parsed.hostname.lower()
    try:
        port = parsed.port
    except ValueError as exc:
        raise InvalidURL("Invalid port in URL.") from exc

    effective_port = port if port is not None else (443 if scheme == "https" else 80)
    validated_ips = _resolve_and_check_ips(hostname, effective_port)
    normalized_url = _normalize_url(parsed, scheme, hostname)

    return normalized_url, validated_ips
