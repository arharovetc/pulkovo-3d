import * as THREE from 'three';
import { MAT, EMIT } from '../utils/materials.js';
import { box, slab, cyl, group, describe, textTexture, rand } from '../utils/helpers.js';
import { OLD_TERMINAL, TERMINAL2, TOWER, PARKING, HOTEL, FORECOURT, APRON } from './layout.js';

/* ------------------------------------------------------------------ */
/*  Исторический Пулково-1 (1973) — «пять стаканов»                    */
/* ------------------------------------------------------------------ */

export function createOldTerminal() {
  const g = group('Исторический терминал «Пять стаканов»');
  g.position.set(OLD_TERMINAL.cx, 0, OLD_TERMINAL.cz);

  const W = OLD_TERMINAL.w;
  const D = OLD_TERMINAL.d;

  // Двухэтажный объём с ленточным остеклением
  g.add(box(W, 1.2, D, MAT.concrete, 0, 0, 0));
  g.add(box(W - 6, 5.2, D - 6, MAT.wallLight, 0, 1.2, 0));
  const band = new THREE.Mesh(new THREE.BoxGeometry(W - 5, 3.4, D - 5), MAT.glassDark);
  band.position.y = 8.6;
  g.add(band);
  g.add(box(W - 6, 2.4, D - 6, MAT.wallLight, 0, 10.3, 0));

  // Плоская кровля-плита с выносом
  const roof = box(W + 8, 1.6, D + 8, MAT.concrete, 0, 12.7, 0);
  g.add(roof);

  // Пять «стаканов» — перевёрнутые усечённые пирамиды световых фонарей
  const positions = [
    [-52, 0], [-26, 0], [0, 0], [26, 0], [52, 0],
  ];
  for (const [x, z] of positions) {
    const cup = new THREE.Group();
    cup.position.set(x, 14.3, z);

    const body = new THREE.Mesh(
      new THREE.CylinderGeometry(13.5, 6.5, 12.5, 4, 1, false),
      MAT.wallLight,
    );
    body.rotation.y = Math.PI / 4;
    body.position.y = 6.25;
    body.castShadow = true;
    cup.add(body);

    // остеклённый пояс под венцом
    const glass = new THREE.Mesh(
      new THREE.CylinderGeometry(13.6, 12.2, 3.2, 4, 1, true),
      MAT.glassDark,
    );
    glass.rotation.y = Math.PI / 4;
    glass.position.y = 10.9;
    cup.add(glass);

    // венчающий карниз
    const rim = new THREE.Mesh(
      new THREE.CylinderGeometry(14.4, 14.4, 1.1, 4),
      MAT.wallGrey,
    );
    rim.rotation.y = Math.PI / 4;
    rim.position.y = 13;
    cup.add(rim);

    // подсветка изнутри «стакана»
    const glow = new THREE.Mesh(new THREE.BoxGeometry(16, 0.4, 16), EMIT.windowWarm);
    glow.rotation.y = Math.PI / 4;
    glow.position.y = 9.2;
    cup.add(glow);

    g.add(cup);
  }

  // Козырёк над входом
  g.add(box(W - 20, 0.8, 14, MAT.concrete, 0, 6.4, D / 2 + 5));
  for (let i = -2; i <= 2; i++) {
    g.add(box(0.8, 6.4, 0.8, MAT.steel, i * 22, 0, D / 2 + 10));
  }

  return describe(g, {
    title: 'Исторический терминал (1973)',
    tag: 'Наследие',
    text: 'Здание аэровокзала, построенное в 1973 году по проекту А. В. Жука. Пять световых фонарей в виде перевёрнутых усечённых пирамид дали ему народное имя «пять стаканов». Памятник советского модернизма, включён в состав комплекса Пулково-1.',
    facts: [
      ['Открыт', '1973'],
      ['Архитектор', 'А. В. Жук'],
      ['«Стаканов»', '5'],
      ['Стиль', 'советский модернизм'],
    ],
  });
}

