import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import './style.css';

import { setWireframe } from './utils/materials.js';
import { group } from './utils/helpers.js';
import {
  AIRPORT_ROT, RWY1, RWY2, TERMINAL, OLD_TERMINAL, TOWER, TERMINAL2,
  APRON, PARKING, HOTEL,
} from './scene/layout.js';
import { createEnvironment } from './scene/environment.js';
import {
  createGround, createRunway, createTaxiways, createApron,
  createFloodMasts, updateAirfieldLights,
} from './scene/airfield.js';
import { createTerminal } from './scene/terminal.js';
import {
  createOldTerminal, createTerminal2, createTower, createLandside, createTechnicalZone,
} from './scene/buildings.js';
import { createGroundFleet } from './scene/vehicles.js';
import { createTraffic, updateBeacons } from './scene/traffic.js';
import { LabelLayer } from './systems/labels.js';
import { createPostFX } from './systems/postfx.js';
import { Presentation, CHAPTERS } from './systems/presentation.js';

/* ================================================================== */
/*  Рендерер                                                           */
/* ================================================================== */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: false, powerPreference: 'high-performance',
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.NeutralToneMapping;   // спокойный «архивизный» контраст
renderer.toneMappingExposure = 1.0;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(46, innerWidth / innerHeight, 2, 26000);
camera.position.set(-900, 700, 1600);

const airport = group('Аэропорт');
airport.rotation.y = AIRPORT_ROT;
scene.add(airport);

const env = createEnvironment(scene, renderer);
const fx = createPostFX(renderer, scene, camera);

const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;
controls.dampingFactor = 0.07;
controls.maxPolarAngle = Math.PI * 0.495;
controls.minDistance = 12;
controls.maxDistance = 9000;
controls.screenSpacePanning = false;

/* ================================================================== */
/*  Сборка сцены                                                       */
/* ================================================================== */

const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderHint = document.getElementById('loader-hint');

const layerRegistry = [];
let terminalParts = null;
let traffic = null;

const STEPS = [
  ['Планировка лётного поля', () => {
    const ground = createGround();
    airport.add(ground);
    layerRegistry.push({ name: 'Рельеф и озеленение', object: ground, color: '#9aa886' });
  }],
  ['Взлётно-посадочные полосы', () => {
    const rw = group('ВПП');
    rw.add(createRunway(RWY1), createRunway(RWY2));
    airport.add(rw);
    layerRegistry.push({ name: 'ВПП', object: rw, color: '#817f7c' });
  }],
  ['Рулёжные дорожки', () => {
    const tw = createTaxiways();
    airport.add(tw);
    layerRegistry.push({ name: 'Рулёжные дорожки', object: tw, color: '#d8bd6a' });
  }],
  ['Перрон и стоянки', () => {
    const ap = createApron();
    const masts = createFloodMasts();
    airport.add(ap, masts);
    layerRegistry.push({ name: 'Перрон', object: ap, color: '#a3a19c' });
    layerRegistry.push({ name: 'Мачты освещения', object: masts, color: '#e8e0cc' });
  }],
  ['Терминал Пулково-1', () => {
    terminalParts = createTerminal();
    airport.add(terminalParts.root);
    layerRegistry.push({ name: 'Терминал Пулково-1', object: terminalParts.root, color: '#c7a367' });
  }],
  ['Исторические здания', () => {
    const old = createOldTerminal();
    const t2 = createTerminal2();
    airport.add(old, t2);
    layerRegistry.push({ name: 'Терминал 1973 года', object: old, color: '#eeece7' });
    layerRegistry.push({ name: 'Пулково-2', object: t2, color: '#c8c6c1' });
  }],
  ['Диспетчерская вышка', () => {
    const tw = createTower();
    airport.add(tw);
    layerRegistry.push({ name: 'Вышка КДП', object: tw, color: '#e6e4df' });
  }],
  ['Привокзальная зона', () => {
    const ls = createLandside();
    airport.add(ls);
    layerRegistry.push({ name: 'Привокзальная зона', object: ls, color: '#c2beb6' });
  }],
  ['Техническая зона', () => {
    const tz = createTechnicalZone();
    airport.add(tz);
    layerRegistry.push({ name: 'Техническая зона', object: tz, color: '#dedcd7' });
  }],
  ['Наземная техника', () => {
    const fleet = createGroundFleet();
    airport.add(fleet.group);
    layerRegistry.push({ name: 'Наземная техника', object: fleet.group, color: '#d3b877' });
  }],
  ['Воздушные суда', () => {
    traffic = createTraffic();
    airport.add(traffic.group);
    layerRegistry.push({ name: 'Воздушные суда', object: traffic.group, color: '#f6f5f2' });
  }],
];

async function build() {
  for (let i = 0; i < STEPS.length; i++) {
    const [label, fn] = STEPS[i];
    loaderHint.textContent = label;
    loaderBar.style.width = `${Math.round((i / STEPS.length) * 100)}%`;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    fn();
  }
  loaderBar.style.width = '100%';
  loaderHint.textContent = 'Готово';
  finish();
  setTimeout(() => {
    loaderEl.classList.add('done');
    setTimeout(() => loaderEl.remove(), 900);
  }, 400);
}

