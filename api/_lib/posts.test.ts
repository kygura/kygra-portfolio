import assert from "node:assert/strict";
import test from "node:test";

import {
  putVerifiedTextBlob,
  readBlobText,
  setBlobClientForTesting,
} from "./posts.ts";

type TestBlobClient = NonNullable<Parameters<typeof setBlobClientForTesting>[0]>;
type TestBlobGetResult = Awaited<ReturnType<NonNullable<TestBlobClient["get"]>>>;
type TestBlobPutResult = Awaited<ReturnType<NonNullable<TestBlobClient["put"]>>>;

function createStream(text: string) {
  return new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(text));
      controller.close();
    },
  });
}

test("putVerifiedTextBlob uploads non-empty markdown and verifies the readback", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  const store = new Map<string, { text: string; contentType: string }>();

  setBlobClientForTesting({
    put: async (pathname, body, options) => {
      store.set(pathname, {
        text: String(body),
        contentType: options.contentType ?? "text/plain; charset=utf-8",
      });

      return {
        pathname,
        url: `https://blob.example/${pathname}`,
      } as TestBlobPutResult;
    },
    get: async (pathname) => {
      const entry = store.get(pathname);

      if (!entry) {
        return null;
      }

      return {
        statusCode: 200,
        headers: new Headers({
          "content-type": entry.contentType,
        }),
        stream: createStream(entry.text),
        blob: {},
      } as TestBlobGetResult;
    },
  });
  t.after(() => setBlobClientForTesting(null));

  const uploaded = await putVerifiedTextBlob(
    "posts/example.md",
    "---\ntitle: \"Example\"\n---\n\nHello world\n",
    "text/markdown; charset=utf-8",
    "markdown",
  );

  assert.equal(uploaded.pathname, "posts/example.md");
  assert.equal(store.get("posts/example.md")?.text, "---\ntitle: \"Example\"\n---\n\nHello world\n");
});

test("putVerifiedTextBlob rejects empty markdown before upload", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  let putCalls = 0;

  setBlobClientForTesting({
    put: async () => {
      putCalls += 1;
      return {
        pathname: "posts/empty.md",
        url: "https://blob.example/posts/empty.md",
      } as TestBlobPutResult;
    },
  });
  t.after(() => setBlobClientForTesting(null));

  await assert.rejects(
    putVerifiedTextBlob("posts/empty.md", "   \n\t", "text/markdown; charset=utf-8", "markdown"),
    /Refusing to upload empty markdown blob/,
  );
  assert.equal(putCalls, 0);
});

test("readBlobText decodes blob SDK streams", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  setBlobClientForTesting({
    get: async () => ({
      statusCode: 200,
      headers: new Headers({
        "content-type": "text/markdown; charset=utf-8",
      }),
      stream: createStream("---\ntitle: \"Decoded\"\n---\n\nBody\n"),
      blob: {},
    } as TestBlobGetResult),
  });
  t.after(() => setBlobClientForTesting(null));

  const text = await readBlobText("posts/decoded.md", { kind: "markdown" });

  assert.equal(text, "---\ntitle: \"Decoded\"\n---\n\nBody\n");
});

test("readBlobText rejects HTML payloads for markdown blobs", async (t) => {
  process.env.BLOB_READ_WRITE_TOKEN = "test-token";

  setBlobClientForTesting({
    get: async () => ({
      statusCode: 200,
      headers: new Headers({
        "content-type": "text/html; charset=utf-8",
      }),
      stream: createStream("<!doctype html><html><body><div id=\"root\"></div></body></html>"),
      blob: {},
    } as TestBlobGetResult),
  });
  t.after(() => setBlobClientForTesting(null));

  await assert.rejects(
    readBlobText("posts/html.md", { kind: "markdown" }),
    /returned HTML content-type instead of markdown/,
  );
});
