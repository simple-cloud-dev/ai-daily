import { useEffect, useState } from 'react';

import type { DailySummary, HealthResponse } from '@ai-daily/types';
import { HealthResponseSchema, DailySummaryListSchema } from '@ai-daily/types';

const API_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:4000';
const API_READ_TOKEN = import.meta.env.VITE_API_READ_TOKEN ?? 'dev-read-token-change-me';

export function App() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [summaries, setSummaries] = useState<readonly DailySummary[]>([]);

  useEffect(() => {
    void fetch(`${API_URL}/health`)
      .then((response) => response.json())
      .then((payload) => setHealth(HealthResponseSchema.parse(payload)));

    void fetch(`${API_URL}/daily-summaries`, {
      headers: {
        Authorization: `Bearer ${API_READ_TOKEN}`,
      },
    })
      .then((response) =>
        response.json().then((payload) => ({ ok: response.ok, payload })),
      )
      .then(({ ok, payload }) => {
        if (!ok) {
          setSummaries([]);
          return;
        }
        setSummaries(DailySummaryListSchema.parse(payload));
      });
  }, []);

  return (
    <main className="app-shell">
      <h1>AI Daily Dashboard</h1>
      <p data-testid="api-status">API: {health?.status ?? 'loading'}</p>
      <section>
        <h2>Daily Summaries</h2>
        {summaries.length === 0 ? (
          <p>No summaries yet.</p>
        ) : (
          <ul>
            {summaries.map((item) => (
              <li key={item.id}>
                <strong>{item.title}</strong>
                <p>{item.content}</p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
