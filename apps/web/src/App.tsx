import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Navigate,
  NavLink,
  Route,
  Routes,
  useNavigate,
} from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { api, type PreferencesBundle } from './lib.api.js';
import { useAuth } from './lib.auth.js';

function Shell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();

  return (
    <main className="min-h-screen bg-slate-100 text-slate-900">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-4">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-sky-700">AI Daily Digest</p>
          <h1 className="text-2xl font-bold">Personal AI Intelligence Feed</h1>
        </div>
        <div className="flex items-center gap-3 text-sm">
          <span className="rounded-full bg-white px-3 py-1">{user?.email}</span>
          <button
            className="rounded-full bg-slate-900 px-4 py-2 text-white"
            onClick={() => void logout()}
          >
            Log out
          </button>
        </div>
      </header>
      <nav className="mx-auto flex w-full max-w-6xl gap-2 px-4 pb-4">
        {[
          ['/dashboard', 'Dashboard'],
          ['/settings', 'Preferences'],
          ['/onboarding', 'Onboarding'],
        ].map(([to, label]) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `rounded-full px-4 py-2 text-sm ${
                isActive ? 'bg-sky-600 text-white' : 'bg-white text-slate-700'
              }`
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
      <section className="mx-auto w-full max-w-6xl px-4 pb-10">{children}</section>
    </main>
  );
}

function AuthPage() {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const googleButtonRef = useRef<HTMLDivElement | null>(null);
  const { setUser } = useAuth();
  const navigate = useNavigate();
  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  const mutation = useMutation({
    mutationFn: async () => {
      if (mode === 'login') {
        return api.auth.login({ email, password });
      }

      return api.auth.signup({
        email,
        password,
        name,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      });
    },
    onSuccess: (result) => {
      setUser(result.user);
      void navigate('/dashboard');
    },
    onError: (err) => {
      setError(err instanceof Error ? err.message : 'Authentication failed');
    },
  });

  const googleMutation = useMutation({
    mutationFn: (idToken: string) =>
      api.auth.loginGoogle(idToken, Intl.DateTimeFormat().resolvedOptions().timeZone),
    onSuccess: (result) => {
      setUser(result.user);
      void navigate('/dashboard');
    },
    onError: () => {
      setError('Google sign-in failed');
    },
  });

  useEffect(() => {
    if (!googleClientId || !googleButtonRef.current) {
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      if (!window.google || !googleButtonRef.current) {
        return;
      }

      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: (response) => {
          googleMutation.mutate(response.credential);
        },
      });

      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        theme: 'outline',
        size: 'large',
        text: 'continue_with',
      });
    };

    document.head.appendChild(script);
    return () => {
      script.remove();
    };
  }, [googleClientId, googleMutation]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-gradient-to-br from-sky-100 via-cyan-50 to-slate-200 p-4">
      <section className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h1 className="text-2xl font-bold">{mode === 'login' ? 'Log in' : 'Create account'}</h1>
        <p className="mt-1 text-sm text-slate-600">Get AI summaries tailored to your selected sources.</p>
        <form
          className="mt-5 space-y-3"
          onSubmit={(event) => {
            event.preventDefault();
            mutation.mutate();
          }}
        >
          {mode === 'signup' ? (
            <input
              className="w-full rounded-xl border border-slate-300 px-3 py-2"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Display name"
            />
          ) : null}
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="Email"
            required
          />
          <input
            className="w-full rounded-xl border border-slate-300 px-3 py-2"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Password"
            required
          />
          {error ? <p className="text-sm text-rose-600">{error}</p> : null}
          <button
            className="w-full rounded-xl bg-slate-900 px-4 py-2 font-medium text-white"
            type="submit"
            disabled={mutation.isPending}
          >
            {mutation.isPending ? 'Please wait...' : mode === 'login' ? 'Log in' : 'Sign up'}
          </button>
        </form>
        {googleClientId ? (
          <div className="mt-3">
            <div ref={googleButtonRef} />
          </div>
        ) : (
          <button
            className="mt-3 w-full rounded-xl border border-slate-300 px-4 py-2"
            onClick={() =>
              googleMutation.mutate(`dev-google:${email}:${name || 'Google User'}`)
            }
            disabled={googleMutation.isPending || !email}
          >
            Continue with Google (dev)
          </button>
        )}
        <button
          className="mt-4 text-sm text-sky-700"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login');
            setError('');
          }}
        >
          {mode === 'login' ? 'Need an account? Sign up' : 'Already have an account? Log in'}
        </button>
      </section>
    </main>
  );
}

