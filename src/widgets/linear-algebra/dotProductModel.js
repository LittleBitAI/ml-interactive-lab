export const INITIAL_DOT_PRODUCT_VALUES = Object.freeze({
  magnitudeA: 5,
  magnitudeB: 4,
  thetaDegrees: 60,
});

export const MAX_VECTOR_MAGNITUDE = 10;
export const MAX_ABSOLUTE_DOT_PRODUCT =
  MAX_VECTOR_MAGNITUDE * MAX_VECTOR_MAGNITUDE;
export const ANGLE_NEAR_ENDPOINT_THRESHOLD = 5;
export const SVG_VIEW_BOX = '0 0 640 420';
export const SVG_ORIGIN = Object.freeze({ x: 320, y: 300 });
export const SVG_PIXELS_PER_UNIT = 20;

const FLOATING_POINT_EPSILON = 1e-10;

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function degreesToRadians(degrees) {
  return (degrees * Math.PI) / 180;
}

export function clampNearZero(value, epsilon = FLOATING_POINT_EPSILON) {
  if (!Number.isFinite(value) || Math.abs(value) < epsilon) {
    return 0;
  }

  return Object.is(value, -0) ? 0 : value;
}

export function normalizeValue(value, fractionDigits = 12) {
  const normalized = Number(clampNearZero(value).toFixed(fractionDigits));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function calculateSignedScalarProjection(magnitudeB, thetaDegrees) {
  return normalizeValue(
    magnitudeB * Math.cos(degreesToRadians(thetaDegrees)),
  );
}

export function calculateDotProduct(magnitudeA, magnitudeB, thetaDegrees) {
  return normalizeValue(
    magnitudeA *
      calculateSignedScalarProjection(magnitudeB, thetaDegrees),
  );
}

export function calculateSvgEndpoint(
  magnitude,
  thetaDegrees,
  origin = SVG_ORIGIN,
  pixelsPerUnit = SVG_PIXELS_PER_UNIT,
) {
  const radians = degreesToRadians(thetaDegrees);

  return {
    x: normalizeValue(origin.x + magnitude * pixelsPerUnit * Math.cos(radians)),
    y: normalizeValue(origin.y - magnitude * pixelsPerUnit * Math.sin(radians)),
  };
}

function calculatePolarPoint(origin, radius, thetaDegrees) {
  return calculateSvgEndpoint(radius, thetaDegrees, origin, 1);
}

export function createSvgGeometry(magnitudeA, magnitudeB, thetaDegrees) {
  const endpointA = calculateSvgEndpoint(magnitudeA, 0);
  const endpointB = calculateSvgEndpoint(magnitudeB, thetaDegrees);
  const projectionPoint = {
    x: endpointB.x,
    y: SVG_ORIGIN.y,
  };
  const visibleArcAngle = Math.max(thetaDegrees, 1.5);
  const arcRadius = 48;
  const arcStart = calculatePolarPoint(SVG_ORIGIN, arcRadius, 0);
  const arcEnd = calculatePolarPoint(
    SVG_ORIGIN,
    arcRadius,
    visibleArcAngle,
  );
  const angleLabelPoint = calculatePolarPoint(
    SVG_ORIGIN,
    75,
    Math.max(thetaDegrees / 2, 5),
  );

  return {
    origin: SVG_ORIGIN,
    endpointA,
    endpointB,
    projectionPoint,
    angleArcPath: [
      `M ${arcStart.x} ${arcStart.y}`,
      `A ${arcRadius} ${arcRadius} 0 0 0 ${arcEnd.x} ${arcEnd.y}`,
    ].join(' '),
    angleLabelPoint: {
      x: clamp(angleLabelPoint.x, 42, 598),
      y: clamp(angleLabelPoint.y, 42, 378),
    },
    projectionLabelPoint: {
      x: clamp(
        Math.abs(projectionPoint.x - SVG_ORIGIN.x) < 8
          ? SVG_ORIGIN.x + 56
          : (SVG_ORIGIN.x + projectionPoint.x) / 2,
        82,
        558,
      ),
      y: SVG_ORIGIN.y + 31,
    },
    perpendicularLabelPoint: {
      x: clamp(
        endpointB.x + (endpointB.x > 490 ? -12 : 12),
        82,
        558,
      ),
      y: clamp(
        Math.abs(endpointB.y - projectionPoint.y) < 8
          ? projectionPoint.y - 16
          : (endpointB.y + projectionPoint.y) / 2,
        55,
        365,
      ),
      textAnchor: endpointB.x > 490 ? 'end' : 'start',
    },
    labelA: {
      x: clamp(endpointA.x + 14, 50, 600),
      y: clamp(endpointA.y + 26, 50, 375),
      textAnchor: endpointA.x > 570 ? 'end' : 'start',
    },
    labelB: {
      x: clamp(
        endpointB.x + (thetaDegrees > 90 ? -14 : 14),
        50,
        600,
      ),
      y: clamp(
        endpointB.y + (magnitudeB === 0 ? -28 : -14),
        42,
        375,
      ),
      textAnchor: thetaDegrees > 90 ? 'end' : 'start',
    },
  };
}

export function formatValue(value, maximumFractionDigits = 4) {
  return normalizeValue(value).toLocaleString('ko-KR', {
    maximumFractionDigits,
  });
}

export function getDotProductSignState(dotProduct) {
  const normalizedDotProduct = clampNearZero(dotProduct);

  if (normalizedDotProduct > 0) {
    return {
      key: 'positive',
      label: '양수 — 같은 방향 성분',
      shortLabel: '양수',
    };
  }

  if (normalizedDotProduct < 0) {
    return {
      key: 'negative',
      label: '음수 — 반대 방향 성분',
      shortLabel: '음수',
    };
  }

  return {
    key: 'zero',
    label: '0 — 수직 또는 영벡터',
    shortLabel: '0',
  };
}

export function getInterpretationState({
  magnitudeA,
  magnitudeB,
  thetaDegrees,
}) {
  if (magnitudeA === 0 && magnitudeB === 0) {
    return {
      key: 'zero-a',
      text: '두 벡터가 모두 영벡터이므로 내적은 0입니다. 영벡터 a의 방향은 정의되지 않으므로 그 방향으로의 정사영도 정의되지 않습니다.',
    };
  }

  if (magnitudeA === 0) {
    return {
      key: 'zero-a',
      text: '벡터 a가 영벡터이므로 내적은 0이지만, 영벡터 a의 방향은 정의되지 않아 그 방향으로의 정사영은 수학적으로 정의되지 않습니다.',
    };
  }

  if (magnitudeB === 0) {
    return {
      key: 'zero-b',
      text: '벡터 b가 영벡터이므로 각도와 관계없이 정사영 길이와 내적은 모두 0입니다.',
    };
  }

  if (thetaDegrees <= ANGLE_NEAR_ENDPOINT_THRESHOLD) {
    return {
      key: 'maximum-positive',
      text: '두 벡터가 같은 방향이므로 현재 크기에서 내적이 최대입니다.',
    };
  }

  if (thetaDegrees < 90) {
    return {
      key: 'positive',
      text: '두 벡터가 대체로 같은 방향을 향하므로 내적이 양수입니다.',
    };
  }

  if (thetaDegrees === 90) {
    return {
      key: 'zero',
      text: '벡터 b는 벡터 a 방향 성분을 갖지 않으므로 내적이 0입니다.',
    };
  }

  if (thetaDegrees >= 180 - ANGLE_NEAR_ENDPOINT_THRESHOLD) {
    return {
      key: 'minimum-negative',
      text: '두 벡터가 정반대 방향이므로 현재 크기에서 내적이 가장 작은 음수입니다.',
    };
  }

  return {
    key: 'negative',
    text: '벡터 b가 벡터 a의 반대 방향 성분을 가지므로 내적이 음수입니다.',
  };
}
