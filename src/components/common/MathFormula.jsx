import { useMemo } from 'react';
import katex from 'katex';

export default function MathFormula({
  formula,
  className = '',
  displayMode = true,
}) {
  const { html, errorMessage } = useMemo(() => {
    try {
      return {
        html: katex.renderToString(formula, {
          displayMode,
          throwOnError: true,
          strict: false,
        }),
        errorMessage: '',
      };
    } catch (error) {
      console.error('수식 렌더링 오류:', error);
      console.error('문제가 발생한 수식:', formula);

      return {
        html: '',
        errorMessage: error.message,
      };
    }
  }, [formula, displayMode]);

  return (
    <div className={`math-formula ${className}`.trim()}>
      <div dangerouslySetInnerHTML={{ __html: html }} />

      {errorMessage && (
        <div className="math-formula__error">
          <strong>수식을 표시할 수 없습니다.</strong>
          <small>{errorMessage}</small>
        </div>
      )}
    </div>
  );
}
