import { Link } from 'react-router';
import { widgetRegistry } from '../data/widgetRegistry.js';

export default function HomePage() {
  const publishedWidgets = widgetRegistry.filter(
    (widget) => widget.status === 'published',
  );

  return (
    <main className="catalog-page">
      <header className="catalog-header">
        <p className="eyebrow">ML INTERACTIVE LAB</p>
        <h1>머신러닝 인터랙티브 학습실</h1>
        <p>
          수식과 그래프를 직접 조작하면서 확률·통계·머신러닝 개념을
          학습하는 위젯 모음입니다.
        </p>
      </header>

      <section className="widget-grid" aria-label="공개된 학습 위젯">
        {publishedWidgets.map((widget) => (
          <Link className="widget-card" to={widget.path} key={widget.id}>
            <span className="widget-card__category">{widget.category}</span>
            <h2>{widget.title}</h2>
            <p>{widget.description}</p>
            <span className="widget-card__link">위젯 열기 →</span>
          </Link>
        ))}
      </section>
    </main>
  );
}
