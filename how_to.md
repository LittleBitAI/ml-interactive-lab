# ML Interactive Lab

확률, 통계, 머신러닝 개념을 직접 조작하며 학습할 수 있는 반응형 위젯 모음입니다.

각 위젯은 React로 제작되며, GitHub Pages에 배포한 뒤 Notion의 Embed 블록에 삽입할 수 있습니다.

## 기술 구성

* React: 위젯 화면과 상태 관리
* Vite: 개발 서버와 배포용 빌드
* Recharts: 반응형 그래프
* KaTeX: 수학 수식 표시
* React Router: 위젯별 URL 관리
* GitHub Pages: 정적 웹사이트 배포
* GitHub Actions: 자동 빌드 및 배포

---

## 프로젝트 실행

### 1. 패키지 설치

프로젝트 최상위 폴더에서 실행합니다.

```powershell
npm install
```

### 2. 개발 서버 실행

```powershell
npm run dev
```

브라우저에서 다음 주소를 엽니다.

```text
http://localhost:5173/
```

### 3. 배포용 빌드 확인

```powershell
npm run build
```

빌드가 성공하면 프로젝트 최상위에 `dist` 폴더가 생성됩니다.

### 4. 빌드 결과 미리 보기

```powershell
npm run preview
```

---

# 새 반응형 그래프 위젯 추가 방법

새 위젯을 추가할 때는 다음 네 부분을 수정합니다.

```text
1. 위젯 JSX 파일 생성
2. 위젯 CSS 파일 생성
3. App.jsx에 URL 등록
4. widgetCatalog.js에 목록 등록
```

예시로 `정규분포` 위젯을 추가한다고 가정합니다.

사용할 URL은 다음과 같습니다.

```text
#/widgets/statistics/normal-distribution
```

---

## 1. 위젯 폴더 만들기

다음 폴더를 만듭니다.

```text
src/widgets/statistics/
```

그 안에 다음 파일 두 개를 만듭니다.

```text
src/widgets/statistics/NormalDistributionPage.jsx
src/widgets/statistics/NormalDistributionPage.css
```

폴더 구조는 다음과 같습니다.

```text
src/
└── widgets/
    ├── probability/
    │   ├── BayesTheoremPage.jsx
    │   └── BayesTheoremPage.css
    │
    └── statistics/
        ├── NormalDistributionPage.jsx
        └── NormalDistributionPage.css
```

---

## 2. 위젯 JSX 작성

수정할 파일:

```text
src/widgets/statistics/NormalDistributionPage.jsx
```

예시 코드:

