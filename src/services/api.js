const API_URL = "https://script.google.com/macros/s/AKfycbxiAc4w82GL0c1OrDjABygByFg8FfycrXaWRDAHeVln_5FpUsNB55LOMQF-yd6r2CPdDA/exec";

// Sistema de Caché de Metadatos para Optimización (V1.1)
const _metadataCache = new Map();

function sendJSONP(action, params = {}, useCache = false) {
    const cacheKey = action + JSON.stringify(params);
    if (useCache && _metadataCache.has(cacheKey)) {
        return Promise.resolve(_metadataCache.get(cacheKey));
    }

    return new Promise((resolve, reject) => {
        const callbackName = 'jsonp_' + Math.round(100000 * Math.random());
        const script = document.createElement('script');
        
        const timeout = setTimeout(() => {
            cleanup();
            reject(new Error("Timeout: El servidor de Google no responde o hay un bloqueo en tu navegador."));
        }, 15000); // Reducido a 15s para mejor UX

        function cleanup() {
            clearTimeout(timeout);
            if (script.parentNode) script.parentNode.removeChild(script);
            delete window[callbackName];
        }

        window[callbackName] = function(data) {
            cleanup();
            if (useCache) _metadataCache.set(cacheKey, data);
            resolve(data);
        };

        let fullUrl = API_URL + "?action=" + action + "&callback=" + callbackName + "&_cache=" + Date.now();
        for (let key in params) {
            let val = params[key];
            if (typeof val === 'object' && val !== null) val = JSON.stringify(val);
            fullUrl += "&" + key + "=" + encodeURIComponent(val);
        }
        
        script.src = fullUrl;
        script.onerror = () => {
            cleanup();
            reject(new Error("Error de red o bloqueo de seguridad."));
        };
        
        document.body.appendChild(script);
    });
}

async function sendPost(action, data = {}) {
    const payload = JSON.stringify({ action, ...data });
    console.log(`[API] sending POST for action: ${action}`);
    try {
        const res = await fetch(API_URL, { 
            method: 'POST', 
            body: payload, 
            mode: 'no-cors' 
        });
        
        console.log(`[API] POST sent successfully (opaque response)`);
        // Importante: Al recibir un POST exitoso, invalidamos la caché porque los datos pueden haber cambiado
        _metadataCache.clear();
        return { status: "success" };
    } catch (e) {
        console.error(`[API] fetch error, falling back to JSONP:`, e);
        return sendJSONP(action, { payload_hack: payload });
    }
}

function setSessionData(data) { 
    try {
        localStorage.setItem('userSession', JSON.stringify(data)); 
    } catch(e) { console.warn("LocalStorage bloqueado:", e); }
}

function getSessionData() { 
    try {
        return JSON.parse(localStorage.getItem('userSession')); 
    } catch(e) { return null; }
}

function clearSessionData() { 
    try {
        localStorage.removeItem('userSession'); 
        _metadataCache.clear();
    } catch(e) {}
}






