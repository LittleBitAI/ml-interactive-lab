import { useEffect, useState } from 'react';

function readEmbedMode() {
  const params = new URLSearchParams(window.location.search);
  return params.get('embed') === '1';
}

export default function useEmbedMode() {
  const [isEmbedMode] = useState(readEmbedMode);

  useEffect(() => {
    document.documentElement.dataset.embed = isEmbedMode ? 'true' : 'false';

    return () => {
      delete document.documentElement.dataset.embed;
    };
  }, [isEmbedMode]);

  return isEmbedMode;
}
