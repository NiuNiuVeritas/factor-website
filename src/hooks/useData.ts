import { useState, useEffect } from 'react';

const cache: Record<string, unknown> = {};

export function useData<T>(name: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>((cache[name] as T) ?? null);
  const [loading, setLoading] = useState(!cache[name]);

  useEffect(() => {
    let cancelled = false;
    if (cache[name]) {
      queueMicrotask(() => {
        if (!cancelled) {
          setData(cache[name] as T);
          setLoading(false);
        }
      });
      return () => {
        cancelled = true;
      };
    }
    queueMicrotask(() => {
      if (!cancelled) setLoading(true);
    });
    fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
      .then(r => r.json())
      .then(d => {
        cache[name] = d;
        if (!cancelled) setData(d);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [name]);

  return { data, loading };
}
