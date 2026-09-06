import * as THREE from 'three';

/** Детерминированный ГПСЧ — сцена одинакова при каждой загрузке. */
export function makeRandom(seed = 20130204) {
  let s = seed >>> 0;
  return function random() {
    s ^= s << 13; s >>>= 0;
    s ^= s >> 17;
    s ^= s << 5; s >>>= 0;
    return s / 4294967296;
  };
}

export const rnd = makeRandom();
export const rand = (a, b) => a + rnd() * (b - a);
export const pick = (arr) => arr[Math.floor(rnd() * arr.length)];

const boxCache = new Map();
function boxGeom(w, h, d) {
  const key = `${w}|${h}|${d}`;
  let g = boxCache.get(key);
  if (!g) { g = new THREE.BoxGeometry(w, h, d); boxCache.set(key, g); }
  return g;
}

/** Параллелепипед с центром основания в (x, y, z) по низу. */
export function box(w, h, d, mat, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(boxGeom(w, h, d), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Горизонтальная плита (плоскость в плане XZ) на высоте y. */
export function slab(w, d, mat, x = 0, y = 0, z = 0, rotY = 0) {
  const g = new THREE.PlaneGeometry(w, d);
  const m = new THREE.Mesh(g, mat);
  m.rotation.x = -Math.PI / 2;
  m.rotation.z = rotY;
  m.position.set(x, y, z);
  m.receiveShadow = true;
  return m;
}

export function cyl(rTop, rBottom, h, mat, seg = 16, x = 0, y = 0, z = 0) {
  const m = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBottom, h, seg), mat);
  m.position.set(x, y + h / 2, z);
  m.castShadow = true;
  m.receiveShadow = true;
  return m;
}

/** Прикрепляет к объекту карточку для инфопанели и делает его кликабельным. */
export function describe(obj, info) {
  obj.userData.info = info;
  obj.traverse((c) => { c.userData.pickRoot = obj; });
  return obj;
}

/** Группа с именем — удобно для слоёв. */
export function group(name) {
  const g = new THREE.Group();
  g.name = name;
  return g;
}

/** Полосы разметки вдоль оси Z внутри прямоугольника. */
export function dashedLine(length, width, mat, dash = 12, gap = 12) {
  const g = new THREE.Group();
  const n = Math.floor(length / (dash + gap));
  const geo = new THREE.PlaneGeometry(width, dash);
  for (let i = 0; i < n; i++) {
    const m = new THREE.Mesh(geo, mat);
    m.rotation.x = -Math.PI / 2;
    m.position.set(0, 0, -length / 2 + i * (dash + gap) + dash / 2);
    g.add(m);
  }
  return g;
}

/** Мягкая круглая текстура для точечных огней. */
let lightTex = null;
export function pointLightTexture() {
  if (lightTex) return lightTex;
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const ctx = c.getContext('2d');
  const grd = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  grd.addColorStop(0, 'rgba(255,255,255,1)');
  grd.addColorStop(0.25, 'rgba(255,255,255,0.85)');
  grd.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = grd;
  ctx.fillRect(0, 0, 64, 64);
  lightTex = new THREE.CanvasTexture(c);
  return lightTex;
}

/** Текстура-надпись на прозрачном фоне (номера ВПП, буквы РД, борта). */
export function textTexture(text, {
  width = 256, height = 256, font = 'bold 150px Arial', color = '#e8e8e4', bg = 'transparent',
} = {}) {
  const c = document.createElement('canvas');
  c.width = width; c.height = height;
  const ctx = c.getContext('2d');
  if (bg !== 'transparent') { ctx.fillStyle = bg; ctx.fillRect(0, 0, width, height); }
  ctx.fillStyle = color;
  ctx.font = font;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(text, width / 2, height / 2);
  const t = new THREE.CanvasTexture(c);
  t.anisotropy = 4;
  return t;
}

export const DEG = Math.PI / 180;

/** Вектор направления по курсу (градусы, 0 = север = -Z). */
export function headingVector(deg) {
  const r = deg * DEG;
  return new THREE.Vector3(Math.sin(r), 0, -Math.cos(r));
}
