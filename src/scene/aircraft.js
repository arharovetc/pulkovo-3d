import * as THREE from 'three';
import { MAT, EMIT, liveryMaterial } from '../utils/materials.js';
import { box, group, describe, textTexture } from '../utils/helpers.js';

/**
 * Параметрическая модель самолёта. Нос направлен в +Z локальной системы.
 */

export const TYPES = {
  regional: {
    name: 'Sukhoi Superjet 100', short: 'SSJ100',
    length: 29.9, span: 27.8, radius: 1.72, engineR: 1.35, seats: 98, range: 3050,
  },
  narrow: {
    name: 'Airbus A320neo', short: 'A320',
    length: 37.6, span: 35.8, radius: 1.98, engineR: 1.65, seats: 180, range: 6300,
  },
  narrowLong: {
    name: 'Boeing 737-800', short: 'B738',
    length: 39.5, span: 35.8, radius: 1.88, engineR: 1.55, seats: 189, range: 5400,
  },
  wide: {
    name: 'Boeing 777-300ER', short: 'B77W',
    length: 73.9, span: 64.8, radius: 3.15, engineR: 2.7, seats: 402, range: 13650,
  },
  wideMid: {
    name: 'Airbus A330-300', short: 'A333',
    length: 63.7, span: 60.3, radius: 2.8, engineR: 2.4, seats: 300, range: 11750,
  },
};

export const LIVERIES = [
  { id: 'aeroflot', name: 'Аэрофлот', tail: 0x1b3a6b, belt: 0xd7452f, accent: 0xffffff },
  { id: 'rossiya', name: 'Россия', tail: 0x1e4faa, belt: 0xcf2233, accent: 0xffffff },
  { id: 'pobeda', name: 'Победа', tail: 0x1aa34a, belt: 0x1aa34a, accent: 0xf2f4f6 },
  { id: 's7', name: 'S7 Airlines', tail: 0x8bc63f, belt: 0x8bc63f, accent: 0xffffff },
  { id: 'ural', name: 'Уральские авиалинии', tail: 0xd23a2f, belt: 0x2a6cb5, accent: 0xffffff },
  { id: 'redwings', name: 'Red Wings', tail: 0xc0392b, belt: 0xc0392b, accent: 0xffffff },
  { id: 'nordwind', name: 'Nordwind', tail: 0x1f3f8f, belt: 0x2fa4d8, accent: 0xffffff },
  { id: 'azimuth', name: 'Азимут', tail: 0x7b3fa0, belt: 0xf0a02a, accent: 0xffffff },
];

const liveryCache = new Map();
function liveryMats(liv) {
  let m = liveryCache.get(liv.id);
  if (!m) {
    m = {
      tail: liveryMaterial(liv.tail),
      belt: liveryMaterial(liv.belt),
      accent: liveryMaterial(liv.accent),
    };
    liveryCache.set(liv.id, m);
  }
  return m;
}

/* --------------------------- крыло --------------------------------- */

/**
 * Цельная несущая поверхность (обе консоли сразу — так не приходится
 * зеркалить геометрию и выворачивать нормали).
 * Shape: x — размах, y — вдоль фюзеляжа (после поворота уходит в -Z, т.е. назад).
 */
function surface(span, rootChord, tipChord, sweep, thickness, dihedral, mat) {
  const h = span / 2;
  const s = new THREE.Shape();
  s.moveTo(-h, sweep + tipChord * 0.5);
  s.lineTo(0, rootChord * 0.55);
  s.lineTo(h, sweep + tipChord * 0.5);
  s.lineTo(h, sweep - tipChord * 0.5);
  s.lineTo(0, -rootChord * 0.45);
  s.lineTo(-h, sweep - tipChord * 0.5);
  s.closePath();

  const geo = new THREE.ExtrudeGeometry(s, {
    depth: thickness, bevelEnabled: true, bevelSegments: 1,
    bevelSize: thickness * 0.3, bevelThickness: thickness * 0.3,
  });
  geo.rotateX(-Math.PI / 2);
  geo.translate(0, -thickness / 2, 0);

  // поперечное V — приподнимаем законцовки
  if (dihedral) {
    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      pos.setY(i, pos.getY(i) + Math.abs(pos.getX(i)) * dihedral);
    }
    geo.computeVertexNormals();
  }

  const m = new THREE.Mesh(geo, mat);
  m.castShadow = true;
  return m;
}

/* --------------------------- самолёт ------------------------------- */

