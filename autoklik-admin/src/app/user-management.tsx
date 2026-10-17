'use client';

import { useEffect, useRef, useState } from 'react';
import { displayDate as date, request } from './admin-client';

type DealerProfile = { businessName: string; registrationNumber: string; address: string; website: string };
type User = { id: number; username: string; email: string; phone: string | null; firstName: string | null; lastName: string | null; city: string | null; country: string | null; role: string; accountStatus: string; restrictionReason: string | null; passwordResetRequired: boolean; sellerVerified: boolean; badges: string[]; dealerStatus: string; dealerProfile: DealerProfile | null; moderationVersion: number; dateCreated: string };
type Detail = User & { counts: { ads: number; messagesSent: number; reportsAgainst: number; confirmedViolations: number; sanctions: number }; ads: { id: number; title: string; status: string }[]; reports: { id: number; reason: string; status: string; violationConfirmed: boolean }[]; loginHistory: { action: string; ip: string | null; createdAt: string }[]; sessions: { createdAt: string; expiresAt: string; ip: string; userAgent: string }[]; decisions: { id: number; actorId: number; action: string; reason: string; createdAt: string }[] };
const empty = { search: '', role: '', status: '', from: '', to: '', dealer: '' };
const roles = ['user', 'dealer', 'moderator', 'admin'];
const statuses: Record<string, string> = { active: 'Aktivan', suspended: 'Suspendiran', banned: 'Zabranjen', deleted: 'Izbrisan' };

