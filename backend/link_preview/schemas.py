"""Pydantic response schemas for the link preview API."""

from typing import Optional
from pydantic import BaseModel


class LinkPreviewResponse(BaseModel):
    """JSON shape returned by GET /preview for both full previews and safe fallbacks."""

    url: str
    title: Optional[str] = None
    description: Optional[str] = None
    image: Optional[str] = None
    site_name: Optional[str] = None
    favicon: Optional[str] = None
    domain: str
    # True when the target site could not be fetched/parsed and only the domain is available.
    fallback: bool = False
