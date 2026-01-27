#define MAX_LIGHTS 32
#define MAX_POLYGON_VERTICES 64
#define MAX_OBSTACLES 8
#define MAX_OBSTACLE_VERTICES 64
#define FEET_TO_METERS 0.3048

uniform int uLightCount;
uniform vec2 uLightPositions[MAX_LIGHTS];
uniform float uLightLumens[MAX_LIGHTS];
uniform float uLightBeamAngles[MAX_LIGHTS];
uniform float uCeilingHeight;
uniform int uVertexCount;
uniform vec2 uPolygonVertices[MAX_POLYGON_VERTICES];
uniform int uObstacleCount;
uniform int uObstacleVertexCounts[MAX_OBSTACLES];
uniform vec2 uObstacleVertices[MAX_OBSTACLE_VERTICES];

varying vec2 vWorldPos;

bool isPointInPolygon(vec2 point) {
  if (uVertexCount < 3) return true; // No polygon defined, show everything

  bool inside = false;

  for (int i = 0; i < MAX_POLYGON_VERTICES; i++) {
    if (i >= uVertexCount) break;

    int prevIndex = i == 0 ? uVertexCount - 1 : i - 1;

    vec2 vi = uPolygonVertices[i];
    vec2 vj;

    for (int k = 0; k < MAX_POLYGON_VERTICES; k++) {
      if (k == prevIndex) {
        vj = uPolygonVertices[k];
        break;
      }
    }

    if (((vi.y > point.y) != (vj.y > point.y)) &&
        (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
      inside = !inside;
    }
  }

  return inside;
}

bool isPointInObstacle(vec2 point) {
  int offset = 0;
  for (int obs = 0; obs < MAX_OBSTACLES; obs++) {
    if (obs >= uObstacleCount) break;

    int vCount = uObstacleVertexCounts[obs];
    if (vCount < 3) {
      offset += vCount;
      continue;
    }

    bool inside = false;
    for (int i = 0; i < MAX_OBSTACLE_VERTICES; i++) {
      if (i >= vCount) break;

      int prevIdx = i == 0 ? vCount - 1 : i - 1;

      vec2 vi = uObstacleVertices[offset + i];
      vec2 vj = uObstacleVertices[offset + prevIdx];

      if (((vi.y > point.y) != (vj.y > point.y)) &&
          (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
        inside = !inside;
      }
    }

    if (inside) return true;
    offset += vCount;
  }
  return false;
}

float customSmoothstep(float edge0, float edge1, float x) {
  float t = clamp((x - edge0) / (edge1 - edge0), 0.0, 1.0);
  return t * t * (3.0 - 2.0 * t);
}

vec3 luxToColor(float lux) {
  // Scale: 0-200 lux = blue to green, 200-400 = green to yellow, 400-600+ = yellow to red
  // This range covers most residential/commercial lighting needs
  float t = clamp(lux / 600.0, 0.0, 1.0);
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
  // Discard pixels outside the wall polygon
  if (!isPointInPolygon(vWorldPos)) {
    discard;
  }

  // Discard pixels inside any obstacle polygon
  if (isPointInObstacle(vWorldPos)) {
    discard;
  }

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

    // Convert distance from feet to meters for lux calculation
    // Illuminance formula requires distance in meters: E = I / d²
    float dist3DMeters = dist3D * FEET_TO_METERS;

    // Illuminance = candelas * cos(angle) / distance^2
    float lux = (candelas * cosAngle) / (dist3DMeters * dist3DMeters);

    totalLux += lux * beamAtten;
  }

  gl_FragColor = vec4(luxToColor(totalLux), 0.7);
}
