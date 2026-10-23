import FilterChoose from '@/components/filters/filter-choose';

type Fields = { bodyType: string; airConditioning: string; airbags: string; carRadio: string; seatCount: string; tireWidth: string; tireHeight: string; tireDiameter: string; emissionClass: string; driveType: string; gearCount: string; fuelConsumption: string; warranty: string };

export function VehicleExtraFields({ values, onChange, visibleFields }: { visibleFields?: Set<string>; values: Fields; onChange: (field: keyof Fields, value: string) => void }) {
  return (
    <>
      {(!visibleFields || visibleFields.has('driveType')) && <FilterChoose filterType="driveType" value={values.driveType} onChange={value => onChange('driveType', value)} />}
      {(!visibleFields || visibleFields.has('gearCount')) && <label className="block text-sm font-medium text-gray-700">Broj brzina
        <input type="number" min="1" max="20" step="1" value={values.gearCount} onChange={event => onChange('gearCount', event.target.value)} placeholder="Broj brzina" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('fuelConsumption')) && <label className="block text-sm font-medium text-gray-700">Potrošnja goriva (L/100 km)
        <input type="number" min="0" max="1000" step="any" value={values.fuelConsumption} onChange={event => onChange('fuelConsumption', event.target.value)} placeholder="npr. 5,5" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('bodyType')) && <label className="block text-sm font-medium text-gray-700">Oblik karoserije
        <select value={values.bodyType} onChange={event => onChange('bodyType', event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none">
          <option value="">Odaberite (neobavezno)</option>
          <option value="Limuzina">Limuzina</option>
          <option value="Hatchback">Hatchback</option>
          <option value="Karavan">Karavan</option>
          <option value="SUV">SUV</option>
          <option value="Crossover">Crossover</option>
          <option value="Coupe">Coupe</option>
          <option value="Kabriolet">Kabriolet</option>
          <option value="Monovolumen">Monovolumen</option>
          <option value="Kombi">Kombi</option>
          <option value="Pickup">Pickup</option>
          <option value="Ostalo">Ostalo</option>
        </select>
      </label>}
      {(!visibleFields || visibleFields.has('airConditioning')) && <label className="block text-sm font-medium text-gray-700">Klimatizacija
        <select value={values.airConditioning} onChange={event => onChange('airConditioning', event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none">
          <option value="">Odaberite (neobavezno)</option>
          <option value="Bez klimatizacije">Bez klimatizacije</option>
          <option value="Ručna">Ručna</option>
          <option value="Automatska">Automatska</option>
          <option value="Automatska dvozonska">Automatska dvozonska</option>
          <option value="Automatska višezonska">Automatska višezonska</option>
        </select>
      </label>}
      {(!visibleFields || visibleFields.has('airbags')) && <label className="block text-sm font-medium text-gray-700">Broj zračnih jastuka
        <input type="number" min="0" max="20" step="1" value={values.airbags} onChange={event => onChange('airbags', event.target.value)} placeholder="Neobavezno" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('carRadio')) && <label className="block text-sm font-medium text-gray-700">Autoradio
        <select value={values.carRadio} onChange={event => onChange('carRadio', event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none">
          <option value="">Odaberite (neobavezno)</option>
          <option value="Nema">Nema</option>
          <option value="Radio">Radio</option>
          <option value="Radio/CD">Radio/CD</option>
          <option value="Multimedijski sustav">Multimedijski sustav</option>
        </select>
      </label>}
      {(!visibleFields || visibleFields.has('seatCount')) && <label className="block text-sm font-medium text-gray-700">Broj sjedala
        <input type="number" min="1" max="100" step="1" value={values.seatCount} onChange={event => onChange('seatCount', event.target.value)} placeholder="Neobavezno" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('tireWidth')) && <label className="block text-sm font-medium text-gray-700">Širina gume (mm)
        <input type="number" min="1" max="1000" step="1" value={values.tireWidth} onChange={event => onChange('tireWidth', event.target.value)} placeholder="Neobavezno" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('tireHeight')) && <label className="block text-sm font-medium text-gray-700">Visina / profil gume (%)
        <input type="number" min="1" max="100" step="1" value={values.tireHeight} onChange={event => onChange('tireHeight', event.target.value)} placeholder="Neobavezno" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('tireDiameter')) && <label className="block text-sm font-medium text-gray-700">Promjer gume (inči)
        <input type="number" min="1" max="60" step="1" value={values.tireDiameter} onChange={event => onChange('tireDiameter', event.target.value)} placeholder="Neobavezno" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>}
      {(!visibleFields || visibleFields.has('emissionClass')) && <label className="block text-sm font-medium text-gray-700">Ekološka kategorija vozila
        <select value={values.emissionClass} onChange={event => onChange('emissionClass', event.target.value)} className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none">
          <option value="">Odaberite (neobavezno)</option>
          <option value="Euro 1">Euro 1</option>
          <option value="Euro 2">Euro 2</option>
          <option value="Euro 3">Euro 3</option>
          <option value="Euro 4">Euro 4</option>
          <option value="Euro 5">Euro 5</option>
          <option value="Euro 6">Euro 6</option>
          <option value="Euro 6d">Euro 6d</option>
          <option value="Euro 7">Euro 7</option>
          <option value="Bez emisija">Bez emisija</option>
          <option value="Ostalo">Ostalo</option>
        </select>
      </label>}
      {(!visibleFields || visibleFields.has('warranty')) && <FilterChoose filterType="warranty" value={values.warranty} onChange={value => onChange('warranty', value)} />}
    </>
  );
}
