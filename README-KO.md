# ML Interactive Lab — 첫 번째 구현

React + Vite로 만든 학습용 인터랙티브 위젯 프로젝트입니다.
첫 콘텐츠는 베이즈 정리 위젯입니다.

## 1. 필요한 패키지 설치

PyCharm 터미널에서 프로젝트 최상위 폴더에 있는지 확인한 뒤 실행합니다.

```powershell
npm install react-router recharts katex react-katex
```

## 2. 파일 적용

이 패키지의 다음 항목을 기존 Vite 프로젝트에 복사합니다.

- `src` 폴더: 기존 `src` 폴더와 교체
- `vite.config.js`: 프로젝트 최상위 파일과 교체
- `.github` 폴더: 프로젝트 최상위에 복사

## 3. 로컬 실행

```powershell
npm run dev
```

일반 화면:

```text
http://localhost:5173/#/widgets/probability/bayes-theorem
```

Notion 임베드 화면:

```text
http://localhost:5173/?embed=1#/widgets/probability/bayes-theorem
```

`?embed=1`은 Notion 안에서 불필요한 여백과 상단 이동 링크를 제거합니다.
중요: `?embed=1`은 `#`보다 앞에 둡니다.

## 4. 빌드 확인

```powershell
npm run build
```

오류 없이 `dist` 폴더가 생성되면 배포 가능한 상태입니다.

## 5. GitHub Pages 주소

저장소 이름이 `ml-interactive-lab`일 때:

```text
https://깃허브아이디.github.io/ml-interactive-lab/?embed=1#/widgets/probability/bayes-theorem
```

Notion에서 `/embed`를 입력한 뒤 위 주소를 붙여 넣습니다.

## 6. GitHub Pages 설정

GitHub 저장소에서 다음으로 이동합니다.

```text
Settings → Pages → Source → GitHub Actions
```

`.github/workflows/deploy.yml`이 main 브랜치에 올라가면 자동으로 빌드·배포됩니다.

## 7. 다음 위젯 추가

1. `src/widgets` 아래에 새 위젯 컴포넌트를 만듭니다.
2. `src/data/widgetCatalog.js`에 위젯 정보를 추가합니다.
3. `src/App.jsx`에 새 `<Route>`를 추가합니다.