function usePreferences() {
  return useQuery({
    queryKey: ['preferences'],
    queryFn: () => api.preferences.get(),
  });
}

function OnboardingPage() {
  const queryClient = useQueryClient();
  const preferencesQuery = usePreferences();
  const navigate = useNavigate();

  const [topics, setTopics] = useState('LLM, computer vision, AI regulation');
  const [deliveryEmail, setDeliveryEmail] = useState('');

  const sourceIds = useMemo(
    () =>
      (preferencesQuery.data?.sources ?? [])
        .filter((source) => source.isEnabled)
        .slice(0, 8)
        .map((source) => source.id),
    [preferencesQuery.data?.sources],
  );

  const completeMutation = useMutation({
    mutationFn: () =>
      api.onboarding.complete({
        topics: topics
          .split(',')
          .map((topic) => topic.trim())
          .filter(Boolean),
        sourceIds,
        frequency: 'DAILY',
        deliveryTime: '08:00',
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        deliveryEmail,
        sendSampleDigest: true,
      }),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
      void navigate('/dashboard');
    },
  });

  return (
    <div className="grid gap-4 rounded-2xl bg-white p-5 shadow-sm">
      <h2 className="text-xl font-semibold">Onboarding Wizard</h2>
      <p className="text-sm text-slate-600">Set interests, source selections, schedule, and send a sample digest.</p>
      <label className="grid gap-1 text-sm">
        Topics (comma separated)
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={topics}
          onChange={(event) => setTopics(event.target.value)}
        />
      </label>
      <label className="grid gap-1 text-sm">
        Delivery email
        <input
          className="rounded-lg border border-slate-300 px-3 py-2"
          value={deliveryEmail}
          onChange={(event) => setDeliveryEmail(event.target.value)}
          placeholder="you@company.com"
          type="email"
        />
      </label>
      <p className="text-xs text-slate-500">Enabled default sources selected: {sourceIds.length}</p>
      <button
        className="w-fit rounded-full bg-sky-600 px-4 py-2 text-white"
        onClick={() => completeMutation.mutate()}
        disabled={!deliveryEmail || completeMutation.isPending}
      >
        {completeMutation.isPending ? 'Completing...' : 'Complete onboarding + send sample'}
      </button>
    </div>
  );
}

