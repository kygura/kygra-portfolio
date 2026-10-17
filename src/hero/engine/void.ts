/** Sheet 06 · Cipher: an empty black stage. The glyph field is a 2D canvas
 *  layered over it (src/hero/cipher.ts); this only gives the dissolve
 *  something black to fade to and keeps the camera still. */
import * as THREE from "three";
import type { SceneDef } from "./psx";

export function buildVoid(): SceneDef {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const cam = new THREE.PerspectiveCamera(60, 16 / 9, 0.1, 10);
  return {
    scene,
    cam,
    fog: [1, 2],
    fov: [60, 60],
    limits: { pitch: [0, 0], zoom: [1, 1], yaw: 0 },
    labels: [],
    update: () => {},
    readout: () => [["", ""], ["", ""], ["", ""], ["", ""], ["", ""]],
  };
}
