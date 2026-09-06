import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { GTAOPass } from 'three/addons/postprocessing/GTAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { SMAAPass } from 'three/addons/postprocessing/SMAAPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

/**
 * Постобработка в духе архитектурной визуализации:
 * мягкое затенение в стыках (GTAO), лёгкое свечение источников света,
 * сглаживание и деликатная виньетка с тональной коррекцией.
 */

const GradeShader = {
  uniforms: {
    tDiffuse: { value: null },
    uVignette: { value: 0.42 },
    uLift: { value: new THREE.Color(0.008, 0.011, 0.016) },
    uSaturation: { value: 0.95 },
    uContrast: { value: 1.09 },
  },
  vertexShader: /* glsl */`
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse;
    uniform float uVignette;
    uniform vec3 uLift;
    uniform float uSaturation;
    uniform float uContrast;
    varying vec2 vUv;

    void main() {
      vec4 c = texture2D(tDiffuse, vUv);

      // контраст вокруг средне-серого
      c.rgb = (c.rgb - 0.5) * uContrast + 0.5;

      // приглушение насыщенности — макетная, «бумажная» палитра
      float l = dot(c.rgb, vec3(0.2126, 0.7152, 0.0722));
      c.rgb = mix(vec3(l), c.rgb, uSaturation);

      // мягкий подъём теней, чтобы чёрное не проваливалось
      c.rgb += uLift * (1.0 - l);

      // виньетка
      vec2 d = vUv - 0.5;
      float v = 1.0 - dot(d, d) * uVignette * 2.4;
      c.rgb *= clamp(v, 0.0, 1.0);

      gl_FragColor = vec4(clamp(c.rgb, 0.0, 1.0), c.a);
    }
  `,
};

export function createPostFX(renderer, scene, camera) {
  const size = renderer.getSize(new THREE.Vector2());
  const composer = new EffectComposer(renderer);
  composer.setPixelRatio(Math.min(devicePixelRatio, 2));
  composer.setSize(size.x, size.y);

  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);

  // Ambient occlusion — то, что отличает «рендер» от «игрушки»:
  // мягкая грязь в стыках стен, под самолётами, в складках кровли
  const gtao = new GTAOPass(scene, camera, size.x, size.y);
  gtao.output = GTAOPass.OUTPUT.Default;
  gtao.updateGtaoMaterial({
    radius: 14,
    distanceExponent: 1.2,
    thickness: 3.0,
    scale: 1.1,
    samples: 16,
    screenSpaceRadius: false,
  });
  gtao.updatePdMaterial({ lumaPhi: 10, depthPhi: 2, normalPhi: 3.2, radius: 4, samples: 12 });
  gtao.blendIntensity = 0.85;
  composer.addPass(gtao);

  // Очень сдержанный bloom — только по-настоящему ярким источникам
  const bloom = new UnrealBloomPass(new THREE.Vector2(size.x, size.y), 0.24, 0.7, 0.92);
  composer.addPass(bloom);

  const grade = new ShaderPass(GradeShader);
  composer.addPass(grade);

  composer.addPass(new OutputPass());

  const smaa = new SMAAPass();
  composer.addPass(smaa);

  function setSize(w, h) {
    composer.setSize(w, h);
    gtao.setSize(w, h);
    bloom.setSize(w, h);
  }

  /** Ночью AO и виньетка мешают — приглушаем, bloom наоборот усиливаем. */
  function setNightFactor(f) {
    gtao.blendIntensity = 0.85 - 0.45 * f;
    bloom.strength = 0.2 + 0.22 * f;
    grade.uniforms.uVignette.value = 0.42 + 0.25 * f;
    grade.uniforms.uSaturation.value = 0.92 - 0.1 * f;
  }

  return { composer, gtao, bloom, grade, smaa, setSize, setNightFactor };
}
