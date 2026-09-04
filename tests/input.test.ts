import { describe, expect, test } from 'vitest';
import { mapInputToDomain } from '../src/resume/input/map-input.js';

const valid = {
  schemaVersion: 1,
  personal: { name: 'Jane Doe', email: 'jane@example.com' },
};

describe('resume input', () => {
  test('maps valid version one input and defaults sections', () => {
    const result = mapInputToDomain(valid);
    expect(result).toEqual({
      personal: valid.personal,
      experience: [],
      education: [],
      skills: [],
      projects: [],
      certifications: [],
    });
  });

  test('rejects invalid email and schema version', () => {
    expect(() => mapInputToDomain({ ...valid, schemaVersion: 2 })).toThrow(
      'invalid',
    );
    expect(() =>
      mapInputToDomain({
        ...valid,
        personal: { ...valid.personal, email: 'not-an-email' },
      }),
    ).toThrow('invalid');
  });
});
