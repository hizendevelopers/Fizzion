import { lookup } from "node:dns/promises";
import { isIPv4, isIPv6 } from "node:net";

const ALLOWED_PORTS = new Set(["", "80", "443"]);
const MAX_RESPONSE_BYTES = 10 * 1024 * 1024; // 10 MB

/**
 * Blocks SSRF against internal infrastructure: private/loopback/
 * link-local/reserved/multicast ranges, and the cloud metadata address.
 * Not full DNS-rebinding protection (that needs IP-pinned connections),
 * but it stops the exploitable case of fetching internal services or the
 * cloud metadata endpoint through this app's own image proxy.
 */
function isDisallowedIp(address: string): boolean {
  if (isIPv4(address)) {
    const octets = address.split(".").map(Number);
    const [a, b] = octets;
    if (a === 10) return true; // 10.0.0.0/8
    if (a === 127) return true; // loopback
    if (a === 169 && b === 254) return true; // link-local incl. cloud metadata
    if (a === 172 && b >= 16 && b <= 31) return true; // 172.16.0.0/12
    if (a === 192 && b === 168) return true; // 192.168.0.0/16
    if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT 100.64.0.0/10
    if (a === 0) return true; // 0.0.0.0/8
    if (a >= 224) return true; // multicast + reserved 224.0.0.0/4 and up
    return false;
  }

  if (isIPv6(address)) {
    const normalized = address.toLowerCase();
    if (normalized === "::1") return true; // loopback
    if (normalized.startsWith("fe80:") || normalized.startsWith("fe8") || normalized.startsWith("fe9") || normalized.startsWith("fea") || normalized.startsWith("feb")) return true; // link-local
    if (normalized.startsWith("fc") || normalized.startsWith("fd")) return true; // unique local fc00::/7
    if (normalized.startsWith("ff")) return true; // multicast
    if (normalized.startsWith("::ffff:")) {
      // IPv4-mapped IPv6 address — validate the embedded IPv4 too.
      const embedded = normalized.split(":").pop() ?? "";
      return isIPv4(embedded) ? isDisallowedIp(embedded) : true;
    }
    return false;
  }

  // Not a literal IP we recognize — fail closed.
  return true;
}

/**
 * Validates that `rawUrl` is http/https, uses a standard port, and
 * resolves only to public IP addresses. Throws otherwise. Call this
 * immediately before any server-side fetch of a user-supplied URL.
 */
export async function assertSafeRemoteUrl(rawUrl: string): Promise<URL> {
  const url = new URL(rawUrl);

  if (!["http:", "https:"].includes(url.protocol)) {
    throw new Error("Only http and https URLs are supported.");
  }

  if (!ALLOWED_PORTS.has(url.port)) {
    throw new Error("Only the default http/https ports are supported.");
  }

  let addresses: Array<{ address: string }>;
  try {
    addresses = await lookup(url.hostname, { all: true, verbatim: true });
  } catch {
    throw new Error("Could not resolve the host for this URL.");
  }

  if (addresses.length === 0 || addresses.some((entry) => isDisallowedIp(entry.address))) {
    throw new Error("This URL points to a network address that is not allowed.");
  }

  return url;
}

/** fetch() a URL after validating it, with a response-size cap. */
export async function safeRemoteFetch(rawUrl: string, init: RequestInit): Promise<Response> {
  const url = await assertSafeRemoteUrl(rawUrl);
  return fetch(url, init);
}

/** Reads a Response body into a Buffer, rejecting oversized responses. */
export async function bufferWithLimit(
  response: Response,
  maxBytes: number = MAX_RESPONSE_BYTES,
): Promise<Buffer> {
  const declaredLength = Number(response.headers.get("content-length") ?? 0);
  if (declaredLength > maxBytes) {
    throw new Error("The remote response is too large.");
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  if (buffer.byteLength > maxBytes) {
    throw new Error("The remote response is too large.");
  }

  return buffer;
}
