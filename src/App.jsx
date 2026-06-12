import { Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { widgetRegistry } from './data/widgetRegistry.js';
import HomePage from './pages/HomePage.jsx';
import NotFoundPage from './pages/NotFoundPage.jsx';

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
        {widgetRegistry.map((widget) => {
          const WidgetPage = widget.component;

          return (
            <Route
              key={widget.id}
              path={widget.path}
              element={<WidgetPage />}
            />
          );
        })}
        <Route path="*" element={<NotFoundPage />} />
      </Routes>
    </Suspense>
  );
}
