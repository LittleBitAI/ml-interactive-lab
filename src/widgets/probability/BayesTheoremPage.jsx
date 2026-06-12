import { useMemo, useState } from 'react';
import { Link } from 'react-router';

import MathFormula from '../../components/common/MathFormula.jsx';
import ProbabilitySlider from '../../components/common/ProbabilitySlider.jsx';
import ProbabilityStackedBar from '../../components/common/ProbabilityStackedBar.jsx';
import useEmbedMode from '../../hooks/useEmbedMode.js';

import styles from './BayesTheoremPage.module.css';

const INITIAL_VALUES = {
  pA: 0.62,
  pBGivenA: 0.43,
  pBGivenNotA: 0.9,
};

const bayesFormula = String.raw`
  P(A\mid B)
  =
  \frac{P(B\mid A)P(A)}{P(B)}
`;

const evidenceFormula = String.raw`
  P(B)
  =
  P(B\mid A)P(A)
  +
  P(B\mid A^c)P(A^c)
`;

function formatProbability(value) {
  if (value === null) {
    return '계산 불가';
  }

  return value.toFixed(3);
}

function formatPercent(value) {
  if (value === null) {
    return '계산 불가';
  }

  return `${(value * 100).toFixed(1)}%`;
}

export default function BayesTheoremPage() {
  const isEmbedMode = useEmbedMode();

  const [pA, setPA] = useState(INITIAL_VALUES.pA);
  const [pBGivenA, setPBGivenA] = useState(
    INITIAL_VALUES.pBGivenA,
  );
  const [pBGivenNotA, setPBGivenNotA] = useState(
    INITIAL_VALUES.pBGivenNotA,
  );

  const result = useMemo(() => {
    const pNotA = 1 - pA;

    const evidenceFromA =
      pBGivenA * pA;

    const evidenceFromNotA =
      pBGivenNotA * pNotA;

    const pB =
      evidenceFromA + evidenceFromNotA;

    const posterior =
      pB === 0
        ? null
        : evidenceFromA / pB;

    return {
      pNotA,
      evidenceFromA,
      evidenceFromNotA,
      pB,
      posterior,
      noEvidence: Math.max(0, 1 - pB),
    };
  }, [
    pA,
    pBGivenA,
    pBGivenNotA,
  ]);

  function resetValues() {
    setPA(INITIAL_VALUES.pA);
    setPBGivenA(INITIAL_VALUES.pBGivenA);
    setPBGivenNotA(INITIAL_VALUES.pBGivenNotA);
  }

  return (
    <main
      className={
        isEmbedMode
          ? `${styles['bayes-page']} ${styles['bayes-page--embed']} ${styles['embed-mode']}`
          : styles['bayes-page']
      }
    >
      {!isEmbedMode && (
        <div className={styles['bayes-page__topbar']}>
          <Link
            className="text-link"
            to="/"
          >
            ← 전체 위젯
          </Link>
        </div>
      )}

      <article className={styles['bayes-widget']}>
        <header className={styles['bayes-widget__header']}>
          <div className={styles['bayes-widget__introduction']}>
            <p className="eyebrow">
              확률과 통계
            </p>

            <h1>
              베이즈 정리
            </h1>

            <p className={styles['bayes-widget__description']}>
              세 확률을 움직여서 새로운 증거가 사건 A의
              확률을 어떻게 바꾸는지 확인해 보십시오.
            </p>
          </div>

          <MathFormula
            formula={bayesFormula}
            className={styles['bayes-widget__main-formula']}
          />
        </header>

        <div className={styles['bayes-widget__body']}>
          <section
            className={styles['control-panel']}
            aria-label="확률 조절 영역"
          >
            <div className={styles['section-heading']}>
              <h2>
                1. 확률 조절
              </h2>

              <button
                className={styles['reset-button']}
                type="button"
                onClick={resetValues}
              >
                초기화
              </button>
            </div>

            <ProbabilitySlider
              id="p-a"
              label="P(A) — 사건 A의 사전확률"
              value={pA}
              onChange={setPA}
            />

            <ProbabilitySlider
              id="p-b-given-a"
              label="P(B | A) — A일 때 B가 나타날 확률"
              value={pBGivenA}
              onChange={setPBGivenA}
            />

            <ProbabilitySlider
              id="p-b-given-not-a"
              label="P(B | Aᶜ) — A가 아닐 때 B가 나타날 확률"
              value={pBGivenNotA}
              onChange={setPBGivenNotA}
            />

            <div className={styles['formula-note']}>
              <MathFormula
                formula={evidenceFormula}
                className={styles['formula-note__formula']}
              />

              <p className={styles['formula-note__description']}>
                전체 증거 확률 P(B)는 A에서 나온 증거와
                A가 아닌 경우에서 나온 증거를 합한 값입니다.
              </p>
            </div>
          </section>

          <section
            className={styles['result-panel']}
            aria-label="계산 결과와 그래프"
          >
            <h2>
              2. 계산 결과
            </h2>

            <div className={styles['result-cards']}>
              <div className={styles['result-card']}>
                <span>
                  전체 증거 확률 P(B)
                </span>

                <strong>
                  {formatProbability(result.pB)}
                </strong>

                <small>
                  {formatPercent(result.pB)}
                </small>
              </div>

              <div
                className={`${styles['result-card']} ${styles['result-card--primary']}`}
              >
                <span>
                  사후확률 P(A | B)
                </span>

                <strong>
                  {formatProbability(result.posterior)}
                </strong>

                <small>
                  {formatPercent(result.posterior)}
                </small>
              </div>
            </div>

            <ProbabilityStackedBar
              evidenceFromA={result.evidenceFromA}
              evidenceFromNotA={
                result.evidenceFromNotA
              }
              noEvidence={result.noEvidence}
            />

            <div className={styles['calculation-box']}>
              <p>
                <span>
                  A에서 나온 증거:
                </span>

                <strong>
                  {pBGivenA.toFixed(2)}
                  {' × '}
                  {pA.toFixed(2)}
                  {' = '}
                  {result.evidenceFromA.toFixed(3)}
                </strong>
              </p>

              <p>
                <span>
                  A가 아닌 경우에서 나온 증거:
                </span>

                <strong>
                  {pBGivenNotA.toFixed(2)}
                  {' × '}
                  {result.pNotA.toFixed(2)}
                  {' = '}
                  {result.evidenceFromNotA.toFixed(3)}
                </strong>
              </p>

              <p>
                <span>
                  사후확률:
                </span>

                <strong>
                  {result.pB === 0
                    ? 'P(B)가 0이므로 계산할 수 없음'
                    : `${result.evidenceFromA.toFixed(
                        3,
                      )} ÷ ${result.pB.toFixed(
                        3,
                      )} = ${result.posterior.toFixed(
                        3,
                      )}`}
                </strong>
              </p>
            </div>

            <p
              className={styles.interpretation}
              aria-live="polite"
            >
              {result.posterior === null ? (
                <>
                  증거 B가 전혀 발생하지 않도록 설정되어
                  사후확률을 계산할 수 없습니다.
                </>
              ) : (
                <>
                  증거 B가 관측된 경우만 모아 보면, 그중 약{' '}
                  <strong>
                    {formatPercent(result.posterior)}
                  </strong>
                  가 사건 A에서 나온 경우입니다.
                </>
              )}
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
