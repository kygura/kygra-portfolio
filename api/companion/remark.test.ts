import assert from "node:assert/strict";
import test from "node:test";
import {
  createLimiter,
  createRemarkStore,
  createSpeaker,
  glimpsePrompt,
  handleRemark,
  readGlimpse,
  tidyRemark,
  type Glimpse,
  type Remark,
} from "./remark.ts";

const glimpse: Glimpse = {
  path: "/writings/on-maps",
  title: "On maps",
  heading: "The edge of the sheet",
  excerpt: "Every survey ends somewhere.",
  trigger: "linger",
};

const post = (body: unknown, headers: Record<string, string> = { origin: "https://nca.ink" }) =>
  new Request("https://nca.ink/api/companion/remark", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });

test("readGlimpse squashes whitespace, caps lengths and rejects junk", () => {
  const read = readGlimpse({ ...glimpse, excerpt: `  a\n\n  b ${"x".repeat(5000)}`, extra: 1 });
  assert.ok(read);
  assert.equal(read.excerpt.startsWith("a b x"), true);
  assert.equal(read.excerpt.length, 2400);
  assert.equal(readGlimpse({ ...glimpse, path: "https://evil.example" }), null);
  assert.equal(readGlimpse({ ...glimpse, trigger: "chat" }), null);
  assert.equal(readGlimpse({ path: "/", trigger: "poke" }), null);
  assert.equal(readGlimpse(null), null);
});

test("tidyRemark holds the model to the bubble", () => {
  assert.deepEqual(tidyRemark({ text: " hm,\n maps. ", mood: "thoughtful" }), { text: "hm, maps.", mood: "thoughtful" });
  assert.equal(tidyRemark({ text: "ok", mood: "furious" })?.mood, "curious");
  assert.equal(tidyRemark({ text: "x".repeat(400), mood: "amused" })?.text.length, 220);
  assert.equal(tidyRemark({ text: "  " }), null);
});

test("glimpsePrompt fences the page text and marks an empty view", () => {
  const prompt = glimpsePrompt(glimpse);
  assert.match(prompt, /Trigger: linger/);
  assert.match(prompt, /<in_view>\nEvery survey ends somewhere.\n<\/in_view>/);
  assert.match(glimpsePrompt({ ...glimpse, excerpt: "" }), /nothing but the page's backdrop/);
});

test("createSpeaker asks for a schema'd remark and drops unfinished answers", async () => {
  const calls: Record<string, unknown>[] = [];
  let stop = "end_turn";
  const client = {
    beta: {
      messages: {
        create: async (params: Record<string, unknown>) => {
          calls.push(params);
          return { stop_reason: stop, content: [{ type: "text", text: '{"text":"a map with no edge?","mood":"curious"}' }] };
        },
      },
    },
  } as unknown as Parameters<typeof createSpeaker>[0]["client"];
  const speak = createSpeaker({ apiKey: "test", client });
  assert.deepEqual(await speak(glimpse), { text: "a map with no edge?", mood: "curious" });
  assert.equal(calls[0].model, "claude-opus-5-5");
  assert.equal(calls[0].fallbacks, "default");
  stop = "max_tokens";
  assert.equal(await speak(glimpse), null);
});

test("createRemarkStore memoises remarks but never a poke or a failure", async () => {
  let calls = 0;
  let fail = false;
  const store = createRemarkStore(async () => {
    calls++;
    return fail ? null : ({ text: `line ${calls}`, mood: "amused" } satisfies Remark);
  });
  assert.equal((await store(glimpse))?.text, "line 1");
  assert.equal((await store(glimpse))?.text, "line 1");
  assert.equal((await store({ ...glimpse, trigger: "poke" }))?.text, "line 2");
  assert.equal((await store({ ...glimpse, trigger: "poke" }))?.text, "line 3");
  fail = true;
  const other = { ...glimpse, heading: "Elsewhere" };
  assert.equal(await store(other), null);
  await new Promise((resolve) => setImmediate(resolve));
  fail = false;
  assert.equal((await store(other))?.text, "line 5");
});

test("createLimiter allows a burst then waits out the window", () => {
  let t = 0;
  const allow = createLimiter(2, 1000, () => t);
  assert.equal(allow("a"), true);
  assert.equal(allow("a"), true);
  assert.equal(allow("a"), false);
  assert.equal(allow("b"), true);
  t = 1001;
  assert.equal(allow("a"), true);
});

test("handleRemark guards origin, shape and rate before calling the model", async () => {
  const remark: Remark = { text: "hello", mood: "excited" };
  const store = createRemarkStore(async () => remark);
  const open = () => true;

  assert.equal((await handleRemark(new Request("https://nca.ink/api/companion/remark"), store, open)).status, 405);
  assert.equal((await handleRemark(post(glimpse, {}), store, open)).status, 403);
  assert.equal((await handleRemark(post(glimpse, { origin: "https://evil.example" }), store, open)).status, 403);
  assert.equal((await handleRemark(post(glimpse), null, open)).status, 503);
  assert.equal((await handleRemark(post("not json"), store, open)).status, 400);
  assert.equal((await handleRemark(post({ ...glimpse, excerpt: "x".repeat(9000) }), store, open)).status, 413);
  assert.equal((await handleRemark(post(glimpse), store, () => false)).status, 429);

  const ok = await handleRemark(post(glimpse), store, open);
  assert.equal(ok.status, 200);
  assert.equal(ok.headers.get("cache-control"), "no-store");
  assert.deepEqual(await ok.json(), remark);

  const failing = createRemarkStore(async () => null);
  assert.equal((await handleRemark(post(glimpse), failing, open)).status, 502);
});
