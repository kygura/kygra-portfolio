import assert from "node:assert/strict";
import test from "node:test";

process.env.NOTION_SYNC_TRIGGER_SECRET = "manual-secret";
process.env.CRON_SECRET = "cron-secret";
process.env.VERCEL_DEPLOY_HOOK_URL = "https://api.vercel.com/v1/integrations/deploy/test-hook";

const { GET, POST } = await import("./sync.ts");

const calls: string[] = [];
globalThis.fetch = (async (input: string | URL | Request) => {
  calls.push(String(input));
  return Response.json({ job: { id: "job-1" } }, { status: 201 });
}) as typeof fetch;

function makeRequest(method: string, authorization?: string): Request {
  return new Request("https://example.com/api/notion/sync", {
    method,
    headers: authorization ? { authorization } : {},
  });
}

test("rejects requests without a valid bearer secret", async () => {
  calls.length = 0;
  assert.equal((await POST(makeRequest("POST"))).status, 401);
  assert.equal((await POST(makeRequest("POST", "Bearer wrong"))).status, 401);
  assert.equal(calls.length, 0);
});

test("manual POST with the trigger secret queues a rebuild", async () => {
  calls.length = 0;
  const response = await POST(makeRequest("POST", "Bearer manual-secret"));
  assert.equal(response.status, 202);
  assert.equal(calls.length, 1);
});

test("Vercel Cron GET with CRON_SECRET queues a rebuild", async () => {
  calls.length = 0;
  const response = await GET(makeRequest("GET", "Bearer cron-secret"));
  assert.equal(response.status, 202);
  assert.equal(calls.length, 1);
});
