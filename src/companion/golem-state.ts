/**
 * Cairn, the site companion: a small ruined survey golem. This module is the
 * pet's whole simulation (stats, decay over real time, actions) with no DOM
 * or React, so it runs under `node --test` as is. Golem.tsx draws it.
 *
 * Three stats, 0–100:
 *   core  the rune in its chest; drains while awake, refills while resting.
 *         At 0 the golem goes dormant until charged.
 *   form  how much of it still holds together; crumbles slowly, mended by hand.
 *   mood  rises when petted, sinks when ignored.
 * Time passes while the visitor is away too, at the same rates.
 */

export interface GolemState {
  core: number;
  form: number;
  mood: number;
  asleep: boolean;
  hidden: boolean;
  /** First wake, ms since epoch. */
  born: number;
  /** Last time the stats were brought up to date. */
  last: number;
  pets: number;
  /** Dragged position, px from the right and bottom edges; null keeps the default. */
  pos: { r: number; b: number } | null;
}

export type GolemAction = "pet" | "charge" | "mend" | "rest" | "wake";

export type GolemStatus = "dormant" | "asleep" | "crumbling" | "sad" | "content";

/** Change per hour. */
export const RATES = {
  awake: { core: -3, form: -1, mood: -5 },
  asleep: { core: 40, form: -1, mood: -1 },
} as const;

export const GAINS = {
  pet: { mood: 10 },
  charge: { core: 30, mood: 2 },
  mend: { form: 25, mood: 4 },
} as const;

const HOUR = 3_600_000;

const clamp = (n: number) => Math.min(100, Math.max(0, n));

export function fresh(now: number): GolemState {
  return { core: 80, form: 70, mood: 60, asleep: false, hidden: false, born: now, last: now, pets: 0, pos: null };
}

const num = (v: unknown, fallback: number) => (typeof v === "number" && Number.isFinite(v) ? v : fallback);

/** Reads a stored state, filling anything missing or malformed from a fresh one. */
export function parse(raw: string | null, now: number): GolemState {
  const base = fresh(now);
  if (!raw) return base;
  let v: Record<string, unknown>;
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object") return base;
    v = parsed as Record<string, unknown>;
  } catch {
    return base;
  }
  const p = v.pos as Record<string, unknown> | null | undefined;
  return {
    core: clamp(num(v.core, base.core)),
    form: clamp(num(v.form, base.form)),
    mood: clamp(num(v.mood, base.mood)),
    asleep: v.asleep === true,
    hidden: v.hidden === true,
    born: Math.min(num(v.born, now), now),
    // A clock set back must not run the stats backwards.
    last: Math.min(num(v.last, now), now),
    pets: Math.max(0, Math.floor(num(v.pets, 0))),
    pos: p && typeof p === "object" && Number.isFinite(p.r) && Number.isFinite(p.b) ? { r: p.r as number, b: p.b as number } : null,
  };
}

/** Brings the stats up to `now`. A golem whose core runs out stops resting and goes dormant. */
export function decay(s: GolemState, now: number): GolemState {
  const h = Math.max(0, now - s.last) / HOUR;
  if (h === 0) return s;
  const r = s.asleep ? RATES.asleep : RATES.awake;
  const core = clamp(s.core + r.core * h);
  return {
    ...s,
    core,
    form: clamp(s.form + r.form * h),
    mood: clamp(s.mood + r.mood * h),
    // Resting with a full core: it wakes on its own.
    asleep: s.asleep && core < 100,
    last: now,
  };
}

export function status(s: GolemState): GolemStatus {
  if (s.core <= 0) return "dormant";
  if (s.asleep) return "asleep";
  if (s.form < 30) return "crumbling";
  if (s.mood < 25) return "sad";
  return "content";
}

/**
 * Applies an action after bringing the stats up to `now`. A dormant golem
 * answers only to charge; petting or mending a sleeping one wakes it.
 */
export function act(prev: GolemState, action: GolemAction, now: number): GolemState {
  const s = decay(prev, now);
  if (s.core <= 0 && action !== "charge") return s;
  switch (action) {
    case "pet":
      return { ...s, asleep: false, mood: clamp(s.mood + GAINS.pet.mood), pets: s.pets + 1 };
    case "charge":
      return { ...s, core: clamp(s.core + GAINS.charge.core), mood: clamp(s.mood + GAINS.charge.mood) };
    case "mend":
      return { ...s, asleep: false, form: clamp(s.form + GAINS.mend.form), mood: clamp(s.mood + GAINS.mend.mood) };
    case "rest":
      return { ...s, asleep: true };
    case "wake":
      return { ...s, asleep: false };
  }
}

/** Whole days since the first wake. */
export const age = (s: GolemState, now: number) => Math.max(0, Math.floor((now - s.born) / (24 * HOUR)));
