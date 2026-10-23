const common = ['brand', 'model', 'price', 'year', 'condition', 'county', 'sellerType', 'color', 'warranty', 'vin'];
const tires = ['tireWidth', 'tireHeight', 'tireDiameter'];
const engine = ['enginePower', 'engineSize', 'fuel', 'gearType', 'gearCount', 'emissionClass'];
const cabin = ['airConditioning', 'carRadio', 'seatCount'];
const road = ['kilometrage', 'fuelConsumption'];

export function getDetailFields(category: string, subcategory: string): Set<string> {
  switch (category) {
    case 'cars':
      return new Set([...common, ...tires, ...engine, ...cabin, ...road, 'bodyType', 'airbags', 'driveType', 'doorNumber']);
    case 'motorcycle':
      return new Set([...common, ...tires, ...engine, ...road, 'drivingLicence', ...(subcategory === 'quad_motorcycle' ? ['driveType'] : [])]);
    case 'van':
      return new Set([...common, ...tires, ...engine, ...cabin, ...road, 'airbags', 'driveType', 'doorNumber', 'weight', 'payload', 'volume']);
    case 'other':
      switch (subcategory) {
        case 'trailer':
          return new Set([...common, ...tires, 'weight', 'payload', 'volume']);
        case 'trailer_camp':
          return new Set([...common, ...tires, 'weight', 'airConditioning']);
        case 'tractor_agricultural':
        case 'combine_agricultural':
        case 'excavator_construction':
        case 'crane_construction':
          return new Set([...common, ...tires, ...engine, 'airConditioning', 'driveType', 'weight', 'payload']);
        case 'truck':
          return new Set([...common, ...tires, ...engine, ...cabin, ...road, 'driveType', 'weight', 'payload', 'volume']);
        case 'camper_camp':
          return new Set([...common, ...tires, ...engine, ...cabin, ...road, 'airbags', 'driveType', 'weight']);
      }
  }
  return new Set(common);
}
