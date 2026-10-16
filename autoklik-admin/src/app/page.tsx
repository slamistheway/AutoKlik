'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { initialAds, initialUsers, initialReports, initialActivity, statusLabels, type DemoAd, type AdStatus } from './demo-data';

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
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={iconPaths[name]} /></svg>;
}

type Section = 'overview' | 'ads' | 'users' | 'reports' | 'activity';
const navigation: { id: Section; label: string; icon: keyof typeof iconPaths }[] = [
  { id: 'overview', label: 'Pregled', icon: 'grid' },
  { id: 'ads', label: 'Oglasi', icon: 'car' },
  { id: 'users', label: 'Korisnici', icon: 'users' },
  { id: 'reports', label: 'Prijave', icon: 'flag' },
  { id: 'activity', label: 'Aktivnosti', icon: 'activity' },
];
const euro = (price: number) => `${new Intl.NumberFormat('hr-HR').format(price)} €`;

export default function AdminPage() {
  const [section, setSection] = useState<Section>('overview');
  const [ads, setAds] = useState(initialAds);
  const [users, setUsers] = useState(initialUsers);
  const [reports, setReports] = useState(initialReports);
  const [activity, setActivity] = useState(initialActivity);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('all');
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [selectedReport, setSelectedReport] = useState<number | null>(null);
  const [notice, setNotice] = useState('');
  const dialog = useRef<HTMLDialogElement>(null);
  const selectedAd = ads.find(ad => ad.id === selectedId);
  const report = reports.find(item => item.id === selectedReport);
  const openReports = reports.filter(item => !item.resolved);
  const term = search.trim().toLocaleLowerCase('hr');

  useEffect(() => {
    if (selectedId !== null) dialog.current?.showModal();
  }, [selectedId]);

  const navigate = (next: Section) => {
    setSection(next); setSearch(''); setStatus('all'); setMobileMenu(false);
  };

  const log = (title: string, description: string) => {
    setActivity(current => [{ id: current.reduce((max, item) => Math.max(max, item.id), 0) + 1, title, description: `Demo administrator · ${description}`, time: 'Upravo' }, ...current]);
    setNotice(`${title}. Promjena vrijedi samo u ovom prototipu.`);
  };

  const updateAd = (ad: DemoAd, next: AdStatus) => {
    setAds(current => current.map(item => item.id === ad.id ? { ...item, status: next } : item));
    log(`Oglas #${ad.id}: ${statusLabels[next].toLocaleLowerCase('hr')}`, ad.title);
  };

  const resolveReport = (hide: boolean) => {
    if (!report || !selectedAd) return;
    if (hide) setAds(current => current.map(ad => ad.id === selectedAd.id ? { ...ad, status: 'hidden' } : ad));
    setReports(current => current.map(item => item.id === report.id ? { ...item, resolved: true } : item));
    log(`Prijava #${report.id} je riješena`, hide ? `Oglas #${selectedAd.id} je skriven` : 'Prijava je odbačena');
    setSelectedId(null); setSelectedReport(null);
  };

  const reset = () => {
    setAds(initialAds); setUsers(initialUsers); setReports(initialReports); setActivity(initialActivity);
    setSearch(''); setStatus('all'); setNotice('Demo podaci vraćeni su u početno stanje.');
  };

  const filteredAds = ads.filter(ad => (status === 'all' || ad.status === status) && `${ad.title} ${ad.id} ${ad.seller} ${ad.location}`.toLocaleLowerCase('hr').includes(term));
  const filteredUsers = users.filter(user => (status === 'all' || (status === 'suspended' ? user.suspended : !user.suspended)) && `${user.name} ${user.email} ${user.id}`.toLocaleLowerCase('hr').includes(term));
  const filteredReports = reports.filter(item => (status === 'all' || (status === 'resolved' ? item.resolved : !item.resolved)) && `${item.id} ${item.reason} ${ads.find(ad => ad.id === item.adId)?.title}`.toLocaleLowerCase('hr').includes(term));
  const showAd = (id: number, reportId: number | null = null) => { setSelectedReport(reportId); setSelectedId(id); };

  const adTable = (items: DemoAd[]) => (
    <div className="table-scroll"><table>
      <thead><tr><th>Oglas</th><th>Prodavatelj</th><th>Cijena</th><th>Status</th><th>Istaknuto</th><th><span className="sr-only">Detalji</span></th></tr></thead>
      <tbody>{items.map(ad => <tr key={ad.id}>
        <td><button className="ad-title" onClick={() => showAd(ad.id)}><span className={`car-tile tile-${ad.id % 4}`}><Icon name="car" size={26} /></span><span><strong>{ad.title}</strong><small>#{ad.id} · {ad.year} · {ad.location}</small></span></button></td>
        <td>{ad.seller}</td><td className="price">{euro(ad.price)}</td><td><span className={`badge ${ad.status}`}><i />{statusLabels[ad.status]}</span></td>
        <td><button className={`star-button ${ad.featured ? 'featured' : ''}`} aria-label={`${ad.featured ? 'Ukloni isticanje' : 'Istakni oglas'} ${ad.id}`} aria-pressed={ad.featured} onClick={() => { setAds(current => current.map(item => item.id === ad.id ? { ...item, featured: !item.featured } : item)); log(`Promijenjeno isticanje oglasa #${ad.id}`, ad.title); }}><Icon name="star" size={18} /></button></td>
        <td><button className="icon-button" aria-label={`Detalji oglasa ${ad.id}`} onClick={() => showAd(ad.id)}><Icon name="chevron" size={17} /></button></td>
      </tr>)}</tbody>
    </table>{!items.length && <div className="empty">Nema oglasa koji odgovaraju pretrazi.</div>}</div>
  );

  return (
    <div className="admin-app">
      <aside className={`sidebar ${mobileMenu ? 'mobile-open' : ''}`}>
        <Link href="/" onClick={() => navigate('overview')} className="brand"><span className="brand-icon"><Icon name="car" size={23} /></span>AutoKlik<span className="brand-dot">.</span></Link>
        <span className="workspace-label">ADMINISTRACIJA</span>
        <nav aria-label="Administracijski izbornik">{navigation.map(item => <button key={item.id} onClick={() => navigate(item.id)} aria-current={section === item.id ? 'page' : undefined} className={`nav-item ${section === item.id ? 'selected' : ''}`}><Icon name={item.icon} /><span>{item.label}</span>{item.id === 'reports' && openReports.length > 0 && <span className="nav-count">{openReports.length}</span>}</button>)}</nav>
        <div className="sidebar-bottom"><div className="prototype-note"><Icon name="shield" /><strong>Prostor za isprobavanje</strong><p>Svi podaci i radnje su demo. Promjene se poništavaju osvježavanjem.</p></div><button className="admin-person" onClick={() => setNotice('Demo administrator. Prijava i administratorske ovlasti nisu povezane s API-jem.')}><span className="avatar">AD</span><span><strong>Administrator</strong><small>Demo račun</small></span><Icon name="chevron" size={16} /></button></div>
      </aside>
      <div className="workspace">
        <header className="topbar"><div className="breadcrumbs"><button className="icon-button mobile-toggle" aria-label="Otvori administracijski izbornik" aria-expanded={mobileMenu} onClick={() => setMobileMenu(current => !current)}><Icon name="menu" /></button><span>Radni prostor</span><Icon name="chevron" size={14} /><strong>{navigation.find(item => item.id === section)?.label}</strong></div><div className="topbar-actions"><span className="demo-label"><i />DEMO PROTOTIP</span><button className="reset-button" aria-label="Vrati demo" onClick={reset}><Icon name="reset" size={15} /><span>Vrati demo</span></button></div></header>
        <main>
          <div className="page-heading"><div><p className="eyebrow">AUTOKLIK ADMIN</p><h1>{section === 'overview' ? 'Sve na jednom mjestu.' : navigation.find(item => item.id === section)?.label}</h1><p>{section === 'overview' ? 'Pregled oglasa, korisnika i stvari koje trebaju vašu pažnju.' : section === 'ads' ? 'Pregledajte oglase i upravljajte njihovom vidljivošću.' : section === 'users' ? 'Pregled demo korisnika i njihovih računa.' : section === 'reports' ? 'Pregledajte prijavljeni sadržaj i donesite odluku.' : 'Evidencija promjena u ovoj demo sesiji.'}</p></div><div className="date-note"><Icon name="clock" size={16} />Demo prikaz · 16. listopada 2026.</div></div>
          {notice && <div className="notice" role="status"><Icon name="check" size={18} /><span>{notice}</span><button className="icon-button" aria-label="Zatvori obavijest" onClick={() => setNotice('')}><Icon name="close" size={16} /></button></div>}

          {section === 'overview' ? <>
            <div className="stats-grid">{[
              { label: 'Ukupno oglasa', value: ads.length, note: `${ads.filter(ad => ad.status === 'active').length} trenutačno aktivna`, icon: 'car' as const, color: 'red' },
              { label: 'Korisnici', value: users.length, note: `${users.filter(user => !user.suspended).length} aktivnih računa`, icon: 'users' as const, color: 'blue' },
              { label: 'Otvorene prijave', value: openReports.length, note: 'Čeka moderatorski pregled', icon: 'flag' as const, color: 'orange' },
              { label: 'Istekli oglasi', value: ads.filter(ad => ad.status === 'expired').length, note: 'Automatski nakon 3 dana', icon: 'clock' as const, color: 'purple' },
            ].map(stat => <article className="stat-card" key={stat.label}><div className="stat-top"><span>{stat.label}</span><span className={`stat-icon ${stat.color}`}><Icon name={stat.icon} size={19} /></span></div><strong className="stat-value">{stat.value.toString().padStart(2, '0')}</strong><p>{stat.note}</p></article>)}</div>
            <div className="overview-grid"><section className="panel chart-panel"><div className="panel-heading"><div><h2>Objave kroz tjedan</h2><p>Ilustrativni promet na platformi</p></div><span className="subtle-tag">Demo · 7 dana</span></div><div className="chart-total">47 <span>objavljenih oglasa</span></div><div className="bar-chart" role="img" aria-label="Demo objave od subote do petka: 4, 3, 8, 6, 9, 7, 10"><div className="chart-lines"><span>10</span><span>5</span><span>0</span></div>{[4, 3, 8, 6, 9, 7, 10].map((count, index) => <div className="bar-column" key={index}><div className={`bar ${index === 6 ? 'last' : ''}`} style={{ height: `${count * 10}%` }}><span>{count}</span></div><small>{['Sub', 'Ned', 'Pon', 'Uto', 'Sri', 'Čet', 'Pet'][index]}</small></div>)}</div></section>
              <section className="panel attention-panel"><div className="panel-heading"><div><h2>Za pregled</h2><p>Prijave koje čekaju odluku</p></div><span className="count-circle">{openReports.length}</span></div><div className="report-preview">{openReports.length ? openReports.slice(0, 3).map(item => <button key={item.id} onClick={() => showAd(item.adId, item.id)}><span className={`report-icon ${item.priority}`}><Icon name="flag" size={18} /></span><span><strong>{item.reason}</strong><small>Oglas #{item.adId} · {item.date}</small></span><Icon name="chevron" size={15} /></button>) : <div className="empty">Sve prijave su riješene.</div>}</div><button className="text-link" onClick={() => navigate('reports')}>Sve prijave <Icon name="arrow" size={16} /></button></section></div>
            <section className="panel"><div className="panel-heading"><div><h2>Posljednji oglasi</h2><p>Nedavno objavljeni demo oglasi</p></div><button className="text-link" onClick={() => navigate('ads')}>Svi oglasi <Icon name="arrow" size={16} /></button></div>{adTable(ads.slice(0, 5))}<div className="panel-footer"><span>Prikazano 5 od {ads.length} oglasa</span><span><i className="live-dot" />Samo demo podaci</span></div></section>
          </> : <>
            {section !== 'activity' && <div className="toolbar"><label className="search-field"><Icon name="search" size={18} /><input value={search} onChange={event => setSearch(event.target.value)} placeholder={section === 'ads' ? 'Pretraži naslov, ID ili prodavatelja...' : section === 'users' ? 'Pretraži ime ili e-mail...' : 'Pretraži prijave...'} aria-label="Pretraži demo podatke" /></label><select aria-label="Filtriraj po statusu" value={status} onChange={event => setStatus(event.target.value)}><option value="all">Svi statusi</option>{section === 'ads' ? Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>) : section === 'users' ? <><option value="active">Aktivni</option><option value="suspended">Suspendirani</option></> : <><option value="open">Otvorene</option><option value="resolved">Riješene</option></>}</select></div>}
            {section === 'ads' && <section className="panel"><div className="panel-heading"><h2>Svi oglasi <span className="inline-count">{filteredAds.length}</span></h2><span className="subtle-tag">Demo podaci</span></div>{adTable(filteredAds)}</section>}
            {section === 'users' && <section className="panel"><div className="table-scroll"><table><thead><tr><th>Korisnik</th><th>Vrsta računa</th><th>Pridružen</th><th>Status</th><th>Demo radnja</th></tr></thead><tbody>{filteredUsers.map(user => <tr key={user.id}><td><div className="user-cell"><span className="avatar">{user.initials}</span><span><strong>{user.name}</strong><small>{user.email}</small></span></div></td><td>{user.type}</td><td>{user.joined}</td><td><span className={`badge ${user.suspended ? 'hidden' : 'active'}`}><i />{user.suspended ? 'Suspendiran' : 'Aktivan'}</span></td><td><button className="outline-button" onClick={() => { setUsers(current => current.map(item => item.id === user.id ? { ...item, suspended: !item.suspended } : item)); log(`Korisnik #${user.id}: ${user.suspended ? 'račun aktiviran' : 'račun suspendiran'}`, user.name); }}>{user.suspended ? 'Aktiviraj' : 'Suspendiraj'}</button></td></tr>)}</tbody></table>{!filteredUsers.length && <div className="empty">Nema korisnika koji odgovaraju pretrazi.</div>}</div></section>}
            {section === 'reports' && <div className="reports-list">{filteredReports.map(item => <article className="panel report-card" key={item.id}><span className={`report-icon ${item.priority}`}><Icon name="flag" /></span><div><div className="report-card-title"><h2>{item.reason}</h2><span className={`badge ${item.resolved ? 'sold' : 'expired'}`}>{item.resolved ? 'Riješena' : 'Otvorena'}</span></div><p>{item.description}</p><small>#{item.id} · Oglas #{item.adId} · {item.reporter} · {item.date}</small></div><button className="outline-button" onClick={() => showAd(item.adId, item.id)}>{item.resolved ? 'Detalji' : 'Pregledaj'}<Icon name="arrow" size={16} /></button></article>)}{!filteredReports.length && <div className="panel empty">Nema prijava koje odgovaraju pretrazi.</div>}</div>}
            {section === 'activity' && <section className="panel activity-list">{activity.map(item => <article key={item.id}><span className="activity-icon"><Icon name="activity" size={18} /></span><div><strong>{item.title}</strong><p>{item.description}</p></div><time>{item.time}</time></article>)}</section>}
          </>}
          <footer className="workspace-footer"><span>AutoKlik <b>Admin</b> · Prototip</span><span>Nema povezivanja sa stvarnim korisnicima ili oglasima.</span></footer>
        </main>
      </div>
      {selectedAd && <dialog ref={dialog} className="details-dialog" aria-label={`Detalji oglasa ${selectedAd.id}`} onCancel={() => { setSelectedId(null); setSelectedReport(null); }} onClose={() => { setSelectedId(null); setSelectedReport(null); }}><div className="dialog-header"><span className="eyebrow">{report ? `PRIJAVA #${report.id}` : `OGLAS #${selectedAd.id}`} · DEMO</span><button className="icon-button" aria-label="Zatvori detalje" onClick={() => { setSelectedId(null); setSelectedReport(null); }}><Icon name="close" /></button></div><div className="dialog-car"><Icon name="car" size={72} /><span>{selectedAd.brand}</span></div><h2>{selectedAd.title}</h2><div className="dialog-price"><strong>{euro(selectedAd.price)}</strong><span className={`badge ${selectedAd.status}`}><i />{statusLabels[selectedAd.status]}</span></div><dl className="ad-facts"><div><dt>Prodavatelj</dt><dd>{selectedAd.seller}</dd></div><div><dt>Lokacija</dt><dd>{selectedAd.location}</dd></div><div><dt>Godište</dt><dd>{selectedAd.year}</dd></div><div><dt>Kilometraža</dt><dd>{selectedAd.mileage} km</dd></div></dl>{report ? <div className="report-detail"><h3>{report.reason}</h3><p>{report.description}</p><small>{report.reporter} · {report.date}</small></div> : <label className="status-control">Status oglasa<select value={selectedAd.status} onChange={event => updateAd(selectedAd, event.target.value as AdStatus)}>{Object.entries(statusLabels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>}<p className="dialog-disclaimer">Demo prikaz. Ove radnje ne mijenjaju stvarne podatke.</p>{report && !report.resolved && <div className="dialog-actions"><button className="outline-button" onClick={() => resolveReport(false)}>Odbaci prijavu</button><button className="primary-button" onClick={() => resolveReport(true)}>Sakrij oglas i riješi</button></div>}</dialog>}
    </div>
  );
}