export function UserManagement({ token, role, initialUserId, openAd }: { token: string; role: string; initialUserId?: number; openAd: (id: number) => void }) {
  const [filters, setFilters] = useState(empty);
  const [page, setPage] = useState(1);
  const [list, setList] = useState<{ items: User[]; total: number; pageSize: number } | null>(null);
  const [selected, setSelected] = useState<Detail | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [revision, setRevision] = useState(0);
  const sequence = useRef(0);
  const dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const query = new URLSearchParams({ page: String(page) });
        Object.entries(filters).forEach(([key, value]) => { if (value) query.set(key, value); });
        setList(await request(token, `/admin/users?${query}`, { signal: controller.signal })); setError('');
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Dohvat nije uspio.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    const timer = setTimeout(() => void load(), 200);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [token, page, filters, revision]);
  useEffect(() => {
    if (!initialUserId) return;
    let cancelled = false;
    async function load() { try { const user = await request<Detail>(token, `/admin/users/${initialUserId}`); if (!cancelled) setSelected(user); } catch (cause) { if (!cancelled) setError(cause instanceof Error ? cause.message : 'Profil nije dostupan.'); } }
    void load(); return () => { cancelled = true; };
  }, [token, initialUserId]);
  useEffect(() => { if (selected) dialog.current?.showModal(); }, [selected]);
  const filter = (key: keyof typeof empty, value: string) => { setFilters(current => ({ ...current, [key]: value })); setPage(1); };
  async function open(id: number) {
    const current = ++sequence.current;
    try { const user = await request<Detail>(token, `/admin/users/${id}`); if (current === sequence.current) { setSelected(user); setError(''); setNotice(''); } }
    catch (cause) { if (current === sequence.current) setError(cause instanceof Error ? cause.message : 'Profil nije dostupan.'); }
  }
  async function change(body: Record<string, unknown>, erase = false) {
    if (!selected || busy) return;
    setBusy(true); setError(''); setNotice('');
    try {
      const result = await request<Detail & { message?: string }>(token, `/admin/users/${selected.id}${erase ? '/erase' : ''}`, { method: erase ? 'POST' : 'PATCH', body: JSON.stringify({ ...body, version: selected.moderationVersion }) });
      if (erase) setSelected(null); else setSelected(result);
      setNotice(erase ? result.message ?? 'Podaci računa su izbrisani.' : 'Promjena je spremljena.'); setRevision(current => current + 1);
    } catch (cause) { setError(cause instanceof Error ? cause.message : 'Spremanje nije uspjelo.'); }
    finally { setBusy(false); }
  }
  return (
    <>
      {error && (
        <p
          className="notice error"
          role="alert"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          className="notice"
          role="status"
        >
          {notice}
        </p>
      )}
      <div className="toolbar">
        <label className="search-field">
          <input
            aria-label="Pretraži korisnike"
            value={filters.search}
            placeholder="Ime, e-mail ili ID…"
            onChange={event => filter('search', event.target.value)}
          />
        </label>
        <select
          aria-label="Uloga korisnika"
          value={filters.role}
          onChange={event => filter('role', event.target.value)}
        >
          <option value="">Sve uloge</option>
          {roles.map(role => (
            <option key={role}>{role}</option>
          ))}
        </select>
        <select
          aria-label="Status korisnika"
          value={filters.status}
          onChange={event => filter('status', event.target.value)}
        >
          <option value="">Svi statusi</option>
          {Object.entries(statuses).map(([value, label]) => (
            <option
              key={value}
              value={value}
            >
              {label}
            </option>
          ))}
        </select>
        <select
          aria-label="Status trgovca"
          value={filters.dealer}
          onChange={event => filter('dealer', event.target.value)}
        >
          <option value="">Svi trgovci</option>
          <option value="pending">Čeka odobrenje</option>
          <option value="approved">Odobren</option>
          <option value="rejected">Odbijen</option>
        </select>
        <label className="date-filter">
          Registriran od
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
        <button
          className="outline-button"
          onClick={() => {
            setFilters(empty);
            setPage(1);
          }}
        >
          Poništi filtre
        </button>
        <button
          className="outline-button"
          disabled={loading}
          onClick={() => setRevision(current => current + 1)}
        >
          Osvježi korisnike
        </button>
      </div>
      {loading && <p role="status">Učitavanje korisnika…</p>}
      <section className="panel">
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th>Korisnik</th>
                <th>Uloga</th>
                <th>Status</th>
                <th>Registriran</th>
                <th>Potvrde</th>
              </tr>
            </thead>
            <tbody>
              {list?.items.map(user => (
                <tr key={user.id}>
                  <td>
                    <button
                      className="ad-title"
                      onClick={() => void open(user.id)}
                    >
                      <span>
                        <strong>{user.username}</strong>
                        <small>
                          #{user.id} · {user.email}
                        </small>
                      </span>
                    </button>
                  </td>
                  <td>{user.role}</td>
                  <td>
                    {statuses[user.accountStatus]}
                    {user.passwordResetRequired && ' · promjena lozinke'}
                  </td>
                  <td>{date(user.dateCreated)}</td>
                  <td>
                    {user.sellerVerified && 'Provjeren prodavatelj · '}
                    {user.dealerStatus === 'approved' && 'Odobren trgovac · '}
                    {user.badges.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {list && !list.items.length && <p className="empty">Nema korisnika za odabrane filtre.</p>}
        </div>
        <div className="panel-footer">
          <span>
            {list?.total ?? 0} korisnika · stranica {page}
          </span>
          <div>
            <button
              className="outline-button"
              disabled={page === 1 || loading}
              onClick={() => setPage(current => current - 1)}
            >
              Prethodna
            </button>
            <button
              className="outline-button"
              disabled={!list || page * list.pageSize >= list.total || loading}
              onClick={() => setPage(current => current + 1)}
            >
              Sljedeća
            </button>
          </div>
        </div>
      </section>
      {selected && (
        <dialog
          ref={dialog}
          className="details-dialog"
          aria-label={`Profil korisnika ${selected.id}`}
          onCancel={event => {
            if (busy) event.preventDefault();
            else setSelected(null);
          }}
          onClose={() => setSelected(null)}
        >
          <div className="dialog-header">
            <h2>
              {selected.username} · #{selected.id}
            </h2>
            <button
              className="outline-button"
              disabled={busy}
              onClick={() => {
                ++sequence.current;
                setSelected(null);
              }}
            >
              Zatvori profil
            </button>
          </div>
          <p>
            {selected.email} · {selected.phone ?? 'Bez telefona'}
          </p>
          <p>
            {[selected.firstName, selected.lastName, selected.city, selected.country]
              .filter(Boolean)
              .join(' · ')}
          </p>
          <p>
            {selected.role} · {statuses[selected.accountStatus]} · {selected.restrictionReason}
          </p>
          {error && (
            <p
              className="error"
              role="alert"
            >
              {error}
            </p>
          )}
          {notice && <p role="status">{notice}</p>}
          <div className="stats-grid">
            {Object.entries({
              Oglasi: selected.counts.ads,
              Poruke: selected.counts.messagesSent,
              Prijave: selected.counts.reportsAgainst,
              'Potvrđena kršenja': selected.counts.confirmedViolations,
              Sankcije: selected.counts.sanctions,
            }).map(([label, value]) => (
              <article
                className="stat-card"
                key={label}
              >
                <span>{label}</span>
                <strong className="stat-value">{value}</strong>
              </article>
            ))}
          </div>
          {selected.accountStatus !== 'deleted' && (
            <UserActions
              key={`${selected.id}-${selected.moderationVersion}`}
              user={selected}
              role={role}
              busy={busy}
              change={change}
            />
          )}
          <section className="context-section">
            <h3>Oglasi (do 100)</h3>
            {selected.ads.map(ad => (
              <button
                key={ad.id}
                className="text-link"
                disabled={busy}
                onClick={() => {
                  setSelected(null);
                  openAd(ad.id);
                }}
              >
                #{ad.id} · {ad.title} · {ad.status}
              </button>
            ))}
            <h3>Prijave protiv korisnika (do 100)</h3>
            {selected.reports.map(report => (
              <p key={report.id}>
                #{report.id} · {report.reason} · {report.status}
                {report.violationConfirmed && ' · potvrđeno kršenje'}
              </p>
            ))}
            <h3>Povijest prijava i odjava (do 100)</h3>
            {selected.loginHistory.length ? (
              selected.loginHistory.map((entry, index) => (
                <p key={index}>
                  {date(entry.createdAt)} · {entry.action} · {entry.ip ?? 'IP nije zabilježen'}
                </p>
              ))
            ) : (
              <p>Nema zabilježene povijesti.</p>
            )}
            <h3>Sesije (do 100)</h3>
            {selected.sessions.map((entry, index) => (
              <p key={index}>
                {date(entry.createdAt)} – {date(entry.expiresAt)} · {entry.ip} · {entry.userAgent}
              </p>
            ))}
            <h3>Radnje osoblja (do 100)</h3>
            {selected.decisions.map(entry => (
              <p key={entry.id}>
                {date(entry.createdAt)} · #{entry.actorId} · {entry.action} · {entry.reason}
              </p>
            ))}
          </section>
        </dialog>
      )}
    </>
  );
}

function UserActions({ user, role, busy, change }: { user: User; role: string; busy: boolean; change: (body: Record<string, unknown>, erase?: boolean) => Promise<void> }) {
  const [action, setAction] = useState('suspend');
  const [reason, setReason] = useState('');
  const [newRole, setRole] = useState(user.role);
  const [verified, setVerified] = useState(user.sellerVerified);
  const [badges, setBadges] = useState(user.badges);
  const [dealerStatus, setDealerStatus] = useState(user.dealerStatus === 'none' ? 'pending' : user.dealerStatus);
  const [profile, setProfile] = useState(user.dealerProfile ?? { businessName: '', registrationNumber: '', address: '', website: '' });
  const [confirmation, setConfirmation] = useState('');
  if (role !== 'admin' && ['admin', 'moderator'].includes(user.role)) return (
    <p>Račune osoblja mijenja administrator.</p>
  );
  return (
    <section className="context-section">
      <form
        className="moderation-form"
        onSubmit={event => {
          event.preventDefault();
          if (
            ['ban', 'suspend', 'force_reset', 'role'].includes(action) &&
            !window.confirm('Potvrditi promjenu pristupa ovom računu?')
          )
            return;
          const body: Record<string, unknown> = { action, reason };
          if (action === 'role') body.role = newRole;
          if (action === 'verify') body.verified = verified;
          if (action === 'badges') body.badges = badges;
          if (action === 'dealer') {
            body.dealerStatus = dealerStatus;
            body.dealerProfile = profile;
          }
          void change(body);
        }}
      >
        <h3>Upravljanje računom</h3>
        <label>
          Radnja
          <select
            value={action}
            onChange={event => setAction(event.target.value)}
          >
            <option value="suspend">Suspendiraj</option>
            <option value="reactivate">Aktiviraj suspendirani račun</option>
            <option value="ban">Zabrani račun</option>
            <option value="unban">Ukloni zabranu</option>
            <option value="verify">Provjeri prodavatelja</option>
            <option value="badges">Uredi oznake</option>
            <option value="dealer">Odobri / uredi trgovca</option>
            {role === 'admin' && (
              <>
                <option value="role">Promijeni ulogu</option>
                <option value="force_reset">Zahtijevaj promjenu lozinke</option>
              </>
            )}
          </select>
        </label>
        {action === 'role' && (
          <select
            aria-label="Nova uloga"
            value={newRole}
            onChange={event => setRole(event.target.value)}
          >
            {roles.map(role => (
              <option key={role}>{role}</option>
            ))}
          </select>
        )}
        {action === 'verify' && (
          <label>
            <input
              type="checkbox"
              checked={verified}
              onChange={event => setVerified(event.target.checked)}
            />
            Provjeren prodavatelj
          </label>
        )}
        {action === 'badges' &&
          ['trusted', 'professional', 'longstanding'].map(badge => (
            <label key={badge}>
              <input
                type="checkbox"
                checked={badges.includes(badge)}
                onChange={event =>
                  setBadges(current =>
                    event.target.checked ? [...current, badge] : current.filter(value => value !== badge)
                  )
                }
              />
              {badge}
            </label>
          ))}
        {action === 'dealer' && (
          <>
            <label>
              Status trgovca
              <select
                value={dealerStatus}
                onChange={event => setDealerStatus(event.target.value)}
              >
                <option value="pending">Na čekanju</option>
                <option value="approved">Odobren</option>
                <option value="rejected">Odbijen</option>
              </select>
            </label>
            {(['businessName', 'registrationNumber', 'address', 'website'] as const).map((key, index) => (
              <label key={key}>
                {['Naziv tvrtke', 'Registracijski broj', 'Adresa', 'Web stranica'][index]}
                <input
                  required={key !== 'website'}
                  value={profile[key]}
                  maxLength={key === 'website' ? 500 : 200}
                  onChange={event => setProfile(current => ({ ...current, [key]: event.target.value }))}
                />
              </label>
            ))}
          </>
        )}
        {action === 'force_reset' && (
          <p>
            Sve sesije se opozivaju. Korisnik mora promijeniti lozinku putem postojeće stranice za oporavak
            lozinke.
          </p>
        )}
        <label>
          Razlog
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
          Spremi promjenu
        </button>
      </form>
      {role === 'admin' && (
        <details className="context-section">
          <summary>Brisanje podataka računa (GDPR)</summary>
          <p>
            Identitet, oglasi i vlastiti sadržaj poruka bit će izbrisani. Poruke drugih sudionika ostaju
            povezane s anonimnim zapisom. Ova radnja nije povratna.
          </p>
          <label>
            Upišite korisničko ime za potvrdu
            <input
              value={confirmation}
              onChange={event => setConfirmation(event.target.value)}
            />
          </label>
          <p>Koristi se razlog iz obrasca iznad.</p>
          <button
            className="outline-button"
            disabled={busy || confirmation !== user.username || !reason.trim()}
            onClick={() => {
              if (window.confirm('Trajno izbrisati podatke ovog računa?'))
                void change({ confirmation, reason }, true);
            }}
          >
            Izbriši podatke računa
          </button>
        </details>
      )}
    </section>
  );
}
