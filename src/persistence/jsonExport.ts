import type { RoomState } from "../types";

export function exportToJSON(state: RoomState): void {
    const json = JSON.stringify(state, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = `lightmap-design-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

export function getJSONString(state: RoomState): string {
    return JSON.stringify(state, null, 2);
}
