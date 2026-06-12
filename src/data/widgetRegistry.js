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
  {
    id: 'expected-value',
    title: '기대값 직관 탐색기',
    description:
      '두 결과의 값과 확률을 조절하며 기대값이 확률이 큰 결과 쪽으로 이동하는 과정을 확인합니다.',
    subject: 'probability',
    category: '확률',
    path: '/widgets/probability/expected-value',
    tags: ['기대값', '확률', '가중평균'],
    status: 'published',
    component: lazy(
      () => import('../widgets/probability/ExpectedValuePage.jsx'),
    ),
  },
  {
    id: 'dot-product-projection',
    title: '내적과 정사영 탐색기',
    description:
      '두 벡터의 크기와 사이각을 조절하며 내적의 부호와 크기가 정사영에서 어떻게 만들어지는지 확인합니다.',
    subject: 'linear-algebra',
    category: '선형대수',
    path: '/widgets/linear-algebra/dot-product-projection',
    tags: ['내적', '벡터', '정사영', '코사인'],
    status: 'published',
    component: lazy(
      () =>
        import(
          '../widgets/linear-algebra/DotProductProjectionPage.jsx'
        ),
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
