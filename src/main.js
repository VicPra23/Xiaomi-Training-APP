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
const navbar = document.getElementById('navbar');
const navLinks = document.getElementById('navLinks');
let lastSeenMsgId = 0;
let pollerInterval = null;

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

function navigateRouter() {
    let hash = window.location.hash || '#';
    if (hash !== '#report' && window._reportBeforeUnload) {
        window.removeEventListener('beforeunload', window._reportBeforeUnload);
        window._reportBeforeUnload = null;
    }
    let user = getUser();
    if (!user && hash !== '#') { window.location.hash = '#'; return; }
    if (user && hash === '#') { window.location.hash = '#dashboard'; return; }

    navbar.style.display = user ? 'block' : 'none';
    document.querySelectorAll('.nav-link[href^="#"]').forEach(link => {
        const active = link.getAttribute('href') === hash;
        link.classList.toggle('is-current', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
    });
    if (user) {
        document.body.classList.toggle('is-admin', user.role === 'Admin');
        updateNavBadge();
        if(!hasShownNews) {
            hasShownNews = true;
            api.getMessages({ targetUser: user.user }).then(res => {
                if(res.status === 'success') {
                    const unread = res.data.filter(m => !m.read && m.id && !localReadCache.includes(m.id.toString())).length;
                    if(unread > 0) {
                        const label = unread === 1 ? "tienes 1 mensaje pendiente" : `tienes ${unread} mensajes pendientes`;
                        showToast("¡Tienes novedades!", `Hola ${user.name}, ${label} en tu buzón.`, "#mensajes");
                    }
                }
            });
        }
    }

    try {
        console.log("Navigating to:", hash);
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
        renderDashboard(app);
    }
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
    if (res.status === 'success') {
        // Filtramos por leído en el servidor O en nuestra caché local
        const unread = res.data.filter(m => !m.read && m.id && !localReadCache.includes(m.id.toString())).length;
        const msgLink = document.querySelector('a[href="#mensajes"]');
        if (msgLink) {
            msgLink.style.position = 'relative';
            let b = msgLink.querySelector('.msg-badge');
            if (unread > 0) {
                if (!b) { b = document.createElement('span'); b.className = 'msg-badge'; msgLink.appendChild(b); }
                b.innerText = unread;
            } else if (b) { b.remove(); }
        }
        if (res.data.length > 0) {
            const latest = res.data[0];
            if (latest.id && latest.id > lastSeenMsgId && lastSeenMsgId !== 0) {
                if (!latest.read && !localReadCache.includes(latest.id.toString())) showToast(`Mensaje de ${latest.from}`, latest.text, '#mensajes');
            }
            lastSeenMsgId = latest.id || lastSeenMsgId;
        }
    }
}

function showToast(title, msg, targetHash) {
    const container = document.getElementById('toast-container');
    const t = document.createElement('div');
    t.className = 'toast';
    t.setAttribute('role', 'status');
    const toastTitle = document.createElement('div');
    toastTitle.className = 'toast-title';
    toastTitle.textContent = String(title || '');
    const toastBody = document.createElement('div');
    toastBody.className = 'toast-body';
    toastBody.textContent = String(msg || '');
    t.append(toastTitle, toastBody);
    if (targetHash) {
        const hint = document.createElement('div');
        hint.className = 'toast-hint';
        hint.textContent = 'Pulsa para ver';
        t.appendChild(hint);
        t.tabIndex = 0;
        t.onclick = () => { t.classList.add('out'); setTimeout(()=>t.remove(), 300); window.location.hash = targetHash; };
        t.onkeydown = event => { if (event.key === 'Enter' || event.key === ' ') t.click(); };
    }
    container.appendChild(t);
    setTimeout(() => { if(t.parentElement) { t.classList.add('out'); setTimeout(()=>t.remove(), 300); } }, 2000);
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

window.onload = initApp;
window.navigate = (h) => { window.location.hash = h; };
window.showToast = showToast;
