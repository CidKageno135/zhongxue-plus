/**
 * tests/fixtures/api/sentinel-secrets.ts
 *
 * Fake sentinel secrets, adversary URLs, and test payloads for API Security & Integration tests.
 * Owned by Subagent A16 (QA API & Independent Security Lead).
 *
 * IMPORTANT:
 * All secrets defined here are purely synthetic sentinel tokens.
 * They are used in tests to strictly prove that server environment secrets
 * are never forwarded, leaked, or exposed across untrusted endpoints or redirects.
 */

export const SENTINEL_SOL_KEY = 'sk-sentinel-sol-secret-never-leak-998877';
export const SENTINEL_DEEPSEEK_KEY = 'sk-sentinel-deepseek-secret-never-leak-665544';
export const SENTINEL_API_KEY = 'sk-sentinel-api-key-never-leak-112233';
export const SENTINEL_CLIENT_KEY = 'sk-client-personal-key-trusted-123456';

export const ATTACKER_EVIL_URL = 'https://attacker.evil.com';
export const ATTACKER_SUBSTRING_HOST = 'agentrouter.org.evil.com';
export const ATTACKER_SUBSTRING_URL = 'https://agentrouter.org.evil.com/v1';
export const ATTACKER_SUBSTRING_PATH_URL = 'https://evil-attacker.com/agentrouter.org';

export const UNAUTHORIZED_ORIGIN = 'https://malicious-attacker.com';
export const AUTHORIZED_DEV_ORIGIN = 'http://127.0.0.1:5173';
export const AUTHORIZED_LOCAL_ORIGIN = 'http://localhost:5173';
export const AUTHORIZED_PROD_ORIGIN = 'http://127.0.0.1:3000';

export const MALFORMED_JSON_STRING = '{"action": "chat", "messages": [{"role": "user", "content": "hi"}';

/** Generates a dummy payload exceeding standard limit in bytes */
export function createOversizedPayload(sizeBytes = 120 * 1024): string {
  const padding = 'A'.repeat(sizeBytes);
  return JSON.stringify({
    action: 'chat',
    messages: [{ role: 'user', content: padding }]
  });
}
