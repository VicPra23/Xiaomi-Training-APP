function renderMaterials(container) {
    const session = getSessionData();
    let categories = [
        {
            id: 'smartphones',
            title: 'Smartphones',
            icon: 'smartphone',
            subcategories: [
                {
                    name: 'Xiaomi Series',
                    items: [
                        { name: 'Xiaomi 17 Series', link: 'https://drive.google.com/drive/folders/1X5D15N7kX6E_T3z1I0oAEw52hVvZj4kE?usp=drive_link' },
                        { name: 'Xiaomi 17T Series', link: 'https://drive.google.com/drive/folders/12Pp5GqAC3MAS5Lg3_6euNP8wpk5bigx0?usp=drive_link' },
                        { name: 'Xiaomi 15', link: 'https://drive.google.com/drive/folders/1LdSr1wVeSd-SDlA7J88W7AoSDTo36Bs3?usp=drive_link' }
                    ]
                },
                {
                    name: 'Redmi Note Series',
                    items: [
                        { name: 'Redmi Note 17 Series', link: 'https://drive.google.com/drive/folders/1R-JL3LKby_kCDLBf1eRaQ-OY96dGY18c' },
                        { name: 'Redmi Note 15 Series', link: 'https://drive.google.com/drive/folders/1tVzbAPPJ2sKTIQfSDIj_lZ3DnSZ2DeDO?usp=drive_link' },
                        { name: 'Redmi Note 14 Series', link: 'https://drive.google.com/drive/folders/158tzCM-AN6eZQaDXvgIded_EaElHvDtx?usp=drive_link' }
                    ]
                },
                {
                    name: 'Redmi Series',
                    items: [
                        { name: 'Redmi 17 Series', link: 'https://drive.google.com/drive/folders/1RlkMdkqO1G9lgDSFigpktMMe73Rjm6eg?usp=drive_link', isNew: true },
                        { name: 'Redmi 17C', link: 'https://drive.google.com/drive/folders/1kIockJGytOGOnrQDRF7S2KkDt8w_pItP?usp=drive_link', isNew: true },
                        { name: 'Redmi A7 Pro', link: 'https://drive.google.com/drive/folders/1sGoos4L8TYb3cWfU-BgqWRJIGiuJVx-Z?usp=drive_link' },
                        { name: 'Redmi 15C Series', link: 'https://drive.google.com/drive/folders/1nI5668YtZ80KbzlWVq9G6W-TdmUYKL-O?usp=drive_link' },
                        { name: 'Redmi 15 Series', link: 'https://drive.google.com/drive/folders/1jKz2q1GtlRoUV1vU_IMAOme6VmzOoDvG?usp=drive_link' }
                    ]
                },
                {
                    name: 'Poco Series',
                    items: [
                        { name: 'Modelos Poco', link: 'https://drive.google.com/drive/folders/1juohiKKybgrbU9QQFO9NRUuGY2kIsv4q?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'wearables',
            title: 'Wearables',
            icon: 'watch',
            subcategories: [
                {
                    name: 'Xiaomi Band',
                    items: [
                        { name: 'Xiaomi Band 10 Pro', link: 'https://drive.google.com/drive/folders/1v6jE8VRI76fsfY68L59AvCH5fkgPJN2u?usp=drive_link' },
                        { name: 'Xiaomi Band 10', link: 'https://drive.google.com/drive/folders/1ChCLVcB1Qd47Euaxosfh5y4GWFSiBs0t?usp=drive_link' },
                        { name: 'Xiaomi Band 9 Series', link: 'https://drive.google.com/drive/folders/1ynJw_ISQL5aT68IWtOPs9FKCbRSWJ7V_?usp=drive_link' }
                    ]
                },
                {
                    name: 'Xiaomi Watch',
                    items: [
                        { name: 'Xiaomi Watch S5 46mm', link: 'https://drive.google.com/drive/folders/1aG_t62JPgG--mcuLspkaZCoMRp0cpegD?usp=drive_link' },
                        { name: 'Xiaomi Watch 5', link: 'https://drive.google.com/drive/folders/1MKCNhtlIr9kjDmd_u46_1nBL5wqixh7F?usp=drive_link' },
                        { name: 'Xiaomi Watch S4', link: 'https://drive.google.com/drive/folders/1KD4LBsOeYyr-wpzAPruIZZXF63hRMTte?usp=drive_link' },
                        { name: 'Xiaomi Watch S4 41 mm', link: 'https://drive.google.com/drive/folders/12hqXI7ictDs4RIhhzecM1K8kz0_wNt7W?usp=drive_link' },
                        { name: 'Xiaomi Watch 2', link: 'https://drive.google.com/drive/folders/1M2cluCVj7p1bFDfj-hch84SWv9Ybfts9?usp=drive_link' },
                        { name: 'Xiaomi Watch 2 Pro', link: 'https://drive.google.com/drive/folders/1BA63fqVslxa2FjulvEIv13FZ1SpJBXzH?usp=drive_link' }
                    ]
                },
                {
                    name: 'Redmi Watch',
                    items: [
                        { name: 'Redmi Watch 6', link: 'https://drive.google.com/drive/folders/1gTDcL0BbV8MMrsu_JQfKOOpnEpOw_mM6?usp=drive_link' },
                        { name: 'Redmi Watch 5 Series', link: 'https://drive.google.com/drive/folders/1ROS4qUYwz3oxTK-66zfNlbFPo7o57bLi?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'tablets',
            title: 'Tablets',
            icon: 'tablet',
            subcategories: [
                {
                    name: 'Xiaomi Pad',
                    items: [
                        { name: 'Xiaomi Pad 8 Series', link: 'https://drive.google.com/drive/folders/1UY4dVNbo5a6BA8y9IxkeP0C6JK_xfqRl?usp=drive_link' },
                        { name: 'Xiaomi Pad 7 Series', link: 'https://drive.google.com/drive/folders/1XClGAkAmTm7e1huJ5zcIFkuK9FOZZ86x?usp=drive_link' }
                    ]
                },
                {
                    name: 'Redmi Pad',
                    items: [
                        { name: 'Redmi Pad 2 Series', link: 'https://drive.google.com/drive/folders/1-dmBXg3_7H532gBqvoZVEVuyAZXU7zG-?usp=drive_link' },
                        { name: 'Redmi Pad Series', link: 'https://drive.google.com/drive/folders/17K07gSvMP-XsOC9WsLgCH2HsraF7IGMn?usp=drive_link' },
                        { name: 'Redmi Pad 2 9.7', link: 'https://drive.google.com/drive/folders/110IQ62Bh6BuSYrpcnmOsme7hkYQUoRxV?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'audio',
            title: 'Audio y Seguridad',
            icon: 'headphones',
            subcategories: [
                {
                    name: 'Auriculares Xiaomi',
                    items: [
                        { name: 'Xiaomi OpenWear Stereo Pro', link: 'https://drive.google.com/drive/folders/1Eom0uMEYUI4PC2OJPdd5z4dreB18XKTR?usp=drive_link' },
                        { name: 'Xiaomi OpenWear Stereo', link: 'https://drive.google.com/drive/folders/1Tc1uTvsyw4ESgA6PA5m9MF6XQUqkS7b1?usp=drive_link' },
                        { name: 'Xiaomi Buds 5 Series', link: 'https://drive.google.com/drive/folders/1vSDiDTxsTdMfKPcFsoxwSBqzG0fqV_vC?usp=drive_link' }
                    ]
                },
                {
                    name: 'Auriculares Redmi',
                    items: [
                        { name: 'Redmi Buds 8 Series', link: 'https://drive.google.com/drive/folders/1H2KgeuMwXZh6_46jE1wgat9IBVNzochZ?usp=drive_link' },
                        { name: 'Redmi Buds 6 Series', link: 'https://drive.google.com/drive/folders/1lhTyeOgQ9MW4lEA_94dwq9aVeTkKm52O?usp=drive_link' },
                        { name: 'Redmi Buds 5 Series', link: 'https://drive.google.com/drive/folders/1RZXdG0cdVLENAALeSdqu1_Lr99oZtxqv?usp=drive_link' },
                        { name: 'Redmi Buds 4 Series', link: 'https://drive.google.com/drive/folders/1uVA741nP4nFciOT051uutViObJhIvtp1?usp=drive_link' }
                    ]
                },
                {
                    name: 'Cámaras IP (Seguridad)',
                    items: [
                        { name: 'Outdoor Camera BW500', link: 'https://drive.google.com/drive/folders/1C9eRJd-ox4_Dynq5IT8KaMO5nIWcBIPe?usp=drive_link' },
                        { name: 'Outdoor Camera BW300', link: 'https://drive.google.com/drive/folders/1V6EZH0bZWIvwt3dd3gBw4Ou72qGagrBx?usp=drive_link' },
                        { name: 'Outdoor Camera BW400 Pro', link: 'https://drive.google.com/drive/folders/1XmQno9-IVLYb45HKp4eGs0U_KW8y4p1Q?usp=drive_link' },
                        { name: 'Outdoor Camera CW400', link: 'https://drive.google.com/drive/folders/1S5-RLX9KGhEC75Sj95RT9VrTiP3iG8-C?usp=drive_link' },
                        { name: 'Outdoor Camera CW300', link: 'https://drive.google.com/drive/folders/1-7gfo3PfC3FsU0RwVV9zaR_zcuP3ds3Y?usp=drive_link' },
                        { name: 'Camera C500 Pro', link: 'https://drive.google.com/drive/folders/1P9hEN7A8Y_LJsmhCR6D9pu9I5E5jq5bR?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'tv',
            title: 'Multimedia',
            icon: 'tv',
            subcategories: [
                {
                    name: 'Xiaomi TV',
                    items: [
                        { name: 'Xiaomi TV A Pro 2026', link: 'https://drive.google.com/drive/folders/1nGG5ZY6phSw4vnmJYIf-Mixj0irAOZgg?usp=drive_link' },
                        { name: 'Xiaomi TV F 2026', link: 'https://drive.google.com/drive/folders/1XfhvOx1K_tvKxwKIS-9wwcXYDXgAmwF1?usp=drive_link' },
                        { name: 'Xiaomi TV FX', link: 'https://drive.google.com/drive/folders/1W29eRmRHcF20katIW5AWybnFO39E306j?usp=drive_link' },
                        { name: 'Xiaomi TV S Pro Mini LED 2026', link: 'https://drive.google.com/drive/folders/10JoTZUI_k6vsHa9Juop2hpyaDIt1Xsag?usp=drive_link' },
                        { name: 'Xiaomi TV S Mini LED 2025', link: 'https://drive.google.com/drive/folders/11ExZDUZFANPj1e7iSppck1FwOQ-qb0KU?usp=drive_link' },
                        { name: 'Xiaomi TV Max 100', link: 'https://drive.google.com/drive/folders/1MrTOW8RDVSCiUl4YB0T-rKIJiNGF-QGA?usp=drive_link' }
                    ]
                },
                {
                    name: 'TV Box / Stick',
                    items: [
                        { name: 'Xiaomi Smart Stick 4K', link: 'https://drive.google.com/drive/folders/1UIxBAa3iyOUorkcSrGZF-VBsF9RAdEsl?usp=drive_link' },
                        { name: 'Xiaomi TV Box S (Gen3)', link: 'https://drive.google.com/drive/folders/1WeSErqR205Iv0LMlx1RBMa1ybEgDZxzl?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'eco',
            title: 'Ecosistema',
            icon: 'home',
            subcategories: [
                {
                    name: 'Climatización',
                    items: [{ name: 'Mijia Air Conditioner Pro', link: 'https://drive.google.com/drive/folders/1X3vZdPK7sRLtj95szHxawynAPNglKwJ0?usp=drive_link' }]
                },
                {
                    name: 'Movilidad (Scooters)',
                    items: [
                        { name: 'Xiaomi Scooter 6 Series', link: 'https://drive.google.com/drive/folders/1R-F2SyMl-d8VX2KCX-acTQQbTb34wBd_?usp=drive_link' },
                        { name: 'Xiaomi Scooter 5 Series', link: 'https://drive.google.com/drive/folders/1s2UpvnuPBSiFn84rdaYJW2Mcb_dRFTK7?usp=drive_link' }
                    ]
                },
                {
                    name: 'Cocina (Air Fryers)',
                    items: [
                        { name: 'Smart Double Stack Air Fryer 12L', link: 'https://drive.google.com/drive/folders/10pVUOFRTQJAAlNJslJMV7nVk4Z38cM1Z?usp=drive_link' },
                        { name: 'Smart Air Fryer Pro 4L', link: 'https://drive.google.com/drive/folders/11olTGLQReuJ8gny55khVHUjcbdt1BW1H?usp=drive_link' }
                    ]
                },
                {
                    name: 'Aspiradoras de mano',
                    items: [
                        { name: 'Vacuum Cleaner G30', link: 'https://drive.google.com/drive/folders/146e5h4lwuMCEPPEJZeqeqlYLEehPtQae?usp=drive_link' },
                        { name: 'Vacuum Cleaner G20 Max', link: 'https://drive.google.com/drive/folders/1vhzihiQ4pXVizWI7wKa91nvNd8JUzm9e?usp=drive_link' },
                        { name: 'Vacuum Cleaner G20', link: 'https://drive.google.com/drive/folders/1WOy8lzbtLofjEsHrivAuDZBWsrYcAklc?usp=drive_link' },
                        { name: 'Vacuum Cleaner G20 Lite', link: 'https://drive.google.com/drive/folders/1ZSbVe3CYdUylrFtqwuByiZhUEmyq-laM?usp=drive_link' }
                    ]
                },
                {
                    name: 'Robots Aspiradores',
                    items: [
                        { name: 'Robot Vaccum S40', link: 'https://drive.google.com/drive/folders/1Ih1Eo5W89IN3CFMRwmzo_h4p45vkpkod?usp=drive_link' },
                        { name: 'Robot Vaccum S20+', link: 'https://drive.google.com/drive/folders/1s_QuOLgtkUgxmsLBRM_4b_5PyEd-wCY1?usp=drive_link' },
                        { name: 'Robot Vaccum S20', link: 'https://drive.google.com/drive/folders/1oIm8FN2jXpAAUGVG2mDD1QMCq1SldpMs?usp=drive_link' },
                        { name: 'Robot Vaccum H40', link: 'https://drive.google.com/drive/folders/14w4vOMlxCtIOFKlfP3-fNylOAfBRPe_b?usp=drive_link' },
                        { name: 'Robot Vaccum S40C', link: 'https://drive.google.com/drive/folders/1IHbEQ-3VEniX4iVufo8JmCfQk1nhZzcr?usp=drive_link' },
                        { name: 'Robot Vaccum E5', link: 'https://drive.google.com/drive/folders/1waL0GjBoVPN0ixm6ZcXu_tqQoxEVNR-E?usp=drive_link' },
                        { name: 'Robot Vaccum 5', link: 'https://drive.google.com/drive/folders/1ux9EVGg7upLKktwwwPPoOsJvP7sh3XmA?usp=drive_link' }
                    ]
                }
            ]
        },
        {
            id: 'lifestyle',
            title: 'Lifestyle',
            icon: 'star',
            subcategories: [
                {
                    name: 'Básculas',
                    items: [
                        { name: 'Mi Body Composition Scale 2', link: 'https://drive.google.com/drive/folders/1bjqxbM_xNtzyJyo3gbNDmPYcjQ_J2xJx?usp=drive_link' },
                        { name: 'Smart Scale S200', link: 'https://drive.google.com/drive/folders/1LSOmYiim1bM-oedlxm9lbUBPMPrfypgQ?usp=drive_link' },
                        { name: 'Xiaomi Body Composition Scale S400', link: 'https://drive.google.com/drive/folders/1hMqP_TzISYHmJUEMlenjsFDFQ5jzxEi-?usp=drive_link' }
                    ]
                },
                {
                    name: 'Compresores',
                    items: [
                        { name: 'Materiales Compresores', link: 'https://drive.google.com/drive/folders/1msTErAV67Ggby-VgEIU-0bV9Zaq7j9B_?usp=drive_link' }
                    ]
                },
                {
                    name: 'Destornilladores',
                    items: [
                        { name: 'Materiales Destornilladores', link: 'https://drive.google.com/drive/folders/1yNCbypmAHxgvgxU6St1KmaPwvetWTXKR?usp=drive_link' }
                    ]
                }
            ]
        }
    ];

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
        if (res.status === 'success' && Array.isArray(res.data) && res.data.length) {
            categories = res.data;
            activeCatId = categories[0].id;
            container.innerHTML = '';
            updateView();
        }
    }).catch(() => {});
}
window.renderMaterials = renderMaterials;
