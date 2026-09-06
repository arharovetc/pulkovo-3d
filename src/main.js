import * as THREE from 'three';
import './style.css';

import { setWireframe } from './utils/materials.js';
import { group } from './utils/helpers.js';
import { AIRPORT_ROT, RWY1, RWY2, TERMINAL, OLD_TERMINAL, TOWER, TERMINAL2, APRON, PARKING, HOTEL } from './scene/layout.js';
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
import { Picker, InfoPanel } from './systems/picking.js';
import { createCameraRig, FlyMode, VIEWS } from './systems/cameraModes.js';

/* ------------------------------------------------------------------ */
/*  Рендерер и сцена                                                   */
/* ------------------------------------------------------------------ */

const canvas = document.getElementById('scene');
const renderer = new THREE.WebGLRenderer({
  canvas, antialias: true, powerPreference: 'high-performance', logarithmicDepthBuffer: true,
});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 0.95;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(52, innerWidth / innerHeight, 1, 30000);

const airport = group('Аэропорт');
airport.rotation.y = AIRPORT_ROT;
scene.add(airport);

const env = createEnvironment(scene, renderer);

/* ------------------------------------------------------------------ */
/*  Построение сцены по этапам (чтобы показать прогресс)               */
/* ------------------------------------------------------------------ */

const loaderEl = document.getElementById('loader');
const loaderBar = document.getElementById('loader-bar');
const loaderHint = document.getElementById('loader-hint');

const layerRegistry = [];   // { name, object, color }
let terminalParts = null;
let traffic = null;

const STEPS = [
  ['Планировка лётного поля', () => {
    const ground = createGround();
    airport.add(ground);
    layerRegistry.push({ name: 'Рельеф и озеленение', object: ground, color: '#3f5a34' });
  }],
  ['Взлётно-посадочные полосы', () => {
    const r1 = createRunway(RWY1);
    const r2 = createRunway(RWY2);
    const rw = group('ВПП');
    rw.add(r1, r2);
    airport.add(rw);
    layerRegistry.push({ name: 'ВПП', object: rw, color: '#24272b' });
  }],
  ['Рулёжные дорожки', () => {
    const tw = createTaxiways();
    airport.add(tw);
    layerRegistry.push({ name: 'Рулёжные дорожки', object: tw, color: '#d8b23a' });
  }],
  ['Перрон и стоянки', () => {
    const ap = createApron();
    const masts = createFloodMasts();
    airport.add(ap, masts);
    layerRegistry.push({ name: 'Перрон', object: ap, color: '#3a3e44' });
    layerRegistry.push({ name: 'Мачты освещения', object: masts, color: '#fff0cf' });
  }],
  ['Терминал Пулково-1', () => {
    terminalParts = createTerminal();
    airport.add(terminalParts.root);
    layerRegistry.push({ name: 'Терминал Пулково-1', object: terminalParts.root, color: '#b98f42' });
  }],
  ['Исторические здания', () => {
    const old = createOldTerminal();
    const t2 = createTerminal2();
    airport.add(old, t2);
    layerRegistry.push({ name: 'Терминал 1973 года', object: old, color: '#d6d9dc' });
    layerRegistry.push({ name: 'Пулково-2', object: t2, color: '#9aa1a8' });
  }],
  ['Диспетчерская вышка', () => {
    const tw = createTower();
    airport.add(tw);
    layerRegistry.push({ name: 'Вышка КДП', object: tw, color: '#c3c8cd' });
  }],
  ['Привокзальная зона', () => {
    const ls = createLandside();
    airport.add(ls);
    layerRegistry.push({ name: 'Привокзальная зона', object: ls, color: '#6f7378' });
  }],
  ['Техническая зона', () => {
    const tz = createTechnicalZone();
    airport.add(tz);
    layerRegistry.push({ name: 'Техническая зона', object: tz, color: '#8b9299' });
  }],
  ['Наземная техника', () => {
    const fleet = createGroundFleet();
    airport.add(fleet.group);
    layerRegistry.push({ name: 'Наземная техника', object: fleet.group, color: '#d9a326' });
  }],
  ['Воздушные суда', () => {
    traffic = createTraffic();
    airport.add(traffic.group);
    layerRegistry.push({ name: 'Воздушные суда', object: traffic.group, color: '#f2f4f6' });
  }],
];

async function build() {
  for (let i = 0; i < STEPS.length; i++) {
    const [label, fn] = STEPS[i];
    loaderHint.textContent = label + '…';
    loaderBar.style.width = `${Math.round((i / STEPS.length) * 100)}%`;
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
    fn();
  }
  loaderBar.style.width = '100%';
  loaderHint.textContent = 'Готово';
  finish();
  setTimeout(() => {
    loaderEl.classList.add('done');
    setTimeout(() => loaderEl.remove(), 700);
  }, 350);
}