/* ================================================================== */
/*  Подписи                                                            */
/* ================================================================== */

const labels = new LabelLayer(document.body);

const LABELS = [
  [[TERMINAL.cx, 36, TERMINAL.cz], 'Терминал Пулково-1', true],
  [[OLD_TERMINAL.cx, 32, OLD_TERMINAL.cz], 'Терминал 1973 · «пять стаканов»', true],
  [[TERMINAL2.cx, 16, TERMINAL2.cz], 'Пулково-2', false],
  [[TOWER.cx, TOWER.h + 16, TOWER.cz], 'КДП', true],
  [[RWY1.cx, 10, RWY1.cz - 70], 'ВПП 10L/28R · 3400 м', true],
  [[RWY2.cx, 10, RWY2.cz + 70], 'ВПП 10R/28L · 3780 м', true],
  [[APRON.cx - 480, 12, APRON.cz - 120], 'Удалённые стоянки', false],
  [[APRON.cx, 12, APRON.cz + 120], 'Перрон', false],
  [[PARKING.cx, 24, PARKING.cz], 'Паркинг', false],
  [[HOTEL.cx, 42, HOTEL.cz], 'Гостиница', false],
  [[700, 42, APRON.cz + 40], 'Ангары ТО', false],
  [[-950, 24, APRON.cz + 30], 'Склад ГСМ', false],
  [[-780, 22, APRON.cz - 60], 'Грузовой терминал', false],
];

/* ================================================================== */
/*  Презентация                                                        */
/* ================================================================== */

let show = null;

const ui = {
  animate: true,
  labels: true,
  shadows: true,
  wireframe: false,
  cutaway: false,
};

const $ = (id) => document.getElementById(id);
const chapterEl = $('chapter');
const chNum = $('ch-num');
const chTitle = $('ch-title');
const chSub = $('ch-sub');
const dotsEl = $('dots');
const progressBar = $('progress-bar');
const clockEl = $('clock');
const timeSlider = $('time-of-day');

function finish() {
  for (const [p, text, major] of LABELS) {
    const world = airport.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
    labels.add(world, text, { major, maxDist: major ? 6000 : 2600 });
  }

  show = new Presentation({ camera, controls, airport, onChapter });
  buildUI();
  show.go(0, { instant: true });
}

function onChapter(ch, index) {
  chNum.textContent = String(index + 1).padStart(2, '0');
  chTitle.textContent = ch.title;
  chSub.textContent = ch.subtitle;

  chapterEl.classList.remove('enter');
  void chapterEl.offsetWidth;          // перезапуск анимации появления
  chapterEl.classList.add('enter');

  [...dotsEl.children].forEach((d, i) => d.classList.toggle('active', i === index));

  labels.setFilter(ch.labels || []);

  if (ch.time !== undefined) {
    timeSlider.value = String(ch.time);
    setHour(ch.time);
  }
  const cut = !!ch.cutaway;
  if (cut !== ui.cutaway) {
    ui.cutaway = cut;
    $('cutaway').checked = cut;
    terminalParts.glazing.visible = !cut;
  }
}

