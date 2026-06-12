import { useEffect, useRef, useState } from 'react';
import katex from 'katex';

export default function MathFormula({
  formula,
  className = '',
  displayMode = true,
}) {
  const containerRef = useRef(null);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    const container = containerRef.current;

    if (!container) {
      return;
    }

    try {
      katex.render(formula, container, {
        displayMode,
        throwOnError: true,
        strict: false,
      });

      setErrorMessage('');
    } catch (error) {
      console.error('수식 렌더링 오류:', error);
      console.error('문제가 발생한 수식:', formula);

      container.textContent = '';
      setErrorMessage(error.message);
    }
  }, [formula, displayMode]);

  return (
    <div className={`math-formula ${className}`.trim()}>
      <div ref={containerRef} />

      {errorMessage && (
        <div className="math-formula__error">
          <strong>수식을 표시할 수 없습니다.</strong>
          <small>{errorMessage}</small>
        </div>
      )}
    </div>
  );
}