/* ------------------------------------------------------------------ */
/*  Пулково-2 (историческое здание международного сектора)             */
/* ------------------------------------------------------------------ */

export function createTerminal2() {
  const g = group('Пулково-2');
  g.position.set(TERMINAL2.cx, 0, TERMINAL2.cz);
  const { w: W, d: D } = TERMINAL2;

  g.add(box(W, 9, D, MAT.wallLight, 0, 0, 0));
  const glass = new THREE.Mesh(new THREE.BoxGeometry(W + 0.4, 4, D + 0.4), MAT.glassDark);
  glass.position.y = 5.2;
  g.add(glass);
  g.add(box(W + 6, 1, D + 6, MAT.concrete, 0, 9, 0));

  // Портик из колонн по главному фасаду
  for (let i = 0; i < 9; i++) {
    g.add(cyl(1.2, 1.2, 10, MAT.wallLight, 10, -W / 2 + 8 + i * 13, 0, D / 2 + 6));
  }
  g.add(box(W - 8, 1.2, 8, MAT.concrete, 0, 10, D / 2 + 6));

  return describe(g, {
    title: 'Пулково-2',
    tag: 'Наследие',
    text: 'Здание бывшего международного сектора. С 2013 года регулярные рейсы обслуживаются в едином терминале Пулково-1; здание используется для деловой авиации и служебных нужд.',
    facts: [['Открыт', '1951 / реконструкция 1980'], ['Статус', 'служебное использование']],
  });
}

/* ------------------------------------------------------------------ */
/*  Диспетчерская вышка                                                */
/* ------------------------------------------------------------------ */

export function createTower() {
  const g = group('Диспетчерская вышка');
  g.position.set(TOWER.cx, 0, TOWER.cz);
  const H = TOWER.h;

  // Основание — техническое здание
  g.add(box(28, 9, 22, MAT.wallLight, 0, 0, 0));
  g.add(box(30, 0.8, 24, MAT.concrete, 0, 9, 0));

  // Ствол
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(4.2, 5.6, H - 12, 16), MAT.towerShaft);
  shaft.position.y = (H - 12) / 2;
  shaft.castShadow = true;
  g.add(shaft);

  // Вертикальные рёбра ствола
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * Math.PI * 2;
    const rib = new THREE.Mesh(new THREE.BoxGeometry(0.6, H - 14, 1.1), MAT.wallGrey);
    rib.position.set(Math.cos(a) * 4.8, (H - 12) / 2, Math.sin(a) * 4.8);
    rib.rotation.y = -a;
    g.add(rib);
  }

  // Расширяющаяся кабина
  const cabBase = new THREE.Mesh(new THREE.CylinderGeometry(9.5, 5.2, 5, 16), MAT.wallLight);
  cabBase.position.y = H - 12 + 2.5;
  cabBase.castShadow = true;
  g.add(cabBase);

  const cabGlass = new THREE.Mesh(new THREE.CylinderGeometry(9.0, 10.2, 5.2, 16, 1, true), MAT.towerGlass);
  cabGlass.position.y = H - 12 + 7.6;
  g.add(cabGlass);

  // Внутренняя подсветка кабины
  const cabGlow = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 8.4, 0.4, 16), EMIT.windowCool);
  cabGlow.position.y = H - 12 + 9.8;
  g.add(cabGlow);

  // Кровля кабины с козырьком
  const cabRoof = new THREE.Mesh(new THREE.CylinderGeometry(8.4, 11, 1.4, 16), MAT.wallGrey);
  cabRoof.position.y = H - 12 + 10.9;
  cabRoof.castShadow = true;
  g.add(cabRoof);

  // Мачта и заградительный огонь
  g.add(cyl(0.28, 0.4, 9, MAT.steel, 8, 0, H - 12 + 11.6, 0));
  const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.9, 10, 8), EMIT.beaconRed);
  beacon.position.y = H - 12 + 21;
  beacon.name = 'beacon';
  g.add(beacon);

  // Радар на крыше технического здания
  const radar = new THREE.Group();
  radar.position.set(12, 10, 0);
  radar.name = 'radar';
  const dish = new THREE.Mesh(new THREE.BoxGeometry(0.6, 3.6, 9), MAT.wallLight);
  dish.position.y = 5;
  radar.add(dish);
  radar.add(cyl(0.5, 0.7, 5, MAT.steel, 8, 0, 0, 0));
  g.add(radar);
  g.userData.radar = radar;

  return describe(g, {
    title: 'Командно-диспетчерский пункт',
    tag: 'Управление воздушным движением',
    text: 'Вышка КДП — рабочее место диспетчеров вышки, руления и старта. Отсюда контролируется движение на перроне, рулёжных дорожках и обеих ВПП.',
    facts: [['Высота', `${TOWER.h} м`], ['Обзор', '360°'], ['Позывной', 'Пулково-Вышка']],
  });
}

