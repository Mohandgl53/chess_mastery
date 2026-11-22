/**
 * Pure production-environment checks, kept separate from env.ts so they can be
 * unit tested without triggering process.exit(). Local development and tests
 * intentionally use relaxed defaults; production must be explicitly configured.
 */

export interface ProductionEnvConfig {
  NODE_ENV: string;
  JWT_SECRET?: string;
  CLIENT_URL: string;
  PUBLIC_CLIENT_URL?: string;
}

const LEGACY_INSECURE_JWT_SECRET = 'chess_mastery_secure_jwt_secret_key_change_in_production_2026';

function isLoopbackHost(hostname: string): boolean {
  const host = hostname.toLowerCase().replace(/^\[|\]$/g, '');
  return (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host === '0.0.0.0' ||
    host === '::1' ||
    /^127\./.test(host) ||
    /^169\.254\./.test(host)
  );
}

function assertHttpsNonLocalUrl(value: string | undefined, name: string, errors: string[]): void {
  if (!value || !value.trim()) {
    errors.push(`${name} must be set to a real HTTPS URL in production.`);
    return;
  }

  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    errors.push(`${name} must be a valid HTTPS URL.`);
    return;
  }

  if (url.protocol !== 'https:') {
    errors.push(`${name} must use HTTPS in production (received ${url.protocol}).`);
  }
  if (isLoopbackHost(url.hostname)) {
    errors.push(`${name} must not point to localhost or a loopback address.`);
  }
  if (url.username || url.password) {
    errors.push(`${name} must not contain embedded credentials.`);
  }
}

function isInsecureJwtSecret(secret: string): boolean {
  const value = secret.trim();
  return (
    value.length < 32 ||
    value === LEGACY_INSECURE_JWT_SECRET ||
    /^(replace|your|change|dev|test)[_-]/i.test(value) ||
    /change[_-]?(me|in[_-]production)/i.test(value) ||
    /placeholder/i.test(value) ||
    /^(secret|password|test|dev)$/i.test(value)
  );
}

export function getProductionEnvErrors(config: ProductionEnvConfig): string[] {
  if (config.NODE_ENV !== 'production') return [];

  const errors: string[] = [];

  if (!config.JWT_SECRET || !config.JWT_SECRET.trim()) {
    errors.push('JWT_SECRET must be set to a unique random value of at least 32 characters.');
  } else if (isInsecureJwtSecret(config.JWT_SECRET)) {
    errors.push(
      'JWT_SECRET must be a unique real secret of at least 32 characters (no known fallbacks or placeholders).'
    );
  }

  assertHttpsNonLocalUrl(config.CLIENT_URL, 'CLIENT_URL', errors);
  assertHttpsNonLocalUrl(config.PUBLIC_CLIENT_URL, 'PUBLIC_CLIENT_URL', errors);

  return errors;
}

export function assertProductionEnvConfig(config: ProductionEnvConfig): void {
  const errors = getProductionEnvErrors(config);
  if (errors.length > 0) {
    throw new Error(errors.join('\n'));
  }
}
