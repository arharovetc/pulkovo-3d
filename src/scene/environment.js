import * as THREE from 'three';
import { setNightFactor } from '../utils/materials.js';
import { DEG } from '../utils/helpers.js';

/**
 * Небо, солнце и суточный цикл освещения.
 *
 * Небесный купол — собственный шейдер с toneMapped: false: цвет задаётся
 * напрямую в LDR, поэтому небо не «выгорает» при изменении экспозиции
 * тонмаппинга, которой подсвечивается сама сцена.
 */

const SKY_VERT = /* glsl */`
  varying vec3 vDir;
  void main() {
    vDir = (modelMatrix * vec4(position, 1.0)).xyz - cameraPosition;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const SKY_FRAG = /* glsl */`
  uniform vec3 uTop;
  uniform vec3 uHorizon;
  uniform vec3 uGround;
  uniform vec3 uSunTint;
  uniform vec3 uSunDisk;
  uniform vec3 uSunDir;
  uniform float uSunUp;
  varying vec3 vDir;

  void main() {
    vec3 d = normalize(vDir);
    float h = d.y;

    vec3 col = mix(uHorizon, uTop, pow(clamp(h, 0.0, 1.0), 0.42));
    col = mix(col, uGround, smoothstep(0.0, -0.14, h));

    float s = max(dot(d, uSunDir), 0.0);
    col += uSunTint * pow(s, 5.0) * 0.5;
    col += uSunTint * pow(s, 26.0) * 0.8;

    float disk = smoothstep(0.99960, 0.99990, s) * uSunUp;
    col = mix(col, uSunDisk, disk);

    gl_FragColor = vec4(col, 1.0);
  }
