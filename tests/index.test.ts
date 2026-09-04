import { afterEach, expect, test, vi } from 'vitest';

afterEach(() => {
  vi.restoreAllMocks();
});

test('prints the CLI name', async () => {
  const log = vi.spyOn(console, 'log').mockImplementation(() => undefined);

  await import('../src/index.js');

  expect(log).toHaveBeenCalledWith('curriculum-vitae CLI');
});
