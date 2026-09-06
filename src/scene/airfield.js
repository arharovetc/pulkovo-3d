import * as THREE from 'three';
import { MAT, EMIT } from '../utils/materials.js';
import { box, slab, group, describe, pointLightTexture, textTexture, rand } from '../utils/helpers.js';
import { RWY1, RWY2, APRON, TAXIWAYS, GATES, REMOTE_STANDS, TERMINAL } from './layout.js';

const lightMaterials = [];
const floodLights = [];

function lightPoints(positions, color, size = 5.2, peak = 1.0) {
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  // sizeAttenuation: false — огни остаются видимыми точками с любой высоты,
  // как настоящее светосигнальное оборудование на ночных снимках аэродрома
  const mat = new THREE.PointsMaterial({
    color, size, map: pointLightTexture(), transparent: true, depthWrite: false,
    blending: THREE.AdditiveBlending, sizeAttenuation: false, fog: false, toneMapped: false,
  });
  mat.opacity = 0;
  lightMaterials.push({ mat, peak });
  const p = new THREE.Points(geo, mat);
  p.frustumCulled = false;
  return p;
}

/** Вызывается из суточного цикла: 0 — день, 1 — ночь. */
export function updateAirfieldLights(nightFactor) {
  const f = Math.pow(nightFactor, 0.8);
  for (const { mat, peak } of lightMaterials) {
    mat.opacity = f * peak;
    mat.visible = mat.opacity > 0.02;
  }
  for (const l of floodLights) {
    l.intensity = f * 14000;
    l.visible = f > 0.03;
  }
}

/* ------------------------------------------------------------------ */
/*  Земля и рельеф                                                     */
/* ------------------------------------------------------------------ */

export function createGround() {
  const g = group('Земля');

  const base = slab(40000, 40000, MAT.grass, 0, -0.6, 0);
  base.receiveShadow = true;
  g.add(base);

  // Лесополосы по периметру
  const trees = createTreeBelt();
  g.add(trees);

  return g;
}

function createTreeBelt() {
  const g = group('Лесополоса');
  const trunkGeo = new THREE.CylinderGeometry(0.6, 0.9, 6, 5);
  const foliageGeo = new THREE.ConeGeometry(4.2, 12, 6);
  const count = 700;
  const trunks = new THREE.InstancedMesh(trunkGeo, MAT.trunk, count);
  const crowns = new THREE.InstancedMesh(foliageGeo, MAT.foliage, count);
  trunks.castShadow = crowns.castShadow = true;
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3();
  const p = new THREE.Vector3();

  let i = 0;
  const rings = [
    { r: 1950, spread: 260 },
    { r: 2350, spread: 340 },
  ];
  while (i < count) {
    const ring = rings[i % rings.length];
    const a = rand(0, Math.PI * 2);
    const rr = ring.r + rand(-ring.spread, ring.spread);
    const x = Math.cos(a) * rr * 1.35;
    const z = Math.sin(a) * rr;
    // не сажаем деревья на лётном поле
    if (Math.abs(z) < 1420 && Math.abs(x) < 2100) { i++; continue; }
    const sc = rand(1.1, 2.4);
    p.set(x, 3 * sc, z);
    s.set(sc, sc, sc);
    m.compose(p, q, s);
    trunks.setMatrixAt(i, m);
    p.set(x, 6 * sc + 5 * sc, z);
    m.compose(p, q, s);
    crowns.setMatrixAt(i, m);
    i++;
  }
  trunks.instanceMatrix.needsUpdate = true;
  crowns.instanceMatrix.needsUpdate = true;
  g.add(trunks, crowns);
  return g;
}

/* ------------------------------------------------------------------ */
/*  ВПП                                                                */
/* ------------------------------------------------------------------ */

