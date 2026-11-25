"""Unit tests for the HTML metadata parser (Phase 3)."""

from link_preview.parser import parse_html_metadata


def test_full_og_page():
    """Full Open Graph metadata takes priority over fallback HTML tags."""
    html = """
    <html>
      <head>
        <title>Fallback Title</title>
        <meta property="OG:TITLE" content="  OG   Title  " />
        <meta property="og:description" content="OG description\nwith   newlines" />
        <meta property="og:image" content="https://cdn.example.com/hero.png" />
        <meta property="og:site_name" content="Example Site" />
        <link rel="icon" href="/assets/icon.png" />
      </head>
    </html>
    """
    result = parse_html_metadata(html, "https://example.com/post")
    assert result["title"] == "OG Title"
    assert result["description"] == "OG description with newlines"
    assert result["image"] == "https://cdn.example.com/hero.png"
    assert result["site_name"] == "Example Site"
    assert result["favicon"] == "https://example.com/assets/icon.png"
    assert result["domain"] == "example.com"


def test_twitter_only_page():
    """Twitter meta tags work whether declared with name= or property=."""
    html = """
    <html>
      <head>
        <meta name="twitter:title" content="Twitter Card Title" />
        <meta property="twitter:description" content="Twitter Card Desc" />
        <meta name="twitter:image:src" content="https://example.com/tw.jpg" />
      </head>
    </html>
    """
    result = parse_html_metadata(html, "https://example.com/tw")
    assert result["title"] == "Twitter Card Title"
    assert result["description"] == "Twitter Card Desc"
    assert result["image"] == "https://example.com/tw.jpg"
    assert result["site_name"] == "example.com"
    assert result["favicon"] == "https://example.com/favicon.ico"


def test_bare_title_page():
    """Pages without OG/Twitter tags fall back to <title> and default /favicon.ico."""
    html = "<html><head><title>Plain Page</title></head><body>Hello</body></html>"
    result = parse_html_metadata(html, "https://docs.example.com/guide")
    assert result["title"] == "Plain Page"
    assert result["description"] is None
    assert result["image"] is None
    assert result["site_name"] == "docs.example.com"
    assert result["favicon"] == "https://docs.example.com/favicon.ico"


def test_relative_image_and_unsafe_schemes():
    """Relative image paths resolve against final_url; javascript:/data: URLs are dropped."""
    html = """
    <html><head>
      <meta property="og:image" content="../img/cover.webp" />
      <link rel="icon" href="javascript:alert(1)" />
    </head></html>
    """
    result = parse_html_metadata(html, "https://example.com/blog/post-1")
    assert result["image"] == "https://example.com/img/cover.webp"
    assert result["favicon"] == "https://example.com/favicon.ico"


def test_malformed_and_empty_html():
    """Malformed HTML and empty strings never raise and still return valid metadata."""
    malformed = "<html><head><title>Broken</title><meta property='og:description' content='Still works'><div>unclosed"
    res1 = parse_html_metadata(malformed, "https://example.com/broken")
    assert res1["domain"] == "example.com"
    assert res1["description"] == "Still works"

    res2 = parse_html_metadata("", "https://example.com/empty")
    assert res2["title"] is None
    assert res2["domain"] == "example.com"
    assert res2["favicon"] == "https://example.com/favicon.ico"
