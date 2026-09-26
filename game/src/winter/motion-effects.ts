import * as THREE from 'three';

export interface WinterMotionEffects {
  step(position: THREE.Vector3, yaw: number, side: -1 | 1, running: boolean): void;
  update(time: number, reduced: boolean, enabled: boolean): void;
  reset(): void;
  dispose(): void;
}

type Contact = { mesh: THREE.Mesh<THREE.ShapeGeometry, THREE.MeshBasicMaterial>; age: number; life: number };
type Puff = { mesh: THREE.Mesh<THREE.IcosahedronGeometry, THREE.MeshBasicMaterial>; age: number; life: number;
  velocity: THREE.Vector3; radius: number };

/** Bounded, light-free snow contacts. Yaw zero faces -Z, positive yaw turns toward -X.
 * Call step only at actual gait contacts; position.y never lifts a mark off the floor.
 */
export function createMotionEffects(scene: THREE.Scene): WinterMotionEffects {
  const group = new THREE.Group(); group.name = 'winter-motion-contacts'; scene.add(group);
  const outline = new THREE.Shape();
  outline.moveTo(-.045, -.16); outline.quadraticCurveTo(-.075, -.15, -.072, -.04);
  outline.quadraticCurveTo(-.1, .08, -.068, .16); outline.quadraticCurveTo(0, .205, .068, .16);
  outline.quadraticCurveTo(.1, .08, .072, -.04); outline.quadraticCurveTo(.075, -.15, .045, -.16);
  outline.closePath();
  const footprintGeometry = new THREE.ShapeGeometry(outline, 4);
  const puffGeometry = new THREE.IcosahedronGeometry(1, 0);
  const contacts: Contact[] = Array.from({ length: 40 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ color: 0x233c46, transparent: true, opacity: 0,
      depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    const mesh = new THREE.Mesh(footprintGeometry, material);
    mesh.name = `snow-footprint-${index}`; mesh.visible = false; mesh.renderOrder = 1;
    group.add(mesh); return { mesh, age: 0, life: 0 };
  });
  const puffs: Puff[] = Array.from({ length: 64 }, (_, index) => {
    const material = new THREE.MeshBasicMaterial({ color: 0xc1d0d5, transparent: true, opacity: 0, depthWrite: false });
    const mesh = new THREE.Mesh(puffGeometry, material);
    mesh.name = `snow-dust-${index}`; mesh.visible = false;
    group.add(mesh); return { mesh, age: 0, life: 0, velocity: new THREE.Vector3(), radius: .04 };
  });
  let nextContact = 0, nextPuff = 0, sequence = 0;
  let lastTime: number | null = null;
  let effectsEnabled = true, disposed = false;

  function reset(): void {
    for (const contact of contacts) { contact.mesh.visible = false; contact.mesh.material.opacity = 0; contact.life = 0; }
    for (const puff of puffs) { puff.mesh.visible = false; puff.mesh.material.opacity = 0; puff.life = 0; }
    nextContact = 0; nextPuff = 0; sequence = 0; lastTime = null;
  }

  return {
    step(position, yaw, side, running) {
      if (disposed || !effectsEnabled || !position || !Number.isFinite(position.x)
        || !Number.isFinite(position.y) || !Number.isFinite(position.z) || !Number.isFinite(yaw)
        || (side !== -1 && side !== 1)) return;
      const cosine = Math.cos(yaw), sine = Math.sin(yaw);
      const x = position.x + cosine * side * .115 - sine * .025;
      const z = position.z - sine * side * .115 - cosine * .025;
      const contact = contacts[nextContact]; nextContact = (nextContact + 1) % contacts.length;
      contact.age = 0; contact.life = 9; contact.mesh.visible = true;
      contact.mesh.position.set(x, .03, z);
      contact.mesh.rotation.set(-Math.PI / 2, yaw, 0, 'YXZ');
      contact.mesh.scale.set(1, running ? 1.08 : 1, 1);
      contact.mesh.material.opacity = running ? .16 : .13;
      // Deterministic spread varies contacts without random frame-to-frame flicker.
      const count = running ? 4 : 3;
      for (let i = 0; i < count; i++) {
        const puff = puffs[nextPuff]; nextPuff = (nextPuff + 1) % puffs.length;
        const angle = sequence * 2.399963 + i * 2.094395;
        const lateral = Math.cos(angle), trailing = .3 + Math.sin(angle) * .25;
        puff.age = 0; puff.life = .55 + i * .09; puff.radius = running ? .055 : .043;
        puff.mesh.position.set(x + cosine * lateral * .025, .045, z - sine * lateral * .025);
        puff.mesh.scale.set(puff.radius, puff.radius * .4, puff.radius);
        puff.mesh.material.opacity = running ? .14 : .11; puff.mesh.visible = true;
        puff.velocity.set(cosine * lateral * .11 + sine * trailing * .12,
          .07 + i * .012, -sine * lateral * .11 + cosine * trailing * .12);
      }
      sequence++;
    },
    update(time, reduced, enabled) {
      if (disposed) return;
      effectsEnabled = enabled && !reduced;
      group.visible = effectsEnabled;
      if (!effectsEnabled) { reset(); return; }
      if (!Number.isFinite(time)) return;
      const dt = lastTime === null ? 0 : Math.max(0, Math.min(.1, time - lastTime));
      lastTime = time;
      for (const contact of contacts) {
        if (!contact.mesh.visible) continue;
        contact.age += dt;
        if (contact.age >= contact.life) { contact.mesh.visible = false; contact.mesh.material.opacity = 0; continue; }
        const initial = contact.mesh.scale.y > 1 ? .16 : .13;
        contact.mesh.material.opacity = initial * Math.pow(1 - contact.age / contact.life, 1.5);
      }
      for (const puff of puffs) {
        if (!puff.mesh.visible) continue;
        puff.age += dt;
        if (puff.age >= puff.life) { puff.mesh.visible = false; puff.mesh.material.opacity = 0; continue; }
        const progress = puff.age / puff.life;
        puff.mesh.position.addScaledVector(puff.velocity, dt);
        const size = puff.radius * (1 + progress * 1.6);
        puff.mesh.scale.set(size, size * .4, size);
        puff.mesh.material.opacity = (puff.radius > .05 ? .14 : .11) * Math.pow(1 - progress, 2);
      }
    },
    reset,
    dispose() {
      if (disposed) return;
      disposed = true; effectsEnabled = false; reset();
      scene.remove(group);
      footprintGeometry.dispose(); puffGeometry.dispose();
      for (const contact of contacts) contact.mesh.material.dispose();
      for (const puff of puffs) puff.mesh.material.dispose();
      group.clear();
    },
  };
}
