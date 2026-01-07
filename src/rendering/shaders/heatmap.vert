verying vec2 vWorldPos;

void main() {
    // Transform local position to world position
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPos = worldPos.xy;
    gl_Position = projectionMatrix * modelMatrix * vec4(position, 1.0);
}