function SettingsPage() {
  const queryClient = useQueryClient();
  const preferencesQuery = usePreferences();
  const [newKeyword, setNewKeyword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [customSourceName, setCustomSourceName] = useState('');
  const [customSourceValue, setCustomSourceValue] = useState('');

  const settingsMutation = useMutation({
    mutationFn: (input: Partial<PreferencesBundle['preferences']>) => api.preferences.update(input),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['preferences'] });
    },
  });

  if (!preferencesQuery.data) {
    return <div className="rounded-2xl bg-white p-5">Loading preferences...</div>;
  }

  const data = preferencesQuery.data;

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-lg font-semibold">Schedule & Digest</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-4">
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={data.preferences.frequency}
            onChange={(event) => settingsMutation.mutate({ frequency: event.target.value as PreferencesBundle['preferences']['frequency'] })}
          >
            <option value="DAILY">Daily</option>
            <option value="TWICE_DAILY">Twice daily</option>
            <option value="WEEKLY">Weekly</option>
            <option value="WEEKDAY_ONLY">Weekday only</option>
          </select>
          <input
            type="time"
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={data.preferences.deliveryTime}
            onChange={(event) => settingsMutation.mutate({ deliveryTime: event.target.value })}
          />
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={data.preferences.digestLength}
            onChange={(event) => settingsMutation.mutate({ digestLength: event.target.value as PreferencesBundle['preferences']['digestLength'] })}
          >
            <option value="BRIEF">Brief (5)</option>
            <option value="STANDARD">Standard (10)</option>
            <option value="COMPREHENSIVE">Comprehensive (20)</option>
          </select>
          <select
            className="rounded-lg border border-slate-300 px-3 py-2"
            value={data.preferences.summaryDepth}
            onChange={(event) => settingsMutation.mutate({ summaryDepth: event.target.value as PreferencesBundle['preferences']['summaryDepth'] })}
          >
            <option value="HEADLINES">Headlines</option>
            <option value="SHORT">Short</option>
            <option value="DETAILED">Detailed</option>
          </select>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-lg font-semibold">Delivery Emails</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.deliveryEmails.map((email) => (
            <button
              key={email.id}
              className={`rounded-full px-3 py-1 text-sm ${email.isPrimary ? 'bg-sky-600 text-white' : 'bg-slate-200 text-slate-800'}`}
              onClick={() =>
                void api.preferences
                  .setPrimaryDeliveryEmail(email.id)
                  .then(() => queryClient.invalidateQueries({ queryKey: ['preferences'] }))
              }
            >
              {email.email}
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            type="email"
            value={newEmail}
            onChange={(event) => setNewEmail(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Add delivery email"
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={() =>
              void api.preferences
                .addDeliveryEmail(newEmail)
                .then(async () => {
                  setNewEmail('');
                  await queryClient.invalidateQueries({ queryKey: ['preferences'] });
                })
            }
          >
            Add
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-lg font-semibold">Keywords</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {data.keywords.map((keyword) => (
            <button
              key={keyword.id}
              className="rounded-full bg-slate-200 px-3 py-1 text-sm"
              onClick={() =>
                void api.preferences
                  .removeKeyword(keyword.id)
                  .then(() => queryClient.invalidateQueries({ queryKey: ['preferences'] }))
              }
            >
              {keyword.keyword} ×
            </button>
          ))}
        </div>
        <div className="mt-3 flex gap-2">
          <input
            value={newKeyword}
            onChange={(event) => setNewKeyword(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Add topic keyword"
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={() =>
              void api.preferences
                .addKeyword(newKeyword)
                .then(async () => {
                  setNewKeyword('');
                  await queryClient.invalidateQueries({ queryKey: ['preferences'] });
                })
            }
          >
            Add
          </button>
        </div>
      </section>

      <section className="rounded-2xl bg-white p-5">
        <h2 className="text-lg font-semibold">Sources</h2>
        <div className="mt-3 grid gap-2 md:grid-cols-2">
          {data.sources.map((source) => (
            <label key={source.id} className="flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2 text-sm">
              <input
                type="checkbox"
                checked={source.isEnabled}
                onChange={(event) =>
                  void api.preferences
                    .toggleSource(source.id, event.target.checked)
                    .then(() => queryClient.invalidateQueries({ queryKey: ['preferences'] }))
                }
              />
              <span>{source.name}</span>
              <span className="ml-auto text-xs text-slate-500">{source.category}</span>
            </label>
          ))}
        </div>
        <div className="mt-4 grid gap-2 md:grid-cols-4">
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Custom source name"
            value={customSourceName}
            onChange={(event) => setCustomSourceName(event.target.value)}
          />
          <select className="rounded-lg border border-slate-300 px-3 py-2" defaultValue="RSS" id="custom-source-type">
            <option value="RSS">RSS</option>
            <option value="URL">URL</option>
            <option value="KEYWORD">Keyword</option>
          </select>
          <input
            className="rounded-lg border border-slate-300 px-3 py-2"
            placeholder="Feed URL / keyword"
            value={customSourceValue}
            onChange={(event) => setCustomSourceValue(event.target.value)}
          />
          <button
            className="rounded-lg bg-slate-900 px-4 py-2 text-white"
            onClick={() => {
              const typeInput = document.getElementById('custom-source-type') as HTMLSelectElement;
              void api.preferences
                .addCustomSource({
                  name: customSourceName,
                  type: typeInput.value as 'RSS' | 'URL' | 'KEYWORD',
                  value: customSourceValue,
                })
                .then(async () => {
                  setCustomSourceName('');
                  setCustomSourceValue('');
                  await queryClient.invalidateQueries({ queryKey: ['preferences'] });
                });
            }}
          >
            Add custom source
          </button>
        </div>
      </section>
    </div>
  );
}

function DashboardPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const digestsQuery = useQuery({
    queryKey: ['digests', search],
    queryFn: () => api.digests.list(search || undefined),
  });
  const analyticsQuery = useQuery({
    queryKey: ['analytics'],
    queryFn: () => api.analytics.get(),
  });

  const generateMutation = useMutation({
    mutationFn: () => api.digests.generate(),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['digests'] });
      await queryClient.invalidateQueries({ queryKey: ['analytics'] });
    },
  });

  return (
    <div className="grid gap-4">
      <section className="rounded-2xl bg-white p-5">
        <div className="flex flex-wrap items-center gap-3">
          <input
            className="min-w-64 flex-1 rounded-xl border border-slate-300 px-3 py-2"
            placeholder="Search past digests"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
          <button
            className="rounded-full bg-sky-600 px-4 py-2 text-white"
            onClick={() => generateMutation.mutate()}
            disabled={generateMutation.isPending}
          >
            {generateMutation.isPending ? 'Generating...' : 'Generate digest now'}
          </button>
        </div>
      </section>

      <section className="grid gap-3 md:grid-cols-4">
        <StatCard label="Read" value={analyticsQuery.data?.readCount ?? 0} />
        <StatCard label="Bookmarks" value={analyticsQuery.data?.bookmarkCount ?? 0} />
        <StatCard label="Streak" value={analyticsQuery.data?.streakDays ?? 0} suffix="days" />
        <StatCard label="Digests" value={digestsQuery.data?.length ?? 0} />
      </section>

      <section className="grid gap-4">
        {digestsQuery.data?.map((digest) => (
          <article key={digest.id} className="rounded-2xl bg-white p-5 shadow-sm">
            <header className="mb-3 flex flex-wrap items-center gap-2 text-sm text-slate-600">
              <strong className="text-slate-900">Digest</strong>
              <span>{new Date(digest.generatedAt).toLocaleString()}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs">{digest.status}</span>
            </header>
            <ul className="grid gap-3">
              {digest.items.map((item) => (
                <li key={item.id} className="rounded-xl border border-slate-200 p-3">
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="font-semibold text-sky-700"
                    onClick={() => void api.digests.track('CLICK', item.id)}
                  >
                    {item.title}
                  </a>
                  <p className="mt-1 text-xs text-slate-500">{item.sourceLabel}</p>
                  <p className="mt-1 text-sm text-slate-700">{item.summary}</p>
                  <div className="mt-2 flex gap-2 text-xs">
                    <button
                      className="rounded-full bg-slate-900 px-2 py-1 text-white"
                      onClick={() => void api.digests.markRead(item.id)}
                    >
                      Mark read
                    </button>
                    <button
                      className="rounded-full bg-slate-200 px-2 py-1"
                      onClick={() =>
                        void (item.isBookmarked
                          ? api.digests.unbookmark(item.id)
                          : api.digests.bookmark(item.id)).then(() =>
                          queryClient.invalidateQueries({ queryKey: ['digests'] }),
                        )
                      }
                    >
                      {item.isBookmarked ? 'Unbookmark' : 'Bookmark'}
                    </button>
                    <button
                      className="rounded-full bg-slate-200 px-2 py-1"
                      onClick={() => {
                        void navigator.clipboard
                          .writeText(item.url)
                          .then(() => api.digests.track('SHARE', item.id));
                      }}
                    >
                      Share link
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </article>
        ))}
      </section>
    </div>
  );
}

function StatCard({ label, value, suffix }: { label: string; value: number; suffix?: string }) {
  return (
    <article className="rounded-2xl bg-white p-4">
      <p className="text-xs uppercase tracking-[0.2em] text-slate-500">{label}</p>
      <p className="mt-2 text-2xl font-bold">
        {value}
        {suffix ? <span className="ml-1 text-sm font-normal text-slate-500">{suffix}</span> : null}
      </p>
    </article>
  );
}

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  return <>{children}</>;
}

export function App() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/auth" element={user ? <Navigate to="/dashboard" replace /> : <AuthPage />} />
      <Route
        path="/*"
        element={
          <ProtectedRoute>
            <Shell>
              <Routes>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/settings" element={<SettingsPage />} />
                <Route path="/onboarding" element={<OnboardingPage />} />
                <Route path="*" element={<Navigate to="/dashboard" replace />} />
              </Routes>
            </Shell>
          </ProtectedRoute>
        }
      />
    </Routes>
  );
}