```jsx
import { useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';

import useEmbedMode from '../../hooks/useEmbedMode.js';

import './NormalDistributionPage.css';

function createNormalDistributionData(mean, standardDeviation) {
  const data = [];

  const start = mean - standardDeviation * 4;
  const end = mean + standardDeviation * 4;
  const pointCount = 120;
  const step = (end - start) / pointCount;

  for (let index = 0; index <= pointCount; index += 1) {
    const x = start + index * step;

    const exponent =
      -0.5 *
      Math.pow(
        (x - mean) / standardDeviation,
        2,
      );

    const density =
      Math.exp(exponent) /
      (
        standardDeviation *
        Math.sqrt(2 * Math.PI)
      );

    data.push({
      x: Number(x.toFixed(3)),
      density: Number(density.toFixed(6)),
    });
  }

  return data;
}

export default function NormalDistributionPage() {
  const isEmbedMode = useEmbedMode();

  const [mean, setMean] = useState(0);
  const [standardDeviation, setStandardDeviation] =
    useState(1);

  const chartData = useMemo(
    () =>
      createNormalDistributionData(
        mean,
        standardDeviation,
      ),
    [mean, standardDeviation],
  );

  return (
    <main
      className={
        isEmbedMode
          ? 'normal-page normal-page--embed'
          : 'normal-page'
      }
    >
      <article className="normal-widget">
        <header className="normal-widget__header">
          <p className="eyebrow">
            확률과 통계
          </p>

          <h1>
            정규분포
          </h1>

          <p className="normal-widget__description">
            평균과 표준편차를 변경하면서 정규분포의
            중심과 퍼짐이 어떻게 달라지는지 확인합니다.
          </p>
        </header>

        <div className="normal-widget__body">
          <section className="normal-widget__controls">
            <label htmlFor="mean">
              평균 μ: {mean.toFixed(1)}
            </label>

            <input
              id="mean"
              type="range"
              min="-5"
              max="5"
              step="0.1"
              value={mean}
              onChange={(event) =>
                setMean(Number(event.target.value))
              }
            />

            <label htmlFor="standard-deviation">
              표준편차 σ:{' '}
              {standardDeviation.toFixed(1)}
            </label>

            <input
              id="standard-deviation"
              type="range"
              min="0.2"
              max="3"
              step="0.1"
              value={standardDeviation}
              onChange={(event) =>
                setStandardDeviation(
                  Number(event.target.value),
                )
              }
            />
          </section>

          <section className="normal-widget__chart">
            <ResponsiveContainer
              width="100%"
              height={360}
            >
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />

                <XAxis
                  dataKey="x"
                  type="number"
                  domain={['dataMin', 'dataMax']}
                />

                <YAxis />

                <Tooltip />

                <Line
                  type="monotone"
                  dataKey="density"
                  dot={false}
                  strokeWidth={3}
                  isAnimationActive={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </section>
        </div>
      </article>
    </main>
  );
}
```

### 반응형 그래프에서 중요한 부분

다음 컴포넌트가 그래프 크기를 부모 영역에 맞춰 조절합니다.

```jsx
<ResponsiveContainer
  width="100%"
  height={360}
>
```

`width="100%"`를 사용해야 Notion 임베드 영역의 가로 크기에 맞춰 그래프가 변경됩니다.

다음처럼 고정된 가로 너비를 사용하는 것은 피합니다.

```jsx
<LineChart width={800} height={360}>
```

고정 너비를 사용하면 작은 Notion 블록이나 모바일 화면에서 그래프가 잘릴 수 있습니다.

---

## 3. 위젯 CSS 작성

수정할 파일:

```text
src/widgets/statistics/NormalDistributionPage.css
```

예시 코드:

```css
.normal-page {
  width: 100%;
  min-height: 100vh;
  padding: 24px;
}

.normal-page--embed {
  min-height: auto;
  padding: 0;
}

.normal-widget {
  width: 100%;
  max-width: 1100px;
  margin: 0 auto;
  overflow: hidden;
  border: 1px solid #d8e1ee;
  border-radius: 18px;
  background: #ffffff;
}

.normal-widget__header {
  padding: 32px;
  border-bottom: 1px solid #d8e1ee;
}

.normal-widget__header h1 {
  margin: 8px 0 12px;
}

.normal-widget__description {
  margin: 0;
  line-height: 1.7;
}

.normal-widget__body {
  display: grid;
  grid-template-columns:
    minmax(220px, 0.8fr)
    minmax(0, 1.5fr);
  gap: 24px;
  padding: 32px;
}

.normal-widget__controls {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.normal-widget__controls input[type='range'] {
  width: 100%;
}

.normal-widget__chart {
  width: 100%;
  min-width: 0;
  height: 360px;
}

.normal-page--embed .normal-widget {
  max-width: none;
  border-radius: 0;
}

.normal-page--embed .normal-widget__header {
  padding: 24px 28px;
}

.normal-page--embed .normal-widget__body {
  padding: 24px 28px;
}

@media (max-width: 640px) {
  .normal-page {
    padding: 12px;
  }

  .normal-widget__body {
    grid-template-columns: 1fr;
    padding: 20px;
  }

  .normal-widget__header {
    padding: 20px;
  }

  .normal-widget__chart {
    height: 300px;
  }

  .normal-page--embed {
    padding: 0;
  }
}
```

