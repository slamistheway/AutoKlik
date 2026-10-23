import { validateInput } from '../input-validation';

describe('Optional vehicle details', () => {
  it('accepts drivetrain, gear count, decimal consumption and warranty', () => {
    expect(validateInput({ driveType: '4x4', gearCount: '8', fuelConsumption: '5.75', warranty: 'Da' }, 'UpdateAdDto')).toEqual({ driveType: '4x4', gearCount: 8, fuelConsumption: 5.75, warranty: 'Da' });
  });

  it('supports omission, clearing and zero consumption', () => {
    expect(validateInput({}, 'UpdateAdDto')).toEqual({});
    expect(validateInput({ driveType: '', gearCount: '', fuelConsumption: '', warranty: '' }, 'UpdateAdDto')).toEqual({ driveType: null, gearCount: null, fuelConsumption: null, warranty: null });
    expect(validateInput({ fuelConsumption: '0', warranty: 'Ne' }, 'UpdateAdDto')).toEqual({ fuelConsumption: 0, warranty: 'Ne' });
  });

  it.each([
    { driveType: 'unknown' }, { gearCount: 0 }, { gearCount: 1.5 }, { gearCount: 21 },
    { fuelConsumption: -1 }, { fuelConsumption: 'Infinity' }, { fuelConsumption: 1001 },
    { warranty: 'maybe' },
  ])('rejects invalid values: %j', fields => {
    expect(() => validateInput(fields, 'UpdateAdDto')).toThrow();
  });
});

it('validates equipment and tire dimensions and permits clearing them', () => {
  expect(validateInput({ bodyType: 'SUV', airConditioning: 'Automatska', airbags: '0', carRadio: 'Radio/CD', seatCount: '5', tireWidth: '205', tireHeight: '55', tireDiameter: '16', emissionClass: 'Euro 6' }, 'UpdateAdDto')).toEqual({ bodyType: 'SUV', airConditioning: 'Automatska', airbags: 0, carRadio: 'Radio/CD', seatCount: 5, tireWidth: 205, tireHeight: 55, tireDiameter: 16, emissionClass: 'Euro 6' });
  expect(validateInput({ bodyType: '', tireWidth: '', vin: '' }, 'UpdateAdDto')).toEqual({ bodyType: null, tireWidth: null, vin: null });
});

it.each([{ bodyType: 'invalid' }, { airConditioning: 'invalid' }, { airbags: -1 }, { seatCount: 0 }, { tireWidth: 0 }, { tireHeight: 101 }, { tireDiameter: 1.5 }, { emissionClass: 'invalid' }, { vin: 'short' }])('rejects invalid equipment: %j', input => {
  expect(() => validateInput(input, 'UpdateAdDto')).toThrow();
});
