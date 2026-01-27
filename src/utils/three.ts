import * as THREE from 'three';

/**
 * Disposes of a Three.js Object3D's geometry and material resources.
 */
export function disposeObject3D(object: THREE.Object3D): void {
  if (object instanceof THREE.Mesh || object instanceof THREE.Line || object instanceof THREE.LineSegments) {
    object.geometry.dispose();
    if (Array.isArray(object.material)) {
      object.material.forEach((m) => m.dispose());
    } else {
      (object.material as THREE.Material).dispose();
    }
  } else if (object instanceof THREE.Sprite) {
    object.material.map?.dispose();
    object.material.dispose();
  }
}

/**
 * Removes all children from a group and disposes their resources.
 */
export function clearGroup(group: THREE.Group): void {
  while (group.children.length > 0) {
    const child = group.children[0];
    group.remove(child);
    disposeObject3D(child);
  }
}

/**
 * Disposes of all meshes in an array and clears the array.
 */
export function disposeMeshArray(meshes: THREE.Mesh[], scene?: THREE.Scene): void {
  for (const mesh of meshes) {
    if (scene) {
      scene.remove(mesh);
    }
    mesh.geometry.dispose();
    if (Array.isArray(mesh.material)) {
      mesh.material.forEach((m) => m.dispose());
    } else {
      (mesh.material as THREE.Material).dispose();
    }
  }
  meshes.length = 0;
}

/**
 * Creates uniform arrays for shader materials with MAX_LIGHTS capacity.
 */
export function createLightUniformArrays(maxLights: number): {
  positions: THREE.Vector2[];
  lumens: number[];
  beamAngles: number[];
} {
  const positions: THREE.Vector2[] = [];
  const lumens: number[] = [];
  const beamAngles: number[] = [];

  for (let i = 0; i < maxLights; i++) {
    positions.push(new THREE.Vector2(0, 0));
    lumens.push(0);
    beamAngles.push(60);
  }

  return { positions, lumens, beamAngles };
}

export interface TextSpriteOptions {
  fontSize?: number;
  padding?: number;
  fontWeight?: 'normal' | 'bold';
  backgroundColor?: string | number;
  textColor?: string;
  scale?: number;
}

/**
 * Creates a text sprite using canvas rendering.
 * Used for dimension labels, measurement labels, etc.
 */
export function createTextSprite(text: string, options: TextSpriteOptions = {}): THREE.Sprite {
  const {
    fontSize = 24,
    padding = 12,
    fontWeight = 'normal',
    backgroundColor = 'white',
    textColor = 'black',
    scale = 0.5,
  } = options;

  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d')!;

  const font = `${fontWeight === 'bold' ? 'bold ' : ''}${fontSize}px Arial`;
  context.font = font;
  const textWidth = context.measureText(text).width;

  canvas.width = Math.ceil(textWidth + padding * 2);
  canvas.height = fontSize + padding;

  // Draw background
  const bgColor = typeof backgroundColor === 'number'
    ? `#${backgroundColor.toString(16).padStart(6, '0')}`
    : backgroundColor;
  context.fillStyle = bgColor;
  context.fillRect(0, 0, canvas.width, canvas.height);

  // Draw text
  context.font = font;
  context.fillStyle = textColor;
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(text, canvas.width / 2, canvas.height / 2);

  const texture = new THREE.CanvasTexture(canvas);
  const material = new THREE.SpriteMaterial({ map: texture });
  const sprite = new THREE.Sprite(material);

  const aspectRatio = canvas.width / canvas.height;
  sprite.scale.set(aspectRatio * scale, scale, 1);

  return sprite;
}
