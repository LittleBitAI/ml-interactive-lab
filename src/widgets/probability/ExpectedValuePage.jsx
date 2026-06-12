import { useMemo, useState } from 'react';
import { Link } from 'react-router';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import MathFormula from '../../components/common/MathFormula.jsx';
import useEmbedMode from '../../hooks/useEmbedMode.js';
import {
  INITIAL_EXPECTED_VALUE_VALUES,
  MAX_TRIALS,
  calculateExpectedValue,
  clamp,
  createOutcomeScale,
  createRunningAverage,
  downsampleChartPoints,
  formatNumber,
  formatPercent,
  formatProbability,
  generateOutcomeSequence,
} from './expectedValueModel.js';

import styles from './ExpectedValuePage.module.css';

const expectedValueFormula = String.raw`
  E[X] = x_A P(A) + x_B P(B)
`;

function updateNumericValue(
  setValue,
  rawValue,
  minimum,
  maximum,
  step,
  integer,
) {
  if (rawValue === '') {
    return;
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return;
  }

  const stepText = String(step);
  const fractionDigits = stepText.includes('.')
    ? stepText.split('.')[1].length
    : 0;
  const normalizedValue = integer
    ? Math.round(numericValue)
    : Number(numericValue.toFixed(fractionDigits));
  setValue(clamp(normalizedValue, minimum, maximum));
}

function NumericControl({
  id,
  label,
  value,
  formattedValue,
  minimum,
  maximum,
  step,
  integer = false,
  onChange,
}) {
  return (
    <div className={styles['numeric-control']}>
      <div className={styles['numeric-control__heading']}>
        <label htmlFor={`${id}-range`}>{label}</label>
        <output htmlFor={`${id}-range ${id}-number`}>
          {formattedValue}
        </output>
      </div>

      <input
        id={`${id}-range`}
        type="range"
        min={minimum}
        max={maximum}
        step={step}
        value={value}
        aria-valuemin={minimum}
        aria-valuemax={maximum}
        aria-valuenow={value}
        aria-valuetext={formattedValue}
        onChange={(event) =>
          updateNumericValue(
            onChange,
            event.target.value,
            minimum,
            maximum,
            step,
            integer,
          )
        }
      />

      <div className={styles['numeric-control__exact']}>
        <label htmlFor={`${id}-number`}>정확한 값</label>
        <input
          id={`${id}-number`}
          type="number"
          min={minimum}
          max={maximum}
          step={step}
          defaultValue={value}
          key={`${id}-${value}`}
          onChange={(event) =>
            updateNumericValue(
              onChange,
              event.target.value,
              minimum,
              maximum,
              step,
              integer,
            )
          }
        />
      </div>
    </div>
  );
}

function ProbabilityBar({ probabilityA, probabilityB }) {
  return (
    <div className={styles['probability-visual']}>
      <div className={styles['probability-labels']}>
        <span>
          <b>A</b>
          <strong>{formatPercent(probabilityA)}</strong>
        </span>
        <span>
          <b>B</b>
          <strong>{formatPercent(probabilityB)}</strong>
        </span>
      </div>

      <div
        className={styles['probability-bar']}
        role="img"
        aria-label={`확률 막대: A ${formatPercent(probabilityA)}, B ${formatPercent(probabilityB)}, 합계 100%`}
      >
        <span
          className={`${styles['probability-bar__segment']} ${styles['probability-bar__segment--a']}`}
          style={{ width: `${probabilityA * 100}%` }}
        />
        <span
          className={`${styles['probability-bar__segment']} ${styles['probability-bar__segment--b']}`}
          style={{ width: `${probabilityB * 100}%` }}
        />
      </div>

      <p className={styles['probability-summary']}>
        P(B) = 1 - P(A) = {formatProbability(probabilityB)}이며, 두 구간의
        합은 항상 100%입니다.
      </p>
    </div>
  );
}

