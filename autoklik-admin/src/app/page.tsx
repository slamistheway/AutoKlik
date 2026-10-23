'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { Activity, Ad, AdList, Dashboard, Detail } from './admin-types';
import { API, ADMIN_SESSION, ApiError, request, sessionEnded } from './admin-client';
import { UserManagement } from './user-management';
import { ReportsSafety } from './reports-safety';

const iconPaths = {
  grid: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
  car: 'M5 17H3v-6l2-6h14l2 6v6h-2 M5 17h14 M5 17v3 M19 17v3 M3 11h18 M7 14h.01 M17 14h.01',
  users: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2 M16 3a4 4 0 0 1 0 8 M22 21v-2a4 4 0 0 0-3-3.87 M13 7a4 4 0 1 1-8 0a4 4 0 0 1 8 0',
  flag: 'M4 22V3 M4 3c5-4 11 4 16 0v12c-5 4-11-4-16 0',
  activity: 'M3 12h4l3-8 4 16 3-8h4',
  search: 'M21 21l-5-5 M18 10a8 8 0 1 1-16 0a8 8 0 0 1 16 0',
  arrow: 'M5 12h14 M13 6l6 6-6 6',
  chevron: 'M9 5l7 7-7 7',
  clock: 'M12 8v4l3 2 M22 12a10 10 0 1 1-20 0a10 10 0 0 1 20 0',
  check: 'M5 12l4 4L19 6',
  close: 'M6 6l12 12 M6 18L18 6',
  menu: 'M3 6h18 M3 12h18 M3 18h18',
  reset: 'M3 10a9 9 0 1 1 2 8 M3 3v7h7',
  shield: 'M12 2l8 4v6c0 5-8 10-8 10S4 17 4 12V6z M8 12l3 3 5-6',
  star: 'M12 3l2.8 5.7 6.2.9-4.5 4.4 1.1 6.2-5.6-3-5.6 3 1.1-6.2L3 9.6l6.2-.9z',
};

function Icon({ name, size = 20 }: { name: keyof typeof iconPaths; size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={iconPaths[name]} />
    </svg>
  );
}

const statusLabels: Record<string, string> = { active: 'Aktivan', sold: 'Prodano', hidden: 'Skriven', expired: 'Istekao', pending: 'Čeka odobrenje', approved: 'Odobren', rejected: 'Odbijen', changes: 'Potrebne izmjene', removed: 'Uklonjen' };
const navigation = [
  { id: 'overview', label: 'Pregled', icon: 'grid' }, { id: 'ads', label: 'Oglasi', icon: 'car' },
  { id: 'users', label: 'Korisnici', icon: 'users' },
  { id: 'reports', label: 'Prijave', icon: 'flag' }, { id: 'activity', label: 'Aktivnosti', icon: 'activity' },
] as const;
type Section = typeof navigation[number]['id'];
const emptyFilters = { search: '', status: '', brand: '', seller: '', from: '', to: '', reported: '' };
const editFields = [
  ['title', 'Naslov', 'text'], ['description', 'Opis', 'textarea'], ['vin', 'VIN', 'text'],
  ['category', 'Kategorija', 'text'], ['subcategory', 'Potkategorija', 'text'], ['brand', 'Marka', 'text'], ['model', 'Model', 'text'],
  ['price', 'Cijena (€)', 'number'], ['year', 'Godište', 'number'], ['kilometrage', 'Kilometraža', 'number'], ['enginePower', 'Snaga motora', 'number'],
  ['fuel', 'Gorivo', 'text'], ['condition', 'Stanje', 'text'], ['county', 'Županija', 'text'], ['sellerType', 'Vrsta prodavatelja', 'text'],
  ['buyOrLease', 'Kupnja / najam', 'text'], ['gearType', 'Mjenjač', 'text'], ['driveType', 'Pogon', 'text'], ['gearCount', 'Broj brzina', 'number'],
  ['fuelConsumption', 'Potrošnja', 'number'], ['warranty', 'Jamstvo', 'text'], ['color', 'Boja', 'text'], ['doorNumber', 'Broj vrata', 'number'],
  ['drivingLicence', 'Vozačka dozvola', 'text'], ['weight', 'Masa', 'number'], ['payload', 'Nosivost', 'number'], ['volume', 'Obujam', 'number'],
] as const;
const date = (value: string | null) => value ? new Date(value.endsWith('Z') || /[+-]\d\d:\d\d$/.test(value) ? value : value + 'Z').toLocaleString('hr-HR') : '—';
const euro = (value: string | null) => value === null ? '—' : `${new Intl.NumberFormat('hr-HR').format(Number(value))} €`;

