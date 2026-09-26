import type * as THREE from 'three';
export type Cipher = 'A' | 'B' | 'C';
export interface Relay {
  id: number; name: string; position: THREE.Vector3;
  object: THREE.Group; light: THREE.PointLight;
}
export interface WinterWorld {
  group: THREE.Group;
  relays: Relay[];
  core: THREE.Vector3;
  colliders: THREE.Box3[];
  drones: THREE.Group[];
  update(time: number, liberation: number, activeRelays: readonly number[], reducedMotion: boolean): void;
  dispose(): void;
}
