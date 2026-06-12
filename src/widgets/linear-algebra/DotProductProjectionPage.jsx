import { useState } from 'react';
import { Link } from 'react-router';

import MathFormula from '../../components/common/MathFormula.jsx';
import useEmbedMode from '../../hooks/useEmbedMode.js';
import {
  INITIAL_DOT_PRODUCT_VALUES,
  MAX_ABSOLUTE_DOT_PRODUCT,
  calculateDotProduct,
  calculateSignedScalarProjection,
  clamp,
  createSvgGeometry,
  formatValue,
  getDotProductSignState,
  getInterpretationState,
  normalizeValue,
  SVG_VIEW_BOX,
} from './dotProductModel.js';

import styles from './DotProductProjectionPage.module.css';

const dotProductFormula = String.raw`
  \mathbf{a}\mathbin{\cdot}\mathbf{b}
  = \lVert\mathbf{a}\rVert\lVert\mathbf{b}\rVert\cos(\theta)
`;

const projectionFormula = String.raw`
  \mathbf{a}\mathbin{\cdot}\mathbf{b}
  = \lVert\mathbf{a}\rVert
  \times \operatorname{comp}_{\mathbf{a}}(\mathbf{b})
`;

function updateNumericValue(setValue, rawValue, minimum, maximum, step) {
  if (rawValue === '') {
    return;
  }

  const numericValue = Number(rawValue);

  if (!Number.isFinite(numericValue)) {
    return;
  }

  const fractionDigits = String(step).includes('.')
    ? String(step).split('.')[1].length
    : 0;
  setValue(
    clamp(
      normalizeValue(numericValue, fractionDigits),
      minimum,
      maximum,
    ),
  );
}

function NumericControl({
  id,
  label,
  value,
  unit,
  minimum,
  maximum,
  step,
  onChange,
}) {
  const formattedValue = `${formatValue(value)}${unit}`;

  return (
    <div className={styles.control}>
      <div className={styles['control-heading']}>
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
        aria-valuetext={formattedValue}
        onChange={(event) =>
          updateNumericValue(
            onChange,
            event.target.value,
            minimum,
            maximum,
            step,
          )
        }
      />

      <div className={styles['exact-value']}>
        <label htmlFor={`${id}-number`}>정확한 값</label>
        <div className={styles['number-input-wrap']}>
          <input
            id={`${id}-number`}
            type="number"
            min={minimum}
            max={maximum}
            step={step}
            value={value}
            onChange={(event) =>
              updateNumericValue(
                onChange,
                event.target.value,
                minimum,
                maximum,
                step,
              )
            }
          />
          <span aria-hidden="true">{unit}</span>
        </div>
      </div>
    </div>
  );
}

