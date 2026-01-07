import type { RoomState, WallSegment, LightFixture } from "../types";

export class ValidationError extends Error {
    constructor(message: string) {
        super(message);
        this.name = "ValidationError";
    }
}

export function validateRoomState(data: unknown): RoomState {
    if (!data || typeof data !== "object") {
        throw new ValidationError("Invalid data format: expected an object");
    }

    const obj = data as Record<string, unknown>;

    if (typeof obj.ceilingHeight !== "number" || obj.ceilingHeight <= 0) {
        throw new ValidationError("Invalid ceilingHeight: must be a positive number");
    }

    if (!Array.isArray(obj.walls)) {
        throw new ValidationError("Invalid walls: must be an array");
    }

    for (const wall of obj.walls) {
        validateWallSegment(wall);
    }

    if (!Array.isArray(obj.lights)) {
        throw new ValidationError("Invalid lights: must be an array");
    }

    for (const light of obj.lights) {
        validateLightFixture(light);
    }

    if (typeof obj.isClosed !== "boolean") {
        throw new ValidationError("Invalid isClosed: must be a boolean");
    }

    return {
        ceilingHeight: obj.ceilingHeight,
        walls: obj.walls as WallSegment[],
        lights: obj.lights as LightFixture[],
        isClosed: obj.isClosed,
    };
}

function validateWallSegment(data: unknown): void {
    if (!data || typeof data !== "object") {
        throw new ValidationError("Invalid wall segment: expected an object");
    }

    const wall = data as Record<string, unknown>;

    if (typeof wall.id !== "string") {
        throw new ValidationError("Invalid wall id: must be a string");
    }

    validateVector2(wall.start, "wall.start");
    validateVector2(wall.end, "wall.end");

    if (typeof wall.length !== "number" || wall.length < 0) {
        throw new ValidationError("Invalid wall length: must be a non-negative number");
    }
}

function validateLightFixture(data: unknown): void {
    if (!data || typeof data !== "object") {
        throw new ValidationError("Invalid light fixture: expected an object");
    }

    const light = data as Record<string, unknown>;

    if (typeof light.id !== "string") {
        throw new ValidationError("Invalid light id: must be a string");
    }

    validateVector2(light.position, "light.position");

    if (!light.properties || typeof light.properties !== "object") {
        throw new ValidationError("Invalid light properties: must be an object");
    }

    const props = light.properties as Record<string, unknown>;

    if (typeof props.lumen !== "number" || props.lumen < 0) {
        throw new ValidationError("Invalid lumen: must be a non-negative number");
    }

    if (typeof props.beamAngle !== "number" || props.beamAngle <= 0 || props.beamAngle > 180) {
        throw new ValidationError("Invalid beamAngle: must be between 0 and 180");
    }

    if (typeof props.warmth !== "number" || props.warmth < 1000 || props.warmth > 10000) {
        throw new ValidationError("Invalid warmth: must be between 1000K and 10000K");
    }
}

function validateVector2(data: unknown, field: string): void {
    if (!data || typeof data !== "object") {
        throw new ValidationError(`Invalid ${field}: expected an object`);
    }

    const vec = data as Record<string, unknown>;

    if (typeof vec.x !== "number") {
        throw new ValidationError(`Invalid ${field}.x: must be a number`);
    }

    if (typeof vec.y !== "number") {
        throw new ValidationError(`Invalid ${field}.y: must be a number`);
    }
}

export async function importFromJSON(file: File): Promise<RoomState> {
    const text = await file.text();
    let data: unknown;

    try {
        data = JSON.parse(text);
    } catch {
        throw new ValidationError("Invalid JSON format");
    }

    return validateRoomState(data);
}

export function importFromString(jsonString: string): RoomState {
    let data: unknown;

    try {
        data = JSON.parse(jsonString);
    } catch {
        throw new ValidationError("Invalid JSON format");
    }

    return validateRoomState(data);
}
