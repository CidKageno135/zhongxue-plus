/**
 * server/security.ts
 *
 * Upstream Security Boundary & Credential Protection for ZhongXue V2.
 * Owned by Subagent A03 (Upstream Security Lead).
 *
 * Enforces:
 * 1. Strict trusted host allowlist (agentrouter.org, openrouter.ai).
 * 2. URL parsing & protocol enforcement (https strictly required; http only for localhost in dev).
 * 3. Userinfo forbidding (user:pass@host) & port restriction.
 * 4. SSRF protection against private/internal/cloud-metadata IP ranges.
 * 5. Credential protection: Server environment keys (AI_SOL_KEY, AI_DEEPSEEK_KEY, AI_API_KEY)
 *    are NEVER forwarded to untrusted or custom client-provided baseUrl.
 * 6. Secret redaction and sanitization to prevent key leaks in logs/errors.
 * 7. Origin & CORS protection (strict origin checking, no wildcard CORS).
 */

/** Default canonical upstream base URL */
export const DEFAULT_AI_BASE_URL = 'https://agentrouter.org/v1';

/** Default set of trusted upstream AI provider hosts */
export const TRUSTED_AI_HOSTS: ReadonlySet<string> = new Set([
  'agentrouter.org',
  'openrouter.ai',
  'api.openrouter.ai',
  'api.deepseek.com'
]);

/** Result of validateUpstreamUrl */
export interface UpstreamUrlValidationResult {
  valid: boolean;
  isTrusted: boolean;
  error?: string;
  url?: URL;
}

/** Options for credential resolution */
export interface ResolveCredentialsOptions {
  model?: string;
  requestedBaseUrl?: string;
  clientApiKey?: string;
  env?: Record<string, string | undefined>;
  allowLocalDev?: boolean;
}

/** Resolved credentials object */
export interface ResolvedCredentials {
  apiKey: string | null;
  baseUrl: string;
  isAllowed: boolean;
  isTrusted: boolean;
  isCustomUrl: boolean;
  keySource: 'client' | 'server' | 'none';
  error?: string;
}

/**
 * Get active trusted AI hosts set, merging defaults with any hosts in process.env.TRUSTED_AI_HOSTS.
 */
export function getTrustedAiHosts(env: Record<string, string | undefined> = process.env): Set<string> {
  const hosts = new Set<string>(TRUSTED_AI_HOSTS);
  const extra = env.TRUSTED_AI_HOSTS;
  if (extra && typeof extra === 'string') {
    for (const host of extra.split(',')) {
      const trimmed = host.trim().toLowerCase();
      if (trimmed) {
        hosts.add(trimmed);
      }
    }
  }
  return hosts;
}

/**
 * Checks if a hostname matches the trusted AI host allowlist.
 * Explicit exact match only — NO naive substring checking like includes('agentrouter').
 */
export function isTrustedHost(
  hostname: string,
  customHosts?: Set<string>,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!hostname || typeof hostname !== 'string') return false;
  const normalized = hostname.toLowerCase().trim();
  const hosts = customHosts || getTrustedAiHosts(env);
  return hosts.has(normalized);
}

/**
 * Checks whether a hostname refers to localhost or local loopback.
 */
export function isLoopbackOrLocalhost(hostname: string): boolean {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');
  return (
    h === 'localhost' ||
    h === '127.0.0.1' ||
    h === '::1' ||
    h.startsWith('127.')
  );
}

/**
 * Checks if an IP or host belongs to private/internal/cloud-metadata networks (SSRF defense).
 */
export function isPrivateOrInternalIp(hostname: string): boolean {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, '');

  // Cloud metadata endpoint (AWS, GCP, Azure, DigitalOcean)
  if (h === '169.254.169.254' || h === 'metadata.google.internal' || h.startsWith('169.254.')) {
    return true;
  }

  // IPv4 Loopback
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }

  // RFC 1918 Private networks:
  // 10.0.0.0/8
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  // 172.16.0.0/12 (172.16.0.0 - 172.31.255.255)
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)) {
    return true;
  }
  // 192.168.0.0/16
  if (/^192\.168\.\d+\.\d+$/.test(h)) {
    return true;
  }
  // 0.0.0.0/8
  if (/^0\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }

  // IPv6 Loopback / Private / Link-local
  if (h === '::1' || h === '::' || /^fe80:/i.test(h) || /^fc00:/i.test(h) || /^fd00:/i.test(h)) {
    return true;
  }

  return false;
}

