import * as THREE from 'three';
import { MAT, EMIT } from '../utils/materials.js';
import { box, slab, group, describe, textTexture, rand } from '../utils/helpers.js';
import { TERMINAL, GATES } from './layout.js';

/**
 * Пассажирский терминал Пулково-1 (введён в 2013 г.).
 * Узнаваемые черты: золотистая складчатая кровля с квадратными
 * световыми воронками, сплошное остекление фасада, галерея выходов.
 *
 * Возвращает { root, shellParts, interior } — оболочка скрывается
 * в режиме «разрез терминала».
 */
export function createTerminal() {
  const root = group('Терминал Пулково-1');
  root.position.set(TERMINAL.cx, 0, TERMINAL.cz);

  const W = TERMINAL.w;
  const D = TERMINAL.d;
  const H = 21;                     // высота фасада до карниза
  const shell = group('shell');     // всё, что прячется в разрезе
  const interior = group('interior');
  root.add(shell, interior);

  /* ---------------- Основание и стилобат ---------------- */
  const podium = box(W + 26, 1.6, D + 22, MAT.concrete, 0, 0, 0);
  root.add(podium);

  const floor = slab(W, D, MAT.floorInside, 0, 1.62, 0);
  interior.add(floor);

  // Второй уровень (галерея вылета)
  const mezz = box(W - 40, 1.0, 44, MAT.wallLight, 0, 8.4, 34);
  interior.add(mezz);

  /* ---------------- Складчатая кровля ---------------- */
  const roof = createFoldedRoof(W + 22, D + 18, H);
  shell.add(roof.mesh, roof.funnels, roof.fascia);

  /* ---------------- Остекление фасадов ---------------- */
  const glazing = group('glazing');
  const facades = [
    { w: W, x: 0, z: D / 2, rot: 0 },              // южный (привокзальная площадь)
    { w: W, x: 0, z: -D / 2, rot: Math.PI },       // северный (перрон)
    { w: D, x: W / 2, z: 0, rot: -Math.PI / 2 },   // восточный
    { w: D, x: -W / 2, z: 0, rot: Math.PI / 2 },   // западный
  ];
  for (const f of facades) {
    const wall = new THREE.Mesh(new THREE.PlaneGeometry(f.w, H - 1.6), MAT.glassTerminal);
    wall.position.set(f.x, 1.6 + (H - 1.6) / 2, f.z);
    wall.rotation.y = f.rot;
    glazing.add(wall);

    // вертикальные импосты
    const n = Math.round(f.w / 6);
    const post = new THREE.BoxGeometry(0.34, H - 1.6, 0.5);
    const posts = new THREE.InstancedMesh(post, MAT.mullion, n + 1);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion().setFromEuler(new THREE.Euler(0, f.rot, 0));
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i <= n; i++) {
      const t = -f.w / 2 + (i * f.w) / n;
      p.set(f.x + Math.cos(f.rot) * t, 1.6 + (H - 1.6) / 2, f.z - Math.sin(f.rot) * t);
      m.compose(p, q, s);
      posts.setMatrixAt(i, m);
    }
    posts.instanceMatrix.needsUpdate = true;
    posts.castShadow = true;
    glazing.add(posts);

    // горизонтальные ригели
    for (const y of [7.5, 14]) {
      const rail = new THREE.Mesh(new THREE.BoxGeometry(f.w, 0.4, 0.6), MAT.mullion);
      rail.position.set(f.x, y, f.z);
      rail.rotation.y = f.rot;
      glazing.add(rail);
    }
  }
  shell.add(glazing);

  /* ---------------- Интерьер ---------------- */
  interior.add(createInteriorFitout(W, D));

  /* ---------------- Вывеска ---------------- */
  const signTex = textTexture('ПУЛКОВО', {
    width: 1024, height: 200, font: 'bold 130px Arial', color: '#ffffff',
  });
  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(66, 13),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }),
  );
  sign.position.set(-60, 17, D / 2 + 0.6);
  shell.add(sign);

  const signBack = new THREE.Mesh(
    new THREE.PlaneGeometry(66, 13),
    new THREE.MeshBasicMaterial({ map: signTex, transparent: true, depthWrite: false }),
  );
  signBack.position.set(60, 17, -D / 2 - 0.6);
  signBack.rotation.y = Math.PI;
  shell.add(signBack);

  /* ---------------- Галерея выходов и телетрапы ---------------- */
  const pier = createPier(W);
  root.add(pier.group);

  describe(root, {
    title: 'Терминал Пулково-1',
    tag: 'Пассажирский терминал',
    text: 'Централизованный пассажирский терминал, открытый в декабре 2013 года. Складчатая золотистая кровля с квадратными световыми воронками стала визитной карточкой аэропорта и отсылает к отражениям невской воды.',
    facts: [
      ['Площадь', '≈ 105 000 м²'],
      ['Открытие', 'декабрь 2013'],
      ['Этажей', '4'],
      ['Телетрапов', String(GATES.length)],
      ['Пропускная способность', '≈ 18 млн пасс./год'],
    ],
  });

  return { root, shell, interior, jetbridges: pier.jetbridges };
}

