import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildCommands, matchCommands } from "./commands.ts";

const commands = buildCommands({
  projects: [{ title: "Hyperion" }, { title: "Noted" }],
  notes: [{ title: "Thaumazein", path: "/writings/thaumazein" }],
});
const names = commands.map((c) => c.name);

describe("command table (A7)", () => {
  it("has every production command", () => {
    for (const n of [
      "projects", "notes", "links", "now", "log",
      "open hyperion", "open noted", "read thaumazein",
      "cv", "about", "sign", "fortune",
      "theme sodium", "theme phosphor", "theme oxide", "theme coldstar",
      "motion on", "motion off", "res 120", "res 180", "res 240",
      "look", "yank email", "help", "boot",
    ]) {
      assert.ok(names.includes(n), n);
    }
  });
  it("drops the mock debug commands and res 360", () => {
    for (const n of ["ps1 on", "ps1 off", "scan on", "scan off", "res 360"]) assert.ok(!names.includes(n), n);
  });
  it("commands are data actions with chips", () => {
    const log = commands.find((c) => c.name === "log")!;
    assert.deepEqual(log.action, { type: "section", to: "log" });
    assert.equal(log.key, "gb");
    assert.deepEqual(commands.find((c) => c.name === "read thaumazein")!.action, { type: "navigate", to: "/writings/thaumazein" });
    assert.deepEqual(commands.find((c) => c.name === "theme oxide")!.action, { type: "palette", palette: "oxide" });
    assert.equal(commands.find((c) => c.name === "res 180")!.key, null);
  });
  it("fuzzy matches with highlight ranges, max 8", () => {
    const r = matchCommands(commands, "thox");
    assert.equal(r[0].command.name, "theme oxide");
    assert.deepEqual(r[0].match.ranges, [[0, 2], [6, 8]]);
    assert.equal(matchCommands(commands, "").length, 8);
    assert.deepEqual(matchCommands(commands, "zzz"), []);
  });
});
