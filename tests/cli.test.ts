import { expect, test, vi } from 'vitest';
import { runCli } from '../src/cli/cli.js';

test('CLI reports help and rejects invalid output extensions', async () => {
  const output = vi.fn();
  expect(await runCli(['--help'], output, vi.fn())).toBe(0);
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining('curriculum-vitae generate'),
  );
  expect(
    await runCli(
      ['generate', '--input', 'resume.json', '--output', 'resume.txt'],
      vi.fn(),
      vi.fn(),
    ),
  ).toBe(2);
});
