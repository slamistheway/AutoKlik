'use client';

import { useEffect, useState } from 'react';
import { displayDate as date, request } from './admin-client';
import type { Report } from './admin-types';

type Block = { id: number; kind: string; value: string; reason: string; active: boolean };
type Appeal = { appeal: { id: number; userId: number; reason: string; status: string; resolutionNote: string | null; createdAt: string }; username: string; accountStatus: string };
type Offender = { id: number; username: string; accountStatus: string; confirmedViolations: number; lastViolation: string };

export function ReportsSafety({ token, role, initialType, initialStatus, openAd, openUser }: { token: string; role: string; initialType: string; initialStatus: string; openAd: (id: number) => void; openUser: (id: number) => void }) {
  const [tab, setTab] = useState('reports');
  const [type, setType] = useState(initialType);
  const [status, setStatus] = useState(initialStatus);
  const [reports, setReports] = useState<Report[]>([]);
  const [blocks, setBlocks] = useState<Block[]>([]);
  const [appeals, setAppeals] = useState<Appeal[]>([]);
  const [offenders, setOffenders] = useState<Offender[]>([]);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(false);
  const [revision, setRevision] = useState(0);
  const [kind, setKind] = useState('email');
  const [value, setValue] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      try {
        const init = { signal: controller.signal };
        if (tab === 'reports') setReports(await request(token, `/admin/reports?status=${status}${type ? `&type=${type}` : ''}`, init));
        if (tab === 'blocks') setBlocks(await request(token, '/admin/safety/blocklist', init));
        if (tab === 'appeals') setAppeals(await request(token, '/admin/safety/appeals', init));
        if (tab === 'repeat') setOffenders(await request(token, '/admin/safety/repeat-offenders', init));
        setError('');
      } catch (cause) { if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : 'Dohvat nije uspio.'); }
      finally { if (!controller.signal.aborted) setLoading(false); }
    }
    void load(); return () => controller.abort();
  }, [token, tab, status, type, revision]);
  async function mutate(work: () => Promise<unknown>, message: string) {
    if (busy) return;
    setBusy(true); setError(''); setNotice('');
    try { await work(); setNotice(message); setRevision(current => current + 1); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Spremanje nije uspjelo.'); }
    finally { setBusy(false); }
  }
  return (
    <>
      <div className="toolbar safety-tabs">
        {[
          ['reports', 'Prijave'],
          ['blocks', 'Blokade'],
          ['appeals', 'Žalbe'],
          ['repeat', 'Ponovljena kršenja'],
        ].map(([id, label]) => (
          <button
            key={id}
            className="outline-button"
            aria-pressed={tab === id}
            onClick={() => setTab(id)}
          >
            {label}
          </button>
        ))}
        <button
          className="outline-button"
          disabled={loading || busy}
          onClick={() => setRevision(current => current + 1)}
        >
          Osvježi sigurnost
        </button>
      </div>
      {error && (
        <p
          role="alert"
          className="notice error"
        >
          {error}
        </p>
      )}
      {notice && (
        <p
          role="status"
          className="notice"
        >
          {notice}
        </p>
      )}
      {loading && <p role="status">Učitavanje…</p>}
      {tab === 'reports' && (
        <>
          <div className="toolbar">
            <select
              aria-label="Vrsta prijave"
              value={type}
              onChange={event => setType(event.target.value)}
            >
              <option value="">Sve prijave</option>
              <option value="ad">Oglasi</option>
              <option value="user">Korisnici</option>
              <option value="message">Poruke</option>
            </select>
            <select
              aria-label="Status prijave"
              value={status}
              onChange={event => setStatus(event.target.value)}
            >
              <option value="pending">Otvorene i eskalirane</option>
              <option value="open">Otvorene</option>
              <option value="escalated">Eskalirane</option>
              <option value="resolved">Riješene</option>
              <option value="dismissed">Odbačene</option>
              <option value="all">Svi statusi</option>
            </select>
            <span>
              Do 100 najnovijih prijava. Automatski signali služe za pregled, bez automatskih kazni.
            </span>
          </div>
          <div className="reports-list">
            {reports.map(report => (
              <ReportCard
                key={`${report.id}-${report.status}`}
                report={report}
                role={role}
                busy={busy}
                token={token}
                openAd={openAd}
                openUser={openUser}
                mutate={mutate}
              />
            ))}
            {!reports.length && !loading && <p className="empty">Nema prijava.</p>}
          </div>
        </>
      )}
      {tab === 'blocks' && (
        <>
          {role === 'admin' && (
            <button
              className="outline-button"
              disabled={busy}
              onClick={() =>
                void mutate(async () => {
                  const result = await request<{ pending: number }>(
                    token,
                    '/admin/safety/erasure-files/retry',
                    { method: 'POST' }
                  );
                  if (result.pending)
                    throw new Error(
                      `Preostaje ${result.pending} datoteka za brisanje. Provjerite dozvole datoteka i pokušajte ponovno.`
                    );
                }, 'Brisanje lokalnih datoteka je dovršeno.')
              }
            >
              Ponovi brisanje datoteka izbrisanih računa
            </button>
          )}
          <p>
            Točne podudarnosti normaliziranih e-mailova, telefona i IP adresa ograničavaju registraciju,
            prijavu i postojeće sesije. Do 200 zapisa.
          </p>
          {role === 'admin' && (
            <form
              className="panel safety-form"
              onSubmit={event => {
                event.preventDefault();
                if (window.confirm('Dodati ovu sigurnosnu blokadu?'))
                  void mutate(async () => {
                    await request(token, '/admin/safety/blocklist', {
                      method: 'POST',
                      body: JSON.stringify({ kind, value, reason, active: true }),
                    });
                    setValue('');
                    setReason('');
                  }, 'Blokada je spremljena.');
              }}
            >
              <select
                aria-label="Vrsta blokade"
                value={kind}
                onChange={event => setKind(event.target.value)}
              >
                <option value="email">E-mail</option>
                <option value="phone">Telefon</option>
                <option value="ip">IP adresa</option>
              </select>
              <label>
                Vrijednost
                <input
                  required
                  value={value}
                  maxLength={255}
                  onChange={event => setValue(event.target.value)}
                />
              </label>
              <label>
                Razlog
                <input
                  required
                  value={reason}
                  maxLength={1000}
                  onChange={event => setReason(event.target.value)}
                />
              </label>
              <button
                className="primary-button"
                disabled={busy || !reason.trim()}
              >
                Dodaj blokadu
              </button>
            </form>
          )}
          <section className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Vrsta</th>
                  <th>Vrijednost</th>
                  <th>Razlog</th>
                  <th>Status</th>
                  <th>Radnja</th>
                </tr>
              </thead>
              <tbody>
                {blocks.map(block => (
                  <tr key={block.id}>
                    <td>{block.kind}</td>
                    <td>{block.value}</td>
                    <td>{block.reason}</td>
                    <td>{block.active ? 'Aktivna' : 'Neaktivna'}</td>
                    <td>
                      {role === 'admin' && (
                        <button
                          className="outline-button"
                          disabled={busy}
                          onClick={() => {
                            const reason = window.prompt('Razlog promjene blokade:');
                            if (reason?.trim())
                              void mutate(
                                () =>
                                  request(token, '/admin/safety/blocklist', {
                                    method: 'POST',
                                    body: JSON.stringify({
                                      kind: block.kind,
                                      value: block.value,
                                      active: !block.active,
                                      reason,
                                    }),
                                  }),
                                'Blokada je promijenjena.'
                              );
                          }}
                        >
                          {block.active ? 'Deaktiviraj' : 'Aktiviraj'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        </>
      )}
      {tab === 'appeals' && (
        <>
          <p>
            Žalbe se podnose na javnoj stranici /appeal uz provjeru lozinke. Prihvaćanje vraća račun u aktivno
            stanje; zasebne blokade ostaju na snazi. Do 100 žalbi.
          </p>
          <div className="reports-list">
            {appeals.map(({ appeal, username, accountStatus }) => (
              <article
                className="panel safety-form"
                key={appeal.id}
              >
                <h2>
                  Žalba #{appeal.id} ·{' '}
                  <button
                    className="text-link"
                    onClick={() => openUser(appeal.userId)}
                  >
                    {username}
                  </button>
                </h2>
                <p>{appeal.reason}</p>
                <p>
                  {appeal.status} · {accountStatus} · {date(appeal.createdAt)}
                </p>
                {appeal.resolutionNote && <p>{appeal.resolutionNote}</p>}
                {appeal.status === 'open' && role === 'admin' && (
                  <div className="toolbar">
                    {[
                      ['accepted', 'Prihvati žalbu'],
                      ['rejected', 'Odbij žalbu'],
                    ].map(([status, label]) => (
                      <button
                        key={status}
                        className="outline-button"
                        disabled={busy}
                        onClick={() => {
                          const reason = window.prompt('Obrazloženje odluke:');
                          if (reason?.trim())
                            void mutate(
                              () =>
                                request(token, `/admin/safety/appeals/${appeal.id}`, {
                                  method: 'PATCH',
                                  body: JSON.stringify({ status, reason }),
                                }),
                              'Odluka o žalbi je spremljena.'
                            );
                        }}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            ))}
            {!appeals.length && !loading && <p className="empty">Nema žalbi.</p>}
          </div>
        </>
      )}
      {tab === 'repeat' && (
        <>
          <p>
            Korisnici s najmanje dva potvrđena kršenja. Sama prijava nije potvrđeno kršenje. Do 100 korisnika.
          </p>
          <section className="panel table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Korisnik</th>
                  <th>Status</th>
                  <th>Potvrđena kršenja</th>
                  <th>Posljednje kršenje</th>
                </tr>
              </thead>
              <tbody>
                {offenders.map(user => (
                  <tr key={user.id}>
                    <td>
                      <button
                        className="text-link"
                        onClick={() => openUser(user.id)}
                      >
                        #{user.id} · {user.username}
                      </button>
                    </td>
                    <td>{user.accountStatus}</td>
                    <td>{user.confirmedViolations}</td>
                    <td>{date(user.lastViolation)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {!offenders.length && !loading && <p className="empty">Nema ponovljenih potvrđenih kršenja.</p>}
          </section>
        </>
      )}
    </>
  );
}

function ReportCard({ report, token, role, busy, openAd, openUser, mutate }: { report: Report; token: string; role: string; busy: boolean; openAd: (id: number) => void; openUser: (id: number) => void; mutate: (work: () => Promise<unknown>, message: string) => Promise<void> }) {
  const [reason, setReason] = useState('');
  const [status, setStatus] = useState('resolved');
  const [confirmed, setConfirmed] = useState(false);
  const [hide, setHide] = useState(false);
  const [message, setMessage] = useState<{ body: string; senderId: number; createdAt: string } | null>(null);
  return (
    <article className="panel safety-form">
      <h2>
        Prijava #{report.id} · {report.targetType} #{report.targetId} · {report.status}
      </h2>
      <p>{report.reason}</p>
      <small>
        {report.source === 'automated'
          ? 'Automatska detekcija'
          : `Prijavitelj #${report.reporterId ?? 'izbrisan'}`}{' '}
        · {date(report.createdAt)}
      </small>
      {report.signals.length > 0 && <p>Signali: {report.signals.join(', ')}</p>}
      <div className="toolbar">
        {report.targetType === 'ad' && (
          <button
            className="outline-button"
            onClick={() => openAd(report.targetId)}
          >
            Detalji oglasa
          </button>
        )}
        {report.subjectUserId && (
          <button
            className="outline-button"
            onClick={() => openUser(report.subjectUserId!)}
          >
            Profil prijavljenog korisnika
          </button>
        )}
      </div>
      {report.resolutionNote && (
        <p>
          Odluka: {report.resolutionNote}
          {report.violationConfirmed && ' · potvrđeno kršenje'}
        </p>
      )}
      {(report.targetType === 'message' || ['open', 'escalated'].includes(report.status)) && (
        <label>
          Napomena / razlog pristupa
          <textarea
            maxLength={1000}
            value={reason}
            onChange={event => setReason(event.target.value)}
          />
        </label>
      )}
      {report.targetType === 'message' && (
        <>
          <button
            className="outline-button"
            disabled={busy || !reason.trim()}
            onClick={() =>
              void mutate(async () => {
                setMessage(
                  await request(token, `/admin/reports/${report.id}/message-review`, {
                    method: 'POST',
                    body: JSON.stringify({ reason }),
                  })
                );
              }, 'Pristup prijavljenoj poruci je evidentiran.')
            }
          >
            Pregledaj prijavljenu poruku
          </button>
          {message && (
            <blockquote className="reviewed-message">
              <p>{message.body}</p>
              <small>
                Pošiljatelj #{message.senderId} · {date(message.createdAt)}
              </small>
            </blockquote>
          )}
        </>
      )}
      {['open', 'escalated'].includes(report.status) &&
        (role === 'admin' || report.status !== 'escalated') && (
          <form
            className="moderation-form"
            onSubmit={event => {
              event.preventDefault();
              if (hide && !window.confirm('Sakriti prijavljeni oglas i riješiti prijavu?')) return;
              void mutate(
                () =>
                  request(token, `/admin/reports/${report.id}`, {
                    method: 'PATCH',
                    body: JSON.stringify({
                      status,
                      reason,
                      violationConfirmed: status === 'resolved' && confirmed,
                      hideAd: status === 'resolved' && hide,
                    }),
                  }),
                'Odluka je spremljena.'
              );
            }}
          >
            <label>
              Odluka
              <select
                value={status}
                onChange={event => setStatus(event.target.value)}
              >
                <option value="resolved">Riješi</option>
                <option value="dismissed">Odbaci</option>
                <option value="escalated">Eskaliraj administratoru</option>
              </select>
            </label>
            {status === 'resolved' && (
              <>
                <label>
                  <input
                    type="checkbox"
                    checked={confirmed}
                    onChange={event => setConfirmed(event.target.checked)}
                  />
                  Potvrđeno kršenje pravila
                </label>
                {report.targetType === 'ad' && (
                  <label>
                    <input
                      type="checkbox"
                      checked={hide}
                      onChange={event => setHide(event.target.checked)}
                    />
                    Sakrij oglas i riješi prijavu
                  </label>
                )}
              </>
            )}
            <button
              className="primary-button"
              disabled={busy || !reason.trim()}
            >
              Spremi odluku o prijavi
            </button>
          </form>
        )}
    </article>
  );
}
