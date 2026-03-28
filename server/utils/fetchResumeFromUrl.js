import cloudinary from "../config/cloudinary.js";

/**
 * Build a signed Cloudinary delivery URL from an existing public URL.
 * Signed URLs bypass Referer / allowed-domain restrictions that break server-side fetch.
 */
function cloudinarySignedUrlFromPublicUrl(url) {
  try {
    if (!url.includes("res.cloudinary.com")) return null;
    const match = url.match(/\/(raw|image|video)\/upload\/(?:v\d+\/)?([^?]+)/);
    if (!match) return null;
    const resourceType = match[1];
    const publicIdPath = decodeURIComponent(match[2]);
    return cloudinary.url(publicIdPath, {
      resource_type: resourceType,
      secure: true,
      sign_url: true,
    });
  } catch {
    return null;
  }
}

/**
 * Fetch resume bytes from a public URL (usually Cloudinary).
 * Retries with a signed Cloudinary URL if the first request fails (403/401/502, etc.).
 */
export async function fetchResumeFromUrl(resumeUrl) {
  const referer = (process.env.APP_URL || "").replace(/\/$/, "");
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
    Accept: "application/pdf,application/octet-stream,*/*",
  };
  if (referer) {
    headers.Referer = referer;
    headers.Origin = referer;
  }

  let normalizedUrl = resumeUrl.trim();
  if (normalizedUrl.startsWith("http://res.cloudinary.com")) {
    normalizedUrl = normalizedUrl.replace("http://", "https://");
  }

  async function tryFetch(url) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 45000);
    try {
      const r = await fetch(url, {
        redirect: "follow",
        headers,
        signal: controller.signal,
      });
      clearTimeout(timer);
      if (!r.ok) {
        return {
          ok: false,
          status: r.status,
          buffer: null,
          contentType: "",
        };
      }
      const buffer = Buffer.from(await r.arrayBuffer());
      const contentType = r.headers.get("content-type") || "";
      return { ok: true, status: 200, buffer, contentType };
    } catch (err) {
      clearTimeout(timer);
      return {
        ok: false,
        status: 0,
        buffer: null,
        contentType: "",
        error: err.name === "AbortError" ? "Request timed out" : err.message,
      };
    }
  }

  let result = await tryFetch(normalizedUrl);
  if (result.ok) return result;

  const signed = cloudinarySignedUrlFromPublicUrl(normalizedUrl);
  if (signed && signed !== normalizedUrl) {
    result = await tryFetch(signed);
    if (result.ok) return result;
  }

  return result;
}