export function createAircraft({ type = 'narrow', livery = LIVERIES[0], reg = 'RA-00000', flight = '' } = {}) {
  const T = TYPES[type];
  const L = T.length;
  const R = T.radius;
  const lm = liveryMats(livery);

  const g = group(`${T.short} ${reg}`);
  const gearH = R + 1.6;                 // высота оси фюзеляжа над землёй
  const body = new THREE.Group();
  body.position.y = gearH;
  g.add(body);

  /* --- фюзеляж --- */
  const tube = new THREE.Mesh(
    new THREE.CylinderGeometry(R, R, L * 0.68, 24, 1, true),
    MAT.fuselage,
  );
  tube.rotation.x = Math.PI / 2;
  tube.castShadow = true;
  body.add(tube);

  // нос
  const nose = new THREE.Mesh(new THREE.SphereGeometry(R, 20, 14), MAT.fuselage);
  nose.scale.set(1, 0.95, L * 0.155 / R);
  nose.position.z = L * 0.34;
  nose.castShadow = true;
  body.add(nose);

  // хвостовая часть с подъёмом
  const tailCone = new THREE.Mesh(new THREE.ConeGeometry(R, L * 0.3, 20), MAT.fuselage);
  tailCone.rotation.x = -Math.PI / 2;
  tailCone.position.set(0, R * 0.42, -L * 0.34 - L * 0.15);
  tailCone.rotation.z = 0;
  tailCone.castShadow = true;
  body.add(tailCone);

  // кабина
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(R * 0.86, 14, 10), MAT.cockpitGlass);
  cockpit.scale.set(1, 0.62, 1.5);
  cockpit.position.set(0, R * 0.35, L * 0.4);
  body.add(cockpit);

  // иллюминаторы
  const winStrip = new THREE.Mesh(
    new THREE.BoxGeometry(0.06, 0.62, L * 0.6), EMIT.windowWarm,
  );
  for (const s of [-1, 1]) {
    const w = winStrip.clone();
    w.position.set(s * (R - 0.02), R * 0.26, -L * 0.02);
    body.add(w);
  }

  // цветовой пояс ливреи
  const belt = new THREE.Mesh(
    new THREE.CylinderGeometry(R * 1.005, R * 1.005, L * 0.66, 24, 1, true,
      Math.PI * 0.62, Math.PI * 0.76),
    lm.belt,
  );
  belt.rotation.x = Math.PI / 2;
  body.add(belt);

  /* --- крылья --- */
  const halfSpan = T.span / 2;
  const rootChord = L * 0.19;
  const tipChord = L * 0.06;
  const sweep = L * 0.13;
  const wing = surface(T.span, rootChord, tipChord, sweep, R * 0.16, 0.055, MAT.fuselage);
  wing.position.set(0, -R * 0.35, -L * 0.02);
  body.add(wing);

  for (const side of [1, -1]) {
    // законцовка
    const tip = new THREE.Mesh(
      new THREE.BoxGeometry(0.25, T.span * 0.045, tipChord * 0.8), lm.tail,
    );
    tip.position.set(side * halfSpan, -R * 0.1 + T.span * 0.022, -L * 0.02 - sweep);
    tip.rotation.z = -side * 0.25;
    body.add(tip);

    /* --- двигатели --- */
    const eR = T.engineR;
    const eZ = -L * 0.02 + rootChord * 0.35;
    const eX = side * halfSpan * 0.34;
    const eY = -R * 0.95;

    const nac = new THREE.Mesh(
      new THREE.CylinderGeometry(eR, eR * 0.86, eR * 3.4, 18, 1, true), MAT.engine,
    );
    nac.rotation.x = Math.PI / 2;
    nac.position.set(eX, eY, eZ);
    nac.castShadow = true;
    body.add(nac);

    const inlet = new THREE.Mesh(new THREE.TorusGeometry(eR, eR * 0.1, 8, 20), MAT.steel);
    inlet.position.set(eX, eY, eZ + eR * 1.7);
    body.add(inlet);

    const fan = new THREE.Mesh(new THREE.CircleGeometry(eR * 0.92, 18), MAT.engineCore);
    fan.position.set(eX, eY, eZ + eR * 1.5);
    body.add(fan);

    const exhaust = new THREE.Mesh(
      new THREE.CylinderGeometry(eR * 0.5, eR * 0.42, eR * 1.2, 14), MAT.engineCore,
    );
    exhaust.rotation.x = Math.PI / 2;
    exhaust.position.set(eX, eY, eZ - eR * 2);
    body.add(exhaust);

    // пилон
    const pylon = new THREE.Mesh(
      new THREE.BoxGeometry(eR * 0.35, eR * 0.9, eR * 1.6), MAT.fuselage,
    );
    pylon.position.set(eX, eY + eR * 0.8, eZ - eR * 0.3);
    body.add(pylon);
  }

  /* --- оперение --- */
  const stab = surface(T.span * 0.36, L * 0.1, L * 0.045, L * 0.05, R * 0.12, 0.08, MAT.fuselage);
  stab.position.set(0, R * 0.62, -L * 0.42);
  body.add(stab);

  // киль: Shape в (z вдоль фюзеляжа, y высота), выдавливание по толщине
  const fh = L * 0.24;
  const fc = L * 0.17;
  const sw = fh * 0.62;
  const finShape = new THREE.Shape();
  finShape.moveTo(fc * 0.45, 0);
  finShape.lineTo(fc * 0.45 - sw, fh);
  finShape.lineTo(fc * 0.45 - sw - fc * 0.42, fh);
  finShape.lineTo(-fc * 0.55, 0);
  finShape.closePath();
  const finGeo = new THREE.ExtrudeGeometry(finShape, { depth: R * 0.22, bevelEnabled: false });
  finGeo.rotateY(-Math.PI / 2);          // Shape.x → +Z, Shape.y → +Y, depth → -X
  finGeo.translate(R * 0.11, 0, 0);      // центрируем по толщине
  const fin = new THREE.Mesh(finGeo, lm.tail);
  fin.position.set(0, R * 0.6, -L * 0.36);
  fin.castShadow = true;
  body.add(fin);

  /* --- шасси --- */
  const gear = new THREE.Group();
  g.add(gear);
  const wheelGeo = new THREE.CylinderGeometry(R * 0.36, R * 0.36, R * 0.22, 12);

  function strut(x, z, wheels, len) {
    const s = new THREE.Group();
    s.position.set(x, 0, z);
    const leg = new THREE.Mesh(
      new THREE.CylinderGeometry(R * 0.1, R * 0.12, len, 8), MAT.steel,
    );
    leg.position.y = len / 2 + R * 0.36;
    s.add(leg);
    for (let i = 0; i < wheels; i++) {
      const w = new THREE.Mesh(wheelGeo, MAT.tyre);
      w.rotation.z = Math.PI / 2;
      const off = (i - (wheels - 1) / 2) * R * 0.3;
      w.position.set(0, R * 0.36, off);
      s.add(w);
    }
    return s;
  }

  gear.add(strut(0, L * 0.33, 2, gearH - R * 0.36));
  const mainX = R * 1.5;
  const mainWheels = type.startsWith('wide') ? 6 : 4;
  gear.add(strut(-mainX, -L * 0.05, mainWheels, gearH - R * 0.36));
  gear.add(strut(mainX, -L * 0.05, mainWheels, gearH - R * 0.36));

  /* --- аэронавигационные огни --- */
  const navL = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 6, 5), EMIT.navRedNav);
  navL.position.set(-halfSpan, gearH - R * 0.1, -L * 0.02 - sweep);
  g.add(navL);
  const navR = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 6, 5), EMIT.navGreen);
  navR.position.set(halfSpan, gearH - R * 0.1, -L * 0.02 - sweep);
  g.add(navR);
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(R * 0.16, 6, 5), EMIT.beaconRed);
  beacon.position.set(0, gearH + R * 1.05, -L * 0.05);
  beacon.name = 'beacon';
  g.add(beacon);

  /* --- бортовой номер --- */
  const regTex = textTexture(reg, { width: 512, height: 128, font: 'bold 78px Arial', color: '#1a1f26' });
  for (const s of [-1, 1]) {
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(L * 0.16, L * 0.04),
      new THREE.MeshBasicMaterial({ map: regTex, transparent: true, depthWrite: false, side: THREE.DoubleSide }),
    );
    plate.position.set(s * (R + 0.03), gearH - R * 0.45, -L * 0.28);
    plate.rotation.y = s > 0 ? Math.PI / 2 : -Math.PI / 2;
    g.add(plate);
  }

  g.userData.spec = T;
  g.userData.livery = livery;
  g.userData.reg = reg;
  g.userData.beacon = beacon;

  describe(g, {
    title: `${T.name}`,
    tag: livery.name,
    text: `Борт ${reg}${flight ? ` · рейс ${flight}` : ''}. Кликните по другим объектам сцены, чтобы посмотреть их характеристики.`,
    facts: [
      ['Тип', T.short],
      ['Длина', `${T.length} м`],
      ['Размах крыла', `${T.span} м`],
      ['Пассажиров', `до ${T.seats}`],
      ['Дальность', `${T.range} км`],
    ],
  });

  return g;
}
