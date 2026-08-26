const API_URL = "https://script.google.com/macros/s/AKfycbynHF2Agf9I3_TTd_ruEN5gEUjod7mD944kddLm7v-bPol3Dqu-2ff1OOSQi3OVt2YqaA/exec";

// Sistema de Caché de Metadatos para Optimización (V1.1)
const _metadataCache = new Map();
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
    const session = getSessionData();
    const authParams = session?.token ? { ...params, token: session.token } : params;
    const cacheKey = action + JSON.stringify(authParams);
    if (useCache && _metadataCache.has(cacheKey)) {
        return Promise.resolve(_metadataCache.get(cacheKey));
    }

    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.round(100000 * Math.random());
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            cleanup();
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
            handleAuthFailure(data);
            setOfflineCacheEntry(action, params, data);
            if (useCache) _metadataCache.set(cacheKey, data);
            resolve(data);
        };

        const queryParams = { action, ...authParams, callback: callbackName };
        if (!useCache) queryParams._t = Date.now(); // Evitar caché del navegador
        
        const query = new URLSearchParams(queryParams).toString();
        script.src = `${API_URL}?${query}`;
        script.onerror = () => { 
            cleanup(); 
            const cached = getOfflineCacheEntry(action, params);
            if (cached) resolve({ ...cached, offline: true });
            else reject(new Error("Error de red o bloqueo de seguridad (CORS/VPN)."));
        };
        
        document.body.appendChild(script);
    });
}

/**
 * Motor de comunicación POST para subida de reportes y fotos
 */
async function sendPost(action, data = {}) {
    const session = getSessionData();
    const payload = JSON.stringify({ action, ...data, ...(session?.token && action !== "login" ? { token: session.token } : {}) });
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: payload, 
            headers: {
                'Content-Type': 'text/plain;charset=utf-8' // Obligatorio para evitar preflight
            }
        });
        
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const result = await res.json();
        handleAuthFailure(result);
        
        _metadataCache.clear(); // Limpiamos caché porque hubo cambios
        return result;
    } catch (e) {
        console.error(`[API] fetch error:`, e);
        throw new Error("Error de red o conexión bloqueada al enviar datos.");
    }
}

function setSessionData(data) { 
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
    }
}

const CONFIG = {
    VERSION: "46.0"
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
