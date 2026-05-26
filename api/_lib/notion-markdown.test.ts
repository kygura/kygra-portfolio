import assert from "node:assert/strict";
import test from "node:test";

import { notionMarkdownBlocksToString } from "./notion-markdown.ts";
import type { MdBlock, MdStringObject } from "notion-to-md/build/types";

test("notionMarkdownBlocksToString falls back when quote children cannot be serialized", () => {
  const blocks: MdBlock[] = [
    {
      type: "quote",
      blockId: "quote-1",
      parent: "> [!NOTE] Parent note",
      children: [
        {
          type: "paragraph",
          blockId: "child-1",
          parent: "",
          children: [],
        },
      ],
    },
  ];
  const serializer = {
    toMarkdownString(): MdStringObject {
      throw new TypeError("Cannot read properties of undefined (reading 'split')");
    },
  };

  assert.equal(notionMarkdownBlocksToString(blocks, serializer), "> [!NOTE] Parent note");
});

test("notionMarkdownBlocksToString returns child-page markdown when parent key is absent", () => {
  const blocks: MdBlock[] = [];
  const serializer = {
    toMarkdownString(): MdStringObject {
      return {
        "Nested note": "# Nested note\n\nBody",
      };
    },
  };

  assert.equal(notionMarkdownBlocksToString(blocks, serializer), "# Nested note\n\nBody");
});