function buildUI() {
  // точки-индикаторы глав
  CHAPTERS.forEach((ch, i) => {
    const d = document.createElement('i');
    d.className = 'dot';
    d.title = ch.title;
    d.addEventListener('click', (e) => { e.stopPropagation(); show.go(i); });
    dotsEl.appendChild(d);
  });

  $('next').addEventListener('click', (e) => { e.stopPropagation(); show.next(); });
  $('prev').addEventListener('click', (e) => { e.stopPropagation(); show.prev(); });

  const playBtn = $('play');
  playBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    show.setPlaying(!show.playing);
    $('icon-pause').hidden = !show.playing;
    $('icon-play').hidden = show.playing;
  });

  // панель инструментов
  const tools = $('tools');
  const toggleTools = () => tools.classList.toggle('hidden');
  $('tools-btn').addEventListener('click', (e) => { e.stopPropagation(); toggleTools(); });
  $('tools-close').addEventListener('click', (e) => { e.stopPropagation(); tools.classList.add('hidden'); });
  tools.addEventListener('click', (e) => e.stopPropagation());
  $('nav').addEventListener('click', (e) => e.stopPropagation());

  // слои
  const layersEl = $('layers');
  for (const layer of layerRegistry) {
    const label = document.createElement('label');
    label.className = 'row';
    const span = document.createElement('span');
    const sw = document.createElement('i');
    sw.className = 'sw';
    sw.style.background = layer.color;
    span.append(sw, document.createTextNode(layer.name));
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => { layer.object.visible = cb.checked; });
    label.append(span, cb);
    layersEl.appendChild(label);
  }

  $('wireframe').addEventListener('change', (e) => {
    ui.wireframe = e.target.checked;
    setWireframe(ui.wireframe);
  });
  $('labels').addEventListener('change', (e) => {
    ui.labels = e.target.checked;
    labels.setEnabled(ui.labels);
  });
  $('cutaway').addEventListener('change', (e) => {
    ui.cutaway = e.target.checked;
    terminalParts.glazing.visible = !ui.cutaway;
  });
  $('animate').addEventListener('change', (e) => { ui.animate = e.target.checked; });
  $('shadows').addEventListener('change', (e) => {
    renderer.shadowMap.enabled = e.target.checked;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const m of mats) if (m) m.needsUpdate = true;
    });
  });

  timeSlider.addEventListener('input', () => setHour(parseFloat(timeSlider.value)));
  document.querySelectorAll('.presets button').forEach((b) => {
    b.addEventListener('click', (e) => {
      e.stopPropagation();
      const h = parseFloat(b.dataset.time);
      timeSlider.value = String(h);
      setHour(h);
    });
  });

  /* --- Клик по сцене листает главы, перетаскивание осматривает --- */
  let down = { x: 0, y: 0, t: 0 };
  canvas.addEventListener('pointerdown', (e) => {
    down = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvas.addEventListener('pointerup', (e) => {
    const moved = Math.hypot(e.clientX - down.x, e.clientY - down.y);
    const dt = performance.now() - down.t;
    if (moved < 6 && dt < 500) show.next();
    else show.nudge(6);
  });
  canvas.addEventListener('wheel', () => show.nudge(6), { passive: true });

  /* --- Клавиатура --- */
  addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    if (e.code === 'ArrowRight' || e.code === 'Space' || e.code === 'PageDown') {
      e.preventDefault(); show.next();
    } else if (e.code === 'ArrowLeft' || e.code === 'PageUp') {
      e.preventDefault(); show.prev();
    } else if (e.code === 'KeyP') {
      playBtn.click();
    } else if (e.code === 'KeyH') {
      document.body.classList.toggle('ui-hidden');
    } else if (e.code === 'KeyT') {
      toggleTools();
    } else if (e.key >= '1' && e.key <= '9') {
      const i = Number(e.key) - 1;
      if (i < CHAPTERS.length) show.go(i);
    }
  });
}

function setHour(h) {
  const st = env.setTimeOfDay(h);
  updateAirfieldLights(st.night);
  fx.setNightFactor(st.night);
  document.body.classList.toggle('night', st.night > 0.55);
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h % 1) * 60);
  clockEl.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
}

/* ================================================================== */
/*  Цикл рендеринга                                                    */
/* ================================================================== */

const clock = new THREE.Clock();
let elapsed = 0;

/**
 * Страховка для показа на чужой машине: если видеокарта не тянет,
 * тяжёлые эффекты отключаются сами, а не превращают доклад в слайд-шоу.
 */
const quality = { frames: 0, time: 0, level: 2 };

function guardQuality(dt) {
  quality.frames++;
  quality.time += dt;
  if (quality.time < 2.5) return;
  const fps = quality.frames / quality.time;
  quality.frames = 0;
  quality.time = 0;

  if (fps < 26 && quality.level === 2) {
    quality.level = 1;
    fx.gtao.enabled = false;
  } else if (fps < 20 && quality.level === 1) {
    quality.level = 0;
    fx.bloom.enabled = false;
    renderer.setPixelRatio(1);
    fx.composer.setPixelRatio(1);
    fx.setSize(innerWidth, innerHeight);
  } else if (fps > 52 && quality.level === 1) {
    quality.level = 2;
    fx.gtao.enabled = true;
  }
}

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;
  guardQuality(dt);

  if (show) {
    show.update(dt);
    progressBar.style.width = `${(show.progress * 100).toFixed(1)}%`;
  }
  controls.update();

  if (traffic && ui.animate) {
    for (const m of traffic.movers) m.update(dt);
    updateBeacons(traffic.beacons, elapsed);
    animateJetbridges(elapsed);
  }

  const radar = airport.getObjectByName('radar');
  if (radar && ui.animate) radar.rotation.y = elapsed * 0.5;

  labels.update(camera);
  fx.composer.render();
}

/** Телетрапы подтягиваются к самолётам, стоящим у гейтов. */
function animateJetbridges(t) {
  if (!terminalParts || !traffic) return;
  terminalParts.jetbridges.forEach((jb, i) => {
    const occupied = traffic.parked.some((p) => Math.abs(p.gate.x - jb.position.x) < 1);
    const target = occupied ? jb.userData.parkedAngle : jb.userData.stowedAngle;
    const wobble = occupied ? 0 : Math.sin(t * 0.25 + i) * 0.05;
    jb.userData.arm.rotation.y += (target + wobble - jb.userData.arm.rotation.y) * 0.02;
  });
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  fx.setSize(innerWidth, innerHeight);
});

window.__pulkovo = { scene, camera, controls, env, fx, airport, get show() { return show; } };

build();
tick();
