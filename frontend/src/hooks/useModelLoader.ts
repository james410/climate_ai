import { useState, useEffect } from 'react';

export function useModelLoader() {
  const [model, setModel] = useState<ModelType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadModel() {
      const mod = await import('../models/verdisle-model'); // code splitting
      setModel(await mod.init({ quantized: true }));          // 量化版本
      setLoading(false);
    }
    loadModel();
  }, []);

  return { model, loading };
}
