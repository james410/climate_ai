export const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:5000";

async function fetchJSON<T = any>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      ...(init?.headers || {}),
    },
    // 若你之後要帶 cookie/session，再加上：
    // credentials: "include",
  });

  if (!res.ok) {
    const text = await res.text(); // 後端 404/500 通常回 HTML
    throw new Error(`HTTP ${res.status} ${res.statusText}: ${text.slice(0, 200)}`);
  }
  return res.json();
}

/** 依你的 API 文件建立呼叫函式（歷史 / 預測） */
export const ClimateAPI = {
  // 歷史資料
  getHistory: (year: number, month: number, columnId: number, rowId: number) =>
    fetchJSON(`/data/history/${year}/${month}/${columnId}/${rowId}`),

  // 預測資料（2025–2035）
  getPrediction: (year: number, month: number, columnId: number, rowId: number) =>
    fetchJSON(`/data/prediction/${year}/${month}/${columnId}/${rowId}`),
};
