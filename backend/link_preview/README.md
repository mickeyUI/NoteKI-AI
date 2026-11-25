# Link Preview Service (backend/link_preview)

Safe, SSRF-hardened Open Graph & HTML metadata preview endpoint (`GET /preview`) integrated into the Second Brain FastAPI backend (`backend/Main.py`).

## Architecture

```
React (ViewNote.jsx -> LinkPreviewCard)
   │  GET /preview?url=<encoded>
   ▼
FastAPI (Main.py + slowapi rate limiter)
   │
   ▼
service.py (in-flight coalescing)
   ├──▶ cache.py (TTLCache: 24h success / 5m failure)
   └──▶ url_validation.py (scheme/length/creds + SSRF IP check)
           └──▶ fetcher.py (httpx manual redirects, 5s timeout, 1 MB cap)
                   └──▶ parser.py (BeautifulSoup html.parser -> OG/Twitter/HTML)
```

## API Contract

- `GET /health` -> `200 {"status": "ok"}`
- `GET /preview?url=<encoded_url>`:
  - `200` JSON:
    ```json
    {
      "url": "https://example.com/article",
      "title": "Example Title",
      "description": "Summary...",
      "image": "https://example.com/og.png",
      "site_name": "Example",
      "favicon": "https://example.com/favicon.ico",
      "domain": "example.com",
      "fallback": false
    }
    ```
  - `400`: Missing, malformed, too long, or disallowed scheme (`ftp://`, `file://`, `javascript:`, `user:pass@host`).
  - `403`: URL or redirect target resolves to a private, loopback, link-local (`169.254.169.254`), multicast, reserved, or unspecified IP.
  - `429`: Per-IP rate limit exceeded.

## SSRF Protection

1. Only `http` and `https` schemes are accepted; embedded credentials are rejected.
2. Literal and odd-encoded IPs (decimal, hex, octal) are parsed via `ipaddress` + `socket.inet_aton`.
3. All `A` and `AAAA` DNS records are resolved via `socket.getaddrinfo` and checked; if **any** record is internal/private/loopback/link-local/reserved, the request is rejected with `403`.
4. Redirects are handled manually (`follow_redirects=False`) up to `MAX_REDIRECTS`, re-validating every `Location` hop.

## Configuration (Environment Variables)

| Variable | Default | Description |
|---|---|---|
| `MAX_URL_LENGTH` | `2048` | Max allowed URL length |
| `FETCH_TIMEOUT_SECONDS` | `5.0` | Total outbound fetch timeout |
| `MAX_REDIRECTS` | `3` | Max manual redirect hops |
| `MAX_BODY_BYTES` | `1000000` | Streaming HTML body cap (~1 MB) |
| `SUCCESS_CACHE_TTL_SECONDS` | `86400` | Success cache TTL (24h) |
| `SUCCESS_CACHE_MAX_ITEMS` | `1000` | Max cached successful previews |
| `FAILURE_CACHE_TTL_SECONDS` | `300` | Failure fallback cache TTL (5m) |
| `FAILURE_CACHE_MAX_ITEMS` | `1000` | Max cached fallback entries |
| `RATE_LIMIT` | `30/minute` | Per-IP rate limit (`slowapi`) |
| `ALLOWED_ORIGINS` | `http://localhost:5173,http://127.0.0.1:5173` | Comma-separated CORS origins |
| `LINK_PREVIEW_USER_AGENT` | `LinkPreviewBot/1.0 (+https://github.com/second-brain-project)` | Outbound User-Agent |

## Running Tests

From `backend/`:
```powershell
python -m pytest tests/ -v
```

## Deploy (Free Tier)

- **Backend (Render Free Web Service)**:
  - Root directory: `backend`
  - Start command: `uvicorn Main:app --host 0.0.0.0 --port $PORT`
  - Set `ALLOWED_ORIGINS` to your deployed frontend URL (e.g., `https://your-app.vercel.app`).
- **Frontend (Vercel / Cloudflare Pages Free Tier)**:
  - Set `VITE_API_URL` to your Render backend URL.

## Known Limitations

- **Render cold starts**: Free Render instances sleep after inactivity; the first `/preview` or `/health` request after sleep takes ~30–50s.
- **In-memory cache**: `TTLCache` resets on server restart or redeploy.
- **Hotlinked images**: External `og:image` URLs are loaded directly by the browser and can break if the target site blocks hotlinking or removes the asset.
- **JS-rendered SPAs**: Sites that require client-side JavaScript to inject meta tags (without SSR) will fall back to basic title/domain metadata.
- **DNS rebinding TOCTOU window**: DNS is validated before `httpx` opens the socket; `httpx` re-resolves on connect, leaving a small theoretical TOCTOU window.