/* ------------------------------------------------------------------ */
/*  Привокзальная площадь, парковка, отель, дороги                     */
/* ------------------------------------------------------------------ */

export function createLandside() {
  const g = group('Привокзальная зона');

  // Площадь перед терминалом
  g.add(slab(560, 150, MAT.concrete, FORECOURT.cx, 0.05, FORECOURT.cz - 60));

  // Многоуровневая парковка
  const park = group('Парковка');
  park.position.set(PARKING.cx, 0, PARKING.cz);
  for (let lvl = 0; lvl < 4; lvl++) {
    park.add(box(PARKING.w, 0.7, PARKING.d, MAT.concrete, 0, lvl * 3.6, 0));
    // ограждающие рёбра
    for (const s of [-1, 1]) {
      park.add(box(PARKING.w, 1.1, 0.5, MAT.wallGrey, 0, lvl * 3.6 + 0.7, s * PARKING.d / 2));
      park.add(box(0.5, 1.1, PARKING.d, MAT.wallGrey, s * PARKING.w / 2, lvl * 3.6 + 0.7, 0));
    }
  }
  // колонны
  for (let x = -PARKING.w / 2 + 12; x < PARKING.w / 2; x += 24) {
    for (let z = -PARKING.d / 2 + 12; z < PARKING.d / 2; z += 24) {
      park.add(box(1.2, 14.4, 1.2, MAT.wallGrey, x, 0, z));
    }
  }
  park.add(parkedCars(PARKING.w, PARKING.d));
  describe(park, {
    title: 'Многоуровневый паркинг',
    tag: 'Привокзальная зона',
    text: 'Крытая парковка в шаговой доступности от терминала, соединена с ним пешеходным переходом.',
    facts: [['Уровней', '4'], ['Мест', '≈ 1 800']],
  });
  g.add(park);

  // Отель / бизнес-центр
  const hotel = group('Отель');
  hotel.position.set(HOTEL.cx, 0, HOTEL.cz);
  hotel.add(box(56, 34, 30, MAT.wallLight, 0, 0, 0));
  for (let f = 0; f < 9; f++) {
    const band = new THREE.Mesh(new THREE.BoxGeometry(56.5, 2.1, 30.5), MAT.glassDark);
    band.position.y = 3 + f * 3.6;
    hotel.add(band);
  }
  hotel.add(box(60, 1.2, 34, MAT.concrete, 0, 34, 0));
  const hotelSign = new THREE.Mesh(
    new THREE.PlaneGeometry(30, 5),
    new THREE.MeshBasicMaterial({
      map: textTexture('HOTEL', { width: 512, height: 128, font: 'bold 96px Arial', color: '#ffd98a' }),
      transparent: true, depthWrite: false,
    }),
  );
  hotelSign.position.set(0, 31, 15.3);
  hotel.add(hotelSign);
  describe(hotel, {
    title: 'Гостиница у терминала',
    tag: 'Привокзальная зона',
    text: 'Гостиничный комплекс на привокзальной площади для транзитных пассажиров и экипажей.',
    facts: [['Этажей', '9'], ['До терминала', '≈ 300 м']],
  });
  g.add(hotel);

  // Подъездные дороги
  const road = group('Дороги');
  road.add(slab(600, 26, MAT.asphalt, 0, 0.07, FORECOURT.cz - 105));
  road.add(slab(26, 400, MAT.asphalt, -300, 0.07, FORECOURT.cz + 120));
  road.add(slab(700, 22, MAT.asphalt, -200, 0.07, FORECOURT.cz + 320));
  // разметка
  for (let x = -290; x < 290; x += 24) {
    const d = new THREE.Mesh(new THREE.PlaneGeometry(12, 0.5), MAT.markWhite);
    d.rotation.x = -Math.PI / 2;
    d.position.set(x, 0.1, FORECOURT.cz - 105);
    road.add(d);
  }
  g.add(road);

  // Фонари вдоль площади
  for (let x = -260; x <= 260; x += 40) {
    g.add(streetLamp(x, FORECOURT.cz - 118));
  }

  // Автобусные павильоны
  for (const x of [-140, -60, 20, 100]) {
    const stop = new THREE.Group();
    stop.position.set(x, 0, FORECOURT.cz - 88);
    stop.add(box(18, 0.3, 5, MAT.glassDark, 0, 3.4, 0));
    stop.add(box(18, 0.2, 0.3, MAT.steel, 0, 3.2, -2.4));
    for (const s of [-1, 1]) stop.add(box(0.25, 3.4, 0.25, MAT.steel, s * 8.5, 0, 2.2));
    stop.add(box(16, 0.6, 1.4, MAT.vehicleGrey, 0, 0.5, 1));
    g.add(stop);
  }

  return g;
}

