/** A three-masted fantasy galleon, shared by the Voyage (sea) and Aloft (sky) sheets. Bow points +x; the deck sits at y ≈ 1.8. */
import * as THREE from "three";
import type { PsxKit, V3 } from "./psx";

export interface Galleon {
  group: THREE.Group;
  /** Billowed sails; the scene breathes them through `scale.x`. */
  sails: THREE.Mesh[];
  /** Pennants at the mastheads; the scene flutters them through `rotation.y`. */
  pennants: THREE.Object3D[];
  /** Sky rig only: membrane wings (port, starboard), keel crystal, stern screw. */
  wings: THREE.Group[];
  crystal: THREE.Mesh | null;
  screw: THREE.Group | null;
  /** Local anchors for labels and eggs. */
  mainTop: V3;
  lantern: V3;
}

export function buildGalleon(k: PsxKit, sky = false): Galleon {
  const { facet, mesh, psx, M, tex, segs } = k;
  const group = new THREE.Group();
  const { add, flush } = k.batcher();
  const mat = {
    hull: psx({ map: tex.tBark, tint: "#8a7260", uv: 2, amb: "#4e5a62" }),
    deck: psx({ map: tex.tBark, tint: "#b29a80", uv: 3 }),
    trim: psx({ map: tex.tPlain, tint: "#3a3430", amb: "#3c464c" }),
    mast: psx({ map: tex.tBark, tint: "#9c8670" }),
    sail: psx({ map: tex.tPlain, tint: "#ece4cf", amb: "#808c92", side: THREE.DoubleSide }),
    sailHi: psx({ map: tex.tPlain, tint: "#e4dccb", amb: "#808c92", side: THREE.DoubleSide, emit: 0.12 }),
  };
  const up = new THREE.Vector3(0, 1, 0);

  /* ---- hull: a box pinched to a bow, rounded under, sheer rising fore and aft ---- */
  const L = 14, HH = 2.6, W = 4;
  const hg = new THREE.BoxGeometry(L, HH, W, 14, 3, 2);
  hg.translate(0, 0.5, 0);
  const hp = hg.attributes.position;
  for (let i = 0; i < hp.count; i++) {
    const x = hp.getX(i), y = hp.getY(i), z = hp.getZ(i);
    const f = (x + L / 2) / L, v = (y + 0.8) / HH;
    let beam = f > 0.62 ? Math.sqrt(Math.max(0, (1 - f) / 0.38)) : f < 0.08 ? 0.82 + f * 2.25 : 1;
    beam = Math.max(beam, 0.05) * (0.4 + 0.6 * Math.min(1, v * 1.6));
    const sheer = v * 0.9 * (2 * f - 1) ** 2 * (f < 0.5 ? 1.2 : 0.8);
    const rake = (1 - v) * Math.max(0, f - 0.75) * 4;
    hp.setXYZ(i, x, y + sheer + rake, z * beam);
  }
  add(facet(hg, 0.03), mat.hull);
  // deck, gunwale stripe, gunports
  add(facet(new THREE.BoxGeometry(9.6, 0.08, 3.5)), mat.deck, -0.4, 1.78, 0);
  for (const s of [-1, 1]) {
    add(facet(new THREE.BoxGeometry(8.4, 0.12, 0.05)), M.glyph, -0.6, 1.05, s * 1.98);
    for (let gx = -4; gx <= 3; gx += 1.4) add(facet(new THREE.BoxGeometry(0.42, 0.34, 0.06)), mat.trim, gx, 0.6, s * 1.96);
  }
  // sterncastle with lit windows, forecastle, rails
  add(facet(new THREE.BoxGeometry(3.4, 1.6, 3.5)), mat.hull, -5.3, 2.6, 0);
  add(facet(new THREE.BoxGeometry(3.7, 0.12, 3.8)), mat.trim, -5.3, 3.45, 0);
  add(facet(new THREE.BoxGeometry(0.06, 0.4, 2.4)), M.glyph, -7.02, 2.55, 0);
  for (const s of [-1, 1]) add(facet(new THREE.BoxGeometry(2.4, 0.3, 0.05)), M.glyph, -5.3, 2.6, s * 1.77);
  add(facet(new THREE.BoxGeometry(2.4, 0.9, 2.1)), mat.hull, 5.2, 2.2, 0);
  add(facet(new THREE.BoxGeometry(2.6, 0.1, 2.3)), mat.trim, 5.2, 2.68, 0);
  for (const s of [-1, 1]) add(facet(new THREE.BoxGeometry(6.6, 0.32, 0.06)), mat.trim, 0.2, 2.0, s * 1.74);
  // stern lanterns, bowsprit and a figurehead
  const lantern = new THREE.Vector3(-7.2, 3.9, 0);
  for (const s of [-1, 1]) {
    add(facet(new THREE.CylinderGeometry(0.03, 0.03, 0.6, 4)), mat.trim, -7.1, 3.7, s * 1.4);
    add(facet(new THREE.OctahedronGeometry(0.22, 0)), M.glyph, -7.2, 3.95, s * 1.4);
  }
  const bsA = new THREE.Vector3(6.2, 2.4, 0), bsB = new THREE.Vector3(10.4, 3.6, 0);
  const bs = new THREE.CylinderGeometry(0.06, 0.13, bsA.distanceTo(bsB), 5);
  bs.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(up, bsB.clone().sub(bsA).normalize()));
  add(facet(bs), mat.mast, (bsA.x + bsB.x) / 2, (bsA.y + bsB.y) / 2, 0);
  const fig = new THREE.OctahedronGeometry(0.5, 0);
  fig.scale(1.6, 0.7, 0.6);
  add(facet(fig), M.glyph, 7.2, 1.7, 0, 0, 0, -0.5);

  /* ---- masts, yards, square sails in three tiers ---- */
  const DY = 1.8;
  const rig: V3[] = [];
  const sails: THREE.Mesh[] = [];
  const pennants: THREE.Object3D[] = [];
  // Square sail hanging from its yard (top edge at y = 0), bellied toward the bow.
  const sailGeo = (w: number, h: number, belly: number) => {
    const g = new THREE.PlaneGeometry(w, h, 4, 3);
    const p = g.attributes.position;
    for (let i = 0; i < p.count; i++) {
      const u = p.getX(i) / w * 2, v = p.getY(i) / h + 0.5;
      const flare = 0.86 + 0.14 * (1 - v);
      p.setXYZ(i, p.getX(i) * flare, p.getY(i) - h / 2, belly * (1 - u * u) * (0.55 + 0.45 * (1 - (2 * v - 1) ** 2)));
    }
    g.rotateY(Math.PI / 2);
    return facet(g);
  };
  const masts: [number, number][] = [[-3.2, 9.5], [0.6, 13], [4.2, 11]];
  let mainTop = new THREE.Vector3();
  const tops: V3[] = [];
  masts.forEach(([mx, mh], mi) => {
    add(facet(new THREE.CylinderGeometry(0.1, 0.19, mh, 6)), mat.mast, mx, DY + mh / 2, 0);
    const top = new THREE.Vector3(mx, DY + mh, 0);
    tops.push(top);
    if (mi === 1) mainTop = top.clone();
    // fighting top
    add(facet(new THREE.CylinderGeometry(0.55, 0.45, 0.16, 6)), mat.trim, mx, DY + mh * 0.6, 0);
    const span = mh / 13;
    for (let tier = 0; tier < 3; tier++) {
      const yy = DY + mh * (0.42 + tier * 0.25), w = (5.2 - tier * 1.3) * span + 0.4, h = mh * 0.22;
      const yard = new THREE.CylinderGeometry(0.06, 0.06, w + 0.6, 4).rotateX(Math.PI / 2);
      add(facet(yard), mat.mast, mx + 0.12, yy, 0);
      const s = new THREE.Mesh(sailGeo(w, h, 0.9 - tier * 0.15), tier === 2 ? mat.sailHi : mat.sail);
      s.position.set(mx + 0.18, yy - 0.05, 0);
      group.add(s);
      sails.push(s);
      // sheets from the clews down to the next yard or the rail
      for (const sz of [-1, 1]) rig.push(new THREE.Vector3(mx + 0.2, yy - h, sz * w * 0.43), new THREE.Vector3(mx + 0.2, tier ? yy - h - 0.6 : DY + 0.3, sz * (tier ? w * 0.5 : 1.7)));
    }
    // shrouds down to the rails
    for (const sz of [-1, 1]) for (const dx of [-0.8, 0, 0.8]) rig.push(new THREE.Vector3(mx, DY + mh * 0.6, sz * 0.45), new THREE.Vector3(mx + dx, DY + 0.25, sz * 1.75));
    for (const sz of [-1, 1]) rig.push(new THREE.Vector3(mx, DY + mh * 0.95, 0), new THREE.Vector3(mx, DY + mh * 0.6, sz * 0.5));
    // masthead pennant: a thin accent triangle that flutters
    const pg = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, 0.25, 0), new THREE.Vector3(0, -0.25, 0), new THREE.Vector3(-2.4 + mi * 0.3, 0, 0)]);
    pg.computeVertexNormals();
    const pen = new THREE.Mesh(pg, new THREE.MeshBasicMaterial({ color: k.U.uAccent.value, side: THREE.DoubleSide }));
    pen.position.copy(top).y += 0.1;
    group.add(pen);
    pennants.push(pen);
  });
  // stays: bowsprit to foremast, fore to main, main to mizzen, mizzen to stern
  rig.push(bsB, tops[2], tops[2], tops[1], tops[1], tops[0], tops[0], new THREE.Vector3(-6.8, 3.5, 0));
  rig.push(bsB, new THREE.Vector3(4.2, DY + 7, 0));
  // jib: one triangle from bowsprit to foremast
  const jib = new THREE.BufferGeometry().setFromPoints([bsB.clone(), new THREE.Vector3(4.35, DY + 9.6, 0), new THREE.Vector3(6.6, 2.7, 0)]);
  jib.computeVertexNormals();
  mesh(jib, mat.sail, group);
  const rigging = segs(rig, M.lBoneDim);
  rigging.frustumCulled = false;
  group.add(rigging);

  /* ---- sky rig: membrane wings, a keel crystal that keeps her up, a stern screw ---- */
  const wings: THREE.Group[] = [];
  let crystal: THREE.Mesh | null = null, screw: THREE.Group | null = null;
  if (sky) {
    const wingMat = psx({ map: tex.tPlain, tint: "#c8c0b0", amb: "#6c7880", side: THREE.DoubleSide, emit: 0.4 });
    for (const s of [-1, 1]) {
      const wg = new THREE.Group();
      wg.position.set(0.4, 1.7, s * 1.9);
      group.add(wg);
      const root = new THREE.Vector3(0, 0, 0), tips: V3[] = [];
      for (let i = 0; i < 5; i++) tips.push(new THREE.Vector3(2.6 - i * 1.7, 0.9 - i * 0.55 - (i === 4 ? 0.3 : 0), s * (6.8 - Math.abs(i - 1.2) * 0.9)));
      const pts: V3[] = [], ribs: V3[] = [];
      for (let i = 0; i < tips.length - 1; i++) {
        const mid = tips[i].clone().lerp(tips[i + 1], 0.5).multiplyScalar(0.8);
        pts.push(root, tips[i], mid, root, mid, tips[i + 1]);
      }
      tips.forEach((tp) => ribs.push(root, tp));
      const mg = new THREE.BufferGeometry().setFromPoints(pts);
      mg.computeVertexNormals();
      mesh(mg, wingMat, wg);
      wg.add(segs(ribs, M.lAccent));
      wings.push(wg);
    }
    // keel struts and the floating crystal
    for (const sx of [-1.5, 1.5]) add(facet(new THREE.CylinderGeometry(0.06, 0.06, 1.6, 4)), mat.trim, sx, -1.4, 0, 0, 0, sx * 0.25);
    const cg = new THREE.OctahedronGeometry(0.9, 0);
    cg.scale(1, 1.9, 1);
    crystal = mesh(facet(cg), M.glyph, group, 0, -3.1, 0);
    screw = new THREE.Group();
    screw.position.set(-7.4, 0.6, 0);
    group.add(screw);
    for (let b = 0; b < 4; b++) {
      const blade = new THREE.Mesh(facet(new THREE.BoxGeometry(0.08, 1.5, 0.36)), mat.sail);
      blade.position.set(0, Math.cos((b / 4) * Math.PI * 2) * 0.75, Math.sin((b / 4) * Math.PI * 2) * 0.75);
      blade.rotation.set((b / 4) * Math.PI * 2, 0.4, 0);
      screw.add(blade);
    }
    add(facet(new THREE.CylinderGeometry(0.12, 0.2, 1.0, 5).rotateZ(Math.PI / 2)), mat.trim, -7.0, 0.6, 0);
  }

  flush(group);
  return { group, sails, pennants, wings, crystal, screw, mainTop, lantern };
}
