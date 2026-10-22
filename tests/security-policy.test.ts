/**
 * tests/security-policy.test.ts
 *
 * Comprehensive Unit Tests for Upstream Security Boundary & Credential Protection.
 * Owned by Subagent A03 (Upstream Security Lead).
 *
 * Verifies:
 * - Allowlist enforcement on trusted AI providers (agentrouter.org, openrouter.ai).
 * - Attack URLs rejection (evil-attacker.com, agentrouter.org.evil.com, userinfo, javascript, ftp).
 * - SSRF defense (blocking 169.254.169.254, 10.0.0.0/8, 192.168.0.0/16, etc.).
 * - Zero-leakage credential isolation: server keys NEVER attached to untrusted/custom baseUrl.
 * - Secret redaction in raw strings and log messages.
 * - Origin validation and CORS header protection (no wildcard CORS).
 * - Safe fetch options with manual redirect policy.
 */

import { describe, it, expect } from 'vitest';
import {
  SENTINEL_AGENTROUTER_KEY,
  SENTINEL_OPENROUTER_KEY,
  SENTINEL_CLIENT_KEY as T10_SENTINEL_CLIENT_KEY,
  PROVIDER_URLS,
  ATTACK_VECTORS
} from './fixtures/security/index.js';
import {
  validateUpstreamUrl,
  isTrustedHost,
  isLoopbackOrLocalhost,
  isPrivateOrInternalIp,
  resolveUpstreamCredentials,
  resolveSafeApiKey,
  redactSecret,
  sanitizeHeaders,
  isAllowedOrigin,
  getCorsHeaders,
  getSafeFetchOptions,
  TRUSTED_AI_HOSTS,
  DEFAULT_AI_BASE_URL
} from '../server/security.js';

// Sentinel fake secret keys strictly for verification
const FAKE_SOL_KEY = 'sk-sentinel-sol-secret-99999';
const FAKE_DEEPSEEK_KEY = 'sk-sentinel-deepseek-secret-88888';
const FAKE_GENERIC_KEY = 'sk-sentinel-generic-key-77777';
const FAKE_CLIENT_KEY = 'sk-client-personal-key-11111';