/* ------------------------------------------------------------------ */
/*  Складчатая кровля                                                  */
/* ------------------------------------------------------------------ */

function createFoldedRoof(W, D, H) {
  const segX = 120;
  const segZ = 40;
  const geo = new THREE.PlaneGeometry(W, D, segX, segZ);
  geo.rotateX(-Math.PI / 2);

  const period = W / 9;           // 9 складок по фасаду
  const amp = 4.4;
  const pos = geo.attributes.position;
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i);
    const z = pos.getZ(i);
    // треугольная волна поперёк здания
    const t = ((x / period) % 1 + 1) % 1;
    const tri = 1 - Math.abs(t * 2 - 1);
    // лёгкий подъём к центру по глубине
    const bow = Math.cos((z / D) * Math.PI) * 1.8;
    pos.setY(i, H + tri * amp + bow);
  }
  geo.computeVertexNormals();

  const mesh = new THREE.Mesh(geo, MAT.roofGold);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.name = 'roof';

  // Карниз по периметру
  const fascia = new THREE.Group();
  for (const [w, d, x, z] of [[W, 1.6, 0, D / 2], [W, 1.6, 0, -D / 2], [1.6, D, W / 2, 0], [1.6, D, -W / 2, 0]]) {
    fascia.add(box(w, 2.2, d, MAT.roofGoldDark, x, H - 1.4, z));
  }

  // Квадратные световые воронки в гребнях складок
  const funnels = new THREE.Group();
  const funGeo = new THREE.CylinderGeometry(6.4, 2.6, 7.5, 4, 1, true);
  const capGeo = new THREE.BoxGeometry(8.6, 0.45, 8.6);
  for (let ix = 0; ix < 9; ix++) {
    const x = -W / 2 + period * (ix + 0.5);
    for (let iz = 0; iz < 5; iz++) {
      const z = -D / 2 + (D / 5) * (iz + 0.5);
      const y = H + amp + Math.cos((z / D) * Math.PI) * 1.8;
      const f = new THREE.Mesh(funGeo, MAT.glassDark);
      f.rotation.y = Math.PI / 4;
      f.position.set(x, y - 3.4, z);
      funnels.add(f);
      const cap = new THREE.Mesh(capGeo, MAT.mullion);
      cap.rotation.y = Math.PI / 4;
      cap.position.set(x, y + 0.4, z);
      cap.castShadow = true;
      funnels.add(cap);
      // ночная подсветка воронки изнутри
      const glow = new THREE.Mesh(new THREE.BoxGeometry(4.4, 0.3, 4.4), EMIT.windowCool);
      glow.rotation.y = Math.PI / 4;
      glow.position.set(x, y - 6.8, z);
      funnels.add(glow);
    }
  }

  // Опорные колонны кровли (V-образные, по фасаду)
  for (let ix = 0; ix <= 9; ix++) {
    const x = -W / 2 + period * ix;
    for (const z of [-D / 2 + 6, D / 2 - 6]) {
      for (const lean of [-1, 1]) {
        const col = new THREE.Mesh(new THREE.CylinderGeometry(0.5, 0.75, H, 8), MAT.steel);
        col.position.set(x + lean * 2.4, H / 2, z);
        col.rotation.z = lean * 0.045;
        col.castShadow = true;
        fascia.add(col);
      }
    }
  }

  return { mesh, funnels, fascia };
}

