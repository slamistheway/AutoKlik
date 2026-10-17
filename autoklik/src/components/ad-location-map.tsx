type Area = {latitude: number; longitude: number};
const areas: [string, number, number][] = [
  ['bjelovarsko bilogorska|bjelovar', 45.898, 16.842],
  ['brodsko posavska|slavonski brod', 45.16, 18.015],
  ['dubrovacko neretvanska|dubrovnik', 42.65, 18.09],
  ['istarska|pazin', 45.24, 13.94],
  ['pula', 44.866, 13.849],
  ['karlovacka|karlovac', 45.493, 15.555],
  ['koprivnicko krizevacka|koprivnica', 46.163, 16.828],
  ['krapinsko zagorska|krapina', 46.16, 15.878],
  ['licko senjska|gospic', 44.546, 15.375],
  ['medimurska|cakovec', 46.384, 16.433],
  ['osjecko baranjska|osijek', 45.555, 18.695],
  ['pozesko slavonska|pozega', 45.332, 17.675],
  ['primorsko goranska|rijeka', 45.327, 14.442],
  ['sisacko moslavacka|sisak', 45.487, 16.374],
  ['splitsko dalmatinska|split', 43.509, 16.44],
  ['varazdinska|varazdin', 46.306, 16.336],
  ['viroviticko podravska|virovitica', 45.832, 17.383],
  ['vukovarsko srijemska|vukovar', 45.35, 19.00],
  ['zadarska|zadar', 44.12, 15.23],
  ['zagrebacka|grad zagreb|zagreb', 45.815, 15.982],
  ['sibensko kninska|sibenik', 43.735, 15.895],
];

function findArea(location: string): Area | undefined {
  const normalized = location.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[ _-]+/g, ' ').replace(/ zupanija$/, '').trim();
  const area = areas.find(([names]) => names.split('|').includes(normalized));
  return area ? {latitude: area[1], longitude: area[2]} : undefined;
}

export function AdLocationMap({location}: {location: string | null | undefined}) {
  if (!location?.trim()) return null;
  const area = findArea(location);
  const label = location.replace(/_/g, '-');
  const bbox = area ? [area.longitude - 0.5, area.latitude - 0.3, area.longitude + 0.5, area.latitude + 0.3].join(',') : null;
  const external = area ? `https://www.openstreetmap.org/#map=10/${area.latitude}/${area.longitude}`
    : `https://www.openstreetmap.org/search?query=${encodeURIComponent(location + ', Hrvatska')}`;

  return (
      <section className="mt-5 overflow-hidden rounded-2xl border border-white/10 bg-[#1b1b20]">
        <div className="p-5
          sm:p-6">
          <h2 className="text-xl font-bold">Lokacija oglasa</h2>
          <p className="mt-2 text-sm text-gray-300">{label} — približno područje. Točna adresa nije navedena.</p>
          {area && <p className="mt-1 text-xs text-gray-400">Povucite kartu za pomicanje. Koristite + i − za povećavanje i smanjivanje.</p>}
          <a href={external} target="_blank" rel="noopener noreferrer" className="mt-3 inline-block text-sm text-blue-400 underline">{area ? 'Otvori veću kartu' : 'Pronađi lokaciju na karti'}</a>
        </div>
        {bbox && <iframe title={`Karta približne lokacije: ${label}`}
                         src={`https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik`}
                         loading="lazy" referrerPolicy="no-referrer" className="h-80 w-full border-0
                           sm:h-96" allowFullScreen />}
      </section>
  );
}
