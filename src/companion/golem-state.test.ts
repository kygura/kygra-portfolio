import { test } from "node:test";
import assert from "node:assert/strict";
import { act, age, decay, fresh, parse, RATES, status } from "./golem-state.ts";

const HOUR = 3_600_000;
const T0 = Date.UTC(2026, 0, 1);

test("parse falls back to a fresh golem on missing or broken storage", () => {
  assert.deepEqual(parse(null, T0), fresh(T0));
  assert.deepEqual(parse("{not json", T0), fresh(T0));
  assert.deepEqual(parse("42", T0), fresh(T0));
});

test("parse clamps stats and drops a malformed position", () => {
  const s = parse(JSON.stringify({ core: 400, form: -5, mood: "x", pets: 3.7, pos: { r: "a", b: 2 } }), T0);
  assert.equal(s.core, 100);
  assert.equal(s.form, 0);
  assert.equal(s.mood, fresh(T0).mood);
  assert.equal(s.pets, 3);
  assert.equal(s.pos, null);
});

test("parse never lets the last update sit in the future", () => {
  const s = parse(JSON.stringify({ last: T0 + 10 * HOUR }), T0);
  assert.equal(s.last, T0);
});

test("decay runs at the awake rates per hour", () => {
  const s = decay({ ...fresh(T0), core: 50, form: 50, mood: 50 }, T0 + 2 * HOUR);
  assert.equal(s.core, 50 + RATES.awake.core * 2);
  assert.equal(s.form, 50 + RATES.awake.form * 2);
  assert.equal(s.mood, 50 + RATES.awake.mood * 2);
  assert.equal(s.last, T0 + 2 * HOUR);
});

test("resting refills the core and wakes it once full", () => {
  const s = decay({ ...fresh(T0), core: 10, asleep: true }, T0 + 5 * HOUR);
  assert.equal(s.core, 100);
  assert.equal(s.asleep, false);
});

test("a long absence leaves it dormant, and only charging answers", () => {
  const away = decay(fresh(T0), T0 + 40 * HOUR);
  assert.equal(away.core, 0);
  assert.equal(status(away), "dormant");
  assert.equal(act(away, "pet", away.last).pets, 0);
  const charged = act(away, "charge", away.last);
  assert.ok(charged.core > 0);
  assert.notEqual(status(charged), "dormant");
});

test("actions raise their stat, cap at 100 and count pets", () => {
  let s = { ...fresh(T0), mood: 95, asleep: true };
  s = act(s, "pet", T0);
  assert.equal(s.mood, 100);
  assert.equal(s.pets, 1);
  assert.equal(s.asleep, false, "petting wakes it");
  s = act({ ...s, form: 10 }, "mend", T0);
  assert.equal(s.form, 35);
  assert.equal(act(s, "rest", T0).asleep, true);
});

test("status reports the most pressing condition", () => {
  assert.equal(status({ ...fresh(T0), asleep: true }), "asleep");
  assert.equal(status({ ...fresh(T0), form: 10, mood: 5 }), "crumbling");
  assert.equal(status({ ...fresh(T0), mood: 5 }), "sad");
  assert.equal(status(fresh(T0)), "content");
});

test("age counts whole days", () => {
  assert.equal(age(fresh(T0), T0 + 47 * HOUR), 1);
});