`;

const PAL = {
  day: {
    top: new THREE.Color(0x3d7ec6), horizon: new THREE.Color(0xc0d8ec),
    ground: new THREE.Color(0x8ea48c), tint: new THREE.Color(0xa8cbec),
    disk: new THREE.Color(0xfffdf2),
  },
  dusk: {
    top: new THREE.Color(0x27446f), horizon: new THREE.Color(0xe09a5c),
    ground: new THREE.Color(0x5a5347), tint: new THREE.Color(0xff9c4a),
    disk: new THREE.Color(0xffd9a0),
  },
  night: {
    top: new THREE.Color(0x040910), horizon: new THREE.Color(0x122033),
    ground: new THREE.Color(0x0a1119), tint: new THREE.Color(0x1b2f4d),
    disk: new THREE.Color(0xdfe8ff),
  },
};

const KEYS = [
  ['uTop', 'top'], ['uHorizon', 'horizon'], ['uGround', 'ground'],
  ['uSunTint', 'tint'], ['uSunDisk', 'disk'],
];

export function createEnvironment(scene, renderer) {
  /* ------------------------- Небесный купол ------------------------- */
  const uniforms = {
    uTop: { value: PAL.day.top.clone() },
    uHorizon: { value: PAL.day.horizon.clone() },
    uGround: { value: PAL.day.ground.clone() },
    uSunTint: { value: PAL.day.tint.clone() },
    uSunDisk: { value: PAL.day.disk.clone() },
    uSunDir: { value: new THREE.Vector3(0, 1, 0) },
    uSunUp: { value: 1 },
  };

  const sky = new THREE.Mesh(
    new THREE.SphereGeometry(24000, 32, 20),
    new THREE.ShaderMaterial({
      uniforms, vertexShader: SKY_VERT, fragmentShader: SKY_FRAG,
      side: THREE.BackSide, depthWrite: false, fog: false, toneMapped: false,
    }),
  );
  sky.name = 'sky';
  sky.frustumCulled = false;
  sky.renderOrder = -1000;
  scene.add(sky);

  /* ------------------------------ Свет ------------------------------ */
  const sun = new THREE.DirectionalLight(0xfff3e0, 3.4);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.near = 100;
  sun.shadow.camera.far = 5200;
  const S = 950;                       // область теней вокруг терминала
  sun.shadow.camera.left = -S;
  sun.shadow.camera.right = S;
  sun.shadow.camera.top = S;
  sun.shadow.camera.bottom = -S;
  sun.shadow.bias = -0.0005;
  sun.shadow.normalBias = 0.8;
  sun.target.position.set(0, 0, 0);
  scene.add(sun, sun.target);

  const hemi = new THREE.HemisphereLight(0xcfe3f7, 0x596b4c, 1.0);
  scene.add(hemi);

  const ambient = new THREE.AmbientLight(0x9db6cc, 0.35);
  scene.add(ambient);

  // Ночная подсветка города — силуэты не проваливаются в чёрное
  const cityGlow = new THREE.DirectionalLight(0x7796c4, 0);
  cityGlow.position.set(-900, 500, 1100);
  scene.add(cityGlow);

  /* ----------------------------- Звёзды ----------------------------- */
  const stars = makeStars();
  scene.add(stars);

  /* ----------------------------- Туман ------------------------------ */
  scene.fog = new THREE.Fog(0xc0d8ec, 3200, 20000);

  const sunPos = new THREE.Vector3();
  const state = { hour: 12, night: 0, sunPos };
  const tmpWhite = new THREE.Color(0xffffff);

  function setTimeOfDay(hour) {
    state.hour = ((hour % 24) + 24) % 24;
    const h = state.hour;

    // Высота солнца над горизонтом и азимут
    const elevation = 52 * Math.sin(((h - 6) / 12) * Math.PI);
    const azimuth = 95 + (h / 24) * 300;

    sunPos.setFromSphericalCoords(1, (90 - elevation) * DEG, azimuth * DEG);
    uniforms.uSunDir.value.copy(sunPos);
    uniforms.uSunUp.value = elevation > 0 ? 1 : 0;

    const nightF = THREE.MathUtils.clamp((2 - elevation) / 11, 0, 1);
    const duskF = THREE.MathUtils.clamp(1 - Math.abs(elevation - 3) / 11, 0, 1);
    state.night = nightF;

    // Палитра неба: день → закат → ночь
    for (const [uni, key] of KEYS) {
      uniforms[uni].value.copy(PAL.day[key]).lerp(PAL.dusk[key], duskF).lerp(PAL.night[key], nightF);
    }

    // Солнце
    sun.position.copy(sunPos).multiplyScalar(3200);
    sun.intensity = THREE.MathUtils.clamp(elevation / 14, 0, 1) * 3.6;
    sun.color.setRGB(1, 0.94 - 0.22 * duskF, 0.84 - 0.42 * duskF);
    sun.visible = elevation > -1;

    hemi.intensity = 0.2 + 1.35 * (1 - nightF);
    hemi.color.copy(uniforms.uHorizon.value).lerp(tmpWhite, 0.35);
    ambient.intensity = 0.14 + 0.4 * (1 - nightF);
    cityGlow.intensity = 0.55 * nightF;

    // Туман подхватывает цвет горизонта
    scene.fog.color.copy(uniforms.uHorizon.value);
    scene.background = null;

    renderer.toneMappingExposure = 0.95 - 0.5 * nightF - 0.08 * duskF;

    stars.material.opacity = Math.max(0, nightF - 0.3) * 1.45;
    stars.visible = stars.material.opacity > 0.01;

    setNightFactor(Math.pow(nightF, 0.75));
    return state;
  }

  setTimeOfDay(12);

  return { sky, sun, hemi, ambient, stars, setTimeOfDay, state };
}

function makeStars(count = 2200) {
  const pos = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    const v = new THREE.Vector3().setFromSphericalCoords(
      21000,
      Math.acos(Math.random() * 0.97),
      Math.random() * Math.PI * 2,
    );
    pos.set([v.x, v.y, v.z], i * 3);
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const mat = new THREE.PointsMaterial({
    color: 0xffffff, size: 55, sizeAttenuation: true,
    transparent: true, opacity: 0, depthWrite: false, fog: false, toneMapped: false,
  });
  const p = new THREE.Points(geo, mat);
  p.name = 'stars';
  p.frustumCulled = false;
  return p;
}