export function createRunway(rwy) {
  const g = group(`ВПП ${rwy.id}`);
  const { cx, cz, length: L, width: W } = rwy;
  g.position.set(cx, 0, cz);

  // Полотно (длина вдоль X, ширина вдоль Z)
  g.add(slab(L, W, MAT.runway, 0, 0.05, 0));
  // Обочины
  g.add(slab(L, W + 30, MAT.concrete, 0, 0.02, 0));
  // Грунтовая полоса безопасности
  g.add(slab(L + 300, W + 150, MAT.grassDark, 0, 0.01, 0));

  const mark = new THREE.Group();
  mark.position.y = 0.09;
  g.add(mark);

  // Осевая пунктирная линия
  const dashGeo = new THREE.PlaneGeometry(30, 0.9);
  const nDash = Math.floor(L / 50) - 2;
  for (let i = 0; i < nDash; i++) {
    const m = new THREE.Mesh(dashGeo, MAT.markWhite);
    m.rotation.x = -Math.PI / 2;
    m.position.x = -L / 2 + 100 + i * 50;
    mark.add(m);
  }

  // Боковые кромочные линии
  for (const sgn of [-1, 1]) {
    const side = new THREE.Mesh(new THREE.PlaneGeometry(L - 20, 1.2), MAT.markWhite);
    side.rotation.x = -Math.PI / 2;
    side.position.set(0, 0, sgn * (W / 2 - 1.5));
    mark.add(side);
  }

  // Пороговая «зебра», прицельные и зоны приземления с обоих концов
  for (const sgn of [-1, 1]) {
    const x0 = sgn * (L / 2);
    // зебра из 12 полос
    for (let i = 0; i < 12; i++) {
      const bar = new THREE.Mesh(new THREE.PlaneGeometry(28, 1.8), MAT.markWhite);
      bar.rotation.x = -Math.PI / 2;
      bar.position.set(x0 - sgn * 22, 0, -W / 2 + 6 + i * ((W - 12) / 11));
      mark.add(bar);
    }
    // прицельная точка (два прямоугольника)
    for (const s2 of [-1, 1]) {
      const aim = new THREE.Mesh(new THREE.PlaneGeometry(45, 6), MAT.markWhite);
      aim.rotation.x = -Math.PI / 2;
      aim.position.set(x0 - sgn * 320, 0, s2 * 11);
      mark.add(aim);
    }
    // зоны приземления
    for (let k = 1; k <= 3; k++) {
      for (const s2 of [-1, 1]) {
        for (let j = 0; j < Math.min(k, 2); j++) {
          const td = new THREE.Mesh(new THREE.PlaneGeometry(20, 3), MAT.markWhite);
          td.rotation.x = -Math.PI / 2;
          td.position.set(x0 - sgn * (150 + k * 150), 0, s2 * (7 + j * 5));
          mark.add(td);
        }
      }
    }
    // номер ВПП
    const label = sgn < 0 ? rwy.thresholdWest : rwy.thresholdEast;
    const tex = textTexture(label, { width: 512, height: 256, font: 'bold 190px Arial' });
    const plate = new THREE.Mesh(
      new THREE.PlaneGeometry(46, 23),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
    );
    plate.rotation.x = -Math.PI / 2;
    plate.rotation.z = sgn < 0 ? -Math.PI / 2 : Math.PI / 2;
    plate.position.set(x0 - sgn * 90, 0.01, 0);
    mark.add(plate);
  }

  // --- Огни ---
  const edge = [];
  const thrGreen = [];
  const endRed = [];
  for (let x = -L / 2; x <= L / 2; x += 60) {
    edge.push(x, 0.6, -W / 2, x, 0.6, W / 2);
  }
  for (let z = -W / 2; z <= W / 2; z += 5) {
    thrGreen.push(-L / 2 + 2, 0.6, z);
    endRed.push(L / 2 - 2, 0.6, z);
  }
  g.add(lightPoints(edge, 0xfff4d0, 4.5, 1));
  g.add(lightPoints(thrGreen, 0x2dff7a, 5, 1));
  g.add(lightPoints(endRed, 0xff3a2a, 5, 1));

  // Осевые огни
  const center = [];
  for (let x = -L / 2 + 30; x <= L / 2 - 30; x += 30) center.push(x, 0.55, 0);
  g.add(lightPoints(center, 0xffffff, 3.2, 0.85));

  // Огни приближения (западный порог)
  const app = [];
  for (let d = 40; d <= 780; d += 30) {
    app.push(-L / 2 - d, 0.9, 0);
    if (d % 150 === 40 % 150 || d === 310) {
      for (let k = -3; k <= 3; k++) app.push(-L / 2 - d, 0.9, k * 4);
    }
  }
  g.add(lightPoints(app, 0xfff2c0, 5.5, 1));

  return describe(g, {
    title: `ВПП ${rwy.id}`,
    tag: 'Лётное поле',
    text: 'Взлётно-посадочная полоса с искусственным покрытием, огнями высокой интенсивности и системой точного захода.',
    facts: [
      ['Длина', `${rwy.length} м`],
      ['Ширина', `${rwy.width} м`],
      ['Курсы', rwy.id],
      ['Магнитный курс', '100° / 280°'],
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Рулёжные дорожки                                                   */
/* ------------------------------------------------------------------ */

export function createTaxiways() {
  const g = group('Рулёжные дорожки');
  const centerlineLights = [];

  for (const tw of TAXIWAYS) {
    for (let i = 0; i < tw.pts.length - 1; i++) {
      const [x1, z1] = tw.pts[i];
      const [x2, z2] = tw.pts[i + 1];
      const dx = x2 - x1;
      const dz = z2 - z1;
      const len = Math.hypot(dx, dz);
      const ang = Math.atan2(dz, dx);

      const seg = new THREE.Mesh(new THREE.PlaneGeometry(len + tw.w, tw.w), MAT.asphalt);
      seg.rotation.x = -Math.PI / 2;
      seg.rotation.z = -ang;
      seg.position.set((x1 + x2) / 2, 0.04, (z1 + z2) / 2);
      seg.receiveShadow = true;
      g.add(seg);

      // жёлтая осевая
      const line = new THREE.Mesh(new THREE.PlaneGeometry(len, 0.8), MAT.markYellow);
      line.rotation.x = -Math.PI / 2;
      line.rotation.z = -ang;
      line.position.set((x1 + x2) / 2, 0.09, (z1 + z2) / 2);
      g.add(line);

      // синие боковые огни
      const steps = Math.floor(len / 45);
      for (let s = 0; s <= steps; s++) {
        const t = s / Math.max(steps, 1);
        const px = x1 + dx * t;
        const pz = z1 + dz * t;
        const nx = -Math.sin(ang) * (tw.w / 2 + 2);
        const nz = Math.cos(ang) * (tw.w / 2 + 2);
        centerlineLights.push(px + nx, 0.5, pz + nz, px - nx, 0.5, pz - nz);
      }
    }

    // буквенное обозначение РД
    const [lx, lz] = tw.pts[0];
    const sign = makeTaxiwaySign(tw.id);
    sign.position.set(lx, 0, lz + tw.w / 2 + 6);
    g.add(sign);
  }

  g.add(lightPoints(centerlineLights, 0x3aa0ff, 3.4, 1));
  return describe(g, {
    title: 'Рулёжные дорожки',
    tag: 'Лётное поле',
    text: 'Сеть РД связывает перрон с обеими взлётно-посадочными полосами. Осевая разметка жёлтая, боковые огни синие.',
    facts: [['Магистральная РД', 'A'], ['Выходы на ВПП-1', 'B1 · B2 · B3'], ['Ширина', '34–40 м']],
  });
}

function makeTaxiwaySign(text) {
  const g = new THREE.Group();
  const tex = textTexture(text, { width: 128, height: 128, font: 'bold 92px Arial', color: '#111', bg: '#f0c020' });
  const face = new THREE.Mesh(
    new THREE.BoxGeometry(4.6, 2.4, 0.3),
    [MAT.wallDark, MAT.wallDark, MAT.wallDark, MAT.wallDark,
      new THREE.MeshBasicMaterial({ map: tex }), MAT.wallDark],
  );
  face.position.y = 2.4;
  face.castShadow = true;
  g.add(face);
  g.add(box(0.3, 1.3, 0.3, MAT.wallDark, -1.6, 0, 0));
  g.add(box(0.3, 1.3, 0.3, MAT.wallDark, 1.6, 0, 0));
  return g;
}

/* ------------------------------------------------------------------ */
/*  Перрон                                                             */
/* ------------------------------------------------------------------ */

export function createApron() {
  const g = group('Перрон');

  const pad = slab(APRON.w, APRON.d, MAT.apron, APRON.cx, 0.06, APRON.cz);
  pad.receiveShadow = true;
  g.add(pad);

  // Швы бетонных плит
  const seam = new THREE.MeshBasicMaterial({ color: 0x7d7a76 });
  for (let x = -APRON.w / 2; x <= APRON.w / 2; x += 30) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(0.35, APRON.d), seam);
    l.rotation.x = -Math.PI / 2;
    l.position.set(APRON.cx + x, 0.08, APRON.cz);
    g.add(l);
  }
  for (let z = -APRON.d / 2; z <= APRON.d / 2; z += 30) {
    const l = new THREE.Mesh(new THREE.PlaneGeometry(APRON.w, 0.35), seam);
    l.rotation.x = -Math.PI / 2;
    l.position.set(APRON.cx, 0.08, APRON.cz + z);
    g.add(l);
  }

  // Разметка стоянок у телетрапов
  const standZ = TERMINAL.pierZ - 60;
  for (const gate of GATES) {
    g.add(standMarking(gate.x, standZ, gate.id, gate.type === 'wide' ? 62 : 46));
  }
  for (const st of REMOTE_STANDS) {
    g.add(standMarking(st.x, st.z, st.id, 46, true));
  }

  // Служебная дорога по периметру перрона
  const road = new THREE.Mesh(new THREE.PlaneGeometry(APRON.w - 20, 8), MAT.markRed);
  road.rotation.x = -Math.PI / 2;
  road.position.set(APRON.cx, 0.085, APRON.cz - APRON.d / 2 + 26);
  g.add(road);

  return describe(g, {
    title: 'Перрон',
    tag: 'Лётное поле',
    text: 'Места стоянки воздушных судов: контактные стоянки у телескопических трапов и удалённые стоянки с подвозом пассажиров автобусами.',
    facts: [
      ['Контактных стоянок', String(GATES.length)],
      ['Удалённых стоянок', String(REMOTE_STANDS.length)],
      ['Площадь', `${Math.round(APRON.w * APRON.d / 1000)} тыс. м²`],
    ],
  });
}

function standMarking(x, z, id, len, remote = false) {
  const g = new THREE.Group();
  g.position.set(x, 0.1, z);

  // ось заруливания
  const axis = new THREE.Mesh(new THREE.PlaneGeometry(1.0, len), MAT.markYellow);
  axis.rotation.x = -Math.PI / 2;
  g.add(axis);

  // поперечина «стоп»
  const stop = new THREE.Mesh(new THREE.PlaneGeometry(16, 1.2), MAT.markYellow);
  stop.rotation.x = -Math.PI / 2;
  stop.position.z = -len / 2 + 6;
  g.add(stop);

  // габаритная рамка стоянки
  if (!remote) {
    for (const s of [-1, 1]) {
      const b = new THREE.Mesh(new THREE.PlaneGeometry(0.7, len * 0.8), MAT.markRed);
      b.rotation.x = -Math.PI / 2;
      b.position.set(s * 24, 0, 4);
      g.add(b);
    }
  }

  // номер стоянки
  const tex = textTexture(id, { width: 256, height: 128, font: 'bold 96px Arial', color: '#f0d64a' });
  const plate = new THREE.Mesh(
    new THREE.PlaneGeometry(18, 9),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false }),
  );
  plate.rotation.x = -Math.PI / 2;
  plate.position.set(0, 0.01, len / 2 - 12);
  g.add(plate);

  return g;
}

