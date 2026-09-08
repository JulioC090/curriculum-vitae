import { expect, test, vi } from 'vitest';
import { runCli } from '../src/cli/cli.js';

test('CLI reports help and rejects invalid output extensions', async () => {
  const output = vi.fn();
  expect(await runCli(['--help'], output, vi.fn())).toBe(0);
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining('init [options]'),
  );
  expect(
    await runCli(
      ['generate', '--input', 'resume.json', '--output', 'resume.txt'],
      vi.fn(),
      vi.fn(),
    ),
  ).toBe(2);
});

test('CLI reports the package version and shows help without arguments', async () => {
  const output = vi.fn();

  expect(await runCli(['--version'], output, vi.fn())).toBe(0);
  expect(output).toHaveBeenCalledWith('0.1.0');

  output.mockClear();
  expect(await runCli([], output, vi.fn())).toBe(0);
  expect(output).toHaveBeenCalledWith(
    expect.stringContaining('generate [options]'),
  );
});

test('CLI rejects missing required options and unknown options', async () => {
  const error = vi.fn();

  expect(await runCli(['generate'], vi.fn(), error)).toBe(1);
  expect(error).toHaveBeenCalledWith(
    expect.stringContaining("required option '--output <path>'"),
  );

  error.mockClear();
  expect(
    await runCli(
      [
        'generate',
        '--input',
        'resume.json',
        '--output',
        'resume.pdf',
        '--unknown',
      ],
      vi.fn(),
      error,
    ),
  ).toBe(1);
  expect(error).toHaveBeenCalledWith(expect.stringContaining('unknown option'));
});

test('CLI requires a LinkedIn PDF for init', async () => {
  const error = vi.fn();

  expect(await runCli(['init'], vi.fn(), error)).toBe(1);
  expect(error).toHaveBeenCalledWith(
    expect.stringContaining("required option '--linkedin <path>'"),
  );
});
