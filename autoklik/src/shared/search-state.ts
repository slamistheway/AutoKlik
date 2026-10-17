export const searchRanges = ['enginePower', 'price', 'year', 'kilometrage', 'engineSize'] as const;
export const searchLists = ['brands', 'models', 'counties', 'colors'] as const;
export const filterLabels: Record<string, string> = {
    search: 'Pojam', category: 'Kategorija', subcategory: 'Podkategorija', brands: 'Marka', models: 'Model',
    enginePower: 'Snaga (kW)', price: 'Cijena (€)', year: 'Godina', kilometrage: 'Kilometraža (km)', engineSize: 'Obujam (cc)',
    condition: 'Stanje', counties: 'Županija', buyOrLease: 'Kupnja/leasing', sellerType: 'Prodavač', fuel: 'Gorivo', gearType: 'Mjenjač', colors: 'Boja', doorNumber: 'Vrata',
};
export const filterKeys = Object.keys(filterLabels).flatMap(key => searchRanges.includes(key as typeof searchRanges[number]) ? [key + 'Min', key + 'Max'] : [key]);
export const sortOptions = [
    ['newest', 'Najnoviji'], ['oldest', 'Najstariji'], ['priceAsc', 'Cijena: niža prvo'],
    ['priceDesc', 'Cijena: viša prvo'], ['yearDesc', 'Godina: novija prvo'], ['kilometrageAsc', 'Kilometraža: manja prvo'],
] as const;

export function searchParams(draft: Record<string, string>, includePaging = false) {
    const params = new URLSearchParams();
    for (const key of [...filterKeys, ...(includePaging ? ['sort', 'page', 'pageSize'] : [])]) {
        if (draft[key]?.trim()) params.set(key, draft[key].trim());
    }
    return params;
}

export function removeSearchFilter(params: URLSearchParams, key: string, value?: string) {
    const next = new URLSearchParams(params);
    if (value && searchLists.includes(key as typeof searchLists[number])) {
        const remaining = (next.get(key) ?? '').split(',').filter(item => item !== value);
        if (remaining.length) next.set(key, remaining.join(',')); else next.delete(key);
    } else next.delete(key);
    if (key === 'brands') next.delete('models');
    if (key === 'category') ['subcategory', 'brands', 'models'].forEach(field => next.delete(field));
    next.delete('page');
    return next;
}

const colorLabels: Record<string, string> = {'var(--color-surface)': 'Bijela', '#9ca3af': 'Srebrna', '#6b7280': 'Siva', '#111827': 'Crna', '#2563eb': 'Plava', '#dc2626': 'Crvena', '#16a34a': 'Zelena', '#facc15': 'Žuta', '#f97316': 'Narančasta', '#92400e': 'Smeđa', '#7c3aed': 'Ljubičasta', '#ec4899': 'Ružičasta'};
const choiceLabels: Record<string, string> = {petrol: 'Benzin', diesel: 'Dizel', electric: 'Električni', hybrid: 'Hibrid', manual: 'Ručni', automatic: 'Automatski', semi_automatic: 'Poluautomatski', privatni: 'Privatni', trgovac: 'Trgovac', buy: 'Kupnja', lease: 'Leasing'};

export function searchChips(params: URLSearchParams) {
    return filterKeys.flatMap(key => {
        const value = params.get(key);
        if (!value) return [];
        const range = /^(.*)(Min|Max)$/.exec(key);
        const label = range ? `${filterLabels[range[1]]} ${range[2] === 'Min' ? 'od' : 'do'}` : filterLabels[key];
        return (searchLists.includes(key as typeof searchLists[number]) ? value.split(',') : [value]).map(item => ({
            key, value: item, label: `${label}: ${colorLabels[item] ?? choiceLabels[item] ?? item.replaceAll('_', ' ')}`,
        }));
    });
}
