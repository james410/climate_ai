import { useEffect, useState } from "react";
import { ClimateAPI } from "@/lib/api";
import type { HistoryResponse, PredictionResponse } from "@/types/api";

type Mode = "history" | "prediction";

export function useClimate(
  mode: Mode,
  year: number,
  month: number,
  columnId: number,
  rowId: number
) {
  const [data, setData] = useState<HistoryResponse | PredictionResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setErr] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setErr(null);
      try {
        const res =
          mode === "history"
            ? await ClimateAPI.getHistory(year, month, columnId, rowId)
            : await ClimateAPI.getPrediction(year, month, columnId, rowId);

        if (!cancelled) setData(res);
      } catch (e: any) {
        if (!cancelled) setErr(e?.message || String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [mode, year, month, columnId, rowId]);

  return { data, loading, error };
}