/* ------------------------------------------------------------------ */
/*  Мачты освещения перрона                                            */
/* ------------------------------------------------------------------ */

export function createFloodMasts() {
  const g = group('Мачты освещения');
  const xs = [-520, -300, -90, 130, 350, 560];
  for (const x of xs) {
    const mast = new THREE.Group();
    mast.position.set(x, 0, APRON.cz - APRON.d / 2 + 12);

    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 1.4, 42, 8), MAT.steel);
    pole.position.y = 21;
    pole.castShadow = true;
    mast.add(pole);

    const head = box(9, 1.4, 3.2, MAT.wallDark, 0, 42, 0);
    mast.add(head);
    for (let i = -3; i <= 3; i++) {
      const lamp = box(1.6, 0.9, 2.4, EMIT.apronFlood, i * 1.35, 42.9, 0);
      mast.add(lamp);
    }
    const flood = new THREE.PointLight(0xffe9c4, 0, 430, 2);
    flood.position.set(0, 40, 30);
    mast.add(flood);
    floodLights.push(flood);

    g.add(mast);
  }
  return describe(g, {
    title: 'Мачты освещения перрона',
    tag: 'Инфраструктура',
    text: 'Прожекторные мачты обеспечивают освещённость мест стоянки для ночного обслуживания воздушных судов.',
    facts: [['Высота', '42 м'], ['Количество', String(xs.length)]],
  });
}
