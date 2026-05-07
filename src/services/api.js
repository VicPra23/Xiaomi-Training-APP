const API_URL = "https://script.google.com/macros/s/AKfycbw_eB29hn7KK21aTnQVopa4TFwTn5NmHeU6h95VPVvXJ5EmfsshlkaGcnPehL1WBEDvbw/exec";

// Sistema de Caché de Metadatos para Optimización (V1.1)
const _metadataCache = new Map();

/**
 * Motor de comunicación GET (V6.8) - Migración total a Fetch
 */
async function sendGet(action, params = {}, useCache = false) {
    const cacheKey = action + JSON.stringify(params);
    if (useCache && _metadataCache.has(cacheKey)) {
        return _metadataCache.get(cacheKey);
    }

    const query = new URLSearchParams({ action, ...params }).toString();
    const url = `${API_URL}?${query}`;
    
    console.log(`[API] GET: ${action}`);
    try {
        const res = await fetch(url, { 
            method: 'GET',
            mode: 'cors',
            credentials: 'omit'
        });
        if (!res.ok) throw new Error(`HTTP Error: ${res.status}`);
        const result = await res.json();
        if (useCache) _metadataCache.set(cacheKey, result);
        return result;
    } catch (e) {
        console.error(`[API] GET Error:`, e);
        throw new Error("Error de red o bloqueo de seguridad (VPN/Adblock).");
    }
}

/**
 * Motor de comunicación POST (V6.8) - Sincronía honesta
 */
async function sendPost(action, data = {}) {
    const payload = JSON.stringify({ action, ...data });
    console.log(`[API] POST: ${action}`);
    
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: payload,
            headers: { 'Content-Type': 'text/plain;charset=utf-8' }
        });
        
        const result = await res.json(); 
        console.log(`[API] POST Result:`, result);
        
        _metadataCache.clear();
        return result; 
    } catch (e) {
        console.error(`[API] POST Error:`, e);
        return { status: "error", message: "Error al enviar: archivo pesado o fallo de conexión." };
    }
}

// Compatibilidad con código antiguo que usa sendJSONP
const sendJSONP = (action, params, useCache) => sendGet(action, params, useCache);

// GESTIÓN DE SESIÓN
function setSessionData(data) { 
    try { localStorage.setItem('userSession', JSON.stringify(data)); } catch(e) {}
}
function getSessionData() { 
    try { return JSON.parse(localStorage.getItem('userSession')); } catch(e) { return null; }
}
function clearSessionData() { 
    try { localStorage.removeItem('userSession'); _metadataCache.clear(); } catch(e) {}
}

// EXPOSICIÓN DE MÉTODOS
const api = {
    login: (user, pass) => sendGet("login", { user, pass }),
    getUsersList: () => sendGet("getUsersList", {}, true),
    getVacationData: (user) => sendGet("getVacationData", { user }),
    getAdminData: () => sendGet("getAdminData"),
    getDashboardStats: (params) => sendGet("getDashboardStats", params),
    getReportsHistory: (params) => sendGet("getReportsHistory", params),
    getCitiesList: () => sendGet("getCitiesList", {}, true),
    getFilterMetadata: () => sendGet("getFilterMetadata", {}, true),
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

// Hacer funciones globales para compatibilidad con main.js
window.sendJSONP = sendJSONP;
window.getSessionData = getSessionData;
window.clearSessionData = clearSessionData;
window.api = api;