/**
 * Strict URL parsing and validation for upstream providers.
 *
 * Rules:
 * - Must be valid URL parseable by URL constructor.
 * - Must NOT contain userinfo (user:pass@host).
 * - Protocol must be https: for all remote hosts.
 * - Protocol http: is strictly forbidden for remote hosts, permitted ONLY for localhost in dev/test.
 * - For remote https hosts, ports other than standard (443 / default) are forbidden.
 * - Private / Link-local / Cloud metadata IP addresses are strictly blocked.
 * - Hostname is validated against trusted hosts without substring guessing.
 */
export function validateUpstreamUrl(
  urlStr: string | undefined | null,
  options?: { allowLocalDev?: boolean; env?: Record<string, string | undefined> }
): UpstreamUrlValidationResult {
  if (!urlStr || typeof urlStr !== 'string' || !urlStr.trim()) {
    return { valid: false, isTrusted: false, error: 'URL must be a non-empty string' };
  }

  const trimmed = urlStr.trim();

  // F03: Strictly forbid fragment (#) anywhere in the URL string
  if (trimmed.includes('#')) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden fragment: URLs containing "#" are strictly forbidden'
    };
  }

  // Explicitly require http:// or https:// scheme prefix
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Invalid protocol: only https is allowed for upstream providers (http only for localhost in development)'
    };
  }

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, isTrusted: false, error: 'Malformed URL: unable to parse' };
  }

  // Double check fragment from parsed URL object
  if (parsed.hash && parsed.hash !== '') {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden fragment: URLs containing "#" are strictly forbidden'
    };
  }

  // Strictly forbid userinfo (user:pass@host)
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden userinfo: URLs containing username or password are not permitted'
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port;
  const env = options?.env || process.env;

  const isLocal = isLoopbackOrLocalhost(hostname);
  // F03: Default secure: loopback / local dev requires explicit opt-in allowLocalDev === true or ALLOW_LOCAL_TEST_UPSTREAM === 'true'
  const isDevOrTest = options?.allowLocalDev === true || env.ALLOW_LOCAL_TEST_UPSTREAM === 'true';

  // Reject local loopback/localhost when not in explicitly allowed dev/test mode
  if (isLocal && !isDevOrTest) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Insecure protocol: loopback/localhost access is forbidden unless allowLocalDev is explicitly enabled'
    };
  }

  // Protocol validation:
  if (protocol === 'http:') {
    if (!isLocal || !isDevOrTest) {
      return {
        valid: false,
        isTrusted: false,
        error: isLocal
          ? 'Insecure protocol: http is forbidden for loopback unless allowLocalDev is explicitly enabled'
          : 'Insecure protocol: http is strictly forbidden for remote upstream providers'
      };
    }
  } else if (protocol !== 'https:') {
    return {
      valid: false,
      isTrusted: false,
      error: `Unsupported protocol: ${protocol}. Only https is supported.`
    };
  }

  // F03: Strictly forbid query parameters (?) in baseUrl
  if (trimmed.includes('?') || (parsed.search && parsed.search !== '')) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden query: URLs containing query parameters are not permitted in baseUrl'
    };
  }

  // SSRF Protection: block private/internal/cloud metadata IP addresses
  if (isPrivateOrInternalIp(hostname)) {
    if (!isLocal || !isDevOrTest) {
      return {
        valid: false,
        isTrusted: false,
        error: `SSRF protection: access to private or internal address (${hostname}) is blocked`
      };
    }
  }

  // Remote port check: remote hosts must use standard port (443 or default)
  if (!isLocal) {
    if (port && port !== '443') {
      return {
        valid: false,
        isTrusted: false,
        error: `Non-standard port (${port}) is forbidden for remote upstream providers`
      };
    }
  }

  // Check trusted host list
  const isTrusted = isTrustedHost(hostname, undefined, env);

  return {
    valid: true,
    isTrusted,
    url: parsed
  };
}

/**
 * Recognized AI provider types for strict key binding (F02).
 */
export type AiProvider = 'agentrouter' | 'openrouter' | 'deepseek' | 'custom';

/**
 * Identifies the AI provider based on hostname.
 */
export function getProviderForHostname(hostname: string): AiProvider {
  if (!hostname || typeof hostname !== 'string') return 'custom';
  const h = hostname.toLowerCase().trim();
  if (h === 'agentrouter.org' || h.endsWith('.agentrouter.org')) {
    return 'agentrouter';
  }
  if (h === 'openrouter.ai' || h === 'api.openrouter.ai' || h.endsWith('.openrouter.ai')) {
    return 'openrouter';
  }
  if (h === 'api.deepseek.com' || h.endsWith('.deepseek.com')) {
    return 'deepseek';
  }
  return 'custom';
}

