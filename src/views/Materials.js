function renderMaterials(container) {
    const session = getSessionData();
    let categories = [];
    let isLoading = true;
    let apiError = false;

    let activeCatId = 'smartphones';
    let searchQuery = '';
    const esc = value => window.escapeHTML ? window.escapeHTML(value) : String(value ?? '');

    function renderContent(cat, isGlobalSearch = false) {
        const query = searchQuery.trim().toLocaleLowerCase('es');
        const groups = (cat.subcategories || []).map(sub => ({
            ...sub,
            items: (sub.items || []).filter(item => !query || `${sub.name} ${item.name}`.toLocaleLowerCase('es').includes(query))
        })).filter(sub => sub.items.length || !query);

        return `
            <div class="mat-tab-content-panel">
                ${groups.length ? groups.map(sub => `
                    <section class="material-group">
                        <header class="material-group-heading">
                            <h3>${esc(sub.name)}</h3>
                            <span>${sub.items.length} ${sub.items.length === 1 ? 'recurso' : 'recursos'}</span>
                        </header>
                        <div class="mat-list">
                            ${sub.items.length > 0 ? sub.items.map(item => `
                                <a href="${esc(window.safeExternalUrl(item.link))}" target="_blank" rel="noopener noreferrer" class="mat-link">
                                    <span class="mat-link-icon"><i data-lucide="file-text"></i></span>
                                    <span class="mat-link-copy">
                                        <strong>${esc(item.name)}</strong>
                                        <small>Google Drive · Material de formación</small>
                                    </span>
                                    ${item.isNew ? '<span class="badge-new">Nuevo</span>' : ''}
                                    <i data-lucide="arrow-up-right" class="mat-link-arrow"></i>
                                </a>
                            `).join('') : '<p class="materials-soon">Próximamente</p>'}
                        </div>
                    </section>
                `).join('') : `
                    <div class="workspace-empty">
                        <span class="workspace-empty-icon"><i data-lucide="${query ? 'search-x' : 'folder-open'}"></i></span>
                        <h3>${query ? 'Sin coincidencias' : 'Aún no hay materiales'}</h3>
                        <p>${query ? 'Prueba con otro producto o categoría.' : 'Los nuevos recursos aparecerán aquí.'}</p>
                    </div>
                `}
            </div>
        `;
    }

    function updateView() {
        const cat = categories.find(c => c.id === activeCatId);
        
        const existingModule = container.querySelector('.materials-module');
        if (existingModule) {
            container.querySelectorAll('.mat-tab-btn').forEach(btn => {
                if (btn.dataset.id === activeCatId) btn.classList.add('active');
                else btn.classList.remove('active');
                btn.setAttribute('aria-selected', btn.dataset.id === activeCatId ? 'true' : 'false');
                btn.tabIndex = btn.dataset.id === activeCatId ? 0 : -1;
            });
            const contentContainer = container.querySelector('#mat-tab-content-container');
            if (contentContainer) {
                contentContainer.innerHTML = renderContent(cat);
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
            return;
        }

        const html = `
            <div class="materials-module fade-in">
                <header class="section-header page-heading materials-heading">
                    <div>
                        <span class="page-eyebrow">Recursos de formación</span>
                        <h2><i data-lucide="library"></i>Materiales</h2>
                        <p>Presentaciones, guías y recursos por categoría de producto.</p>
                    </div>
                    <div class="materials-heading-actions">
                        ${(session && session.role === 'Admin') ? `
                            <button id="btnNotifyMaterials" class="btn-secondary"><i data-lucide="send"></i> Notificar novedades</button>
                        ` : ''}
                    </div>
                </header>

                <div class="materials-utility-bar">
                    <label class="materials-search">
                        <i data-lucide="search"></i>
                        <input id="materialsSearch" type="search" placeholder="Buscar producto o material" autocomplete="off">
                        <span class="sr-only">Buscar materiales</span>
                    </label>
                    <div class="social-access-bar" aria-label="Canales de Xiaomi Training">
                    <a href="https://www.tiktok.com/@xiaomitrainingvideos" target="_blank" rel="noopener noreferrer" class="social-access-link">
                        <img src="https://cdn.simpleicons.org/tiktok/000000" alt="">
                        <span><strong>TikTok</strong><small>@xiaomitrainingvideos</small></span>
                        <i data-lucide="arrow-up-right"></i>
                    </a>
                    <a href="https://www.youtube.com/@xiaomitrainingvideos" target="_blank" rel="noopener noreferrer" class="social-access-link">
                        <img src="https://cdn.simpleicons.org/youtube/ff0000" alt="">
                        <span><strong>YouTube</strong><small>@xiaomitrainingvideos</small></span>
                        <i data-lucide="arrow-up-right"></i>
                    </a>
                    </div>
                </div>

                <div class="mat-tabs-header" role="tablist" aria-label="Categorías de materiales">
                    ${categories.map(c => {
                        const hasNew = c.subcategories && c.subcategories.some(sub => sub.items && sub.items.some(item => item.isNew));
                        return `
                        <button type="button" role="tab" aria-selected="${c.id === activeCatId ? 'true' : 'false'}" class="mat-tab-btn ${c.id === activeCatId ? 'active' : ''}" data-id="${esc(c.id)}">
                            ${hasNew ? '<span class="badge-new">Nuevo</span>' : ''}
                            <i data-lucide="${c.icon}"></i>
                            <span>${esc(c.title)}</span>
                        </button>
                        `;
                    }).join('')}
                </div>

                <div id="mat-tab-content-container">
                    ${renderContent(cat)}
                </div>
            </div>
        `;
        container.innerHTML = html;
        if (typeof lucide !== 'undefined') lucide.createIcons();

        const searchInput = container.querySelector('#materialsSearch');
        if (searchInput) {
            searchInput.value = searchQuery;
            searchInput.addEventListener('input', event => {
                searchQuery = event.target.value;
                const contentContainer = container.querySelector('#mat-tab-content-container');
                if (contentContainer) {
                      if (searchQuery.trim()) {
                          const allHtml = categories.map(c => renderContent(c, true)).filter(html => html.includes('<section class="material-group"')).join('');
                          contentContainer.innerHTML = allHtml || `<div class="glass-card" style="text-align: center; padding: 5rem 2rem;"><p style="color: var(--text-medium); font-size: 1.1rem;">No hay resultados en ninguna categoría.</p></div>`;
                      } else {
                          contentContainer.innerHTML = renderContent(categories.find(c => c.id === activeCatId));
                      }
                  }
                if (typeof lucide !== 'undefined') lucide.createIcons();
            });
        }

        const materialTabs = Array.from(container.querySelectorAll('.mat-tab-btn'));
        materialTabs.forEach((btn, index) => {
            btn.tabIndex = btn.dataset.id === activeCatId ? 0 : -1;
            btn.onclick = () => {
                activeCatId = btn.dataset.id;
                updateView();
            };
            btn.onkeydown = event => {
                if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
                event.preventDefault();
                let nextIndex = index;
                if (event.key === 'ArrowLeft') nextIndex = (index - 1 + materialTabs.length) % materialTabs.length;
                if (event.key === 'ArrowRight') nextIndex = (index + 1) % materialTabs.length;
                if (event.key === 'Home') nextIndex = 0;
                if (event.key === 'End') nextIndex = materialTabs.length - 1;
                materialTabs[nextIndex].click();
                container.querySelector(`.mat-tab-btn[data-id="${materialTabs[nextIndex].dataset.id}"]`)?.focus();
            };
        });

        const btnNotify = container.querySelector('#btnNotifyMaterials');
        if (btnNotify) {
            btnNotify.onclick = async () => {
                btnNotify.disabled = true;
                const oldHtml = btnNotify.innerHTML;
                btnNotify.innerText = "Enviando...";
                await sendPost('adminProcessSelection', { opAction: 'notify_materials' });
                btnNotify.innerText = "¡Notificado!";
                setTimeout(() => { 
                    btnNotify.disabled = false; 
                    btnNotify.innerHTML = oldHtml; 
                }, 3000);
            };
        }
    }

    updateView();
    api.getMaterials().then(res => {
        if (!container.isConnected || window.location.hash !== '#materials') return;
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
            categories = res.data;
            activeCatId = categories[0].id;
            container.innerHTML = '';
            updateView();
        }
    }).catch(() => {});
}
window.renderMaterials = renderMaterials;
