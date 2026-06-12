import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceDot,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import MathFormula from '../../components/common/MathFormula.jsx';
import useEmbedMode from '../../hooks/useEmbedMode.js';
import {
  BASE_DATA,
  INITIAL_P,
  LOG_CHART_MINIMUM,
  MLE_P,
  STABILITY_SAMPLE_SIZES,
  calculateLikelihood,
  calculateLogLikelihood,
  calculateRelativeScores,
  calculateStabilityState,
  formatChartValue,
  formatLikelihood,
  formatLogLikelihood,
  formatPercent,
  formatProbability,
  formatRelativeScore,
  generateLikelihoodCurve,
  generateLogLikelihoodCurve,
  generateRelativeComparisonCurve,
  getInterpretationState,
  getSafeLogChartValue,
  normalizeProbability,
} from './likelihoodModel.js';

import styles from './LikelihoodMlePage.module.css';

const STAGES = ['likelihood', 'log-likelihood', 'mle'];
const STAGE_CONTENT = {
  likelihood: {
    title: '1단계 · 가능도 보기',
    button: '로그가능도로 바꿔 보기',
  },
  'log-likelihood': {
    title: '2단계 · 로그가능도 보기',
    button: '최대가능도추정 확인하기',
  },
  mle: {
    title: '3단계 · 최대가능도추정 확인',
    button: '처음부터 다시 보기',
  },
};

const observations = [
  ...Array.from({ length: BASE_DATA.heads }, (_, index) => ({
    id: `head-${index}`,
    kind: 'head',
    label: '앞',
  })),
  ...Array.from({ length: BASE_DATA.tails }, (_, index) => ({
    id: `tail-${index}`,
    kind: 'tail',
    label: '뒤',
  })),
];

const likelihoodFormula = String.raw`L(p) = p^7(1-p)^3`;
const logLikelihoodFormula = String.raw`\ell(p) = 7\log p + 3\log(1-p)`;
const mleFormula = String.raw`\hat p_{\mathrm{MLE}} = \frac{7}{10} = 0.7`;
const relativeComparisonFormula = String.raw`
  \frac{L(p)}{L(\hat p_{\mathrm{MLE}})}
  =
  \exp\left(\ell(p)-\ell(\hat p_{\mathrm{MLE}})\right)
`;

function updateProbability(setValue, rawValue) {
  if (rawValue === '') {
    return;
  }

  const numericValue = Number(rawValue);

  if (Number.isFinite(numericValue)) {
    setValue(normalizeProbability(numericValue));
  }
}

function ProbabilityControl({ p, onChange }) {
  return (
    <div className={styles['probability-control']}>
      <div className={styles['control-heading']}>
        <label htmlFor="assumed-probability">가정한 앞면 확률 p</label>
        <output htmlFor="assumed-probability exact-probability">
          현재 값: p = {formatProbability(p)}
        </output>
      </div>

      <input
        id="assumed-probability"
        type="range"
        min="0"
        max="1"
        step="0.01"
        value={p}
        aria-valuetext={`p = ${formatProbability(p)}`}
        onChange={(event) => updateProbability(onChange, event.target.value)}
      />

      <div className={styles['probability-details']}>
        <span>앞면 확률: {formatPercent(p)}</span>
        <span>뒷면 확률: {formatPercent(1 - p)}</span>
        <label htmlFor="exact-probability">정확한 p 값</label>
        <input
          id="exact-probability"
          type="number"
          min="0"
          max="1"
          step="0.01"
          value={p}
          onChange={(event) => updateProbability(onChange, event.target.value)}
        />
      </div>
    </div>
  );
}

function ObservationTokens() {
  return (
    <>
      <p className={styles['observation-summary']}>
        총 10회 관측: 앞면 7회, 뒷면 3회, 관측된 앞면 비율 0.70
      </p>
      <div
        className={styles['coin-grid']}
        aria-label="관측 순서 예시: 앞면 7개와 뒷면 3개"
        role="img"
      >
        {observations.map((observation) => (
          <span
            className={`${styles.coin} ${styles[`coin--${observation.kind}`]}`}
            key={observation.id}
            aria-hidden="true"
          >
            {observation.label}
          </span>
        ))}
      </div>
    </>
  );
}