function OutcomeScale({
  outcomeA,
  outcomeB,
  probabilityA,
  probabilityB,
  expectedValue,
  scale,
}) {
  const markerSizeA = 18 + probabilityA * 28;
  const markerSizeB = 18 + probabilityB * 28;

  return (
    <div
      className={styles['number-line']}
      role="img"
      aria-label={`결과 A ${formatNumber(outcomeA)}, 결과 B ${formatNumber(outcomeB)}, 기대값 ${formatNumber(expectedValue)}의 위치를 나타내는 수직선`}
    >
      <div className={styles['number-line__track']} />

      <div
        className={`${styles.marker} ${styles['marker--a']}`}
        style={{
          '--marker-position': `${scale.positionA}%`,
          '--marker-size': `${markerSizeA}px`,
        }}
      >
        <span className={styles['marker__dot']}>A</span>
        <span className={styles['marker__label']}>
          A = {formatNumber(outcomeA)}
          <small>P(A) {formatPercent(probabilityA)}</small>
        </span>
      </div>

      <div
        className={`${styles.marker} ${styles['marker--expected']}`}
        style={{ '--marker-position': `${scale.expectedPosition}%` }}
      >
        <span className={styles['marker__dot']}>E</span>
        <span className={styles['marker__label']}>
          기대값 = {formatNumber(expectedValue)}
        </span>
      </div>

      <div
        className={`${styles.marker} ${styles['marker--b']}`}
        style={{
          '--marker-position': `${scale.positionB}%`,
          '--marker-size': `${markerSizeB}px`,
        }}
      >
        <span className={styles['marker__dot']}>B</span>
        <span className={styles['marker__label']}>
          B = {formatNumber(outcomeB)}
          <small>P(B) {formatPercent(probabilityB)}</small>
        </span>
      </div>

      <span className={styles['number-line__minimum']}>
        {formatNumber(scale.domainMinimum)}
      </span>
      <span className={styles['number-line__maximum']}>
        {formatNumber(scale.domainMaximum)}
      </span>
    </div>
  );
}