/**
 * Resolves server API key strictly scoped to the destination provider (F02).
 * Prevents transferring AgentRouter server keys to OpenRouter or other providers.
 */
export function getServerKeyForProvider(
  provider: AiProvider,
  model?: string,
  env: Record<string, string | undefined> = process.env,
  destinationBaseUrl: string = env.AI_BASE_URL || DEFAULT_AI_BASE_URL
): string {
  const modelName = (model || env.AI_MODEL || '').toLowerCase();
  // The legacy generic key belongs to the exact validated configured origin.
  // A client changing providers (or provider aliases) must not transfer it.
  const configured = validateUpstreamUrl(env.AI_BASE_URL || DEFAULT_AI_BASE_URL, { env });
  const destination = validateUpstreamUrl(destinationBaseUrl, { env });
  const genericKey = configured.valid && configured.isTrusted && configured.url &&
    destination.valid && destination.isTrusted && destination.url &&
    configured.url.origin === destination.url.origin &&
    getProviderForHostname(configured.url.hostname) === provider
    ? (env.AI_API_KEY || '').trim()
    : '';

  if (provider === 'agentrouter') {
    const isSol = modelName === 'gpt-6.1-sol' || modelName.includes('sol');
    const agentRouterKey = (env.AI_AGENTROUTER_KEY || '').trim();
    const solKey = (env.AI_SOL_KEY || '').trim();
    const deepseekKey = (env.AI_DEEPSEEK_KEY || '').trim();

    if (isSol) {
      return solKey || agentRouterKey || genericKey || deepseekKey;
    }
    return deepseekKey || agentRouterKey || genericKey || solKey;
  }

  if (provider === 'openrouter') {
    return (env.AI_OPENROUTER_KEY || '').trim() || genericKey;
  }

  if (provider === 'deepseek') {
    return (env.AI_DEEPSEEK_DIRECT_KEY || '').trim();
  }

  return '';
}

/**
 * Determine default server API key based on requested model and environment.
 */
export function getServerKeyForModel(
  model?: string,
  env: Record<string, string | undefined> = process.env
): string {
  const defaultUrl = env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  let provider: AiProvider = 'agentrouter';
  try {
    const parsed = new URL(defaultUrl);
    provider = getProviderForHostname(parsed.hostname);
  } catch {
    provider = 'agentrouter';
  }
  return getServerKeyForProvider(provider, model, env);
}

/**
 * Determine default upstream baseUrl when client does not supply one.
 */
export function getDefaultBaseUrl(
  clientApiKey?: string,
  env: Record<string, string | undefined> = process.env
): string {
  if (env.AI_BASE_URL && env.AI_BASE_URL.trim()) {
    return env.AI_BASE_URL.trim();
  }
  if (clientApiKey && clientApiKey.startsWith('sk-or-')) {
    return 'https://openrouter.ai/api/v1';
  }
  return DEFAULT_AI_BASE_URL;
}

/**
 * Resolves upstream credentials and baseUrl with zero credential leaking.
 *
 * Core invariant:
 * - Server environment keys (AI_SOL_KEY, AI_DEEPSEEK_KEY, AI_API_KEY) are ONLY injected
 *   when the destination is an approved trusted host AND matches the intended provider.
 * - If client provides custom baseUrl:
 *     - If client provides their own apiKey, forward ONLY client's key.
 *     - If client does NOT provide apiKey, REJECT request (isAllowed = false).
 *       NEVER attach server keys to a custom or untrusted baseUrl.
 * - F02: Server key is strictly bound to provider (OpenRouter will never receive AgentRouter key).
 */
