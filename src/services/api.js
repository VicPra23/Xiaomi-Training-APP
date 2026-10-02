const API_URL = "https://script.google.com/macros/s/AKfycbyUQd9fS0ni-M_bSQF75mqgb2euxk2OW2TTDiA_3wJca3KJNspjXpgT2tkFQ3izVRm6qA/exec";

// Sistema de Caché de Metadatos para Optimización (V1.1)
const _metadataCache = new Map();
const _inflight = new Map();
let _cacheEpoch = 0;
const CACHE_TTL = 5 * 60 * 1000;
const CACHEABLE_ACTIONS = new Set(['getUsersList', 'getCitiesList', 'getFilterMetadata', 'getMaterials', 'getDashboardStats', 'getReportsHistory']);
function invalidateReadCache() {
    ++_cacheEpoch;
    _metadataCache.clear();
    _inflight.clear();
}
const OFFLINE_CACHE_KEY = "xiaomiOfflineReadCacheV1";

function getOfflineCacheEntry(action, params) {
    try {
        const session = getSessionData();
        const all = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
        const key = `${session?.user || "anon"}:${action}:${JSON.stringify(params)}`;
        return all[key]?.data || null;
    } catch (error) {
        return null;
    }
}

function setOfflineCacheEntry(action, params, data) {
    if (!data || data.status !== "success") return;
    try {
        const session = getSessionData();
        const all = JSON.parse(localStorage.getItem(OFFLINE_CACHE_KEY) || "{}");
        const key = `${session?.user || "anon"}:${action}:${JSON.stringify(params)}`;
        all[key] = { data, savedAt: Date.now() };
        const entries = Object.entries(all).sort((a, b) => b[1].savedAt - a[1].savedAt).slice(0, 25);
        localStorage.setItem(OFFLINE_CACHE_KEY, JSON.stringify(Object.fromEntries(entries)));
    } catch (error) {
        console.warn("No se pudo actualizar la lectura offline.", error);
    }
}

/**
 * Motor de comunicación GET (V6.9) - MODO JSONP (Anti-Bloqueos CORS)
 * Esto evita que el móvil bloquee las redirecciones de Google Apps Script.
 */
function sendGet(action, params = {}, useCache = false) {
    useCache = CACHEABLE_ACTIONS.has(action) && !params.refresh;
    const session = getSessionData();
    const epoch = _cacheEpoch;
    const current = () => epoch === _cacheEpoch && session?.token === getSessionData()?.token;
    const authParams = session?.token ? { ...params, token: session.token } : params;
    const cacheKey = action + JSON.stringify(authParams);
    const cachedEntry = _metadataCache.get(cacheKey);
    if (useCache && cachedEntry && Date.now() - cachedEntry.savedAt < CACHE_TTL) return Promise.resolve(cachedEntry.data);
    if (_inflight.has(cacheKey)) return _inflight.get(cacheKey);

    const promise = new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + (window.crypto?.randomUUID?.().replace(/-/g, '') || `${Date.now()}_${Math.round(1000000 * Math.random())}`);
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            cleanup();
            if (!current()) { resolve({status: 'stale'}); return; }
            const cached = getOfflineCacheEntry(action, params);
            if (cached) resolve({ ...cached, offline: true });
            else reject(new Error("Timeout: El servidor de Google no responde o hay mala cobertura."));
        }, 15000); 

        function cleanup() {
            clearTimeout(timeout);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }

        window[callbackName] = function(data) {
            cleanup();
            if (!current()) { resolve({status: 'stale'}); return; }
            if (handleAuthFailure(data)) {
                reject(new Error(data.message || "Tu sesión ha caducado."));
                return;
            }
            setOfflineCacheEntry(action, params, data);
            if (useCache && data.status === 'success') _metadataCache.set(cacheKey, {data, savedAt: Date.now()});
            resolve(data);
        };

        const queryParams = { action, ...authParams, callback: callbackName };
        if (!useCache) queryParams._t = Date.now(); // Evitar caché del navegador
        
        const query = new URLSearchParams(queryParams).toString();
        script.src = `${API_URL}?${query}`;
        script.onerror = () => { 
            cleanup(); 
            if (!current()) { resolve({status: 'stale'}); return; }
            const cached = getOfflineCacheEntry(action, params);
            if (cached) resolve({ ...cached, offline: true });
            else reject(new Error("Error de red o bloqueo de seguridad (CORS/VPN)."));
        };
        
        document.body.appendChild(script);
    }).finally(() => {
        if (_inflight.get(cacheKey) === promise) _inflight.delete(cacheKey);
    });
    _inflight.set(cacheKey, promise);
    return promise;
}

