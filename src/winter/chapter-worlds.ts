import * as THREE from 'three';
import type { Relay, WinterWorld } from './types';

export type EnvironmentChapter = 'canal' | 'glasshouse' | 'observatory' | 'spire';
const TAU = Math.PI * 2;
const GATE_Z = [12, -3, -16] as const;
const RELAY_POSITIONS = [
  [-10, 18],
  [10, 5],
  [-10, -10],
] as const;
const TITLES = {
  canal: ['WEST LOCK', 'PUMP STATION', 'NORTH LOCK'],
  glasshouse: ['ROOT CIRCUIT', 'SUNLIGHT ARRAY', 'SEED ARCHIVE'],
  observatory: ['WEST REFLECTOR', 'STAR TRACKER', 'NORTH ALIGNMENT'],
  spire: ['OUTER FIREWALL', 'SIGNAL ROUTER', 'NEXUS ACCESS'],
} as const;
const HAZARD_LABELS = {
  canal: 'CRYOGENIC VENT · AVOID THE RED STEAM FIELD',
  glasshouse: 'GROW-LIGHT SURGE · STEP OUTSIDE THE RED CIRCLE',
  observatory: 'SWEEP ARRAY · KEEP OUT OF THE RED SCAN',
  spire: 'NEXUS PULSE · MOVE OUT OF THE RED FIELD',
} as const;

/** Four asset-free environments. All traversal happens on y=0; landmarks have
 * real volume, while sequential gate colliders enforce the relay progression. */