/* ------------------------------------------------------------------ */
/*  Подписи, выбор объектов, камера                                    */
/* ------------------------------------------------------------------ */

const labels = new LabelLayer(document.body);
const infoPanel = new InfoPanel();
let picker = null;
let rig = null;
let fly = null;

const LABELS = [
  [[TERMINAL.cx, 34, TERMINAL.cz], 'Терминал Пулково-1', true],
  [[OLD_TERMINAL.cx, 30, OLD_TERMINAL.cz], 'Терминал 1973 · «пять стаканов»', true],
  [[TERMINAL2.cx, 16, TERMINAL2.cz], 'Пулково-2', false],
  [[TOWER.cx, TOWER.h + 14, TOWER.cz], 'КДП', true],
  [[RWY1.cx, 8, RWY1.cz - 60], 'ВПП 10L/28R · 3400 м', true],
  [[RWY2.cx, 8, RWY2.cz + 60], 'ВПП 10R/28L · 3780 м', true],
  [[APRON.cx - 480, 10, APRON.cz - 120], 'Удалённые стоянки', false],
  [[APRON.cx, 10, APRON.cz + 120], 'Перрон', false],
  [[PARKING.cx, 22, PARKING.cz], 'Паркинг', false],
  [[HOTEL.cx, 40, HOTEL.cz], 'Гостиница', false],
  [[700, 40, APRON.cz + 40], 'Ангары ТО', false],
  [[-950, 22, APRON.cz + 30], 'Склад ГСМ', false],
  [[-780, 20, APRON.cz - 60], 'Грузовой терминал', false],
];

function finish() {
  for (const [p, text, major] of LABELS) {
    const world = airport.localToWorld(new THREE.Vector3(p[0], p[1], p[2]));
    labels.add(world, text, { major, maxDist: major ? 5200 : 2400 });
  }

  rig = createCameraRig(camera, renderer, airport);
  rig.goTo(VIEWS[0], true);

  fly = new FlyMode(camera, renderer.domElement);
  picker = new Picker(renderer, camera, scene, infoPanel);

  buildUI();
}

/* ------------------------------------------------------------------ */
/*  Интерфейс                                                          */
/* ------------------------------------------------------------------ */

const ui = {
  animate: true,
  speed: 1,
  labels: true,
  shadows: true,
  wireframe: false,
  cutaway: false,
  hour: 12,
};

function buildUI() {
  // Ракурсы
  const viewsEl = document.getElementById('views');
  const viewButtons = [];
  VIEWS.forEach((v, i) => {
    const b = document.createElement('button');
    b.innerHTML = `${v.name}<kbd>${v.key}</kbd>`;
    b.addEventListener('click', () => selectView(i));
    viewsEl.appendChild(b);
    viewButtons.push(b);
  });

  function selectView(i) {
    rig.goTo(VIEWS[i]);
    viewButtons.forEach((b, k) => b.classList.toggle('active', k === i));
    if (fly.enabled) {
      flyToggle.checked = false;
      setFly(false);
    }
  }
  // Слои
  const layersEl = document.getElementById('layers');
  for (const layer of layerRegistry) {
    const label = document.createElement('label');
    label.className = 'row';
    const sw = document.createElement('i');
    sw.className = 'sw';
    sw.style.background = layer.color;
    const span = document.createElement('span');
    span.textContent = layer.name;
    span.prepend(sw);
    sw.style.display = 'inline-block';
    sw.style.marginRight = '7px';
    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = true;
    cb.addEventListener('change', () => { layer.object.visible = cb.checked; });
    label.append(span, cb);
    layersEl.appendChild(label);
  }

  // Переключатели отображения
  const $ = (id) => document.getElementById(id);

  $('wireframe').addEventListener('change', (e) => {
    ui.wireframe = e.target.checked;
    setWireframe(ui.wireframe);
  });

  $('shadows').addEventListener('change', (e) => {
    ui.shadows = e.target.checked;
    renderer.shadowMap.enabled = ui.shadows;
    scene.traverse((o) => {
      if (!o.isMesh) return;
      const mats = Array.isArray(o.material) ? o.material : [o.material];
      for (const mm of mats) if (mm) mm.needsUpdate = true;
    });
  });

  $('labels').addEventListener('change', (e) => {
    ui.labels = e.target.checked;
    labels.setEnabled(ui.labels);
  });

  $('cutaway').addEventListener('change', (e) => {
    ui.cutaway = e.target.checked;
    terminalParts.shell.visible = !ui.cutaway;
  });

  $('animate').addEventListener('change', (e) => { ui.animate = e.target.checked; });

  $('orbit-auto').addEventListener('change', (e) => {
    rig.controls.autoRotate = e.target.checked;
  });

  const flyToggle = $('fly-mode');
  flyToggle.addEventListener('change', (e) => setFly(e.target.checked));

  function setFly(on) {
    fly.setEnabled(on);
    rig.controls.enabled = !on;
    document.getElementById('hint').innerHTML = on
      ? '<b>WASD</b> движение · <b>Q/E</b> вниз/вверх · <b>Shift</b> быстрее · <b>ЛКМ + мышь</b> осмотреться · <b>F</b> выйти'
      : '<b>ЛКМ</b> вращать · <b>ПКМ</b> перемещать · <b>колесо</b> зум · <b>клик по объекту</b> — информация · <b>F</b> свободный полёт (WASD + Shift) · <b>1…6</b> ракурсы · <b>H</b> скрыть интерфейс';
  }

  // Время суток
  const timeSlider = $('time-of-day');
  timeSlider.addEventListener('input', () => setHour(parseFloat(timeSlider.value)));
  document.querySelectorAll('.presets button').forEach((b) => {
    b.addEventListener('click', () => {
      const h = parseFloat(b.dataset.time);
      timeSlider.value = String(h);
      setHour(h);
    });
  });

  // Скорость анимации
  const speedSlider = $('speed');
  const speedVal = $('speed-val');
  speedSlider.addEventListener('input', () => {
    ui.speed = parseFloat(speedSlider.value);
    speedVal.textContent = `×${ui.speed.toFixed(1)}`;
  });

  // Сворачивание панели
  const panel = document.getElementById('panel');
  $('panel-toggle').addEventListener('click', () => {
    panel.classList.toggle('collapsed');
    $('panel-toggle').textContent = panel.classList.contains('collapsed') ? '⟩' : '⟨';
  });

  // Клавиатура
  window.addEventListener('keydown', (e) => {
    if (e.target instanceof HTMLInputElement) return;
    const idx = VIEWS.findIndex((v) => v.key === e.key);
    if (idx >= 0) { selectView(idx); return; }
    if (e.code === 'KeyF') {
      flyToggle.checked = !flyToggle.checked;
      setFly(flyToggle.checked);
    }
    if (e.code === 'KeyH') document.body.classList.toggle('ui-hidden');
    if (e.code === 'Escape') picker.clear();
  });

  setHour(12);
  selectView(0);
}

