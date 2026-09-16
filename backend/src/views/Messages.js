function renderMessages(container) {
    const userData = getSessionData();
    const user = userData ? userData.user : 'Desconocido';
    const esc = value => window.escapeHTML ? window.escapeHTML(value) : String(value ?? '');

    container.innerHTML = `
        <section class="messages-module fade-in" aria-labelledby="messagesTitle">
            <header class="page-heading messages-heading">
                <div>
                    <span class="page-eyebrow">Comunicaciones internas</span>
                    <h2 id="messagesTitle"><i data-lucide="inbox"></i>Mensajes</h2>
                    <p>Avisos y tareas del equipo, ordenados por fecha.</p>
                </div>
                <button id="markAllReadBtn" class="btn-secondary messages-mark-all" type="button">
                    <i data-lucide="check-check"></i><span>Marcar todo como leído</span>
                </button>
            </header>
            <div class="messages-workspace">
                <div class="messages-toolbar" aria-label="Filtros de mensajes">
                    <span><i data-lucide="list-filter"></i> Bandeja de entrada</span>
                    <span id="messageCount" class="messages-count">—</span>
                </div>
                <div id="msgLogContainer" class="messages-list" aria-live="polite">
                    <div class="message-skeleton" aria-label="Cargando mensajes"><span></span><span></span><span></span></div>
                </div>
            </div>
        </section>`;

    const markAllButton = container.querySelector('#markAllReadBtn');
    markAllButton.addEventListener('click', async () => {
        const originalContent = markAllButton.innerHTML;
        markAllButton.disabled = true;
        markAllButton.innerHTML = '<span class="button-spinner" aria-hidden="true"></span><span>Marcando…</span>';
        container.querySelectorAll('.message-row').forEach(row => row.classList.add('is-read'));
        try {
            await sendPost('markAllMessagesRead', { user });
            if (window.updateNavBadge) window.updateNavBadge();
            await loadMessages();
        } catch (error) {
            showToast('No se han podido marcar', 'Comprueba la conexión y vuelve a intentarlo.');
        } finally {
            markAllButton.innerHTML = originalContent;
            markAllButton.disabled = false;
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    });

    async function loadMessages() {
        const log = container.querySelector('#msgLogContainer');
        if (!log) return;
        try {
            const res = await api.getMessages({ targetUser: user });
            const messages = res.status === 'success' && Array.isArray(res.data) ? res.data : [];
            container.querySelector('#messageCount').textContent = `${messages.length} ${messages.length === 1 ? 'mensaje' : 'mensajes'}`;
            if (!messages.length) {
                log.innerHTML = `
                    <div class="workspace-empty">
                        <span class="workspace-empty-icon"><i data-lucide="inbox"></i></span>
                        <h3>Todo al día</h3>
                        <p>Los nuevos avisos y tareas del equipo aparecerán aquí.</p>
                    </div>`;
                if (typeof lucide !== 'undefined') lucide.createIcons();
                return;
            }

            log.innerHTML = messages.map(message => renderMessage(message)).join('');
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } catch (error) {
            log.innerHTML = `
                <div class="route-error compact" role="alert">
                    <i data-lucide="wifi-off"></i>
                    <h3>No hemos podido cargar los mensajes</h3>
                    <p>Comprueba la conexión y vuelve a intentarlo.</p>
                    <button type="button" class="btn-secondary" id="retryMessages">Reintentar</button>
                </div>`;
            container.querySelector('#retryMessages')?.addEventListener('click', loadMessages);
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
    }

    function renderMessage(message) {
        const messageText = String(message.text || '');
        const messageId = Number(message.id) || 0;
        const isRead = message.read || (message.id && localReadCache.includes(message.id.toString()));
        const urlMatch = messageText.match(/https?:\/\/[^\s]+/);
        const extUrl = urlMatch ? window.safeExternalUrl(urlMatch[0].replace(/[),.;]+$/, '')) : '';
        const cleanText = urlMatch ? messageText.replace(urlMatch[0], '').trim() : messageText;
        const targetHash = inferTarget(messageText, extUrl);
        const date = message.date ? new Date(message.date) : null;
        const formattedDate = date && !Number.isNaN(date.getTime())
            ? new Intl.DateTimeFormat('es-ES', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }).format(date)
            : 'Sin fecha';

        return `
            <article id="msg-${messageId}" class="message-row ${isRead ? 'is-read' : 'is-unread'}">
                <span class="message-state" aria-hidden="true"></span>
                <div class="message-meta">
                    <strong>${esc(message.from || 'Sistema')}</strong>
                    <time>${esc(formattedDate)}</time>
                </div>
                <div class="message-content">
                    <p>${esc(cleanText)}</p>
                    <div class="message-actions">
                        ${!isRead ? `<button type="button" onclick="markAsRead(${messageId})" class="message-action-secondary"><i data-lucide="check"></i>Marcar leído</button>` : ''}
                        ${extUrl ? `
                            <a href="${esc(extUrl)}" target="_blank" rel="noopener noreferrer" onclick="markAsRead(${messageId})" class="message-action-primary"><span>Abrir archivo</span><i data-lucide="arrow-up-right"></i></a>
                        ` : (targetHash ? `
                            <button type="button" onclick="goToSection('${targetHash}', ${messageId})" class="message-action-primary"><span>Ir a la sección</span><i data-lucide="arrow-right"></i></button>
                        ` : '')}
                    </div>
                </div>
                ${!isRead ? '<span class="message-new-label">Nuevo</span>' : ''}
            </article>`;
    }

    function inferTarget(text, extUrl) {
        const normalized = text.toLowerCase();
        if (normalized.includes('vacacio') || normalized.includes('extra')) return '#vacations';
        if (normalized.includes('calendario') || normalized.includes('planifica')) return '#calendar';
        if (normalized.includes('material')) return '#materials';
        if (!extUrl && (normalized.includes('reporte') || normalized.includes('historial'))) return '#dashboard';
        return '';
    }

    window.goToSection = async (hash, id) => {
        markLocally(id);
        sendPost('markMessageRead', { msgId: id }).catch(() => {});
        window.location.hash = hash;
    };

    window.markAsRead = async id => {
        const row = container.querySelector(`#msg-${id}`);
        row?.classList.remove('is-unread');
        row?.classList.add('is-read');
        row?.querySelector('.message-new-label')?.remove();
        row?.querySelector('.message-action-secondary')?.remove();
        markLocally(id);
        if (window.updateNavBadge) window.updateNavBadge();
        try {
            const res = await sendPost('markMessageRead', { msgId: id });
            if (res.status === 'success') window.setTimeout(loadMessages, 260);
        } catch (error) {
            showToast('No se pudo actualizar', 'El mensaje se marcará cuando vuelva la conexión.');
        }
    };

    function markLocally(id) {
        const value = id.toString();
        if (!localReadCache.includes(value)) localReadCache.push(value);
        saveCache();
    }

    loadMessages();
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

window.renderMessages = renderMessages;