function ActivityList({ items }: { items: Activity[] }) {
  return (
    <div className="activity-list">
      {items.length ? (
        items.map(item => (
          <article key={item.id}>
            <Icon name="activity" />
            <div>
              <strong>
                {item.actor ?? `Osoblje #${item.actorId ?? '—'}`} · {item.action}
                {item.adId ? ` · #${item.adId}` : ''}
              </strong>
              <p>{item.reason}</p>
              <details>
                <summary>Prije / poslije</summary>
                <pre>{JSON.stringify({ before: item.before, after: item.after }, null, 2)}</pre>
              </details>
            </div>
            <time>{date(item.createdAt)}</time>
          </article>
        ))
      ) : (
        <p className="empty">Nema administratorskih aktivnosti.</p>
      )}
    </div>
  );
}

export default function AdminPage() {
  const [token, setToken] = useState('');
  const [ready, setReady] = useState(false);
  const [role, setRole] = useState('');
  const [section, setSection] = useState<Section>('overview');
  const [period, setPeriod] = useState('week');
  const [metric, setMetric] = useState<'ads' | 'users' | 'messages'>('ads');
  const [filters, setFilters] = useState(emptyFilters);
  const [page, setPage] = useState(1);
  const [dashboard, setDashboard] = useState<Dashboard | null>(null);
  const [list, setList] = useState<AdList | null>(null);
  const [focusedUser, setFocusedUser] = useState<number | undefined>();
  const [reportType, setReportType] = useState('');
  const [reportStatus, setReportStatus] = useState('open');
  const [activity, setActivity] = useState<Activity[]>([]);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [checkedIds, setCheckedIds] = useState<number[]>([]);
  const [reason, setReason] = useState('');
  const [decision, setDecision] = useState('approve');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [showUsers, setShowUsers] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);
  const dialog = useRef<HTMLDialogElement>(null);
  const detailSequence = useRef(0);
  const [detailLoading, setDetailLoading] = useState(false);

  const clearSession = useCallback(() => {
    setToken(''); setRole(''); setSelected(null); setDashboard(null); setList(null); setActivity([]);
    setCheckedIds([]); setFocusedUser(undefined); setReason(''); setNotice(''); setMobileMenu(false);
    ++detailSequence.current;
  }, []);

  useEffect(() => {
    let cancelled = false;
    // Remove legacy browser-readable tokens without importing them into the new session.
    try { sessionStorage.removeItem('autoklik-admin-token'); } catch {}
    async function resume() {
      try {
        const response = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
        const me = await response.json() as { role?: string };
        if (!cancelled && response.ok && ['admin', 'moderator'].includes(me.role ?? '')) {
          setToken(ADMIN_SESSION); setRole(me.role!);
        }
      } catch { if (!cancelled) setError('Provjera pristupa nije dostupna.'); }
      finally { if (!cancelled) setReady(true); }
    }
    window.addEventListener('admin-session-ended', clearSession);
    void resume();
    return () => { cancelled = true; window.removeEventListener('admin-session-ended', clearSession); };
  }, [clearSession]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    let lastActivity = Date.now();
    let expiring = false;
    const activity = () => { lastActivity = Date.now(); };
    const events = ['pointerdown', 'keydown', 'touchstart', 'wheel'] as const;
    events.forEach(event => window.addEventListener(event, activity, { passive: true }));
    async function verify() {
      if (expiring) return;
      if (Date.now() - lastActivity >= 15 * 60 * 1000) {
        expiring = true;
        setBusy(true); clearSession();
        await fetch('/api/session', { method: 'DELETE', credentials: 'same-origin', redirect: 'error', signal: AbortSignal.timeout(15000) }).catch(() => undefined);
        setBusy(false);
        return;
      }
      try {
        const response = await fetch('/api/session', { cache: 'no-store', credentials: 'same-origin', redirect: 'error', signal: controller.signal });
        const me = await response.json() as { role?: string };
        if (controller.signal.aborted) return;
        if ([401, 403].includes(response.status)) sessionEnded();
        else if (response.ok && ['admin', 'moderator'].includes(me.role ?? '')) setRole(me.role!);
      } catch {}
    }
    const timer = window.setInterval(() => { void verify(); }, 30000);
    const visible = () => { if (document.visibilityState === 'visible') void verify(); };
    document.addEventListener('visibilitychange', visible);
    return () => { controller.abort(); clearInterval(timer); document.removeEventListener('visibilitychange', visible); events.forEach(event => window.removeEventListener(event, activity)); };
  }, [token, clearSession]);

  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const init = { signal: controller.signal };
        if (section === 'overview') setDashboard(await request<Dashboard>(token, `/admin/dashboard?period=${period}`, init));
        else if (section === 'ads') {
          const query = new URLSearchParams({ page: String(page) });
          Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
          setList(await request<AdList>(token, `/admin/ads?${query}`, init));
        }
        else if (section === 'activity') setActivity(await request<Activity[]>(token, '/admin/activity', init));
        if (!controller.signal.aborted) setError('');
      } catch (cause) {
        if (!controller.signal.aborted) {
          setError(cause instanceof Error ? cause.message : 'Dohvat nije uspio.');
          if (cause instanceof ApiError && [401, 403].includes(cause.status)) {
            clearSession();
          }
        }
      } finally { if (!controller.signal.aborted) setLoading(false); }
    }
    const timer = setTimeout(() => void load(), 200);
    const refresh = setInterval(() => void load(), 60000);
    return () => { clearTimeout(timer); clearInterval(refresh); controller.abort(); };
  }, [token, section, filters, page, period, reportType, reportStatus, revision, clearSession]);

  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);

  const openAd = useCallback(async (id: number) => {
    const sequence = ++detailSequence.current;
    setDetailLoading(true);
    try {
      const detail = await request<Detail>(token, `/admin/ads/${id}`);
      if (sequence === detailSequence.current) { setSelected(detail); setReason(''); setDecision('approve'); }
    } catch (cause) { if (sequence === detailSequence.current) setError(cause instanceof Error ? cause.message : 'Detalji nisu dostupni.'); }
    finally { if (sequence === detailSequence.current) setDetailLoading(false); }
  }, [token]);

  const closeAd = () => { ++detailSequence.current; setSelected(null); setDetailLoading(false); };
  const navigate = (next: Section) => { setSection(next); setCheckedIds([]); setMobileMenu(false); setError(''); };
  const filter = (key: keyof typeof emptyFilters, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); setCheckedIds([]); };
  const mutate = async (work: () => Promise<unknown>, success: string) => {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(success); setRevision(current => current + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Spremanje nije uspjelo.'); }
    finally { setBusy(false); }
  };

  const moderate = (ids: number[], action: string) => {
    if (!reason.trim() || !ids.length) return;
    if (['remove', 'reject'].includes(action) && !window.confirm(`Potvrdi radnju za ${ids.length} oglasa: ${action === 'remove' ? 'uklanjanje' : 'odbijanje'}?`)) return;
    void mutate(async () => {
      await request(token, '/admin/ads/moderate', { method: 'POST', body: JSON.stringify({ ids, decision: action, reason }) });
      setCheckedIds([]);
      if (selected && ids.includes(selected.id)) await openAd(selected.id);
      setReason('');
    }, 'Odluka je spremljena.');
  };

  async function login(form: HTMLFormElement) {
    const values = new FormData(form);
    await mutate(async () => {
      const response = await fetch('/api/session', { method: 'POST', credentials: 'same-origin', redirect: 'error', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ identifier: values.get('identifier'), password: values.get('password') }) });
      const result = await response.json() as { role?: string; message?: string };
      if (!response.ok) throw new Error(result.message ?? 'Prijava nije uspjela.');
      if (!['admin', 'moderator'].includes(result.role ?? '')) throw new Error('Potreban je pristup osoblja.');
      form.reset(); setRole(result.role!); setToken(ADMIN_SESSION);
    }, 'Prijavljeni ste.');
  }

  if (!ready) return (
    <main>
      <p role="status">Provjera pristupa…</p>
    </main>
  );
  if (!token) return (
    <main className="login-page">
      <form
        className="panel login-form"
        onSubmit={event => {
          event.preventDefault();
          void login(event.currentTarget);
        }}
      >
        <p className="eyebrow">AUTOKLIK ADMIN</p>
        <h1>Prijava osoblja</h1>
        <p>Pristup imaju administratori i moderatori.</p>
        <label>
          Korisničko ime ili e-mail
          <input
            name="identifier"
            required
            autoComplete="username"
            maxLength={255}
          />
        </label>
        <label>
          Lozinka
          <input
            name="password"
            type="password"
            required
            autoComplete="current-password"
          />
        </label>
        {error && <p role="alert">{error}</p>}
        <button
          className="primary-button"
          disabled={busy}
        >
          {busy ? 'Prijava…' : 'Prijavi se'}
        </button>
      </form>
    </main>
  );

  return (
    <div className="admin-app">
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <Link
          href="/"
          className="brand"
          onClick={event => {
            event.preventDefault();
            navigate('overview');
          }}
        >
          <span className="brand-icon">
            <Icon name="car" />
          </span>
          AutoKlik<span className="brand-dot">.</span>
        </Link>
        <span className="workspace-label">ADMINISTRACIJA</span>
        <nav aria-label="Administracijski izbornik">
          {navigation.map(item => (
            <button
              className={`nav-item ${section === item.id ? 'selected' : ''}`}
              aria-current={section === item.id ? 'page' : undefined}
              key={item.id}
              onClick={() => {
                setFocusedUser(undefined);
                navigate(item.id);
              }}
            >
              <Icon name={item.icon} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="prototype-note">
            <Icon name="shield" />
            <strong>{role === 'admin' ? 'Administrator' : 'Moderator'}</strong>
            <p>Odluke se spremaju i bilježe u evidenciji.</p>
          </div>
          <button
            className="admin-person"
            disabled={busy}
            onClick={() =>
              void mutate(async () => {
                await request(token, '/users/logout', { method: 'POST' });
                clearSession();
              }, 'Odjavljeni ste.')
            }
          >
            Odjavi se
          </button>
        </div>
      </aside>
      <div className="workspace">
        <header className="topbar">
          <div className="breadcrumbs">
            <button
              className="icon-button mobile-toggle"
              aria-label="Otvori izbornik"
              aria-expanded={mobileMenu}
              onClick={() => setMobileMenu(current => !current)}
            >
              <Icon name="menu" />
            </button>
            <span>Radni prostor</span>
            <Icon
              name="chevron"
              size={14}
            />
            <strong>{navigation.find(item => item.id === section)?.label}</strong>
          </div>
          <button
            className="outline-button"
            disabled={loading || busy}
            onClick={() => setRevision(current => current + 1)}
          >
            Osvježi
          </button>
        </header>
        <main>
          <div className="page-heading">
            <div>
              <p className="eyebrow">AUTOKLIK ADMIN</p>
              <h1>{navigation.find(item => item.id === section)?.label}</h1>
              <p>
                {section === 'users' || section === 'reports'
                  ? 'Stvarni podaci · osvježite prikaz nakon promjena'
                  : 'Stvarni podaci · automatsko osvježavanje svake minute'}
              </p>
            </div>
          </div>
          {error && (
            <div
              className="notice error"
              role="alert"
            >
              {error}
              <button
                className="icon-button"
                aria-label="Zatvori grešku"
                onClick={() => setError('')}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          {notice && (
            <div
              className="notice"
              role="status"
            >
              {notice}
              <button
                className="icon-button"
                aria-label="Zatvori obavijest"
                onClick={() => setNotice('')}
              >
                <Icon name="close" />
              </button>
            </div>
          )}
          {(loading || detailLoading) && <p role="status">Učitavanje…</p>}

          {section === 'overview' && dashboard && (
            <>
              <div className="work-queues">
                <button
                  className="outline-button"
                  onClick={() => {
                    setFilters({ ...emptyFilters, status: 'pending' });
                    setPage(1);
                    navigate('ads');
                  }}
                >
                  Čeka odobrenje <strong>{dashboard.queues.pendingAds}</strong>
                </button>
                <button
                  className="outline-button"
                  onClick={() => {
                    setReportType('');
                    setReportStatus('pending');
                    navigate('reports');
                  }}
                >
                  Otvorene prijave <strong>{dashboard.queues.openReports}</strong>
                </button>
                <button
                  className="outline-button"
                  onClick={() => {
                    setReportType('message');
                    setReportStatus('open');
                    navigate('reports');
                  }}
                >
                  Prijavljene poruke <strong>{dashboard.queues.flaggedMessages}</strong>
                </button>
                <button
                  className="outline-button"
                  onClick={() => setShowUsers(current => !current)}
                  aria-expanded={showUsers}
                >
                  Novi korisnici (24 h) <strong>{dashboard.queues.newUsers}</strong>
                </button>
              </div>
              {showUsers && (
                <section className="panel queue-users">
                  <h2>Novi korisnici · posljednja 24 sata</h2>
                  <p>Prikazano do 20 najnovijih registracija.</p>
                  {dashboard.newUsers.length ? (
                    dashboard.newUsers.map(user => (
                      <p key={user.id}>
                        #{user.id} · {user.username} · {date(user.createdAt)}
                      </p>
                    ))
                  ) : (
                    <p>Nema novih korisnika.</p>
                  )}
                </section>
              )}
              <div className="toolbar">
                <label>
                  Razdoblje{' '}
                  <select
                    aria-label="Razdoblje statistike"
                    value={period}
                    onChange={event => setPeriod(event.target.value)}
                  >
                    <option value="day">Dan</option>
                    <option value="week">Tjedan</option>
                    <option value="month">Mjesec (30 dana)</option>
                  </select>
                </label>
                <span className="period-note">Od {date(dashboard.since)} · grupiranje UTC</span>
              </div>
              <div className="stats-grid">
                {[
                  ['Novi oglasi', dashboard.stats.newAds],
                  ['Aktivni oglasi', dashboard.stats.activeAds],
                  ['Novi korisnici', dashboard.stats.newUsers],
                  ['Poslane poruke', dashboard.stats.messagesSent],
                  ['Prodani oglasi', dashboard.stats.soldAds],
                  ['Istekli oglasi', dashboard.stats.expiredAds],
                  ['Ukupno oglasa', dashboard.stats.totalAds],
                  ['Ukupno korisnika', dashboard.stats.totalUsers],
                ].map(([label, value]) => (
                  <article
                    className="stat-card"
                    key={label}
                  >
                    <span className="stat-top">{label}</span>
                    <strong className="stat-value">{value}</strong>
                  </article>
                ))}
              </div>
              <section className="panel chart-panel">
                <div className="panel-heading">
                  <h2>Aktivnost kroz vrijeme</h2>
                  <select
                    aria-label="Podaci grafikona"
                    value={metric}
                    onChange={event => setMetric(event.target.value as typeof metric)}
                  >
                    <option value="ads">Novi oglasi</option>
                    <option value="users">Novi korisnici</option>
                    <option value="messages">Poruke</option>
                  </select>
                </div>
                <div
                  className="live-chart"
                  role="img"
                  aria-label={`${metric === 'ads' ? 'Novi oglasi' : metric === 'users' ? 'Novi korisnici' : 'Poruke'} po ${period === 'day' ? 'satu' : 'danu'}, UTC. Ukupno ${dashboard.chart.reduce((sum, point) => sum + point[metric], 0)}. Podaci su u tablici ispod.`}
                >
                  {dashboard.chart.map(point => (
                    <div
                      className="live-column"
                      key={point.at}
                      title={`${date(point.at)}: ${point[metric]}`}
                    >
                      <span>{point[metric]}</span>
                      <div
                        style={{
                          height: `${Math.max(1, (point[metric] / Math.max(1, ...dashboard.chart.map(item => item[metric]))) * 120)}px`,
                        }}
                      />
                      <small>
                        {new Date(point.at).toLocaleString(
                          'hr-HR',
                          period === 'day'
                            ? { hour: '2-digit', timeZone: 'UTC' }
                            : { day: 'numeric', month: 'numeric', timeZone: 'UTC' }
                        )}
                      </small>
                    </div>
                  ))}
                </div>
                <details className="chart-data">
                  <summary>Tablica podataka</summary>
                  <div className="table-scroll">
                    <table>
                      <thead>
                        <tr>
                          <th>Vrijeme (UTC)</th>
                          <th>Oglasi</th>
                          <th>Korisnici</th>
                          <th>Poruke</th>
                        </tr>
                      </thead>
                      <tbody>
                        {dashboard.chart.map(point => (
                          <tr key={point.at}>
                            <td>{new Date(point.at).toISOString()}</td>
                            <td>{point.ads}</td>
                            <td>{point.users}</td>
                            <td>{point.messages}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
                <p className="period-note">
                  Prodaja se prati od uvođenja ove evidencije; stariji datumi prodaje nisu poznati. Istekli:
                  oglasi kojima je rok istekao u razdoblju i nisu obnovljeni.
                </p>
              </section>
              <section className="panel">
                <div className="panel-heading">
                  <h2>Posljednje administratorske aktivnosti</h2>
                  <button
                    className="text-link"
                    onClick={() => navigate('activity')}
                  >
                    Sve aktivnosti
                  </button>
                </div>
                <ActivityList items={dashboard.activity.slice(0, 5)} />
              </section>
            </>
          )}

          {section === 'ads' && (
            <>
              <div className="toolbar">
                <label className="search-field">
                  <Icon name="search" />
                  <input
                    aria-label="Pretraži oglase"
                    placeholder="Naslov, ID, VIN ili prodavatelj…"
                    value={filters.search}
                    onChange={event => filter('search', event.target.value)}
                  />
                </label>
                <select
                  aria-label="Status"
                  value={filters.status}
                  onChange={event => filter('status', event.target.value)}
                >
                  <option value="">Svi statusi</option>
                  {['active', 'sold', 'hidden', 'expired', 'pending', 'rejected', 'changes', 'removed'].map(
                    value => (
                      <option
                        value={value}
                        key={value}
                      >
                        {statusLabels[value]}
                      </option>
                    )
                  )}
                </select>
                <select
                  aria-label="Marka"
                  value={filters.brand}
                  onChange={event => filter('brand', event.target.value)}
                >
                  <option value="">Sve marke</option>
                  {list?.brands.map(value => (
                    <option key={value}>{value}</option>
                  ))}
                </select>
                <select
                  aria-label="Prodavatelj"
                  value={filters.seller}
                  onChange={event => filter('seller', event.target.value)}
                >
                  <option value="">Svi prodavatelji</option>
                  {list?.sellers.map(seller => (
                    <option
                      key={seller.id}
                      value={seller.id}
                    >
                      {seller.name} (#{seller.id})
                    </option>
                  ))}
                </select>
                <label className="date-filter">
                  Od
                  <input
                    type="date"
                    value={filters.from}
                    max={filters.to || undefined}
                    onChange={event => filter('from', event.target.value)}
                  />
                </label>
                <label className="date-filter">
                  Do
                  <input
                    type="date"
                    value={filters.to}
                    min={filters.from || undefined}
                    onChange={event => filter('to', event.target.value)}
                  />
                </label>
                <label className="filter-check">
                  <input
                    type="checkbox"
                    checked={filters.reported === 'true'}
                    onChange={event => filter('reported', event.target.checked ? 'true' : '')}
                  />
                  Otvorene prijave
                </label>
                <button
                  className="outline-button"
                  onClick={() => {
                    setFilters(emptyFilters);
                    setPage(1);
                    setCheckedIds([]);
                  }}
                >
                  Poništi filtre
                </button>
              </div>
              <div className="toolbar bulk-toolbar">
                <span>{checkedIds.length} odabrano</span>
                <label>
                  Razlog radnje
                  <input
                    className="reason-input"
                    value={reason}
                    maxLength={1000}
                    onChange={event => setReason(event.target.value)}
                  />
                </label>
                <button
                  className="outline-button"
                  disabled={busy || loading || !checkedIds.length || !reason.trim()}
                  onClick={() => moderate(checkedIds, 'approve')}
                >
                  Odobri odabrane
                </button>
                <button
                  className="outline-button"
                  disabled={busy || loading || !checkedIds.length || !reason.trim()}
                  onClick={() => moderate(checkedIds, 'remove')}
                >
                  Ukloni odabrane
                </button>
              </div>
              <section className="panel">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>
                          <input
                            type="checkbox"
                            aria-label="Odaberi sve na stranici"
                            disabled={loading || busy}
                            checked={
                              !!list?.items.length && list.items.every(ad => checkedIds.includes(ad.id))
                            }
                            onChange={event =>
                              setCheckedIds(event.target.checked ? (list?.items.map(ad => ad.id) ?? []) : [])
                            }
                          />
                        </th>
                        <th>Oglas</th>
                        <th>Prodavatelj</th>
                        <th>Cijena</th>
                        <th>Status</th>
                        <th>Isticanje</th>
                        <th>Objavljen</th>
                      </tr>
                    </thead>
                    <tbody>
                      {list?.items.map(ad => (
                        <tr key={ad.id}>
                          <td>
                            <input
                              type="checkbox"
                              aria-label={`Odaberi oglas ${ad.id}`}
                              checked={checkedIds.includes(ad.id)}
                              disabled={loading || busy}
                              onChange={event =>
                                setCheckedIds(current =>
                                  event.target.checked
                                    ? [...current, ad.id]
                                    : current.filter(id => id !== ad.id)
                                )
                              }
                            />
                          </td>
                          <td>
                            <button
                              className="ad-title"
                              disabled={busy || detailLoading}
                              onClick={() => void openAd(ad.id)}
                            >
                              <span>
                                <strong>{ad.title ?? 'Bez naslova'}</strong>
                                <small>
                                  #{ad.id} · {ad.vin ?? 'VIN nije unesen'}
                                </small>
                              </span>
                            </button>
                          </td>
                          <td>
                            {ad.seller} (#{ad.userId})
                          </td>
                          <td>{euro(ad.price)}</td>
                          <td>
                            <span className={`badge ${ad.effectiveStatus}`}>
                              {statusLabels[ad.effectiveStatus] ?? ad.effectiveStatus}
                            </span>
                          </td>
                          <td>
                            {ad.pinned ? 'Prikvačen' : ''}
                            {ad.pinned && ad.featured ? ' · ' : ''}
                            {ad.featured ? 'Istaknut' : ''}
                          </td>
                          <td>{date(ad.dateCreated)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {list && !list.items.length && <p className="empty">Nema oglasa za odabrane filtre.</p>}
                </div>
                <div className="panel-footer">
                  <span>
                    {list?.total ?? 0} oglasa · stranica {page}
                  </span>
                  <div>
                    <button
                      className="outline-button"
                      disabled={page === 1 || loading}
                      onClick={() => {
                        setPage(current => current - 1);
                        setCheckedIds([]);
                      }}
                    >
                      Prethodna
                    </button>
                    <button
                      className="outline-button"
                      disabled={loading || !list || page * list.pageSize >= list.total}
                      onClick={() => {
                        setPage(current => current + 1);
                        setCheckedIds([]);
                      }}
                    >
                      Sljedeća
                    </button>
                  </div>
                </div>
              </section>
            </>
          )}

          {section === 'reports' && (
            <ReportsSafety
              token={token}
              role={role}
              initialType={reportType}
              initialStatus={reportStatus}
              openAd={id => void openAd(id)}
              openUser={id => {
                setFocusedUser(id);
                navigate('users');
              }}
            />
          )}
          {section === 'activity' && (
            <section className="panel">
              <ActivityList items={activity} />
            </section>
          )}
          {section === 'users' && (
            <UserManagement
              token={token}
              role={role}
              initialUserId={focusedUser}
              openAd={id => {
                navigate('ads');
                void openAd(id);
              }}
            />
          )}
          <footer className="workspace-footer">
            <span>AutoKlik Admin</span>
            <span>Novi oglasi objavljuju se odmah.</span>
          </footer>
        </main>
      </div>
      {selected && (
        <dialog
          ref={dialog}
          className="details-dialog"
          aria-label={`Detalji oglasa ${selected.id}`}
          onCancel={event => {
            if (busy) event.preventDefault();
            else closeAd();
          }}
          onClose={closeAd}
        >
          <div className="dialog-header">
            <span className="eyebrow">OGLAS #{selected.id}</span>
            <button
              className="icon-button"
              aria-label="Zatvori detalje"
              disabled={busy}
              onClick={closeAd}
            >
              <Icon name="close" />
            </button>
          </div>
          <h2>{selected.title}</h2>
          <p>
            {selected.seller} (#{selected.userId}) · {euro(selected.price)}
          </p>
          <span className={`badge ${selected.effectiveStatus}`}>
            {statusLabels[selected.effectiveStatus]}
          </span>
          {selected.moderationReason && <p>Posljednji razlog: {selected.moderationReason}</p>}
          {error && (
            <p
              className="error"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <form
            className="moderation-form"
            onSubmit={event => {
              event.preventDefault();
              moderate([selected.id], decision);
            }}
          >
            <label>
              Odluka
              <select
                value={decision}
                onChange={event => setDecision(event.target.value)}
              >
                <option value="approve">Odobri</option>
                <option value="reject">Odbij</option>
                <option value="changes">Zatraži izmjene</option>
                <option value="remove">Ukloni</option>
                <option value="restore">Vrati</option>
                <option value="pending">Stavi na pregled</option>
              </select>
            </label>
            <label>
              Razlog (obavezno)
              <textarea
                value={reason}
                required
                maxLength={1000}
                onChange={event => setReason(event.target.value)}
              />
            </label>
            <p className="period-note">
              Uklanjanje skriva oglas i može se poništiti vraćanjem. Vraćanje isteklog oglasa obnavlja rok na
              3 dana.
            </p>
            <button
              className="primary-button"
              disabled={busy || !reason.trim()}
            >
              Spremi odluku
            </button>
          </form>
          <AdEditor
            key={`${selected.id}-${selected.dateLastUpdated}`}
            ad={selected}
            busy={busy}
            save={(fields, reason) =>
              void mutate(async () => {
                const detail = await request<Detail>(token, `/admin/ads/${selected.id}`, {
                  method: 'PATCH',
                  body: JSON.stringify({ fields, reason, version: selected.dateLastUpdated }),
                });
                setSelected(detail);
              }, 'Izmjene su spremljene.')
            }
          />
          <section className="context-section">
            <h3>Fotografije</h3>
            <p>Za uklanjanje upišite razlog u polje odluke iznad.</p>
            <div className="photo-grid">
              {selected.photos.map(photo => (
                <div key={photo.id}>
                  <Image
                    unoptimized
                    width={240}
                    height={140}
                    src={`${API}/${photo.imageUrl}`}
                    alt={`Fotografija oglasa ${selected.id}`}
                  />
                  <button
                    className="outline-button"
                    disabled={busy || !reason.trim()}
                    onClick={() => {
                      if (window.confirm('Ukloniti ovu fotografiju iz oglasa?'))
                        void mutate(async () => {
                          const detail = await request<Detail>(
                            token,
                            `/admin/ads/${selected.id}/photos/${photo.id}/remove`,
                            {
                              method: 'POST',
                              body: JSON.stringify({ reason, version: selected.dateLastUpdated }),
                            }
                          );
                          setSelected(detail);
                        }, 'Fotografija je uklonjena iz oglasa.');
                    }}
                  >
                    Ukloni fotografiju
                  </button>
                </div>
              ))}
            </div>
            {!selected.photos.length && <p>Nema fotografija.</p>}
          </section>
          <section className="context-section">
            <h3>Mogući duplikati</h3>
            <p>
              Jednak VIN ili identične datoteke fotografija. Vizualno slične i izmijenjene fotografije nisu
              obuhvaćene.
            </p>
            {selected.duplicates.matches.map(ad => (
              <button
                className="text-link"
                key={ad.id}
                disabled={busy || detailLoading}
                onClick={() => void openAd(ad.id)}
              >
                #{ad.id} · {ad.title} · {ad.sameVin ? 'VIN' : ''} {ad.samePhoto ? 'Fotografija' : ''}
              </button>
            ))}
            {!selected.duplicates.matches.length && <p>Nema pronađenih duplikata.</p>}
            {selected.duplicates.unindexedPhotos > 0 && (
              <>
                <p>
                  {selected.duplicates.unindexedPhotos} fotografija još nema otisak. Nedostupne i vanjske
                  slike nije moguće indeksirati.
                </p>
                <button
                  className="outline-button"
                  disabled={busy}
                  onClick={() =>
                    void mutate(async () => {
                      let after = 0;
                      let done = false;
                      let indexed = 0;
                      while (!done) {
                        const batch = await request<{ next: number; done: boolean; indexed: number }>(
                          token,
                          '/admin/photos/index',
                          { method: 'POST', body: JSON.stringify({ after }) }
                        );
                        after = batch.next;
                        done = batch.done;
                        indexed += batch.indexed;
                        setNotice(`Indeksirano ${indexed} fotografija…`);
                      }
                      await openAd(selected.id);
                    }, 'Provjera fotografija je završena.')
                  }
                >
                  Indeksiraj postojeće fotografije
                </button>
              </>
            )}
          </section>
          <section className="context-section">
            <h3>Drugi oglasi prodavatelja (do 50)</h3>
            {selected.otherAds.map(ad => (
              <button
                className="text-link"
                key={ad.id}
                disabled={busy || detailLoading}
                onClick={() => void openAd(ad.id)}
              >
                #{ad.id} · {ad.title}
              </button>
            ))}
            {!selected.otherAds.length && <p>Nema drugih oglasa.</p>}
            <h3>Povijest prijava (do 100)</h3>
            {selected.reports.map(report => (
              <p key={report.id}>
                #{report.id} · {report.reason} · {report.status}
                {report.resolutionNote ? ` · ${report.resolutionNote}` : ''}
              </p>
            ))}
            {!selected.reports.length && <p>Nema prijava.</p>}
            <h3>Povijest odluka</h3>
            <ActivityList items={selected.decisions} />
          </section>
        </dialog>
      )}
    </div>
  );
}

function AdEditor({ ad, busy, save }: { ad: Ad; busy: boolean; save: (fields: Record<string, unknown>, reason: string) => void }) {
  const [fields, setFields] = useState<Record<string, string>>(() => Object.fromEntries(editFields.map(([key]) => [key, String(ad[key] ?? '')])));
  const [featured, setFeatured] = useState(!!ad.featured);
  const [pinned, setPinned] = useState(ad.pinned);
  const [reason, setReason] = useState('');
  return (
    <details className="context-section">
      <summary>Uredi podatke, isticanje i prikvačivanje</summary>
      <form
        className="moderation-form edit-form"
        onSubmit={event => {
          event.preventDefault();
          const changed: Record<string, unknown> = {};
          editFields.forEach(([key, , type]) => {
            if (fields[key] !== String(ad[key] ?? ''))
              changed[key] =
                type === 'number'
                  ? fields[key] === ''
                    ? null
                    : Number(fields[key])
                  : key === 'vin' && !fields[key]
                    ? null
                    : fields[key];
          });
          if (featured !== !!ad.featured) changed.featured = featured;
          if (pinned !== ad.pinned) changed.pinned = pinned;
          save(changed, reason);
        }}
      >
        {editFields.map(([key, label, type]) => (
          <label key={key}>
            {label}
            {type === 'textarea' ? (
              <textarea
                value={fields[key]}
                maxLength={10000}
                onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))}
              />
            ) : (
              <input
                type={type}
                value={fields[key]}
                min={key === 'year' ? 1886 : type === 'number' ? 0 : undefined}
                max={key === 'year' ? 2100 : undefined}
                step={
                  ['price', 'fuelConsumption'].includes(key) ? 'any' : type === 'number' ? '1' : undefined
                }
                maxLength={key === 'vin' ? 17 : 200}
                required={['title', 'category', 'brand', 'model', 'subcategory'].includes(key)}
                onChange={event => setFields(current => ({ ...current, [key]: event.target.value }))}
              />
            )}
          </label>
        ))}
        <label className="filter-check">
          <input
            type="checkbox"
            checked={featured}
            onChange={event => setFeatured(event.target.checked)}
          />
          Istaknuti oglas
        </label>
        <label className="filter-check">
          <input
            type="checkbox"
            checked={pinned}
            onChange={event => setPinned(event.target.checked)}
          />
          Prikvači na vrh najnovijih oglasa
        </label>
        <label>
          Razlog izmjene
          <textarea
            required
            maxLength={1000}
            value={reason}
            onChange={event => setReason(event.target.value)}
          />
        </label>
        <button
          className="primary-button"
          disabled={busy || !reason.trim()}
        >
          Spremi izmjene
        </button>
      </form>
    </details>
  );
}
