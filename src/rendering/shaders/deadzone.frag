#define MAX_LIGHTS 32
#define FEET_TO_METERS 0.3048

uniform int uLightCount;
uniform vec2 uLightPositions[MAX_LIGHTS];
uniform float uLightLumens[MAX_LIGHTS];
uniform float uLightBeamAngles[MAX_LIGHTS];
uniform float uCeilingHeight;
uniform float uThreshold;
uniform vec3 uColor;
uniform float uOpacity;

varying vec2 vWorldPos;

float customSmoothstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
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
    float solidAngle = 2.0 * 3.14159 * (1.0 - cos(halfBeam));
    float candelas = uLightLumens[i] / max(solidAngle, 0.1);

    // Convert distance from feet to meters for lux calculation
    float dist3DMeters = dist3D * FEET_TO_METERS;

    // Illuminance = candelas * cos(angle) / distance^2
    float lux = (candelas * cosAngle) / (dist3DMeters * dist3DMeters);

    totalLux += lux * beamAtten;
  }

  // Only show color where lux is below threshold
  // Use smoothstep for soft edges
  float alpha = 1.0 - customSmoothstep(uThreshold * 0.5, uThreshold, totalLux);

  if (alpha < 0.01) {
    discard;
  }

  gl_FragColor = vec4(uColor, alpha * uOpacity);
}
