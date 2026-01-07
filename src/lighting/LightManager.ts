import type { Vector2, LightFixture, LightProperties } from "../types";
import { DEFAULT_LIGHT_PROPERTIES } from "../types";
import { generateId } from "../utils/id";
import { distancePointToPoint } from "../utils/math";

export class LightManager {
    private lights: Map<string, LightFixture> = new Map();

    addLight(position: Vector2, properties?: Partial<LightProperties>): LightFixture {
        const light: LightFixture = {
            id: generateId(),
            position: { ...position },
            properties: { ...DEFAULT_LIGHT_PROPERTIES, ...properties },
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