export function resolveUpstreamCredentials(options: ResolveCredentialsOptions): ResolvedCredentials {
  const env = options.env || process.env;
  const clientKey = (options.clientApiKey || '').trim();
  const requestedBaseUrl = (options.requestedBaseUrl || '').trim();

  // Case 1: Client specified a custom baseUrl
  if (requestedBaseUrl) {
    const urlValidation = validateUpstreamUrl(requestedBaseUrl, {
      allowLocalDev: options.allowLocalDev,
      env
    });

    if (!urlValidation.valid) {
      return {
        apiKey: null,
        baseUrl: requestedBaseUrl,
        isAllowed: false,
        isTrusted: false,
        isCustomUrl: true,
        keySource: 'none',
        error: urlValidation.error || 'Invalid baseUrl'
      };
    }

    const cleanBaseUrl = requestedBaseUrl.replace(/\/+$/, '');
    const hostname = urlValidation.url ? urlValidation.url.hostname.toLowerCase() : '';
    const provider = getProviderForHostname(hostname);

    // Destination is trusted host
    if (urlValidation.isTrusted) {
      // If client provided their own key, prefer client's key
      if (clientKey) {
        return {
          apiKey: clientKey,
          baseUrl: cleanBaseUrl,
          isAllowed: true,
          isTrusted: true,
          isCustomUrl: false,
          keySource: 'client'
        };
      }

      // No client key, but destination IS trusted: inject server key strictly bound to provider (F02)
      const serverKey = getServerKeyForProvider(provider, options.model, env, cleanBaseUrl);
      if (serverKey) {
        return {
          apiKey: serverKey,
          baseUrl: cleanBaseUrl,
          isAllowed: true,
          isTrusted: true,
          isCustomUrl: false,
          keySource: 'server'
        };
      }

      return {
        apiKey: null,
        baseUrl: cleanBaseUrl,
        isAllowed: false,
        isTrusted: true,
        isCustomUrl: false,
        keySource: 'none',
        error: `No API key provided by client and no server key configured for trusted host (${hostname}). Client must provide an apiKey.`
      };
    }

    // Destination is NOT a trusted host (custom or external baseUrl):
    // Strict credential protection:
    // If client supplied their OWN key, forward ONLY client's key
    if (clientKey) {
      return {
        apiKey: clientKey,
        baseUrl: cleanBaseUrl,
        isAllowed: true,
        isTrusted: false,
        isCustomUrl: true,
        keySource: 'client'
      };
    }

    // Client did NOT supply apiKey for untrusted/custom baseUrl:
    // REJECT request immediately. Server keys MUST NEVER be attached!
    return {
      apiKey: null,
      baseUrl: cleanBaseUrl,
      isAllowed: false,
      isTrusted: false,
      isCustomUrl: true,
      keySource: 'none',
      error: 'UNAUTHORIZED_BASE_URL: Custom or untrusted baseUrl requires client-provided apiKey. Server keys are never forwarded to untrusted destinations.'
    };
  }

  // Case 2: No requestedBaseUrl provided, use default upstream
  const defaultBaseUrl = getDefaultBaseUrl(clientKey, env);
  const cleanDefaultUrl = defaultBaseUrl.replace(/\/+$/, '');
  const urlValidation = validateUpstreamUrl(cleanDefaultUrl, {
    allowLocalDev: options.allowLocalDev,
    env
  });

  if (!urlValidation.valid) {
    return {
      apiKey: null,
      baseUrl: cleanDefaultUrl,
      isAllowed: false,
      isTrusted: false,
      isCustomUrl: false,
      keySource: 'none',
      error: `Server default baseUrl is invalid: ${urlValidation.error}`
    };
  }

  // Client provided their own key
  if (clientKey) {
    return {
      apiKey: clientKey,
      baseUrl: cleanDefaultUrl,
      isAllowed: true,
      isTrusted: urlValidation.isTrusted,
      isCustomUrl: false,
      keySource: 'client'
    };
  }

  // Only inject server key if default url is trusted
  if (urlValidation.isTrusted) {
    const hostname = urlValidation.url ? urlValidation.url.hostname.toLowerCase() : '';
    const provider = getProviderForHostname(hostname);
    const serverKey = getServerKeyForProvider(provider, options.model, env, cleanDefaultUrl);
    if (serverKey) {
      return {
        apiKey: serverKey,
        baseUrl: cleanDefaultUrl,
        isAllowed: true,
        isTrusted: true,
        isCustomUrl: false,
        keySource: 'server'
      };
    }
  }

  return {
    apiKey: null,
    baseUrl: cleanDefaultUrl,
    isAllowed: false,
    isTrusted: urlValidation.isTrusted,
    isCustomUrl: false,
    keySource: 'none',
    error: 'No API key configured for default upstream provider'
  };
}

/**
 * Handoff convenience helper: resolves safe API key or returns null if not allowed.
 */
export function resolveSafeApiKey(options: ResolveCredentialsOptions): string | null {
  const creds = resolveUpstreamCredentials(options);
  return creds.isAllowed ? creds.apiKey : null;
}

