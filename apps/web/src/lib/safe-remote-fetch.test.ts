import { test } from "vitest";
import assert from "node:assert/strict";

import { assertSafeRemoteUrl } from "./safe-remote-fetch";

async function rejects(url: string) {
  await assert.rejects(() => assertSafeRemoteUrl(url));
}

test("rejects loopback, private, link-local, and metadata IP literals", async () => {
  await rejects("http://127.0.0.1/");
  await rejects("http://127.0.0.1:80/image.png");
  await rejects("http://10.0.0.5/");
  await rejects("http://172.16.4.4/");
  await rejects("http://192.168.1.10/");
  await rejects("http://169.254.169.254/latest/meta-data/"); // cloud metadata endpoint
  await rejects("http://0.0.0.0/");
  await rejects("http://[::1]/");
});

test("rejects non-default ports even on an otherwise-public-looking host", async () => {
  // 93.184.216.34 is example.com's IP — publicly routable, but the
  // non-standard port alone should be enough to reject it.
  await rejects("http://93.184.216.34:8080/");
});

test("rejects non-http(s) protocols", async () => {
  await rejects("file:///etc/passwd");
  await rejects("ftp://93.184.216.34/");
});

test("accepts a public IPv4 literal on a default port", async () => {
  const url = await assertSafeRemoteUrl("http://93.184.216.34/image.png");
  assert.equal(url.hostname, "93.184.216.34");
});
