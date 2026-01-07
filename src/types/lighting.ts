import type { Vector2 } from "./geometry";

export interface LightProperties {
    lumen: number;
    beamAngle: number;
    warmth: number;
}

export interface LightFixture {
    id: string;
    position: Vector2;
    properties: LightProperties;
}

export const DEFAULT_LIGHT_PROPERTIES: LightProperties = {
    lumen: 800,
    beamAngle: 60,
    warmth: 2700,
};
