import * as THREE from 'three';
import { RUN_SPEED } from './movement.ts';
import { getCharacter, type CharacterId } from './characters.ts';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderPass } from 'three/addons/postprocessing/ShaderPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

export function createEffects(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.Camera,
) {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const environment = new RoomEnvironment();
  const environmentMap = pmrem.fromScene(environment, 0.04);
  scene.environment = environmentMap.texture;
  scene.environmentIntensity = 0.38;
  environment.dispose();
  pmrem.dispose();
  let composer: EffectComposer | undefined,
    bloom: UnrealBloomPass | undefined,
    film: ShaderPass | undefined;
  let lightweight = true;
  function ensurePostProcessing() {
    if (composer) return;
    composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.45, 0.7, 0.75);
    composer.addPass(bloom);
    composer.addPass(new OutputPass());
    film = new ShaderPass({
      uniforms: {
        tDiffuse: { value: null },
        time: { value: 0 },
        amount: { value: 0.025 },
        liberated: { value: 0 },
      },
      vertexShader: `varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
      fragmentShader: `uniform sampler2D tDiffuse;uniform float time;uniform float amount;uniform float liberated;varying vec2 vUv;
      float hash(vec2 p){return fract(sin(dot(p,vec2(12.9898,78.233)))*43758.5453);}
      void main(){vec3 color=texture2D(tDiffuse,vUv).rgb;float vignette=1.-smoothstep(.2,.95,length((vUv-.5)*vec2(1.1,.82)));
      color*=mix(.70,1.0,vignette);color+=(hash(vUv+fract(time)*.1)-.5)*amount;
      color=mix(color,color*vec3(1.05,1.01,.95),liberated*.3);gl_FragColor=vec4(color,1.0);}`,
    });
    composer.addPass(film);

    composer.setPixelRatio(renderer.getPixelRatio());
    composer.setSize(innerWidth, innerHeight);
  }

  const count = 1600;
  const positions = new Float32Array(count * 3);
  const random = (i: number) => {
    const x = Math.sin(i * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  };
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (random(i * 3) - 0.5) * 100;
    positions[i * 3 + 1] = random(i * 3 + 1) * 32;
    positions[i * 3 + 2] = (random(i * 3 + 2) - 0.5) * 100;
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const snowMaterial = new THREE.ShaderMaterial({
    uniforms: {
      time: { value: 0 },
      opacity: { value: 0.65 },
      pixelRatio: { value: renderer.getPixelRatio() },
    },
    vertexShader: `uniform float time;uniform float pixelRatio;varying float depth;void main(){vec3 p=position;p.y=mod(p.y-time*(.8+fract(p.x)*.4),32.);p.x+=sin(time*.2+p.z*.3)*1.4;
      vec4 mv=modelViewMatrix*vec4(p,1.);depth=-mv.z;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(65./max(1.,depth),1.,4.)*pixelRatio;}`,
    fragmentShader: `uniform float opacity;varying float depth;void main(){float d=length(gl_PointCoord-.5);float a=(1.-smoothstep(.05,.5,d))*opacity*(1.-smoothstep(10.,90.,depth));gl_FragColor=vec4(.84,.95,1.,a);}`,
    transparent: true,
    depthWrite: false,
    blending: THREE.NormalBlending,
  });
  const snow = new THREE.Points(geometry, snowMaterial);
  snow.frustumCulled = false;
  scene.add(snow);
  return {
    update(time: number, liberation: number, reduced: boolean, low: boolean) {
      lightweight = low;
      if (!low) {
        ensurePostProcessing();
        film!.uniforms.time.value = reduced ? 0 : time;
        film!.uniforms.amount.value = reduced ? 0 : 0.018;
        film!.uniforms.liberated.value = liberation;
        bloom!.strength = 0.45 + liberation * 0.18;
      }
      snowMaterial.uniforms.time.value = reduced ? 0 : time;
      snowMaterial.uniforms.opacity.value = 0.6 * (1 - liberation * 0.75);
      snow.visible = !reduced;
      geometry.setDrawRange(0, low ? 500 : count);
    },
    render() {
      if (lightweight) renderer.render(scene, camera);
      else composer!.render();
    },
    resize(width: number, height: number) {
      composer?.setPixelRatio(renderer.getPixelRatio());
      composer?.setSize(width, height);
      snowMaterial.uniforms.pixelRatio.value = renderer.getPixelRatio();
    },
    dispose() {
      composer?.dispose();
      bloom?.dispose();
      film?.dispose();
      snowMaterial.dispose();
      geometry.dispose();
      environmentMap.dispose();
      scene.remove(snow);
    },
  };
}

export function createCourier(characterId: CharacterId = 'noor') {
  const profile = getCharacter(characterId);
  const isElio = profile.id === 'elio',
    isMira = profile.id === 'mira';
  const root = new THREE.Group();
  root.name = `${profile.name} · student courier`;
  const baseCloth = isElio ? 0xc6925e : isMira ? 0xa6b9ed : 0xe6ad65;
  const coat = new THREE.MeshStandardMaterial({
    color: isElio ? 0x53664c : isMira ? 0x514264 : 0x2c6268,
    roughness: 0.85,
  });
  const dark = new THREE.MeshStandardMaterial({
    color: isElio ? 0x2b332b : isMira ? 0x242337 : 0x172f39,
    roughness: 0.76,
  });
  const cloth = new THREE.MeshStandardMaterial({ color: baseCloth, roughness: 0.88 });
  const face = new THREE.MeshStandardMaterial({
    color: isElio ? 0xcb9770 : isMira ? 0xa86e54 : 0xd2a076,
    roughness: 0.81,
  });
  const hair = new THREE.MeshStandardMaterial({
    color: isElio ? 0x463426 : isMira ? 0x202437 : 0x372d28,
    roughness: 0.96,
  });
  const leather = new THREE.MeshStandardMaterial({
    color: isElio ? 0xa27748 : isMira ? 0x6c6388 : 0x8e7050,
    roughness: 0.79,
  });
  const metal = new THREE.MeshStandardMaterial({
    color: isElio ? 0xc4935e : 0x96abb0,
    roughness: 0.34,
    metalness: 0.74,
  });
  const light = new THREE.MeshStandardMaterial({
    color: profile.color,
    emissive: profile.color,
    emissiveIntensity: 0.65,
    roughness: 0.34,
  });
  const eye = new THREE.MeshStandardMaterial({ color: 0x101b29, roughness: 0.4 });
  const glow = new THREE.MeshStandardMaterial({
    color: 0x9ff3ff,
    emissive: 0x24d7fa,
    emissiveIntensity: 2.0,
    roughness: 0.23,
  });
  const lens = new THREE.MeshPhysicalMaterial({
    color: 0x92ccca,
    metalness: 0.18,
    roughness: 0.08,
    transparent: true,
    opacity: 0.52,
    clearcoat: 1,
  });
  const materials: THREE.Material[] = [
    coat,
    dark,
    cloth,
    face,
    hair,
    leather,
    metal,
    light,
    eye,
    glow,
    lens,
  ];
  const add = (
    geometry: THREE.BufferGeometry,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z);
    parent.add(mesh);
    return mesh;
  };
  const box = (
    w: number,
    h: number,
    d: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) => add(new THREE.BoxGeometry(w, h, d), material, x, y, z, parent);
  const ball = (
    radius: number,
    material: THREE.Material,
    x: number,
    y: number,
    z: number,
    parent: THREE.Object3D = root,
  ) => add(new THREE.SphereGeometry(radius, 12, 8), material, x, y, z, parent);
  add(new THREE.CapsuleGeometry(isElio ? 0.29 : 0.27, 0.48, 5, 10), coat, 0, 1.18, 0);
  add(
    new THREE.CylinderGeometry(0.26, isMira ? 0.42 : 0.35, isMira ? 0.61 : 0.38, 10, 1, true),
    coat,
    0,
    isMira ? 0.82 : 0.93,
    0,
  );
  const hemTrim = add(
    new THREE.TorusGeometry(isMira ? 0.405 : 0.343, 0.016, 4, 16),
    cloth,
    0,
    isMira ? 0.525 : 0.743,
    0,
  );
  hemTrim.rotation.x = Math.PI / 2;
  // Buttons, front seam and collar make the outfit readable at close camera range.
  box(0.025, 0.53, 0.025, metal, 0, 1.15, -0.275);
  for (let j = 0; j < 3; j++) ball(0.027, metal, isElio ? 0.12 : 0.07, 1.31 - j * 0.145, -0.276);
  if (isElio) {
    box(0.2, 0.16, 0.035, leather, -0.15, 1.15, -0.26);
    box(0.19, 0.035, 0.055, cloth, -0.15, 1.25, -0.29);
    box(0.2, 0.16, 0.035, leather, 0.15, 0.91, -0.26);
    box(0.18, 0.035, 0.05, cloth, 0.15, 1.01, -0.29);
  } else {
    box(0.16, 0.18, 0.03, dark, -0.15, 0.98, -0.26);
    box(0.17, 0.032, 0.045, cloth, -0.15, 1.09, -0.28);
  }
  const belt = add(new THREE.TorusGeometry(0.279, 0.025, 4, 16), leather, 0, 0.99, 0);
  belt.rotation.x = Math.PI / 2;
  box(0.09, 0.065, 0.028, metal, 0, 0.99, -0.295);
  // Each head has an open, visible face, hair, brows and expressive eyes.
  const hood = ball(isMira ? 0.32 : 0.303, dark, 0, 1.77, 0.015);
  hood.scale.set(1, 1.06, 0.9);
  const head = ball(0.235, face, 0, 1.76, -0.12);
  head.scale.set(0.91, 1.02, 0.78);
  for (const side of [-1, 1]) {
    ball(0.045, face, side * 0.205, 1.74, -0.1);
    const iris = ball(0.023, eye, side * 0.08, 1.78, -0.29);
    iris.scale.set(1, 1.3, 0.42);
    ball(0.006, light, side * 0.08 - 0.006, 1.79, -0.3);
    const brow = box(0.062, 0.013, 0.012, hair, side * 0.08, 1.832, -0.285);
    brow.rotation.z = side * 0.1;
  }
  const nose = ball(0.025, face, 0, 1.731, -0.3);
  nose.scale.set(0.62, 0.72, 1);
  box(0.054, 0.009, 0.01, leather, 0, 1.679, -0.282);
  if (isElio) {
    // Broad work cap, circular goggles and a strapped field repair pack.
    const cap = ball(0.275, coat, 0, 1.91, 0.008);
    cap.scale.set(1.05, 0.5, 1);
    box(0.47, 0.058, 0.17, dark, 0, 1.91, -0.18);
    for (const side of [-1, 1]) {
      const rim = add(
        new THREE.TorusGeometry(0.069, 0.014, 5, 16),
        metal,
        side * 0.083,
        1.798,
        -0.308,
      );
      const glass = add(new THREE.CircleGeometry(0.059, 20), lens, side * 0.083, 1.798, -0.32);
      glass.rotation.y = Math.PI;
      rim.rotation.y = Math.PI;
      box(0.055, 0.018, 0.018, leather, side * 0.177, 1.798, -0.26);
    }
    box(0.035, 0.015, 0.02, metal, 0, 1.798, -0.326);
  } else {
    for (let j = 0; j < 5; j++) {
      const tuft = ball(0.088, hair, -0.17 + j * 0.077, 1.913 + Math.sin(j * 1.1) * 0.025, -0.19);
      tuft.scale.set(0.68, 1.05, 0.55);
      tuft.rotation.z = -0.4 + j * 0.12;
    }
    if (isMira) {
      const hoodTip = add(new THREE.ConeGeometry(0.2, 0.33, 5), coat, 0, 2.035, 0.055);
      hoodTip.rotation.x = -0.16;
      // A long braid and a star pin distinguish Mira's silhouette.
      for (let j = 0; j < 5; j++) {
        const braid = ball(
          0.055 - j * 0.004,
          hair,
          0.245 + Math.sin(j * 2) * 0.016,
          1.64 - j * 0.09,
          0.055,
        );
        braid.scale.y = 1.2;
      }
      ball(0.04, cloth, 0.246, 1.23, 0.055);
      const star = add(new THREE.OctahedronGeometry(0.045), light, -0.205, 1.91, -0.215);
      star.scale.set(1, 1.2, 0.28);
    }
  }
  const scarf = add(new THREE.TorusGeometry(0.252, isMira ? 0.079 : 0.07, 6, 16), cloth, 0, 1.5, 0);
  scarf.rotation.x = Math.PI / 2;
  const scarfTail = new THREE.Group();
  scarfTail.position.set(-0.14, 1.47, 0.19);
  root.add(scarfTail);
  const tailLength = isMira ? 0.87 : isElio ? 0.32 : 0.57;
  const tail = box(
    isMira ? 0.18 : 0.16,
    tailLength,
    0.04,
    cloth,
    0,
    -tailLength / 2,
    0.04,
    scarfTail,
  );
  tail.rotation.z = isMira ? -0.14 : 0.18;
  for (let j = 0; j < 4; j++)
    box(0.017, 0.06, 0.035, cloth, -0.06 + j * 0.039, -tailLength - 0.02, 0.04, scarfTail);
  const cape = add(
    new THREE.CylinderGeometry(
      0.17,
      isMira ? 0.42 : 0.34,
      isMira ? 0.77 : 0.43,
      7,
      1,
      true,
      -0.65,
      1.3,
    ),
    isMira ? coat : dark,
    0,
    isMira ? 1.01 : 1.22,
    0.06,
  );
  cape.rotation.y = Math.PI;
  box(isElio ? 0.55 : 0.39, isElio ? 0.59 : 0.41, 0.2, leather, 0, 1.18, 0.31);
  for (const side of [-1, 1]) {
    box(0.044, 0.58, 0.035, leather, side * 0.21, 1.21, -0.245);
    box(0.045, 0.44, 0.045, dark, side * (isElio ? 0.18 : 0.12), 1.18, 0.43);
    box(0.067, 0.058, 0.025, metal, side * (isElio ? 0.18 : 0.12), 1.08, 0.46);
  }
  if (isElio) {
    const roll = add(new THREE.CylinderGeometry(0.1, 0.1, 0.6, 10), coat, 0, 1.54, 0.36);
    roll.rotation.z = Math.PI / 2;
    box(0.14, 0.27, 0.13, dark, 0.34, 1.15, 0.26);
    const tool = box(0.06, 0.27, 0.04, metal, -0.32, 1.16, 0.28);
    tool.rotation.z = 0.18;
    add(new THREE.TorusGeometry(0.05, 0.013, 4, 9), metal, -0.345, 1.3, 0.28);
  } else if (isMira) {
    const telescope = add(
      new THREE.CylinderGeometry(0.06, 0.08, 0.51, 10),
      metal,
      0.275,
      1.21,
      0.28,
    );
    telescope.rotation.z = -0.12;
    add(new THREE.SphereGeometry(0.048, 10, 6), lens, 0.244, 1.465, 0.28);
    box(0.24, 0.26, 0.024, dark, 0.02, 1.2, 0.43);
    const emblem = add(new THREE.OctahedronGeometry(0.06), light, 0.02, 1.23, 0.45);
    emblem.scale.z = 0.25;
  } else {
    const notebook = box(0.23, 0.29, 0.044, cloth, 0.04, 1.22, 0.44);
    notebook.rotation.z = -0.12;
    for (let j = 0; j < 4; j++) box(0.025, 0.008, 0.05, metal, -0.065, 1.14 + j * 0.047, 0.455);
    box(0.013, 0.29, 0.018, glow, 0.188, 1.18, 0.34);
  }
  // The complete outfit rides a single upper-body pivot: seams, buttons and gear
  // never drift apart when the torso breathes, turns or absorbs a footfall.
  const packRig = new THREE.Group();
  packRig.name = 'courier-pack';
  packRig.position.set(0, 1.18, 0.31);
  root.add(packRig);
  for (const object of [...root.children]) {
    if (
      object !== packRig &&
      object !== scarfTail &&
      object.position.z > 0.26 &&
      object.position.y < 1.65
    )
      packRig.attach(object);
  }
  const upperBody = new THREE.Group();
  upperBody.name = 'courier-upper-body';
  upperBody.position.y = 0.88;
  const outfit = [...root.children];
  root.add(upperBody);
  outfit.forEach((object) => upperBody.attach(object));
  const legs: { hip: THREE.Group; knee: THREE.Group; ankle: THREE.Group; side: -1 | 1 }[] = [];
  const arms: { shoulder: THREE.Group; elbow: THREE.Group }[] = [];
  const thighLength = 0.34,
    shinLength = 0.34,
    neutralAnkleY = 0.174;
  for (const side of [-1, 1] as const) {
    const hip = new THREE.Group();
    hip.name = side < 0 ? 'left-hip' : 'right-hip';
    hip.position.set(side * 0.16, 0.82, 0);
    root.add(hip);
    add(
      new THREE.CapsuleGeometry(0.101, thighLength - 0.202, 5, 9),
      dark,
      0,
      -thighLength / 2,
      0,
      hip,
    );
    const knee = new THREE.Group();
    knee.name = side < 0 ? 'left-knee' : 'right-knee';
    knee.position.y = -thighLength;
    hip.add(knee);
    ball(0.087, dark, 0, 0, 0, knee);
    add(
      new THREE.CapsuleGeometry(0.084, shinLength - 0.168, 5, 9),
      dark,
      0,
      -shinLength / 2,
      0,
      knee,
    );
    const ankle = new THREE.Group();
    ankle.name = side < 0 ? 'left-foot' : 'right-foot';
    ankle.position.y = -shinLength;
    knee.add(ankle);
    box(0.17, 0.19, 0.25, dark, 0, -0.025, -0.032, ankle);
    box(0.18, 0.045, 0.28, leather, 0, -0.121, -0.042, ankle);
    box(0.15, 0.032, 0.022, metal, 0, 0.012, -0.16, ankle);
    legs.push({ hip, knee, ankle, side });
    const shoulder = new THREE.Group();
    shoulder.name = side < 0 ? 'left-shoulder' : 'right-shoulder';
    shoulder.position.set(side * 0.34, 1.38 - 0.88, 0);
    upperBody.add(shoulder);
    add(new THREE.CapsuleGeometry(0.11, 0.075, 5, 9), coat, 0, -0.12, 0, shoulder);
    const elbow = new THREE.Group();
    elbow.name = side < 0 ? 'left-elbow' : 'right-elbow';
    elbow.position.y = -0.245;
    shoulder.add(elbow);
    ball(0.101, coat, 0, 0, 0, elbow);
    add(new THREE.CapsuleGeometry(0.097, 0.065, 4, 9), coat, 0, -0.092, 0, elbow);
    add(new THREE.CylinderGeometry(0.11, 0.11, 0.07, 8), cloth, 0, -0.175, 0, elbow);
    const glove = ball(0.096, dark, 0, -0.243, -0.018, elbow);
    glove.scale.y = 1.1;
    if (side === 1) {
      box(0.13, 0.12, 0.05, metal, 0, -0.175, -0.105, elbow);
      box(0.095, 0.08, 0.022, glow, 0, -0.175, -0.14, elbow);
    }
    arms.push({ shoulder, elbow });
  }
  root.traverse((o) => {
    if (o instanceof THREE.Mesh) {
      o.castShadow = true;
      o.receiveShadow = true;
    }
  });
  let disposed = false,
    phase = 0,
    motionBlend = 0,
    castBlend = 0,
    elapsed = 0,
    turnBlend = 0;
  let lastSide: -1 | 1 = -1;
  const damp = (current: number, target: number, rate: number, delta: number) =>
    current + (target - current) * (1 - Math.exp(-rate * delta));
  // Two-bone sagittal IK keeps the sole near the paving during stance while the
  // swinging foot clears it. The ankle cancels the knee/hip rotations.
  function poseLeg(leg: (typeof legs)[number], targetY: number, targetZ: number, pitch: number) {
    const down = leg.hip.position.y - targetY;
    const distance = THREE.MathUtils.clamp(
      Math.hypot(down, targetZ),
      0.05,
      thighLength + shinLength - 0.0001,
    );
    const direction = Math.atan2(-targetZ, down);
    const hipOffset = Math.acos(
      THREE.MathUtils.clamp(
        (thighLength ** 2 + distance ** 2 - shinLength ** 2) / (2 * thighLength * distance),
        -1,
        1,
      ),
    );
    const kneeAngle = -Math.acos(
      THREE.MathUtils.clamp(
        (distance ** 2 - thighLength ** 2 - shinLength ** 2) / (2 * thighLength * shinLength),
        -1,
        1,
      ),
    );
    leg.hip.rotation.x = direction + hipOffset;
    leg.knee.rotation.x = kneeAngle;
    leg.ankle.rotation.x = pitch - leg.hip.rotation.x - kneeAngle;
  }
  const courier = {
    object: root,
    /** Seconds-based gait. Pass collision-resolved normalized speed and dt=0 when
     * paused. Footstep is true once per actual new ground contact; side -1/+1
     * corresponds to the child's left/right foot. Facing remains root-owned. */
    update(
      _time: number,
      speed: number,
      casting: boolean,
      golden = false,
      reduced = false,
      dt = 0.016,
      turnAmount = 0,
    ): { footstep: boolean; side: -1 | 1 } {
      if (disposed) return { footstep: false, side: lastSide };
      const delta = Number.isFinite(dt) ? THREE.MathUtils.clamp(dt, 0, 0.08) : 0;
      const actualSpeed = Number.isFinite(speed) ? THREE.MathUtils.clamp(speed, 0, 1) : 0;
      const turning = Number.isFinite(turnAmount) ? THREE.MathUtils.clamp(turnAmount, -1, 1) : 0;
      const previousHalfCycle = Math.floor(phase / Math.PI);
      if (!reduced) {
        elapsed += delta;
        motionBlend = damp(motionBlend, actualSpeed, actualSpeed > motionBlend ? 9 : 14, delta);
        castBlend = damp(castBlend, casting ? 1 : 0, 12, delta);
        turnBlend = damp(turnBlend, turning, 9, delta);
        // Local stance travel cancels the controller's actual world displacement:
        // Use the shared run speed with a .475m walking stride and .51m running stride.
        // No phase can advance when collision resolution has stopped the child.
        const stance = 0.52 - 0.16 * THREE.MathUtils.clamp((motionBlend - 0.5) * 2, 0, 1);
        const halfStride = 0.22 + 0.035 * motionBlend;
        if (actualSpeed > 0.015 && delta > 0)
          phase += (delta * (actualSpeed * RUN_SPEED) * Math.PI * 2 * stance) / (2 * halfStride);
      } else {
        motionBlend = 0;
        castBlend = casting ? 1 : 0;
        turnBlend = 0;
      }
      const gait = reduced ? 0 : motionBlend;
      const stanceFraction = 0.52 - 0.16 * THREE.MathUtils.clamp((gait - 0.5) * 2, 0, 1);
      const stride = (0.22 + 0.035 * gait) * Math.min(1, gait / 0.15);
      const bounce = -0.023 * Math.abs(Math.cos(phase)) * gait;
      const breath = reduced ? 0 : Math.sin(elapsed * 2.1) * 0.004 * (1 - gait);
      upperBody.position.set(
        reduced ? 0 : Math.sin(phase) * 0.012 * gait,
        0.88 + bounce + breath,
        0,
      );
      upperBody.rotation.set(
        reduced ? 0 : -0.055 * gait,
        reduced ? 0 : Math.sin(phase) * 0.035 * gait - turnBlend * 0.045,
        reduced ? 0 : Math.sin(phase) * 0.019 * gait - turnBlend * 0.035,
      );
      legs.forEach((leg, i) => {
        leg.hip.position.y = 0.82 + bounce;
        const cycle = (((phase / (Math.PI * 2) + i * 0.5) % 1) + 1) % 1;
        let z = 0,
          lift = 0,
          pitch = 0;
        if (gait > 0.0001) {
          if (cycle < stanceFraction) {
            const t = cycle / stanceFraction;
            z = -stride + 2 * stride * t;
            // Brief heel-to-toe roll, not a rigid paddle-shaped foot.
            pitch = (Math.max(0, 1 - t * 5) * 0.12 - Math.max(0, (t - 0.8) * 5) * 0.1) * gait;
          } else {
            const t = (cycle - stanceFraction) / (1 - stanceFraction),
              ease = t * t * (3 - 2 * t);
            z = stride * (1 - 2 * ease);
            lift = Math.sin(t * Math.PI) * (0.06 + gait * 0.085) * Math.sqrt(gait);
            pitch = -0.1 * Math.sin(t * Math.PI) * gait;
          }
        }
        // Tiny heel clearance compensates the contact edge when the boot rolls.
        poseLeg(leg, neutralAnkleY + lift + Math.abs(pitch) * 0.19, z, pitch);
      });
      arms.forEach(({ shoulder, elbow }, i) => {
        const swing = -Math.cos(phase + i * Math.PI) * 0.44 * gait;
        shoulder.rotation.x = THREE.MathUtils.lerp(swing + 0.025, 0.58, castBlend);
        shoulder.rotation.z = THREE.MathUtils.lerp(
          i === 0 ? -0.065 : 0.065,
          i === 0 ? -0.16 : 0.16,
          castBlend,
        );
        elbow.rotation.x = THREE.MathUtils.lerp(
          0.13 + Math.max(0, swing) * 0.32 + gait * 0.08,
          0.91,
          castBlend,
        );
      });
      // Delayed cloth/pack motion uses shared pivots, including every attached prop.
      const clothTarget =
        -0.035 - gait * 0.2 + (reduced ? 0 : Math.sin(phase - 0.6) * 0.027 * gait);
      scarfTail.rotation.x = reduced ? -0.035 : damp(scarfTail.rotation.x, clothTarget, 5, delta);
      scarfTail.rotation.z = reduced
        ? 0
        : damp(
            scarfTail.rotation.z,
            -turnBlend * 0.16 + Math.sin(phase - 0.8) * 0.035 * gait,
            5,
            delta,
          );
      packRig.rotation.x = reduced
        ? 0
        : damp(packRig.rotation.x, Math.cos(phase * 2 - 0.5) * 0.023 * gait, 8, delta);
      packRig.rotation.z = reduced
        ? 0
        : damp(
            packRig.rotation.z,
            Math.sin(phase - 0.4) * 0.02 * gait - turnBlend * 0.04,
            8,
            delta,
          );
      cape.rotation.x = reduced
        ? -0.02
        : damp(
            cape.rotation.x,
            -0.02 - gait * 0.1 + Math.sin(phase - 0.5) * 0.014 * gait,
            6,
            delta,
          );
      cloth.color.set(golden ? 0xf1c469 : baseCloth);
      cloth.emissive.set(golden ? 0x765321 : 0x000000);
      cloth.emissiveIntensity = golden ? 0.32 : 0;
      const footstep =
        !reduced &&
        delta > 0 &&
        actualSpeed > 0.015 &&
        Math.floor(phase / Math.PI) !== previousHalfCycle;
      if (footstep) lastSide = Math.floor(phase / Math.PI) % 2 === 1 ? 1 : -1;
      return { footstep, side: lastSide };
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      const geometries = new Set<THREE.BufferGeometry>();
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) geometries.add(o.geometry);
      });
      geometries.forEach((geometry) => geometry.dispose());
      materials.forEach((material) => material.dispose());
      root.removeFromParent();
    },
  };
  courier.update(0, 0, false, false, true, 0);
  return courier;
}