function VectorDiagram({
  magnitudeA,
  magnitudeB,
  thetaDegrees,
  signedProjection,
  dotProduct,
  geometry,
}) {
  const projectionIsDefined = magnitudeA !== 0;
  const projectionLabel = projectionIsDefined
    ? `부호 있는 정사영 = ${formatValue(signedProjection)}`
    : `수평 참조축 성분 = ${formatValue(signedProjection)}`;
  const perpendicularLength = Math.abs(
    geometry.endpointB.y - geometry.projectionPoint.y,
  );
  const title = `벡터 a와 b의 내적 및 정사영 도식`;
  const description = projectionIsDefined
    ? `벡터 a의 크기는 ${formatValue(magnitudeA)}, 벡터 b의 크기는 ${formatValue(magnitudeB)}, 사이각은 ${formatValue(thetaDegrees)}도입니다. b의 부호 있는 정사영은 ${formatValue(signedProjection)}, 내적은 ${formatValue(dotProduct)}입니다.`
    : `벡터 a는 영벡터이고 벡터 b의 크기는 ${formatValue(magnitudeB)}입니다. 수평 참조축은 유지하지만 영벡터 a 방향으로의 정사영은 정의되지 않으며 내적은 0입니다.`;

  return (
    <svg
      className={styles.diagram}
      viewBox={SVG_VIEW_BOX}
      width="100%"
      role="img"
      aria-labelledby="dot-product-svg-title dot-product-svg-description"
    >
      <title id="dot-product-svg-title">{title}</title>
      <desc id="dot-product-svg-description">{description}</desc>

      <defs>
        <marker
          id="axis-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="8"
          markerHeight="8"
          orient="auto-start-reverse"
        >
          <path
            className={styles['axis-arrowhead']}
            d="M 0 0 L 10 5 L 0 10 z"
          />
        </marker>
        <marker
          id="vector-a-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <path
            className={styles['vector-a-arrowhead']}
            d="M 0 0 L 10 5 L 0 10 z"
          />
        </marker>
        <marker
          id="vector-b-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="10"
          markerHeight="10"
          orient="auto"
        >
          <path
            className={styles['vector-b-arrowhead']}
            d="M 0 0 L 10 5 L 0 10 z"
          />
        </marker>
      </defs>

      <g className={styles.axes} aria-hidden="true">
        <line x1="48" y1={geometry.origin.y} x2="592" y2={geometry.origin.y} />
        <line x1={geometry.origin.x} y1="365" x2={geometry.origin.x} y2="55" />
        <text x="586" y={geometry.origin.y - 12}>+x · a의 참조 방향</text>
        <text x={geometry.origin.x + 12} y="68">+y</text>
      </g>

      <line
        className={styles['projection-component']}
        x1={geometry.origin.x}
        y1={geometry.origin.y}
        x2={geometry.projectionPoint.x}
        y2={geometry.projectionPoint.y}
        aria-hidden="true"
      />
      <line
        className={styles.perpendicular}
        x1={geometry.endpointB.x}
        y1={geometry.endpointB.y}
        x2={geometry.projectionPoint.x}
        y2={geometry.projectionPoint.y}
        aria-hidden="true"
      />
      <text
        className={styles['perpendicular-label']}
        x={geometry.perpendicularLabelPoint.x}
        y={geometry.perpendicularLabelPoint.y}
        textAnchor={geometry.perpendicularLabelPoint.textAnchor}
      >
        {perpendicularLength < 8 ? '수선 길이 0' : '점선: 수선'}
      </text>

      <circle
        className={styles['projection-point']}
        cx={geometry.projectionPoint.x}
        cy={geometry.projectionPoint.y}
        r="6"
      />
      <text
        className={styles['projection-label']}
        x={geometry.projectionLabelPoint.x}
        y={geometry.projectionLabelPoint.y}
        textAnchor="middle"
      >
        {projectionLabel}
      </text>

      <path
        className={styles['angle-arc']}
        d={geometry.angleArcPath}
        aria-hidden="true"
      />
      <text
        className={styles['angle-label']}
        x={geometry.angleLabelPoint.x}
        y={geometry.angleLabelPoint.y}
        textAnchor="middle"
      >
        θ = {formatValue(thetaDegrees)}°
      </text>

      <line
        className={`${styles['vector-a']} ${magnitudeA === 0 ? styles['vector-zero'] : ''}`}
        x1={geometry.origin.x}
        y1={geometry.origin.y}
        x2={geometry.endpointA.x}
        y2={geometry.endpointA.y}
      />
      <line
        className={`${styles['vector-b']} ${magnitudeB === 0 ? styles['vector-zero'] : ''}`}
        x1={geometry.origin.x}
        y1={geometry.origin.y}
        x2={geometry.endpointB.x}
        y2={geometry.endpointB.y}
      />
      <circle
        className={styles.origin}
        cx={geometry.origin.x}
        cy={geometry.origin.y}
        r="6"
      />
      <text
        className={styles['vector-a-label']}
        x={geometry.labelA.x}
        y={geometry.labelA.y}
        textAnchor={geometry.labelA.textAnchor}
      >
        a |a|={formatValue(magnitudeA)}
      </text>
      <text
        className={styles['vector-b-label']}
        x={geometry.labelB.x}
        y={geometry.labelB.y}
        textAnchor={geometry.labelB.textAnchor}
      >
        b |b|={formatValue(magnitudeB)}
      </text>
    </svg>
  );
}