### CSS에서 중요한 부분

그래프를 감싸는 요소에는 다음 설정이 필요합니다.

```css
.normal-widget__chart {
  width: 100%;
  min-width: 0;
}
```

CSS Grid 안에서 `min-width: 0`이 없으면 그래프가 부모 영역보다 넓어져 잘릴 수 있습니다.

---

## 4. App.jsx에 위젯 URL 등록

수정할 파일:

```text
src/App.jsx
```

파일 상단의 import 영역에 새 위젯을 추가합니다.

```jsx
import NormalDistributionPage
  from './widgets/statistics/NormalDistributionPage.jsx';
```

기존 `Routes` 내부에 새로운 `Route`를 추가합니다.

```jsx
<Route
  path="/widgets/statistics/normal-distribution"
  element={<NormalDistributionPage />}
/>
```

전체 구조 예시:

```jsx
import {
  Route,
  Routes,
} from 'react-router';

import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';
import BayesTheoremPage
  from './widgets/probability/BayesTheoremPage.jsx';
import NormalDistributionPage
  from './widgets/statistics/NormalDistributionPage.jsx';

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<HomePage />}
      />

      <Route
        path="/widgets/probability/bayes-theorem"
        element={<BayesTheoremPage />}
      />

      <Route
        path="/widgets/statistics/normal-distribution"
        element={<NormalDistributionPage />}
      />

      <Route
        path="*"
        element={<NotFoundPage />}
      />
    </Routes>
  );
}
```

이제 로컬 위젯 주소는 다음과 같습니다.

```text
http://localhost:5173/#/widgets/statistics/normal-distribution
```

Notion 임베드 모드 주소:

```text
http://localhost:5173/?embed=1#/widgets/statistics/normal-distribution
```

---

## 5. 메인 페이지 위젯 목록에 등록

수정할 파일:

```text
src/data/widgetCatalog.js
```

기존 배열에 새 위젯 정보를 추가합니다.

예시:

```javascript
export const widgetCatalog = [
  {
    id: 'bayes-theorem',
    title: '베이즈 정리',
    category: '확률과 통계',
    description:
      '사전확률과 가능도를 움직이며 사후확률의 변화를 확인합니다.',
    path:
      '/widgets/probability/bayes-theorem',
  },
  {
    id: 'normal-distribution',
    title: '정규분포',
    category: '확률과 통계',
    description:
      '평균과 표준편차에 따라 정규분포가 어떻게 달라지는지 확인합니다.',
    path:
      '/widgets/statistics/normal-distribution',
  },
];
```

쉼표 위치에 주의합니다.

마지막 항목 뒤에는 쉼표가 있어도 실행되지만, 각 객체 사이에는 반드시 쉼표가 있어야 합니다.

---

## 6. 로컬에서 새 위젯 확인

개발 서버를 실행합니다.

```powershell
npm run dev
```

일반 페이지:

```text
http://localhost:5173/#/widgets/statistics/normal-distribution
```

Notion 임베드 모드:

```text
http://localhost:5173/?embed=1#/widgets/statistics/normal-distribution
```

확인할 항목:

1. 슬라이더가 정상적으로 움직이는가
2. 그래프가 즉시 변경되는가
3. 브라우저 폭을 줄였을 때 1열로 변경되는가
4. 가로 스크롤이 발생하지 않는가
5. `?embed=1`에서 불필요한 여백이 줄어드는가

---

# 수식을 추가하는 방법

수식을 표시할 때는 공통 컴포넌트를 사용합니다.

파일:

```text
src/components/common/MathFormula.jsx
```

위젯 파일에서 import합니다.

```jsx
import MathFormula
  from '../../components/common/MathFormula.jsx';
```

수식 문자열은 `String.raw`를 사용합니다.

```jsx
const formula = String.raw`
  P(A\mid B)
  =
  \frac{P(B\mid A)P(A)}{P(B)}
`;
```

화면에 표시합니다.

```jsx
<MathFormula formula={formula} />
```

