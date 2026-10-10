import assert from "node:assert/strict";
import test from "node:test";

import {
  A72,
  DEG,
  TAU,
  angLerp,
  baseHeight,
  bodyGoal,
  bodySpec,
  cameraPosition,
  clampRes,
  hexToRgb,
  idleDrift,
  lerpGoal,
  luminance,
  raDec,
  rampIndex,
  sectionGoal,
  sectionRotation,
  snap45,
  snapHalfDeg,
  stepDown,
  sunLevel,
  targetWidth,
  tone,
  viewOffsetFrac,
  wrapAngle,
} from "./math.ts";

const close = (a: number, b: number, eps = 1e-9) => assert.ok(Math.abs(a - b) < eps, `${a} != ${b}`);

test("internal resolution: 240 desktop/tablet, 120 mobile, even widths", () => {
  assert.equal(baseHeight(1440), 240);
  assert.equal(baseHeight(640), 240);
  assert.equal(baseHeight(639), 120);
  assert.equal(targetWidth(240, 1920, 1080), 426);
  assert.equal(targetWidth(120, 390, 292.5), 160); // 4:3 band
  assert.equal(targetWidth(240, 1440, 900) % 2, 0);
});

test("res steps: step-down floors at 120, :res snaps to 120/180/240", () => {
  assert.equal(stepDown(240), 180);
  assert.equal(stepDown(180), 120);
  assert.equal(stepDown(120), 120);
  assert.equal(clampRes(360), 240);
  assert.equal(clampRes(170), 180);
  assert.equal(clampRes(0), 120);
});

test("view offset: desktop 12%, mobile none, tablet centres on the open region", () => {
  assert.equal(viewOffsetFrac(1440, 1440, 470), 0.12);
  assert.equal(viewOffsetFrac(390, 390, 0), 0);
  close(viewOffsetFrac(800, 800, 400), 0.25);
});

test("angles wrap the short way round", () => {
  close(wrapAngle(Math.PI + 0.1), -Math.PI + 0.1);
  close(angLerp(170 * DEG, -170 * DEG, 0.5), 180 * DEG);
  close(angLerp(0, 90 * DEG, 0.25), 22.5 * DEG);
});

test("section rotation: 72 degrees per region, shortest path", () => {
  close(sectionRotation(0, 1), A72);
  close(sectionRotation(0, 4), -A72); // 0 -> log goes back one step, not forward four
  close(sectionRotation(4 * A72, 0), 5 * A72); // log -> projects continues forward
  close(sectionRotation(TAU * 3, 2), TAU * 3 + 2 * A72);
});

test("camera goals: five regions, body goal frames the body off-centre", () => {
  assert.deepEqual(sectionGoal(1).t, [0, 2.5, 0]);
  assert.deepEqual(sectionGoal(3).t, [0, 2, -2]);
  assert.equal(sectionGoal(4).yaw, Math.PI);
  assert.deepEqual(sectionGoal(6), sectionGoal(1));
  const g = bodyGoal([0, 0, 3]);
  close(g.yaw, 28 * DEG);
  assert.equal(g.d, 6.5);
  const goal = sectionGoal(2);
  goal.t[0] = 99;
  assert.equal(sectionGoal(2).t[0], 0, "returns copies");
});

test("12-frame tween interpolates every field", () => {
  const a = { t: [0, 0, 0] as [number, number, number], yaw: 0, el: 0, d: 6 };
  const b = { t: [12, 0, -12] as [number, number, number], yaw: 60 * DEG, el: 12 * DEG, d: 12 };
  const m = lerpGoal(a, b, 6 / 12);
  assert.deepEqual(m.t, [6, 0, -6]);
  close(m.yaw, 30 * DEG);
  close(m.el, 6 * DEG);
  assert.equal(m.d, 9);
  assert.deepEqual(lerpGoal(a, b, 1).t, b.t);
});

test("camera orbit position", () => {
  const p = cameraPosition([0, 0, 0], 0, 0, 6);
  close(p[0], 0);
  close(p[2], 6);
  const q = cameraPosition([1, 2, 3], Math.PI / 2, 0, 2);
  close(q[0], 3);
  close(q[1], 2);
  close(q[2], 3);
});

test("motion helpers: parallax snaps to 0.5 deg, drift bounds, sun steps, totem 45 deg", () => {
  close(snapHalfDeg(1.3), 1.5 * DEG);
  close(snapHalfDeg(-2.74), -2.5 * DEG);
  close(idleDrift(5).yaw, 2 * DEG);
  close(idleDrift(2.5).el, 1 * DEG);
  assert.deepEqual([0, 2, 4, 6, 8].map(sunLevel), [0.6, 0.8, 1, 0.8, 0.6]);
  close(snap45(50 * DEG), 45 * DEG);
});

test("bodies cycle 6 kinds; orbits grow outward", () => {
  assert.deepEqual([0, 1, 5, 6, 7].map((i) => bodySpec(i).kind), [0, 1, 5, 0, 1]);
  assert.equal(bodySpec(0).scale, 0.42);
  close(bodySpec(5).w, 0.02);
  assert.ok(bodySpec(3).a > bodySpec(2).a);
  close(bodySpec(1).b, bodySpec(1).a * 0.72);
});

test("RA/DEC readout", () => {
  const a = raDec(0, 0, 5);
  close(a.ra, 0);
  close(a.dec, 0);
  close(raDec(-1, 0, 0).ra, 18);
  close(raDec(0, 1, 0).dec, 90);
});

test("palette colours: hex parse, luminance, tone", () => {
  assert.deepEqual(hexToRgb("#ff0000"), [1, 0, 0]);
  assert.deepEqual(hexToRgb(" #fff"), [1, 1, 1]);
  assert.deepEqual(hexToRgb(""), [0, 0, 0]);
  close(luminance([1, 1, 1]), 1);
  const t = tone(hexToRgb("#57c4a9"), 0.3);
  close(luminance(t), 0.3, 1e-6);
  assert.ok(tone([1, 1, 1], 2).every((v) => v === 1), "channels clamp at 1");
});

test("ramp mapping mirrors the post pass: bg..acc, fg above .95", () => {
  const bgL = luminance(hexToRgb("#0c0b10"));
  assert.equal(rampIndex(bgL, bgL, 0), 0);
  assert.equal(rampIndex(0.96, bgL, 0), -1);
  assert.equal(rampIndex(0.9, bgL, 0.9), 4);
  assert.equal(rampIndex(0.5, bgL, 0), 1);
  assert.equal(rampIndex(0.5, bgL, 0.5), 2);
  assert.equal(rampIndex(0, bgL, 0.99), 0);
});