describe('server/security.ts - Upstream Security Policy', () => {

  describe('1. Trusted AI Host Allowlist', () => {
    it('contains approved provider hosts', () => {
      expect(TRUSTED_AI_HOSTS.has('agentrouter.org')).toBe(true);
      expect(TRUSTED_AI_HOSTS.has('openrouter.ai')).toBe(true);
      expect(TRUSTED_AI_HOSTS.has('api.openrouter.ai')).toBe(true);
      expect(TRUSTED_AI_HOSTS.has('api.deepseek.com')).toBe(true);
    });

    it('validates trusted hosts with exact matching (no naive substring checks)', () => {
      expect(isTrustedHost('agentrouter.org')).toBe(true);
      expect(isTrustedHost('openrouter.ai')).toBe(true);
      expect(isTrustedHost('api.openrouter.ai')).toBe(true);

      // Attack vectors: substring / spoofing attempts MUST FAIL
      expect(isTrustedHost('evil-attacker.com')).toBe(false);
      expect(isTrustedHost('agentrouter.org.evil.com')).toBe(false);
      expect(isTrustedHost('evilagentrouter.org')).toBe(false);
      expect(isTrustedHost('notagentrouter.org')).toBe(false);
      expect(isTrustedHost('openrouter.ai.attacker.com')).toBe(false);
      expect(isTrustedHost('notopenrouter.ai')).toBe(false);
    });

    it('supports additional hosts configured via environment variable', () => {
      const customEnv = { TRUSTED_AI_HOSTS: 'my-proxy.company.internal, secure-ai.org' };
      expect(isTrustedHost('my-proxy.company.internal', undefined, customEnv)).toBe(true);
      expect(isTrustedHost('secure-ai.org', undefined, customEnv)).toBe(true);
      expect(isTrustedHost('evil.com', undefined, customEnv)).toBe(false);
    });
  });

  describe('2. validateUpstreamUrl - Attack URLs & Protocol Enforcement', () => {

    it('rejects URL with path-based substring spoofing (https://evil-attacker.com/agentrouter)', () => {
      const result = validateUpstreamUrl('https://evil-attacker.com/agentrouter');
      expect(result.valid).toBe(true);
      expect(result.isTrusted).toBe(false);
    });

    it('rejects URL with domain suffix spoofing (https://agentrouter.org.evil.com)', () => {
      const result = validateUpstreamUrl('https://agentrouter.org.evil.com');
      expect(result.valid).toBe(true);
      expect(result.isTrusted).toBe(false);
    });

    it('rejects remote http with query spoofing (http://evil.com?agentrouter)', () => {
      const result = validateUpstreamUrl('http://evil.com?agentrouter');
      expect(result.valid).toBe(false);
      expect(result.isTrusted).toBe(false);
      expect(result.error).toMatch(/Insecure protocol/i);
    });

    it('rejects URL containing userinfo (https://user:pass@agentrouter.org)', () => {
      const result = validateUpstreamUrl('https://user:pass@agentrouter.org');
      expect(result.valid).toBe(false);
      expect(result.isTrusted).toBe(false);
      expect(result.error).toMatch(/userinfo/i);
    });

    it('rejects URL with username only (https://admin@agentrouter.org)', () => {
      const result = validateUpstreamUrl('https://admin@agentrouter.org');
      expect(result.valid).toBe(false);
      expect(result.isTrusted).toBe(false);
      expect(result.error).toMatch(/userinfo/i);
    });

    it('rejects javascript: protocol', () => {
      const result = validateUpstreamUrl('javascript:alert(1)');
      expect(result.valid).toBe(false);
      expect(result.isTrusted).toBe(false);
      expect(result.error).toMatch(/Invalid protocol/i);
    });

    it('rejects ftp: protocol', () => {
      const result = validateUpstreamUrl('ftp://agentrouter.org/v1');
      expect(result.valid).toBe(false);
      expect(result.isTrusted).toBe(false);
      expect(result.error).toMatch(/Invalid protocol/i);
    });

    it('rejects file: and data: protocols', () => {
      expect(validateUpstreamUrl('file:///etc/passwd').valid).toBe(false);
      expect(validateUpstreamUrl('data:text/html,<script>').valid).toBe(false);
    });

    it('rejects malformed or empty URLs', () => {
      expect(validateUpstreamUrl('').valid).toBe(false);
      expect(validateUpstreamUrl('   ').valid).toBe(false);
      expect(validateUpstreamUrl('not-a-valid-url').valid).toBe(false);
      expect(validateUpstreamUrl(null as unknown as string).valid).toBe(false);
      expect(validateUpstreamUrl(undefined as unknown as string).valid).toBe(false);
    });

    it('rejects non-standard ports on remote providers', () => {
      const result = validateUpstreamUrl('https://agentrouter.org:8443/v1');
      expect(result.valid).toBe(false);
      expect(result.error).toMatch(/Non-standard port/i);
    });

    it('accepts legitimate trusted provider URLs', () => {
      const ar = validateUpstreamUrl('https://agentrouter.org/v1');
      expect(ar.valid).toBe(true);
      expect(ar.isTrusted).toBe(true);

      const or = validateUpstreamUrl('https://openrouter.ai/api/v1');
      expect(or.valid).toBe(true);
      expect(or.isTrusted).toBe(true);

      const aor = validateUpstreamUrl('https://api.openrouter.ai/v1');
      expect(aor.valid).toBe(true);
      expect(aor.isTrusted).toBe(true);
    });

    it('allows http only on localhost/127.0.0.1 in development/test', () => {
      const localResult = validateUpstreamUrl('http://127.0.0.1:5173', { allowLocalDev: true });
      expect(localResult.valid).toBe(true);
      expect(localResult.isTrusted).toBe(false);

      const localHostResult = validateUpstreamUrl('http://localhost:3000/api', { allowLocalDev: true });
      expect(localHostResult.valid).toBe(true);

      // In production (allowLocalDev: false), http is forbidden even for localhost
      const prodResult = validateUpstreamUrl('http://127.0.0.1:5173', { allowLocalDev: false });
      expect(prodResult.valid).toBe(false);
      expect(prodResult.error).toMatch(/Insecure protocol/i);
    });
  });

  describe('3. SSRF Defense & IP Range Restrictions', () => {
    it('identifies loopback and localhost addresses', () => {
      expect(isLoopbackOrLocalhost('localhost')).toBe(true);
      expect(isLoopbackOrLocalhost('127.0.0.1')).toBe(true);
      expect(isLoopbackOrLocalhost('127.0.1.1')).toBe(true);
      expect(isLoopbackOrLocalhost('::1')).toBe(true);
      expect(isLoopbackOrLocalhost('[::1]')).toBe(true);
      expect(isLoopbackOrLocalhost('google.com')).toBe(false);
    });

    it('identifies private, link-local, and cloud metadata IPs', () => {
      // AWS / GCP / Azure metadata endpoint
      expect(isPrivateOrInternalIp('169.254.169.254')).toBe(true);
      expect(isPrivateOrInternalIp('metadata.google.internal')).toBe(true);
      expect(isPrivateOrInternalIp('169.254.1.1')).toBe(true);

      // Private RFC 1918
      expect(isPrivateOrInternalIp('10.0.0.1')).toBe(true);
      expect(isPrivateOrInternalIp('172.16.0.1')).toBe(true);
      expect(isPrivateOrInternalIp('172.31.255.254')).toBe(true);
      expect(isPrivateOrInternalIp('192.168.1.1')).toBe(true);
      expect(isPrivateOrInternalIp('0.0.0.0')).toBe(true);

      // Public hosts
      expect(isPrivateOrInternalIp('agentrouter.org')).toBe(false);
      expect(isPrivateOrInternalIp('8.8.8.8')).toBe(false);
    });

    it('blocks SSRF attempts in validateUpstreamUrl for remote requests', () => {
      const metaHttp = validateUpstreamUrl('http://169.254.169.254/latest/meta-data', { allowLocalDev: false });
      expect(metaHttp.valid).toBe(false);

      const metaHttps = validateUpstreamUrl('https://169.254.169.254/latest/meta-data');
      expect(metaHttps.valid).toBe(false);
      expect(metaHttps.error).toMatch(/SSRF protection/i);

      const rfc10Https = validateUpstreamUrl('https://10.0.0.1/api');
      expect(rfc10Https.valid).toBe(false);
      expect(rfc10Https.error).toMatch(/SSRF protection/i);

      const rfc192 = validateUpstreamUrl('http://192.168.1.1/admin', { allowLocalDev: false });
      expect(rfc192.valid).toBe(false);
    });
  });

  describe('4. Zero-Leakage Credential Protection (Finding SEC-01)', () => {
    const testEnv = {
      AI_SOL_KEY: FAKE_SOL_KEY,
      AI_DEEPSEEK_KEY: FAKE_DEEPSEEK_KEY,
      AI_API_KEY: FAKE_GENERIC_KEY,
      AI_MODEL: 'gpt-6.1-sol'
    };

    it('NEVER attaches server keys when requestedBaseUrl is untrusted (without client apiKey)', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://evil-attacker.com/agentrouter',
        env: testEnv
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.keySource).toBe('none');
      expect(creds.isTrusted).toBe(false);
      expect(creds.error).toMatch(/UNAUTHORIZED_BASE_URL/i);

      // Guarantee sentinel keys are NOT in result
      expect(creds.apiKey).not.toBe(FAKE_SOL_KEY);
      expect(creds.apiKey).not.toBe(FAKE_DEEPSEEK_KEY);
      expect(creds.apiKey).not.toBe(FAKE_GENERIC_KEY);
      expect(resolveSafeApiKey({ requestedBaseUrl: 'https://evil-attacker.com/agentrouter', env: testEnv })).toBeNull();
    });

    it('NEVER attaches server keys for domain suffix attack (agentrouter.org.evil.com)', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org.evil.com/v1',
        env: testEnv
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.keySource).toBe('none');
      expect(creds.error).toMatch(/UNAUTHORIZED_BASE_URL/i);
    });

    it('forwards ONLY client apiKey when client provides custom untrusted baseUrl + client key', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://my-custom-llm-proxy.com/v1',
        clientApiKey: FAKE_CLIENT_KEY,
        env: testEnv
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.apiKey).toBe(FAKE_CLIENT_KEY);
      expect(creds.keySource).toBe('client');
      expect(creds.isCustomUrl).toBe(true);
      expect(creds.isTrusted).toBe(false);

      // Guarantee server keys are NOT used
      expect(creds.apiKey).not.toBe(FAKE_SOL_KEY);
      expect(creds.apiKey).not.toBe(FAKE_DEEPSEEK_KEY);
      expect(creds.apiKey).not.toBe(FAKE_GENERIC_KEY);
    });

    it('injects server keys ONLY when destination is a trusted host and client key is absent', () => {
      const credsSol = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        model: 'gpt-6.1-sol',
        env: testEnv
      });

      expect(credsSol.isAllowed).toBe(true);
      expect(credsSol.apiKey).toBe(FAKE_SOL_KEY);
      expect(credsSol.keySource).toBe('server');
      expect(credsSol.isTrusted).toBe(true);

      const credsDeepseek = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        model: 'deepseek-v4-flash',
        env: testEnv
      });

      expect(credsDeepseek.isAllowed).toBe(true);
      expect(credsDeepseek.apiKey).toBe(FAKE_DEEPSEEK_KEY);
      expect(credsDeepseek.keySource).toBe('server');
    });

    it('prefers client apiKey even when destination is a trusted host', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        clientApiKey: FAKE_CLIENT_KEY,
        env: testEnv
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.apiKey).toBe(FAKE_CLIENT_KEY);
      expect(creds.keySource).toBe('client');
      expect(creds.apiKey).not.toBe(FAKE_SOL_KEY);
    });

    it('uses server keys with default trusted baseUrl when no baseUrl is requested', () => {
      const creds = resolveUpstreamCredentials({
        model: 'gpt-6.1-sol',
        env: testEnv
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.baseUrl).toBe(DEFAULT_AI_BASE_URL);
      expect(creds.apiKey).toBe(FAKE_SOL_KEY);
      expect(creds.keySource).toBe('server');
    });

    it('automatically defaults to OpenRouter when client key starts with sk-or-', () => {
      const creds = resolveUpstreamCredentials({
        clientApiKey: 'sk-or-v1-my-openrouter-key',
        env: testEnv
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.baseUrl).toBe('https://openrouter.ai/api/v1');
      expect(creds.apiKey).toBe('sk-or-v1-my-openrouter-key');
      expect(creds.keySource).toBe('client');
    });

    it('rejects when requestedBaseUrl is malformed or invalid', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://user:pass@agentrouter.org',
        env: testEnv
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.keySource).toBe('none');
      expect(creds.error).toMatch(/userinfo/i);
    });

    it('rejects when no client key and no server key are configured', () => {
      const emptyEnv = {};
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: 'https://agentrouter.org/v1',
        env: emptyEnv
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.keySource).toBe('none');
      expect(creds.error).toMatch(/No API key provided by client and no server key configured/i);
    });

    it('rejects when default baseUrl in env is invalid', () => {
      const creds = resolveUpstreamCredentials({
        env: { AI_BASE_URL: 'invalid-scheme://bad' }
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.error).toMatch(/Server default baseUrl is invalid/i);
    });

    it('rejects when default baseUrl has no keys configured anywhere', () => {
      const creds = resolveUpstreamCredentials({
        env: {}
      });

      expect(creds.isAllowed).toBe(false);
      expect(creds.apiKey).toBeNull();
      expect(creds.error).toMatch(/No API key configured for default upstream provider/i);
    });
  });

  describe('5. Redaction & Sanitization', () => {
    it('redacts raw secret tokens without revealing secret content', () => {
      const rawSecret = 'sk-sentinel-secret-12345';
      const redacted = redactSecret(rawSecret);

      expect(redacted).toBe('sk-...2345');
      expect(redacted).not.toContain('sentinel');
      expect(redacted).not.toContain('secret');
      expect(redacted.length).toBeLessThan(rawSecret.length);
    });

    it('redacts short strings with asterisks', () => {
      expect(redactSecret('12345')).toBe('***');
      expect(redactSecret('secret')).toBe('***');
      expect(redactSecret('')).toBe('');
      expect(redactSecret(null)).toBe('');
      expect(redactSecret(undefined)).toBe('');
    });

    it('redacts Bearer tokens embedded inside log messages', () => {
      const logMessage = 'Error connecting to upstream: Authorization: Bearer sk-sentinel-secret-12345 timed out';
      const sanitized = redactSecret(logMessage);

      expect(sanitized).not.toContain('sk-sentinel-secret-12345');
      expect(sanitized).not.toContain('secret-12345');
      expect(sanitized).toContain('Bearer [REDACTED]');
    });

    it('redacts api-key parameters inside log text', () => {
      const log = 'Failed request with api_key="sk-sentinel-secret-99999"';
      const sanitized = redactSecret(log);

      expect(sanitized).not.toContain('sk-sentinel-secret-99999');
      expect(sanitized).toContain('[REDACTED]');
    });

    it('sanitizes headers dictionary removing authorization and secret values', () => {
      const headers = {
        'Content-Type': 'application/json',
        Authorization: 'Bearer sk-sentinel-secret-12345',
        Cookie: 'session_token=sk-sentinel-cookie-token-secret-99999',
        'X-API-Key': 'sk-sentinel-api-key-88888',
        'X-Client-Secret': 'super-secret-client-value',
        'X-Array-Header': ['item1', 'sk-secret-array-val-12345'],
        Accept: 'application/json'
      };

      const clean = sanitizeHeaders(headers);
      expect(clean['Content-Type']).toBe('application/json');
      expect(clean['Accept']).toBe('application/json');
      expect(clean['Authorization']).not.toContain('sk-sentinel-secret-12345');
      expect(clean['Cookie']).not.toContain('sk-sentinel-cookie-token-secret-99999');
      expect(clean['X-API-Key']).not.toContain('sk-sentinel-api-key-88888');
      expect(clean['X-Client-Secret']).not.toContain('super-secret-client-value');
      expect(clean['X-Array-Header']).toBe('item1, sk-secret-array-val-12345');
    });
  });

  describe('6. Origin & CORS Protection', () => {
    it('allows localhost and loopback origins on arbitrary ports', () => {
      expect(isAllowedOrigin('http://localhost:5173')).toBe(true);
      expect(isAllowedOrigin('http://localhost:3000')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:5173')).toBe(true);
      expect(isAllowedOrigin('http://127.0.0.1:3000')).toBe(true);
      expect(isAllowedOrigin('https://localhost:443')).toBe(true);
    });

    it('allows missing or undefined origin for non-browser/internal calls', () => {
      expect(isAllowedOrigin(undefined)).toBe(true);
      expect(isAllowedOrigin('')).toBe(true);
    });

    it('strictly forbids cross-origin attacker websites', () => {
      expect(isAllowedOrigin('https://evil-attacker.com')).toBe(false);
      expect(isAllowedOrigin('http://attacker.com:5173')).toBe(false);
      expect(isAllowedOrigin('http://localhost.evil.com')).toBe(false);
      expect(isAllowedOrigin('https://phishing-zhongxue.com')).toBe(false);
    });

    it('allows explicitly configured production origins', () => {
      const prodEnv = { APP_ORIGIN: 'https://zhongxue.tw, https://app.zhongxue.tw' };
      expect(isAllowedOrigin('https://zhongxue.tw', prodEnv)).toBe(true);
      expect(isAllowedOrigin('https://app.zhongxue.tw', prodEnv)).toBe(true);
      expect(isAllowedOrigin('https://fake-zhongxue.tw', prodEnv)).toBe(false);
    });

    it('generates secure CORS headers without wildcard (*)', () => {
      const corsValid = getCorsHeaders('http://127.0.0.1:5173');
      expect(corsValid['Access-Control-Allow-Origin']).toBe('http://127.0.0.1:5173');
      expect(corsValid['Access-Control-Allow-Origin']).not.toBe('*');
      expect(corsValid['Vary']).toBe('Origin');

      // Attacker origin receives empty CORS headers (no access granted)
      const corsAttacker = getCorsHeaders('https://evil-attacker.com');
      expect(corsAttacker).toEqual({});
      expect(corsAttacker['Access-Control-Allow-Origin']).toBeUndefined();
    });
  });

  describe('7. Safe Fetch Options & Redirect Protection', () => {
    it('enforces redirect: manual to prevent credential leaking via 301/302 redirects', () => {
      const options = getSafeFetchOptions({
        apiKey: FAKE_SOL_KEY,
        body: JSON.stringify({ action: 'ping' })
      });

      expect(options.redirect).toBe('manual');
      expect(options.method).toBe('POST');
      expect((options.headers as Record<string, string>)['Authorization']).toBe(`Bearer ${FAKE_SOL_KEY}`);
      expect((options.headers as Record<string, string>)['Content-Type']).toBe('application/json');
    });

    it('omits Authorization header when apiKey is null or undefined', () => {
      const options = getSafeFetchOptions({
        apiKey: null
      });

      expect((options.headers as Record<string, string>)['Authorization']).toBeUndefined();
      expect(options.redirect).toBe('manual');
    });
  });

  // ==========================================================================
  // Section 8: T10 Acceptance Tests - F02: Provider Key Confusion & Binding (G2)
  // ==========================================================================
  describe('8. T10 Acceptance Tests: F02 Provider Key Confusion & Isolation (G2)', () => {
    const providerEnv = {
      AI_SOL_KEY: SENTINEL_AGENTROUTER_KEY,
      AI_DEEPSEEK_KEY: SENTINEL_AGENTROUTER_KEY,
      AI_API_KEY: SENTINEL_AGENTROUTER_KEY,
      AI_BASE_URL: PROVIDER_URLS.AGENTROUTER,
      AI_MODEL: 'gpt-6.1-sol'
    };

    it('F02.1: MUST NOT attach AgentRouter server key when client requests OpenRouter without apiKey', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: PROVIDER_URLS.OPENROUTER,
        model: 'gpt-6.1-sol',
        env: providerEnv
      });

      // G2 Invariant:
      // When client does not provide apiKey and specifies OpenRouter (or custom),
      // backend MUST NOT transfer server key of AgentRouter to OpenRouter.
      expect(creds.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
      expect(creds.isAllowed).toBe(false);
      expect(creds.keySource).toBe('none');
    });

    it('F02.2: MUST NOT attach AgentRouter server key when client requests api.openrouter.ai without apiKey', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: PROVIDER_URLS.OPENROUTER_ALT,
        model: 'gpt-6.1-sol',
        env: providerEnv
      });

      expect(creds.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
      expect(creds.isAllowed).toBe(false);
      expect(creds.keySource).toBe('none');
    });

    it('F02.3: Multi-provider isolation with distinct sentinels: binds ONLY correct sentinel per provider', () => {
      const multiProviderEnv = {
        AI_AGENTROUTER_KEY: SENTINEL_AGENTROUTER_KEY,
        AI_SOL_KEY: SENTINEL_AGENTROUTER_KEY,
        AI_OPENROUTER_KEY: SENTINEL_OPENROUTER_KEY,
        AI_BASE_URL: PROVIDER_URLS.AGENTROUTER
      };

      // Requesting AgentRouter must receive AgentRouter sentinel
      const credsAgentRouter = resolveUpstreamCredentials({
        requestedBaseUrl: PROVIDER_URLS.AGENTROUTER,
        env: multiProviderEnv
      });
      expect(credsAgentRouter.isAllowed).toBe(true);
      expect(credsAgentRouter.apiKey).toBe(SENTINEL_AGENTROUTER_KEY);
      expect(credsAgentRouter.apiKey).not.toBe(SENTINEL_OPENROUTER_KEY);

      // Requesting OpenRouter without client key: must NEVER receive AgentRouter sentinel
      const credsOpenRouter = resolveUpstreamCredentials({
        requestedBaseUrl: PROVIDER_URLS.OPENROUTER,
        env: multiProviderEnv
      });
      expect(credsOpenRouter.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
    });

    it('F02.4: Client-provided apiKey is forwarded to OpenRouter, NEVER substituting server AgentRouter key', () => {
      const creds = resolveUpstreamCredentials({
        requestedBaseUrl: PROVIDER_URLS.OPENROUTER,
        clientApiKey: T10_SENTINEL_CLIENT_KEY,
        env: providerEnv
      });

      expect(creds.isAllowed).toBe(true);
      expect(creds.apiKey).toBe(T10_SENTINEL_CLIENT_KEY);
      expect(creds.apiKey).not.toBe(SENTINEL_AGENTROUTER_KEY);
      expect(creds.keySource).toBe('client');
    });
  });

  // ==========================================================================
  // Section 9: T10 Acceptance Tests - F03: SSRF, Fragment, Query & Defaults (G2)
  // ==========================================================================
  describe('9. T10 Acceptance Tests: F03 SSRF Defense, Fragment & Query Rejection (G2)', () => {
    it('F03.1: Strictly REJECTS URLs containing fragment (#) which truncate path', () => {
      const fragmentUrls = [
        'https://agentrouter.org/v1#injected',
        'https://openrouter.ai/api/v1#/chat/completions',
        'http://127.0.0.1:8080/admin-action#',
        'https://api.openrouter.ai/v1#frag',
        'https://evil.com/admin#agentrouter.org'
      ];

      for (const url of fragmentUrls) {
        const result = validateUpstreamUrl(url, { allowLocalDev: true });
        expect(result.valid, `Expected URL with fragment to be rejected: ${url}`).toBe(false);
        expect(result.error).toMatch(/fragment/i);
      }
    });

    it('F03.2: Strictly REJECTS URLs containing query parameters (?) in baseUrl', () => {
      const queryUrls = [
        'https://agentrouter.org/v1?admin=true',
        'https://openrouter.ai/api/v1?token=steal',
        'https://api.deepseek.com?bypass=1'
      ];

      for (const url of queryUrls) {
        const result = validateUpstreamUrl(url);
        expect(result.valid, `Expected URL with query parameters to be rejected: ${url}`).toBe(false);
        expect(result.error).toMatch(/query/i);
      }
    });

    it('F03.3: Production default MUST reject loopback/localhost/private IP unless allowLocalDev is explicitly true', () => {
      const localUrls = [
        'http://127.0.0.1:8080/v1',
        'http://localhost:3000/v1',
        'http://[::1]:8080/v1'
      ];

      for (const url of localUrls) {
        // Without allowLocalDev, must be rejected by default
        const defaultResult = validateUpstreamUrl(url, { env: {} });
        expect(defaultResult.valid, `Expected local URL ${url} to be rejected by default`).toBe(false);
        expect(defaultResult.error).toMatch(/Insecure protocol|SSRF|private|internal|loopback/i);
      }
    });

    it('F03.4: Strictly REJECTS cloud metadata & RFC 1918 private IP ranges under all conditions', () => {
      const ssrfUrls = [
        'http://169.254.169.254/latest/meta-data',
        'https://169.254.169.254/latest/meta-data',
        'http://metadata.google.internal/computeMetadata/v1',
        'http://10.0.0.1/admin',
        'https://10.0.0.1/admin',
        'http://172.16.0.1/secret',
        'http://192.168.1.1/setup',
        'http://0.0.0.0:8080'
      ];

      for (const url of ssrfUrls) {
        const res = validateUpstreamUrl(url, { allowLocalDev: true });
        expect(res.valid, `Expected SSRF target ${url} to be rejected`).toBe(false);
        expect(res.error).toMatch(/SSRF|private|internal|Insecure protocol/i);
      }
    });
  });

});