일반 문자열에 LaTeX 역슬래시를 그대로 입력하면 JavaScript 이스케이프 문자로 처리될 수 있으므로 `String.raw` 사용을 권장합니다.

---

# GitHub Pages에 배포하는 방법

## 1. 빌드 확인

```powershell
npm run build
```

빌드 오류가 없다면 Git에 변경사항을 추가합니다.

```powershell
git add .
```

커밋합니다.

```powershell
git commit -m "Add normal distribution interactive widget"
```

GitHub에 올립니다.

```powershell
git push
```

`main` 브랜치에 코드가 올라가면 다음 파일의 GitHub Actions가 자동으로 실행됩니다.

```text
.github/workflows/deploy.yml
```

배포 과정:

```text
코드 가져오기
→ npm 패키지 설치
→ Vite 빌드
→ dist 폴더 업로드
→ GitHub Pages 배포
```

배포 상태는 GitHub 저장소의 다음 메뉴에서 확인합니다.

```text
Actions
→ Deploy to GitHub Pages
```

초록색 체크가 표시되면 배포가 완료된 것입니다.

---

# GitHub Pages 주소 구조

저장소 이름이 다음과 같다고 가정합니다.

```text
ml-interactive-lab
```

GitHub 아이디가 `example-user`라면 메인 주소는 다음과 같습니다.

```text
https://example-user.github.io/ml-interactive-lab/
```

베이즈 정리 위젯 주소:

```text
https://example-user.github.io/ml-interactive-lab/#/widgets/probability/bayes-theorem
```

정규분포 위젯 주소:

```text
https://example-user.github.io/ml-interactive-lab/#/widgets/statistics/normal-distribution
```

---

# Notion에 위젯 임베드하기

Notion에는 일반 URL보다 임베드 전용 URL을 사용하는 것을 권장합니다.

임베드 전용 URL에는 다음 값을 추가합니다.

```text
?embed=1
```

중요한 점은 `?embed=1`이 `#` 앞에 있어야 한다는 것입니다.

올바른 주소:

```text
https://example-user.github.io/ml-interactive-lab/?embed=1#/widgets/probability/bayes-theorem
```

잘못된 주소:

```text
https://example-user.github.io/ml-interactive-lab/#/widgets/probability/bayes-theorem?embed=1
```

## Notion 삽입 순서

1. 위젯을 넣을 Notion 페이지를 엽니다.
2. 빈 줄에서 `/embed`를 입력합니다.
3. `Embed` 블록을 선택합니다.
4. 임베드 전용 URL을 붙여 넣습니다.
5. `Embed link`를 누릅니다.
6. 임베드 블록의 가로와 세로 크기를 조절합니다.

예시:

```text
https://example-user.github.io/ml-interactive-lab/?embed=1#/widgets/statistics/normal-distribution
```

Notion 페이지를 넓게 사용하려면 페이지 우측 상단 메뉴에서 다음 옵션을 켭니다.

```text
Full width
```

---

# Notion 임베드 높이 조절

Notion은 외부 웹페이지의 높이를 자동으로 계산하지 않습니다.

따라서 위젯이 세로로 잘린다면 Notion에서 임베드 블록의 아래쪽 테두리를 직접 내려야 합니다.

권장 시작 높이:

```text
간단한 위젯: 500~700px
설명이 많은 위젯: 750~950px
1열 모바일형 위젯: 900px 이상
```

반응형 처리는 주로 가로 너비에 적용됩니다.

세로 높이는 Notion 블록에서 별도로 조정해야 합니다.

---

# 임베드 모드 적용 방법

각 위젯 파일에서 다음 훅을 import합니다.

```jsx
import useEmbedMode
  from '../../hooks/useEmbedMode.js';
```

컴포넌트 안에서 호출합니다.

```jsx
const isEmbedMode = useEmbedMode();
```

최상위 요소의 클래스를 조건에 따라 설정합니다.