function DotProductBar({ dotProduct, signState }) {
  const barWidth = (Math.abs(dotProduct) / MAX_ABSOLUTE_DOT_PRODUCT) * 50;

  return (
    <div className={styles['dot-bar-card']}>
      <div className={styles['dot-bar-heading']}>
        <span>중앙 0 기준 내적 막대</span>
        <strong>{formatValue(dotProduct)} · {signState.shortLabel}</strong>
      </div>
      <div
        className={styles['dot-bar']}
        role="img"
        aria-label={`내적 ${formatValue(dotProduct)}, ${signState.shortLabel}. 0은 중앙이고 양수는 오른쪽, 음수는 왼쪽으로 표시됩니다.`}
      >
        <span className={styles['dot-bar-negative-label']}>음수 ←</span>
        <span className={styles['dot-bar-positive-label']}>→ 양수</span>
        <span className={styles['dot-bar-center']} />
        {signState.key !== 'zero' && (
          <span
            className={`${styles['dot-bar-fill']} ${styles[`dot-bar-fill--${signState.key}`]}`}
            style={{ '--dot-bar-width': `${barWidth}%` }}
          />
        )}
      </div>
      <div className={styles['dot-bar-scale']} aria-hidden="true">
        <span>-100</span>
        <span>0</span>
        <span>100</span>
      </div>
    </div>
  );
}