/**
 * Redacts secrets (API keys, authorization tokens) to prevent leaking in logs, errors, or traces.
 *
 * If given a raw token: masks middle characters (e.g. `sk-...345`).
 * If given a log/sentence: masks Bearer tokens and sk- prefixes.
 */
export function redactSecret(secret: string | undefined | null): string {
  if (!secret || typeof secret !== 'string') return '';
  const trimmed = secret.trim();
  if (trimmed.length === 0) return '';
  if (trimmed.length <= 8) return '***';

  // Single secret token without whitespace
  if (!/\s/.test(trimmed)) {
    const prefix = trimmed.slice(0, 3);
    const suffix = trimmed.slice(-4);
    return `${prefix}...${suffix}`;
  }

  // Text message containing secrets
  return trimmed
    .replace(/(Bearer\s+)[A-Za-z0-9_\-.]{8,}/gi, '$1[REDACTED]')
    .replace(/(sk-[A-Za-z0-9_\-.]{3})[A-Za-z0-9_\-.]*([A-Za-z0-9_\-.]{4})/gi, '$1...$2')
    .replace(/((?:api[_-]?key|secret|password|token)\s*[:=]\s*["']?)[^"'\s\n]{8,}(["']?)/gi, '$1[REDACTED]$2');
}

/**
 * Sanitizes an HTTP headers object for safe logging.
 */
export function sanitizeHeaders(
  headers: Record<string, string | string[] | undefined>
): Record<string, string> {
  const sanitized: Record<string, string> = {};
  for (const [key, value] of Object.entries(headers)) {
    if (value === undefined) continue;
    const strVal = Array.isArray(value) ? value.join(', ') : String(value);
    const lowerKey = key.toLowerCase();
    if (
      lowerKey === 'authorization' ||
      lowerKey === 'cookie' ||
      lowerKey.includes('key') ||
      lowerKey.includes('secret')
    ) {
      sanitized[key] = redactSecret(strVal);
    } else {
      sanitized[key] = strVal;
    }
  }
  return sanitized;
}

/** Default allowed origin patterns for localhost / local loopback */
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;

/**
 * Validates request Origin against allowed origins.
 * Allowed:
 * - localhost / 127.0.0.1 on any port
 * - Explicit configured origins in APP_ORIGIN or ALLOWED_ORIGINS env
 */
export function isAllowedOrigin(
  origin: string | undefined,
  env: Record<string, string | undefined> = process.env
): boolean {
  if (!origin || typeof origin !== 'string') {
    // Missing origin: typically same-origin GET/POST or non-browser client
    return true;
  }

  const normalized = origin.trim().toLowerCase();

  // Allow localhost & loopback on any port
  if (LOCAL_ORIGIN_REGEX.test(normalized)) {
    return true;
  }

  // Check configured production origins
  const configured = [
    env.APP_ORIGIN,
    env.ALLOWED_ORIGINS,
    ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL]
      .filter((v): v is string => Boolean(v && v.trim()))
      .map((v) => {
        const clean = v.trim().replace(/^https?:\/\//i, '').replace(/\/+$/, '');
        return clean ? `https://${clean}` : '';
      })
  ].filter(Boolean) as string[];

  for (const item of configured) {
    for (const allowed of item.split(',')) {
      const trimmedAllowed = allowed.trim().toLowerCase();
      if (trimmedAllowed && normalized === trimmedAllowed) {
        return true;
      }
    }
  }

  return false;
}

/**
 * Returns safe CORS headers for a validated origin.
 * NEVER returns Access-Control-Allow-Origin: * (wildcard is strictly forbidden).
 */
export function getCorsHeaders(
  origin: string | undefined,
  env: Record<string, string | undefined> = process.env
): Record<string, string> {
  if (!origin || !isAllowedOrigin(origin, env)) {
    return {};
  }

  return {
    'Access-Control-Allow-Origin': origin.trim(),
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin'
  };
}

/**
 * Build safe RequestInit options for upstream fetch calls.
 * Enforces redirect: 'manual' to prevent credential harvesting via 301/302 redirects.
 */
export function getSafeFetchOptions(options: {
  apiKey?: string | null;
  headers?: Record<string, string>;
  signal?: AbortSignal;
  body?: string;
  method?: string;
}): RequestInit {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers || {})
  };

  if (options.apiKey) {
    headers['Authorization'] = `Bearer ${options.apiKey}`;
  }

  return {
    method: options.method || 'POST',
    headers,
    body: options.body,
    signal: options.signal,
    redirect: 'manual' // Strictly manual redirect to prevent credential leakage
  };
}
