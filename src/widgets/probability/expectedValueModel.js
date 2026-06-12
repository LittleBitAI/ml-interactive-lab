export const INITIAL_EXPECTED_VALUE_VALUES = {
  outcomeA: 20,
  outcomeB: 80,
  probabilityA: 0.4,
  trialCount: 100,
  sampleSeed: 20260612,
};

export const MAX_TRIALS = 1000;

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeNumber(value, fractionDigits = 12) {
  if (!Number.isFinite(value)) {
    return 0;
  }

  const normalized = Number(value.toFixed(fractionDigits));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function calculateExpectedValue(outcomeA, outcomeB, probabilityA) {
  const normalizedProbabilityA = clamp(probabilityA, 0, 1);
  const probabilityB = 1 - normalizedProbabilityA;

  return normalizeNumber(
    outcomeA * normalizedProbabilityA + outcomeB * probabilityB,
  );
}

export function formatNumber(value, maximumFractionDigits = 2) {
  return normalizeNumber(value).toLocaleString('ko-KR', {
    maximumFractionDigits,
  });
}

export function formatProbability(value) {
  return clamp(value, 0, 1).toFixed(2);
}

export function formatPercent(value) {
  return `${normalizeNumber(clamp(value, 0, 1) * 100, 2)}%`;
}

export function createOutcomeScale(outcomeA, outcomeB, expectedValue) {
  const minimumOutcome = Math.min(outcomeA, outcomeB);
  const maximumOutcome = Math.max(outcomeA, outcomeB);
  const outcomeSpan = maximumOutcome - minimumOutcome;
  const padding =
    outcomeSpan === 0
      ? Math.max(10, Math.abs(minimumOutcome) * 0.15)
      : Math.max(8, outcomeSpan * 0.25);
  const domainMinimum = minimumOutcome - padding;
  const domainMaximum = maximumOutcome + padding;
  const domainSpan = domainMaximum - domainMinimum;

  function toPosition(value) {
    return clamp(((value - domainMinimum) / domainSpan) * 100, 0, 100);
  }

  return {
    domainMinimum: normalizeNumber(domainMinimum),
    domainMaximum: normalizeNumber(domainMaximum),
    positionA: normalizeNumber(toPosition(outcomeA)),
    positionB: normalizeNumber(toPosition(outcomeB)),
    expectedPosition: normalizeNumber(toPosition(expectedValue)),
  };
}

function createSeededRandom(seed) {
  let state = seed >>> 0;

  return function nextRandom() {
    state += 0x6d2b79f5;
    let result = state;
    result = Math.imul(result ^ (result >>> 15), result | 1);
    result ^= result + Math.imul(result ^ (result >>> 7), result | 61);
    return ((result ^ (result >>> 14)) >>> 0) / 4294967296;
  };
}

export function generateOutcomeSequence(
  probabilityA,
  length = MAX_TRIALS,
  seed = INITIAL_EXPECTED_VALUE_VALUES.sampleSeed,
) {
  const normalizedProbabilityA = clamp(probabilityA, 0, 1);
  const normalizedLength = clamp(Math.floor(length), 1, MAX_TRIALS);

  if (normalizedProbabilityA === 0) {
    return Array.from({ length: normalizedLength }, () => 'B');
  }

  if (normalizedProbabilityA === 1) {
    return Array.from({ length: normalizedLength }, () => 'A');
  }

  const random = createSeededRandom(seed);

  return Array.from({ length: normalizedLength }, () =>
    random() < normalizedProbabilityA ? 'A' : 'B',
  );
}

export function createRunningAverage(
  sequence,
  outcomeA,
  outcomeB,
  trialCount = sequence.length,
) {
  const normalizedTrialCount = clamp(
    Math.floor(trialCount),
    1,
    sequence.length,
  );
  const points = [];
  let countA = 0;
  let sum = 0;

  for (let index = 0; index < normalizedTrialCount; index += 1) {
    const outcome = sequence[index];
    const value = outcome === 'A' ? outcomeA : outcomeB;

    if (outcome === 'A') {
      countA += 1;
    }

    sum += value;
    points.push({
      trial: index + 1,
      average: normalizeNumber(sum / (index + 1)),
    });
  }

  return {
    countA,
    countB: normalizedTrialCount - countA,
    empiricalAverage: normalizeNumber(sum / normalizedTrialCount),
    points,
  };
}

export function downsampleChartPoints(points, maximumPoints = 180) {
  if (points.length <= maximumPoints) {
    return points;
  }

  const interval = Math.ceil((points.length - 1) / (maximumPoints - 1));
  const sampledPoints = [points[0]];

  for (let index = interval; index < points.length - 1; index += interval) {
    sampledPoints.push(points[index]);
  }

  sampledPoints.push(points.at(-1));
  return sampledPoints;
}