function parkedCars(w, d) {
  const g = new THREE.Group();
  const colors = [0xd8d8d8, 0x2c2c30, 0x8a1f22, 0x1f3f7a, 0x9aa0a6, 0x2f5f3a];
  const geo = new THREE.BoxGeometry(2.0, 1.45, 4.6);
  for (const c of colors) {
    const mat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.45, metalness: 0.3 });
    const count = 110;
    const inst = new THREE.InstancedMesh(geo, mat, count);
    const m = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const s = new THREE.Vector3(1, 1, 1);
    const p = new THREE.Vector3();
    for (let i = 0; i < count; i++) {
      const lvl = Math.floor(rand(0, 4));
      p.set(rand(-w / 2 + 6, w / 2 - 6), lvl * 3.6 + 1.4, rand(-d / 2 + 6, d / 2 - 6));
      m.compose(p, q, s);
      inst.setMatrixAt(i, m);
    }
    inst.instanceMatrix.needsUpdate = true;
    inst.castShadow = true;
    g.add(inst);
  }
  return g;
}

function streetLamp(x, z) {
  const g = new THREE.Group();
  g.position.set(x, 0, z);
  g.add(cyl(0.18, 0.28, 11, MAT.steel, 8));
  const arm = box(3.2, 0.2, 0.2, MAT.steel, 1.4, 10.9, 0);
  g.add(arm);
  g.add(box(1.5, 0.25, 0.7, EMIT.windowWarm, 2.9, 10.7, 0));
  return g;
}

/* ------------------------------------------------------------------ */
/*  Техническая зона: ангары, склад ГСМ, грузовой терминал             */
/* ------------------------------------------------------------------ */

