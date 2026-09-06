import * as THREE from 'three';

/**
 * Единый реестр материалов. Все материалы сцены создаются здесь,
 * чтобы можно было разом переключать wireframe и ночной режим.
 */
const registry = [];

function reg(mat) {
  registry.push(mat);
  return mat;
}

const std = (params) => reg(new THREE.MeshStandardMaterial(params));
const phys = (params) => reg(new THREE.MeshPhysicalMaterial(params));

export const MAT = {
  // --- покрытия аэродрома ---
  asphalt: std({ color: 0x2b2f34, roughness: 0.96, metalness: 0.0 }),
  runway: std({ color: 0x24272b, roughness: 0.92 }),
  apron: std({ color: 0x3a3e44, roughness: 0.95 }),
  concrete: std({ color: 0x6f7378, roughness: 0.9 }),
  grass: std({ color: 0x53703f, roughness: 1.0 }),
  grassDark: std({ color: 0x47603a, roughness: 1.0 }),
  soil: std({ color: 0x5c5140, roughness: 1.0 }),

  // --- разметка ---
  markWhite: std({ color: 0xe8e8e4, roughness: 0.75, emissive: 0x0a0a0a }),
  markYellow: std({ color: 0xd8b23a, roughness: 0.8 }),
  markRed: std({ color: 0xa8332c, roughness: 0.8 }),

  // --- терминал ---
  roofGold: std({ color: 0xb98f42, roughness: 0.42, metalness: 0.72 }),
  roofGoldDark: std({ color: 0x8b6a30, roughness: 0.5, metalness: 0.6 }),
  glassTerminal: phys({
    color: 0x7ba3c0, roughness: 0.06, metalness: 0.25,
    transparent: true, opacity: 0.42, side: THREE.DoubleSide,
    clearcoat: 0.9, clearcoatRoughness: 0.05,
  }),
  glassDark: phys({
    color: 0x24333f, roughness: 0.12, metalness: 0.35,
    transparent: true, opacity: 0.72, side: THREE.DoubleSide,
  }),
  mullion: std({ color: 0xb9c2ca, roughness: 0.4, metalness: 0.75 }),
  wallLight: std({ color: 0xd6d9dc, roughness: 0.8 }),
  wallGrey: std({ color: 0x9aa1a8, roughness: 0.85 }),
  wallDark: std({ color: 0x4c5157, roughness: 0.85 }),
  steel: std({ color: 0x8d959c, roughness: 0.35, metalness: 0.85 }),
  floorInside: std({ color: 0xc8ccd0, roughness: 0.55, metalness: 0.05 }),

  // --- вышка / оборудование ---
  towerShaft: std({ color: 0xc3c8cd, roughness: 0.7 }),
  towerGlass: phys({
    color: 0x2f4a5c, roughness: 0.05, metalness: 0.5,
    transparent: true, opacity: 0.8, side: THREE.DoubleSide,
  }),

  // --- авиатехника ---
  fuselage: std({ color: 0xf2f4f6, roughness: 0.3, metalness: 0.18 }),
  engine: std({ color: 0xd7dade, roughness: 0.35, metalness: 0.35 }),
  engineCore: std({ color: 0x1b1e21, roughness: 0.6, metalness: 0.4 }),
  tyre: std({ color: 0x17191b, roughness: 0.95 }),
  cockpitGlass: std({ color: 0x141b22, roughness: 0.12, metalness: 0.6 }),
  jetbridge: std({ color: 0xa9b0b7, roughness: 0.6, metalness: 0.3 }),

  // --- наземная техника ---
  vehicleWhite: std({ color: 0xe4e7ea, roughness: 0.5 }),
  vehicleBlue: std({ color: 0x2f6fa8, roughness: 0.5 }),
  vehicleYellow: std({ color: 0xd9a326, roughness: 0.5 }),
  vehicleGrey: std({ color: 0x6d747b, roughness: 0.6 }),

  // --- окружение ---
  trunk: std({ color: 0x4a3a2c, roughness: 1.0 }),
  foliage: std({ color: 0x2f4a2a, roughness: 1.0 }),
  water: phys({ color: 0x1c3b52, roughness: 0.12, metalness: 0.1, transparent: true, opacity: 0.88 }),
  buildingGeneric: std({ color: 0x8b9299, roughness: 0.85 }),
  fence: std({ color: 0x707880, roughness: 0.7, metalness: 0.4 }),
};

// --- Излучающие (управляются суточным циклом) ---
const emissives = [];
function em(color, intensity = 1) {
  const m = reg(new THREE.MeshStandardMaterial({
    color: 0x0c0c0c, emissive: color, emissiveIntensity: 0, roughness: 0.6,
    toneMapped: false,
  }));
  emissives.push({ mat: m, peak: intensity });
  return m;
}

export const EMIT = {
  windowWarm: em(0xffd79a, 1.6),
  windowCool: em(0xbfe4ff, 1.2),
  runwayWhite: em(0xffffff, 2.4),
  runwayRed: em(0xff3a2a, 2.6),
  runwayGreen: em(0x2dff7a, 2.6),
  taxiBlue: em(0x3aa0ff, 2.2),
  approachLead: em(0xfff2c0, 3.0),
  beaconRed: em(0xff2a2a, 3.2),
  apronFlood: em(0xfff0cf, 2.0),
  signYellow: em(0xffcc44, 1.8),
  navGreen: em(0x22ff55, 3.0),
  navRedNav: em(0xff2222, 3.0),
};

/** 0 — день (всё погашено), 1 — ночь (всё горит). */
export function setNightFactor(f) {
  for (const { mat, peak } of emissives) {
    mat.emissiveIntensity = peak * f;
  }
}

export function setWireframe(on) {
  for (const m of registry) {
    m.wireframe = on;
  }
}

/** Клон базового материала с другим цветом — для ливрей самолётов. */
export function liveryMaterial(color, opts = {}) {
  return std({ color, roughness: 0.35, metalness: 0.2, ...opts });
}

export function registerMaterial(mat) {
  return reg(mat);
}
