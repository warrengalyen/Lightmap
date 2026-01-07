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
  // Scale: 0-50 lux = blue to green, 50-150 lux = green to red
  float t = clamp(lux / 150.0, 0.0, 1.0);
  vec3 blue = vec3(0.0, 0.0, 1.0);
  vec3 green = vec3(0.0, 1.0, 0.0);
  vec3 yellow = vec3(1.0, 1.0, 0.0);
  vec3 red = vec3(1.0, 0.0, 0.0);

  if (t < 0.33) {
    return mix(blue, green, t * 3.0);
  } else if (t < 0.66) {
    return mix(green, yellow, (t - 0.33) * 3.0);
  } else {
    return mix(yellow, red, (t - 0.66) * 3.0);
  }
}

void main() {
  float totalLux = 0.0;

  for (int i = 0; i < MAX_LIGHTS; i++) {
    if (i >= uLightCount) break;

    vec2 delta = uLightPositions[i] - vWorldPos;
    float horizDist = length(delta);

    // Calculate 3D distance from light to floor point
    float dist3D = sqrt(horizDist * horizDist + uCeilingHeight * uCeilingHeight);

    // Angle from vertical (0 = directly below light)
    float angleFromVert = atan(horizDist, uCeilingHeight);
    float halfBeam = uLightBeamAngles[i] * 0.5 * 0.01745329; // degrees to radians

    // Beam attenuation - soft falloff at beam edge
    float beamAtten = 1.0 - customSmoothstep(halfBeam * 0.7, halfBeam * 1.2, angleFromVert);

    // Cosine factor for surface illumination (Lambert's cosine law)
    float cosAngle = uCeilingHeight / dist3D;

    // Convert lumens to candelas for a directional light
    // For a spotlight: I = lumens / (2 * PI * (1 - cos(halfBeam)))
    float solidAngle = 2.0 * 3.14159 * (1.0 - cos(halfBeam));
    float candelas = uLightLumens[i] / max(solidAngle, 0.1);

    // Illuminance = candelas * cos(angle) / distance^2
    float lux = (candelas * cosAngle) / (dist3D * dist3D);

    totalLux += lux * beamAtten;
  }

  gl_FragColor = vec4(luxToColor(totalLux), 0.7);
}