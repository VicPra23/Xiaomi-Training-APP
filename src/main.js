const getUser = () => getSessionData();
const clearSession = () => clearSessionData();
const navigate = (h) => { window.location.hash = h; };
window.escapeHTML = value => String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
}[char]));
window.safeExternalUrl = value => {
    try {
        const url = new URL(String(value || ''), window.location.origin);
        return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
    } catch (error) {
        return '';
    }
};

const app = document.getElementById('app');
const mainContent = document.getElementById('mainContent');
const navbar = document.getElementById('navbar');
const navLinks = document.getElementById('navLinks');
let lastSeenMsgId = 0;
let pollerInterval = null;
const externalAssetPromises = new Map();

window.loadScriptOnce = (src, globalName) => {
    if (globalName && window[globalName]) return Promise.resolve(window[globalName]);
    if (externalAssetPromises.has(src)) return externalAssetPromises.get(src);
    const promise = new Promise((resolve, reject) => {
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.crossOrigin = 'anonymous';
        script.onload = () => resolve(globalName ? window[globalName] : true);
        script.onerror = () => reject(new Error(`No se pudo cargar el recurso ${src}`));
        document.head.appendChild(script);
    }).catch(error => {
        externalAssetPromises.delete(src);
        throw error;
    });
    externalAssetPromises.set(src, promise);
    return promise;
};

window.loadStyleOnce = href => {
    if (document.querySelector(`link[rel="stylesheet"][href="${href}"]`)) return Promise.resolve(true);
    if (externalAssetPromises.has(href)) return externalAssetPromises.get(href);
    const promise = new Promise((resolve, reject) => {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = href;
        link.onload = () => resolve(true);
        link.onerror = () => reject(new Error(`No se pudo cargar el recurso ${href}`));
        document.head.appendChild(link);
    }).catch(error => {
        externalAssetPromises.delete(href);
        throw error;
    });
    externalAssetPromises.set(href, promise);
    return promise;
};

const routeViews = {
    '#dashboard': { src: 'src/views/Dashboard.js?v=46.7', global: 'renderDashboard', needsTomSelect: true },
    '#report': { src: 'src/views/ReportForm.js?v=46.7', global: 'renderReport', needsTomSelect: true },
    '#calendar': { src: 'src/views/Calendar.js?v=46.7', global: 'renderCalendar', needsTomSelect: true },
    '#vacations': { src: 'src/views/Vacations.js?v=46.7', global: 'renderVacations' },
    '#materials': { src: 'src/views/Materials.js?v=46.7', global: 'renderMaterials' },
    '#mensajes': { src: 'src/views/Messages.js?v=46.7', global: 'renderMessages' }
};

async function ensureRouteView(hash) {
    const view = routeViews[hash];
    if (!view || window[view.global]) return;
    const dependencies = [];
    if (view.needsTomSelect) {
        dependencies.push(window.loadStyleOnce('https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/css/tom-select.css'));
        dependencies.push(window.loadScriptOnce('https://cdn.jsdelivr.net/npm/tom-select@2.2.2/dist/js/tom-select.complete.min.js', 'TomSelect'));
    }
    await Promise.all(dependencies);
    await window.loadScriptOnce(view.src, view.global);
}

// GESTIÓN DE TEMAS (V1.0)
const getTheme = () => localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
const setTheme = (t) => {
    document.documentElement.setAttribute('data-theme', t);
    localStorage.setItem('theme', t);
    if (typeof lucide !== 'undefined') lucide.createIcons();
};
window.toggleTheme = () => {
    const next = getTheme() === 'light' ? 'dark' : 'light';
    setTheme(next);
};

