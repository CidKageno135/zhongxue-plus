import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, URL as URL$1 } from "node:url";
import zlib from "node:zlib";
const DEFAULT_AI_BASE_URL = "https://agentrouter.org/v1";
const TRUSTED_AI_HOSTS = /* @__PURE__ */ new Set([
  "agentrouter.org",
  "openrouter.ai",
  "api.openrouter.ai",
  "api.deepseek.com"
]);
function getTrustedAiHosts(env = process.env) {
  const hosts = new Set(TRUSTED_AI_HOSTS);
  const extra = env.TRUSTED_AI_HOSTS;
  if (extra && typeof extra === "string") {
    for (const host of extra.split(",")) {
      const trimmed = host.trim().toLowerCase();
      if (trimmed) {
        hosts.add(trimmed);
      }
    }
  }
  return hosts;
}
function isTrustedHost(hostname, customHosts, env = process.env) {
  if (!hostname || typeof hostname !== "string") return false;
  const normalized = hostname.toLowerCase().trim();
  const hosts = getTrustedAiHosts(env);
  return hosts.has(normalized);
}
function isLoopbackOrLocalhost(hostname) {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "127.0.0.1" || h === "::1" || h.startsWith("127.");
}
function isPrivateOrInternalIp(hostname) {
  const h = hostname.toLowerCase().trim().replace(/^\[|\]$/g, "");
  if (h === "169.254.169.254" || h === "metadata.google.internal" || h.startsWith("169.254.")) {
    return true;
  }
  if (/^127\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^10\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^172\.(1[6-9]|2\d|3[01])\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^192\.168\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (/^0\.\d+\.\d+\.\d+$/.test(h)) {
    return true;
  }
  if (h === "::1" || h === "::" || /^fe80:/i.test(h) || /^fc00:/i.test(h) || /^fd00:/i.test(h)) {
    return true;
  }
  return false;
}
function validateUpstreamUrl(urlStr, options) {
  if (!urlStr || typeof urlStr !== "string" || !urlStr.trim()) {
    return { valid: false, isTrusted: false, error: "URL must be a non-empty string" };
  }
  const trimmed = urlStr.trim();
  if (trimmed.includes("#")) {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden fragment: URLs containing "#" are strictly forbidden'
    };
  }
  if (!/^https?:\/\//i.test(trimmed)) {
    return {
      valid: false,
      isTrusted: false,
      error: "Invalid protocol: only https is allowed for upstream providers (http only for localhost in development)"
    };
  }
  let parsed;
  try {
    parsed = new URL(trimmed);
  } catch {
    return { valid: false, isTrusted: false, error: "Malformed URL: unable to parse" };
  }
  if (parsed.hash && parsed.hash !== "") {
    return {
      valid: false,
      isTrusted: false,
      error: 'Forbidden fragment: URLs containing "#" are strictly forbidden'
    };
  }
  if (parsed.username || parsed.password) {
    return {
      valid: false,
      isTrusted: false,
      error: "Forbidden userinfo: URLs containing username or password are not permitted"
    };
  }
  const protocol = parsed.protocol.toLowerCase();
  const hostname = parsed.hostname.toLowerCase();
  const port = parsed.port;
  const env = options?.env || process.env;
  const isLocal = isLoopbackOrLocalhost(hostname);
  const isDevOrTest = options?.allowLocalDev === true || env.ALLOW_LOCAL_TEST_UPSTREAM === "true";
  if (isLocal && !isDevOrTest) {
    return {
      valid: false,
      isTrusted: false,
      error: "Insecure protocol: loopback/localhost access is forbidden unless allowLocalDev is explicitly enabled"
    };
  }
  if (protocol === "http:") {
    if (!isLocal || !isDevOrTest) {
      return {
        valid: false,
        isTrusted: false,
        error: isLocal ? "Insecure protocol: http is forbidden for loopback unless allowLocalDev is explicitly enabled" : "Insecure protocol: http is strictly forbidden for remote upstream providers"
      };
    }
  } else if (protocol !== "https:") {
    return {
      valid: false,
      isTrusted: false,
      error: `Unsupported protocol: ${protocol}. Only https is supported.`
    };
  }
  if (trimmed.includes("?") || parsed.search && parsed.search !== "") {
    return {
      valid: false,
      isTrusted: false,
      error: "Forbidden query: URLs containing query parameters are not permitted in baseUrl"
    };
  }
  if (isPrivateOrInternalIp(hostname)) {
    if (!isLocal || !isDevOrTest) {
      return {
        valid: false,
        isTrusted: false,
        error: `SSRF protection: access to private or internal address (${hostname}) is blocked`
      };
    }
  }
  if (!isLocal) {
    if (port && port !== "443") {
      return {
        valid: false,
        isTrusted: false,
        error: `Non-standard port (${port}) is forbidden for remote upstream providers`
      };
    }
  }
  const isTrusted = isTrustedHost(hostname, void 0, env);
  return {
    valid: true,
    isTrusted,
    url: parsed
  };
}
function getProviderForHostname(hostname) {
  if (!hostname || typeof hostname !== "string") return "custom";
  const h = hostname.toLowerCase().trim();
  if (h === "agentrouter.org" || h.endsWith(".agentrouter.org")) {
    return "agentrouter";
  }
  if (h === "openrouter.ai" || h === "api.openrouter.ai" || h.endsWith(".openrouter.ai")) {
    return "openrouter";
  }
  if (h === "api.deepseek.com" || h.endsWith(".deepseek.com")) {
    return "deepseek";
  }
  return "custom";
}
function getServerKeyForProvider(provider, model, env = process.env, destinationBaseUrl = env.AI_BASE_URL || DEFAULT_AI_BASE_URL) {
  const modelName = (model || env.AI_MODEL || "").toLowerCase();
  const configured = validateUpstreamUrl(env.AI_BASE_URL || DEFAULT_AI_BASE_URL, { env });
  const destination = validateUpstreamUrl(destinationBaseUrl, { env });
  const genericKey = configured.valid && configured.isTrusted && configured.url && destination.valid && destination.isTrusted && destination.url && configured.url.origin === destination.url.origin && getProviderForHostname(configured.url.hostname) === provider ? (env.AI_API_KEY || "").trim() : "";
  if (provider === "agentrouter") {
    const isSol = modelName === "gpt-6.1-sol" || modelName.includes("sol") || modelName.includes("astra") || modelName.startsWith("gpt-");
    const agentRouterKey = (env.AI_AGENTROUTER_KEY || "").trim();
    const solKey = (env.AI_SOL_KEY || "").trim();
    const deepseekKey = (env.AI_DEEPSEEK_KEY || "").trim();
    if (isSol) {
      return solKey || agentRouterKey || genericKey || deepseekKey;
    }
    return deepseekKey || agentRouterKey || genericKey || solKey;
  }
  if (provider === "openrouter") {
    return (env.AI_OPENROUTER_KEY || "").trim() || genericKey;
  }
  if (provider === "deepseek") {
    return (env.AI_DEEPSEEK_DIRECT_KEY || "").trim();
  }
  return "";
}
function getServerKeyForModel(model, env = process.env) {
  const defaultUrl = env.AI_BASE_URL || DEFAULT_AI_BASE_URL;
  let provider = "agentrouter";
  try {
    const parsed = new URL(defaultUrl);
    provider = getProviderForHostname(parsed.hostname);
  } catch {
    provider = "agentrouter";
  }
  return getServerKeyForProvider(provider, model, env);
}
function getDefaultBaseUrl(clientApiKey, env = process.env) {
  if (env.AI_BASE_URL && env.AI_BASE_URL.trim()) {
    return env.AI_BASE_URL.trim();
  }
  if (clientApiKey && clientApiKey.startsWith("sk-or-")) {
    return "https://openrouter.ai/api/v1";
  }
  return DEFAULT_AI_BASE_URL;
}
function resolveUpstreamCredentials(options) {
  const env = options.env || process.env;
  const clientKey = (options.clientApiKey || "").trim();
  const requestedBaseUrl = (options.requestedBaseUrl || "").trim();
  if (requestedBaseUrl) {
    const urlValidation2 = validateUpstreamUrl(requestedBaseUrl, {
      allowLocalDev: options.allowLocalDev,
      env
    });
    if (!urlValidation2.valid) {
      return {
        apiKey: null,
        baseUrl: requestedBaseUrl,
        isAllowed: false,
        isTrusted: false,
        isCustomUrl: true,
        keySource: "none",
        error: urlValidation2.error || "Invalid baseUrl"
      };
    }
    const cleanBaseUrl = requestedBaseUrl.replace(/\/+$/, "");
    const hostname = urlValidation2.url ? urlValidation2.url.hostname.toLowerCase() : "";
    const provider = getProviderForHostname(hostname);
    if (urlValidation2.isTrusted) {
      if (clientKey) {
        return {
          apiKey: clientKey,
          baseUrl: cleanBaseUrl,
          isAllowed: true,
          isTrusted: true,
          isCustomUrl: false,
          keySource: "client"
        };
      }
      const serverKey = getServerKeyForProvider(provider, options.model, env, cleanBaseUrl);
      if (serverKey) {
        return {
          apiKey: serverKey,
          baseUrl: cleanBaseUrl,
          isAllowed: true,
          isTrusted: true,
          isCustomUrl: false,
          keySource: "server"
        };
      }
      return {
        apiKey: null,
        baseUrl: cleanBaseUrl,
        isAllowed: false,
        isTrusted: true,
        isCustomUrl: false,
        keySource: "none",
        error: `No API key provided by client and no server key configured for trusted host (${hostname}). Client must provide an apiKey.`
      };
    }
    if (clientKey) {
      return {
        apiKey: clientKey,
        baseUrl: cleanBaseUrl,
        isAllowed: true,
        isTrusted: false,
        isCustomUrl: true,
        keySource: "client"
      };
    }
    return {
      apiKey: null,
      baseUrl: cleanBaseUrl,
      isAllowed: false,
      isTrusted: false,
      isCustomUrl: true,
      keySource: "none",
      error: "UNAUTHORIZED_BASE_URL: Custom or untrusted baseUrl requires client-provided apiKey. Server keys are never forwarded to untrusted destinations."
    };
  }
  const defaultBaseUrl = getDefaultBaseUrl(clientKey, env);
  const cleanDefaultUrl = defaultBaseUrl.replace(/\/+$/, "");
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
      keySource: "none",
      error: `Server default baseUrl is invalid: ${urlValidation.error}`
    };
  }
  if (clientKey) {
    return {
      apiKey: clientKey,
      baseUrl: cleanDefaultUrl,
      isAllowed: true,
      isTrusted: urlValidation.isTrusted,
      isCustomUrl: false,
      keySource: "client"
    };
  }
  if (urlValidation.isTrusted) {
    const hostname = urlValidation.url ? urlValidation.url.hostname.toLowerCase() : "";
    const provider = getProviderForHostname(hostname);
    const serverKey = getServerKeyForProvider(provider, options.model, env, cleanDefaultUrl);
    if (serverKey) {
      return {
        apiKey: serverKey,
        baseUrl: cleanDefaultUrl,
        isAllowed: true,
        isTrusted: true,
        isCustomUrl: false,
        keySource: "server"
      };
    }
  }
  return {
    apiKey: null,
    baseUrl: cleanDefaultUrl,
    isAllowed: false,
    isTrusted: urlValidation.isTrusted,
    isCustomUrl: false,
    keySource: "none",
    error: "No API key configured for default upstream provider"
  };
}
const LOCAL_ORIGIN_REGEX = /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i;
function isAllowedOrigin(origin, env = process.env) {
  if (!origin || typeof origin !== "string") {
    return true;
  }
  const normalized = origin.trim().toLowerCase();
  if (LOCAL_ORIGIN_REGEX.test(normalized)) {
    return true;
  }
  const configured = [
    env.APP_ORIGIN,
    env.ALLOWED_ORIGINS,
    ...[env.VERCEL_URL, env.VERCEL_BRANCH_URL, env.VERCEL_PROJECT_PRODUCTION_URL].filter((v) => Boolean(v && v.trim())).map((v) => {
      const clean = v.trim().replace(/^https?:\/\//i, "").replace(/\/+$/, "");
      return clean ? `https://${clean}` : "";
    })
  ].filter(Boolean);
  for (const item of configured) {
    for (const allowed of item.split(",")) {
      const trimmedAllowed = allowed.trim().toLowerCase();
      if (trimmedAllowed && normalized === trimmedAllowed) {
        return true;
      }
    }
  }
  return false;
}
function getCorsHeaders(origin, env = process.env) {
  if (!origin || !isAllowedOrigin(origin, env)) {
    return {};
  }
  return {
    "Access-Control-Allow-Origin": origin.trim(),
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin"
  };
}
function normalizeVietnamese$1(text, options) {
  if (!text || typeof text !== "string") return "";
  let s = text.normalize("NFD");
  s = s.replace(/u:/gi, "v");
  s = s.replace(/ü/gi, "v");
  s = s.replace(/u\u0308/gi, "v");
  s = s.replace(/U\u0308/gi, "V");
  s = s.replace(/[\u0300-\u036f]/g, "");
  if (options?.preserveCase) {
    s = s.replace(/đ/g, "d").replace(/Đ/g, "D");
  } else {
    s = s.replace(/đ/g, "d").replace(/Đ/g, "d").toLowerCase();
  }
  return s.replace(/\s+/g, " ").trim();
}
const moduleDir = typeof globalThis.__dirname === "string" ? globalThis.__dirname : path.dirname(fileURLToPath(import.meta.url));
const TONE_MARKS = {
  a: ["ā", "á", "ǎ", "à", "a"],
  e: ["ē", "é", "ě", "è", "e"],
  i: ["ī", "í", "ǐ", "ì", "i"],
  o: ["ō", "ó", "ǒ", "ò", "o"],
  u: ["ū", "ú", "ǔ", "ù", "u"],
  ü: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"],
  v: ["ǖ", "ǘ", "ǚ", "ǜ", "ü"]
};
const normalizeVietnamese = normalizeVietnamese$1;
function stripPinyinTones(str) {
  let s = str.replace(/[ǖǘǚǜ]/gi, (match) => match === match.toUpperCase() ? "Ü" : "ü").replace(/u:/gi, (match) => match[0] === "U" ? "Ü" : "ü");
  s = s.replace(/ü/g, "__u_umlaut__").replace(/Ü/g, "__U_umlaut__");
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").normalize("NFC");
  s = s.replace(/__u_umlaut__/g, "ü").replace(/__U_umlaut__/g, "ü");
  return s.replace(/[\d\s'-]/g, "").toLowerCase();
}
function pinyinNumberedToAccented(pinyin) {
  return pinyin.replace(/([a-züv:]+)([1-5]?)/gi, (_, syllable, toneStr) => {
    const tone = parseInt(toneStr, 10);
    if (!tone || tone === 5) {
      return syllable.replace(/u:/gi, "ü").replace(/v/gi, "ü");
    }
    const toneIdx = tone - 1;
    const s = syllable.replace(/u:/gi, "ü").replace(/v/gi, "ü");
    const lower = s.toLowerCase();
    if (lower.includes("a")) {
      const idx = lower.indexOf("a");
      const rep = TONE_MARKS.a[toneIdx];
      return s.slice(0, idx) + (s[idx] === "A" ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    if (lower.includes("e")) {
      const idx = lower.indexOf("e");
      const rep = TONE_MARKS.e[toneIdx];
      return s.slice(0, idx) + (s[idx] === "E" ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    if (lower.includes("ou")) {
      const idx = lower.indexOf("ou");
      const rep = TONE_MARKS.o[toneIdx];
      return s.slice(0, idx) + (s[idx] === "O" ? rep.toUpperCase() : rep) + s.slice(idx + 1);
    }
    const vowels = "iouü";
    let lastVowelIdx = -1;
    for (let i = s.length - 1; i >= 0; i--) {
      if (vowels.includes(lower[i])) {
        lastVowelIdx = i;
        break;
      }
    }
    if (lastVowelIdx !== -1) {
      const v = lower[lastVowelIdx];
      const rep = TONE_MARKS[v]?.[toneIdx] || v;
      return s.slice(0, lastVowelIdx) + (s[lastVowelIdx] === s[lastVowelIdx].toUpperCase() ? rep.toUpperCase() : rep) + s.slice(lastVowelIdx + 1);
    }
    return s;
  });
}
class DictionaryEngine {
  entries = [];
  idMap = /* @__PURE__ */ new Map();
  tradMap = /* @__PURE__ */ new Map();
  simpMap = /* @__PURE__ */ new Map();
  pinyinExactMap = /* @__PURE__ */ new Map();
  loaded = false;
  loadTimeMs = 0;
  loadError = null;
  loadPromise = null;
  /**
   * Initializes the dictionary engine by loading and parsing CVDICT.u8.gz.
   * If a path is provided, it is prioritized. Otherwise, standard locations are probed.
   * On missing or corrupt file, sets loaded = false and records loadError without crashing.
   */
  async init(dictPath) {
    if (this.loaded) return;
    if (this.loadPromise) return this.loadPromise;
    this.loadPromise = (async () => {
      const t0 = Date.now();
      try {
        let targetPath = null;
        if (dictPath) {
          if (!fs.existsSync(dictPath)) {
            const err = new Error(
              `[zhongxue-dict] Dictionary file not found at: ${dictPath}`
            );
            this.loadError = err;
            this.loaded = false;
            console.warn(err.message);
            return;
          }
          targetPath = dictPath;
        } else {
          const cwd = process.cwd();
          const candidates = [
            process.env.DICT_PATH,
            path.resolve(cwd, "data/dictionary/CVDICT.u8.gz"),
            path.resolve(cwd, "projects/zhongxue-new/data/dictionary/CVDICT.u8.gz"),
            path.resolve(moduleDir, "../data/dictionary/CVDICT.u8.gz"),
            path.resolve(moduleDir, "../../data/dictionary/CVDICT.u8.gz")
          ].filter(Boolean);
          for (const candidate of candidates) {
            if (fs.existsSync(candidate)) {
              targetPath = candidate;
              break;
            }
          }
          if (!targetPath) {
            const err = new Error(
              `[zhongxue-dict] Dictionary file CVDICT.u8.gz not found. Checked: ${candidates.join(", ")}`
            );
            this.loadError = err;
            this.loaded = false;
            console.warn(err.message);
            return;
          }
        }
        const compressed = fs.readFileSync(targetPath);
        const decompressed = zlib.gunzipSync(compressed).toString("utf-8");
        const lines = decompressed.split("\n");
        const parsed = [];
        const newIdMap = /* @__PURE__ */ new Map();
        const newTradMap = /* @__PURE__ */ new Map();
        const newSimpMap = /* @__PURE__ */ new Map();
        const newPinyinExactMap = /* @__PURE__ */ new Map();
        let idCounter = 1;
        const regex = /^(\S+)\s+(\S+)\s+\[([^\]]+)\]\s+\/(.+)\/$/;
        for (let i = 0; i < lines.length; i++) {
          const raw = lines[i].trim();
          if (!raw || raw.startsWith("#")) continue;
          const match = raw.match(regex);
          if (!match) {
            continue;
          }
          const traditional = match[1];
          const simplified = match[2];
          const pinyin = match[3];
          const rawDefs = match[4].split("/").map((d) => d.trim()).filter(Boolean);
          const pinyinAccented = pinyinNumberedToAccented(pinyin);
          const pinyinClean = stripPinyinTones(pinyin);
          const pinyinNumberedClean = pinyin.toLowerCase().replace(/[\s-]/g, "");
          const defsClean = rawDefs.map((d) => normalizeVietnamese(d));
          const searchIndex = `${traditional} ${simplified} ${pinyin} ${pinyinNumberedClean} ${pinyinClean} ${pinyinAccented} ${rawDefs.join(" ")} ${defsClean.join(" ")}`.toLowerCase();
          const entry = {
            id: `cv_${idCounter++}`,
            traditional,
            simplified,
            pinyin,
            definitions: rawDefs,
            pinyinAccented,
            pinyinClean,
            pinyinNumberedClean,
            defsClean,
            searchIndex
          };
          parsed.push(entry);
          newIdMap.set(entry.id, entry);
          const existingTrad = newTradMap.get(traditional);
          if (existingTrad) {
            existingTrad.push(entry);
          } else {
            newTradMap.set(traditional, [entry]);
          }
          const existingSimp = newSimpMap.get(simplified);
          if (existingSimp) {
            existingSimp.push(entry);
          } else {
            newSimpMap.set(simplified, [entry]);
          }
          if (pinyinClean) {
            const existingPinyin = newPinyinExactMap.get(pinyinClean);
            if (existingPinyin) {
              existingPinyin.push(entry);
            } else {
              newPinyinExactMap.set(pinyinClean, [entry]);
            }
          }
        }
        this.entries = parsed;
        this.idMap = newIdMap;
        this.tradMap = newTradMap;
        this.simpMap = newSimpMap;
        this.pinyinExactMap = newPinyinExactMap;
        this.loaded = true;
        this.loadError = null;
        this.loadTimeMs = Date.now() - t0;
        console.log(
          `[zhongxue-dict] Successfully loaded ${this.entries.length} entries in ${this.loadTimeMs}ms`
        );
      } catch (err) {
        this.loaded = false;
        this.loadError = err instanceof Error ? err : new Error(String(err));
        console.error("[zhongxue-dict] Failed to initialize dictionary engine:", err);
      }
    })();
    return this.loadPromise;
  }
  isReady() {
    return this.loaded;
  }
  getTotal() {
    return this.entries.length;
  }
  getLoadTimeMs() {
    return this.loadTimeMs;
  }
  getLoadError() {
    return this.loadError ? this.loadError.message : null;
  }
  /**
   * Looks up a dictionary entry by unique ID (e.g. "cv_31249", "31249", or "dict-31249").
   */
  getById(id) {
    if (!this.loaded) return null;
    const cleanId = id.trim();
    const entry = this.idMap.get(cleanId) || this.idMap.get(`cv_${cleanId}`) || this.idMap.get(`cv_${cleanId.replace(/^dict[-_]/i, "")}`);
    if (!entry) return null;
    return {
      id: entry.id,
      traditional: entry.traditional,
      simplified: entry.simplified,
      pinyin: entry.pinyin,
      definitions: entry.definitions
    };
  }
  /**
   * Performs high-accuracy multi-tier dictionary search across 122,596 entries.
   * Supports:
   * - Hanzi (Traditional and Simplified)
   * - Pinyin: accented ("xuéshēng"), tone numbers ("xue2 sheng1"), and toneless ("xuesheng")
   * - Vietnamese: accented ("học sinh") and unaccented ("hoc sinh")
   *
   * Crucially computes the accurate total across all matching entries (no premature loop termination).
   */
  search(query, modeOrOptions = "all", offsetParam = 0, limitParam = 50) {
    if (!this.loaded) {
      return { results: [], total: 0 };
    }
    let mode = "all";
    let offset = offsetParam;
    let limit = limitParam;
    if (typeof modeOrOptions === "object") {
      mode = modeOrOptions.mode || "all";
      offset = typeof modeOrOptions.offset === "number" ? modeOrOptions.offset : offsetParam;
      limit = typeof modeOrOptions.limit === "number" ? modeOrOptions.limit : limitParam;
    } else {
      mode = modeOrOptions;
    }
    if (offset < 0) offset = 0;
    if (limit <= 0) limit = 20;
    const qTrim = query.trim();
    if (!qTrim) {
      return { results: [], total: this.entries.length };
    }
    const qLower = qTrim.toLowerCase();
    const qPinyinClean = stripPinyinTones(qLower);
    const qNumberedClean = qLower.replace(/[\s-]/g, "");
    const qViClean = normalizeVietnamese(qLower);
    const isHanzi = /^[\u4e00-\u9fa5]+$/.test(qTrim);
    const tier1 = [];
    const tier2 = [];
    const tier3 = [];
    const tier4 = [];
    const seen = /* @__PURE__ */ new Set();
    if (mode === "hanzi") {
      const exactT = this.tradMap.get(qTrim) || [];
      for (const e of exactT) {
        tier1.push(e);
        seen.add(e);
      }
      const exactS = this.simpMap.get(qTrim) || [];
      for (const e of exactS) {
        if (!seen.has(e)) {
          tier1.push(e);
          seen.add(e);
        }
      }
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        if (seen.has(e)) continue;
        if (e.traditional.startsWith(qTrim) || e.simplified.startsWith(qTrim)) {
          tier3.push(e);
          seen.add(e);
        } else if (e.traditional.includes(qTrim) || e.simplified.includes(qTrim)) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else if (mode === "pinyin") {
      if (qPinyinClean) {
        const exactP = this.pinyinExactMap.get(qPinyinClean) || [];
        for (const e of exactP) {
          tier2.push(e);
          seen.add(e);
        }
      }
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        if (seen.has(e)) continue;
        if (e.pinyinClean === qPinyinClean || e.pinyinNumberedClean === qNumberedClean || e.pinyin.toLowerCase() === qLower) {
          tier2.push(e);
          seen.add(e);
        } else if (qPinyinClean && e.pinyinClean.startsWith(qPinyinClean) || e.pinyinNumberedClean.startsWith(qNumberedClean)) {
          tier3.push(e);
          seen.add(e);
        } else if (qPinyinClean && e.pinyinClean.includes(qPinyinClean) || e.pinyinNumberedClean.includes(qNumberedClean) || e.pinyin.toLowerCase().includes(qLower)) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else if (mode === "vi") {
      for (let i = 0; i < this.entries.length; i++) {
        const e = this.entries[i];
        const exactMatch = e.definitions.some((d) => d.toLowerCase() === qLower) || e.defsClean.some((d) => d === qViClean);
        if (exactMatch) {
          tier2.push(e);
          seen.add(e);
        } else if (e.definitions.some((d) => d.toLowerCase().startsWith(qLower)) || qViClean && e.defsClean.some((d) => d.startsWith(qViClean))) {
          tier3.push(e);
          seen.add(e);
        } else if (e.definitions.some((d) => d.toLowerCase().includes(qLower)) || qViClean && e.defsClean.some((d) => d.includes(qViClean))) {
          tier4.push(e);
          seen.add(e);
        }
      }
    } else {
      if (isHanzi) {
        const exactT = this.tradMap.get(qTrim) || [];
        for (const e of exactT) {
          tier1.push(e);
          seen.add(e);
        }
        const exactS = this.simpMap.get(qTrim) || [];
        for (const e of exactS) {
          if (!seen.has(e)) {
            tier1.push(e);
            seen.add(e);
          }
        }
        for (let i = 0; i < this.entries.length; i++) {
          const e = this.entries[i];
          if (seen.has(e)) continue;
          if (e.traditional.startsWith(qTrim) || e.simplified.startsWith(qTrim)) {
            tier3.push(e);
            seen.add(e);
          } else if (e.traditional.includes(qTrim) || e.simplified.includes(qTrim)) {
            tier4.push(e);
            seen.add(e);
          }
        }
      } else {
        if (qPinyinClean) {
          const exactP = this.pinyinExactMap.get(qPinyinClean) || [];
          for (const e of exactP) {
            tier2.push(e);
            seen.add(e);
          }
        }
        for (let i = 0; i < this.entries.length; i++) {
          const e = this.entries[i];
          if (seen.has(e)) continue;
          if (e.traditional === qTrim || e.simplified === qTrim) {
            tier1.push(e);
            seen.add(e);
            continue;
          }
          const isExactPinyin = qPinyinClean && (e.pinyinClean === qPinyinClean || e.pinyinNumberedClean === qNumberedClean);
          const isExactDef = e.definitions.some((d) => d.toLowerCase() === qLower) || qViClean && e.defsClean.some((d) => d === qViClean);
          if (isExactPinyin || isExactDef) {
            tier2.push(e);
            seen.add(e);
            continue;
          }
          const isPrefixPinyin = qPinyinClean && (e.pinyinClean.startsWith(qPinyinClean) || e.pinyinNumberedClean.startsWith(qNumberedClean));
          const isPrefixDef = e.definitions.some((d) => d.toLowerCase().startsWith(qLower)) || qViClean && e.defsClean.some((d) => d.startsWith(qViClean));
          if (isPrefixPinyin || isPrefixDef) {
            tier3.push(e);
            seen.add(e);
            continue;
          }
          if (e.searchIndex.includes(qLower) || qViClean && e.searchIndex.includes(qViClean) || qPinyinClean && e.pinyinClean.includes(qPinyinClean)) {
            tier4.push(e);
            seen.add(e);
          }
        }
      }
    }
    tier3.sort((a, b) => a.traditional.length - b.traditional.length);
    tier4.sort((a, b) => a.traditional.length - b.traditional.length);
    const allMatches = [...tier1, ...tier2, ...tier3, ...tier4];
    const total = allMatches.length;
    const paged = allMatches.slice(offset, offset + limit).map((e) => ({
      id: e.id,
      traditional: e.traditional,
      simplified: e.simplified,
      pinyin: e.pinyin,
      definitions: e.definitions
    }));
    return {
      results: paged,
      total,
      dictionaryTotal: this.entries.length,
      totalMatches: total,
      pageCount: paged.length
    };
  }
  /**
   * Resets the engine state. Useful for isolated test setups.
   */
  reset() {
    this.entries = [];
    this.idMap.clear();
    this.tradMap.clear();
    this.simpMap.clear();
    this.pinyinExactMap.clear();
    this.loaded = false;
    this.loadTimeMs = 0;
    this.loadError = null;
    this.loadPromise = null;
  }
}
const dictionaryEngine = new DictionaryEngine();
class HttpError extends Error {
  statusCode;
  code;
  details;
  constructor(statusCode, code, message, details) {
    super(message);
    this.name = "HttpError";
    this.statusCode = statusCode;
    this.code = code;
    this.details = details;
    Object.setPrototypeOf(this, new.target.prototype);
  }
}
function badRequest(message = "Bad Request", details, code = "BAD_REQUEST") {
  return new HttpError(400, code, message, details);
}
function forbidden(message = "Forbidden", details, code = "FORBIDDEN") {
  return new HttpError(403, code, message, details);
}
function notFound(message = "Not Found", details, code = "NOT_FOUND") {
  return new HttpError(404, code, message, details);
}
function methodNotAllowed(message = "Method Not Allowed", details, code = "METHOD_NOT_ALLOWED") {
  return new HttpError(405, code, message, details);
}
function payloadTooLarge(message = "Payload Too Large", details, code = "PAYLOAD_TOO_LARGE") {
  return new HttpError(413, code, message, details);
}
function unsupportedMediaType(message = "Unsupported Media Type", details, code = "UNSUPPORTED_MEDIA_TYPE") {
  return new HttpError(415, code, message, details);
}
function serviceUnavailable(message = "Service Unavailable", details, code = "SERVICE_UNAVAILABLE") {
  return new HttpError(503, code, message, details);
}
function sendJson(res, statusCode, data) {
  if (res.writableEnded || "destroyed" in res && res.destroyed) return;
  try {
    const json = JSON.stringify(data);
    res.statusCode = statusCode;
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.setHeader("Content-Length", Buffer.byteLength(json));
    res.end(json);
  } catch {
  }
}
const SENSITIVE_KEY_PATTERN = /key|secret|token|password|auth|credential/i;
const WINDOWS_PATH_PATTERN = /[a-zA-Z]:\\[^\s"'\n\r]+/g;
const UNIX_PATH_PATTERN = /\/(Users|home|var|app|etc|tmp|projects)\/[^\s"'\n\r]+/g;
const BEARER_TOKEN_PATTERN = /Bearer\s+[\w.-]+/gi;
const API_KEY_PATTERN = /\b(sk-[a-zA-Z0-9_-]{8,}|[a-zA-Z0-9_-]{24,})\b/g;
function sanitizeString(str) {
  return str.replace(WINDOWS_PATH_PATTERN, "[REDACTED_PATH]").replace(UNIX_PATH_PATTERN, "[REDACTED_PATH]").replace(BEARER_TOKEN_PATTERN, "Bearer [REDACTED]").replace(API_KEY_PATTERN, (match) => {
    if (/^[a-f0-9]{32,}$/i.test(match) || match.startsWith("sk-") || match.startsWith("sol-")) {
      return "[REDACTED_SECRET]";
    }
    return match;
  });
}
function sanitizeDetails(val, depth = 0) {
  if (depth > 5) return "[TRUNCATED]";
  if (typeof val === "string") {
    return sanitizeString(val);
  }
  if (Array.isArray(val)) {
    return val.map((item) => sanitizeDetails(item, depth + 1));
  }
  if (val && typeof val === "object") {
    const output = {};
    for (const [k, v] of Object.entries(val)) {
      if (k === "stack" || SENSITIVE_KEY_PATTERN.test(k)) {
        output[k] = "[REDACTED]";
      } else {
        output[k] = sanitizeDetails(v, depth + 1);
      }
    }
    return output;
  }
  return val;
}
function sendError(res, arg1, arg2, arg3, arg4) {
  if (res.writableEnded || "destroyed" in res && res.destroyed) return;
  let statusCode = 500;
  let code = "INTERNAL_ERROR";
  let message = "Internal Server Error";
  let details = void 0;
  if (typeof arg1 === "number") {
    statusCode = arg1;
    code = statusCode >= 500 ? "INTERNAL_ERROR" : "BAD_REQUEST";
    message = statusCode >= 500 ? "Internal Server Error" : "Request Error";
    details = arg4;
  } else if (arg1 instanceof HttpError) {
    statusCode = arg1.statusCode;
    code = arg1.code;
    message = arg1.message;
    details = arg1.details;
  } else if (arg1 && typeof arg1 === "object") {
    const errObj = arg1;
    if (typeof errObj.statusCode === "number" && Number.isInteger(errObj.statusCode)) {
      statusCode = errObj.statusCode;
    }
    if (typeof errObj.code === "string") {
      code = errObj.code;
    }
    if (typeof errObj.message === "string") {
      message = statusCode >= 500 ? "Internal Server Error" : errObj.message;
    }
    details = errObj.details;
  }
  const sanitizedMessage = sanitizeString(message);
  const sanitizedDetails = details !== void 0 ? sanitizeDetails(details) : void 0;
  const errorBody = {
    error: {
      code,
      message: sanitizedMessage,
      ...sanitizedDetails !== void 0 ? { details: sanitizedDetails } : {}
    }
  };
  sendJson(res, statusCode, errorBody);
}
const MAX_BODY_SIZE_CONVERSATION = 100 * 1024;
const MAX_BODY_SIZE_HANDWRITING = 1024 * 1024;
const MAX_BODY_SIZE_DEFAULT = 512 * 1024;
const MAX_QUERY_LENGTH = 200;
const MAX_ID_LENGTH = 100;
const MAX_MESSAGES_COUNT = 50;
const MAX_MESSAGE_CONTENT_LENGTH = 4e3;
const MAX_STROKES_COUNT = 50;
const MAX_POINTS_PER_STROKE = 1e3;
const MIN_STROKE_COORD = -500;
const MAX_STROKE_COORD = 2e3;
const VALID_DICTIONARY_MODES = ["all", "hanzi", "pinyin", "vi"];
const VALID_MESSAGE_ROLES = ["user", "assistant", "system"];
const VALID_CONVERSATION_ACTIONS = ["chat", "ping", "health"];
function parseJsonBody(raw) {
  const text = typeof raw === "string" ? raw.trim() : raw.toString("utf-8").trim();
  if (!text) {
    throw badRequest("Request body cannot be empty", void 0, "BAD_REQUEST");
  }
  let parsed;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw badRequest("Malformed JSON in request body", void 0, "INVALID_JSON");
  }
  return parsed;
}
function validateJsonObject(value) {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw badRequest("Request body must be a JSON object", void 0, "BAD_REQUEST");
  }
  return value;
}
function validateJsonContentType(contentType) {
  if (!contentType || !contentType.toLowerCase().includes("application/json")) {
    throw unsupportedMediaType("Content-Type must be application/json");
  }
}
function validatePayloadSize(sizeInBytes, maxBytes) {
  if (sizeInBytes > maxBytes) {
    throw payloadTooLarge(
      `Request body size (${sizeInBytes} bytes) exceeds limit of ${maxBytes} bytes`,
      { size: sizeInBytes, max: maxBytes }
    );
  }
}
function validateDictionaryQuery(rawQuery) {
  let getVal;
  if (rawQuery instanceof URLSearchParams) {
    getVal = (k) => rawQuery.get(k) ?? void 0;
  } else if (rawQuery && typeof rawQuery === "object") {
    const qObj = rawQuery;
    getVal = (k) => {
      const v = qObj[k];
      if (v === void 0 || v === null) return void 0;
      if (Array.isArray(v)) return typeof v[0] === "string" ? v[0] : String(v[0]);
      return typeof v === "string" ? v : String(v);
    };
  } else {
    throw badRequest("Invalid query parameters", void 0, "BAD_REQUEST");
  }
  const rawQ = getVal("q");
  const rawId = getVal("id");
  const rawMode = getVal("mode");
  const rawOffset = getVal("offset");
  const rawLimit = getVal("limit");
  const q = rawQ !== void 0 ? rawQ.trim() : void 0;
  const id = rawId !== void 0 ? rawId.trim() : void 0;
  if (q && q.length > MAX_QUERY_LENGTH) {
    throw badRequest(`Query parameter "q" cannot exceed ${MAX_QUERY_LENGTH} characters`);
  }
  if (id && id.length > MAX_ID_LENGTH) {
    throw badRequest(`Query parameter "id" cannot exceed ${MAX_ID_LENGTH} characters`);
  }
  if (!q && !id) {
    throw badRequest('Either "q" or "id" query parameter is required');
  }
  let mode = "all";
  if (rawMode !== void 0 && rawMode.trim() !== "") {
    const trimmedMode = rawMode.trim().toLowerCase();
    if (!VALID_DICTIONARY_MODES.includes(trimmedMode)) {
      throw badRequest(`Invalid mode "${rawMode}". Allowed modes: ${VALID_DICTIONARY_MODES.join(", ")}`);
    }
    mode = trimmedMode;
  }
  let offset = 0;
  if (rawOffset !== void 0 && rawOffset.trim() !== "") {
    const parsedOffset = Number(rawOffset);
    if (isNaN(parsedOffset) || !Number.isInteger(parsedOffset) || parsedOffset < 0 || parsedOffset > Number.MAX_SAFE_INTEGER) {
      throw badRequest('Query parameter "offset" must be a non-negative integer');
    }
    offset = parsedOffset;
  }
  let limit = 50;
  if (rawLimit !== void 0 && rawLimit.trim() !== "") {
    const parsedLimit = Number(rawLimit);
    if (isNaN(parsedLimit) || !Number.isInteger(parsedLimit) || parsedLimit < 1 || parsedLimit > 100) {
      throw badRequest('Query parameter "limit" must be an integer between 1 and 100');
    }
    limit = parsedLimit;
  }
  return {
    ...q ? { q } : {},
    ...id ? { id } : {},
    mode,
    offset,
    limit
  };
}
function validateChatMessages(messages) {
  if (!Array.isArray(messages)) {
    throw badRequest("messages must be an array");
  }
  if (messages.length > MAX_MESSAGES_COUNT) {
    throw badRequest(`messages array cannot exceed ${MAX_MESSAGES_COUNT} items`);
  }
  const result = [];
  for (let i = 0; i < messages.length; i++) {
    const msg = messages[i];
    if (!msg || typeof msg !== "object" || Array.isArray(msg)) {
      throw badRequest(`Message at index ${i} must be a JSON object`);
    }
    const role = msg.role;
    const content = msg.content;
    if (typeof role !== "string" || !VALID_MESSAGE_ROLES.includes(role)) {
      throw badRequest(
        `Invalid message role "${role}" at index ${i}. Allowed roles: ${VALID_MESSAGE_ROLES.join(", ")}`
      );
    }
    if (typeof content !== "string") {
      throw badRequest(`Message content at index ${i} must be a string`);
    }
    if (content.length > MAX_MESSAGE_CONTENT_LENGTH) {
      throw badRequest(
        `Message content at index ${i} exceeds maximum limit of ${MAX_MESSAGE_CONTENT_LENGTH} characters`
      );
    }
    result.push({
      role,
      content
    });
  }
  return result;
}
function validateConversationBody(rawBody) {
  const obj = validateJsonObject(rawBody);
  let action = "chat";
  if (obj.action !== void 0) {
    if (typeof obj.action !== "string" || !VALID_CONVERSATION_ACTIONS.includes(obj.action)) {
      throw badRequest(`Invalid action. Allowed actions: ${VALID_CONVERSATION_ACTIONS.join(", ")}`);
    }
    action = obj.action;
  }
  let unitId = void 0;
  if (obj.unitId !== void 0) {
    const u = Number(obj.unitId);
    if (isNaN(u) || !Number.isInteger(u) || u < 1 || u > 100) {
      throw badRequest("unitId must be an integer between 1 and 100");
    }
    unitId = u;
  }
  let threadId = void 0;
  if (obj.threadId !== void 0) {
    const t = Number(obj.threadId);
    if (isNaN(t) || !Number.isInteger(t) || t < 0) {
      throw badRequest("threadId must be a non-negative integer");
    }
    threadId = t;
  }
  let roleId = void 0;
  if (obj.roleId !== void 0) {
    if (typeof obj.roleId !== "string" || obj.roleId.length > 100) {
      throw badRequest("roleId must be a string up to 100 characters");
    }
    roleId = obj.roleId.trim();
  }
  let model = void 0;
  if (obj.model !== void 0) {
    if (typeof obj.model !== "string" || obj.model.length > 200) {
      throw badRequest("model must be a string up to 200 characters");
    }
    model = obj.model.trim();
  }
  let baseUrl = void 0;
  if (obj.baseUrl !== void 0) {
    if (typeof obj.baseUrl !== "string" || obj.baseUrl.length > 1e3) {
      throw badRequest("baseUrl must be a string up to 1000 characters");
    }
    baseUrl = obj.baseUrl.trim();
  }
  let apiKey = void 0;
  if (obj.apiKey !== void 0) {
    if (typeof obj.apiKey !== "string" || obj.apiKey.length > 500) {
      throw badRequest("apiKey must be a string up to 500 characters");
    }
    apiKey = obj.apiKey.trim();
  }
  let timeoutMs = 12e3;
  if (obj.timeoutMs !== void 0) {
    const t = Number(obj.timeoutMs);
    if (isNaN(t) || !Number.isFinite(t)) {
      throw badRequest("timeoutMs must be a valid number");
    }
    timeoutMs = Math.min(3e4, Math.max(1e3, Math.round(t)));
  }
  const messages = [];
  if (obj.messages !== void 0) {
    messages.push(...validateChatMessages(obj.messages));
  }
  return {
    action,
    ...unitId !== void 0 ? { unitId } : {},
    ...threadId !== void 0 ? { threadId } : {},
    ...roleId ? { roleId } : {},
    ...model ? { model } : {},
    ...baseUrl ? { baseUrl } : {},
    ...apiKey ? { apiKey } : {},
    timeoutMs,
    messages
  };
}
function validateHandwritingBody(rawBody) {
  const obj = validateJsonObject(rawBody);
  if (!("strokes" in obj) || !Array.isArray(obj.strokes)) {
    throw badRequest("strokes field is required and must be an array");
  }
  if (obj.strokes.length === 0) {
    throw badRequest("strokes array cannot be empty");
  }
  if (obj.strokes.length > MAX_STROKES_COUNT) {
    throw badRequest(`strokes array cannot exceed ${MAX_STROKES_COUNT} strokes`);
  }
  const normalizedStrokes = [];
  for (let sIdx = 0; sIdx < obj.strokes.length; sIdx++) {
    const rawStroke = obj.strokes[sIdx];
    if (!Array.isArray(rawStroke) || rawStroke.length === 0) {
      throw badRequest(`Stroke at index ${sIdx} must be a non-empty array`);
    }
    const isFormat2 = rawStroke.length > 3 || rawStroke.length > 0 && typeof rawStroke[0] === "object" && rawStroke[0] !== null && !Array.isArray(rawStroke[0]) || rawStroke.length > 0 && Array.isArray(rawStroke[0]) && rawStroke[0].length === 2 && rawStroke.every((p) => Array.isArray(p) && p.length === 2);
    if (!isFormat2) {
      if (rawStroke.length >= 2 && Array.isArray(rawStroke[0]) && Array.isArray(rawStroke[1]) && rawStroke.length <= 3) {
        const xArr = rawStroke[0];
        const yArr = rawStroke[1];
        const tArr = rawStroke[2] || [];
        if (xArr.length !== yArr.length) {
          throw badRequest(`Stroke at index ${sIdx} has mismatched X and Y coordinates count`);
        }
        if (xArr.length === 0) {
          throw badRequest(`Stroke at index ${sIdx} must contain at least 1 point`);
        }
        if (xArr.length > MAX_POINTS_PER_STROKE) {
          throw badRequest(`Stroke at index ${sIdx} exceeds maximum ${MAX_POINTS_PER_STROKE} points`);
        }
        const validX2 = [];
        const validY2 = [];
        const validT2 = [];
        for (let pIdx = 0; pIdx < xArr.length; pIdx++) {
          const x = Number(xArr[pIdx]);
          const y = Number(yArr[pIdx]);
          const t = tArr[pIdx] !== void 0 ? Number(tArr[pIdx]) : pIdx * 10;
          if (isNaN(x) || !Number.isFinite(x) || x < MIN_STROKE_COORD || x > MAX_STROKE_COORD) {
            throw badRequest(`Stroke ${sIdx} point ${pIdx}: X coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
          }
          if (isNaN(y) || !Number.isFinite(y) || y < MIN_STROKE_COORD || y > MAX_STROKE_COORD) {
            throw badRequest(`Stroke ${sIdx} point ${pIdx}: Y coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
          }
          validX2.push(x);
          validY2.push(y);
          validT2.push(isNaN(t) ? pIdx * 10 : t);
        }
        normalizedStrokes.push([validX2, validY2, validT2]);
        continue;
      }
    }
    if (rawStroke.length > MAX_POINTS_PER_STROKE) {
      throw badRequest(`Stroke at index ${sIdx} exceeds maximum ${MAX_POINTS_PER_STROKE} points`);
    }
    const validX = [];
    const validY = [];
    const validT = [];
    for (let pIdx = 0; pIdx < rawStroke.length; pIdx++) {
      const pt = rawStroke[pIdx];
      let x;
      let y;
      let t;
      if (Array.isArray(pt)) {
        if (pt.length < 2) {
          throw badRequest(`Stroke ${sIdx} point ${pIdx} must contain at least [x, y] coordinates`);
        }
        x = Number(pt[0]);
        y = Number(pt[1]);
        t = pt[2] !== void 0 ? Number(pt[2]) : pIdx * 10;
      } else if (pt && typeof pt === "object") {
        const ptObj = pt;
        x = Number(ptObj.x);
        y = Number(ptObj.y);
        t = ptObj.t !== void 0 ? Number(ptObj.t) : pIdx * 10;
      } else {
        throw badRequest(`Stroke ${sIdx} point ${pIdx} is invalid`);
      }
      if (isNaN(x) || !Number.isFinite(x) || x < MIN_STROKE_COORD || x > MAX_STROKE_COORD) {
        throw badRequest(`Stroke ${sIdx} point ${pIdx}: X coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
      }
      if (isNaN(y) || !Number.isFinite(y) || y < MIN_STROKE_COORD || y > MAX_STROKE_COORD) {
        throw badRequest(`Stroke ${sIdx} point ${pIdx}: Y coordinate out of bounds [${MIN_STROKE_COORD}, ${MAX_STROKE_COORD}]`);
      }
      validX.push(x);
      validY.push(y);
      validT.push(isNaN(t) ? pIdx * 10 : t);
    }
    normalizedStrokes.push([validX, validY, validT]);
  }
  let width = 300;
  if (obj.width !== void 0) {
    const w = Number(obj.width);
    if (isNaN(w) || w < 10 || w > 5e3) {
      throw badRequest("width must be a number between 10 and 5000");
    }
    width = w;
  }
  let height = 300;
  if (obj.height !== void 0) {
    const h = Number(obj.height);
    if (isNaN(h) || h < 10 || h > 5e3) {
      throw badRequest("height must be a number between 10 and 5000");
    }
    height = h;
  }
  let language = "zh-TW";
  if (obj.language !== void 0) {
    if (typeof obj.language !== "string" || obj.language.length > 20) {
      throw badRequest("language must be a string up to 20 characters");
    }
    language = obj.language.trim();
  }
  return {
    strokes: normalizedStrokes,
    width,
    height,
    language
  };
}
async function readAndValidateJsonBody(req, maxBytes = MAX_BODY_SIZE_DEFAULT) {
  const contentType = req.headers["content-type"];
  validateJsonContentType(contentType);
  const contentLengthHeader = req.headers["content-length"];
  if (contentLengthHeader) {
    const declaredSize = parseInt(contentLengthHeader, 10);
    if (!isNaN(declaredSize)) {
      validatePayloadSize(declaredSize, maxBytes);
    }
  }
  let bytesRead = 0;
  const chunks = [];
  for await (const chunk of req) {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    bytesRead += buf.length;
    if (bytesRead > maxBytes) {
      throw payloadTooLarge(
        `Request body size (${bytesRead} bytes) exceeds limit of ${maxBytes} bytes`,
        { bytesRead, maxBytes }
      );
    }
    chunks.push(buf);
  }
  const rawString = Buffer.concat(chunks).toString("utf-8");
  return parseJsonBody(rawString);
}
const SINOLOGY_SCENARIOS = {
  factory: {
    id: "factory",
    name: "Công xưởng & Tăng ca (工廠機台與加班)",
    traditional: "組長，這台機台剛才亮紅燈警報了，需要通知技術員維修。另外請問今天晚上有需要配合加班嗎？",
    pinyin: "Zǔzhǎng, zhè tái jītái gāngcái liàng hóngdēng jǐngbào le, xūyào tōngzhī jìshùyuán wéixiū. Lìngwài qǐngwèn jīntiān wǎnshang yǒu xūyào pèihé jiābān ma?",
    vietnamese: "Thưa tổ trưởng, máy này vừa báo đèn đỏ cảnh báo, cần báo kỹ thuật viên sửa chữa. Ngoài ra xin hỏi tối nay có cần phối hợp tăng ca không ạ?",
    practiceTip: "Gợi ý phản xạ: 組長，我今天可以配合加班兩個小時，下班時我會記得刷卡打卡。(Thưa tổ trưởng, hôm nay em có thể tăng ca 2 tiếng, khi tan ca em sẽ nhớ quẹt thẻ).",
    keywords: [
      "công xưởng",
      "tăng ca",
      "quẹt thẻ",
      "máy hỏng",
      "máy móc",
      "tổ trưởng",
      "chuyền",
      "bảo trì",
      "kỹ thuật viên",
      "lỗi máy",
      "đèn đỏ",
      "加班",
      "打卡",
      "機台",
      "組長",
      "維修",
      "警報",
      "紅燈",
      "廠長"
    ]
  },
  tax: {
    id: "tax",
    name: "Cục thuế & Cư trú 183 ngày (國稅局與所得稅申報)",
    traditional: "您好！五月份是臺灣綜合所得稅申報期。請問您去年在臺灣居留是否滿183天？請出示您的居留證與扣繳憑單。",
    pinyin: "Nín hǎo! Wǔ yuèfèn shì Táiwān zōnghé suǒdéshuì shēnbào qī. Qǐngwèn nín qùnián zài Táiwān jūliú shìfǒu mǎn yībǎi bāshísān tiān? Qǐng chūshì nín de jūliúzhèng yǔ kòujiǎo píngdān.",
    vietnamese: "Xin chào! Tháng 5 là kỳ kê khai thuế thu nhập cá nhân tại Đài Loan. Xin hỏi năm ngoái bạn có cư trú đủ 183 ngày không? Vui lòng xuất trình thẻ ARC và chứng từ khấu trừ thuế.",
    practiceTip: "Gợi ý phản xạ: 我去年居留超過183天，這是我的居留證與公司的扣繳憑單，想辦理線上退稅。(Năm ngoái tôi cư trú hơn 183 ngày, đây là thẻ ARC và chứng từ khấu trừ của công ty, tôi muốn làm thủ tục hoàn thuế trực tuyến).",
    keywords: [
      "khai thuế",
      "thuế thu nhập",
      "183 ngày",
      "hoàn thuế",
      "giảm trừ",
      "cục thuế",
      "báo thuế",
      "khấu trừ",
      "arc",
      "cư trú",
      "bảo hiểm thuế",
      "報稅",
      "所得稅",
      "183",
      "扣繳憑單",
      "退稅",
      "國稅局",
      "免稅額"
    ]
  },
  tech: {
    id: "tech",
    name: "Bán dẫn TSMC & Phòng sạch 3nm (新竹科學園區與半導體)",
    traditional: "工程師您好！這批3奈米晶圓正在無塵室進行先進製程曝光，目前的良率指標非常穩定。",
    pinyin: "Gōngchéngshī nín hǎo! Zhè pī sān nàimǐ jīngyuán zhèngzài wúchénshì jìnxíng xiānjìn zhìchéng pùguāng, mùqián de liánglǜ zhǐbiāo fēicháng wěndìng.",
    vietnamese: "Chào kỹ sư! Lô wafer 3nm này đang trong phòng sạch thực hiện quy trình quang khắc tiên tiến, chỉ số tỷ lệ thành phẩm (yield rate) hiện rất ổn định.",
    practiceTip: "Gợi ý phản xạ: 請特別監控這道蝕刻步驟的良率變化，並與研發部門確認參數。(Xin đặc biệt theo dõi biến động tỷ lệ thành phẩm ở bước khắc này và xác nhận thông số với bộ phận R&D).",
    keywords: [
      "bán dẫn",
      "wafer",
      "phòng sạch",
      "tsmc",
      "tiến trình",
      "3nm",
      "2nm",
      "quang khắc",
      "yield",
      "tân trúc",
      "khắc",
      "tỷ lệ thành phẩm",
      "kỹ sư",
      "晶圓",
      "無塵室",
      "半導體",
      "良率",
      "蝕刻",
      "曝光",
      "製程"
    ]
  },
  scooter: {
    id: "scooter",
    name: "Thuê xe máy & Đổ xăng 95 (租機車與台灣中油加油)",
    traditional: "你好！租機車一天六百元，附兩頂安全帽。請問你有國際駕照或臺灣機車駕照嗎？加滿95汽油，發票存載具。",
    pinyin: "Nǐ hǎo! Zū jīchē yì tiān liùbǎi yuán, fù liǎng dǐng ānquánmào. Qǐngwèn nǐ yǒu guójì jiàzhào huò Táiwān jīchē jiàzhào ma? Jiāmǎn jiǔwǔ qìyóu, fāpiào cún zàijù.",
    vietnamese: "Chào bạn! Thuê xe máy một ngày 600 tệ, kèm 2 mũ bảo hiểm. Bạn có bằng lái quốc tế hay Đài Loan không? Đổ đầy xăng 95, hóa đơn lưu mã thẻ.",
    practiceTip: "Gợi ý phản xạ: 請問前面有台灣中油加油站嗎？95加滿，謝謝！(Xin hỏi phía trước có trạm xăng CPC không? Đổ đầy xăng 95, cảm ơn!).",
    keywords: [
      "xe máy",
      "thuê xe",
      "xăng",
      "95",
      "mũ bảo hiểm",
      "bằng lái",
      "cpc",
      "trạm xăng",
      "đổ xăng",
      "trả xe",
      "機車",
      "租車",
      "安全帽",
      "加油站",
      "95加滿",
      "駕照",
      "中油",
      "載具"
    ]
  },
  tea: {
    id: "tea",
    name: "Quầy trà sữa Đài Loan (50嵐與清心手搖飲)",
    traditional: "你要喝珍珠奶茶還是四季春茶？甜度和冰塊要微糖微冰還是半糖少冰？外帶還是內用？",
    pinyin: "Nǐ yào hē zhēnzhū nǎichá háishì sìjìchūnchá? Tiándù hé bīngkuài yào wēitáng wēibīng háishì bàntáng shǎobīng? Wàidài háishì nèiyòng?",
    vietnamese: "Bạn muốn uống trà sữa trân châu hay trà Tứ Quý Xuân? Độ ngọt và đá chọn ít đường ít đá hay nửa đường ít đá? Mang đi hay dùng tại quán?",
    practiceTip: "Gợi ý phản xạ: 我要一杯波霸奶茶，半糖少冰，外帶，謝謝！(Cho tôi một ly trà sữa trân châu lớn, nửa đường ít đá, mang đi, cảm ơn!).",
    keywords: [
      "trà sữa",
      "trân châu",
      "độ ngọt",
      "độ đá",
      "ít đường",
      "ít đá",
      "nửa đường",
      "không đá",
      "50lan",
      "50嵐",
      "thanh tâm",
      "boba",
      "mang đi",
      "nước ngọt",
      "đồ uống",
      "奶茶",
      "珍珠",
      "波霸",
      "半糖",
      "微糖",
      "少冰",
      "微冰",
      "外帶"
    ]
  },
  mrt: {
    id: "mrt",
    name: "Ga tàu điện ngầm & Thẻ EasyCard (台北捷運與悠遊卡)",
    traditional: "最近的捷運站就在前面直走右轉。進出站請刷悠遊卡，也可以在自動售票機加值或詢問處購票。",
    pinyin: "Zuìjìn de jiéyùn zhàn jiù zài qiánmiàn zhízǒu yòuzhuǎn. Jìn chū zhàn qǐng shuā yōuyóukǎ, yě kěyǐ zài zìdòng shòupiàojī jiāzhí huò xúnwènchù gòupiào.",
    vietnamese: "Ga MRT gần nhất ở ngay phía trước đi thẳng rồi rẽ phải. Ra vào ga vui lòng quẹt thẻ EasyCard, bạn cũng có thể nạp tiền tại máy bán vé tự động hoặc quầy thông tin.",
    practiceTip: "Gợi ý phản xạ: 請問去台北車站要在哪裡轉乘紅線（淡水信義線）？(Xin hỏi muốn đến Ga Đài Bắc thì chuyển sang tuyến đỏ Tuyến Đạm Thủy - Tín Nghĩa ở đâu?).",
    keywords: [
      "mrt",
      "tàu điện",
      "easycard",
      "thẻ easycard",
      "thẻ mrt",
      "mua thẻ",
      "quẹt thẻ",
      "nạp tiền",
      "ga",
      "lối ra",
      "chuyển tàu",
      "đổi tàu",
      "tuyến đỏ",
      "tuyến xanh",
      "tổng trạm",
      "捷運",
      "悠遊卡",
      "加值",
      "轉乘",
      "出口",
      "車站",
      "紅線"
    ]
  },
  nightmarket: {
    id: "nightmarket",
    name: "Chợ đêm & Mì bò kho (台灣夜市與紅燒牛肉麵)",
    traditional: "夜市裡最有名的就是紅燒牛肉麵和外酥內嫩的臭豆腐。請問要不要加辣？小菜可以自取。",
    pinyin: "Yèshì lǐ zuì yǒumíng de jiùshì hóngshāo niúròu miàn hàn wài sū nèi nèn de chòudòufu. Qǐngwèn yào bú yào jiā là? Xiǎocài kěyǐ zìqǔ.",
    vietnamese: "Ở chợ đêm nổi tiếng nhất là mì bò kho đậm đà và đậu phụ thối giòn tan bên ngoài, mềm ngậy bên trong. Xin hỏi bạn có muốn thêm cay không? Món ăn kèm có thể tự lấy.",
    practiceTip: "Gợi ý phản xạ: 老闆，我要一份小碗牛肉麵，微辣，內用，謝謝！(Chủ quán, cho tôi một tô mì bò nhỏ, cay nhẹ, ăn tại quán, cảm ơn!).",
    keywords: [
      "chợ đêm",
      "mì bò",
      "bò kho",
      "đậu phụ thối",
      "bánh dứa",
      "ăn vặt",
      "độ cay",
      "cay",
      "món ăn",
      "ngon",
      "chè hạt sen",
      "gà rán",
      "trà đá",
      "夜市",
      "牛肉麵",
      "臭豆腐",
      "鳳梨酥",
      "加辣",
      "微辣",
      "小吃"
    ]
  },
  store: {
    id: "store",
    name: "Cửa hàng tiện lợi 7-11 & FamilyMart (超商與統一發票)",
    traditional: "一共八十五元。請問需要購買購物袋嗎？發票要印出來還是存手機條碼載具？",
    pinyin: "Yígòng bāshíwǔ yuán. Qǐngwèn xūyào gòumǎi gòuwùdài ma? Fāpiào yào yìn chūlái háishì cún shǒujī tiáomǎ zàijù?",
    vietnamese: "Tổng cộng 85 tệ. Xin hỏi bạn có cần mua túi đựng không? Hóa đơn in ra hay lưu vào mã vạch điện thoại (carrier)?",
    practiceTip: "Gợi ý phản xạ: 不用袋子，請給我紙本發票，我用現金或悠遊卡付錢。(Không cần túi, xin cho tôi hóa đơn giấy, tôi trả bằng tiền mặt hoặc thẻ EasyCard).",
    keywords: [
      "tiện lợi",
      "7-11",
      "seven",
      "familymart",
      "hóa đơn",
      "túi",
      "mã thẻ",
      "tiền mặt",
      "thanh toán",
      "in hóa đơn",
      "siêu thị mini",
      "gửi hàng",
      "nạp tiền",
      "便利商店",
      "超商",
      "發票",
      "載具",
      "塑膠袋",
      "條碼"
    ]
  },
  house: {
    id: "house",
    name: "Thuê phòng trọ & Điện nước Taipower (租套房與押金水電)",
    traditional: "這間獨立套房月租八千元，採光通風很好。押金是兩個月房租，水電費依照台電帳單計算。",
    pinyin: "Zhè jiān dúlì tàofáng yuèzū bāqiān yuán, cǎiguāng tōngfēng hěn hǎo. Yājīn shì liǎng ge yuè fángzū, shuǐdiànfèi yīzhào Táidiàn zhàngdān jìsuàn.",
    vietnamese: "Phòng khép kín này tiền thuê mỗi tháng 8.000 tệ, đón nắng và thoáng gió rất tốt. Tiền cọc là 2 tháng, tiền điện nước tính theo hóa đơn của công ty điện lực Đài Loan.",
    practiceTip: "Gợi ý phản xạ: 請問房間有包含洗衣機、冰箱和網路嗎？這週末方便約時間看房嗎？(Phòng có sẵn máy giặt, tủ lạnh và mạng internet không? Cuối tuần này hẹn giờ xem phòng được không?).",
    keywords: [
      "thuê nhà",
      "thuê phòng",
      "tiền phòng",
      "tiền cọc",
      "cọc",
      "điện nước",
      "phòng trọ",
      "chủ nhà",
      "xem phòng",
      "taipower",
      "hợp đồng thuê",
      "bình nóng lạnh",
      "套房",
      "租房",
      "押金",
      "水電費",
      "房東",
      "看房",
      "台電"
    ]
  },
  clinic: {
    id: "clinic",
    name: "Phòng khám & Thẻ BHYT (診所與全民健保卡)",
    traditional: "請先出示健保卡填寫初診資料並量體溫。醫生會為您診斷，領藥後記得按時服藥並多喝水休息。",
    pinyin: "Qǐng xiān chūshì jiànbǎokǎ tiánxiě chūzhěn zīliào bìng liáng tǐwēn. Yīshēng huì wèi nín zhěnduàn, lǐngyào hòu jìde ànshí fúyào bìng duō hēshuǐ xiūxi.",
    vietnamese: "Vui lòng xuất trình thẻ Bảo hiểm Y tế (BHYT) để điền thông tin khám lần đầu và đo nhiệt độ. Bác sĩ sẽ chẩn đoán cho bạn, sau khi nhận thuốc nhớ uống đúng giờ và uống nhiều nước nghỉ ngơi.",
    practiceTip: "Gợi ý phản xạ: 我從昨天下午開始頭痛和喉嚨痛，體溫大概三十八度。(Tôi bắt đầu bị đau đầu và đau họng từ chiều hôm qua, nhiệt độ cơ thể khoảng 38 độ).",
    keywords: [
      "khám bệnh",
      "bệnh viện",
      "phòng khám",
      "bác sĩ",
      "đau đầu",
      "sốt",
      "uống thuốc",
      "thuốc",
      "bảo hiểm",
      "bhyt",
      "thẻ bảo hiểm",
      "đau họng",
      "ho",
      "cảm cúm",
      "健保卡",
      "看病",
      "診所",
      "發燒",
      "頭痛",
      "初診"
    ]
  },
  bank: {
    id: "bank",
    name: "Ngân hàng Đài Loan & Mở tài khoản ARC (外籍人士銀行開戶)",
    traditional: "外籍人士開戶需要攜帶有效居留證（ARC）、護照以及個人印章，並填寫臨櫃申請表。",
    pinyin: "Wàijí rénshì kāihù xūyào xiédài yǒuxiào jūliúzhèng (ARC), hùzhào yǐjí gèrén yìnzhāng, bìng tiánxiě línguì shēnqǐngbiǎo.",
    vietnamese: "Người nước ngoài mở tài khoản cần mang theo thẻ cư trú (ARC) còn hạn, hộ chiếu và con dấu cá nhân, rồi điền đơn đăng ký tại quầy giao dịch.",
    practiceTip: "Gợi ý phản xạ: 我想辦理約定轉帳、金融卡提款和網路銀行功能，謝謝！(Tôi muốn đăng ký tính năng chuyển khoản định danh, rút tiền thẻ ATM và ngân hàng điện tử, cảm ơn!).",
    keywords: [
      "ngân hàng",
      "bưu điện",
      "mở tài khoản",
      "thẻ atm",
      "con dấu",
      "chuyển tiền",
      "arc",
      "cư trú",
      "hộ chiếu",
      "khai tài khoản",
      "sổ tiết kiệm",
      "đổi tiền",
      "tiền tệ",
      "銀行",
      "開戶",
      "居留證",
      "印章",
      "存摺",
      "轉帳"
    ]
  },
  workplace: {
    id: "workplace",
    name: "Môi trường công sở & Xin nghỉ phép (職場溝通與差勤請假)",
    traditional: "我們今天下午兩點在第三會議室開會。如果有事需要請假，請記得在差勤系統填寫假單並通知代理人。",
    pinyin: "Wǒmen jīntiān xiàwǔ liǎng diǎn zài dì sān huìyìshì kāihuì. Rúguǒ yǒu shì xūyào qǐngjià, qǐng jìde zài chāiqín xìtǒng tiánxiě jiàdān bìng tōngzhī dàilǐrén.",
    vietnamese: "Chúng ta họp lúc 2 giờ chiều nay ở phòng họp số 3. Nếu có việc cần xin nghỉ phép, nhớ điền đơn trên hệ thống chấm công và báo cho người bàn giao công việc nhé.",
    practiceTip: "Gợi ý phản xạ: 經理，不好意思，我明天家裡有私事想請一天事假，工作已交接。(Thưa quản lý, ngày mai nhà em có việc riêng muốn xin nghỉ một ngày phép riêng, công việc đã bàn giao xong ạ).",
    keywords: [
      "công sở",
      "đi làm",
      "họp",
      "nghỉ phép",
      "xin nghỉ",
      "đồng nghiệp",
      "sếp",
      "quản lý",
      "lương",
      "báo cáo",
      "chấm công",
      "bàn giao",
      "phòng họp",
      "開會",
      "請假",
      "事假",
      "會議室",
      "經理",
      "主管",
      "差勤"
    ]
  },
  interview: {
    id: "interview",
    name: "Phỏng vấn xin việc Đài Loan (求職面試與自我介紹)",
    traditional: "很高興能與您面試！請用中文簡單介紹您的專業背景、過往專案經驗以及為何想加入本公司。",
    pinyin: "Hěn gāoxìng néng yǔ nín miànshì! Qǐng yòng zhōngwén jiǎndān jièshào nín de zhuānyè bèijǐng, guòwǎng zhuān'àn jīngyàn yǐjí wèihé xiǎng jiārù běn gōngsī.",
    vietnamese: "Rất vui được phỏng vấn cùng bạn! Xin hãy dùng tiếng Hoa giới thiệu ngắn gọn nền tảng chuyên môn, các dự án từng tham gia và lý do muốn gia nhập công ty.",
    practiceTip: "Gợi ý phản xạ: 我在資訊與生產製造領域有三年工作經驗，擅長跨部門溝通與問題排除。(Tôi có 3 năm kinh nghiệm trong ngành CNTT và sản xuất, giỏi giao tiếp liên phòng ban và giải quyết sự cố).",
    keywords: [
      "phỏng vấn",
      "xin việc",
      "cv",
      "hồ sơ",
      "kinh nghiệm",
      "chuyên môn",
      "lý do",
      "thế mạnh",
      "đi làm",
      "ứng tuyển",
      "mức lương",
      "chế độ",
      "面試",
      "自我介紹",
      "經歷",
      "專案",
      "應徵",
      "求職"
    ]
  },
  translate: {
    id: "translate",
    name: "Dịch thuật & Hỏi ngữ cảnh (翻譯與常見日常表達)",
    traditional: "這句話在臺灣日常生活中很常見！您可以直接說：「請問這個用中文怎麼說？」",
    pinyin: 'Zhè jù huà zài Táiwān rìcháng shēnghuó zhōng hěn chángjiàn! Nín kěyǐ zhíjiē shuō: "Qǐngwèn zhège yòng zhōngwén zěnme shuō?"',
    vietnamese: 'Câu này rất phổ biến trong cuộc sống đời thường ở Đài Loan! Bạn có thể hỏi thẳng: "Xin hỏi cái này dùng tiếng Trung nói như thế nào?".',
    practiceTip: "Gợi ý phản xạ: Hãy gõ một cụm từ cụ thể (ví dụ: gọi taxi, tính tiền, chỉ đường) để cùng tôi luyện cách nói tiếng Hoa Phồn thể tự nhiên nhất nhé!",
    keywords: [
      "nghĩa là gì",
      "dịch",
      "nói sao",
      "nói thế nào",
      "tiếng hoa nói",
      "tiếng trung nói",
      "cách nói",
      "phát âm",
      "ngữ pháp",
      "từ vựng",
      "翻譯",
      "怎麼說",
      "什麼意思",
      "中文怎麼說"
    ]
  },
  greeting: {
    id: "greeting",
    name: "Lời chào & Hội thoại tự do (臺灣生活華語問候)",
    traditional: "你好！很高興認識你。歡迎來到臺灣！隨時隨地跟我練習繁體中文日常對話。",
    pinyin: "Nǐ hǎo! Hěn gāoxìng rènshi nǐ. Huānyíng lái dào Táiwān! Suíshí suídì gēn wǒ liànxí fántǐ zhōngwén rìcháng duìhuà.",
    vietnamese: "Xin chào! Rất vui được làm quen với bạn. Chào mừng bạn đến với Đài Loan! Bạn có thể luyện đàm thoại tiếng Trung Phồn thể cùng tôi bất cứ lúc nào.",
    practiceTip: "Gợi ý phản xạ: Bạn có thể chọn các chủ đề như gọi trà sữa, đi tàu điện MRT, thuê xe máy, mua sắm siêu thị hoặc làm việc trong công xưởng để bắt đầu luyện phản xạ.",
    keywords: [
      "chào",
      "hello",
      "hi",
      "bắt đầu",
      "luyện tập",
      "giúp tôi",
      "tập nói",
      "học tiếng hoa",
      "đài loan",
      "xin chào",
      "你好",
      "早安",
      "嗨",
      "練習"
    ]
  }
};
function generateSinologyAiReply(userText, roleId) {
  const normalizedRole = (roleId || "").toLowerCase().trim();
  if (normalizedRole && SINOLOGY_SCENARIOS[normalizedRole]) {
    const sc = SINOLOGY_SCENARIOS[normalizedRole];
    return `中文：${sc.traditional}
Pinyin: ${sc.pinyin}
Tiếng Việt: ${sc.vietnamese}
練習：${sc.practiceTip}`;
  }
  const text = (userText || "").toLowerCase().trim();
  if (text) {
    const orderedScenarios = [
      "factory",
      "tax",
      "tech",
      "scooter",
      "tea",
      "mrt",
      "nightmarket",
      "store",
      "house",
      "clinic",
      "bank",
      "workplace",
      "interview",
      "translate",
      "greeting"
    ];
    for (const key of orderedScenarios) {
      const sc = SINOLOGY_SCENARIOS[key];
      if (!sc) continue;
      const matched = sc.keywords.some((kw) => text.includes(kw));
      if (matched) {
        return `中文：${sc.traditional}
Pinyin: ${sc.pinyin}
Tiếng Việt: ${sc.vietnamese}
練習：${sc.practiceTip}`;
      }
    }
  }
  const fallback = SINOLOGY_SCENARIOS.greeting;
  return `中文：${fallback.traditional}
Pinyin: ${fallback.pinyin}
Tiếng Việt: ${fallback.vietnamese}
練習：${fallback.practiceTip}`;
}
function createGuidedFallbackReply(options) {
  const userText = options.lastUserMessage || "";
  const roleId = options.roleId;
  const content = generateSinologyAiReply(userText, roleId);
  const fallbackReason = options.reason || "offline";
  let guidanceNote = options.note;
  if (!guidanceNote) {
    switch (fallbackReason) {
      case "timeout":
        guidanceNote = "Máy chủ AI trực tuyến phản hồi quá thời gian quy định (12s). Chuyển sang gia sư hướng dẫn cục bộ chuẩn TOCFL Đài Loan.";
        break;
      case "upstream_error":
        guidanceNote = "Dịch vụ AI trực tuyến tạm thời gián đoạn hoặc quá tải. Chuyển sang gia sư hướng dẫn cục bộ chuẩn TOCFL Đài Loan.";
        break;
      case "no_key":
        guidanceNote = "Chưa cấu hình khóa API trực tuyến hoặc yêu cầu gửi tới địa chỉ không được ủy quyền. Đang sử dụng gia sư hướng dẫn cục bộ.";
        break;
      case "offline":
      default:
        guidanceNote = "Chế độ luyện tập hướng dẫn cục bộ độc lập với mạng ngoài.";
        break;
    }
  }
  const threadMessages = [
    ...options.previousMessages || []
  ];
  if (userText) {
    threadMessages.push({ role: "user", content: userText });
  }
  threadMessages.push({ role: "assistant", content });
  return {
    mode: "guided",
    content,
    model: "sinology-local-tutor",
    provider: "Sinology Local NLP",
    thread: {
      id: options.threadId || Date.now(),
      messages: threadMessages
    },
    meta: {
      latencyMs: options.latencyMs ?? 5,
      fallbackReason,
      guidanceNote
    }
  };
}
const DEFAULT_AI_TIMEOUT_MS = 12e3;
const MAX_AI_TIMEOUT_MS = 15e3;
const MIN_AI_TIMEOUT_MS = 1e3;
function buildTutorSystemPrompt(roleId) {
  let roleContext = "";
  switch (roleId) {
    case "factory":
      roleContext = "Tình huống: Công xưởng Đài Loan (工廠機台與加班), giao tiếp với Quản đốc/Tổ trưởng sản xuất (組長) về máy móc, kiểm hàng, xin tăng ca hoặc nghỉ phép.";
      break;
    case "tax":
      roleContext = "Tình huống: Cục thuế Đài Loan (國稅局) tháng 5, kê khai thuế thu nhập cá nhân (綜合所得稅), hoàn thuế (退稅), cư trú đủ 183 ngày, chứng từ khấu trừ (扣繳憑單).";
      break;
    case "tech":
      roleContext = "Tình huống: Khu công nghệ Tân Trúc / TSMC, thảo luận tấm wafer 3nm, phòng sạch, tỷ lệ thành phẩm (良率), tiến trình bán dẫn.";
      break;
    case "scooter":
      roleContext = "Tình huống: Thuê xe máy ở Đài Loan, đổ xăng 95, mũ bảo hiểm, trạm xăng Trung Dầu CPC, hóa đơn lưu mã thẻ (載具).";
      break;
    case "tea":
      roleContext = "Tình huống: Quầy trà sữa Đài Loan (50嵐), hỏi đồ uống, điều chỉnh độ ngọt (đường) và đá (nhiều đá/ít đá/không đá), mua mang đi hay dùng tại quán.";
      break;
    case "mrt":
      roleContext = "Tình huống: Ga tàu điện ngầm Đài Bắc (MRT), mua thẻ EasyCard (悠遊卡), nạp tiền và hỏi tuyến đổi tàu.";
      break;
    case "nightmarket":
      roleContext = "Tình huống: Chợ đêm Đài Loan, gọi món ăn vặt, mì bò kho, đậu phụ thối, hỏi độ cay.";
      break;
    case "store":
      roleContext = "Tình huống: Cửa hàng tiện lợi 7-Eleven / FamilyMart Đài Loan, thanh toán tiền mặt/thẻ, in hóa đơn hoặc lưu thẻ, gửi bưu kiện.";
      break;
    case "house":
      roleContext = "Tình huống: Thuê phòng trọ tại Đài Loan, hỏi tiền cọc 2 tháng, tiền điện nước hóa đơn Đài Điện, hẹn giờ xem phòng.";
      break;
    case "clinic":
      roleContext = "Tình huống: Phòng khám và BHYT Đài Loan, xuất trình thẻ BHYT (健保卡), miêu tả triệu chứng sốt hoặc đau đầu, hướng dẫn uống thuốc.";
      break;
    case "bank":
      roleContext = "Tình huống: Ngân hàng Đài Loan, mở tài khoản cho người nước ngoài, mang thẻ cư trú ARC, hộ chiếu, con dấu cá nhân, đăng ký internet banking.";
      break;
    case "workplace":
      roleContext = "Tình huống: Môi trường công sở văn phòng, họp phòng họp số 3, xin nghỉ phép riêng, điền hệ thống chấm công.";
      break;
    case "interview":
      roleContext = "Tình huống: Phỏng vấn xin việc tại Đài Loan, giới thiệu bản thân, phúc lợi lao bảo y bảo, thời gian đi làm.";
      break;
  }
  return `你是 ZhongXue+ 的臺灣華語對話與發音練習助教。請使用繁體中文、臺灣常用詞彙與自然臺灣腔調。
${roleContext ? `【目前練習情境】：${roleContext}` : ""}
請嚴格按照以下4行格式回應，不要使用 Markdown 星號或多餘格式：
中文：[Một câu tiếng Hoa Phồn thể chuẩn giọng Đài Loan tự nhiên phù hợp ngữ cảnh]
Pinyin: [Phiên âm Pinyin kèm dấu thanh điệu chuẩn]
Tiếng Việt: [Dịch nghĩa tiếng Việt tự nhiên và giải thích ngữ cảnh ngắn gọn]
練習：[Nhận xét ngắn về phát âm hoặc ngữ pháp, kèm 1 gợi ý câu phản xạ ngắn để người học luyện nói tiếp]`;
}
function extractAiResponseText(data) {
  if (!data || typeof data !== "object") return null;
  const d = data;
  if (Array.isArray(d.output)) {
    for (let i = d.output.length - 1; i >= 0; i--) {
      const item = d.output[i];
      if (item.type === "message" && Array.isArray(item.content)) {
        for (const c of item.content) {
          if (typeof c.text === "string" && c.text.trim()) {
            return c.text.trim();
          }
        }
      }
    }
  }
  if (Array.isArray(d.choices) && d.choices[0]?.message) {
    const text = d.choices[0].message.content || d.choices[0].message.reasoning_content;
    if (typeof text === "string" && text.trim()) {
      return text.trim();
    }
  }
  return null;
}
async function executeConversation(body, options) {
  const env = options?.env || process.env;
  const fetchFn = options?.fetchFn || globalThis.fetch;
  const action = body.action || "chat";
  const tStart = Date.now();
  const model = (body.model || env.AI_MODEL || "gpt-6.1-sol").trim();
  const lowerModel = model.toLowerCase();
  const isSolModel = lowerModel === "gpt-6.1-sol" || lowerModel.includes("sol") || lowerModel.includes("astra") || lowerModel.startsWith("gpt-");
  const allowLocalDev = options?.allowLocalDev ?? (env.ALLOW_LOCAL_TEST_UPSTREAM === "true" || env.VITEST === "true" || env.NODE_ENV === "test");
  const creds = resolveUpstreamCredentials({
    model,
    requestedBaseUrl: body.baseUrl,
    clientApiKey: body.apiKey,
    env,
    allowLocalDev
  });
  const requestedTimeout = body.timeoutMs || (env.AI_TIMEOUT_MS ? Number(env.AI_TIMEOUT_MS) : DEFAULT_AI_TIMEOUT_MS);
  const timeoutMs = Math.min(Math.max(requestedTimeout || DEFAULT_AI_TIMEOUT_MS, MIN_AI_TIMEOUT_MS), MAX_AI_TIMEOUT_MS);
  const controller = new AbortController();
  let timedOut = false;
  let clientAborted = false;
  const timeoutId = setTimeout(() => {
    timedOut = true;
    controller.abort(new Error("UPSTREAM_TIMEOUT"));
  }, timeoutMs);
  const onClientAbort = () => {
    clientAborted = true;
    controller.abort(new Error("CLIENT_ABORTED"));
  };
  if (options?.clientSignal) {
    if (options.clientSignal.aborted) {
      clearTimeout(timeoutId);
      return {
        statusCode: 499,
        body: { error: { code: "CLIENT_CLOSED", message: "Client aborted request before execution" } }
      };
    }
    options.clientSignal.addEventListener("abort", onClientAbort, { once: true });
  }
  try {
    if (action === "ping" || action === "health") {
      const isAgentRouter2 = creds.baseUrl.includes("agentrouter.org");
      const isOpenRouter2 = creds.baseUrl.includes("openrouter.ai");
      const providerLabel = isAgentRouter2 ? `AgentRouter (${model})` : isOpenRouter2 ? `OpenRouter (${model})` : `Upstream (${model})`;
      if (!creds.isAllowed) {
        const isSecurityViolation = creds.error && (creds.error.includes("Forbidden") || creds.error.includes("SSRF") || creds.error.includes("Insecure protocol") || creds.error.includes("Malformed URL") || creds.error.includes("Unsupported protocol") || creds.error.includes("Invalid protocol") || creds.error.includes("Non-standard port") || creds.baseUrl.includes("openrouter.ai") || body.baseUrl && body.baseUrl.includes("openrouter.ai"));
        const statusCode = isSecurityViolation ? 400 : 200;
        return {
          statusCode,
          body: {
            ok: false,
            provider: isAgentRouter2 ? "AgentRouter" : isOpenRouter2 ? "OpenRouter" : "Custom Provider",
            model,
            baseUrl: creds.baseUrl,
            error: creds.error || (isSecurityViolation ? "Security policy violation" : "Chưa cấu hình API Key trong .env hoặc Cài đặt")
          }
        };
      }
      if (!creds.apiKey) {
        return {
          statusCode: 200,
          body: {
            ok: false,
            provider: isAgentRouter2 ? "AgentRouter" : isOpenRouter2 ? "OpenRouter" : "Custom Provider",
            model,
            baseUrl: creds.baseUrl,
            error: creds.error || "Chưa cấu hình API Key trong .env hoặc Cài đặt"
          }
        };
      }
      try {
        const pingHeaders = {
          "Content-Type": "application/json",
          Authorization: `Bearer ${creds.apiKey}`
        };
        if (isAgentRouter2) {
          pingHeaders["Originator"] = "codex_cli_rs";
          pingHeaders["User-Agent"] = "codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12";
          pingHeaders["Version"] = "0.101.0";
        }
        const pingEndpoint = isSolModel && isAgentRouter2 ? `${creds.baseUrl}/responses` : `${creds.baseUrl}/chat/completions`;
        const pingBody = isSolModel && isAgentRouter2 ? JSON.stringify({ model, input: "ping", max_output_tokens: 20 }) : JSON.stringify({ model, messages: [{ role: "user", content: "ping" }], max_tokens: 20 });
        const pingRes = await fetchFn(pingEndpoint, {
          method: "POST",
          headers: pingHeaders,
          body: pingBody,
          signal: controller.signal,
          redirect: "manual"
        });
        const elapsed = Date.now() - tStart;
        if (pingRes.ok) {
          const rawPingBody = await pingRes.text().catch(() => "");
          if (!rawPingBody || !rawPingBody.trim()) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: "Upstream returned empty or whitespace-only response body"
              }
            };
          }
          let pingData;
          try {
            pingData = JSON.parse(rawPingBody);
          } catch {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: "Upstream response is not valid JSON"
              }
            };
          }
          if (!pingData || typeof pingData !== "object" || Array.isArray(pingData)) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: "Upstream response must be a JSON object"
              }
            };
          }
          if ("error" in pingData && pingData.error) {
            const errVal = pingData.error;
            const errMsg = typeof errVal === "string" ? errVal : typeof errVal === "object" && errVal && "message" in errVal && typeof errVal.message === "string" ? errVal.message : JSON.stringify(errVal);
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: `Upstream returned error: ${errMsg}`
              }
            };
          }
          const hasValidSchema = Array.isArray(pingData.choices) && pingData.choices.length > 0 || Array.isArray(pingData.output) || Boolean(extractAiResponseText(pingData));
          if (!hasValidSchema) {
            return {
              statusCode: 200,
              body: {
                ok: false,
                provider: providerLabel,
                model,
                baseUrl: creds.baseUrl,
                error: "Upstream response missing choices or output schema"
              }
            };
          }
          return {
            statusCode: 200,
            body: {
              ok: true,
              provider: providerLabel,
              model,
              baseUrl: creds.baseUrl,
              latencyMs: elapsed
            }
          };
        } else {
          const errText = await pingRes.text().catch(() => "");
          return {
            statusCode: 200,
            body: {
              ok: false,
              provider: isAgentRouter2 ? "AgentRouter" : "OpenRouter",
              model,
              baseUrl: creds.baseUrl,
              statusCode: pingRes.status,
              error: `Lỗi máy chủ (${pingRes.status}): ${errText.slice(0, 150)}`
            }
          };
        }
      } catch (err) {
        if (clientAborted) {
          return {
            statusCode: 499,
            body: { error: { code: "CLIENT_CLOSED", message: "Client cancelled request" } }
          };
        }
        return {
          statusCode: 200,
          body: {
            ok: false,
            provider: isAgentRouter2 ? "AgentRouter" : "OpenRouter",
            model,
            baseUrl: creds.baseUrl,
            error: timedOut ? "Quá thời gian chờ phản hồi (timeout)" : err instanceof Error ? err.message : "Lỗi kết nối mạng"
          }
        };
      }
    }
    const messages = body.messages || [];
    const lastUserTurn = [...messages].reverse().find((m) => m.role === "user");
    const lastMsg = lastUserTurn?.content || messages[messages.length - 1]?.content || "";
    const roleId = body.roleId;
    const threadId = body.threadId || Date.now();
    if (!creds.isAllowed) {
      const isSecurityViolation = creds.error && (creds.error.includes("Forbidden") || creds.error.includes("SSRF") || creds.error.includes("Insecure protocol") || creds.error.includes("Malformed URL") || creds.error.includes("Unsupported protocol") || creds.error.includes("Invalid protocol") || creds.error.includes("Non-standard port") || body.baseUrl && (body.baseUrl.includes("openrouter.ai") || body.baseUrl.includes("deepseek.com")));
      if (isSecurityViolation) {
        return {
          statusCode: 400,
          body: {
            error: {
              code: "BAD_REQUEST",
              message: creds.error || "Từ chối ủy quyền do vi phạm chính sách bảo mật."
            }
          }
        };
      }
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: "no_key",
        latencyMs: Date.now() - tStart,
        note: creds.error
      });
      return {
        statusCode: 200,
        body: fallbackReply
      };
    }
    if (!creds.apiKey) {
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: "no_key",
        latencyMs: Date.now() - tStart,
        note: creds.error ? `Từ chối ủy quyền (${creds.error}). Đang sử dụng gia sư hướng dẫn cục bộ.` : void 0
      });
      return { statusCode: 200, body: fallbackReply };
    }
    const isAgentRouter = creds.baseUrl.includes("agentrouter.org");
    const isOpenRouter = creds.baseUrl.includes("openrouter.ai");
    const prompt = buildTutorSystemPrompt(roleId);
    const reqHeaders = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${creds.apiKey}`
    };
    if (isAgentRouter) {
      reqHeaders["Originator"] = "codex_cli_rs";
      reqHeaders["User-Agent"] = "codex_cli_rs/0.101.0 (Mac OS; arm64) Apple_Terminal/2.12";
      reqHeaders["Version"] = "0.101.0";
    }
    let aiText = null;
    let upstreamErrorStatus = null;
    try {
      if (isSolModel && isAgentRouter) {
        const convHistory = messages.map(
          (m) => `${m.role === "user" ? "Người học" : "Trợ lý AI"}: ${m.content}`
        ).join("\n");
        const fullInput = `${prompt}

【Lịch sử hội thoại】：
${convHistory}`;
        const llmRes = await fetchFn(`${creds.baseUrl}/responses`, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify({
            model,
            input: fullInput,
            max_output_tokens: 2500
          }),
          signal: controller.signal,
          redirect: "manual"
        });
        if (llmRes.ok) {
          let llmData = null;
          if (typeof llmRes.json === "function") {
            try {
              llmData = await llmRes.json();
            } catch {
              llmData = null;
            }
          } else if (typeof llmRes.text === "function") {
            try {
              const raw = await llmRes.text();
              llmData = raw ? JSON.parse(raw) : null;
            } catch {
              llmData = null;
            }
          }
          aiText = extractAiResponseText(llmData);
        } else {
          upstreamErrorStatus = llmRes.status;
          const errBody = typeof llmRes.text === "function" ? await llmRes.text().catch(() => "") : "";
          console.warn(`[zhongxue-ai] Responses API error ${llmRes.status}:`, errBody.slice(0, 150));
        }
      } else {
        const payload = {
          model,
          messages: [
            { role: "system", content: prompt },
            ...messages.map((m) => ({ role: m.role, content: m.content }))
          ],
          max_tokens: 4096
        };
        if (isOpenRouter) {
          payload.reasoning = { enabled: false, exclude: true };
        }
        const llmRes = await fetchFn(`${creds.baseUrl}/chat/completions`, {
          method: "POST",
          headers: reqHeaders,
          body: JSON.stringify(payload),
          signal: controller.signal,
          redirect: "manual"
        });
        if (llmRes.ok) {
          let llmData = null;
          if (typeof llmRes.json === "function") {
            try {
              llmData = await llmRes.json();
            } catch {
              llmData = null;
            }
          } else if (typeof llmRes.text === "function") {
            try {
              const raw = await llmRes.text();
              llmData = raw ? JSON.parse(raw) : null;
            } catch {
              llmData = null;
            }
          }
          aiText = extractAiResponseText(llmData);
        } else {
          upstreamErrorStatus = llmRes.status;
          const errBody = typeof llmRes.text === "function" ? await llmRes.text().catch(() => "") : "";
          console.warn(`[zhongxue-ai] Chat completions error ${llmRes.status}:`, errBody.slice(0, 150));
        }
      }
      if (aiText && aiText.trim()) {
        const replyTurn = { role: "assistant", content: aiText.trim() };
        const reply = {
          mode: "ai",
          content: aiText.trim(),
          model,
          provider: isAgentRouter ? `AgentRouter (${model})` : isOpenRouter ? `OpenRouter (${model})` : `Upstream (${model})`,
          thread: {
            id: threadId,
            messages: [...messages, replyTurn]
          },
          meta: {
            latencyMs: Date.now() - tStart
          }
        };
        return { statusCode: 200, body: reply };
      }
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: "upstream_error",
        latencyMs: Date.now() - tStart,
        note: upstreamErrorStatus ? `Mô hình AI trực tuyến phản hồi mã lỗi ${upstreamErrorStatus}. Đã kích hoạt gia sư hướng dẫn cục bộ.` : "Mô hình AI trực tuyến phản hồi rỗng. Đã kích hoạt gia sư hướng dẫn cục bộ."
      });
      return { statusCode: 200, body: fallbackReply };
    } catch (err) {
      if (clientAborted) {
        return {
          statusCode: 499,
          body: { error: { code: "CLIENT_CLOSED", message: "Client cancelled request" } }
        };
      }
      const isTimeout = timedOut || err instanceof Error && err.name === "AbortError" && timedOut;
      const fallbackReply = createGuidedFallbackReply({
        lastUserMessage: lastMsg,
        roleId,
        threadId,
        previousMessages: messages,
        reason: isTimeout ? "timeout" : "upstream_error",
        latencyMs: Date.now() - tStart,
        note: isTimeout ? `Yêu cầu AI trực tuyến quá thời gian quy định (${timeoutMs}ms). Đã kích hoạt gia sư hướng dẫn cục bộ.` : `Lỗi kết nối AI trực tuyến (${err instanceof Error ? err.message : "network error"}). Đã kích hoạt gia sư hướng dẫn cục bộ.`
      });
      return { statusCode: 200, body: fallbackReply };
    }
  } finally {
    clearTimeout(timeoutId);
    if (options?.clientSignal) {
      options.clientSignal.removeEventListener("abort", onClientAbort);
    }
  }
}
async function handleConversationRoute(req, res, parsedBody) {
  const method = (req.method || "GET").toUpperCase();
  if (method === "GET") {
    const creds = resolveUpstreamCredentials({});
    sendJson(res, 200, {
      status: "ready",
      ok: true,
      provider: creds.isTrusted ? `AgentRouter (${process.env.AI_MODEL || "gpt-6.1-sol"})` : "Local Sinology Engine",
      baseUrl: creds.baseUrl,
      model: process.env.AI_MODEL || "gpt-6.1-sol",
      hasApiKey: Boolean(creds.apiKey)
    });
    return;
  }
  if (method !== "POST") {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/conversation`));
    return;
  }
  const clientController = new AbortController();
  const onClientDisconnect = () => {
    if (!res.writableEnded) {
      clientController.abort(new Error("CLIENT_CLOSED"));
    }
  };
  if (typeof res.on === "function") {
    res.on("close", onClientDisconnect);
  }
  if (typeof req.on === "function") {
    req.on("aborted", onClientDisconnect);
    req.on("close", () => {
      if (!req.complete && !res.writableEnded) {
        onClientDisconnect();
      }
    });
  }
  try {
    let rawBody;
    if (parsedBody !== void 0) ;
    else {
      const contentType = req.headers ? req.headers["content-type"] : void 0;
      if (contentType) {
        validateJsonContentType(contentType);
      }
      rawBody = await new Promise((resolve, reject) => {
        let raw = "";
        let bytesRead = 0;
        const maxBytes = MAX_BODY_SIZE_CONVERSATION;
        if (req.headers && req.headers["content-length"]) {
          const declared = parseInt(req.headers["content-length"], 10);
          if (!isNaN(declared) && declared > maxBytes) {
            reject(payloadTooLarge(`Request body size (${declared} bytes) exceeds limit of ${maxBytes} bytes`));
            return;
          }
        }
        req.on("data", (chunk) => {
          const len = Buffer.isBuffer(chunk) ? chunk.length : Buffer.byteLength(chunk);
          bytesRead += len;
          if (bytesRead > maxBytes) {
            reject(payloadTooLarge(`Request body size (${bytesRead} bytes) exceeds limit of ${maxBytes} bytes`));
            return;
          }
          raw += chunk.toString();
        });
        req.on("end", () => {
          try {
            resolve(parseJsonBody(raw));
          } catch {
            reject(badRequest("Invalid JSON request body", void 0, "BAD_REQUEST"));
          }
        });
        req.on("error", reject);
      });
    }
    const validBody = validateConversationBody(rawBody);
    if ((!validBody.action || validBody.action === "chat") && (!validBody.messages || validBody.messages.length === 0)) {
      throw badRequest("messages array cannot be empty");
    }
    if (res.writableEnded || clientController.signal.aborted) {
      return;
    }
    const result = await executeConversation(validBody, {
      clientSignal: clientController.signal
    });
    if (!res.writableEnded) {
      sendJson(res, result.statusCode, result.body);
    }
  } catch (err) {
    if (!res.writableEnded) {
      sendError(res, err);
    }
  } finally {
    if (typeof res.removeListener === "function") {
      res.removeListener("close", onClientDisconnect);
    }
    if (typeof req.removeListener === "function") {
      req.removeListener("aborted", onClientDisconnect);
    }
  }
}
async function handleHealthRoute(req, res) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/health`));
    return;
  }
  const isLoaded = dictionaryEngine.isReady();
  const totalEntries = dictionaryEngine.getTotal();
  const loadTimeMs = dictionaryEngine.getLoadTimeMs();
  const serverKey = getServerKeyForModel();
  const configured = Boolean(serverKey);
  const baseUrl = getDefaultBaseUrl();
  let provider = "none";
  if (configured) {
    if (baseUrl.includes("openrouter")) {
      provider = "openrouter";
    } else if (baseUrl.includes("agentrouter")) {
      provider = "agentrouter";
    } else {
      provider = "custom";
    }
  }
  const model = process.env.AI_MODEL || (baseUrl.includes("agentrouter") ? "gpt-6.1-sol" : "google/gemini-2.0-flash-001");
  const healthData = {
    status: isLoaded ? "ok" : "degraded",
    uptime: Math.floor(process.uptime()),
    timestamp: (/* @__PURE__ */ new Date()).toISOString(),
    dictionary: {
      loaded: isLoaded,
      totalEntries,
      loadTimeMs
    },
    ai: {
      configured,
      provider,
      model
    },
    version: "2.0.0"
  };
  const statusCode = isLoaded ? 200 : 503;
  if (method === "HEAD") {
    res.writeHead(statusCode, { "Content-Type": "application/json; charset=utf-8" });
    res.end();
    return;
  }
  sendJson(res, statusCode, healthData);
}
async function handleDictionaryRoute(req, res, url) {
  const method = (req.method || "GET").toUpperCase();
  if (method !== "GET" && method !== "HEAD") {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/dictionary`));
    return;
  }
  if (!dictionaryEngine.isReady()) {
    try {
      await dictionaryEngine.init();
    } catch {
    }
  }
  if (!dictionaryEngine.isReady()) {
    sendError(res, serviceUnavailable("Dictionary engine is not ready or failed to load"));
    return;
  }
  let validated;
  try {
    validated = validateDictionaryQuery(url.searchParams);
  } catch (err) {
    sendError(res, err);
    return;
  }
  if (validated.id) {
    const entry = dictionaryEngine.getById(validated.id);
    if (!entry) {
      sendError(res, notFound(`Dictionary entry not found for id: ${validated.id}`, { id: validated.id }));
      return;
    }
    if (method === "HEAD") {
      res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
      res.end();
      return;
    }
    sendJson(res, 200, entry);
    return;
  }
  const queryStr = validated.q ?? "";
  const searchResult = dictionaryEngine.search(
    queryStr,
    validated.mode,
    validated.offset,
    validated.limit
  );
  const dictionaryTotal = dictionaryEngine.getTotal();
  const totalMatches = searchResult.total;
  const pageCount = searchResult.results.length;
  const response = {
    results: searchResult.results,
    total: totalMatches,
    count: pageCount,
    dictionaryTotal,
    totalMatches,
    pageCount,
    offset: validated.offset,
    limit: validated.limit,
    query: queryStr,
    mode: validated.mode,
    source: "database"
  };
  if (method === "HEAD") {
    res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    res.end();
    return;
  }
  sendJson(res, 200, response);
}
async function handleHandwritingRoute(req, res) {
  const method = (req.method || "POST").toUpperCase();
  if (method !== "POST") {
    sendError(res, methodNotAllowed(`Method ${method} is not allowed on /api/handwriting`));
    return;
  }
  let validBody;
  try {
    const rawBody = await readAndValidateJsonBody(req, MAX_BODY_SIZE_HANDWRITING);
    validBody = validateHandwritingBody(rawBody);
  } catch (err) {
    sendError(res, err);
    return;
  }
  const googlePayload = {
    requests: [
      {
        writing_guide: {
          writing_area_width: validBody.width,
          writing_area_height: validBody.height
        },
        ink: validBody.strokes
      }
    ]
  };
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 4e3);
  const onClose = () => controller.abort();
  req.on("close", onClose);
  try {
    const gRes = await fetch(
      "https://inputtools.google.com/request?itc=zh-t-i0-handwrit&app=translate",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(googlePayload),
        signal: controller.signal
      }
    );
    clearTimeout(timeoutId);
    req.off("close", onClose);
    if (gRes.ok) {
      const gData = await gRes.json();
      if (Array.isArray(gData) && gData[0] === "SUCCESS" && gData[1]?.[0]?.[1]) {
        const candidates = gData[1][0][1];
        const successResp = {
          candidates,
          source: "google"
        };
        sendJson(res, 200, successResp);
        return;
      }
    }
  } catch {
    clearTimeout(timeoutId);
    req.off("close", onClose);
  }
  const fallbackResp = {
    candidates: [],
    source: "local_fallback"
  };
  sendJson(res, 200, fallbackResp);
}
async function handleApiRoute(req, res, url) {
  const host = req.headers.host || "127.0.0.1";
  const parsedUrl = url || new URL$1(req.url || "/", `http://${host}`);
  const pathname = parsedUrl.pathname;
  if (pathname === "/api/health") {
    await handleHealthRoute(req, res);
    return;
  }
  if (pathname === "/api/dictionary") {
    await handleDictionaryRoute(req, res, parsedUrl);
    return;
  }
  if (pathname === "/api/conversation") {
    await handleConversationRoute(req, res);
    return;
  }
  if (pathname === "/api/handwriting") {
    await handleHandwritingRoute(req, res);
    return;
  }
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    sendError(res, notFound("API endpoint not found", { path: pathname }));
    return;
  }
}
const __filename$2 = fileURLToPath(import.meta.url);
path.dirname(__filename$2);
async function handleApiRequest(req, res, url) {
  const host = req.headers.host || "127.0.0.1";
  const parsedUrl = url || new URL$1(req.url || "/", `http://${host}`);
  const pathname = parsedUrl.pathname;
  if (pathname === "/api" || pathname.startsWith("/api/")) {
    try {
      const origin = req.headers.origin;
      if (origin) {
        if (!isAllowedOrigin(origin)) {
          sendError(
            res,
            forbidden("Origin not allowed by CORS policy", { origin }, "FORBIDDEN_ORIGIN")
          );
          return true;
        }
        const corsHeaders = getCorsHeaders(origin);
        for (const [key, value] of Object.entries(corsHeaders)) {
          res.setHeader(key, value);
        }
      }
      if (req.method === "OPTIONS") {
        res.writeHead(204);
        res.end();
        return true;
      }
      await handleApiRoute(req, res, parsedUrl);
    } catch (err) {
      if (!res.writableEnded) {
        sendError(res, err);
      }
    }
    return true;
  }
  return false;
}
const __filename$1 = fileURLToPath(import.meta.url);
const __dirname$1 = path.dirname(__filename$1);
if (typeof globalThis.__dirname === "undefined") {
  globalThis.__dirname = __dirname$1;
}
if (typeof globalThis.__filename === "undefined") {
  globalThis.__filename = __filename$1;
}
const DICT_CANDIDATES = [
  path.join(process.cwd(), "data", "dictionary", "CVDICT.u8.gz"),
  path.resolve(__dirname$1, "../data/dictionary/CVDICT.u8.gz"),
  fileURLToPath(new URL$1("../data/dictionary/CVDICT.u8.gz", import.meta.url))
];
if (!process.env.DICT_PATH) {
  for (const candidate of DICT_CANDIDATES) {
    if (fs.existsSync(candidate)) {
      process.env.DICT_PATH = candidate;
      break;
    }
  }
}
const config = {
  api: {
    bodyParser: false
  }
};
async function vercelApiHandler(req, res) {
  if (!dictionaryEngine.isReady()) {
    try {
      await dictionaryEngine.init(process.env.DICT_PATH);
    } catch {
    }
  }
  const host = req.headers.host || "127.0.0.1";
  const parsedUrl = new URL$1(req.url || "/api", `http://${host}`);
  if (parsedUrl.pathname === "/api/vercel" || parsedUrl.pathname === "/api/vercel.js" || parsedUrl.pathname === "/api/index" || parsedUrl.pathname === "/api/index.ts" || parsedUrl.pathname === "/api/index.js") {
    const subPath = parsedUrl.searchParams.get("__zhongxue_path") || "";
    const cleanSubPath = subPath.replace(/^\/+/, "");
    if (cleanSubPath && cleanSubPath !== "$1" && cleanSubPath !== ":path*") {
      parsedUrl.pathname = `/api/${cleanSubPath}`;
    } else {
      parsedUrl.pathname = "/api";
    }
  } else if (!parsedUrl.pathname.startsWith("/api")) {
    const cleanPath = parsedUrl.pathname.replace(/^\/+/, "");
    parsedUrl.pathname = cleanPath ? `/api/${cleanPath}` : "/api";
  }
  parsedUrl.searchParams.delete("__zhongxue_path");
  await handleApiRequest(req, res, parsedUrl);
}
export {
  config,
  vercelApiHandler as default
};
