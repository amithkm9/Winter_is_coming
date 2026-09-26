import * as THREE from 'three';
import type { WinterWorld, Relay } from './types';

/** Original, geometry-built frozen Louvre courtyard. No external model assets. */
export function createWinterWorld(scene: THREE.Scene): WinterWorld {
  const group = new THREE.Group(); group.name = 'The frozen Cour Napoleon'; scene.add(group);
  const colliders: THREE.Box3[] = [];
  const stone = new THREE.MeshStandardMaterial({ color: 0x879da9, roughness: .89, metalness: .04 });
  const trim = new THREE.MeshStandardMaterial({ color: 0xa7b7bc, roughness: .84 });
  const recess = new THREE.MeshStandardMaterial({ color: 0x293e50, roughness: .9 });
  const slate = new THREE.MeshStandardMaterial({ color: 0x24374b, roughness: .63, metalness: .2 });
  const snow = new THREE.MeshStandardMaterial({ color: 0xd0e5e9, roughness: .88 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x24313f, roughness: .45, metalness: .8 });
  const copper = new THREE.MeshStandardMaterial({ color: 0x65878e, roughness: .4, metalness: .8 });
  const paving = new THREE.MeshStandardMaterial({ color: 0x405867, roughness: .32, metalness: .27 });
  const pavingLight = new THREE.MeshStandardMaterial({ color: 0x536c7b, roughness: .45, metalness: .12 });
  const ice = new THREE.MeshPhysicalMaterial({ color: 0x86cbdf, roughness: .17, metalness: .17, transparent: true, opacity: .58, clearcoat: .8 });
  const windowMaterial = new THREE.MeshStandardMaterial({ color: 0x7fb4cb, emissive: 0x35637f, emissiveIntensity: .52, roughness: .28, metalness: .15 });
  const neon = new THREE.MeshStandardMaterial({ color: 0xb2f3ff, emissive: 0x45cefa, emissiveIntensity: 2.2, roughness: .2 });
  const paleNeon = new THREE.MeshStandardMaterial({ color: 0xd8f4fc, emissive: 0x7bd2f6, emissiveIntensity: .7 });
  const alarm = new THREE.MeshStandardMaterial({ color: 0xff718e, emissive: 0xed335b, emissiveIntensity: 2.0 });

  const cube = new THREE.BoxGeometry(1, 1, 1);
  const cylinder = new THREE.CylinderGeometry(1, 1, 1, 12);
  const sphere = new THREE.SphereGeometry(1, 10, 7);
  const cone = new THREE.ConeGeometry(1, 1, 4);
  const instances = new Map<string, { geometry: THREE.BufferGeometry; material: THREE.Material; matrices: THREE.Matrix4[]; shadow: boolean }>();
  const temporary = new THREE.Object3D();
  function instance(geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1, yaw = 0, shadow = true) {
    const key = `${geometry.uuid}:${material.uuid}:${shadow}`;
    let batch = instances.get(key);
    if (!batch) { batch = { geometry, material, matrices: [], shadow }; instances.set(key, batch); }
    temporary.position.set(x, y, z); temporary.rotation.set(0, yaw, 0); temporary.scale.set(sx, sy, sz); temporary.updateMatrix();
    batch.matrices.push(temporary.matrix.clone());
  }
  const box = (mat: THREE.Material, x: number, y: number, z: number, w: number, h: number, d: number, yaw = 0) => instance(cube, mat, x, y, z, w, h, d, yaw);
  function beam(a: THREE.Vector3, b: THREE.Vector3, radius: number, mat: THREE.Material) {
    const key = `${cylinder.uuid}:${mat.uuid}:true`;
    let batch = instances.get(key); if (!batch) { batch = { geometry: cylinder, material: mat, matrices: [], shadow: true }; instances.set(key, batch); }
    temporary.position.copy(a).add(b).multiplyScalar(.5); temporary.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize()); temporary.scale.set(radius, a.distanceTo(b), radius); temporary.updateMatrix(); batch.matrices.push(temporary.matrix.clone());
  }
  function solidCollider(x: number, z: number, w: number, d: number, h = 20) {
    colliders.push(new THREE.Box3(new THREE.Vector3(x - w / 2, -.2, z - d / 2), new THREE.Vector3(x + w / 2, h, z + d / 2)));
  }
  function mesh(geometry: THREE.BufferGeometry, material: THREE.Material, parent: THREE.Object3D, x = 0, y = 0, z = 0) {
    const object = new THREE.Mesh(geometry, material); object.position.set(x, y, z); object.castShadow = true; object.receiveShadow = true; parent.add(object); return object;
  }

  // Hundreds of individual wet cobbles share two instanced draw calls.
  box(paving, 0, -.3, 0, 74, .6, 77);
  for (let row = 0; row < 39; row++) for (let col = 0; col < 37; col++) {
    const x = -36 + col * 2 + (row % 2) * .5, z = -37 + row * 2;
    box((row + col * 3) % 7 === 0 ? pavingLight : paving, x, -.015, z, 1.96, .055, 1.96);
  }
  // Courtyard axes in pale cut stone and shallow frozen reflecting basins.
  for (const x of [-26, 26]) box(trim, x, .025, 0, .22, .055, 68);
  for (const z of [-25, 29]) box(trim, 0, .03, z, 58, .06, .24);
  for (const x of [-14.8, 14.8]) {
    box(stone, x, .08, -6, 5.2, .2, 20.4);
    box(ice, x, .2, -6, 4.7, .075, 19.9);
    box(snow, x - 2.5, .22, -6, .3, .18, 20.4); box(snow, x + 2.5, .22, -6, .3, .18, 20.4);
    solidCollider(x, -6, 5.2, 20.4, .4);
  }

  function mansard(width: number, depth: number, height: number): THREE.BufferGeometry {
    const a = width / 2, b = depth / 2, t = width * .43, u = depth * .22;
    const v = [-a, 0, -b, a, 0, -b, a, 0, b, -a, 0, b, -t, height, -u, t, height, -u, t, height, u, -t, height, u];
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(v, 3));
    geo.setIndex([0, 4, 5, 0, 5, 1, 1, 5, 6, 1, 6, 2, 2, 6, 7, 2, 7, 3, 3, 7, 4, 3, 4, 0, 4, 7, 6, 4, 6, 5]); geo.computeVertexNormals(); return geo;
  }
  const archShape = new THREE.Shape(); archShape.moveTo(-.7, 0); archShape.lineTo(.7, 0); archShape.lineTo(.7, 1.7); archShape.absarc(0, 1.7, .7, 0, Math.PI, false); archShape.closePath();
  const arch = new THREE.ShapeGeometry(archShape, 10);
  const dormerRoof = mansard(2.2, 1.8, 1.5);

  // Facades face into the courtyard. Local +Z is their inward-facing direction.
  function palace(cx: number, cz: number, length: number, yaw: number, bays: number) {
    const f = (lx: number, ly: number, lz: number) => new THREE.Vector3(cx + Math.cos(yaw) * lx + Math.sin(yaw) * lz, ly, cz - Math.sin(yaw) * lx + Math.cos(yaw) * lz);
    const b = (mat: THREE.Material, lx: number, ly: number, lz: number, w: number, h: number, d: number) => { const p = f(lx, ly, lz); box(mat, p.x, p.y, p.z, w, h, d, yaw); };
    b(stone, 0, 7.5, 0, length, 15, 8);
    b(trim, 0, .55, 4.13, length + .4, 1.1, .48);
    b(trim, 0, 4.65, 4.18, length + .45, .32, .65); b(trim, 0, 9.25, 4.16, length + .45, .38, .58);
    b(trim, 0, 14.7, 4.25, length + .75, .5, .8); b(snow, 0, 15.08, 4.3, length + .85, .2, .86);
    const roof = mesh(mansard(length + 1.1, 9.4, 4.2), slate, group, cx, 15, cz); roof.rotation.y = yaw;
    b(snow, 0, 19.25, 0, length * .86, .17, 4.1);
    b(copper, 0, 19.34, 0, length * .9, .13, .15);
    // Rusticated joints and facade relief.
    for (let level = 1; level <= 13; level++) b(recess, 0, level, 4.012, length, .025, .018);
    for (let i = 0; i < bays; i++) {
      const x = (i - (bays - 1) / 2) * (length - 3) / bays;
      for (let floor = 0; floor < 3; floor++) {
        const y = .95 + floor * 4.6;
        const ap = f(x, y, 4.03); instance(arch, recess, ap.x, ap.y, ap.z, 1.16, 1.05, 1, yaw, false);
        const wp = f(x, y + .12, 4.07); instance(arch, windowMaterial, wp.x, wp.y, wp.z, .85, .93, 1, yaw, false);
        b(trim, x - .93, y + 1.2, 4.12, .16, 2.8, .24); b(trim, x + .93, y + 1.2, 4.12, .16, 2.8, .24);
        b(trim, x, y + 2.62, 4.14, 2.03, .22, .3); b(trim, x, y - .02, 4.18, 2.05, .2, .5);
        b(iron, x, y + 1.14, 4.12, .065, 2.04, .06); b(iron, x, y + 1.23, 4.13, 1.3, .065, .07);
        b(snow, x, y + .1, 4.23, 1.94, .1, .45);
        if (floor === 1) { b(iron, x, y + .3, 4.48, 1.96, .055, .06); for (let k = -3; k <= 3; k++) b(iron, x + k * .28, y, 4.48, .03, .62, .035); }
      }
      // Fluted pilasters, sculpted capitals, and roof dormers.
      if (i % 2 === 0) {
        b(trim, x + 1.65, 9.7, 4.25, .42, 9.0, .36); b(trim, x + 1.65, 13.9, 4.29, .7, .35, .49);
        for (const dx of [-.1, .1]) b(stone, x + 1.65 + dx, 9.7, 4.45, .06, 8.3, .025);
      }
      b(stone, x, 16.25, 3.55, 1.8, 2.1, 1.1); b(windowMaterial, x, 16.35, 4.12, .86, 1.4, .025);
      b(trim, x, 15.54, 4.15, 1.9, .16, .2); b(trim, x, 16.35, 4.14, .085, 1.4, .07);
      const dp = f(x, 17.2, 3.7); instance(dormerRoof, trim, dp.x, dp.y, dp.z, 1, 1, 1, yaw);
    }
    for (let x = -length / 2 + 3; x < length / 2; x += 8) {
      b(stone, x, 19.7, -1.9, .9, 2.2, .8); b(trim, x, 20.8, -1.9, 1.12, .22, 1);
      b(snow, x, 20.96, -1.9, 1.18, .1, 1.05);
    }
  }
  palace(0, -36, 77, 0, 21); solidCollider(0, -36, 78, 8);
  palace(-36, -1, 66, Math.PI / 2, 18); solidCollider(-36, -1, 8, 67);
  palace(36, -1, 66, -Math.PI / 2, 18); solidCollider(36, -1, 8, 67);
  // Central pavilion rises above the regular palace rhythm.
  box(stone, 0, 17.3, -35.6, 11, 5.8, 9.1); box(trim, 0, 20.35, -35.6, 11.8, .5, 9.6);
  mesh(mansard(12.4, 10.4, 5.7), slate, group, 0, 20.6, -35.6);
  box(snow, 0, 26.4, -35.6, 10.7, .17, 4.4); box(copper, 0, 26.8, -35.6, .3, .8, .3);
  const pediment = new THREE.ConeGeometry(1, 1, 3); instance(pediment, trim, 0, 19.2, -30.85, 5.2, 2.7, .3, 0);
  const clock = mesh(new THREE.CircleGeometry(.83, 32), iron, group, 0, 18.35, -30.47);
  mesh(new THREE.TorusGeometry(.86, .08, 5, 32), trim, clock);
  box(paleNeon, 0, 18.52, -30.41, .055, .43, .03); box(paleNeon, .17, 18.34, -30.4, .34, .055, .03);

  // The Louvre pyramid is a transparent mesh, with a real triangular lattice.
  const pyramidGlass = new THREE.MeshPhysicalMaterial({ color: 0x6dafc2, emissive: 0x133b56, emissiveIntensity: .2, roughness: .11, metalness: .45, transparent: true, opacity: .31, side: THREE.DoubleSide, depthWrite: false });
  const pyramid = mesh(new THREE.ConeGeometry(14.4, 13.6, 4, 1, true), pyramidGlass, group, 0, 6.88, -4); pyramid.rotation.y = Math.PI / 4;
  box(stone, 0, .15, -4, 21.3, .3, 21.3); solidCollider(0, -4, 20.8, 20.8, 13.6);
  const pyramidLines: number[] = [];
  const apex = new THREE.Vector3(0, 13.67, -4);
  const corners = [new THREE.Vector3(-10.18, .08, -14.18), new THREE.Vector3(10.18, .08, -14.18), new THREE.Vector3(10.18, .08, 6.18), new THREE.Vector3(-10.18, .08, 6.18)];
  for (let side = 0; side < 4; side++) {
    const a = corners[side], b = corners[(side + 1) % 4];
    for (let j = 0; j <= 12; j++) {
      const t = j / 12;
      const p = a.clone().lerp(apex, t), q = b.clone().lerp(apex, t); pyramidLines.push(...p.toArray(), ...q.toArray());
      const r = a.clone().lerp(b, t), s = apex.clone().lerp(b, t); pyramidLines.push(...r.toArray(), ...s.toArray());
      const u = b.clone().lerp(a, t), v = apex.clone().lerp(a, t); pyramidLines.push(...u.toArray(), ...v.toArray());
    }
  }
  const lineGeometry = new THREE.BufferGeometry(); lineGeometry.setAttribute('position', new THREE.Float32BufferAttribute(pyramidLines, 3));
  const pyramidWire = new THREE.LineSegments(lineGeometry, new THREE.LineBasicMaterial({ color: 0x89c4d8, transparent: true, opacity: .68 })); group.add(pyramidWire);
  for (let i = 0; i < 4; i++) beam(corners[i], corners[(i + 1) % 4], .055, neon);
  const beacon = mesh(new THREE.OctahedronGeometry(.23), neon, group, 0, 13.96, -4);
  const pyramidLight = new THREE.PointLight(0x4acaf2, 14, 23, 2); pyramidLight.position.set(0, 4, -4); group.add(pyramidLight);

  // Snow is concentrated on ledges and courtyard edges, preserving navigability.
  let seed = 51; const rand = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
  for (let i = 0; i < 100; i++) {
    const edge = i % 3; const x = edge === 0 ? -30 + rand() * 60 : (edge === 1 ? -30 : 30) + rand() * 1.8;
    const z = edge === 0 ? -29 + rand() * 1.6 : -28 + rand() * 59;
    instance(sphere, snow, x, .04, z, .5 + rand() * 1.8, .12 + rand() * .3, .5 + rand() * 1.2, rand() * Math.PI);
  }
  for (let i = 0; i < 44; i++) {
    const side = i % 2 ? -1 : 1, x = side * (28.6 + rand() * 2), z = -27 + rand() * 56;
    instance(cone, ice, x, .4 + rand() * .45, z, .25 + rand() * .55, 1.2 + rand() * 2.2, .3 + rand() * .6, rand() * Math.PI);
  }
  // Street furniture and tall nineteenth-century lamps.
  const lampMaterials: THREE.MeshStandardMaterial[] = [];
  for (const x of [-24.6, 24.6]) for (const z of [-23, -7, 11, 28]) {
    instance(cylinder, iron, x, .16, z, .44, .32, .44); instance(cylinder, iron, x, 2.5, z, .085, 4.8, .085);
    instance(cylinder, trim, x, .6, z, .18, .75, .18); instance(sphere, iron, x, 4.6, z, .16, .2, .16);
    box(iron, x, 4.88, z, .57, .13, .57);
    const bulb = paleNeon.clone(); lampMaterials.push(bulb);
    mesh(new THREE.BoxGeometry(.34, .67, .34), bulb, group, x, 5.25, z);
    for (const dx of [-.24, .24]) for (const dz of [-.24, .24]) box(iron, x + dx, 5.23, z + dz, .045, .7, .045);
    instance(cone, iron, x, 5.72, z, .48, .43, .48, Math.PI / 4); instance(sphere, snow, x, 5.85, z, .32, .08, .32);
    if (z === 11) { const light = new THREE.PointLight(0xaadfff, 5, 8, 2); light.position.set(x, 5, z); group.add(light); }
    solidCollider(x, z, .8, .8, 6);
  }
  for (const side of [-1, 1]) for (const z of [-20, 1, 22]) {
    const x = side * 28;
    for (const dz of [-1, 1]) { box(iron, x, .4, z + dz, .15, .8, .13); box(iron, x + side * .6, .4, z + dz, .15, .8, .13); }
    for (let j = 0; j < 4; j++) box(copper, x + side * j * .19, .82, z, .16, .1, 2.5);
    for (let j = 0; j < 3; j++) box(copper, x + side * .68, 1.07 + j * .2, z, .1, .15, 2.5);
    box(snow, x + side * .35, .91, z, .8, .085, 2.5); solidCollider(x + side * .3, z, 1.1, 2.7, 1.7);
  }
  // A frozen barricade at the square entrance leaves the middle approach open.
  for (const x of [-26, -20, -14, 14, 20, 26]) {
    box(stone, x, .58, 33, 4.4, 1.16, 1.25); box(snow, x, 1.22, 33, 4.5, .14, 1.34); solidCollider(x, 33, 4.5, 1.4, 1.4);
    for (let k = -1; k <= 1; k++) box(neon, x + k * 1.4, .65, 32.34, .42, .07, .025);
  }

  // Distant Paris skyline. Real silhouettes retain depth under fog.
  const skyline = new THREE.MeshStandardMaterial({ color: 0x283b51, roughness: .95 });
  for (let i = 0; i < 25; i++) {
    const x = -110 + i * 9, height = 8 + rand() * 12, z = -61 - rand() * 20;
    box(skyline, x, height / 2, z, 7 + rand() * 4, height, 9); const roof = mesh(mansard(9, 11, 4), slate, group, x, height, z);
    roof.castShadow = false;
  }
  // Eiffel Tower suggestion well beyond the western wing, built from steel trusses.
  const tower = new THREE.Vector3(-69, 0, -56);
  for (const dx of [-1, 1]) for (const dz of [-1, 1]) {
    const foot = tower.clone().add(new THREE.Vector3(dx * 7, 0, dz * 7));
    const middle = tower.clone().add(new THREE.Vector3(dx * 2.4, 15, dz * 2.4));
    const top = tower.clone().add(new THREE.Vector3(dx * .45, 31, dz * .45));
    beam(foot, middle, .65, skyline); beam(middle, top, .28, skyline);
    for (let j = 0; j < 4; j++) {
      const y = 2 + j * 3.2, w = 7 - y * .3; beam(tower.clone().add(new THREE.Vector3(dx * w, y, dz * w)), tower.clone().add(new THREE.Vector3(-dx * (w - 1), y + 3, dz * (w - 1))), .14, skyline);
    }
  }
  box(skyline, tower.x, 14.8, tower.z, 6.8, .6, 6.8); box(skyline, tower.x, 8, tower.z, 10.7, .65, 10.7); instance(cylinder, skyline, tower.x, 34, tower.z, .18, 8, .18);

  // Accessible resistance relays. Cipher glow is updated independently per relay.
  const relaySpecs = [{ x: -18, z: 15, name: 'WEST ARCADE' }, { x: 18, z: 4, name: 'EAST GALLERY' }, { x: -16, z: -18, name: 'ARCHIVE VAULT' }];
  const relayEmitters: THREE.MeshStandardMaterial[] = [];
  const relayRings: THREE.Mesh[] = [];
  const relayCables: THREE.Line[] = [];
  const relays: Relay[] = relaySpecs.map((spec, id) => {
    const object = new THREE.Group(); object.name = `Relay ${id}: ${spec.name}`; object.position.set(spec.x, 0, spec.z); group.add(object);
    const material = neon.clone(); relayEmitters.push(material);
    mesh(new THREE.CylinderGeometry(.92, 1.1, .3, 8), iron, object, 0, .15, 0);
    mesh(new THREE.BoxGeometry(1.1, 1.8, .65), iron, object, 0, 1.16, 0);
    mesh(new THREE.BoxGeometry(.89, 1.31, .075), recess, object, 0, 1.34, .37);
    mesh(new THREE.BoxGeometry(.7, .93, .03), material, object, 0, 1.49, .416);
    for (let k = 0; k < 5; k++) mesh(new THREE.BoxGeometry(.44 + k % 2 * .12, .025, .02), iron, object, 0, 1.2 + k * .13, .44);
    mesh(new THREE.BoxGeometry(1.22, .13, .81), snow, object, 0, 2.12, 0);
    mesh(new THREE.CylinderGeometry(.05, .07, 1.1, 8), copper, object, .43, 2.65, -.15);
    mesh(new THREE.OctahedronGeometry(.13), material, object, .43, 3.22, -.15);
    const ring = mesh(new THREE.TorusGeometry(.72, .028, 5, 48), material, object, 0, 2.89, 0); relayRings.push(ring);
    const light = new THREE.PointLight(0x4acaf3, 2.5, 5, 2); light.position.set(0, 1.65, .6); object.add(light);
    // The pedestal is deliberately small: players can approach from every side.
    solidCollider(spec.x, spec.z, 1.2, .8, 2.2);
    const points = [new THREE.Vector3(spec.x, .08, spec.z), new THREE.Vector3(spec.x, .08, 23), new THREE.Vector3(0, .08, 23), new THREE.Vector3(0, .08, 9)];
    const cable = new THREE.Line(new THREE.BufferGeometry().setFromPoints(points), new THREE.LineBasicMaterial({ color: 0x376278, transparent: true, opacity: .6 })); group.add(cable); relayCables.push(cable);
    return { id, name: spec.name, position: new THREE.Vector3(spec.x, 0, spec.z), object, light };
  });
  const core = new THREE.Vector3(0, 0, 9);
  const coreObject = new THREE.Group(); coreObject.position.copy(core); group.add(coreObject);
  mesh(new THREE.CylinderGeometry(1.25, 1.6, .45, 8), stone, coreObject, 0, .225, 0);
  mesh(new THREE.CylinderGeometry(.68, .82, 1.1, 8), iron, coreObject, 0, .96, 0);
  const coreMaterial = neon.clone();
  const coreOrb = mesh(new THREE.IcosahedronGeometry(.51, 1), coreMaterial, coreObject, 0, 2, 0);
  const coreRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) { const ring = mesh(new THREE.TorusGeometry(.89 + i * .13, .035, 6, 48), copper, coreObject, 0, 2, 0); ring.rotation.set(i * .8, i * .8, i * .45); coreRings.push(ring); }
  solidCollider(0, 9, 1.9, 1.9, 2.8);

  // Patrol drones: mechanical silhouettes, independently rotating rotors, real scanning cones.
  const drones: THREE.Group[] = [];
  const rotors: THREE.Group[] = [];
  const droneScanMaterials: THREE.MeshBasicMaterial[] = [];
  const droneFloorRings: THREE.Mesh[] = [];
  for (let i = 0; i < 3; i++) {
    const drone = new THREE.Group(); drone.name = `NEXUS sentinel ${i + 1}`; group.add(drone); drones.push(drone);
    mesh(new THREE.SphereGeometry(.6, 12, 7), iron, drone, 0, 0, 0).scale.set(1.35, .42, .85);
    mesh(new THREE.BoxGeometry(.75, .12, .13), alarm, drone, 0, -.13, .4);
    mesh(new THREE.SphereGeometry(.18, 10, 6), alarm, drone, 0, -.38, 0);
    for (const side of [-1, 1]) {
      mesh(new THREE.BoxGeometry(1.1, .075, .1), iron, drone, side * .85, .02, 0);
      const rotor = new THREE.Group(); rotor.position.set(side * 1.18, .09, 0); drone.add(rotor); rotors.push(rotor);
      const outer = mesh(new THREE.TorusGeometry(.45, .06, 5, 20), iron, rotor); outer.rotation.x = Math.PI / 2;
      for (let k = 0; k < 3; k++) { const blade = mesh(new THREE.BoxGeometry(.8, .035, .055), copper, rotor); blade.rotation.y = k * Math.PI / 3; }
      const rim = mesh(new THREE.TorusGeometry(.46, .012, 4, 20), alarm, drone, side * 1.18, .1, 0); rim.rotation.x = Math.PI / 2;
    }
    const scanMat = new THREE.MeshBasicMaterial({ color: 0xf04368, transparent: true, opacity: .09, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide }); droneScanMaterials.push(scanMat);
    const scan = mesh(new THREE.ConeGeometry(5.9, 8, 24, 1, true), scanMat, drone, 0, -4.4, 0); scan.castShadow = false; scan.receiveShadow = false;
    const floorRing = mesh(new THREE.RingGeometry(5.75, 5.86, 64), scanMat.clone(), group); floorRing.rotation.x = -Math.PI / 2; floorRing.castShadow = false; floorRing.receiveShadow = false; droneFloorRings.push(floorRing);
  }

  // Consolidate static repeated architecture only after all instances have been placed.
  for (const batch of instances.values()) {
    const object = new THREE.InstancedMesh(batch.geometry, batch.material, batch.matrices.length);
    batch.matrices.forEach((matrix, i) => object.setMatrixAt(i, matrix)); object.instanceMatrix.needsUpdate = true;
    object.castShadow = batch.shadow; object.receiveShadow = true; object.computeBoundingSphere(); group.add(object);
  }
  const coldWindow = new THREE.Color(0x35637f), warmWindow = new THREE.Color(0xffad62);
  const coldGlow = new THREE.Color(0x45cefa), warmGlow = new THREE.Color(0xffca77);
  let disposed = false;
  function update(time: number, liberation: number, activeRelays: readonly number[], reducedMotion: boolean) {
    const t = time, restored = THREE.MathUtils.clamp(liberation, 0, 1);
    windowMaterial.emissive.copy(coldWindow).lerp(warmWindow, restored); windowMaterial.emissiveIntensity = .52 + restored * .95;
    lampMaterials.forEach(m => m.emissive.copy(coldGlow).lerp(warmGlow, restored));
    pyramidLight.color.copy(coldGlow).lerp(warmGlow, restored); pyramidLight.intensity = 14 + restored * 8;
    coreMaterial.emissive.copy(coldGlow).lerp(warmGlow, restored); coreMaterial.color.set(restored > .99 ? 0xffdd9a : 0xb2f3ff);
    if (!reducedMotion) { coreOrb.rotation.y = t * .45; coreOrb.position.y = 2 + Math.sin(t * 1.6) * .08; beacon.rotation.y = t * .3; }
    coreRings.forEach((ring, i) => { if (!reducedMotion) { ring.rotation.x = i * .8 + t * .22; ring.rotation.y = i * .8 + t * .3; } });
    relays.forEach((relay, i) => {
      const active = activeRelays.includes(relay.id); relayEmitters[i].emissive.copy(active ? warmGlow : coldGlow); relayEmitters[i].color.set(active ? 0xffdca1 : 0xb2f3ff);
      relay.light.color.copy(active ? warmGlow : coldGlow); relay.light.intensity = active ? 4 : 2.5;
      (relayCables[i].material as THREE.LineBasicMaterial).color.copy(active ? warmGlow : new THREE.Color(0x376278));
      if (!reducedMotion) { relayRings[i].rotation.y = t * .7; relayRings[i].position.y = 2.89 + Math.sin(t * 1.8 + i) * .1; }
    });
    drones.forEach((drone, i) => {
      const speed = t * .16 + i * Math.PI * 2 / 3;
      // Large patrol loops skirt the pyramid, giving each relay a distinct timing window.
      const x = i === 0 ? -20 + Math.sin(speed) * 5.5 : i === 1 ? 20 + Math.cos(speed) * 5 : Math.sin(speed) * 21;
      const z = i === 0 ? 11 + Math.cos(speed) * 12 : i === 1 ? -2 + Math.sin(speed) * 17 : -23 + Math.cos(speed) * 3;
      drone.position.set(x, 8.5 + (reducedMotion ? 0 : Math.sin(t * .8 + i) * .25), z); drone.rotation.y = -speed;
      droneFloorRings[i].position.set(x, .075, z);
      droneScanMaterials[i].opacity = (1 - restored) * .06;
      (droneFloorRings[i].material as THREE.MeshBasicMaterial).opacity = (1 - restored) * .35;
      if (restored > .99) drone.position.y += 10;
    });
    rotors.forEach((rotor, i) => { if (!reducedMotion) rotor.rotation.y = t * (i % 2 ? 20 : -20); });
  }
  update(0, 0, [], false);
  return {
    group, relays, core, colliders, drones, update,
    dispose() {
      if (disposed) return; disposed = true; scene.remove(group);
      const geometries = new Set<THREE.BufferGeometry>(); const materials = new Set<THREE.Material>();
      group.traverse(o => { if (o instanceof THREE.Mesh || o instanceof THREE.Line) { geometries.add(o.geometry); const m = o.material; (Array.isArray(m) ? m : [m]).forEach(material => materials.add(material)); } });
      geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose());
    },
  };
}
