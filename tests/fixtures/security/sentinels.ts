/**
 * tests/fixtures/security/sentinels.ts
 *
 * Synthetic sentinel tokens, provider constants, and SSRF/attack fixtures.
 * Owned by Subagent T10 (Independent Security Tester).
 *
 * INVARIANTS:
 * - Distinct sentinels per provider to detect cross-provider key forwarding.
 * - ZERO real secrets: all tokens are synthetic sentinels for verification only.
 */

export const SENTINEL_AGENTROUTER_KEY = 'sentinel-agentrouter-secret-key-11111';
export const SENTINEL_OPENROUTER_KEY = 'sentinel-openrouter-secret-key-22222';
export const SENTINEL_GENERIC_SERVER_KEY = 'sentinel-generic-server-key-33333';
export const SENTINEL_CLIENT_KEY = 'sentinel-client-custom-key-44444';

export const PROVIDER_URLS = {
  AGENTROUTER: 'https://agentrouter.org/v1',
  OPENROUTER: 'https://openrouter.ai/api/v1',
  OPENROUTER_ALT: 'https://api.openrouter.ai/v1',
  DEEPSEEK: 'https://api.deepseek.com'
} as const;

export const ATTACK_VECTORS = {
  // SSRF Loopback & Private
  LOOPBACK_IPV4: 'http://127.0.0.1:8080/admin',
  LOOPBACK_LOCALHOST: 'http://localhost:3000/api',
  LOOPBACK_IPV6: 'http://[::1]:8080/internal',
  CLOUD_METADATA_AWS: 'http://169.254.169.254/latest/meta-data',
  CLOUD_METADATA_GCP: 'http://metadata.google.internal/computeMetadata/v1',
  PRIVATE_RFC1918_10: 'http://10.0.0.1/admin',
  PRIVATE_RFC1918_172: 'http://172.16.0.1/secrets',
  PRIVATE_RFC1918_192: 'http://192.168.1.1/setup',
  ZERO_NETWORK: 'http://0.0.0.0:8080/api',

  // Fragment Path-Truncation Attacks (F03)
  AGENTROUTER_FRAGMENT: 'https://agentrouter.org/v1#injected',
  OPENROUTER_FRAGMENT: 'https://openrouter.ai/api/v1#/chat/completions',
  LOOPBACK_FRAGMENT: 'http://127.0.0.1:8080/admin-action#',
  EVIL_FRAGMENT: 'https://evil.com/leak#agentrouter.org',

  // Query Parameter Injection Attacks (G2)
  AGENTROUTER_QUERY: 'https://agentrouter.org/v1?admin=true',
  OPENROUTER_QUERY: 'https://openrouter.ai/api/v1?token=steal',

  // Spoofing / Domain Confusion
  SUBDOMAIN_SPOOF: 'https://agentrouter.org.evil.com/v1',
  PREFIX_SPOOF: 'https://evilagentrouter.org/v1',
  USERINFO_INJECTION: 'https://user:pass@agentrouter.org/v1'
} as const;
