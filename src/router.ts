import { useMemo, useSyncExternalStore } from 'react';

function subscribe(fn: () => void): () => void {
  window.addEventListener('hashchange', fn);
  return () => window.removeEventListener('hashchange', fn);
}

/** Hash-alapú útvonal: '#/meres/abc' → ['meres', 'abc']. Statikus tárhelyen is működik. */
export function useRoute(): string[] {
  const hash = useSyncExternalStore(subscribe, () => window.location.hash);
  return useMemo(
    () =>
      hash
        .replace(/^#\/?/, '')
        .split('/')
        .filter(Boolean)
        .map((p) => decodeURIComponent(p)),
    [hash],
  );
}