/* ------------------------------------------------------------------ */
/*  Интерьер                                                           */
/* ------------------------------------------------------------------ */

function createInteriorFitout(W, D) {
  const g = group('Интерьер');

  // Стойки регистрации — два острова
  for (const zBase of [26, 6]) {
    const island = new THREE.Group();
    island.position.set(-W / 2 + 55, 1.62, zBase);
    const desk = box(96, 1.15, 3.2, MAT.wallLight, 0, 0, 0);
    island.add(desk);
    island.add(box(96, 0.15, 3.6, MAT.steel, 0, 1.15, 0));
    for (let i = 0; i < 16; i++) {
      const screen = box(0.7, 0.9, 0.1, EMIT.windowCool, -46 + i * 6, 1.3, -1.5);
      island.add(screen);
      island.add(box(1.2, 0.9, 1.2, MAT.wallGrey, -46 + i * 6, 0, 2.4));  // весы
    }
    g.add(island);
  }

  // Ленты выдачи багажа (овальные карусели) в прилёте
  for (let i = 0; i < 3; i++) {
    const belt = new THREE.Mesh(
      new THREE.TorusGeometry(11, 1.5, 8, 40),
      MAT.wallGrey,
    );
    belt.scale.set(1, 1, 0.42);
    belt.rotation.x = Math.PI / 2;
    belt.position.set(W / 2 - 46, 2.6, -40 + i * 34);
    belt.castShadow = true;
    g.add(belt);
  }

  // Колонны зала
  const colGeo = new THREE.CylinderGeometry(0.9, 1.2, 19, 12);
  for (let ix = 0; ix < 7; ix++) {
    for (let iz = 0; iz < 4; iz++) {
      const c = new THREE.Mesh(colGeo, MAT.wallLight);
      c.position.set(-W / 2 + 28 + ix * 36, 11, -D / 2 + 30 + iz * 36);
      c.castShadow = true;
      g.add(c);
    }
  }

  // Табло вылета/прилёта
  for (const [x, z, rotY] of [[-40, D / 2 - 12, 0], [40, -D / 2 + 12, Math.PI]]) {
    const board = box(22, 5, 0.6, EMIT.windowCool, x, 6.5, z);
    board.rotation.y = rotY;
    g.add(board);
    g.add(box(0.5, 6.5, 0.5, MAT.steel, x - 10, 0, z));
    g.add(box(0.5, 6.5, 0.5, MAT.steel, x + 10, 0, z));
  }

  // Эскалаторы на второй уровень
  for (const x of [-24, 24]) {
    const esc = box(4.4, 1.2, 18, MAT.steel, x, 4.6, 20);
    esc.rotation.x = -0.42;
    g.add(esc);
  }

  // Зона ожидания — ряды кресел
  const seatGeo = new THREE.BoxGeometry(1.5, 0.5, 1.5);
  const rows = new THREE.InstancedMesh(seatGeo, MAT.vehicleBlue, 260);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  let i = 0;
  for (let r = 0; r < 10 && i < 260; r++) {
    for (let c = 0; c < 26 && i < 260; c++) {
      p.set(-90 + c * 7, 2.3, -D / 2 + 22 + r * 7);
      m.compose(p, q, s);
      rows.setMatrixAt(i++, m);
    }
  }
  rows.instanceMatrix.needsUpdate = true;
  rows.castShadow = true;
  g.add(rows);

  // Торговая галерея — цветные боксы магазинов
  const shopColors = [0xd45b4a, 0x4a8fd4, 0xd4a94a, 0x54b07a, 0x9b6fc9];
  for (let k = 0; k < 10; k++) {
    const mat = new THREE.MeshStandardMaterial({
      color: shopColors[k % shopColors.length], roughness: 0.7,
    });
    const shop = box(14, 5.5, 10, mat, -W / 2 + 30 + k * 24, 1.62, -D / 2 + 12);
    g.add(shop);
  }

  return g;
}

