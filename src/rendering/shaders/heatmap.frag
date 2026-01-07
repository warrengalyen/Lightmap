#define MAX_LIGHTS 32

uniform int uLightCount;
uniform vec2 uLightPositions[MAX_LIGHTS];
uniform float uLightLumens[MAX_LIGHTS];
uniform float uLightBeamAngles[MAX_LIGHTS];
uniform float uCeilingHeight;

varying vec2 vWorldPos;

float customSmoothstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

vec3 luxToColor(float lux) {
  float t = clamp(lux / 600.0, 0.0, 1.0);
  vec3 blue = vec3(0.0, 0.0, 1.0);
  vec3 green = vec3(0.0, 1.0, 0.0);
  vec3 red = vec3(1.0, 0.0, 0.0);

  if (t < 0.5) {
    return mix(blue, green, t * 2.0);
  } else {
    return mix(green, red, (t - 0.5) * 2.0);
  }
}

void main() {
  float totalLux = 0.0;

  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;

    vec2 delta = uLightPositions[i] - vWorldPos;
    float horizDist = length(delta);
    float dist3D = sqrt(horizDist * horizDist + uCeilingHeight * uCeilingHeight);

    float angleFromVert = atan(horizDist, uCeilingHeight);
    float halfBeam = uLightBeamAngles[i] * 0.5 * 0.01745329;

    float beamAtten = 1.0 - customSmoothstep(halfBeam * 0.8, halfBeam, angleFromVert);

    float intensity = uLightLumens[i] / (4.0 * 3.14159 * dist3D * dist3D);

    totalLux += intensity * beamAtten;
  }

  gl_FragColor = vec4(luxToColor(totalLux), 0.7);
}