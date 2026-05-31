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
  return new Request("https://example.com/api/notion/webhook", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body,
  });
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

test("rejects an invalid signature with 401", async () => {
  const body = JSON.stringify({ type: "page.created", entity: { id: "page-1" } });
  const response = await POST(makeRequest(body, { "x-notion-signature": "sha256=deadbeef" }));
  assert.equal(response.status, 401);
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

test("accepts both bare-hex and sha256-prefixed signatures", async () => {
  const body = JSON.stringify({ type: "page.moved", entity: { id: "page-1" } });
  const bareHex = crypto.createHmac("sha256", TOKEN).update(body).digest("hex");
  const response = await POST(makeRequest(body, { "x-notion-signature": bareHex }));

  assert.equal(response.status, 200);
});
