import type { Vector2, LightFixture, LightProperties, LightDefinition } from '../types';
import { DEFAULT_LIGHT_PROPERTIES, DEFAULT_LIGHT_DEFINITIONS } from '../types';
import { generateId } from '../utils/id';
import { distancePointToPoint } from '../utils/math';
import { getDefinitionById } from '../stores/lightDefinitionsStore';

export class LightManager {
  private lights: Map<string, LightFixture> = new Map();
  private getDefinition: (id: string) => LightDefinition | undefined;

  constructor(getDefinition: (id: string) => LightDefinition | undefined = getDefinitionById) {
    this.getDefinition = getDefinition;
  }

  /**
   * Add a light at the given position
   * @param position - The position to place the light
   * @param definitionIdOrProperties - Either a definition ID string, or legacy properties object
   */
  addLight(position: Vector2, definitionIdOrProperties?: string | Partial<LightProperties>): LightFixture {
    let definitionId: string | undefined;
    let properties: LightProperties;

    if (typeof definitionIdOrProperties === 'string') {
      // New style: definition ID
      definitionId = definitionIdOrProperties;
      const definition = this.getDefinition(definitionId);
      properties = definition
        ? { lumen: definition.lumen, beamAngle: definition.beamAngle, warmth: definition.warmth }
        : { ...DEFAULT_LIGHT_PROPERTIES };
    } else if (definitionIdOrProperties && typeof definitionIdOrProperties === 'object') {
      // Legacy style: properties object
      properties = { ...DEFAULT_LIGHT_PROPERTIES, ...definitionIdOrProperties };
    } else {
      // No argument: use default definition
      definitionId = DEFAULT_LIGHT_DEFINITIONS[0].id;
      const definition = this.getDefinition(definitionId);
      properties = definition
        ? { lumen: definition.lumen, beamAngle: definition.beamAngle, warmth: definition.warmth }
        : { ...DEFAULT_LIGHT_PROPERTIES };
    }

    const light: LightFixture = {
      id: generateId(),
      position: { ...position },
      definitionId,
      properties,
    };

    this.lights.set(light.id, light);
    return light;
  }

  removeLight(id: string): boolean {
    return this.lights.delete(id);
  }

  updateLight(id: string, properties: Partial<LightProperties>): LightFixture | null {
    const light = this.lights.get(id);
    if (!light) return null;

    light.properties = { ...light.properties, ...properties };
    return light;
  }

  updateLightDefinition(id: string, definitionId: string): LightFixture | null {
    const light = this.lights.get(id);
    if (!light) return null;

    const definition = this.getDefinition(definitionId);
    if (!definition) return null;

    light.definitionId = definitionId;
    light.properties = {
      lumen: definition.lumen,
      beamAngle: definition.beamAngle,
      warmth: definition.warmth,
    };

    return light;
  }

  updateLightPosition(id: string, position: Vector2): LightFixture | null {
    const light = this.lights.get(id);
    if (!light) return null;

    light.position = { ...position };
    return light;
  }

  getLight(id: string): LightFixture | null {
    return this.lights.get(id) ?? null;
  }

  getLightAt(position: Vector2, tolerance: number = 0.5): LightFixture | null {
    for (const light of this.lights.values()) {
      if (distancePointToPoint(position, light.position) <= tolerance) {
        return light;
      }
    }
    return null;
  }

  getAllLights(): LightFixture[] {
    return Array.from(this.lights.values());
  }

  setLights(lights: LightFixture[]): void {
    this.lights.clear();
    for (const light of lights) {
      this.lights.set(light.id, { ...light });
    }
  }

  clear(): void {
    this.lights.clear();
  }

  get count(): number {
    return this.lights.size;
  }
}
