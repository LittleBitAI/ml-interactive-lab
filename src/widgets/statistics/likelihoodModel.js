export const BASE_DATA = {
  trials: 10,
  heads: 7,
  tails: 3,
};

export const INITIAL_P = 0.4;
export const MLE_P = BASE_DATA.heads / BASE_DATA.trials;
export const STABILITY_SAMPLE_SIZES = [10, 100, 1000, 10000];
export const LOG_CHART_MINIMUM = -50;

const LOG_CURVE_EPSILON = 0.001;
const SLIDER_PRECISION = 0.01;
const LOG_MIN_POSITIVE_NUMBER = Math.log(Number.MIN_VALUE);
const RELATIVE_SCORE_TOLERANCE = 1e-12;

export function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value));
}

export function normalizeNumber(value, fractionDigits = 12) {
  if (!Number.isFinite(value)) {
    return value;
  }

  const normalized = Number(value.toFixed(fractionDigits));
  return Object.is(normalized, -0) ? 0 : normalized;
}

export function normalizeProbability(value) {
  return normalizeNumber(clamp(value, 0, 1), 2);
}

export function calculateLogLikelihood(
  p,
  heads = BASE_DATA.heads,
  tails = BASE_DATA.tails,
) {
  const normalizedP = clamp(p, 0, 1);

  if (
    (normalizedP === 0 && heads > 0) ||
    (normalizedP === 1 && tails > 0)
  ) {
    return Number.NEGATIVE_INFINITY;
  }

  const headsTerm = heads === 0 ? 0 : heads * Math.log(normalizedP);
  const tailsTerm =
    tails === 0 ? 0 : tails * Math.log(1 - normalizedP);

  return normalizeNumber(headsTerm + tailsTerm);
}

export function calculateLikelihood(
  p,
  heads = BASE_DATA.heads,
  tails = BASE_DATA.tails,
) {
  const logLikelihood = calculateLogLikelihood(p, heads, tails);

  if (logLikelihood === Number.NEGATIVE_INFINITY) {
    return 0;
  }

  return normalizeNumber(Math.exp(logLikelihood));
}

export function calculateMle(heads, tails) {
  const trials = heads + tails;
  return trials === 0 ? null : normalizeNumber(heads / trials);
}

export function calculateMaximumLogLikelihood(
  heads = BASE_DATA.heads,
  tails = BASE_DATA.tails,
) {
  const mle = calculateMle(heads, tails);
  return mle === null ? 0 : calculateLogLikelihood(mle, heads, tails);
}

export function calculateRelativeScores(
  p,
  heads = BASE_DATA.heads,
  tails = BASE_DATA.tails,
) {
  const mle = calculateMle(heads, tails);

  if (mle === null) {
    return {
      relativeLikelihood: 1,
      relativeFromLog: 1,
    };
  }

  const logLikelihood = calculateLogLikelihood(p, heads, tails);

  if (!Number.isFinite(logLikelihood)) {
    return {
      relativeLikelihood: 0,
      relativeFromLog: 0,
    };
  }

  const maximumLogLikelihood = calculateMaximumLogLikelihood(heads, tails);
  const logDifference = logLikelihood - maximumLogLikelihood;
  const relativeScore =
    Math.abs(logDifference) <= RELATIVE_SCORE_TOLERANCE
      ? 1
      : clamp(Math.exp(Math.min(0, logDifference)), 0, 1);

  return {
    relativeLikelihood: relativeScore,
    relativeFromLog: relativeScore,
  };
}

export function generateLikelihoodCurve(sampleCount = 201) {
  return Array.from({ length: sampleCount }, (_, index) => {
    const p = index / (sampleCount - 1);
    return {
      p: normalizeNumber(p),
      value: calculateLikelihood(p),
    };
  });
}

export function generateLogLikelihoodCurve(sampleCount = 201) {
  const span = 1 - 2 * LOG_CURVE_EPSILON;

  return Array.from({ length: sampleCount }, (_, index) => {
    const p = LOG_CURVE_EPSILON + (span * index) / (sampleCount - 1);
    return {
      p: normalizeNumber(p),
      value: calculateLogLikelihood(p),
    };
  });
}

export function generateRelativeComparisonCurve(sampleCount = 201) {
  return Array.from({ length: sampleCount }, (_, index) => {
    const p = index / (sampleCount - 1);
    const relativeScores = calculateRelativeScores(p);

    return {
      p: normalizeNumber(p),
      ...relativeScores,
    };
  });
}

export function getSafeLogChartValue(logLikelihood) {
  return Number.isFinite(logLikelihood)
    ? logLikelihood
    : LOG_CHART_MINIMUM;
}

export function formatProbability(value) {
  return normalizeProbability(value).toFixed(2);
}

export function formatPercent(value) {
  return `${normalizeNumber(clamp(value, 0, 1) * 100, 2)}%`;
}

export function formatLikelihood(value) {
  if (value === 0) {
    return '0';
  }

  const normalized = normalizeNumber(value);

  if (Math.abs(normalized) < 0.0001) {
    return normalized.toExponential(3);
  }

  return normalized.toLocaleString('ko-KR', {
    maximumFractionDigits: 8,
  });
}

export function formatLogLikelihood(value) {
  if (value === Number.NEGATIVE_INFINITY) {
    return '−∞';
  }

  return normalizeNumber(value, 4).toFixed(4);
}

export function formatChartValue(value, metric) {
  return metric === 'likelihood'
    ? formatLikelihood(value)
    : formatLogLikelihood(value);
}

export function formatRelativeScore(value) {
  return clamp(normalizeNumber(value, 4), 0, 1).toFixed(4);
}

export function formatScientificOrder(log10Likelihood) {
  if (log10Likelihood === Number.NEGATIVE_INFINITY) {
    return '0 (불가능한 데이터)';
  }

  return `약 10^${Math.floor(log10Likelihood)} 규모`;
}

export function getInterpretationState(p) {
  const normalizedP = normalizeProbability(p);
  const formattedP = formatProbability(normalizedP);
  const distance = Math.abs(normalizedP - MLE_P);

  if (distance <= SLIDER_PRECISION / 2) {
    return {
      key: 'maximum',
      text: `현재 p=${formattedP}에서 가능도와 로그가능도가 모두 최대가 됩니다. 이 값이 최대가능도추정값입니다.`,
    };
  }

  if (distance <= 0.05 + Number.EPSILON) {
    return {
      key: 'near',
      text: `현재 p=${formattedP}는 관측된 앞면 비율 0.70과 가깝습니다. 가능도와 로그가능도 모두 최대점에 가까워지고 있습니다.`,
    };
  }

  return {
    key: 'far',
    text: `현재 가정한 p=${formattedP}는 관측된 앞면 비율 0.70과 차이가 있습니다. 따라서 이 데이터의 가능도가 낮아집니다.`,
  };
}

export function calculateStabilityState(p, sampleSize) {
  const heads = sampleSize * MLE_P;
  const tails = sampleSize - heads;
  const logLikelihood = calculateLogLikelihood(p, heads, tails);
  const log10Likelihood = Number.isFinite(logLikelihood)
    ? normalizeNumber(logLikelihood / Math.log(10))
    : Number.NEGATIVE_INFINITY;
  const wouldUnderflow =
    logLikelihood === Number.NEGATIVE_INFINITY ||
    logLikelihood < LOG_MIN_POSITIVE_NUMBER;

  return {
    sampleSize,
    heads,
    tails,
    logLikelihood,
    log10Likelihood,
    likelihoodOrder: formatScientificOrder(log10Likelihood),
    wouldUnderflow,
  };
}