function initApp() {
    setTheme(getTheme());
    installConnectivityStatus();
    
    window.addEventListener('hashchange', navigateRouter);
    document.getElementById('logoutBtn').addEventListener('click', (e) => {
        e.preventDefault();
        api.logout().catch(() => {});
        stopPoller();
        clearSession();
        window.location.hash = '';
        navigateRouter();
    });

    // Resetear datos de edición al navegar manualmente por el menú & Mobile Toggle
    navbar.addEventListener('click', (e) => {
        const link = e.target.closest('a');
        const toggle = e.target.closest('#menuToggle');
        const navOverlay = document.getElementById('navOverlay');

        if (toggle && navLinks) {
            navLinks.classList.toggle('active');
            if (navOverlay) navOverlay.classList.toggle('active');
            toggle.setAttribute('aria-expanded', navLinks.classList.contains('active') ? 'true' : 'false');
            
            const icon = toggle.querySelector('i');
            if (icon && typeof lucide !== 'undefined') {
                const isOpen = navLinks.classList.contains('active');
                icon.setAttribute('data-lucide', isOpen ? 'x' : 'menu');
                lucide.createIcons();
            }
        }

        if (link) {
            // Resetear datos de edición si se hace clic en el link de Reporte directamente
            if (link.getAttribute('href') === '#report') {
                window.reportEditData = null;
            }
            // Close mobile menu on click
            if (navLinks) navLinks.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            document.getElementById('menuToggle')?.setAttribute('aria-expanded', 'false');
            
            const toggleIcon = document.querySelector('#menuToggle i');
            if (toggleIcon && typeof lucide !== 'undefined') {
                toggleIcon.setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            }

            if (link.getAttribute('href') === '#report') {
                window.reportEditData = null;
                if (window.location.hash === '#report') navigateRouter();
            }
        }
    });

    // Close menu when clicking backdrop or outside
    document.addEventListener('click', (e) => {
        const navLinks = document.getElementById('navLinks');
        const toggle = document.getElementById('menuToggle');
        const navOverlay = document.getElementById('navOverlay');
        
        const isClickOutside = navLinks && navLinks.classList.contains('active') && !navLinks.contains(e.target) && toggle && !toggle.contains(e.target);
        const isClickOverlay = e.target === navOverlay;

        if (isClickOutside || isClickOverlay) {
            if (navLinks) navLinks.classList.remove('active');
            if (navOverlay) navOverlay.classList.remove('active');
            toggle?.setAttribute('aria-expanded', 'false');
            
            const toggleIcon = toggle.querySelector('i');
            if (toggleIcon && typeof lucide !== 'undefined') {
                toggleIcon.setAttribute('data-lucide', 'menu');
                lucide.createIcons();
            }
        }
    });
    document.addEventListener('keydown', event => {
        if (event.key !== 'Escape' || !navLinks?.classList.contains('active')) return;
        navLinks.classList.remove('active');
        document.getElementById('navOverlay')?.classList.remove('active');
        const toggle = document.getElementById('menuToggle');
        toggle?.setAttribute('aria-expanded', 'false');
        toggle?.focus();
    });
    
    if (!document.getElementById('toast-container')) {
        const tc = document.createElement('div');
        tc.id = 'toast-container';
        document.body.appendChild(tc);
    }

    navigateRouter();
    startPoller();
}

function installConnectivityStatus() {
    let banner = document.getElementById('connectivityStatus');
    if (!banner) {
        banner = document.createElement('div');
        banner.id = 'connectivityStatus';
        banner.className = 'connectivity-status';
        banner.setAttribute('role', 'status');
        document.body.appendChild(banner);
    }
    const update = () => {
        const offline = !navigator.onLine;
        banner.classList.toggle('is-visible', offline);
        banner.textContent = offline ? 'Sin conexión · mostrando la última información disponible' : '';
    };
    window.addEventListener('online', update);
    window.addEventListener('offline', update);
    update();
}

let hasShownNews = false;

