function renderDashboard(container) {
    try {
        let session = getSessionData();
        const role = session ? session.role : 'User';
        const currentUser = session ? session.user : 'Desconocido';
        const nickname = session ? session.name : 'Desconocido';
        const realName = nickname || currentUser;
        const isAdmin = (role === 'Admin');

        // El redimensionamiento ahora lo gestiona Chart.js automáticamente con ResizeObserver
        // gracias a que el tamaño de los contenedores está definido en CSS (clamp + media queries).
        if (window._dashResizeHandler) window.removeEventListener('resize', window._dashResizeHandler);
        window._dashResizeHandler = () => {
            // Solo si queremos actualizar fuentes o algo muy específico al cambiar de modo (móvil/desktop)
            // pero el re-render total ya no es necesario.
            if (window.location.hash === '#dashboard' && window.weeklyChart) {
                 // Chart.js hará el reflow por sí solo.
            }
        };
        window.addEventListener('resize', window._dashResizeHandler);

    const filterCard = isAdmin ? `
        <div class="glass-card" style="margin-bottom: 2rem; position: relative; z-index: 10;">
            <div style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; justify-content:center;">
                <div class="form-group" style="margin:0; min-width: 130px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Trainer</label>
                    <select id="dashboardTarget" class="form-control">
                        <option value="Total">Dato Global</option>
                        <option value="${currentUser}">Solo Mío</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; min-width: 80px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Año</label>
                    <select id="dashboardYear" class="form-control">
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; min-width: 100px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Mes</label>
                    <select id="dashboardMonth" class="form-control" onchange="window.syncWeeksByMonth()">
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; position: relative; min-width: 180px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Semanas (Multi-click)</label>
                    <div id="multiWeekContainer" class="form-control" style="height: 42px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; cursor: pointer; background: var(--bg-main); border: 1px solid var(--border-main); border-radius: 8px; justify-content: center;">
                        <span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">Selecciona periodo...</span>
                    </div>
                    <input type="hidden" id="dashboardWeek" value="">
                </div>
                <div class="form-group" style="margin:0; min-width: 110px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Dispositivo</label>
                    <select id="dashboardDevice" class="form-control">
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                <div style="display: flex; gap: 8px;">
                    <button id="btnFilter" class="btn-primary" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Filtrar"><i data-lucide="search" style="width:18px;"></i></button>
                    <button id="btnClearFilters" class="btn-secondary" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Borrar Filtros"><i data-lucide="refresh-ccw" style="width:16px;"></i></button>
                </div>
            </div>
        </div>` : `
        <div class="glass-card" style="margin-left: 0; margin-right: auto; margin-bottom: 2rem; max-width: 350px; padding: 0.75rem 1.25rem; position: relative; z-index: 10;">
            <div style="display:flex; flex-wrap:wrap; gap:12px; align-items:flex-end; justify-content:flex-start;">
                <div class="form-group" style="margin:0; min-width: 180px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Semana</label>
                    <select id="dashboardWeek" class="form-control"></select>
                </div>
                <div style="display:flex; gap:8px;">
                    <button id="btnFilter" class="btn-primary" style="height:42px; width:42px; padding:0; display:flex; align-items:center; justify-content:center;"><i data-lucide="search" style="width:20px;"></i></button>
                    <button id="btnClearFilters" class="btn-secondary" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;"><i data-lucide="refresh-ccw" style="width:18px;"></i></button>
                </div>
            </div>
        </div>`;

    const html = `
        <div class="dash-module fade-in" style="max-width: 1400px; margin: 0 auto;">
            <header class="dash-header" style="margin-bottom: 4rem; text-align: center; padding-top: 2rem;">
                <h2 style="font-size: 2.5rem; letter-spacing: -0.04em; margin-bottom: 0.5rem;">&iexcl;Hola, ${realName}! <i data-lucide="sparkles" style="color: var(--xiaomi-orange); width: 32px; vertical-align: middle;"></i></h2>
                <p id="dashPeriodText" style="color: var(--text-medium); font-weight: 500; font-size: 1.1rem; justify-content: center; display: flex; align-items: center; gap: 8px;">
                    ${isAdmin ? '<i data-lucide="line-chart" style="width:20px;"></i> Panel de Supervisión Global' : '<i data-lucide="zap" style="width:20px;"></i> Tu impacto semanal en Xiaomi'}
                </p>
            </header>

            ${filterCard}

            <div class="bento-grid">
                <div class="glass-card bento-item" style="grid-column: span 2; grid-row: span 2; display: flex; flex-direction: column; justify-content: center; align-items: center; text-align: center; position: relative; overflow: hidden;">
                    <h3 style="font-size: 1.25rem; color: var(--text-medium); font-weight: 500; position: relative; z-index: 2; margin-bottom: 1rem; display: flex; align-items: center; justify-content: center; gap: 10px;">
                        <i data-lucide="activity" style="color: var(--text-medium); width: 22px;"></i>
                        Actividades Registradas
                    </h3>
                    <div id="stat_count" style="font-size: clamp(3.5rem, 15vw, 5.5rem); font-weight: 800; line-height: 1; letter-spacing: -0.05em; font-family: var(--font-heading); position: relative; z-index: 2; color: var(--xiaomi-orange);">0</div>
                </div>

                <div class="glass-card bento-item" style="grid-column: span 2; display: flex; align-items: center; justify-content: center; text-align: center; padding: 2rem; position: relative; overflow: hidden;">
                    <div style="position: relative; z-index: 2;">
                        <h4 style="color: var(--text-muted); text-transform: uppercase; font-size: 0.75rem; letter-spacing: 0.1em; margin-bottom: 0.5rem; display: flex; align-items: center; justify-content: center; gap: 8px;">
                            <i data-lucide="users" style="color: var(--text-muted); width: 16px;"></i>
                            Alumnos Formados
                        </h4>
                        <div id="stat_alumnos" style="font-size: clamp(2rem, 10vw, 2.5rem); font-weight: 800; font-family: var(--font-heading); color: #059669;">0</div>
                    </div>
                </div>

                <div class="glass-card bento-item" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.5rem; position: relative; overflow: hidden;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; position: relative; z-index: 2; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <i data-lucide="layers" style="color: var(--text-muted); width: 14px;"></i>
                        Sesiones
                    </span>
                    <div id="stat_sesiones" style="font-size: 2rem; font-weight: 800; font-family: var(--font-heading); position: relative; z-index: 2; color: #3b82f6;">0</div>
                </div>

                <div class="glass-card bento-item" style="display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; padding: 1.5rem; position: relative; overflow: hidden;">
                    <span style="font-size: 0.75rem; color: var(--text-muted); font-weight: 700; text-transform: uppercase; position: relative; z-index: 2; display: flex; align-items: center; gap: 6px; margin-bottom: 4px;">
                        <i data-lucide="clock" style="color: var(--text-muted); width: 14px;"></i>
                        Horas
                    </span>
                    <div id="stat_horas" style="font-size: 2rem; font-weight: 800; font-family: var(--font-heading); position: relative; z-index: 2; color: #8b5cf6;">0</div>
                </div>
            </div>

            <div class="charts-container">
                <div class="glass-card">
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2rem; letter-spacing: 0.1em; display: flex; align-items: center; gap: 10px;"><i data-lucide="bar-chart-3" style="width:18px;"></i> Tendencia Semanal</h3>
                    <div class="chart-wrapper"><canvas id="chartWeekly"></canvas></div>
                </div>
                <div class="glass-card">
                    <h3 style="font-size: 0.85rem; color: var(--text-muted); text-transform: uppercase; margin-bottom: 2rem; letter-spacing: 0.1em; display: flex; align-items: center; gap: 10px;"><i data-lucide="pie-chart" style="width:18px;"></i> Distribución por Método</h3>
                    <div class="chart-wrapper" style="display: flex; justify-content: center;"><canvas id="chartMethods"></canvas></div>
                </div>
            </div>

            ${isAdmin ? `
            <div id="adminWidgets" class="admin-charts-container">
                <div class="glass-card" style="padding:0; overflow:hidden;">
                    <div style="padding:1.5rem; border-bottom:1px solid var(--border-main); display:flex; align-items:center; gap:10px;">
                        <i data-lucide="building" style="color: var(--text-muted); width:18px;"></i>
                        <h3 style="margin:0; font-size: 0.9rem; color: var(--text-medium); text-transform: uppercase; letter-spacing: 0.05em;">Impacto por Cuenta</h3>
                    </div>
                    <div style="overflow-x:auto;">
                        <table id="accountTable" class="report-table" style="width:100%; border-collapse:collapse; font-size:0.85rem;">
                            <thead style="background: var(--bg-main);">
                                <tr>
                                    <th style="padding:12px 15px; text-align:left; color: var(--text-muted); font-weight: 700;">Cuenta</th>
                                    <th style="padding:12px 15px; text-align:center; color: var(--text-muted); font-weight: 700;">Sesiones</th>
                                    <th style="padding:12px 15px; text-align:center; color: var(--text-muted); font-weight: 700;">Personas</th>
                                </tr>
                            </thead>
                            <tbody id="accountTableBody"></tbody>
                        </table>
                    </div>
                </div>
                <div class="glass-card">
                    <div style="display:flex; align-items:center; gap:10px; margin-bottom: 2rem;">
                        <i data-lucide="award" style="color: var(--xiaomi-orange); width:18px;"></i>
                        <h3 style="margin:0; font-size: 0.9rem; color: var(--text-medium); text-transform: uppercase; letter-spacing: 0.05em;">Rendimiento Trainers</h3>
                    </div>
                    <div class="chart-wrapper"><canvas id="chartTrainers"></canvas></div>
                </div>
            </div>
            ` : ''}

            <div class="glass-card" style="padding: 0; overflow: hidden; border-radius: 32px;">
                <div style="padding: 2.5rem; border-bottom: 1px solid var(--border-main);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 2rem;">
                        <h3 style="margin:0; font-size: 1.4rem; display: flex; align-items: center; gap: 12px;"><i data-lucide="history" style="color: var(--xiaomi-orange);"></i> Historial de Actividad</h3>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button onclick="window.dashboardLoadHistory()" class="btn-primary" style="height: 44px; width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; padding: 0;" title="Filtrar">
                                <i data-lucide="search" style="width:20px;"></i>
                            </button>
                            <button id="btnClearHistory" class="btn-outline" style="height: 44px; width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; padding: 0; border: 1px solid var(--border-main);" title="Limpiar Filtros">
                                <i data-lucide="rotate-ccw" style="width:20px;"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 1.5rem;">
                        ${isAdmin ? `
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Trainer</label>
                            <select id="histFilterTrainer" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Total">Dato Global</option>
                            </select>
                        </div>` : ''}
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Mes</label>
                            <select id="histFilterMonth" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Semana</label>
                            <select id="histFilterWeek" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Todos">Todas</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Cuenta</label>
                            <select id="histFilterAccount" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Todos">Todas</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Dispositivo</label>
                            <select id="histFilterDevice" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Metodología</label>
                            <select id="histFilterMethod" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;" onchange="window.dashboardLoadHistory()">
                                <option value="Todos">Todas</option>
                            </select>
                        </div>
                    </div>
                </div>
                <div style="overflow-x: auto;">
                    <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead style="background: #f8fafc;">
                            <tr>
                                <th style="padding: 12px; text-align: left; color: var(--text-muted); cursor: pointer;" onclick="window.sortHistory('fecha')">Fecha <i data-lucide="chevrons-up-down" style="width:12px; vertical-align:middle;"></i></th>
                                <th style="padding: 12px; text-align: left; color: var(--text-muted); cursor: pointer;" onclick="window.sortHistory('cuenta')">Cuenta <i data-lucide="chevrons-up-down" style="width:12px; vertical-align:middle;"></i></th>
                                <th style="padding: 12px; text-align: left; color: var(--text-muted);">Metodología</th>
                                <th style="padding: 12px; text-align: center; color: var(--text-muted); cursor: pointer;" onclick="window.sortHistory('alumnos')">Alumnos <i data-lucide="chevrons-up-down" style="width:12px; vertical-align:middle;"></i></th>
                                <th style="padding: 12px; text-align: center; color: var(--text-muted); cursor: pointer;" onclick="window.sortHistory('duracion')">Horas <i data-lucide="chevrons-up-down" style="width:12px; vertical-align:middle;"></i></th>
                                <th style="padding: 12px; text-align: right; color: var(--text-muted);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="historyBody">
                            <tr><td colspan="6" style="padding: 2rem; text-align: center; color: #94a3b8;">Cargando historial...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modalReport" class="calendar-overlay" style="display:none; align-items:center; justify-content:center;">
             <div class="glass-card" style="max-width: 500px; width: 90%; max-height: 80vh; overflow-y: auto;">
                <h3 id="modalTitle" style="color: var(--xiaomi-orange); margin-bottom: 1rem;">Detalles del Reporte</h3>
                <div id="modalContent" style="font-size: 0.9rem; line-height: 1.6;"></div>
                <button class="btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="document.getElementById('modalReport').style.display='none'">Cerrar</button>
             </div>
        </div>
    `;

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();

    const weekNumberISO = (d) => {
        let d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
        d2.setUTCDate(d2.getUTCDate() + 4 - (d2.getUTCDay() || 7));
        return Math.ceil((((d2 - new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
    };
    const currentWeek = weekNumberISO(new Date());
    
    const weeksList = Array.from({length: 52}, (_, i) => i + 1);
    const sW = document.getElementById('dashboardWeek');
    const hW = document.getElementById('histFilterWeek');
    const mWeekCont = document.getElementById('multiWeekContainer');
    let selectedWeeksSet = new Set([currentWeek]);

    const updateMultiWeekUI = () => {
        if (!mWeekCont) return;
        const sorted = Array.from(selectedWeeksSet).sort((a,b)=>a-b);
        mWeekCont.innerHTML = sorted.length ? sorted.map(w => `<span class="badge badge-extra" style="font-size: 0.65rem; padding: 2px 6px; margin: 2px;">Sem ${w}</span>`).join('') : '<span style="color: #94a3b8; font-size: 0.8rem; padding: 4px;">Selecciona periodo...</span>';
        if(sW) sW.value = sorted.join(',');
    };

    const injectWeeks = (select, list, selected = null) => {
        if (!select) return;
        const currentVal = selected || select.value;
        select.innerHTML = select.id.includes('hist') ? '<option value="Todos">Todas</option>' : '';
        list.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.innerText = `Semana ${w}`;
            if(currentVal && w == currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    };

    if(isAdmin) {
        updateMultiWeekUI();
        mWeekCont.onclick = (e) => {
            let picker = document.getElementById('weekPickerPop');
            if(picker) { picker.remove(); return; }
            
            picker = document.createElement('div');
            picker.id = 'weekPickerPop';
            picker.style = `position: absolute; top: 100%; left: 0; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100; padding: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-height: 200px; overflow-y: auto;`;
            
            weeksList.forEach(w => {
                const isSel = selectedWeeksSet.has(w);
                const btn = document.createElement('button');
                btn.className = isSel ? 'btn-primary' : 'btn-outline';
                btn.style = `padding: 4px; font-size: 0.7rem; height: auto; border-radius: 4px; ${!isSel ? 'border-color: #f1f5f9; color: #64748b;' : ''}`;
                btn.innerText = `S${w}`;
                btn.onclick = (ev) => {
                    ev.stopPropagation();
                    if(selectedWeeksSet.has(w)) selectedWeeksSet.delete(w);
                    else selectedWeeksSet.add(w);
                    updateMultiWeekUI();
                    btn.className = selectedWeeksSet.has(w) ? 'btn-primary' : 'btn-outline';
                    btn.style.borderColor = selectedWeeksSet.has(w) ? '' : '#f1f5f9';
                    btn.style.color = selectedWeeksSet.has(w) ? '' : '#64748b';
                };
                picker.appendChild(btn);
            });
            mWeekCont.parentElement.appendChild(picker);
            
            document.addEventListener('click', function close(e) {
                if(!picker.contains(e.target) && e.target !== mWeekCont) {
                    picker.remove();
                    document.removeEventListener('click', close);
                }
            });
        };
    }
    injectWeeks(hW, weeksList);

    window.syncWeeksByMonth = () => {
        const month = document.getElementById('dashboardMonth')?.value || "Todos";
        const year = parseInt(document.getElementById('dashboardYear')?.value) || new Date().getFullYear();
        
        const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
        const mIdx = mNames.indexOf(month);
        const monthWeeks = [];
        
        if (month !== "Todos") {
            for (let d = 1; d <= 31; d++) {
                const date = new Date(year, mIdx, d);
                if (date.getMonth() !== mIdx) break;
                const w = weekNumberISO(date);
                if (!monthWeeks.includes(w)) monthWeeks.push(w);
            }
        }

        if(isAdmin) {
            if(month === "Todos") selectedWeeksSet = new Set([currentWeek]);
            else {
                monthWeeks.forEach(w => selectedWeeksSet.add(w));
            }
            updateMultiWeekUI();
        } else {
            if (month === "Todos") injectWeeks(sW, weeksList);
            else injectWeeks(sW, monthWeeks);
        }
    };

    const populateAllFilters = () => {
        if (!isAdmin) return;
        
        sendJSONP('getFilterMetadata', {}, true).then(res => {
            if (res.status === 'success') {
                const yS = document.getElementById('dashboardYear');
                const mS = document.getElementById('dashboardMonth');
                const dS = document.getElementById('dashboardDevice');
                
                if (yS) yS.innerHTML = '<option value="Todos">Todos</option>' + res.data.years.map(y => `<option value="${y}">${y}</option>`).join('');
                if (mS) mS.innerHTML = '<option value="Todos">Todos</option>' + res.data.months.map(m => `<option value="${m}">${m}</option>`).join('');
                if (dS) dS.innerHTML = '<option value="Todos">Todos</option>' + res.data.devices.map(d => `<option value="${d}">${d}</option>`).join('');
            }
        });

        sendJSONP('getUsersList', {}, true).then(res => {
            if (res.status === 'success') {
                const s = document.getElementById('dashboardTarget');
                const ht = document.getElementById('histFilterTrainer');
                const optionsHtml = `
                    <option value="Total">Dato Global</option>
                    <option value="${currentUser}">Solo Mío</option>
                    <hr>
                    ${res.data.map(u => `<option value="${u}">${u}</option>`).join('')}
                `;
                if (s) s.innerHTML = optionsHtml;
                if (ht) ht.innerHTML = optionsHtml;
            }
        });
        
        // Historial (No requiere caché estricto pero se mantiene la lógica)
        sendJSONP('getFilterMetadata').then(res => {
            if(res.status === 'success') {
                const hM = document.getElementById('histFilterMonth');
                const hA = document.getElementById('histFilterAccount');
                const hD = document.getElementById('histFilterDevice');
                const hMet = document.getElementById('histFilterMethod');
                if(hM) res.data.months.forEach(m => hM.innerHTML += `<option value="${m}">${m}</option>`);
                if(hA) res.data.accounts.forEach(a => hA.innerHTML += `<option value="${a}">${a}</option>`);
                if(hD) res.data.devices.forEach(d => hD.innerHTML += `<option value="${d}">${d}</option>`);
                if(hMet) res.data.methodologies.forEach(h => hMet.innerHTML += `<option value="${h}">${h}</option>`);
            }
        });
    };
    populateAllFilters();

    const updateWeekSelect = (weeks, isAdmin) => {
        if (isAdmin) return; // Admins use the multi-picker
        const sel = document.getElementById('dashboardWeek');
        if (!sel) return;
        const currentVal = sel.value;
        sel.innerHTML = '<option value="">Selecciona...</option>';
        (weeks || []).sort((a, b) => b - a).forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.innerText = `Semana ${w}`;
            if (w.toString() === currentVal) opt.selected = true;
            sel.appendChild(opt);
        });
    };

    const loadStats = () => {
        const dTarget = document.getElementById('dashboardTarget');
        const dWeek = document.getElementById('dashboardWeek');
        const dMonth = document.getElementById('dashboardMonth');
        const dYear = document.getElementById('dashboardYear');
        const dDevice = document.getElementById('dashboardDevice');

        const target = isAdmin ? (dTarget ? dTarget.value : "Total") : currentUser;
        const week = dWeek ? dWeek.value : "";
        const month = dMonth ? dMonth.value : "Todos";
        const year = dYear ? dYear.value : "Todos";
        const device = dDevice ? dDevice.value : "Todos";

        const statsLoading = document.getElementById('stat_count');
        if (statsLoading) statsLoading.innerText = "...";

        const params = { targetUser: target, week: week, month: month, year: year, device: device };
        
        sendJSONP('getDashboardStats', params).then(res => {
            if (res.status === 'success') {
                try {
                    const sCount = document.getElementById('stat_count'); if(sCount) sCount.innerText = res.currentWeekData.count;
                    const sSesi = document.getElementById('stat_sesiones'); if(sSesi) sSesi.innerText = res.totalSesiones;
                    const sAlum = document.getElementById('stat_alumnos'); if(sAlum) sAlum.innerText = res.totalAlumnos;
                    const sHora = document.getElementById('stat_horas'); if(sHora) sHora.innerText = res.totalHoras;
                    
                    const pText = document.getElementById('dashPeriodText');
                    if (pText) {
                        pText.innerHTML = isAdmin ? '<i data-lucide="line-chart" style="width:20px;"></i> Panel de Supervisión Global' : 'Tu impacto semanal en Xiaomi';
                        if (typeof lucide !== 'undefined') lucide.createIcons();
                    }

                    updateWeekSelect(res.availableWeeks, isAdmin);
                    
                    // Delay render to let mobile layout and fonts stabilize
                    setTimeout(() => {
                        window._lastDashData = res;
                        renderCharts(res);
                        if (isAdmin && res.adminStats) renderAdminStats(res.adminStats);
                    }, 250);
                } catch(e) { console.error("Shielding error in stats rendering:", e); }
            }
        });
    };

    // Botón de Limpiar Filtros
    const clearBtn = document.getElementById('btnClearFilters');
    if(clearBtn) clearBtn.onclick = () => {
        if(isAdmin) {
            document.getElementById('dashboardTarget').value = 'Total';
            document.getElementById('dashboardYear').value = 'Todos';
            document.getElementById('dashboardMonth').value = 'Todos';
            document.getElementById('dashboardDevice').value = 'Todos';
            selectedWeeksSet = new Set([currentWeek]);
            updateMultiWeekUI();
            window.syncWeeksByMonth(); 
        }
        if(document.getElementById('dashboardWeek')) document.getElementById('dashboardWeek').value = currentWeek;
        
        // Historial
        if(isAdmin && document.getElementById('histFilterTrainer')) document.getElementById('histFilterTrainer').value = 'Total';
        document.getElementById('histFilterWeek').value = 'Todos';
        document.getElementById('histFilterMonth').value = 'Todos';
        document.getElementById('histFilterAccount').value = 'Todos';
        document.getElementById('histFilterDevice').value = 'Todos';
        document.getElementById('histFilterMethod').value = 'Todos';
        const hS = document.getElementById('historySearch');
        if(hS) hS.value = '';
        
        loadStats();
        loadHistory();
    };
    
    let isUpdatingFilters = false;
    const updateHistoryFilters = (af) => {
        if (isUpdatingFilters) return;
        isUpdatingFilters = true;
        try {
            const selectors = [
                { id: 'histFilterMonth', data: af.months, label: 'Todos' },
                { id: 'histFilterWeek', data: af.weeks, label: 'Todas' },
                { id: 'histFilterAccount', data: af.accounts, label: 'Todas' },
                { id: 'histFilterDevice', data: af.devices, label: 'Todos' },
                { id: 'histFilterMethod', data: af.methods, label: 'Todas' }
            ];
            
            selectors.forEach(s => {
                const el = document.getElementById(s.id);
                if (!el) return;
                const currentVal = el.value;
                el.innerHTML = `<option value="Todos">${s.label}</option>` + 
                    s.data.map(v => `<option value="${v}" ${v.toString() === currentVal ? 'selected' : ''}>${v}</option>`).join('');
            });
        } catch(e) { console.error("Error updating filters:", e); }
        isUpdatingFilters = false;
    };

    const loadHistory = () => {
        // Al cargar historial, respetamos si el admin seleccionó un trainer específico ABRAZO
        const target = isAdmin ? (document.getElementById('histFilterTrainer')?.value || 'Total') : currentUser;
        const week = document.getElementById('histFilterWeek')?.value || "";
        const month = document.getElementById('histFilterMonth')?.value || "Todos";
        const account = document.getElementById('histFilterAccount')?.value || "Todos";
        const device = document.getElementById('histFilterDevice')?.value || "Todos";
        const method = document.getElementById('histFilterMethod')?.value || "Todos";
        const q = document.getElementById('historySearch')?.value || "";
        
        const parseDuration = (val) => {
            if (!val) return 0;
            const s = val.toString();
            if (s.includes('T')) {
                const parts = s.split('T')[1].split(':');
                return parseFloat(parts[0]) + (parseFloat(parts[1])/60);
            }
            return parseFloat(s) || 0;
        };

        const loader = document.getElementById('historyLoading');
        if(loader) loader.style.visibility = 'visible';

        sendJSONP('getReportsHistory', { 
            targetUser: target === 'Total' ? '' : target, 
            limit: 25, 
            week: (week === "Todos" ? "" : week),
            month: month,
            account: account,
            device: device,
            methodology: method,
            q: q,
            _nocache: Date.now() 
        }).then(res => {
            if(res.status === 'success' && res.availableFilters) {
                updateHistoryFilters(res.availableFilters);
            }
            const body = document.getElementById('historyBody');
            if (!body) return; // FIX: Guard if user navigated away

            if(res.status === 'success' && res.data.length > 0) {
                window.dashboardHistoryData = res.data;
                body.innerHTML = res.data.map((r, idx) => `
                    <tr style="border-bottom: 1px solid var(--border-main);">
                        <td data-label="Fecha" style="padding: 12px; font-weight: 600;">${new Date(r.fecha).toLocaleDateString()}</td>
                        <td data-label="Cuenta" style="padding: 12px; color: var(--text-medium);">${r.cuenta}</td>
                        <td data-label="Método" style="padding: 12px;"><span class="badge ${r.metodologia === 'Classroom' ? 'badge-approved' : 'badge-extra'}">${r.metodologia}</span></td>
                        <td data-label="Alumnos" style="padding: 12px; text-align: center;">${r.alumnos || '0'}</td>
                        <td data-label="Horas" style="padding: 12px; text-align: center;">${parseDuration(r.duracion).toFixed(1)}h</td>
                        <td data-label="Acciones" style="padding: 12px; text-align: right; white-space: nowrap;">
                            <button onclick="handleHistoryAction('view', ${idx})" class="btn-outline btn-compact" style="border-color: #10b981; color: #10b981;" title="Ver Detalles"><i data-lucide="eye" style="width:14px;"></i></button>
                            <button onclick="handleHistoryAction('duplicate', ${idx})" class="btn-outline btn-compact" style="border-color: #0ea5e9; color: #0ea5e9;" title="Duplicar"><i data-lucide="copy" style="width:14px;"></i></button>
                            <button onclick="handleHistoryAction('edit', ${idx})" class="btn-outline btn-compact" title="Editar"><i data-lucide="edit-2" style="width:14px;"></i></button>
                        </td>
                    </tr>
                `).join('');
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } else {
                body.innerHTML = `<tr><td colspan="6" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">${q ? 'No hay resultados para esa búsqueda.' : 'No se encontraron reportes.'}</td></tr>`;
            }
        }).finally(() => { 
            const loader = document.getElementById('historyLoading');
            if(loader) loader.style.visibility = 'hidden'; 
        });
    };

    const renderAdminStats = (stats) => {
        const body = document.getElementById('accountTableBody');
        if(!body) return;
        let rows = '', totalSes = 0, totalAlu = 0;
        const accounts = Object.keys(stats.byAccount).sort();
        accounts.forEach(acc => {
            const s = stats.byAccount[acc].sesiones;
            const a = stats.byAccount[acc].alumnos;
            totalSes += s; totalAlu += a;
            rows += `
                <tr class="table-row-hover" style="border-bottom:1px solid var(--border-main); transition: background 0.2s;">
                    <td data-label="Cuenta" style="padding:12px 15px; color:var(--text-main); font-weight:600;">${acc}</td>
                    <td data-label="Sesiones" style="padding:12px 15px; text-align:center; font-weight:700; color:var(--xiaomi-orange);">${s}</td>
                    <td data-label="Personas" style="padding:12px 15px; text-align:center; font-weight:700; color:var(--text-main);">${a}</td>
                </tr>`;
        });
        if(rows) {
            rows += `

                <tr style="background: var(--bg-main); font-weight:900; border-top:2px solid var(--border-main);">
                    <td data-label="Cuenta" style="padding:12px 15px; color:var(--text-main);">TOTAL</td>
                    <td data-label="Sesiones" style="padding:12px 15px; text-align:center; color:var(--xiaomi-orange);">${totalSes}</td>
                    <td data-label="Personas" style="padding:12px 15px; text-align:center; color:var(--text-main);">${totalAlu}</td>
                </tr>`;
            body.innerHTML = rows;
        } else body.innerHTML = '<tr><td colspan="3" style="padding:2.5rem; text-align:center; color: var(--text-muted);">Sin datos en el periodo</td></tr>';
    };

    window.dashboardLoadHistory = loadHistory;

    window.sortHistory = (field) => {
        if(!window.dashboardHistoryData) return;
        const dir = window._sortDir === 'asc' ? 'desc' : 'asc';
        window._sortDir = dir;
        window.dashboardHistoryData.sort((a, b) => {
            let vA = a[field], vB = b[field];
            if(field === 'fecha') { vA = new Date(vA); vB = new Date(vB); }
            if(field === 'duracion') { vA = parseDuration(vA); vB = parseDuration(vB); }
            if(field === 'alumnos') { vA = parseFloat(vA) || 0; vB = parseFloat(vB) || 0; }
            if(vA < vB) return dir === 'asc' ? -1 : 1;
            if(vA > vB) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        // Re-render sin fetch
        const body = document.getElementById('historyBody');
        body.innerHTML = window.dashboardHistoryData.map((r, idx) => `
            <tr style="border-bottom: 1px solid var(--border-main);">
                <td data-label="Fecha" style="padding: 12px; font-weight: 600;">${new Date(r.fecha).toLocaleDateString()}</td>
                <td data-label="Cuenta" style="padding: 12px; color: var(--text-medium);">${r.cuenta}</td>
                <td data-label="Método" style="padding: 12px;"><span class="badge ${r.metodologia === 'Classroom' ? 'badge-approved' : 'badge-extra'}">${r.metodologia}</span></td>
                <td data-label="Alumnos" style="padding: 12px; text-align: center;">${r.alumnos || '0'}</td>
                <td data-label="Horas" style="padding: 12px; text-align: center;">${parseDuration(r.duracion).toFixed(1)}h</td>
                <td data-label="Acciones" style="padding: 12px; text-align: right; white-space: nowrap;">
                    <button onclick="handleHistoryAction('view', ${idx})" class="btn-outline btn-compact" style="border-color: #10b981; color: #10b981;" title="Ver Detalles"><i data-lucide="eye" style="width:14px;"></i></button>
                    <button onclick="handleHistoryAction('duplicate', ${idx})" class="btn-outline btn-compact" style="border-color: #0ea5e9; color: #0ea5e9;" title="Duplicar"><i data-lucide="copy" style="width:14px;"></i></button>
                    <button onclick="handleHistoryAction('edit', ${idx})" class="btn-outline btn-compact" title="Editar"><i data-lucide="edit-2" style="width:14px;"></i></button>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.handleHistoryAction = (action, index) => {
        const report = window.dashboardHistoryData[index];
        if(!report) return;
        if(action === 'view') {
            const modal = document.getElementById('modalReport');
            const content = document.getElementById('modalContent');
            content.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid var(--border-main); padding-bottom: 15px; margin-bottom: 15px;">
                    <div><strong style="color:var(--text-muted); font-size:0.75rem; display:block; text-transform:uppercase;">Trainer</strong> <span style="font-weight:700;">${report.trainer}</span></div>
                    <div><strong style="color:var(--text-muted); font-size:0.75rem; display:block; text-transform:uppercase;">Fecha</strong> <span style="font-weight:700;">${new Date(report.fecha).toLocaleDateString()}</span></div>
                </div>
                <div style="line-height: 1.8;">
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Metodología:</strong> <span style="font-weight:600;">${report.metodologia}</span></div>
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Cuenta:</strong> <span style="font-weight:600;">${report.cuenta} ${report.distribuidor ? `(${report.distribuidor})` : ''}</span></div>
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Ubicación:</strong> <span style="font-weight:600;">${report.ciudad}, ${report.provincia}</span></div>
                    <hr style="border: 0; border-top: 1px solid var(--border-main); margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; background:var(--bg-main); padding: 15px; border-radius:12px; margin-bottom:15px; text-align:center;">
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${report.sesiones}</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Sesiones</span></div>
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${report.alumnos}</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Alumnos</span></div>
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${report.duracion}h</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Duración</span></div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid var(--border-main); margin: 15px 0;">
                    <p style="margin-bottom:8px;"><strong>Contenidos:</strong> ${report.contenidos}</p>
                    <p style="margin-bottom:8px;"><strong>Móviles:</strong> ${report.dispositivos || '-'}</p>
                    <p style="margin-bottom:8px;"><strong>Ecosistema:</strong> ${report.dispositivos_no_movil || '-'}</p>
                    <p><strong>Comentarios:</strong><br><span style="color: var(--text-medium); font-style: italic;">${report.comentarios || 'Sin comentarios'}</span></p>
                </div>
            `;
            modal.style.display = 'flex';
        } else if(action === 'duplicate' || action === 'edit') {
            window.reportEditData = { ...report, mode: action };
            window.location.hash = '#report';
        }
    };

    const btnFilter = document.getElementById('btnFilter');
    if(btnFilter) btnFilter.onclick = () => { loadStats(); loadHistory(); };

    const btnClearHistory = document.getElementById('btnClearHistory');
    if(btnClearHistory) btnClearHistory.onclick = () => {
        ['histFilterMonth', 'histFilterWeek', 'histFilterAccount', 'histFilterDevice', 'histFilterMethod'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = 'Todos';
        });
        loadHistory();
    };

    const btnFilterHistory = document.getElementById('btnFilterHistory');
    if(btnFilterHistory) btnFilterHistory.onclick = () => { loadHistory(); };

    const historySearch = document.getElementById('historySearch');
    if(historySearch) historySearch.onkeyup = (e) => { if(e.key === 'Enter') loadHistory(); };
    
        // CARGA INICIAL DIFERIDA (Performance V1.1)
        loadStats();
        setTimeout(loadHistory, 300); // Retrasar carga de historial para priorizar los números principales
    } catch(e) {
        console.error("Dashboard Render Error:", e);
        container.innerHTML = `<div class="glass-card" style="padding:40px; text-align:center;"><h3>Error al cargar el Dashboard</h3><p>${e.message}</p></div>`;
    }
}

let weeklyChart, methodsChart, trainersChart;
function renderCharts(data) {
    if (!data) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isMobile = window.innerWidth < 768;
    const primaryColor = '#ff6700';
    const primaryGradientEnd = '#ff9a44';
    const secondaryColor = isDark ? '#334155' : '#cbd5e0';
    const secondaryGradientEnd = isDark ? '#1e293b' : '#f1f5f9';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? '#777777' : '#888888';
    const isLandscape = window.innerHeight < window.innerWidth && isMobile;
    const fontSize = isMobile ? (isLandscape ? 8 : 9) : 12;
    const tickSize = isMobile ? (isLandscape ? 7 : 8) : 11;

    if (typeof Chart === 'undefined') {
        console.error("Chart.js is NOT defined.");
        return;
    }

    try {
        console.log("Rendering Dashboard charts with data:", data);

        // Configuración global de Chart.js
        Chart.defaults.font.family = "'Inter', 'Outfit', sans-serif";
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;

        const createGrad = (ctx, start, end) => {
            if (!ctx) return start;
            try {
                const g = ctx.createLinearGradient(0, 0, 0, 300);
                g.addColorStop(0, start);
                g.addColorStop(1, end);
                return g;
            } catch(e) { return start; }
        };

        // --- Weekly Chart ---
        const canvasW = document.getElementById('chartWeekly');
        if (!canvasW) return;
        const ctxW = canvasW.getContext('2d');
        if(weeklyChart) weeklyChart.destroy();
        
        const gradOrange = createGrad(ctxW, primaryColor, primaryGradientEnd);
        const gradGray = createGrad(ctxW, secondaryColor, secondaryGradientEnd);

        weeklyChart = new Chart(ctxW, {
            type: 'bar',
            data: { 
                labels: data.chartLabels, 
                datasets: [
                    { 
                        label: 'Sesiones', 
                        data: data.chartSesiones, 
                        backgroundColor: gradOrange, 
                        borderRadius: 12,
                        hoverBackgroundColor: primaryColor,
                        maxBarThickness: 45
                    },
                    { 
                        label: 'Alumnos', 
                        data: data.chartAlumnos, 
                        backgroundColor: gradGray, 
                        borderRadius: 12,
                        hoverBackgroundColor: secondaryColor,
                        maxBarThickness: 45
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false,
                layout: { padding: isMobile ? { top: 5, bottom: 5, left: 10, right: 15 } : 15 },
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        labels: { 
                            padding: isMobile ? 12 : 20, 
                            usePointStyle: true, 
                            pointStyle: 'circle', 
                            font: { size: fontSize, weight: 600 } 
                        }
                    },
                    tooltip: {
                        backgroundColor: isDark ? '#1f2937' : '#ffffff',
                        titleColor: isDark ? '#ffffff' : '#1f2937',
                        bodyColor: isDark ? '#cbd5e0' : '#4b5563',
                        borderColor: isDark ? '#374151' : '#e5e7eb',
                        borderWidth: 1,
                        padding: isMobile ? 8 : 12,
                        cornerRadius: 8,
                        displayColors: true
                    }
                },
                scales: { 
                    y: { 
                        beginAtZero: true,
                        grid: { color: gridColor, drawBorder: false },
                        ticks: { color: textColor, font: { size: tickSize }, maxTicksLimit: isMobile ? 4 : 10 }
                    },
                    x: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: tickSize, weight: 600 }, maxRotation: 45, minRotation: 0 }
                    }
                }
            }
        });

        // --- Methods Chart ---
        const canvasM = document.getElementById('chartMethods');
        if (!canvasM) return;
        const ctxM = canvasM.getContext('2d');
        if(methodsChart) methodsChart.destroy();
        methodsChart = new Chart(ctxM, {
            type: 'doughnut',
            data: { 
                labels: data.pieLabels || [], 
                datasets: [{ 
                    data: data.pieData, 
                    backgroundColor: [
                        primaryColor, 
                        isDark ? '#3b82f6' : '#2563eb', // Blue
                        isDark ? '#10b981' : '#059669', // Green
                        isDark ? '#8b5cf6' : '#7c3aed', // Purple
                        isDark ? '#f59e0b' : '#d97706'  // Amber
                    ],
                    borderWidth: 0,
                    hoverOffset: 12
                }] 
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, 
                animation: { animateRotate: true, animateScale: true },
                layout: { padding: isMobile ? { top: 10, bottom: 10, left: 5, right: 5 } : 0 },
                plugins: { 
                    legend: { 
                        position: 'bottom',
                        display: true,
                        labels: { 
                            color: textColor,
                            padding: isMobile ? 12 : 20, 
                            usePointStyle: true, 
                            pointStyle: 'circle', 
                            font: { size: fontSize - 1, weight: 600 } 
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                let label = context.label || '';
                                if (label) label += ': ';
                                if (context.parsed !== undefined) {
                                    label += context.parsed + 'h';
                                }
                                return label;
                            }
                        }
                    }
                }
            }
        });

        // --- Trainers Chart (Admin) ---
        if(data.adminStats && document.getElementById('chartTrainers')) {
            const ctxT = document.getElementById('chartTrainers').getContext('2d');
            if(trainersChart) trainersChart.destroy();
            const names = Object.keys(data.adminStats.byTrainer);
            
            const gradT_Orange = createGrad(ctxT, primaryColor, primaryGradientEnd);
            const gradT_Gray = createGrad(ctxT, secondaryColor, secondaryGradientEnd);

            trainersChart = new Chart(ctxT, {
                type: 'bar',
                data: {
                    labels: names,
                    datasets: [
                        { label: 'Personas', data: names.map(n => data.adminStats.byTrainer[n].alumnos), backgroundColor: gradT_Orange, borderRadius: 20 },
                        { label: 'Sesiones', data: names.map(n => data.adminStats.byTrainer[n].sesiones), backgroundColor: gradT_Gray, borderRadius: 20 }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { 
                        legend: { position: 'bottom', labels: { usePointStyle: true, font: { size: isMobile ? 9 : 12, weight: 600 } } }
                    },
                    scales: { 
                        x: { beginAtZero: true, grid: { color: gridColor }, ticks: { font: { size: isMobile ? 9 : 11 } } },
                        y: { 
                            grid: { display: false }, 
                            ticks: { 
                                font: { size: isMobile ? 9 : 11, weight: 700 },
                                callback: function(value) {
                                    const label = this.getLabelForValue(value);
                                    return isMobile && label.length > 8 ? label.substring(0,7)+'..' : label;
                                }
                            } 
                        }
                    }
                }
            });
        }
    } catch(e) { console.error("Error renderCharts:", e); }
}
window.renderDashboard = renderDashboard;