/**
 * Motor de comunicación POST para subida de reportes y fotos
 */
async function sendPost(action, data = {}) {
    const session = getSessionData();
    const payload = JSON.stringify({ action, ...data, ...(session?.token && action !== "login" ? { token: session.token } : {}) });
    
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 30000);
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: payload, 
            signal: controller.signal,
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Obligatorio para evitar preflight
            }
        });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const result = await res.json();
        if (action !== 'login' && session?.token !== getSessionData()?.token) return {status: 'stale'};
        if (handleAuthFailure(result)) throw new Error(result.message || "Tu sesión ha caducado.");
        
        if (result.status === 'success' && action !== 'exportCustomPDF') {
            invalidateReadCache();
            try { localStorage.removeItem(OFFLINE_CACHE_KEY); } catch (error) { /* Storage can be blocked. */ }
        }
        return result;
    } catch (e) {
        console.error(`[API] fetch error:`, e);
        if (e.name === 'AbortError') throw new Error("La operación ha tardado demasiado. Revisa la conexión y vuelve a intentarlo.");
        if (e instanceof TypeError) throw new Error("Error de red o conexión bloqueada al enviar datos.");
        throw e;
    } finally {
        clearTimeout(timeout);
    }
}

function setSessionData(data) { 
    invalidateReadCache();
    try { localStorage.setItem('userSession', JSON.stringify({ ...data, expiresAt: data.expiresAt || Date.now() + (30 * 24 * 60 * 60 * 1000) })); }
    catch(e) { console.warn("LocalStorage bloqueado:", e); }
}

function getSessionData() { 
    try {
        const session = JSON.parse(localStorage.getItem('userSession'));
        if (!session?.token || (session.expiresAt && Date.now() >= session.expiresAt)) {
            localStorage.removeItem('userSession');
            return null;
        }
        return session;
    }
    catch(e) { return null; }
}

function clearSessionData() { 
    invalidateReadCache();
    try {
        localStorage.removeItem('userSession'); 
        localStorage.removeItem(OFFLINE_CACHE_KEY);
        _metadataCache.clear();
    } catch(e) {}
}

function handleAuthFailure(result) {
    if (result && (result.code === "AUTH_REQUIRED" || result.code === "SESSION_EXPIRED")) {
        clearSessionData();
        if (window.location.hash !== "#") window.location.hash = "#";
        return true;
    }
    return false;
}

const CONFIG = {
    VERSION: "48.0"
};

const api = {
    login: (user, pass) => sendPost("login", { user, pass }),
    logout: () => sendPost("logout"),
    getLoginUsers: () => sendGet("getLoginUsers"),
    getUsersList: () => sendGet("getUsersList", {}, true),
    getVacationData: (user) => sendGet("getVacationData", { user }),
    getAdminData: () => sendGet("getAdminData"),
    getDashboardStats: (params) => sendGet("getDashboardStats", params),
    getCustomPDF: (params) => sendPost("exportCustomPDF", params),
    getReportsHistory: (params) => sendGet("getReportsHistory", params),
    getCitiesList: () => sendGet("getCitiesList", {}, true),
    getFilterMetadata: () => sendGet("getFilterMetadata", {}, true),
    getMaterials: () => sendGet("getMaterials", {}, true),
    getMessages: (params) => sendGet("getMessages", params),
    getWeekly: (params) => sendGet("getWeekly", params),
    
    saveReport: (data, photos) => sendPost("saveReport", { data, photos }),
    updateReport: (req) => sendPost("updateReport", req),
    requestVacation: (req) => sendPost("requestVacation", req),
    updateRequest: (id, status) => sendPost("updateRequest", { id, status }),
    modifyExtra: (user, delta) => sendPost("modifyExtra", { user, delta }),
    modifyBase: (user, delta) => sendPost("modifyBase", { user, delta }),
    markMessageRead: (msgId) => sendPost("markMessageRead", { msgId }),
    markAllMessagesRead: (user) => sendPost("markAllMessagesRead", { user }),
    saveAssignment: (req) => sendPost("saveAssignment", req),
    adminProcessSelection: (req) => sendPost("adminProcessSelection", req),
    deleteReport: (id) => sendPost("deleteReport", { id })
};

window.setSessionData = setSessionData;
window.getSessionData = getSessionData;
window.clearSessionData = clearSessionData;
window.sendJSONP = sendGet; // Compatibilidad
window.sendPost = sendPost;
window.api = api;
