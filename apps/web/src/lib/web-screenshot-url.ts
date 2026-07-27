const GOOGLE_PARAM_KEYS = ["imgurl", "mediaurl", "url", "u"] as const;

function tryParseUrl(value: string) {
  try {
    return new URL(value);
  } catch {
    return null;
  }
}

function isHttpUrl(value: string) {
  const parsed = tryParseUrl(value);
  return Boolean(parsed && ["http:", "https:"].includes(parsed.protocol));
}

function decodeParamValue(value: string) {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function isAppRelativeImagePath(value: string) {
  return value.trim().startsWith("/");
}

export function normalizeWebScreenshotUrl(rawUrl: string) {
  const trimmed = rawUrl.trim();
  if (!trimmed) {
    throw new Error("Image URL is required.");
  }

  let current = trimmed;
  let guard = 0;

  while (guard < 5) {
    guard += 1;
    const parsed = tryParseUrl(current);
    if (!parsed) {
      throw new Error("Please provide a valid image URL.");
    }

    let nestedMatchFound = false;
    for (const key of GOOGLE_PARAM_KEYS) {
      const nestedValue = parsed.searchParams.get(key);
      if (!nestedValue) continue;

      const decodedValue = decodeParamValue(nestedValue);
      if (isHttpUrl(decodedValue)) {
        current = decodedValue;
        nestedMatchFound = true;
        break;
      }
    }

    if (nestedMatchFound) {
      continue;
    }

    if (!["http:", "https:"].includes(parsed.protocol)) {
      throw new Error("Only http and https image URLs are supported.");
    }

    return parsed.toString();
  }

  throw new Error("Please provide a valid image URL.");
}

export function extractImageUrlFromHtml(html: string, baseUrl: string) {
  const metaMatch = html.match(
    /<meta[^>]+(?:property|name)=["'](?:og:image|twitter:image|twitter:image:src|image)["'][^>]+content=["']([^"']+)["']/i,
  );
  if (metaMatch?.[1]) {
    return new URL(metaMatch[1], baseUrl).toString();
  }

  const imgMatch = html.match(/<img[^>]+src=["']([^"']+)["']/i);
  if (imgMatch?.[1]) {
    return new URL(imgMatch[1], baseUrl).toString();
  }

  return null;
}
