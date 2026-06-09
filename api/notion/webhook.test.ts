import assert from "node:assert/strict";
import crypto from "node:crypto";
import test from "node:test";

const TOKEN = "test-verification-token";
process.env.NOTION_WEBHOOK_VERIFICATION_TOKEN = TOKEN;

const { POST } = await import("./webhook.ts");

function sign(body: string): string {
  return `sha256=${crypto.createHmac("sha256", TOKEN).update(body).digest("hex")}`;
}

function makeRequest(body: string, headers: Record<string, string> = {}): Request {
  return new Request("https://example.com/api/notion", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
}

async function withStrictMode(fn: () => Promise<void>): Promise<void> {
  const previous = process.env.NOTION_WEBHOOK_REQUIRE_SIGNATURE;
  process.env.NOTION_WEBHOOK_REQUIRE_SIGNATURE = "true";
  try {
    await fn();
  } finally {
    if (previous === undefined) {
      delete process.env.NOTION_WEBHOOK_REQUIRE_SIGNATURE;
    } else {
      process.env.NOTION_WEBHOOK_REQUIRE_SIGNATURE = previous;
    }
  }
}

test("echoes the verification token during the handshake (no signature)", async () => {
  const body = JSON.stringify({ verification_token: "handshake-abc" });
  const response = await POST(makeRequest(body));
  const json = (await response.json()) as { ok: boolean; verification_token: string };

  assert.equal(response.status, 200);
  assert.equal(json.ok, true);
  assert.equal(json.verification_token, "handshake-abc");
});

test("rejects invalid JSON with 400", async () => {
  const response = await POST(makeRequest("not json"));
  assert.equal(response.status, 400);
});

test("strict mode rejects an invalid signature with 401", async () => {
  await withStrictMode(async () => {
    const body = JSON.stringify({ type: "page.created", entity: { id: "page-1" } });
    const response = await POST(
      makeRequest(body, { "x-notion-signature": "sha256=deadbeef" }),
    );
    assert.equal(response.status, 401);
  });
});

test("lenient mode (default) processes events without a valid signature", async () => {
  // Unsupported type keeps it hermetic (no network sync), but proves we do NOT 401.
  const body = JSON.stringify({ type: "page.moved", entity: { id: "page-1" } });
  const response = await POST(makeRequest(body)); // no signature header
  const json = (await response.json()) as { ignored?: boolean; reason?: string };

  assert.equal(response.status, 200);
  assert.equal(json.ignored, true);
  assert.match(json.reason ?? "", /Unsupported/);
});

test("ignores unsupported event types with a valid signature", async () => {
  const body = JSON.stringify({ type: "page.moved", entity: { id: "page-1" } });
  const response = await POST(makeRequest(body, { "x-notion-signature": sign(body) }));
  const json = (await response.json()) as { ignored?: boolean; reason?: string };

  assert.equal(response.status, 200);
  assert.equal(json.ignored, true);
  assert.match(json.reason ?? "", /Unsupported/);
});

test("ignores events without a page identifier", async () => {
  const body = JSON.stringify({ type: "page.created" });
  const response = await POST(makeRequest(body, { "x-notion-signature": sign(body) }));
  const json = (await response.json()) as { ignored?: boolean; reason?: string };

  assert.equal(response.status, 200);
  assert.equal(json.ignored, true);
  assert.match(json.reason ?? "", /Missing page identifier/);
});

test("accepts a bare-hex signature (strict mode, verified)", async () => {
  await withStrictMode(async () => {
    const body = JSON.stringify({ type: "page.moved", entity: { id: "page-1" } });
    const bareHex = crypto.createHmac("sha256", TOKEN).update(body).digest("hex");
    const response = await POST(makeRequest(body, { "x-notion-signature": bareHex }));

    // Verified (no 401), then ignored because the type is unsupported.
    assert.equal(response.status, 200);
  });
});
