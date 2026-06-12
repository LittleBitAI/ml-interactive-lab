import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

const BayesTheoremPage = lazy(
  () => import('./widgets/probability/BayesTheoremPage.jsx'),
);

function PageLoading() {
  return (
    <main className="center-page" aria-live="polite">
      <p>위젯을 불러오는 중입니다.</p>
    </main>
  );
}

export default function App() {
  return (
    <Suspense fallback={<PageLoading />}>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route
          path="/widgets/probability/bayes-theorem"
          element={<BayesTheoremPage />}
        />
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
