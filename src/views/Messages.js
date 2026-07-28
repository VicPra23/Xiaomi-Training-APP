function renderMessages(container) {
    let userData = getSessionData();
    let user = userData ? userData.user : 'Desconocido';

    const html = `
        <div class="fade-in">
            <header class="section-header page-heading messages-heading">
                <div style="flex: 1; min-width: 250px;">
                    <span class="page-eyebrow">Comunicaciones internas</span>
                    <h2><i data-lucide="inbox"></i>Mensajes</h2>
                    <p>Revisa avisos, tareas y novedades del equipo.</p>
                </div>
                <button id="markAllReadBtn" class="btn-secondary" style="font-size:0.8rem; height:40px; padding:0 15px; display:flex; align-items:center; gap:8px; font-weight:600; border-radius:10px; flex-shrink: 0;">
                    <i data-lucide="check-check" style="width:16px; height:16px;"></i>
                    <span>Marcar todos leídos</span>
                </button>
            </header>
            <div id="msgLogContainer" style="display:flex; flex-direction:column; gap:15px;">
                <p style="text-align:center; color:#888;">Cargando mensajes...</p>
            </div>
        </div>
    `;
    
    container.innerHTML = html;
    loadMessages();

    document.getElementById('markAllReadBtn').onclick = async () => {
        const btn = document.getElementById('markAllReadBtn');
        const originalContent = btn.innerHTML;
        btn.disabled = true;
        btn.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Marcando…</span>';
        try {
            await sendPost('markAllMessagesRead', { user: user });
            // Optimistic UI: mark everything as read in the view immediately
            document.querySelectorAll('[id^="msg-"]').forEach(el => {
                el.style.opacity = '0.7';
                el.style.borderLeftColor = '#e2e8f0';
                const badge = el.querySelector('.badge'); if(badge) badge.remove();
                const btnM = el.querySelector('button[onclick^="markAsRead"]'); if(btnM) btnM.remove();
            });
            if (window.updateNavBadge) window.updateNavBadge();
        } catch(e) {
            showToast('No se han podido marcar', 'Comprueba la conexión y vuelve a intentarlo.');
        }
        btn.innerHTML = originalContent;
        btn.disabled = false;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    async function loadMessages() {
        const log = document.getElementById('msgLogContainer'); if(!log) return;
        log.innerHTML = '<div class="message-skeleton" aria-label="Cargando mensajes"><span></span><span></span><span></span></div>';
        try {
        const res = await api.getMessages({ targetUser: user });
        const messages = res.status === 'success' && Array.isArray(res.data) ? res.data : [];
        if (messages.length > 0) {
            log.innerHTML = messages.map(m => {
                const messageText = String(m.text || '');
                const messageId = Number(m.id) || 0;
                const isRead = m.read || (m.id && localReadCache.includes(m.id.toString()));
                const urlMatch = messageText.match(/https?:\/\/[^\s]+/);
                const extUrl = urlMatch ? window.safeExternalUrl(urlMatch[0].replace(/[),.;]+$/, '')) : '';
                // Clean the URL from the text so it looks cleaner
                const cleanText = urlMatch ? messageText.replace(urlMatch[0], '').trim() : messageText;

                const normalizedText = messageText.toLowerCase();
                const isVac = normalizedText.includes('vacacio') || normalizedText.includes('extra');
                const isCal = normalizedText.includes('calendario') || normalizedText.includes('planifica');
                const isMat = normalizedText.includes('material');
                const isRep = normalizedText.includes('reporte') || normalizedText.includes('historial');
                
                let targetHash = '';
                if (isVac) targetHash = '#vacations';
                else if (isCal) targetHash = '#calendar';
                else if (isMat) targetHash = '#materials';
                else if (isRep && !extUrl) targetHash = '#dashboard';

                return `
                <article id="msg-${messageId}" class="glass-card fade-in" style="padding: 1.2rem; border-left: 6px solid ${isRead ? 'var(--border-main)' : (m.from === 'Admin' ? 'var(--xiaomi-orange)' : '#10b981')}; position:relative; opacity: ${isRead ? '0.7' : '1'};">
                    <div style="display:flex; justify-content:space-between; align-items:start;">
                        <div>
                            <h4 style="margin:0; font-size:1.1rem; color:var(--text-main); font-family:var(--font-heading);">${window.escapeHTML(m.from || 'Sistema')}</h4>
                            <small style="color:var(--text-muted); font-weight:600;">${window.escapeHTML(m.date ? new Date(m.date).toLocaleString('es-ES') : 'Sin fecha')}</small>
                        </div>
                        ${!isRead ? '<span class="badge" style="background:var(--xiaomi-orange); color:#fff; font-size:0.6rem; padding:4px 10px; border-radius:8px; font-weight:800; letter-spacing:0.05em;">NUEVO</span>' : ''}
                    </div>
                    <p style="margin:1rem 0 0 0; color:var(--text-medium); line-height:1.6; font-size: 0.95rem;">${window.escapeHTML(cleanText)}</p>
                    
                    <div style="display:flex; gap:10px; margin-top:1.2rem; flex-wrap: wrap;">
                        ${!isRead ? `<button onclick="markAsRead(${messageId})" class="btn-secondary" style="padding:6px 15px; font-size:0.8rem; margin:0; display:flex; align-items:center; gap:5px;"><i data-lucide="check" style="width:14px;"></i> Marcar leído</button>` : ''}
                        ${extUrl ? `
                            <a href="${window.escapeHTML(extUrl)}" target="_blank" rel="noopener noreferrer" onclick="markAsRead(${messageId})" class="btn-primary" style="padding:6px 15px; font-size:0.8rem; margin:0; text-decoration:none; display:flex; align-items:center; gap:5px; border-radius: 8px;"><i data-lucide="external-link" style="width:14px;"></i> Abrir Archivo</a>
                        ` : (targetHash ? `
                            <button onclick="goToSection('${targetHash}', ${messageId})" class="btn-primary" style="padding:6px 15px; font-size:0.8rem; margin:0; display:flex; align-items:center; gap:5px;"><i data-lucide="arrow-right-circle" style="width:14px;"></i> Ir a sección</button>
                        ` : '')}
                    </div>
                </article>
                `;
            }).join('');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else {
            log.innerHTML = `
                <div class="glass-card" style="text-align:center; padding:4rem 2rem; color:var(--text-muted);">
                    <i data-lucide="inbox" style="width:48px; height:48px; margin-bottom:1rem; opacity:0.2;"></i>
                    <p>Tu buzón está vacío por ahora.</p>
                </div>`;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        } catch (error) {
            log.innerHTML = `
                <div class="route-error compact" role="alert">
                    <i data-lucide="wifi-off"></i>
                    <h3>No hemos podido cargar los mensajes</h3>
                    <p>Comprueba la conexión y vuelve a intentarlo.</p>
                    <button type="button" class="btn-secondary" id="retryMessages">Reintentar</button>
                </div>`;
            document.getElementById('retryMessages')?.addEventListener('click', loadMessages);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    window.goToSection = async (hash, id) => {
        const el = document.getElementById(`msg-${id}`); if(el) el.style.display = 'none';
        localReadCache.push(id.toString()); saveCache();
        sendPost('markMessageRead', { msgId: id });
        window.location.hash = hash;
    };

    window.markAsRead = async (id) => {
        // EFECTO INMEDIATO
        const el = document.getElementById(`msg-${id}`); if(el) el.style.display = 'none';
        localReadCache.push(id.toString()); saveCache();
        if (window.updateNavBadge) window.updateNavBadge();

        const res = await sendPost('markMessageRead', { msgId: id });
        if (res.status === 'success') {
            setTimeout(() => {
                loadMessages();
                if (window.updateNavBadge) window.updateNavBadge();
            }, 600);
        }
    };
}
window.renderMessages = renderMessages;
