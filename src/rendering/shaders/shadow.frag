uniform vec2 uLightPosition;
uniform int uVertexCount;
uniform vec2 uPolygonVertices[64];

varying vec2 vWorldPos;

bool isPointInPolygon(vec2 point) {
  bool inside = false;

  for (int i = 0, j = 63; i < 64; i++) {
    if (i >= uVertexCount)
      break;

    int prevIndex = i == 0 ? uVertexCount - 1 : i - 1;

    vec2 vi = uPolygonVertices[i];
    vec2 vj;

    for (int k = 0; k < 64; k++) {
      if (k == prevIndex) {
        vj = uPolygonVertices[k];
        break;
      }
    }

    if (((vi.y > point.y) != (vj.y > point.y)) &&
        (point.x < (vj.x - vi.x) * (point.y - vi.y) / (vj.y - vi.y) + vi.x)) {
      inside = !inside;
    }

    j = i;
  }

  return inside;
}

void main() {
  if (isPointInPolygon(vWorldPos)) {
    gl_FragColor = vec4(1.0, 1.0, 0.9, 0.6);
  } else {
    gl_FragColor = vec4(0.1, 0.1, 0.1, 0.8);
  }
}