```jsx
<main
  className={
    isEmbedMode
      ? 'normal-page normal-page--embed'
      : 'normal-page'
  }
>
```

CSS에서는 임베드 전용 클래스를 사용해 여백과 테두리를 줄입니다.

```css
.normal-page--embed {
  padding: 0;
}

.normal-page--embed .normal-widget {
  max-width: none;
  border-radius: 0;
  box-shadow: none;
}
```

---

# 새 위젯 추가 체크리스트

새 위젯을 추가할 때 다음 순서로 진행합니다.

```text
1. src/widgets 아래에 카테고리 폴더 확인
2. 위젯 JSX 파일 생성
3. 위젯 CSS 파일 생성
4. ResponsiveContainer로 반응형 그래프 구현
5. useEmbedMode 적용
6. src/App.jsx에 Route 추가
7. src/data/widgetCatalog.js에 목록 추가
8. npm run dev로 일반 화면 확인
9. ?embed=1 주소로 임베드 화면 확인
10. npm run build로 빌드 확인
11. git add, commit, push
12. GitHub Actions 배포 확인
13. Notion에서 /embed로 URL 삽입
```

---

# 코드 수정 후 배포 명령어

모든 변경사항을 반영할 때:

```powershell
git add .
git commit -m "Add new interactive widget"
git push
```

특정 파일만 반영할 때:

```powershell
git add src/widgets/statistics/NormalDistributionPage.jsx
git add src/widgets/statistics/NormalDistributionPage.css
git add src/App.jsx
git add src/data/widgetCatalog.js

git commit -m "Add normal distribution widget"
git push
```

기존 위젯의 URL과 폴더 이름을 변경하지 않았다면 Notion에 삽입한 URL도 변경할 필요가 없습니다.

GitHub Actions 배포가 완료되면 같은 Notion 임베드에서 최신 코드가 표시됩니다.

---

# 문제 해결

## 그래프가 가로로 잘리는 경우

그래프를 다음 구조로 감쌉니다.

```jsx
<ResponsiveContainer
  width="100%"
  height={360}
>
  <LineChart data={chartData}>
    ...
  </LineChart>
</ResponsiveContainer>
```

그래프 컨테이너 CSS에 다음을 추가합니다.

```css
.chart-container {
  width: 100%;
  min-width: 0;
}
```

## Notion에서 세로로 잘리는 경우

코드 오류가 아니라 Notion 임베드 블록 높이가 부족한 경우가 많습니다.

Notion에서 임베드 블록의 아래쪽 테두리를 아래로 드래그합니다.

## 로컬에서는 되지만 GitHub Pages에서 빈 화면이 나오는 경우

다음 파일을 확인합니다.

```text
vite.config.js
```

저장소 이름이 `ml-interactive-lab`이면 다음과 같아야 합니다.

```javascript
export default defineConfig({
  plugins: [react()],
  base: '/ml-interactive-lab/',
});
```

## 새 위젯 URL에서 404 또는 빈 화면이 나오는 경우

다음 두 파일을 확인합니다.

```text
src/App.jsx
src/data/widgetCatalog.js
```

`App.jsx`의 `Route` 경로와 `widgetCatalog.js`의 `path`가 정확히 같아야 합니다.

예:

```jsx
path="/widgets/statistics/normal-distribution"
```

```javascript
path: '/widgets/statistics/normal-distribution'
```

## 수정사항이 Notion에 반영되지 않는 경우

먼저 GitHub Actions 배포가 완료됐는지 확인합니다.

```text
GitHub 저장소
→ Actions
→ Deploy to GitHub Pages
```

배포가 성공했다면 Notion 페이지를 새로고침합니다.

필요하면 임베드 URL 뒤에 임시 버전 값을 추가해 캐시를 우회할 수 있습니다.

```text
https://example-user.github.io/ml-interactive-lab/?embed=1&v=2#/widgets/probability/bayes-theorem
```

`v=2`는 기능에 영향을 주지 않으며 브라우저가 새로운 주소로 인식하도록 돕습니다.