function EvaluationChart({
  metric,
  p,
  currentValue,
  curve,
  revealMle = false,
  compact = false,
}) {
  const isLikelihood = metric === 'likelihood';
  const title = isLikelihood ? '가능도 그래프' : '로그가능도 그래프';
  const expression = isLikelihood ? 'L(p)' : 'ℓ(p)';
  const safeCurrentValue = isLikelihood
    ? currentValue
    : getSafeLogChartValue(currentValue);
  const maximumValue = isLikelihood
    ? calculateLikelihood(MLE_P)
    : calculateLogLikelihood(MLE_P);
  const currentDescription = Number.isFinite(currentValue)
    ? formatChartValue(currentValue, metric)
    : '−∞이며, 점은 세로축 아래 경계에 표시';
  const summary = revealMle
    ? `${title}. 현재 p=${formatProbability(p)}에서 ${expression}=${currentDescription}입니다. 최대점은 p=0.70에 있습니다.`
    : `${title}. 현재 p=${formatProbability(p)}에서 ${expression}=${currentDescription}입니다. 최대 위치는 아직 표시하지 않습니다.`;

  return (
    <section
      className={`${styles['chart-card']} ${compact ? styles['chart-card--compact'] : ''}`}
      aria-labelledby={`${metric}-chart-title`}
    >
      <div className={styles['chart-heading']}>
        <div>
          <p className={styles.kicker}>
            {isLikelihood ? '확률의 곱으로 평가' : '로그값의 합으로 평가'}
          </p>
          <h2 id={`${metric}-chart-title`}>{title}</h2>
        </div>
        <div className={styles['current-evaluation']}>
          <span>현재 {expression}</span>
          <strong>{formatChartValue(currentValue, metric)}</strong>
        </div>
      </div>

      <p className={styles['chart-summary']}>{summary}</p>

      <div className={styles['chart-canvas']} aria-hidden="true">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curve}
            margin={{ top: 25, right: 24, bottom: 22, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="p"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value) => Number(value).toFixed(2)}
              label={{
                value: '가정한 앞면 확률 p',
                position: 'insideBottom',
                offset: -14,
              }}
            />
            <YAxis
              domain={isLikelihood ? [0, 'auto'] : [LOG_CHART_MINIMUM, -5]}
              tickFormatter={(value) =>
                isLikelihood
                  ? Number(value).toExponential(1)
                  : Number(value).toFixed(0)
              }
              width={58}
            />
            <Tooltip
              formatter={(value) => [
                formatChartValue(Number(value), metric),
                expression,
              ]}
              labelFormatter={(value) => `p = ${Number(value).toFixed(3)}`}
            />
            <ReferenceLine
              x={p}
              stroke="#245fc4"
              strokeDasharray="6 4"
              strokeWidth={2}
            />
            {revealMle && (
              <ReferenceLine
                x={MLE_P}
                stroke="#b42318"
                strokeDasharray="3 3"
                strokeWidth={2}
                label={{
                  value: '최대 p=0.70',
                  position: 'insideTopRight',
                  fill: '#9b1c13',
                  fontSize: 12,
                }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={isLikelihood ? '#3977e8' : '#7c3aed'}
              strokeWidth={3}
              dot={false}
              isAnimationActive
              animationDuration={320}
            />
            <ReferenceDot
              x={p}
              y={safeCurrentValue}
              r={6}
              fill="#ffffff"
              stroke="#245fc4"
              strokeWidth={3}
            />
            {revealMle && (
              <ReferenceDot
                x={MLE_P}
                y={maximumValue}
                r={7}
                fill="#fff1f0"
                stroke="#b42318"
                strokeWidth={3}
              />
            )}
          </LineChart>
        </ResponsiveContainer>
      </div>

      {!Number.isFinite(currentValue) && (
        <p className={styles['boundary-note']}>
          p={formatProbability(p)}에서는 관측 데이터가 불가능하므로
          로그가능도는 −∞입니다. 그래프의 점은 이를 나타내기 위해 아래 경계에
          표시했습니다.
        </p>
      )}
    </section>
  );
}

function RelativeComparisonChart({
  p,
  likelihood,
  logLikelihood,
  relativeScores,
  curve,
}) {
  const currentRelativeScore = relativeScores.relativeFromLog;

  return (
    <section
      className={styles['chart-card']}
      aria-labelledby="relative-comparison-chart-title"
    >
      <div className={styles['chart-heading']}>
        <div>
          <p className={styles.kicker}>같은 기준으로 비교</p>
          <h2 id="relative-comparison-chart-title">
            최대값 대비 상대 적합도
          </h2>
        </div>
        <div className={styles['current-evaluation']}>
          <span>현재 상대 적합도</span>
          <strong>{formatRelativeScore(currentRelativeScore)}</strong>
        </div>
      </div>

      <p className={styles['relative-explanation']}>
        가능도를 최대값으로 나눈 결과와, 로그가능도의 차이를 다시 지수화한
        결과는 같습니다. 두 표현은 p=0.70에서 함께 최대가 됩니다.
      </p>
      <MathFormula
        formula={relativeComparisonFormula}
        className={styles['relative-equation']}
      />
      <p className={styles['chart-summary']}>
        두 상대 곡선은 모든 p에서 일치합니다. 현재 p=
        {formatProbability(p)}의 상대 적합도는{' '}
        {formatRelativeScore(currentRelativeScore)}이고, 두 곡선의 공통
        최대점은 p=0.70에서 1입니다.
      </p>

      <div className={styles['relative-legend']} aria-label="상대 적합도 그래프 범례">
        <span>
          <i className={styles['legend-solid']} aria-hidden="true" />
          가능도 기준 상대값 · 굵은 실선
        </span>
        <span>
          <i className={styles['legend-dashed']} aria-hidden="true" />
          로그가능도 기준 상대값 · 가는 점선
        </span>
        <strong>두 선은 같은 위치에서 겹칩니다.</strong>
      </div>

      <div
        className={`${styles['chart-canvas']} ${styles['relative-chart-canvas']}`}
        aria-hidden="true"
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart
            data={curve}
            margin={{ top: 32, right: 24, bottom: 22, left: 4 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="p"
              type="number"
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value) => Number(value).toFixed(2)}
              label={{
                value: '가정한 앞면 확률 p',
                position: 'insideBottom',
                offset: -14,
              }}
            />
            <YAxis
              domain={[0, 1]}
              ticks={[0, 0.25, 0.5, 0.75, 1]}
              tickFormatter={(value) => Number(value).toFixed(2)}
              width={58}
              label={{
                value: '최대값 대비 상대 적합도',
                angle: -90,
                position: 'insideLeft',
              }}
            />
            <Tooltip
              formatter={(value, name) => [
                formatRelativeScore(Number(value)),
                name,
              ]}
              labelFormatter={(value) => `p = ${Number(value).toFixed(3)}`}
            />
            <ReferenceLine
              x={p}
              stroke="#245fc4"
              strokeDasharray="6 4"
              strokeWidth={2}
            />
            <ReferenceLine
              x={MLE_P}
              stroke="#b42318"
              strokeDasharray="3 3"
              strokeWidth={2}
              label={{
                value: '두 표현 공통 최대 p=0.70',
                position: 'insideTopRight',
                fill: '#9b1c13',
                fontSize: 12,
              }}
            />
            <Line
              type="monotone"
              dataKey="relativeLikelihood"
              name="가능도 기준 상대값"
              stroke="#9bbcf5"
              strokeWidth={7}
              dot={false}
              isAnimationActive
              animationDuration={320}
            />
            <Line
              type="monotone"
              dataKey="relativeFromLog"
              name="로그가능도 기준 상대값"
              stroke="#5b21b6"
              strokeDasharray="7 5"
              strokeWidth={2.5}
              dot={false}
              isAnimationActive
              animationDuration={320}
            />
            <ReferenceDot
              x={p}
              y={currentRelativeScore}
              r={6}
              fill="#ffffff"
              stroke="#245fc4"
              strokeWidth={3}
            />
            <ReferenceDot
              x={MLE_P}
              y={1}
              r={7}
              fill="#fff1f0"
              stroke="#b42318"
              strokeWidth={3}
              label={{
                value: '공통 최대점',
                position: 'top',
                fill: '#9b1c13',
                fontSize: 12,
              }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <p className={styles['raw-values-label']}>
        정규화하지 않은 원래 척도의 현재 평가값
      </p>
      <dl className={styles['stage-three-raw-values']}>
        <div>
          <dt>현재 가능도 L(p)</dt>
          <dd>{formatLikelihood(likelihood)}</dd>
        </div>
        <div>
          <dt>현재 로그가능도 ℓ(p)</dt>
          <dd>{formatLogLikelihood(logLikelihood)}</dd>
        </div>
      </dl>
    </section>
  );
}

function StageTwoComparison({ p, likelihood, logLikelihood }) {
  return (
    <div className={styles['comparison-wrap']}>
      <table className={styles['comparison-table']}>
        <caption>같은 현재 파라미터를 평가하는 두 표현 비교</caption>
        <thead>
          <tr>
            <th scope="col">표현</th>
            <th scope="col">현재 파라미터</th>
            <th scope="col">계산 방식</th>
            <th scope="col">현재 평가값</th>
            <th scope="col">최대가 되는 위치</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <th scope="row">가능도</th>
            <td>p = {formatProbability(p)}</td>
            <td>확률의 곱</td>
            <td>{formatLikelihood(likelihood)}</td>
            <td>아직 공개하지 않음</td>
          </tr>
          <tr>
            <th scope="row">로그가능도</th>
            <td>p = {formatProbability(p)}</td>
            <td>로그값의 합</td>
            <td>{formatLogLikelihood(logLikelihood)}</td>
            <td>아직 공개하지 않음</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

function CalculationPanel({ stage, p, likelihood, logLikelihood }) {
  const q = 1 - p;
  const formattedP = formatProbability(p);
  const formattedQ = formatProbability(q);

  if (stage === 'likelihood') {
    return (
      <section
        className={`${styles.panel} ${styles.calculation}`}
        aria-labelledby="calculation-heading"
      >
        <div className={styles['section-heading']}>
          <p className={styles.kicker}>현재 파라미터 평가</p>
          <h2 id="calculation-heading">가능도 계산</h2>
        </div>
        <MathFormula formula={likelihoodFormula} className={styles.formula} />
        <MathFormula
          formula={String.raw`L(${formattedP}) = ${formattedP}^{7}\times ${formattedQ}^{3} = \text{${formatLikelihood(likelihood)}}`}
          className={styles['substituted-formula']}
        />
        <div className={styles['product-groups']}>
          <div>
            <strong>앞면 7회의 확률</strong>
            <span>p × p × ··· × p</span>
            <small>7번</small>
          </div>
          <div>
            <strong>뒷면 3회의 확률</strong>
            <span>(1-p) × ··· × (1-p)</span>
            <small>3번</small>
          </div>
        </div>
      </section>
    );
  }

  if (stage === 'log-likelihood') {
    return (
      <section
        className={`${styles.panel} ${styles.calculation}`}
        aria-labelledby="calculation-heading"
      >
        <div className={styles['section-heading']}>
          <p className={styles.kicker}>같은 평가의 다른 표현</p>
          <h2 id="calculation-heading">로그가능도 계산</h2>
        </div>
        <MathFormula formula={logLikelihoodFormula} className={styles.formula} />
        <MathFormula
          formula={String.raw`\ell(${formattedP}) = 7\ln(${formattedP}) + 3\ln(${formattedQ}) = ${Number.isFinite(logLikelihood) ? formatLogLikelihood(logLikelihood) : String.raw`-\infty`}`}
          className={styles['substituted-formula']}
        />
        <div
          className={styles.transformation}
          aria-label="확률의 곱에 로그를 취하면 로그값의 합이 됩니다."
        >
          <strong>확률의 곱</strong>
          <span aria-hidden="true">↓ log</span>
          <strong>로그값의 합</strong>
        </div>
        <p className={styles['core-note']}>
          로그는 증가함수이므로 가능도의 순서를 바꾸지 않습니다.
        </p>
      </section>
    );
  }

  return (
    <section
      className={`${styles.panel} ${styles.calculation}`}
      aria-labelledby="calculation-heading"
    >
      <div className={styles['section-heading']}>
        <p className={styles.kicker}>동일한 최대 위치</p>
        <h2 id="calculation-heading">두 표현과 MLE</h2>
      </div>
      <div className={styles['compact-formulas']}>
        <MathFormula formula={likelihoodFormula} className={styles.formula} />
        <MathFormula formula={logLikelihoodFormula} className={styles.formula} />
        <MathFormula formula={mleFormula} className={styles['mle-formula']} />
      </div>
      <dl className={styles['maximum-list']}>
        <div>
          <dt>가능도의 최대 위치</dt>
          <dd>p = 0.70</dd>
        </div>
        <div>
          <dt>로그가능도의 최대 위치</dt>
          <dd>p = 0.70</dd>
        </div>
        <div>
          <dt>최대가능도추정값</dt>
          <dd>p_hat = 0.70</dd>
        </div>
      </dl>
    </section>
  );
}

function InterpretationPanel({ stage, interpretation }) {
  return (
    <section
      className={`${styles.panel} ${styles.interpretation} ${styles[`interpretation--${interpretation.key}`]}`}
      aria-labelledby="interpretation-heading"
    >
      <div className={styles['section-heading']}>
        <p className={styles.kicker}>현재 해석</p>
        <h2 id="interpretation-heading">파라미터의 설명력</h2>
      </div>
      <p aria-live="polite" aria-atomic="true">
        {interpretation.text}
      </p>
      {stage !== 'likelihood' && (
        <p>
          로그를 취해 숫자의 크기와 세로축은 달라졌지만, 가장 좋은 파라미터는
          바뀌지 않습니다.
        </p>
      )}
      {stage === 'log-likelihood' && (
        <p>
          그래프의 모양과 숫자 범위는 달라졌지만, 파라미터의 우열은 바뀌지
          않았습니다.
        </p>
      )}
      {stage === 'mle' && (
        <div className={styles.conclusion}>
          <strong>
            최대가능도추정은 관측 데이터를 가장 잘 설명하는 파라미터를
            찾습니다.
          </strong>
          <p>
            로그가능도는 다른 추정 기준이 아닙니다. 같은 가능도 문제를 더
            편리하고 수치적으로 안정적인 형태로 표현한 것입니다.
          </p>
        </div>
      )}
    </section>
  );
}

function StabilityPanel({ p, isOpen, onToggle }) {
  const [sampleSizeIndex, setSampleSizeIndex] = useState(0);
  const sampleSize = STABILITY_SAMPLE_SIZES[sampleSizeIndex];
  const stability = calculateStabilityState(p, sampleSize);

  return (
    <section className={`${styles.panel} ${styles.stability}`}>
      <button
        className={styles['stability-toggle']}
        type="button"
        aria-expanded={isOpen}
        aria-controls="stability-content"
        onClick={onToggle}
      >
        <span>
          <small>선택 학습</small>
          <strong>계산 안정성 살펴보기</strong>
        </span>
        <span aria-hidden="true">{isOpen ? '접기 ↑' : '펼치기 ↓'}</span>
      </button>

      {isOpen && (
        <div id="stability-content" className={styles['stability-content']}>
          <p>
            관측값이 많아질수록 확률을 계속 곱한 가능도는 지나치게 작아집니다.
            로그가능도는 곱셈을 덧셈으로 바꾸어 더 안정적으로 계산할 수
            있습니다.
          </p>
          <p className={styles['stability-caution']}>
            로그 변환이 모든 수치 문제를 완전히 없애는 것은 아니지만, 매우
            작은 확률의 직접 곱셈을 피하게 해 줍니다.
          </p>

          <div className={styles['sample-size-control']}>
            <div>
              <label htmlFor="stability-sample-size">관측값 수</label>
              <output htmlFor="stability-sample-size">
                n = {sampleSize.toLocaleString('ko-KR')}
              </output>
            </div>
            <input
              id="stability-sample-size"
              type="range"
              min="0"
              max={STABILITY_SAMPLE_SIZES.length - 1}
              step="1"
              value={sampleSizeIndex}
              aria-valuetext={`관측값 ${sampleSize}개`}
              onChange={(event) =>
                setSampleSizeIndex(Number(event.target.value))
              }
            />
            <div className={styles['sample-size-labels']} aria-hidden="true">
              {STABILITY_SAMPLE_SIZES.map((size) => (
                <span key={size}>{size.toLocaleString('ko-KR')}</span>
              ))}
            </div>
          </div>

          <dl className={styles['stability-results']}>
            <div>
              <dt>같은 앞면 비율</dt>
              <dd>
                앞면 {stability.heads.toLocaleString('ko-KR')} · 뒷면{' '}
                {stability.tails.toLocaleString('ko-KR')}
              </dd>
            </div>
            <div>
              <dt>큰 데이터 로그가능도</dt>
              <dd>{formatLogLikelihood(stability.logLikelihood)}</dd>
            </div>
            <div>
              <dt>가능도의 근사 크기</dt>
              <dd>{stability.likelihoodOrder}</dd>
            </div>
            <div>
              <dt>직접 부동소수점 곱셈</dt>
              <dd>{stability.wouldUnderflow ? '언더플로 가능' : '표현 가능'}</dd>
            </div>
          </dl>
          <p className={styles['log-space-note']}>
            직접 거듭제곱을 계산하지 않고 log L을 먼저 구한 뒤, log10 L = log
            L / ln(10)으로 가능도의 크기를 추정했습니다. 현재 가정은 p ={' '}
            {formatProbability(p)}입니다.
          </p>
        </div>
      )}
    </section>
  );
}

export default function LikelihoodMlePage() {
  const isEmbedMode = useEmbedMode();
  const [p, setP] = useState(INITIAL_P);
  const [stage, setStage] = useState('likelihood');
  const [isStabilityOpen, setIsStabilityOpen] = useState(false);
  const likelihoodCurve = useMemo(() => generateLikelihoodCurve(), []);
  const logLikelihoodCurve = useMemo(() => generateLogLikelihoodCurve(), []);
  const relativeComparisonCurve = useMemo(
    () => generateRelativeComparisonCurve(),
    [],
  );
  const likelihood = calculateLikelihood(p);
  const logLikelihood = calculateLogLikelihood(p);
  const relativeScores = calculateRelativeScores(p);
  const interpretation = getInterpretationState(p);
  const stageContent = STAGE_CONTENT[stage];

  function advanceStage() {
    const currentIndex = STAGES.indexOf(stage);
    setStage(STAGES[(currentIndex + 1) % STAGES.length]);
  }

  function resetWidget() {
    setP(INITIAL_P);
    setStage('likelihood');
    setIsStabilityOpen(false);
  }

  return (
    <main
      className={
        isEmbedMode
          ? `${styles.page} ${styles['page--embed']}`
          : styles.page
      }
    >
      {!isEmbedMode && (
        <div className={styles.topbar}>
          <Link className={styles['home-link']} to="/">
            ← 전체 위젯
          </Link>
        </div>
      )}

      <article className={styles.widget}>
        <header className={styles.header}>
          <div className={styles.introduction}>
            <p className={styles.eyebrow}>통계 · 베르누이 모형</p>
            <h1>가능도·로그가능도·최대가능도추정 탐색기</h1>
            <p>
              같은 파라미터 p를 가능도와 로그가능도로 평가하고, 두 표현이
              동일한 최대점을 갖는 과정을 단계별로 확인합니다.
            </p>
          </div>
          <div className={styles['stage-control']}>
            <span>{stageContent.title}</span>
            <button type="button" onClick={advanceStage}>
              {stageContent.button}
            </button>
          </div>
        </header>

        <div className={styles.workspace}>
          <section
            className={`${styles.panel} ${styles.controls}`}
            aria-labelledby="observed-data-heading"
          >
            <div className={styles['controls-title']}>
              <div className={styles['section-heading']}>
                <p className={styles.kicker}>고정된 관측 데이터</p>
                <h2 id="observed-data-heading">동전 던지기 10회</h2>
              </div>
              <button type="button" onClick={resetWidget}>
                초기화
              </button>
            </div>
            <ObservationTokens />
            <dl className={styles['observed-values']}>
              <div>
                <dt>앞면</dt>
                <dd>7회</dd>
              </div>
              <div>
                <dt>뒷면</dt>
                <dd>3회</dd>
              </div>
              <div>
                <dt>관측 앞면 비율</dt>
                <dd>0.70</dd>
              </div>
            </dl>
            <ProbabilityControl p={p} onChange={setP} />
          </section>

          <div className={styles.graph}>
            {stage === 'mle' ? (
              <RelativeComparisonChart
                p={p}
                likelihood={likelihood}
                logLikelihood={logLikelihood}
                relativeScores={relativeScores}
                curve={relativeComparisonCurve}
              />
            ) : (
              <EvaluationChart
                metric={stage}
                p={p}
                currentValue={
                  stage === 'likelihood' ? likelihood : logLikelihood
                }
                curve={
                  stage === 'likelihood'
                    ? likelihoodCurve
                    : logLikelihoodCurve
                }
              />
            )}
            {stage === 'log-likelihood' && (
              <StageTwoComparison
                p={p}
                likelihood={likelihood}
                logLikelihood={logLikelihood}
              />
            )}
          </div>

          <CalculationPanel
            stage={stage}
            p={p}
            likelihood={likelihood}
            logLikelihood={logLikelihood}
          />
          <InterpretationPanel
            stage={stage}
            interpretation={interpretation}
          />
          <StabilityPanel
            p={p}
            isOpen={isStabilityOpen}
            onToggle={() => setIsStabilityOpen((current) => !current)}
          />
        </div>
      </article>
    </main>
  );
}