const clockTime = document.getElementById('clock-time');
const clockLabel = document.getElementById('clock-label');

function setHour(h) {
  ui.hour = h;
  const st = env.setTimeOfDay(h);
  updateAirfieldLights(st.night);
  const hh = Math.floor(h) % 24;
  const mm = Math.floor((h % 1) * 60);
  clockTime.textContent = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
  clockLabel.textContent = st.night > 0.75 ? 'ночь'
    : st.night > 0.3 ? 'сумерки'
      : h < 11 ? 'утро' : h < 17 ? 'день' : 'вечер';
}

/* ------------------------------------------------------------------ */
/*  Цикл рендеринга                                                    */
/* ------------------------------------------------------------------ */

const clock = new THREE.Clock();
const compassNeedle = document.querySelector('#compass i');
let elapsed = 0;

function tick() {
  requestAnimationFrame(tick);
  const dt = Math.min(clock.getDelta(), 0.1);
  elapsed += dt;

  if (rig) {
    rig.updateAnim(dt);
    if (!fly.enabled) rig.controls.update();
    fly.update(dt);
  }

  if (traffic && ui.animate) {
    const sdt = dt * ui.speed;
    for (const m of traffic.movers) m.update(sdt);
    updateBeacons(traffic.beacons, elapsed * ui.speed);
    animateJetbridges(elapsed);
  }

  // Радар на вышке
  const radar = airport.getObjectByName('radar');
  if (radar && ui.animate) radar.rotation.y = elapsed * 0.6 * ui.speed;

  if (picker) picker.update();
  labels.update(camera);

  if (compassNeedle) {
    const dir = new THREE.Vector3();
    camera.getWorldDirection(dir);
    const yaw = Math.atan2(dir.x, -dir.z);
    compassNeedle.style.transform = `translateY(-100%) rotate(${-yaw}rad)`;
  }

  renderer.render(scene, camera);
}

/** Телетрапы плавно пристыковываются к самолётам, стоящим у гейтов. */
function animateJetbridges(t) {
  if (!terminalParts) return;
  terminalParts.jetbridges.forEach((jb, i) => {
    const occupied = traffic.parked.some((p) => Math.abs(p.gate.x - (jb.position.x)) < 1);
    const target = occupied ? jb.userData.parkedAngle : jb.userData.stowedAngle;
    const wobble = occupied ? 0 : Math.sin(t * 0.3 + i) * 0.06;
    jb.userData.arm.rotation.y += (target + wobble - jb.userData.arm.rotation.y) * 0.02;
  });
}

addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

build();
tick();
