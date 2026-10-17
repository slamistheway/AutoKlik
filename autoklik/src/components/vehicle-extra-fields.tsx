import FilterChoose from '@/components/filters/filter-choose';

type Fields = { driveType: string; gearCount: string; fuelConsumption: string; warranty: string };

export function VehicleExtraFields({ values, onChange }: { values: Fields; onChange: (field: keyof Fields, value: string) => void }) {
  return (
    <>
      <FilterChoose filterType="driveType" value={values.driveType} onChange={value => onChange('driveType', value)} />
      <label className="block text-sm font-medium text-gray-700">Broj brzina
        <input type="number" min="1" max="20" step="1" value={values.gearCount} onChange={event => onChange('gearCount', event.target.value)} placeholder="Broj brzina" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>
      <label className="block text-sm font-medium text-gray-700">Potrošnja goriva (L/100 km)
        <input type="number" min="0" max="1000" step="any" value={values.fuelConsumption} onChange={event => onChange('fuelConsumption', event.target.value)} placeholder="npr. 5,5" className="mt-2 block w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:border-red-600 focus:outline-none" />
      </label>
      <FilterChoose filterType="warranty" value={values.warranty} onChange={value => onChange('warranty', value)} />
    </>
  );
}
