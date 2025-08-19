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

export type ClimatePayload = {
  apparent_temperatures?: { current?: number; high?: number; low?: number };
  temperatures?: { current?: number; high?: number; low?: number };
  predicted_temperatures?: { current?: number; high?: number; low?: number };
  weather_conditions?: { humidity?: number; pressure?: number; rain?: number; solar?: number; wind?: number };
  location?: { column_id?: number; row_id?: number; latitude?: number; longitude?: number; elevation?: number };
  metadata?: { id?: number; year?: number; month?: number; vegetation?: number; water_body?: number };
};

// 封裝你文件裡的 5 個端點
export const ClimateAPI = {
  history: (y: number, m: number, col: number, row: number) =>
    fetchJSON<ClimatePayload>(`/data/${y}/${m}/${col}+${row}`),

  ndviScenario: (m: number, vegetation01: number, col: number, row: number) =>
    fetchJSON<ClimatePayload>(`/NDVI/${m}/${vegetation01}/${col}+${row}`),

  annualWeather: (kind: "humidity"|"pressure"|"rain"|"solar"|"wind", y: number, col: number, row: number) =>
    fetchJSON<Record<string, number>>(`/annual/${kind}/${y}/${col}+${row}`),

  annualTemp: (y: number, col: number, row: number) =>
    fetchJSON<Record<string, Record<string, number>>>(`/annual/temp/${y}/${col}+${row}`),

  formap: (type:
      "Temperature"|"Low_Temp"|"High_Temp"|
      "Apparent_Temperature"|"Apparent_Temperature_High"|"Apparent_Temperature_Low",
      y: number, m: number) =>
    fetchJSON<Record<string, Record<string, number>>>(`/formap/${type}/${y}/${m}`),
};