export default function DotProductProjectionPage() {
  const isEmbedMode = useEmbedMode();
  const [magnitudeA, setMagnitudeA] = useState(
    INITIAL_DOT_PRODUCT_VALUES.magnitudeA,
  );
  const [magnitudeB, setMagnitudeB] = useState(
    INITIAL_DOT_PRODUCT_VALUES.magnitudeB,
  );
  const [thetaDegrees, setThetaDegrees] = useState(
    INITIAL_DOT_PRODUCT_VALUES.thetaDegrees,
  );

  const signedProjection = calculateSignedScalarProjection(
    magnitudeB,
    thetaDegrees,
  );
  const dotProduct = calculateDotProduct(
    magnitudeA,
    magnitudeB,
    thetaDegrees,
  );
  const signState = getDotProductSignState(dotProduct);
  const interpretation = getInterpretationState({
    magnitudeA,
    magnitudeB,
    thetaDegrees,
  });
  const geometry = createSvgGeometry(
    magnitudeA,
    magnitudeB,
    thetaDegrees,
  );
  const projectionIsDefined = magnitudeA !== 0;

  function resetValues() {
    setMagnitudeA(INITIAL_DOT_PRODUCT_VALUES.magnitudeA);
    setMagnitudeB(INITIAL_DOT_PRODUCT_VALUES.magnitudeB);
    setThetaDegrees(INITIAL_DOT_PRODUCT_VALUES.thetaDegrees);
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
          <p className={styles.eyebrow}>선형대수 · 벡터</p>
          <h1>내적과 정사영 탐색기</h1>
          <p>
            두 벡터의 크기와 사이각을 조절하며 내적의 부호와 크기가
            정사영에서 어떻게 만들어지는지 확인합니다.
          </p>
        </header>

        <div className={styles.workspace}>
          <section
            className={`${styles.panel} ${styles.controls}`}
            aria-labelledby="dot-product-controls"
          >
            <div className={styles['section-heading']}>
              <div>
                <p className={styles.kicker}>직접 조절</p>
                <h2 id="dot-product-controls">벡터와 사이각</h2>
              </div>
              <button type="button" onClick={resetValues}>
                초기화
              </button>
            </div>

            <NumericControl
              id="magnitude-a"
              label="벡터 a의 크기 |a|"
              value={magnitudeA}
              unit=""
              minimum={0}
              maximum={10}
              step={0.1}
              onChange={setMagnitudeA}
            />
            <NumericControl
              id="magnitude-b"
              label="벡터 b의 크기 |b|"
              value={magnitudeB}
              unit=""
              minimum={0}
              maximum={10}
              step={0.1}
              onChange={setMagnitudeB}
            />
            <NumericControl
              id="theta"
              label="사이각 θ"
              value={thetaDegrees}
              unit="°"
              minimum={0}
              maximum={180}
              step={1}
              onChange={setThetaDegrees}
            />

            <dl className={styles['current-values']}>
              <div>
                <dt>부호 있는 정사영</dt>
                <dd>
                  {projectionIsDefined
                    ? formatValue(signedProjection)
                    : '정의되지 않음'}
                </dd>
              </div>
              <div>
                <dt>내적 a · b</dt>
                <dd>{formatValue(dotProduct)}</dd>
              </div>
            </dl>
          </section>

          <section
            className={`${styles.panel} ${styles.visual}`}
            aria-labelledby="vector-diagram-heading"
          >
            <div className={styles['visual-heading']}>
              <div>
                <p className={styles.kicker}>기하적 해석</p>
                <h2 id="vector-diagram-heading">벡터와 정사영</h2>
              </div>
              <span
                className={`${styles['sign-badge']} ${styles[`sign-badge--${signState.key}`]}`}
              >
                {signState.label}
              </span>
            </div>

            <VectorDiagram
              magnitudeA={magnitudeA}
              magnitudeB={magnitudeB}
              thetaDegrees={thetaDegrees}
              signedProjection={signedProjection}
              dotProduct={dotProduct}
              geometry={geometry}
            />

            <div className={styles['visual-information']}>
              <p
                className={styles['text-summary']}
                aria-live="polite"
                aria-atomic="true"
              >
                |a| = {formatValue(magnitudeA)}, |b| = {formatValue(magnitudeB)},
                θ = {formatValue(thetaDegrees)}°.{' '}
                {projectionIsDefined
                  ? `b의 부호 있는 정사영은 ${formatValue(signedProjection)}이고`
                  : 'a가 영벡터라 a 방향 정사영은 정의되지 않으며'}{' '}
                내적은 {formatValue(dotProduct)}입니다.
              </p>

              <div
                className={`${styles.interpretation} ${styles[`interpretation--${interpretation.key}`]}`}
              >
                <strong>현재 해석</strong>
                <p>{interpretation.text}</p>
              </div>
            </div>

            <DotProductBar dotProduct={dotProduct} signState={signState} />
          </section>

          <section
            className={`${styles.panel} ${styles.details}`}
            aria-labelledby="formula-heading"
          >
            <div className={styles['section-heading']}>
              <div>
                <p className={styles.kicker}>계산과 의미</p>
                <h2 id="formula-heading">내적 공식</h2>
              </div>
            </div>

            <div className={styles['formula-block']}>
              <MathFormula
                formula={dotProductFormula}
                className={styles.formula}
              />
              {magnitudeA === 0 || magnitudeB === 0 ? (
                <p className={styles.calculation}>
                  {magnitudeA === 0 ? 'a' : 'b'}가 영벡터이므로 a · b ={' '}
                  <strong>0</strong>입니다. 영벡터가 포함된 두 벡터의 사이각은
                  정의되지 않습니다.
                </p>
              ) : (
                <p className={styles.calculation}>
                  a · b = {formatValue(magnitudeA)} × {formatValue(magnitudeB)} ×
                  cos({formatValue(thetaDegrees)}°) ={' '}
                  <strong>{formatValue(dotProduct)}</strong>
                </p>
              )}
            </div>

            <div className={styles['formula-block']}>
              <MathFormula
                formula={projectionFormula}
                className={styles.formula}
              />
              <p className={styles['projection-meaning']}>
                a · b = |a| × (a 방향으로의 b의 부호 있는 정사영)
              </p>
              {projectionIsDefined ? (
                <p className={styles.calculation}>
                  {formatValue(magnitudeA)} × {formatValue(signedProjection)} ={' '}
                  <strong>{formatValue(dotProduct)}</strong>
                </p>
              ) : (
                <p className={styles.calculation}>
                  a가 영벡터이므로 a 방향의 부호 있는 정사영은 정의되지
                  않습니다. 영벡터와의 내적은 <strong>0</strong>입니다.
                </p>
              )}
            </div>
          </section>
        </div>
      </article>
    </main>
  );
}
