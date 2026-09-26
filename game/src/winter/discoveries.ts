import * as THREE from 'three';

interface Memory {
  id: number;
  title: string;
  text: string;
  x: number;
  z: number;
}

// Every position has a clear approach outside the pyramid, frozen pools and furniture.
const MEMORIES: readonly Memory[] = [
  { id: 0, x: 0, z: 23.5, title: 'A page from your notebook', text: 'I came to Paris with a sketchbook and a hundred questions. Even now, I keep finding new ones.' },
  { id: 1, x: -9, z: 20, title: 'The first conversation', text: 'I’m deaf and I don’t speak. I’m learning sign language, too. My new friend waits while I find the words. That means everything.' },
  { id: 2, x: 22, z: 12, title: 'A little light', text: 'Someone left a lamp in the library window for students walking home. I want to switch it on again.' },
  { id: 3, x: -23, z: -23, title: 'Room for questions', text: 'Today I learned that asking someone to show me again is part of learning. Tomorrow, I’ll ask again.' },
  { id: 4, x: 22, z: -23, title: 'When spring returns', text: 'When this is over, we’ll sit in the courtyard and fill our notebooks. There’s so much of the world I still want to know.' },
];

export const MEMORY_SPARKS: readonly { id: number; title: string; text: string; position: readonly [number, number] }[] = Object.freeze(
  MEMORIES.map(({ id, title, text, x, z }) => Object.freeze({ id, title, text, position: Object.freeze([x, z] as [number, number]) })),
);