let navigationSequence = 0;
async function navigateRouter() {
    const sequence = ++navigationSequence;
    let hash = window.location.hash || '#';
    document.getElementById('appStatusRegion')?.replaceChildren();
    const routeTitles = {
        '#': 'Acceso',
        '#dashboard': 'Resumen',
        '#report': 'Reporte',
        '#calendar': 'Calendario',
        '#vacations': 'Vacaciones',
        '#materials': 'Materiales',
        '#mensajes': 'Mensajes'
    };
    if (hash !== '#report' && window._reportBeforeUnload) {
        window.removeEventListener('beforeunload', window._reportBeforeUnload);
        window._reportBeforeUnload = null;
    }
    let user = getUser();
    if (!user && hash !== '#') { window.location.hash = '#'; return; }
    if (user && hash === '#') { window.location.hash = '#dashboard'; return; }

    navbar.style.display = user ? 'block' : 'none';
    if (hash !== '#dashboard') {
        window.destroyDashboardCharts?.();
        if (window._dashResizeHandler) {
            window.removeEventListener('resize', window._dashResizeHandler);
            window._dashResizeHandler = null;
        }
    }
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
        const active = link.getAttribute('href') === hash;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    if (user) {
        document.body.classList.toggle('is-admin', user.role === 'Admin');
        const displayName = String(user.name || user.user || 'Equipo');
        const initials = displayName.split(/\s+/).filter(Boolean).slice(0, 2).map(part => part[0]).join('').toUpperCase();
        const navUserName = document.getElementById('navUserName');
        const navUserRole = document.getElementById('navUserRole');
        const navUserAvatar = document.getElementById('navUserAvatar');
        if (navUserName) navUserName.textContent = displayName;
        if (navUserRole) navUserRole.textContent = user.role === 'Admin' ? 'Administración' : (user.sede || 'Trainer');
        if (navUserAvatar) navUserAvatar.textContent = initials || 'XT';
        updateNavBadge().catch(() => {});
        if(!hasShownNews) {
            hasShownNews = true;
            api.getMessages({ targetUser: user.user }).then(res => {
                if(res.status === 'success' && Array.isArray(res.data)) {
                    const unread = res.data.filter(m => !m.read && m.id && !localReadCache.includes(m.id.toString())).length;
                    if(unread > 0) {
                        const label = unread === 1 ? "tienes 1 mensaje pendiente" : `tienes ${unread} mensajes pendientes`;
                        showToast("¡Tienes novedades!", `Hola ${user.name}, ${label} en tu buzón.`, "#mensajes");
                    }
                }
            }).catch(() => {});
        }
    }

    try {
        if (routeViews[hash] && !window[routeViews[hash].global]) {
            app.innerHTML = '<div class="route-loader" role="status"><span class="button-spinner" aria-hidden="true"></span><span>Abriendo vista…</span></div>';
            await ensureRouteView(hash);
            if (sequence !== navigationSequence || window.location.hash !== hash) return;
        }
        switch (hash) {
            case '#': renderLogin(app); break;
            case '#dashboard': renderDashboard(app); break;
            case '#report': renderReport(app, window.reportEditData); break;
            case '#calendar': renderCalendar(app); break;
            case '#vacations': renderVacations(app); break;
            case '#materials': 
                if (typeof renderMaterials === 'function') renderMaterials(app); 
                else { console.error("renderMaterials not found!"); renderDashboard(app); }
                break;
            case '#mensajes': renderMessages(app); break;
            default: renderLogin(app);
        }
    } catch (e) {
        console.error("Router Error:", e);
        app.innerHTML = `
            <section class="route-error" role="alert">
                <i data-lucide="triangle-alert"></i>
                <span>La vista no ha podido abrirse</span>
                <h1>Vamos a recuperarla.</h1>
                <p>Vuelve al resumen y reintenta la operación. Tus datos guardados no se han modificado.</p>
                <button type="button" class="btn-primary" id="routeRecovery">Volver al resumen</button>
            </section>`;
        document.getElementById('routeRecovery')?.addEventListener('click', () => navigate('#dashboard'));
    }
    document.title = `${routeTitles[hash] || 'Xiaomi Trainer'} · Xiaomi Trainer`;
    app.classList.remove('route-entering');
    window.requestAnimationFrame(() => app.classList.add('route-entering'));
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

    // Renderizado de iconos Lucide tras cada navegación
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

// CACHE LOCAL PARA EVITAR EFECTO "REBOTE" EN MENSAJES
let localReadCache = [];
try {
    const storedReadCache = JSON.parse(localStorage.getItem('readCache') || "[]");
    localReadCache = Array.isArray(storedReadCache) ? storedReadCache : [];
} catch (error) {
    localStorage.removeItem('readCache');
}
const saveCache = () => localStorage.setItem('readCache', JSON.stringify(localReadCache));

async function updateNavBadge() {
    const userData = getSessionData();
    if (!userData) return;
    const res = await api.getMessages({ targetUser: userData.user });
    if (res.status === 'success' && Array.isArray(res.data)) {
        // Filtramos por leído en el servidor O en nuestra caché local
        const unread = res.data.filter(m => !m.read && m.id && !localReadCache.includes(m.id.toString())).length;
        const msgLinks = document.querySelectorAll('a[href="#mensajes"]');
        msgLinks.forEach(msgLink => {
            let b = msgLink.querySelector('.msg-badge');
            if (unread > 0) {
                if (!b) { b = document.createElement('span'); b.className = 'msg-badge'; msgLink.appendChild(b); }
                b.innerText = unread;
            } else if (b) { b.remove(); }
        });
        if (res.data.length > 0) {
            const latest = res.data[0];
            if (latest.id && latest.id > lastSeenMsgId && lastSeenMsgId !== 0) {
                if (!latest.read && !localReadCache.includes(latest.id.toString())) showToast(`Mensaje de ${latest.from}`, latest.text, '#mensajes');
            }
            lastSeenMsgId = latest.id || lastSeenMsgId;
        }
    }
}

const toastQueue = [];
const activeToastKeys = new Set();
let toastIsVisible = false;

function showInlineStatus(title, msg, targetHash) {
    const region = document.getElementById('appStatusRegion');
    if (!region) return;
    const key = `${title}|${msg}`;
    if (region.querySelector(`[data-status-key="${CSS.escape(key)}"]`)) return;
    const status = document.createElement('section');
    status.className = 'app-status-banner';
    status.dataset.statusKey = key;
    status.setAttribute('role', 'alert');
    const icon = document.createElement('i');
    icon.setAttribute('data-lucide', 'circle-alert');
    const copy = document.createElement('div');
    const heading = document.createElement('strong');
    heading.textContent = String(title || 'Aviso');
    const body = document.createElement('span');
    body.textContent = String(msg || '');
    copy.append(heading, body);
    const actions = document.createElement('div');
    actions.className = 'app-status-actions';
    if (targetHash && targetHash !== window.location.hash) {
        const link = document.createElement('a');
        link.href = targetHash;
        link.className = 'app-status-link';
        link.textContent = 'Abrir';
        actions.appendChild(link);
    }
    const close = document.createElement('button');
    close.type = 'button';
    close.className = 'app-status-close';
    close.setAttribute('aria-label', 'Cerrar aviso');
    close.innerHTML = '<i data-lucide="x"></i>';
    close.addEventListener('click', () => status.remove());
    actions.appendChild(close);
    status.append(icon, copy, actions);
    region.replaceChildren(status);
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function displayNextToast() {
    if (toastIsVisible || toastQueue.length === 0) return;
    const container = document.getElementById('toast-container');
    if (!container) return;
    const item = toastQueue.shift();
    toastIsVisible = true;
    const t = document.createElement(item.targetHash ? 'button' : 'div');
    if (t.tagName === 'BUTTON') t.type = 'button';
    t.className = 'toast';
    t.setAttribute('role', 'status');
    const toastTitle = document.createElement('div');
    toastTitle.className = 'toast-title';
    toastTitle.textContent = item.title;
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = item.msg;
    t.append(toastTitle, toastBody);
    if (item.targetHash) {
        const hint = document.createElement('div');
        hint.className = 'toast-hint';
        hint.textContent = 'Abrir';
        t.appendChild(hint);
        t.onclick = () => {
            dismiss();
            window.location.hash = item.targetHash;
        };
    }
    container.replaceChildren(t);
    let closed = false;
    const dismiss = () => {
        if (closed) return;
        closed = true;
        t.classList.add('out');
        window.setTimeout(() => {
            t.remove();
            activeToastKeys.delete(item.key);
            toastIsVisible = false;
            displayNextToast();
        }, 180);
    };
    window.setTimeout(dismiss, 3800);
}

function showToast(title, msg, targetHash) {
    const safeTitle = String(title || '');
    const safeMessage = String(msg || '');
    const key = `${safeTitle}|${safeMessage}`;
    const isPersistent = /error|backend|conexión|sincronizar|no se pudo/i.test(`${safeTitle} ${safeMessage}`);
    if (isPersistent) {
        showInlineStatus(safeTitle, safeMessage, targetHash);
        return;
    }
    if (activeToastKeys.has(key)) return;
    activeToastKeys.add(key);
    toastQueue.push({ title: safeTitle, msg: safeMessage, targetHash, key });
    displayNextToast();
}

function startPoller() {
    if (pollerInterval) clearInterval(pollerInterval);
    if (getUser() && navigator.onLine && !document.hidden) {
        updateNavBadge().catch(() => {});
        pollerInterval = setInterval(() => updateNavBadge().catch(() => {}), 60000);
    }
}
function stopPoller() { if (pollerInterval) clearInterval(pollerInterval); pollerInterval = null; }
document.addEventListener('visibilitychange', () => document.hidden ? stopPoller() : startPoller());
window.addEventListener('online', startPoller);
window.addEventListener('offline', stopPoller);

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initApp, { once: true });
else initApp();
window.navigate = (h) => { window.location.hash = h; };
window.showToast = showToast;
