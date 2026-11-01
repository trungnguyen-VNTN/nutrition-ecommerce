import { expect, it } from 'vitest';
import { nutritionPayload } from './product-data';

it('preserves unknown nutrients as null and explicit zero as zero', () => {
  const data = new FormData();
  data.set('calories', '0');
  data.set('protein_g', '');
  data.set('source', 'Label');
  const payload = nutritionPayload(data);
  expect(payload).toMatchObject({
    calories: 0,
    protein_g: null,
    fat_g: null,
    serving_size: null,
    serving_unit: null,
    source: 'Label',
  });
});