export function createDiscoveries(scene: THREE.Scene): {
  group: THREE.Group;
  update(time: number, position: THREE.Vector3, enabled: boolean, reduced: boolean): { id: number; title: string; text: string } | null;
  reset(collected: readonly number[]): void;
  collected(): number[];
  celebrate(position: THREE.Vector3, color?: number): void;
  dispose(): void;
} {
  const group = new THREE.Group(); group.name = 'Noor’s scattered memories'; scene.add(group);
  const found = new Set<number>();
  const crystalGeometry = new THREE.OctahedronGeometry(.21, 0);
  const cageGeometry = new THREE.TorusGeometry(.33, .012, 5, 36);
  const floorGeometry = new THREE.RingGeometry(.35, .39, 40);
  const crystalMaterial = new THREE.MeshStandardMaterial({ color: 0xffe4a8, emissive: 0xffc578, emissiveIntensity: 1.65, roughness: .23, metalness: .25 });
  const cageMaterial = new THREE.MeshStandardMaterial({ color: 0xdab68b, emissive: 0xc58452, emissiveIntensity: .62, roughness: .4, metalness: .7 });
  const floorMaterial = new THREE.MeshBasicMaterial({ color: 0xeebd80, transparent: true, opacity: .42, side: THREE.DoubleSide, depthWrite: false });
  const tokens = MEMORIES.map(memory => {
    const token = new THREE.Group(); token.position.set(memory.x, 0, memory.z); token.name = memory.title; group.add(token);
    const crystal = new THREE.Mesh(crystalGeometry, crystalMaterial); crystal.scale.set(.7, 1.5, .7); crystal.position.y = 1.12; token.add(crystal);
    const cage = new THREE.Mesh(cageGeometry, cageMaterial); cage.position.y = 1.12; cage.rotation.x = .35; token.add(cage);
    const floor = new THREE.Mesh(floorGeometry, floorMaterial); floor.rotation.x = -Math.PI / 2; floor.position.y = .08; token.add(floor);
    return { token, crystal, cage, floor };
  });

  // Fixed particle pool: celebrations never allocate geometry or lights.
  const capacity = 96;
  const positions = new Float32Array(capacity * 3), colors = new Float32Array(capacity * 3), alphas = new Float32Array(capacity);
  const velocities = new Float32Array(capacity * 3), remaining = new Float32Array(capacity);
  const particlesGeometry = new THREE.BufferGeometry();
  particlesGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3).setUsage(THREE.DynamicDrawUsage));
  particlesGeometry.setAttribute('sparkColor', new THREE.BufferAttribute(colors, 3).setUsage(THREE.DynamicDrawUsage));
  particlesGeometry.setAttribute('sparkAlpha', new THREE.BufferAttribute(alphas, 1).setUsage(THREE.DynamicDrawUsage));
  const particlesMaterial = new THREE.ShaderMaterial({
    vertexShader: `attribute vec3 sparkColor; attribute float sparkAlpha;
      varying vec3 vColor; varying float vAlpha;
      void main(){vColor=sparkColor;vAlpha=sparkAlpha;vec4 viewPosition=modelViewMatrix*vec4(position,1.0);
      gl_Position=projectionMatrix*viewPosition;gl_PointSize=clamp(95.0/max(1.0,-viewPosition.z),1.5,9.0);}`,
    fragmentShader: `varying vec3 vColor;varying float vAlpha;
      void main(){float radius=length(gl_PointCoord-0.5);float glow=1.0-smoothstep(0.03,0.5,radius);
      gl_FragColor=vec4(vColor,glow*vAlpha);}`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  const particles = new THREE.Points(particlesGeometry, particlesMaterial); particles.frustumCulled = false; group.add(particles);
  let previousTime: number | null = null, reducedMotion = false, cursor = 0, disposed = false;
  let randomSeed = 914; const random = () => { randomSeed = (Math.imul(randomSeed, 1664525) + 1013904223) >>> 0; return randomSeed / 4294967296; };
  function celebrate(position: THREE.Vector3, color = 0xffcc81) {
    if (disposed || reducedMotion) return;
    const rgb = new THREE.Color(color);
    for (let i = 0; i < 32; i++) {
      const slot = cursor++ % capacity, j = slot * 3;
      const angle = random() * Math.PI * 2, speed = .45 + random() * 1.7;
      positions[j] = position.x; positions[j + 1] = position.y + .85; positions[j + 2] = position.z;
      velocities[j] = Math.cos(angle) * speed; velocities[j + 1] = .45 + random() * 1.8; velocities[j + 2] = Math.sin(angle) * speed;
      remaining[slot] = .65 + random() * .5; alphas[slot] = .9;
      colors[j] = rgb.r; colors[j + 1] = rgb.g; colors[j + 2] = rgb.b;
    }
    particlesGeometry.attributes.position.needsUpdate = true; particlesGeometry.attributes.sparkColor.needsUpdate = true; particlesGeometry.attributes.sparkAlpha.needsUpdate = true;
  }
  function reset(collected: readonly number[]) {
    if (disposed) return;
    found.clear(); collected.forEach(id => { if (Number.isInteger(id) && id >= 0 && id < MEMORIES.length) found.add(id); });
    tokens.forEach((token, id) => { token.token.visible = !found.has(id); });
    remaining.fill(0); alphas.fill(0); particlesGeometry.attributes.sparkAlpha.needsUpdate = true; previousTime = null;
  }
  return {
    group,
    update(time, position, enabled, reduced) {
      if (disposed) return null;
      reducedMotion = reduced;
      const delta = previousTime === null ? 0 : THREE.MathUtils.clamp(time - previousTime, 0, .08); previousTime = time;
      tokens.forEach(({ crystal, cage, floor }, id) => {
        const t = reduced ? 0 : time;
        crystal.position.y = 1.12 + (reduced ? 0 : Math.sin(t * 1.7 + id) * .1);
        crystal.rotation.y = reduced ? .4 : t * .45 + id;
        cage.position.y = crystal.position.y; cage.rotation.y = reduced ? 0 : -t * .3 + id;
        floor.scale.setScalar(reduced ? 1 : 1 + Math.sin(t * 1.5 + id) * .045);
      });
      particles.visible = !reduced;
      for (let i = 0; i < capacity; i++) {
        if (reduced) { remaining[i] = 0; alphas[i] = 0; continue; }
        if (remaining[i] <= 0) continue;
        remaining[i] = Math.max(0, remaining[i] - delta); alphas[i] = Math.min(.9, remaining[i] * 1.4);
        const j = i * 3; velocities[j + 1] -= delta * .8;
        positions[j] += velocities[j] * delta; positions[j + 1] += velocities[j + 1] * delta; positions[j + 2] += velocities[j + 2] * delta;
      }
      particlesGeometry.attributes.position.needsUpdate = true; particlesGeometry.attributes.sparkAlpha.needsUpdate = true;
      if (!enabled) return null;
      for (const memory of MEMORIES) {
        if (!found.has(memory.id) && Math.hypot(position.x - memory.x, position.z - memory.z) <= 1.2) {
          found.add(memory.id); tokens[memory.id].token.visible = false;
          celebrate(new THREE.Vector3(memory.x, .2, memory.z));
          return { id: memory.id, title: memory.title, text: memory.text };
        }
      }
      return null;
    },
    reset,
    collected() { return [...found].sort((a, b) => a - b); },
    celebrate,
    dispose() {
      if (disposed) return; disposed = true; scene.remove(group);
      [crystalGeometry, cageGeometry, floorGeometry, particlesGeometry].forEach(g => g.dispose());
      [crystalMaterial, cageMaterial, floorMaterial, particlesMaterial].forEach(m => m.dispose());
    },
  };
}