export function createChapterWorld(scene: THREE.Scene, id: EnvironmentChapter): WinterWorld {
  const group = new THREE.Group();
  group.name = `${id} / resistance chapter`;
  scene.add(group);
  const colliders: THREE.Box3[] = [],
    permanent: THREE.Box3[] = [];
  const geometryResources = new Set<THREE.BufferGeometry>(),
    materialResources = new Set<THREE.Material>();
  const keepGeometry = <T extends THREE.BufferGeometry>(g: T): T => {
    geometryResources.add(g);
    return g;
  };
  const keepMaterial = <T extends THREE.Material>(m: T): T => {
    materialResources.add(m);
    return m;
  };
  const standard = (color: number, roughness = 0.7, metalness = 0.1) =>
    keepMaterial(new THREE.MeshStandardMaterial({ color, roughness, metalness }));
  const emissive = (color: number, intensity = 1.4) =>
    keepMaterial(
      new THREE.MeshStandardMaterial({
        color,
        emissive: color,
        emissiveIntensity: intensity,
        roughness: 0.34,
        metalness: 0.3,
      }),
    );
  const stone = standard(id === 'glasshouse' ? 0x68796e : id === 'spire' ? 0x26354e : 0x667e91);
  const paver = standard(
    id === 'glasshouse' ? 0x6c7c72 : id === 'spire' ? 0x2b3952 : 0x6b8294,
    0.72,
    0.12,
  );
  const trim = standard(0xa8bec6, 0.64),
    dark = standard(0x182735, 0.65, 0.5),
    iron = standard(0x365263, 0.43, 0.7);
  const copper = standard(0xa48a67, 0.44, 0.65),
    snow = standard(0xd4e6e9, 0.94);
  const accentColor =
    id === 'glasshouse'
      ? 0x99d9a4
      : id === 'observatory'
        ? 0xb0bbff
        : id === 'spire'
          ? 0xc189ec
          : 0x78d9ee;
  const accent = emissive(accentColor),
    warm = emissive(0xffc77f, 1.1);
  const windows = emissive(0x6993b1, 0.35);
  const glass = keepMaterial(
    new THREE.MeshPhysicalMaterial({
      color: id === 'glasshouse' ? 0xaed9c2 : 0x8dbed4,
      roughness: 0.18,
      metalness: 0.26,
      transparent: true,
      opacity: 0.19,
      side: THREE.DoubleSide,
      depthWrite: false,
    }),
  );
  const water = keepMaterial(
    new THREE.MeshPhysicalMaterial({
      color: 0x256b92,
      emissive: 0x0d3b57,
      emissiveIntensity: 0.24,
      roughness: 0.19,
      metalness: 0.48,
      clearcoat: 0.9,
    }),
  );
  const foliage = standard(0x637f85, 0.9),
    flower = emissive(0xf2bbaf, 0.23);
  const cube = keepGeometry(new THREE.BoxGeometry(1, 1, 1)),
    cylinder = keepGeometry(new THREE.CylinderGeometry(1, 1, 1, 10));
  const sphere = keepGeometry(new THREE.SphereGeometry(1, 10, 7)),
    octa = keepGeometry(new THREE.OctahedronGeometry(1));
  const batches = new Map<
    string,
    { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[] }
  >();
  const temp = new THREE.Object3D();
  function inst(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    sx = 1,
    sy = 1,
    sz = 1,
    yaw = 0,
  ) {
    const key = `${geo.uuid}/${mat.uuid}`;
    let batch = batches.get(key);
    if (!batch) {
      batch = { geometry: geo, material: mat, matrices: [] };
      batches.set(key, batch);
    }
    temp.position.set(x, y, z);
    temp.rotation.set(0, yaw, 0);
    temp.scale.set(sx, sy, sz);
    temp.updateMatrix();
    batch.matrices.push(temp.matrix.clone());
  }
  function box(
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    inst(cube, mat, x, y, z, w, h, d);
  }
  function mesh(
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    parent: THREE.Object3D = group,
    x = 0,
    y = 0,
    z = 0,
  ) {
    keepGeometry(geo);
    keepMaterial(mat);
    const object = new THREE.Mesh(geo, mat);
    object.position.set(x, y, z);
    object.castShadow = !mat.transparent;
    object.receiveShadow = true;
    parent.add(object);
    return object;
  }
  function localBox(
    parent: THREE.Object3D,
    mat: THREE.Material,
    x: number,
    y: number,
    z: number,
    w: number,
    h: number,
    d: number,
  ) {
    const object = mesh(cube, mat, parent, x, y, z);
    object.scale.set(w, h, d);
    return object;
  }
  function localInstances(
    parent: THREE.Object3D,
    geo: THREE.BufferGeometry,
    mat: THREE.Material,
    entries: number[][],
  ) {
    const object = new THREE.InstancedMesh(geo, mat, entries.length);
    entries.forEach(([x, y, z, sx, sy, sz, rz = 0], index) => {
      temp.position.set(x, y, z);
      temp.rotation.set(0, 0, rz);
      temp.scale.set(sx, sy, sz);
      temp.updateMatrix();
      object.setMatrixAt(index, temp.matrix);
    });
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = true;
    object.receiveShadow = true;
    object.computeBoundingSphere();
    parent.add(object);
    return object;
  }
  function obstacle(x: number, z: number, w: number, d: number, h = 8) {
    const b = new THREE.Box3(
      new THREE.Vector3(x - w / 2, -0.6, z - d / 2),
      new THREE.Vector3(x + w / 2, h, z + d / 2),
    );
    permanent.push(b);
    return b;
  }
  function curve(
    points: THREE.Vector3[],
    radius: number,
    material: THREE.Material,
    parent: THREE.Object3D = group,
  ) {
    return mesh(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(points),
        Math.max(12, points.length * 3),
        radius,
        5,
        false,
      ),
      material,
      parent,
    );
  }
  function wire(points: THREE.Vector3[], color: number, parent: THREE.Object3D = group) {
    const material = keepMaterial(
      new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.8 }),
    );
    const object = new THREE.Line(
      keepGeometry(new THREE.BufferGeometry().setFromPoints(points)),
      material,
    );
    parent.add(object);
    return object;
  }
  let seed = 1307;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };

  // Accessible level bounds are consistent, but ground and skyline differ completely.
  if (id !== 'canal') box(stone, 0, -0.24, 2, 64, 0.45, 68);
  if (id === 'canal') {
    const spans = [
      [14.6, 36],
      [-0.4, 9.4],
      [-13.4, -5.6],
      [-31, -18.6],
    ];
    for (const [a, b] of spans) {
      box(stone, 0, -0.3, (a + b) / 2, 64, 0.6, b - a);
      for (let z = a + 0.4; z < b; z += 2)
        for (let x = -29; x <= 29; x += 3) box(paver, x, 0.012, z, 2.94, 0.025, 1.94);
    }
    for (const z of GATE_Z) {
      box(water, 0, -0.48, z, 67, 0.07, 5.2);
      // Only the restored central bridge can cross each water channel.
      obstacle(-19, z, 26, 5.2, 0.5);
      obstacle(19, z, 26, 5.2, 0.5);
      for (const edge of [-2.65, 2.65]) box(trim, 0, 0.14, z + edge, 64, 0.28, 0.22);
      for (let i = 0; i < 17; i++) {
        const x = -29 + i * 3.6 + random();
        inst(
          octa,
          snow,
          x,
          -0.34,
          z + Math.sin(i) * 1.2,
          0.6 + random(),
          0.055,
          0.35 + random() * 0.55,
          random() * Math.PI,
        );
      }
      for (let x = -26; x <= 26; x += 9)
        wire(
          [
            new THREE.Vector3(x - 1, -0.32, z - 2),
            new THREE.Vector3(x + 0.8, -0.32, z - 0.6),
            new THREE.Vector3(x, -0.32, z + 0.2),
            new THREE.Vector3(x + 2, -0.32, z + 2),
          ],
          0x7db1c7,
        );
    }
    for (const side of [-1, 1])
      for (let i = 0; i < 9; i++) {
        const z = -31 + i * 8,
          height = 10 + (i % 3) * 2.1;
        box(stone, side * 36, height / 2, z, 8, height, 7.6);
        box(dark, side * 36, height + 0.5, z, 9, 1, 8.2);
        box(snow, side * 36, height + 1.05, z, 8.8, 0.1, 8);
        for (let floor = 0; floor < 3; floor++)
          for (const dz of [-2.1, 0, 2.1]) {
            box(windows, side * 31.93, 2.2 + floor * 3.2, z + dz, 0.035, 1.85, 0.93);
            box(trim, side * 31.85, 1.2 + floor * 3.2, z + dz, 0.26, 0.15, 1.25);
          }
        box(copper, side * 31.78, 4.1, z, 0.28, 0.18, 6.9);
      }
    // Lock mechanisms, quay bollards, cable drums and an arched iron footbridge.
    for (const x of [-28, 28])
      for (const z of [27, 17, 7, -8, -23]) {
        inst(cylinder, iron, x, 0.45, z, 0.26, 0.9, 0.26);
        inst(sphere, copper, x, 0.95, z, 0.32, 0.13, 0.32);
      }
    const arch = Array.from(
      { length: 17 },
      (_, i) => new THREE.Vector3(-29 + (i * 58) / 16, 5 + Math.sin((i / 16) * Math.PI) * 5, -30),
    );
    curve(arch, 0.16, iron);
    curve(
      arch.map((p) => p.clone().add(new THREE.Vector3(0, 0, -2))),
      0.16,
      iron,
    );
    for (let i = 0; i < arch.length; i++)
      box(iron, arch[i].x, (arch[i].y + 3.7) / 2, -30, 0.09, arch[i].y - 3.7, 0.12);
    box(iron, 0, 3.7, -31, 61, 0.25, 2.6);
  } else {
    for (let z = -28; z <= 34; z += 3)
      for (let x = -30; x <= 30; x += 3)
        box(Math.round(x + z) % 4 ? stone : paver, x, -0.008, z, 2.95, 0.02, 2.95);
    for (const x of [-31, 31]) {
      box(dark, x, 0.5, 3, 0.5, 1, 66);
      obstacle(x, 3, 0.5, 66, 1.2);
    }
  }

  const landmarkRotors: THREE.Object3D[] = [];
  if (id === 'glasshouse') {
    // A tall elliptical barrel vault, glazed in a true mesh rather than a backdrop.
    const roofVertices: number[] = [],
      roofIndices: number[] = [];
    for (let row = 0; row <= 8; row++)
      for (let i = 0; i <= 24; i++) {
        const t = (i / 24) * Math.PI;
        roofVertices.push(Math.cos(t) * 29, 7 + Math.sin(t) * 14, -31 + row * 8);
      }
    for (let row = 0; row < 8; row++)
      for (let i = 0; i < 24; i++) {
        const a = row * 25 + i,
          b = a + 25;
        roofIndices.push(a, a + 1, b, b, a + 1, b + 1);
      }
    const roof = new THREE.BufferGeometry();
    roof.setAttribute('position', new THREE.Float32BufferAttribute(roofVertices, 3));
    roof.setIndex(roofIndices);
    roof.computeVertexNormals();
    mesh(roof, glass);
    const rib = keepGeometry(
      new THREE.TubeGeometry(
        new THREE.CatmullRomCurve3(
          Array.from(
            { length: 25 },
            (_, i) =>
              new THREE.Vector3(
                Math.cos((i / 24) * Math.PI) * 29,
                7 + Math.sin((i / 24) * Math.PI) * 14,
                0,
              ),
          ),
        ),
        40,
        0.1,
        5,
        false,
      ),
    );
    for (let z = -31; z <= 33; z += 8) {
      inst(rib, iron, 0, 0, z);
      for (const x of [-29, 29]) {
        box(iron, x, 3.5, z, 0.2, 7, 0.2);
        box(copper, x, 1.1, z, 0.65, 2.2, 0.65);
        obstacle(x, z, 0.7, 0.7, 7);
      }
    }
    for (const x of [-29, 29]) {
      box(glass, x, 3.5, 1, 0.06, 7, 64);
      box(copper, x, 6.8, 1, 0.18, 0.12, 64);
    }
    for (const x of [-20, -10, 0, 10, 20])
      box(iron, x, 7 + Math.sqrt(1 - (x / 29) ** 2) * 14, 1, 0.08, 0.08, 64);
    for (const x of [-23, 23])
      for (const z of [24, 8, -7, -23]) {
        box(copper, x, 0.45, z, 6.7, 0.9, 4.8);
        box(dark, x, 0.95, z, 6.3, 0.13, 4.4);
        obstacle(x, z, 6.8, 4.9, 1.2);
        for (let j = 0; j < 6; j++) {
          const px = x - 2.5 + j,
            pz = z + (j % 2 ? 1 : -0.8),
            height = 1.7 + random() * 2.3;
          inst(sphere, foliage, px, 1.4, pz, 0.72, 0.36, 0.72, j);
          inst(cylinder, copper, px, 1 + height / 2, pz, 0.075, height, 0.075);
          for (let k = 0; k < 4; k++) {
            const a = k * Math.PI * 0.6;
            inst(
              sphere,
              foliage,
              px + Math.cos(a) * 0.65,
              1.3 + height * (0.4 + k * 0.15),
              pz + Math.sin(a) * 0.5,
              0.9,
              0.14,
              0.35,
              a,
            );
          }
          inst(octa, flower, px, height + 1.15, pz, 0.19, 0.28, 0.19, j);
        }
      }
    // Suspended sun lamps form strong perspective lines down the central path.
    for (const x of [-13, 13])
      for (const z of [25, 8, -7, -23]) {
        box(iron, x, 11, z, 0.035, 8, 0.035);
        inst(cylinder, copper, x, 7.15, z, 0.72, 0.18, 0.72);
        inst(cylinder, accent, x, 7.04, z, 0.61, 0.035, 0.61);
      }
    const seed = mesh(new THREE.IcosahedronGeometry(1.9, 1), glass, group, 0, 5, -29);
    landmarkRotors.push(seed);
    mesh(new THREE.TorusGeometry(2.6, 0.07, 6, 48), copper, group, 0, 5, -29);
    box(copper, 0, 1.7, -29, 5, 3.4, 2.8);
    box(accent, 0, 2, -27.57, 2.4, 0.12, 0.035);
    obstacle(0, -29, 5.2, 2.9, 3.4);
  }

  if (id === 'observatory') {
    const domeMaterial = standard(0x526b87, 0.34, 0.5);
    const makeDome = (x: number, z: number, radius: number, base: number) => {
      inst(cylinder, stone, x, base / 2, z, radius, base, radius);
      mesh(
        new THREE.SphereGeometry(radius, 28, 14, 0.16, TAU - 0.32, 0, Math.PI / 2),
        domeMaterial,
        group,
        x,
        base,
        z,
      );
      const archPoints = Array.from(
        { length: 17 },
        (_, i) =>
          new THREE.Vector3(
            Math.cos((i / 16) * Math.PI) * radius,
            Math.sin((i / 16) * Math.PI) * radius,
            0,
          ),
      );
      const rib = keepGeometry(
        new THREE.TubeGeometry(new THREE.CatmullRomCurve3(archPoints), 30, 0.07, 5, false),
      );
      for (let j = 0; j < 8; j++) inst(rib, copper, x, base, z, 1, 1, 1, (j * Math.PI) / 8);
      const rim = mesh(
        new THREE.TorusGeometry(radius + 0.08, 0.12, 5, 48),
        trim,
        group,
        x,
        base,
        z,
      );
      rim.rotation.x = Math.PI / 2;
      obstacle(x, z, radius * 2, radius * 2, base + radius);
    };
    makeDome(0, -40, 12, 6);
    makeDome(-24, -23, 5.8, 3.3);
    makeDome(24, -23, 5.8, 3.3);
    const telescope = new THREE.Group();
    telescope.position.set(0, 12, -31);
    telescope.rotation.x = Math.PI / 2 - 0.4;
    group.add(telescope);
    mesh(new THREE.CylinderGeometry(1.35, 1.0, 12, 20), copper, telescope);
    mesh(new THREE.CylinderGeometry(1.45, 1.45, 0.5, 20), dark, telescope, 0, 6, 0);
    mesh(new THREE.CylinderGeometry(1.28, 1.28, 0.08, 20), accent, telescope, 0, 6.3, 0);
    mesh(new THREE.CylinderGeometry(1.4, 1.4, 0.3, 20), dark, telescope, 0, -4, 0);
    for (const x of [-23, 23])
      for (const z of [23, 6, -8]) {
        inst(cylinder, stone, x, 0.4, z, 1.9, 0.8, 1.9);
        obstacle(x, z, 3.8, 3.8, 0.85);
        const armillary = new THREE.Group();
        armillary.position.set(x, 2.4, z);
        group.add(armillary);
        landmarkRotors.push(armillary);
        for (let k = 0; k < 3; k++) {
          const ring = mesh(
            new THREE.TorusGeometry(1.35, 0.045, 5, 36),
            k === 0 ? accent : copper,
            armillary,
          );
          ring.rotation.set(k * 0.8, k * 0.65, k * 0.3);
        }
        mesh(new THREE.OctahedronGeometry(0.23), accent, armillary);
      }
    const positions: number[] = [];
    for (let i = 0; i < 220; i++)
      positions.push((random() - 0.5) * 140, 34 + random() * 35, (random() - 0.6) * 140);
    const starGeometry = keepGeometry(new THREE.BufferGeometry());
    starGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    const starMaterial = keepMaterial(
      new THREE.PointsMaterial({
        color: 0xd5dbff,
        size: 0.11,
        transparent: true,
        opacity: 0.9,
        fog: false,
        depthWrite: false,
      }),
    );
    const stars = new THREE.Points(starGeometry, starMaterial);
    stars.name = 'fixed-star-map';
    group.add(stars);
    wire(
      [
        new THREE.Vector3(-16, 29, -32),
        new THREE.Vector3(-6, 33, -37),
        new THREE.Vector3(5, 29, -35),
        new THREE.Vector3(14, 35, -42),
        new THREE.Vector3(22, 31, -39),
      ],
      0x758eaa,
    );
  }

  if (id === 'spire') {
    const tower = mesh(new THREE.CylinderGeometry(4, 10, 45, 6), dark, group, 0, 22.5, -41);
    tower.rotation.y = Math.PI / 6;
    obstacle(0, -41, 20, 20, 48);
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      box(iron, Math.sin(a) * 6.8, 21, -41 + Math.cos(a) * 6.8, 1.3, 41, 1.3);
      box(accent, Math.sin(a) * 7, 23, -41 + Math.cos(a) * 7, 0.18, 35, 0.18);
      curve(
        [
          new THREE.Vector3(Math.sin(a) * 10.2, 1, -41 + Math.cos(a) * 10.2),
          new THREE.Vector3(Math.sin(a) * 4.4, 43, -41 + Math.cos(a) * 4.4),
        ],
        0.075,
        accent,
      );
    }
    for (const [y, radius] of [
      [13, 11],
      [25, 9],
      [38, 6.5],
    ]) {
      const rotor = new THREE.Group();
      rotor.position.set(0, y, -41);
      group.add(rotor);
      landmarkRotors.push(rotor);
      const ring = mesh(new THREE.TorusGeometry(radius, 0.26, 7, 64), iron, rotor);
      ring.rotation.x = Math.PI / 2;
      const lightRing = mesh(new THREE.TorusGeometry(radius + 0.05, 0.13, 5, 64), accent, rotor);
      lightRing.rotation.x = Math.PI / 2;
      for (let k = 0; k < 8; k++) {
        const a = (k / 8) * TAU;
        localBox(rotor, iron, Math.sin(a) * radius, 0, Math.cos(a) * radius, 0.9, 2, 0.9);
      }
    }
    const cap = mesh(new THREE.OctahedronGeometry(2.6), accent, group, 0, 48, -41);
    landmarkRotors.push(cap);
    mesh(new THREE.IcosahedronGeometry(1.1, 1), accent, group, 0, 25, -33.7);
    for (const x of [-25, 25])
      for (const z of [24, 5, -12, -25]) {
        box(dark, x, 4.4, z, 3.2, 8.8, 3.2);
        box(iron, x, 9, z, 3.7, 0.3, 3.7);
        box(accent, x, 4.5, z + 1.62, 0.13, 6.8, 0.035);
        obstacle(x, z, 3.5, 3.5, 9.3);
        for (const offset of [-1, 1]) box(copper, x + offset, 2.5, z + 1.68, 0.06, 3.5, 0.06);
      }
    for (const x of [-15, 15]) box(accent, x, 0.03, 2, 0.045, 0.04, 66);
    for (let i = 0; i < 12; i++) {
      const x = (i % 2 ? -1 : 1) * (37 + random() * 15),
        z = -40 + random() * 77,
        height = 16 + random() * 35;
      box(dark, x, height / 2, z, 5, height, 6);
      box(windows, x, height * 0.6, z + 3.03, 0.25, height * 0.7, 0.03);
    }
  }

  // Shared visual language for terminals, but themed machinery and unique names.
  const relayMaterials: THREE.MeshStandardMaterial[] = [],
    relayHalos: THREE.Mesh[] = [];
  const relays: Relay[] = RELAY_POSITIONS.map(([x, z], i) => {
    const object = new THREE.Group();
    object.position.set(x, 0, z);
    object.name = `${id}-relay-${i}`;
    group.add(object);
    const glow = emissive(accentColor, 1.5);
    relayMaterials.push(glow);
    mesh(new THREE.CylinderGeometry(0.83, 1, 0.3, 8), iron, object, 0, 0.15, 0);
    localBox(object, dark, 0, 1.18, 0, 1.1, 1.78, 0.72);
    localBox(object, copper, 0, 1.22, 0.385, 0.94, 1.44, 0.07);
    localBox(object, glow, 0, 1.45, 0.43, 0.66, 0.83, 0.03);
    for (let j = 0; j < 4; j++)
      localBox(object, dark, 0, 1.19 + j * 0.14, 0.45, 0.4 + (j % 2) * 0.12, 0.032, 0.01);
    localBox(object, trim, 0, 2.14, 0, 1.23, 0.13, 0.88);
    const halo = mesh(new THREE.TorusGeometry(0.69, 0.024, 5, 36), glow, object, 0, 2.86, 0);
    relayHalos.push(halo);
    if (id === 'canal') {
      const wheel = mesh(
        new THREE.TorusGeometry(0.38, 0.055, 6, 18),
        copper,
        object,
        0.8,
        1.1,
        0.15,
      );
      wheel.rotation.y = Math.PI / 2;
    }
    if (id === 'glasshouse')
      mesh(new THREE.IcosahedronGeometry(0.26), foliage, object, -0.8, 0.6, 0);
    if (id === 'observatory') {
      const dish = mesh(
        new THREE.SphereGeometry(0.5, 16, 8, 0, TAU, 0, Math.PI / 3),
        copper,
        object,
        0.8,
        1.7,
        0,
      );
      dish.rotation.z = -0.7;
    }
    if (id === 'spire') localBox(object, glow, 0.73, 1.4, 0, 0.07, 1.9, 0.07);
    const light = new THREE.PointLight(accentColor, 2.3, 5, 2);
    light.position.set(0, 1.65, 0.7);
    object.add(light);
    obstacle(x, z, 1.25, 0.95, 2.2);
    return { id: i, name: TITLES[id][i], position: new THREE.Vector3(x, 0, z), object, light };
  });

  const core = new THREE.Vector3(0, 0, -23);
  const coreGroup = new THREE.Group();
  coreGroup.position.copy(core);
  coreGroup.name = `${id}-restoration-core`;
  group.add(coreGroup);
  mesh(new THREE.CylinderGeometry(1.2, 1.5, 0.4, 10), stone, coreGroup, 0, 0.2, 0);
  mesh(new THREE.CylinderGeometry(0.5, 0.7, 1.1, 8), copper, coreGroup, 0, 0.92, 0);
  const coreMaterial = emissive(accentColor, 1.9);
  const coreOrb = mesh(
    id === 'glasshouse'
      ? new THREE.IcosahedronGeometry(0.48, 1)
      : new THREE.OctahedronGeometry(0.52),
    coreMaterial,
    coreGroup,
    0,
    2.15,
    0,
  );
  const coreHalo = mesh(new THREE.TorusGeometry(1.0, 0.04, 6, 48), copper, coreGroup, 0, 2.15, 0);
  coreHalo.rotation.x = 0.7;
  obstacle(0, -23, 1.65, 1.65, 3);

  // Gates span beyond both legal x bounds. Later interactions are at least 7m
  // behind the preceding wall, exceeding the game's 4.5m interaction radius.
  const gates = GATE_Z.map((z, index) => {
    const closed = new THREE.Group(),
      opened = new THREE.Group();
    closed.position.z = z;
    opened.position.z = z;
    closed.name = `closed-gate-${index}`;
    opened.name = `open-gate-${index}`;
    group.add(closed, opened);
    const thickness = id === 'canal' ? 5.2 : 1.1;
    const collider = new THREE.Box3(
      new THREE.Vector3(-33, -0.6, z - thickness / 2),
      new THREE.Vector3(33, 7, z + thickness / 2),
    );
    if (id === 'canal') {
      localBox(closed, iron, 0, 2.75, 2.4, 11.6, 5.3, 0.25);
      for (const x of [-6.1, 6.1]) {
        box(copper, x, 1.1, z + 2.5, 0.55, 2.2, 0.55);
        box(iron, x, 1.1, z - 2.5, 0.35, 2.2, 0.35);
      }
      localBox(opened, iron, 0, -0.02, 0, 11.8, 0.16, 5.3);
      for (let j = -5; j <= 5; j++) localBox(opened, copper, j, 0.072, 0, 0.025, 0.025, 5.2);
      for (const side of [-1, 1]) {
        localBox(opened, warm, side * 5.6, 0.11, 0, 0.055, 0.045, 5.3);
        localBox(closed, accent, side * 4.7, 2.75, 2.55, 0.08, 4.4, 0.05);
      }
    } else if (id === 'glasshouse') {
      localBox(closed, iron, 0, 2.8, 0, 64, 0.18, 0.3);
      const bars: number[][] = [],
        leaves: number[][] = [];
      for (let x = -31; x <= 31; x += 2) {
        bars.push([x, 1.5, 0, 0.095, 3, 0.12]);
        leaves.push([x + 0.4, 2.1 + Math.sin(x) * 0.5, 0.05, 0.85, 0.15, 0.24, 0.7]);
      }
      localInstances(closed, cube, copper, bars);
      localInstances(closed, sphere, foliage, leaves);
      const panelMaterial = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: 0x6ca6ad,
          transparent: true,
          opacity: 0.17,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      localBox(closed, panelMaterial, 0, 1.7, 0, 64, 3.4, 0.04);
      for (const x of [-8, 8]) {
        localBox(opened, foliage, x, 2, 0, 0.16, 4, 0.16);
        const frond = mesh(
          new THREE.TorusGeometry(2.1, 0.14, 5, 16, Math.PI),
          foliage,
          opened,
          x,
          3.5,
          0,
        );
        frond.rotation.z = x < 0 ? -0.5 : 0.5;
        obstacle(x, z, 0.35, 0.35, 4);
      }
      localBox(opened, warm, 0, 0.035, 0, 64, 0.025, 0.07);
    } else {
      const veil = keepMaterial(
        new THREE.MeshBasicMaterial({
          color: id === 'spire' ? 0xdc78d0 : 0x8fa6e9,
          transparent: true,
          opacity: 0.15,
          side: THREE.DoubleSide,
          depthWrite: false,
        }),
      );
      localBox(closed, veil, 0, 2.7, 0, 64, 5.4, 0.045);
      for (const height of [0.3, 1.4, 2.6, 3.8, 5.1])
        localBox(closed, accent, 0, height, 0, 64, 0.038, 0.05);
      for (const x of [-29, -16, 16, 29]) {
        box(iron, x, 2.8, z, 0.7, 5.6, 0.8);
        const lens = mesh(new THREE.OctahedronGeometry(0.35), accent, group, x, 5.8, z);
        landmarkRotors.push(lens);
        obstacle(x, z, 0.8, 0.9, 6);
      }
      localBox(opened, warm, 0, 0.04, 0, 64, 0.035, 0.08);
      if (id === 'observatory')
        for (const x of [-16, 16]) {
          const mirror = mesh(new THREE.CircleGeometry(0.8, 20), glass, opened, x, 3.8, 0);
          mirror.rotation.y = x < 0 ? -0.6 : 0.6;
        }
    }
    return { collider, closed, opened, index };
  });

  // Telegraphing and danger share the same phase and the exact same circle.
  // Each field leaves broad safe routes on both sides and is away from relay UI.
  const hazardPositions = [
    [1, 21],
    [-1, 2],
    [1, -11],
  ] as const;
  const hazards = hazardPositions.map(([x, z], index) => {
    const material = keepMaterial(
      new THREE.MeshBasicMaterial({
        color: 0x75a5b7,
        transparent: true,
        opacity: 0.1,
        side: THREE.DoubleSide,
        depthWrite: false,
      }),
    );
    const ring = mesh(new THREE.RingGeometry(3.15, 3.28, 64), material, group, x, 0.045, z);
    ring.rotation.x = -Math.PI / 2;
    ring.castShadow = false;
    ring.name = `hazard-ring-${index}`;
    const fill = mesh(new THREE.CircleGeometry(3.15, 48), material, group, x, 0.04, z);
    fill.rotation.x = -Math.PI / 2;
    fill.castShadow = false;
    const beamMaterial = keepMaterial(
      new THREE.MeshBasicMaterial({
        color: 0xea849a,
        transparent: true,
        opacity: 0.04,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        side: THREE.DoubleSide,
      }),
    );
    const plume = mesh(
      id === 'canal'
        ? new THREE.CylinderGeometry(1.7, 3.15, 1.6, 16, 1, true)
        : new THREE.ConeGeometry(3.15, id === 'spire' ? 5 : 7, 20, 1, true),
      beamMaterial,
      group,
      x,
      id === 'canal' ? 0.85 : id === 'spire' ? 2.55 : 3.55,
      z,
    );
    plume.castShadow = false;
    const marker = mesh(new THREE.OctahedronGeometry(0.12), accent, group, x + 3.3, 0.42, z);
    return { x, z, index, ring, fill, plume, material, beamMaterial, marker };
  });
  const hazardPhase = (time: number, index: number) =>
    ((Number.isFinite(time) ? time : 0) + index * 2.7) % 14;
  // Seven active seconds leave enough time for the five-second capture countdown to finish.
  // Rendering and collision detection use this same predicate so the red field is authoritative.
  const hazardActive = (time: number, index: number) => {
    const phase = hazardPhase(time, index);
    return phase >= 5 && phase < 12;
  };

  // A modest local atmospheric pool, separate from the application's snowfall.
  const motePositions = new Float32Array(96 * 3);
  for (let i = 0; i < 96; i++) {
    motePositions[i * 3] = (random() - 0.5) * 58;
    motePositions[i * 3 + 1] = 0.7 + random() * 6;
    motePositions[i * 3 + 2] = -27 + random() * 60;
  }
  const moteGeometry = keepGeometry(new THREE.BufferGeometry());
  moteGeometry.setAttribute('position', new THREE.BufferAttribute(motePositions, 3));
  const moteMaterial = keepMaterial(
    new THREE.PointsMaterial({
      color: accentColor,
      size: 0.065,
      transparent: true,
      opacity: 0.45,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    }),
  );
  const motes = new THREE.Points(moteGeometry, moteMaterial);
  motes.name = 'chapter-motes';
  group.add(motes);
  for (const batch of batches.values()) {
    const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((m, i) => object.setMatrixAt(i, m));
    object.instanceMatrix.needsUpdate = true;
    object.castShadow = !batch.material.transparent;
    object.receiveShadow = true;
    object.computeBoundingSphere();
    group.add(object);
  }
  const cold = new THREE.Color(accentColor),
    gold = new THREE.Color(0xffce8d),
    coldLeaves = new THREE.Color(0x637f85),
    livingLeaves = new THREE.Color(0x6aaf73);
  let liberated = 0,
    lowQuality = false,
    disposed = false;
  const unlocked = new Set<number>();
  function update(
    time: number,
    liberation: number,
    activeRelays: readonly number[],
    reduced: boolean,
  ) {
    if (disposed) return;
    const t = Number.isFinite(time) ? time : 0;
    liberated = Math.max(
      liberated,
      Number.isFinite(liberation) ? THREE.MathUtils.clamp(liberation, 0, 1) : 0,
    );
    // A restored mechanism stays open for the lifetime of this world instance.
    activeRelays.forEach((index) => {
      if (Number.isInteger(index) && index >= 0 && index < 3) unlocked.add(index);
    });
    colliders.length = 0;
    colliders.push(...permanent);
    gates.forEach((gate) => {
      const open = unlocked.has(gate.index);
      gate.closed.visible = !open;
      gate.opened.visible = open;
      if (!open) colliders.push(gate.collider);
    });
    relays.forEach((relay, index) => {
      const active = unlocked.has(index);
      relayMaterials[index].emissive.copy(active ? gold : cold);
      relayMaterials[index].color.copy(active ? gold : cold);
      relay.light.color.copy(active ? gold : cold);
      relay.light.intensity = lowQuality ? 0 : active ? 3 : 2.3;
      relayHalos[index].rotation.y = reduced ? 0 : t * 0.6;
      relayHalos[index].position.y = 2.86 + (reduced ? 0 : Math.sin(t * 1.5 + index) * 0.07);
    });
    windows.emissive.copy(new THREE.Color(0x6993b1)).lerp(gold, liberated);
    windows.emissiveIntensity = 0.35 + liberated * 0.5;
    accent.emissive.copy(cold).lerp(gold, liberated);
    coreMaterial.emissive.copy(cold).lerp(gold, liberated);
    foliage.color
      .copy(coldLeaves)
      .lerp(livingLeaves, Math.max(liberated, (unlocked.size / 3) * 0.7));
    flower.emissiveIntensity = 0.23 + liberated * 0.45;
    landmarkRotors.forEach((rotor, i) => {
      rotor.rotation.y = reduced ? 0 : t * (0.035 + (i % 3) * 0.01);
    });
    coreOrb.rotation.y = reduced ? 0 : t * 0.4;
    coreOrb.position.y = 2.15 + (reduced ? 0 : Math.sin(t * 1.6) * 0.08);
    coreHalo.rotation.y = reduced ? 0 : t * 0.25;
    motes.visible = !reduced && !lowQuality;
    motes.position.y = reduced ? 0 : Math.sin(t * 0.25) * 0.2;
    hazards.forEach((hazard) => {
      const phase = hazardPhase(t, hazard.index),
        active = liberated < 1 && hazardActive(t, hazard.index),
        warning = liberated < 1 && phase >= 3.4 && phase < 5;
      hazard.material.color.set(active ? 0xed708e : warning ? 0xf3bd73 : 0x659bab);
      hazard.material.opacity = liberated >= 1 ? 0.035 : active ? 0.28 : warning ? 0.17 : 0.045;
      hazard.plume.visible = active || warning;
      hazard.beamMaterial.opacity = active ? 0.12 : 0.035;
      hazard.marker.material = active ? relayMaterials[0] : accent;
      hazard.ring.visible = hazard.fill.visible = true;
    });
  }
  update(0, 0, [], false);
  return {
    group,
    relays,
    core,
    colliders,
    drones: [],
    spawn: new THREE.Vector3(0, 0, 26),
    bounds: { minX: -30, maxX: 30, minZ: -27, maxZ: 33 },
    hazardLabel: HAZARD_LABELS[id],
    isHazard(position: THREE.Vector3, time: number) {
      return (
        !disposed &&
        liberated < 1 &&
        hazards.some(
          (hazard) =>
            hazardActive(time, hazard.index) &&
            Math.hypot(position.x - hazard.x, position.z - hazard.z) < 3.15,
        )
      );
    },
    setQuality(low: boolean) {
      lowQuality = low;
      glass.opacity = low ? 0.1 : 0.19;
      glass.roughness = low ? 0.55 : 0.18;
      moteGeometry.setDrawRange(0, low ? 0 : 96);
      relays.forEach((relay) => {
        if (low) relay.light.intensity = 0;
      });
    },
    update,
    dispose() {
      if (disposed) return;
      disposed = true;
      scene.remove(group);
      geometryResources.forEach((g) => g.dispose());
      materialResources.forEach((m) => m.dispose());
    },
  };
}
