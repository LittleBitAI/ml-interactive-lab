import { lazy } from 'react';

export const widgetRegistry = [
  {
    id: 'bayes-theorem',
    title: '베이즈 정리',
    category: '확률과 통계',
    description:
      '사전확률과 가능도를 조절하면서 사후확률이 어떻게 변하는지 확인합니다.',
    path: '/widgets/probability/bayes-theorem',
    status: 'published',
    component: lazy(
      () => import('../widgets/probability/BayesTheoremPage.jsx'),
    ),
  },
];

if (import.meta.env.DEV) {
  const requiredFields = [
    'id',
    'title',
    'category',
    'description',
    'path',
    'status',
    'component',
  ];
  const ids = new Set();
  const paths = new Set();

  for (const widget of widgetRegistry) {
    const missingFields = requiredFields.filter((field) => !widget[field]);

    if (missingFields.length > 0) {
      throw new Error(
        `Widget "${widget.id ?? 'unknown'}" is missing required fields: ${missingFields.join(', ')}`,
      );
    }

    if (ids.has(widget.id)) {
      throw new Error(`Duplicate widget ID: ${widget.id}`);
    }

    if (paths.has(widget.path)) {
      throw new Error(`Duplicate widget path: ${widget.path}`);
    }

    ids.add(widget.id);
    paths.add(widget.path);
  }
}