export default function ExpectedValuePage() {
  const isEmbedMode = useEmbedMode();
  const [outcomeA, setOutcomeA] = useState(
    INITIAL_EXPECTED_VALUE_VALUES.outcomeA,
  );
  const [outcomeB, setOutcomeB] = useState(
    INITIAL_EXPECTED_VALUE_VALUES.outcomeB,
  );
  const [probabilityA, setProbabilityA] = useState(
    INITIAL_EXPECTED_VALUE_VALUES.probabilityA,
  );
  const [trialCount, setTrialCount] = useState(
    INITIAL_EXPECTED_VALUE_VALUES.trialCount,
  );
  const [sampleSeed, setSampleSeed] = useState(
    INITIAL_EXPECTED_VALUE_VALUES.sampleSeed,
  );

  const probabilityB = 1 - probabilityA;
  const expectedValue = calculateExpectedValue(
    outcomeA,
    outcomeB,
    probabilityA,
  );
  const scale = createOutcomeScale(outcomeA, outcomeB, expectedValue);

  const outcomeSequence = useMemo(
    () => generateOutcomeSequence(probabilityA, MAX_TRIALS, sampleSeed),
    [probabilityA, sampleSeed],
  );
  const simulation = useMemo(
    () =>
      createRunningAverage(outcomeSequence, outcomeA, outcomeB, trialCount),
    [outcomeSequence, outcomeA, outcomeB, trialCount],
  );
  const chartData = useMemo(
    () => downsampleChartPoints(simulation.points),
    [simulation.points],
  );

  function resetValues() {
    setOutcomeA(INITIAL_EXPECTED_VALUE_VALUES.outcomeA);
    setOutcomeB(INITIAL_EXPECTED_VALUE_VALUES.outcomeB);
    setProbabilityA(INITIAL_EXPECTED_VALUE_VALUES.probabilityA);
    setTrialCount(INITIAL_EXPECTED_VALUE_VALUES.trialCount);
    setSampleSeed(INITIAL_EXPECTED_VALUE_VALUES.sampleSeed);
  }

  function rerunSimulation() {
    setSampleSeed((currentSeed) => currentSeed + 1);
  }

  return (
    <main
      className={
        isEmbedMode
          ? `${styles['expected-value-page']} ${styles['expected-value-page--embed']}`
          : styles['expected-value-page']
      }
    >
      {!isEmbedMode && (
        <div className={styles['topbar']}>
          <Link className={styles['home-link']} to="/">
            ← 전체 위젯
          </Link>
        </div>
      )}

      <article className={styles.widget}>
        <header className={styles.header}>
          <div className={styles.introduction}>
            <p className={styles.eyebrow}>확률</p>
            <h1>기대값 직관 탐색기</h1>
            <p>
              두 결과의 값과 확률을 조절하며 기대값이 확률이 큰 결과 쪽으로
              이동하는 과정을 확인합니다.
            </p>
          </div>

          <div className={styles['formula-card']}>
            <MathFormula
              formula={expectedValueFormula}
              className={styles['main-formula']}
            />
            <p>기대값은 각 결과에 그 결과의 확률을 곱해 더한 가중평균입니다.</p>
          </div>
        </header>

        <div className={styles.body}>
          <section
            className={styles.controls}
            aria-labelledby="expected-value-controls"
          >
            <div className={styles['section-heading']}>
              <h2 id="expected-value-controls">값과 확률 조절</h2>
              <button type="button" onClick={resetValues}>
                초기화
              </button>
            </div>

            <NumericControl
              id="outcome-a"
              label="결과 A 값"
              value={outcomeA}
              formattedValue={formatNumber(outcomeA)}
              minimum={-100}
              maximum={100}
              step={1}
              integer
              onChange={setOutcomeA}
            />

            <NumericControl
              id="outcome-b"
              label="결과 B 값"
              value={outcomeB}
              formattedValue={formatNumber(outcomeB)}
              minimum={-100}
              maximum={100}
              step={1}
              integer
              onChange={setOutcomeB}
            />

            <NumericControl
              id="probability-a"
              label="결과 A의 확률 P(A)"
              value={probabilityA}
              formattedValue={`${formatProbability(probabilityA)} (${formatPercent(probabilityA)})`}
              minimum={0}
              maximum={1}
              step={0.01}
              onChange={setProbabilityA}
            />

            <NumericControl
              id="trial-count"
              label="반복 시행 횟수"
              value={trialCount}
              formattedValue={`${formatNumber(trialCount)}회`}
              minimum={1}
              maximum={MAX_TRIALS}
              step={1}
              integer
              onChange={setTrialCount}
            />

            <div className={styles['control-note']}>
              <strong>P(B) = {formatProbability(probabilityB)}</strong>
              <span>P(B)는 항상 1 - P(A)로 계산됩니다.</span>
            </div>
          </section>

          <div className={styles.results}>
            <section
              className={`${styles.panel} ${styles['outcome-panel']}`}
              aria-labelledby="outcome-scale-heading"
            >
              <div className={styles['panel-heading']}>
                <div>
                  <p className={styles['panel-kicker']}>가중평균의 위치</p>
                  <h2 id="outcome-scale-heading">결과 수직선</h2>
                </div>
                <div
                  className={styles['expected-value-result']}
                  aria-live="polite"
                  aria-atomic="true"
                >
                  <span>E[X]</span>
                  <strong>{formatNumber(expectedValue)}</strong>
                </div>
              </div>

              <OutcomeScale
                outcomeA={outcomeA}
                outcomeB={outcomeB}
                probabilityA={probabilityA}
                probabilityB={probabilityB}
                expectedValue={expectedValue}
                scale={scale}
              />

              <p className={styles.calculation}>
                E[X] = {formatNumber(outcomeA)} ×{' '}
                {formatProbability(probabilityA)} + {formatNumber(outcomeB)} ×{' '}
                {formatProbability(probabilityB)} ={' '}
                <strong>{formatNumber(expectedValue)}</strong>
              </p>
            </section>

            <div className={styles['summary-grid']}>
              <section
                className={styles.panel}
                aria-labelledby="probability-bar-heading"
              >
                <div className={styles['panel-heading']}>
                  <div>
                    <p className={styles['panel-kicker']}>전체 확률 100%</p>
                    <h2 id="probability-bar-heading">확률 구간</h2>
                  </div>
                </div>
                <ProbabilityBar
                  probabilityA={probabilityA}
                  probabilityB={probabilityB}
                />
              </section>

              <section
                className={styles.panel}
                aria-labelledby="interpretation-heading"
              >
                <div className={styles['panel-heading']}>
                  <div>
                    <p className={styles['panel-kicker']}>핵심 해석</p>
                    <h2 id="interpretation-heading">기대값의 의미</h2>
                  </div>
                </div>
                <ul className={styles['explanation-list']}>
                  <li>유효한 확률에서 기대값은 A와 B 사이에 놓입니다.</li>
                  <li>
                    기대값은 한 번의 시행에서 실제로 나오는 A나 B와 같지 않을
                    수 있습니다.
                  </li>
                  <li>
                    기대값은 반복 시행의 장기 평균이 접근하는 기준입니다. 시행
                    횟수가 늘면 경험적 평균은 일반적으로 더 안정됩니다.
                  </li>
                </ul>
              </section>
            </div>

            <section
              className={`${styles.panel} ${styles['simulation-panel']}`}
              aria-labelledby="simulation-heading"
            >
              <div className={styles['panel-heading']}>
                <div>
                  <p className={styles['panel-kicker']}>장기 평균 관찰</p>
                  <h2 id="simulation-heading">반복 시행과 수렴</h2>
                </div>
                <button type="button" onClick={rerunSimulation}>
                  다시 시행
                </button>
              </div>

              <div className={styles['simulation-stats']}>
                <div>
                  <span>관측 A</span>
                  <strong>{formatNumber(simulation.countA)}회</strong>
                </div>
                <div>
                  <span>관측 B</span>
                  <strong>{formatNumber(simulation.countB)}회</strong>
                </div>
                <div className={styles['simulation-stats__primary']}>
                  <span>경험적 평균</span>
                  <strong>{formatNumber(simulation.empiricalAverage)}</strong>
                </div>
              </div>

              <p className={styles['chart-summary']}>
                {formatNumber(trialCount)}회 시행의 누적 평균은{' '}
                {formatNumber(simulation.empiricalAverage)}이고, 이론적 기대값은{' '}
                {formatNumber(expectedValue)}입니다. 무작위 경로가 매번 단조롭게
                가까워지는 것은 아닙니다.
              </p>

              <div className={styles['chart-canvas']} aria-hidden="true">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={chartData}
                    margin={{ top: 24, right: 18, bottom: 8, left: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="trial"
                      type="number"
                      domain={[1, Math.max(2, trialCount)]}
                      tickCount={5}
                      allowDecimals={false}
                    />
                    <YAxis
                      domain={[scale.domainMinimum, scale.domainMaximum]}
                      tickFormatter={(value) => formatNumber(Number(value), 1)}
                      width={54}
                    />
                    <Tooltip
                      formatter={(value) => [
                        formatNumber(Number(value)),
                        '누적 평균',
                      ]}
                      labelFormatter={(value) => `${value}회 시행 후`}
                    />
                    <ReferenceLine
                      y={expectedValue}
                      stroke="#7c3aed"
                      strokeDasharray="6 4"
                      strokeWidth={2}
                      label={{
                        value: '이론적 기대값',
                        position: 'insideTopRight',
                        fill: '#6d28d9',
                        fontSize: 12,
                      }}
                    />
                    <Line
                      type="linear"
                      dataKey="average"
                      stroke="#1667d9"
                      strokeWidth={2.5}
                      dot={false}
                      isAnimationActive={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </section>
          </div>
        </div>
      </article>
    </main>
  );
}