/* ------------------------------------------------------------------ */
/*  Галерея выходов и телескопические трапы                            */
/* ------------------------------------------------------------------ */

function createPier(W) {
  const g = group('Галерея выходов');
  const z = TERMINAL.pierZ - TERMINAL.cz;   // локальная координата галереи
  const jetbridges = [];

  // Галерея-«палец» вдоль фронта стоянок
  const gallery = box(W + 200, 9.5, 22, MAT.wallLight, 0, 6.5, z);
  g.add(gallery);
  const galleryGlass = new THREE.Mesh(
    new THREE.BoxGeometry(W + 200, 5.5, 22.6), MAT.glassDark,
  );
  galleryGlass.position.set(0, 11.5, z);
  g.add(galleryGlass);
  const galleryRoof = box(W + 206, 0.9, 24, MAT.roofGoldDark, 0, 15.6, z);
  g.add(galleryRoof);

  // Соединительный переход к основному зданию (от торца терминала до галереи)
  const bridgeFar = z + 11;                  // край галереи со стороны здания
  const bridgeNear = -TERMINAL.d / 2;        // торец терминала
  g.add(box(52, 8, bridgeNear - bridgeFar, MAT.wallLight, 0, 6.5, (bridgeFar + bridgeNear) / 2));

  // Опоры галереи
  for (let x = -(W + 190) / 2; x <= (W + 190) / 2; x += 26) {
    g.add(box(1.4, 6.5, 1.4, MAT.steel, x, 0, z + 9));
    g.add(box(1.4, 6.5, 1.4, MAT.steel, x, 0, z - 9));
  }

  // Телетрапы
  for (const gate of GATES) {
    const jb = createJetbridge(gate);
    jb.position.set(gate.x - TERMINAL.cx, 0, z - 11);
    g.add(jb);
    jetbridges.push(jb);
  }

  return { group: g, jetbridges };
}

function createJetbridge(gate) {
  const g = new THREE.Group();
  g.name = `Телетрап ${gate.id}`;

  // Ротонда у здания
  const rot = new THREE.Mesh(new THREE.CylinderGeometry(3.2, 3.2, 6, 12), MAT.jetbridge);
  rot.position.y = 8;
  rot.castShadow = true;
  g.add(rot);

  // Подвижный рукав — поворачивается вокруг ротонды
  const arm = new THREE.Group();
  arm.position.y = 8;
  g.add(arm);
  const len = gate.type === 'wide' ? 34 : 27;

  const tunnel = new THREE.Mesh(new THREE.BoxGeometry(4.2, 4.4, len), MAT.jetbridge);
  tunnel.position.set(0, 0, -len / 2 - 2.5);
  tunnel.castShadow = true;
  arm.add(tunnel);

  // Окна рукава
  for (const s of [-1, 1]) {
    const win = new THREE.Mesh(new THREE.BoxGeometry(0.15, 1.4, len - 3), MAT.glassDark);
    win.position.set(s * 2.15, 0.5, -len / 2 - 2.5);
    arm.add(win);
  }

  // Кабина стыковки
  const cab = new THREE.Mesh(new THREE.CylinderGeometry(3.0, 3.4, 4.6, 12), MAT.jetbridge);
  cab.position.set(0, -0.2, -len - 3.5);
  cab.castShadow = true;
  arm.add(cab);

  // Опора-тележка с колёсами
  const legs = new THREE.Group();
  legs.position.set(0, -2.4, -len * 0.62);
  arm.add(legs);
  legs.add(box(5.6, 0.8, 1.6, MAT.wallGrey, 0, -3.6, 0));
  for (const s of [-1, 1]) {
    const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.42, 5.4, 8), MAT.steel);
    leg.position.set(s * 2.2, -1.2, 0);
    legs.add(leg);
    const wheel = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.1, 0.7, 12), MAT.tyre);
    wheel.rotation.z = Math.PI / 2;
    wheel.position.set(s * 2.2, -4.2, 0);
    legs.add(wheel);
  }

  g.userData.arm = arm;
  g.userData.parkedAngle = 0;
  g.userData.stowedAngle = gate.x < 0 ? 0.85 : -0.85;
  arm.rotation.y = g.userData.stowedAngle;

  return g;
}
