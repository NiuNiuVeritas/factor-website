import { useState, useEffect } from 'react';

const cache: Record<string, unknown> = {};

export function useData<T>(name: string): { data: T | null; loading: boolean } {
  const [data, setData] = useState<T | null>((cache[name] as T) ?? null);
  const [loading, setLoading] = useState(!cache[name]);

  useEffect(() => {
    if (cache[name]) {
      setData(cache[name] as T);
      setLoading(false);
      return;
    }
    setLoading(true);
    fetch(`${import.meta.env.BASE_URL}data/${name}.json`)
      .then(r => r.json())
      .then(d => {
        cache[name] = d;
        setData(d);
      })
      .finally(() => setLoading(false));
  }, [name]);

  return { data, loading };
}
