import * as THREE from 'three';

/**
 * Палитра архитектурного макета: светлые нейтральные поверхности,
 * приглушённая насыщенность, честный PBR с отражениями окружения.
 * Все материалы регистрируются, чтобы разом переключать wireframe,
 * ночной режим и карту окружения.
 */
const registry = [];

function reg(mat) {
  registry.push(mat);
  return mat;
}

const std = (params) => reg(new THREE.MeshStandardMaterial({ envMapIntensity: 0.9, ...params }));
const phys = (params) => reg(new THREE.MeshPhysicalMaterial({ envMapIntensity: 1.0, ...params }));

export const MAT = {
  // --- покрытия аэродрома ---
  asphalt: std({ color: 0x787571, roughness: 0.88, metalness: 0.0 }),
  runway: std({ color: 0x6d6a66, roughness: 0.85 }),
  apron: std({ color: 0x8f8c87, roughness: 0.82 }),
  concrete: std({ color: 0xc2beb6, roughness: 0.8 }),
  grass: std({ color: 0xadb098, roughness: 0.95 }),
  grassDark: std({ color: 0xa0a58c, roughness: 0.95 }),
  soil: std({ color: 0xb2a68f, roughness: 1.0 }),

  // --- разметка ---
  markWhite: std({ color: 0xfbfaf7, roughness: 0.55 }),
  markYellow: std({ color: 0xd8bd6a, roughness: 0.65 }),
  markRed: std({ color: 0xc08079, roughness: 0.7 }),

  // --- терминал ---
  roofGold: std({ color: 0xc7a367, roughness: 0.34, metalness: 0.85 }),
  roofGoldDark: std({ color: 0xa4834b, roughness: 0.42, metalness: 0.8 }),
  glassTerminal: phys({
    color: 0xcfdde6, roughness: 0.04, metalness: 0.0,
    transparent: true, opacity: 0.46, side: THREE.DoubleSide,
    clearcoat: 1.0, clearcoatRoughness: 0.03, envMapIntensity: 1.6,
  }),
  glassDark: phys({
    color: 0x8ea3b0, roughness: 0.06, metalness: 0.1,
    transparent: true, opacity: 0.55, side: THREE.DoubleSide,
    clearcoat: 1.0, clearcoatRoughness: 0.05, envMapIntensity: 1.4,
  }),
  mullion: std({ color: 0xd7d9db, roughness: 0.35, metalness: 0.6 }),
  wallLight: std({ color: 0xeeece7, roughness: 0.75 }),
  wallGrey: std({ color: 0xc8c6c1, roughness: 0.8 }),
  wallDark: std({ color: 0x8d8b87, roughness: 0.8 }),
  steel: std({ color: 0xc4c7ca, roughness: 0.3, metalness: 0.8 }),
  floorInside: std({ color: 0xe2e0db, roughness: 0.4, metalness: 0.0 }),

  // --- вышка / оборудование ---
  towerShaft: std({ color: 0xe6e4df, roughness: 0.65 }),
  towerGlass: phys({
    color: 0x7f95a4, roughness: 0.04, metalness: 0.2,
    transparent: true, opacity: 0.6, side: THREE.DoubleSide,
    clearcoat: 1.0, envMapIntensity: 1.5,
  }),

  // --- авиатехника ---
  fuselage: std({ color: 0xf6f5f2, roughness: 0.24, metalness: 0.05, envMapIntensity: 1.1 }),
  engine: std({ color: 0xdcdedf, roughness: 0.28, metalness: 0.3 }),
  engineCore: std({ color: 0x4a4d50, roughness: 0.5, metalness: 0.5 }),
  tyre: std({ color: 0x3e4144, roughness: 0.9 }),
  cockpitGlass: std({ color: 0x5b6b78, roughness: 0.08, metalness: 0.4 }),
  jetbridge: std({ color: 0xd5d7d9, roughness: 0.5, metalness: 0.2 }),

  // --- наземная техника ---
  vehicleWhite: std({ color: 0xeeece8, roughness: 0.42, metalness: 0.1 }),
  vehicleBlue: std({ color: 0x7f97ab, roughness: 0.42, metalness: 0.1 }),
  vehicleYellow: std({ color: 0xd3b877, roughness: 0.42, metalness: 0.1 }),
  vehicleGrey: std({ color: 0xb3b1ac, roughness: 0.5 }),

  // --- окружение ---
  trunk: std({ color: 0x9a8f7e, roughness: 1.0 }),
  foliage: std({ color: 0x93a081, roughness: 1.0 }),
  water: phys({ color: 0x9fb6c4, roughness: 0.05, metalness: 0.0, transparent: true, opacity: 0.7, clearcoat: 1 }),
  buildingGeneric: std({ color: 0xdedcd7, roughness: 0.8 }),
  fence: std({ color: 0xb9bbbd, roughness: 0.6, metalness: 0.3 }),
};

// --- Излучающие (управляются суточным циклом) ---
const emissives = [];
function em(color, intensity = 1) {
  const m = reg(new THREE.MeshStandardMaterial({
    color: 0xe8e6e1, emissive: color, emissiveIntensity: 0, roughness: 0.6,
    toneMapped: false,
  }));
  emissives.push({ mat: m, peak: intensity });
  return m;
}

export const EMIT = {
  windowWarm: em(0xffe0b0, 1.5),
  windowCool: em(0xd6ecff, 1.2),
  runwayWhite: em(0xffffff, 2.4),
  runwayRed: em(0xff5544, 2.4),
  runwayGreen: em(0x44ff88, 2.4),
  taxiBlue: em(0x66b8ff, 2.0),
  approachLead: em(0xfff2c0, 2.6),
  beaconRed: em(0xff3a3a, 3.0),
  apronFlood: em(0xfff2d8, 2.0),
  signYellow: em(0xffd166, 1.6),
  navGreen: em(0x44ff77, 2.6),
  navRedNav: em(0xff4444, 2.6),
};

/** 0 — день (всё погашено), 1 — ночь (всё горит). */
export function setNightFactor(f) {
  for (const { mat, peak } of emissives) {
    mat.emissiveIntensity = peak * f;
  }
}

export function setWireframe(on) {
  for (const m of registry) m.wireframe = on;
}

/** Применяет карту окружения ко всем PBR-материалам сцены. */
export function applyEnvironment(envMap) {
  for (const m of registry) {
    if (m.isMeshStandardMaterial) {
      m.envMap = envMap;
      m.needsUpdate = true;
    }
  }
}

/** Материал ливреи — приглушённый акцентный цвет на белом борту. */
export function liveryMaterial(color, opts = {}) {
  return std({ color, roughness: 0.28, metalness: 0.1, envMapIntensity: 1.1, ...opts });
}

export function registerMaterial(mat) {
  return reg(mat);
}