export function createTechnicalZone() {
  const g = group('Техническая зона');

  // Ангары ТО
  for (let i = 0; i < 2; i++) {
    const h = group(`Ангар ${i + 1}`);
    h.position.set(700 + i * 130, 0, APRON.cz + 40);
    const W = 110, D = 78;
    h.add(box(W, 22, D, MAT.wallGrey, 0, 0, 0));
    // цилиндрическая кровля
    const roof = new THREE.Mesh(
      new THREE.CylinderGeometry(D / 2, D / 2, W, 20, 1, false, 0, Math.PI),
      MAT.steel,
    );
    roof.rotation.z = Math.PI / 2;
    roof.scale.x = 15 / (D / 2);   // приплюснутый свод высотой 15 м
    roof.position.y = 22;
    roof.castShadow = true;
    h.add(roof);
    // ворота
    const gate = new THREE.Mesh(new THREE.BoxGeometry(W - 12, 19, 0.8), MAT.glassDark);
    gate.position.set(0, 9.5, -D / 2 - 0.5);
    h.add(gate);
    describe(h, {
      title: `Ангар технического обслуживания ${i + 1}`,
      tag: 'Техническая зона',
      text: 'Ангар для оперативного и периодического технического обслуживания воздушных судов.',
      facts: [['Пролёт', '110 м'], ['Высота ворот', '19 м']],
    });
    g.add(h);
  }

  // Склад ГСМ
  const fuel = group('Склад ГСМ');
  fuel.position.set(-950, 0, APRON.cz + 30);
  for (let i = 0; i < 6; i++) {
    const t = new THREE.Mesh(new THREE.CylinderGeometry(11, 11, 14, 20), MAT.wallLight);
    t.position.set((i % 3) * 30, 7, Math.floor(i / 3) * 34);
    t.castShadow = true;
    fuel.add(t);
    const cap = new THREE.Mesh(new THREE.SphereGeometry(11, 20, 8, 0, Math.PI * 2, 0, Math.PI / 2), MAT.wallGrey);
    cap.position.set((i % 3) * 30, 14, Math.floor(i / 3) * 34);
    fuel.add(cap);
  }
  describe(fuel, {
    title: 'Склад горюче-смазочных материалов',
    tag: 'Техническая зона',
    text: 'Резервуарный парк авиатоплива; заправка воздушных судов ведётся топливозаправщиками и через систему централизованной заправки.',
    facts: [['Резервуаров', '6'], ['Топливо', 'Jet A-1 / ТС-1']],
  });
  g.add(fuel);

  // Грузовой терминал
  const cargo = group('Грузовой терминал');
  cargo.position.set(-780, 0, APRON.cz - 60);
  cargo.add(box(150, 14, 60, MAT.wallGrey, 0, 0, 0));
  cargo.add(box(154, 1, 64, MAT.steel, 0, 14, 0));
  for (let i = 0; i < 8; i++) {
    cargo.add(box(12, 4.5, 1, MAT.wallDark, -66 + i * 19, 0, 30.5));  // ворота доков
  }
  describe(cargo, {
    title: 'Грузовой терминал',
    tag: 'Техническая зона',
    text: 'Обработка и хранение авиагрузов, таможенный склад временного хранения.',
    facts: [['Площадь', '≈ 9 000 м²'], ['Доков', '8']],
  });
  g.add(cargo);

  // Ограждение периметра лётного поля
  g.add(perimeterFence());

  return g;
}

function perimeterFence() {
  const g = group('Периметр');
  const postGeo = new THREE.BoxGeometry(0.2, 3.2, 0.2);
  const pts = [
    [-1500, 620], [1200, 620], [1200, 200], [700, 200],
  ];
  const inst = new THREE.InstancedMesh(postGeo, MAT.fence, 600);
  const m = new THREE.Matrix4();
  const q = new THREE.Quaternion();
  const s = new THREE.Vector3(1, 1, 1);
  const p = new THREE.Vector3();
  let i = 0;
  for (let k = 0; k < pts.length - 1 && i < 600; k++) {
    const [x1, z1] = pts[k];
    const [x2, z2] = pts[k + 1];
    const len = Math.hypot(x2 - x1, z2 - z1);
    const n = Math.floor(len / 8);
    for (let j = 0; j <= n && i < 600; j++) {
      const t = j / n;
      p.set(x1 + (x2 - x1) * t, 1.6, z1 + (z2 - z1) * t);
      m.compose(p, q, s);
      inst.setMatrixAt(i++, m);
    }
  }
  inst.count = i;
  inst.instanceMatrix.needsUpdate = true;
  g.add(inst);
  return g;
}
