import { Firearm } from './firearm';
import { snapshot } from './event';

describe('snapshot', () => {
  const firearm: Firearm = { id: 'g1', name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss V8' };

  it('should copy every field but the id, so nothing links back to the original', () => {
    expect(snapshot(firearm)).toEqual({ name: 'Blaser R8', caliber: '.308 Win', optics: 'riflescope', opticsModel: 'Zeiss V8' });
    expect('id' in snapshot(firearm)).toBe(false);
  });

  it('should be a copy that later changes to the original do not alter', () => {
    const original = { ...firearm };
    const copy = snapshot(original);

    original.name = 'Blaser R8 Professional';

    expect(copy.name).toBe('Blaser R8');
  });
});
