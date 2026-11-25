import { useEffect, useState } from "react";
import { ExternalLink, Globe } from "lucide-react";
import { useLinkPreview, isValidHttpUrl } from "../hooks/useLinkPreview";

/**
 * Extract a clean hostname fallback if the backend request itself fails or is unavailable.
 */
function getFallbackDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/**
 * Renders a rich Open Graph link preview card (with skeleton loading and safe domain-only fallback).
 */
export default function LinkPreviewCard({ url }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [imgReady, setImgReady] = useState(false);
  const [faviconFailed, setFaviconFailed] = useState(false);

  const valid = isValidHttpUrl(url);
  const { data, isLoading, isError } = useLinkPreview(url);

  // Reset image/favicon loading state whenever the URL or resolved preview image changes.
  useEffect(() => {
    setImgFailed(false);
    setImgReady(false);
    setFaviconFailed(false);
  }, [url, data?.image]);

  if (!valid) return null;

  const isFallback = isError || !data || data.fallback;
  const waitingForImage =
    !isLoading && !isFallback && Boolean(data?.image) && !imgReady && !imgFailed;

  // Keep showing the skeleton until both the JSON metadata and preview image are ready.
  if (isLoading || waitingForImage) {
    return (
      <div
        className="w-full rounded-2xl border border-white/10 bg-white/5 p-4 animate-pulse space-y-3"
        aria-label="Loading link preview"
      >
        {waitingForImage && (
          <img
            src={data.image}
            alt=""
            onLoad={() => setImgReady(true)}
            onError={() => setImgFailed(true)}
            className="hidden"
          />
        )}
        <div className="h-36 w-full rounded-xl bg-white/10" />
        <div className="h-4 w-3/4 rounded bg-white/10" />
        <div className="h-3 w-full rounded bg-white/10" />
        <div className="h-3 w-2/3 rounded bg-white/10" />
        <div className="flex items-center gap-2 pt-1">
          <div className="h-4 w-4 rounded-full bg-white/10" />
          <div className="h-3 w-24 rounded bg-white/10" />
        </div>
      </div>
    );
  }

  const targetHref = data?.url || url;
  const domain = data?.domain || getFallbackDomain(url);

  // Minimal domain-only card when target site failed or backend returned fallback=true
  if (isFallback) {
    return (
      <a
        href={targetHref}
        target="_blank"
        rel="noopener noreferrer"
        className="group flex items-center justify-between gap-3 w-full rounded-2xl border border-white/10 bg-white/5 hover:bg-white/10 p-4 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <Globe className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-sm font-medium text-slate-200 truncate">
            {domain}
          </span>
        </div>
        <ExternalLink className="w-4 h-4 text-slate-400 group-hover:text-purple-300 shrink-0 transition-colors" />
      </a>
    );
  }

  const showImage = Boolean(data.image) && !imgFailed;
  const showFavicon = Boolean(data.favicon) && !faviconFailed;

  return (
    <a
      href={targetHref}
      target="_blank"
      rel="noopener noreferrer"
      className="group block w-full overflow-hidden rounded-2xl border border-white/10 bg-white/5 hover:bg-white/[0.08] hover:border-white/20 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400"
    >
      {showImage && (
        <div className="w-full h-44 bg-black/30 overflow-hidden border-b border-white/10">
          <img
            src={data.image}
            alt={data.title ? `Preview image for ${data.title}` : `Preview image for ${domain}`}
            onError={() => setImgFailed(true)}
            className="w-full h-full object-cover group-hover:scale-[1.02] transition-transform duration-300"
          />
        </div>
      )}

      <div className="p-4 space-y-2">
        {data.title && (
          <h3 className="text-sm font-semibold text-white leading-snug line-clamp-2 group-hover:text-purple-200 transition-colors">
            {data.title}
          </h3>
        )}

        {data.description && (
          <p className="text-xs text-slate-300 leading-relaxed line-clamp-3">
            {data.description}
          </p>
        )}

        <div className="flex items-center justify-between gap-2 pt-1">
          <div className="flex items-center gap-2 min-w-0">
            {showFavicon ? (
              <img
                src={data.favicon}
                alt=""
                onError={() => setFaviconFailed(true)}
                className="w-4 h-4 rounded-sm shrink-0 object-contain"
              />
            ) : (
              <Globe className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            )}
            <span className="text-[11px] font-medium text-slate-400 truncate">
              {data.site_name && data.site_name !== domain
                ? `${data.site_name} · ${domain}`
                : domain}
            </span>
          </div>
          <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-purple-300 shrink-0 transition-colors" />
        </div>
      </div>
    </a>
  );
}
