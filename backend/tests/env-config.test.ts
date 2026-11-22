import { describe, expect, it } from 'vitest';
import { getProductionEnvErrors } from '../src/config/env.validation.js';

const strongSecret = 'a_unique_random_production_secret_0123456789abcdef';

describe('Production environment validation', () => {
  it('does not apply production rules in development or test', () => {
    expect(
      getProductionEnvErrors({
        NODE_ENV: 'test',
        JWT_SECRET: '',
        CLIENT_URL: 'http://localhost:5173',
        PUBLIC_CLIENT_URL: ''
      })
    ).toEqual([]);
  });

  it('accepts a fully configured production environment', () => {
    expect(
      getProductionEnvErrors({
        NODE_ENV: 'production',
        JWT_SECRET: strongSecret,
        CLIENT_URL: 'https://chess.example.com',
        PUBLIC_CLIENT_URL: 'https://chess.example.com'
      })
    ).toEqual([]);
  });

  it('rejects missing, short, known-fallback, and placeholder JWT secrets', () => {
    const base = {
      NODE_ENV: 'production',
      CLIENT_URL: 'https://chess.example.com',
      PUBLIC_CLIENT_URL: 'https://chess.example.com'
    };

    expect(getProductionEnvErrors({ ...base }).some((e) => e.includes('JWT_SECRET'))).toBe(true);
    expect(getProductionEnvErrors({ ...base, JWT_SECRET: 'short-secret' }).some((e) => e.includes('JWT_SECRET'))).toBe(true);
    expect(
      getProductionEnvErrors({
        ...base,
        JWT_SECRET: 'chess_mastery_secure_jwt_secret_key_change_in_production_2026'
      }).some((e) => e.includes('JWT_SECRET'))
    ).toBe(true);
    expect(
      getProductionEnvErrors({
        ...base,
        JWT_SECRET: 'replace_with_a_unique_random_secret_at_least_32_characters'
      }).some((e) => e.includes('JWT_SECRET'))
    ).toBe(true);
  });

  it('requires real HTTPS, non-loopback client URLs for CORS and email links', () => {
    const base = { NODE_ENV: 'production', JWT_SECRET: strongSecret };

    const localhostErrors = getProductionEnvErrors({
      ...base,
      CLIENT_URL: 'http://localhost',
      PUBLIC_CLIENT_URL: ''
    });
    expect(localhostErrors.some((e) => e.includes('CLIENT_URL') && e.includes('HTTPS'))).toBe(true);
    expect(localhostErrors.some((e) => e.includes('PUBLIC_CLIENT_URL'))).toBe(true);

    const loopbackErrors = getProductionEnvErrors({
      ...base,
      CLIENT_URL: 'https://127.0.0.1',
      PUBLIC_CLIENT_URL: 'https://localhost:5173'
    });
    expect(loopbackErrors.some((e) => e.includes('loopback'))).toBe(true);

    expect(
      getProductionEnvErrors({
        ...base,
        CLIENT_URL: 'https://chess.example.com',
        PUBLIC_CLIENT_URL: 'https://links.example.com'
      })
    ).toEqual([]);
  });
});
