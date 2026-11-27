function renderDashboard(container) {
    window.disposeDashboard?.();
    let disposed = false, statsRequest = 0, historyRequest = 0;
    let statsTimer, historyTimer;
    window._lastDashData = null;
    window.dashboardHistoryData = null;
    let dashboardFiltersReady = false;
    const active = () => !disposed && container.isConnected && window.location.hash === '#dashboard';
    window.disposeDashboard = () => {
        disposed = true;
        clearTimeout(statsTimer); clearTimeout(historyTimer);
        window.destroyDashboardCharts?.();
    };
    try {
        const scheduleStats = () => { if (dashboardFiltersReady && active()) loadStats(); };
        const scheduleHistory = () => { if (dashboardFiltersReady && active() && !window.isUpdatingHistoryFilters) loadHistory(); };
        const esc = value => window.escapeHTML ? window.escapeHTML(value) : String(value ?? '');
        let session = getSessionData();
        const role = session ? session.role : 'User';
        const currentUser = session ? session.user : 'Desconocido';
        const nickname = session ? session.name : 'Desconocido';
        const realName = nickname || currentUser;
        const isAdmin = (role === 'Admin');

        const masterMobiles = ["Redmi 15 Series", "Redmi 15C Series", "Redmi 17 Series", "Redmi A5", "Redmi A7 Pro", "Redmi Note 15 Series", "Redmi Note 17 Series", "Xiaomi 17 series", "Xiaomi 17T Series", "Xiaomi 18 Pro Series"];
        const masterEcosystem = ["Air Fryer Series", "Aire Acondicionado", "Cámaras de Vigilancia", "Frigorífico", "Lavadora", "Redmi Buds 8 Series", "Redmi Pad 2 9.7\"", "Redmi Pad 2 Pro Series", "Redmi Pad 2 Series", "Redmi Watch 5 Series", "Redmi Watch 6 Series", "Robot Vacuum", "Scooters", "TV A 2026 Series", "TV F 2026 Series", "TV FX 2026 Series", "TV S 2026 Series", "Vacuum", "Xiaomi Band 11 Series", "Xiaomi Buds 5 Series", "Xiaomi Buds 6 Series", "Xiaomi Clip", "Xiaomi Openwear Stereo Series", "Xiaomi Pad 8 Series", "Xiaomi Watch 5 Series", "Xiaomi Watch S4 Series", "Xiaomi Watch S5 41 mm", "Xiaomi Watch S5 Series"];
        const masterDevices = [...masterMobiles, ...masterEcosystem].sort();

        const parseISO = (s) => {
            if (!s) return new Date();
            const p = s.split('T')[0].split('-');
            if (p.length !== 3) return new Date(s);
            return new Date(parseInt(p[0]), parseInt(p[1]) - 1, parseInt(p[2]));
        };

        const weekNumberISO = (d) => {
            let d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
            d2.setUTCDate(d2.getUTCDate() + 4 - (d2.getUTCDay() || 7));
            return Math.ceil((((d2 - new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
        };
        const currentNow = new Date();
        const currentYear = currentNow.getFullYear();
        const currentWeek = weekNumberISO(currentNow);
        const allMonthsList = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        const currentMonthName = allMonthsList[currentNow.getMonth()];

        // Helper para pintar la fecha perfecta en el HTML sin saltos de zona horaria
        const formatDateSafe = (dateStr) => {
            if (!dateStr) return '';
            if (dateStr.includes('-')) {
                const p = dateStr.split('T')[0].split('-');
                if (p.length === 3) {
                    // Creamos a mediodía para evitar cualquier salto por desfase de horas en el navegador
                    return new Date(parseInt(p[0]), parseInt(p[1])-1, parseInt(p[2]), 12, 0, 0).toLocaleDateString();
                }
            }
            return new Date(dateStr).toLocaleDateString();
        };

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
        <div class="dashboard-filter-card">
            <button type="button" class="dashboard-filter-toggle dashboard-filter-toggle-minimal" aria-expanded="true" aria-label="Mostrar u ocultar filtros">
                <span class="dashboard-filter-toggle-label"><i data-lucide="sliders-horizontal"></i> Filtros</span>
                <i data-lucide="chevron-down"></i>
            </button>
            <div class="dashboard-filter-content">
                <div class="form-group" style="margin:0; min-width: 130px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Trainer</label>
                    <select id="dashboardTarget" class="form-control">
                        <option value="Total">Dato Global</option>
                        <option value="${esc(currentUser)}">Solo Mío</option>
                    </select>
                </div>
                
                <div id="periodFiltersContainer" style="display:flex; flex-wrap:wrap; gap:16px; align-items:flex-end; justify-content:center;">
                    <div class="form-group" style="margin:0; min-width: 80px; flex: 0 1 auto; text-align: center;">
                        <label class="form-label" style="display: block; width: 100%;">Año</label>
                        <select id="dashboardYear" class="form-control" onchange="window.onDashboardYearChange()">
                            <option value="Todos">Todos</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0; position: relative; min-width: 120px; flex: 0 1 auto; text-align: center;">
                        <label class="form-label" style="display: block; width: 100%;">Meses (Multi)</label>
                        <div id="multiMonthContainer" class="form-control" role="button" tabindex="0" aria-haspopup="listbox" aria-label="Seleccionar meses" style="height: 42px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; cursor: pointer; background: var(--bg-main); border: 1px solid var(--border-main); border-radius: 8px; justify-content: center; align-items:center;">
                            <span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">Todos</span>
                        </div>
                        <input type="hidden" id="dashboardMonth" value="Todos">
                    </div>
                    <div class="form-group" style="margin:0; position: relative; min-width: 180px; flex: 0 1 auto; text-align: center;">
                        <label class="form-label" style="display: block; width: 100%;">Semanas (Multi)</label>
                        <div id="multiWeekContainer" class="form-control" role="button" tabindex="0" aria-haspopup="listbox" aria-label="Seleccionar semanas" style="height: 42px; overflow-y: auto; display: flex; flex-wrap: wrap; gap: 4px; padding: 4px; cursor: pointer; background: var(--bg-main); border: 1px solid var(--border-main); border-radius: 8px; justify-content: center; align-items:center;">
                            <span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">Selecciona periodo...</span>
                        </div>
                        <input type="hidden" id="dashboardWeek" value="">
                    </div>
                </div>

                <div id="rangeFiltersContainer" style="display:none; flex-wrap:wrap; gap:16px; align-items:flex-end; justify-content:center;">
                    <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                        <label class="form-label" style="display: block; width: 100%;">Desde</label>
                        <input type="date" id="dashboardDateStart" class="form-control" style="height: 42px; font-size: 0.85rem; text-align:center;">
                    </div>
                    <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                        <label class="form-label" style="display: block; width: 100%;">Hasta</label>
                        <input type="date" id="dashboardDateEnd" class="form-control" style="height: 42px; font-size: 0.85rem; text-align:center;">
                    </div>
                </div>

                <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Metodología</label>
                    <select id="dashboardMethodology" class="form-control" multiple style="max-height: 42px; overflow: hidden;">
                        <option value="Todos" selected>Todas</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Contenidos</label>
                    <select id="dashboardContent" class="form-control" multiple style="max-height: 42px; overflow: hidden;">
                        <option value="Todos" selected>Todos</option>
                    </select>
                </div>
                <div class="form-group" style="margin:0; min-width: 110px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Dispositivo</label>
                    <select id="dashboardDevice" class="form-control">
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                <div style="display:flex; gap:8px; align-self: flex-end;">
                    <button id="btnToggleRange" class="btn-secondary" aria-label="Cambiar entre periodo y rango de fechas" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Cambiar entre periodo y rango"><i data-lucide="calendar" style="width:18px;"></i></button>
                    <button id="btnExportTop" class="btn-secondary" aria-label="Exportar PDF" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Exportar Reporte PDF" onclick="window.exportDashboardToPDF()"><i data-lucide="file-text" style="width:18px;"></i></button>
                    <button id="btnClearFilters" class="btn-secondary" aria-label="Limpiar filtros" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Limpiar filtros"><i data-lucide="refresh-ccw" style="width:16px;"></i></button>
                </div>
            </div>
            <div id="dashboardStatusBar" class="dashboard-data-status dashboard-filter-status" data-state="loading" role="status" aria-live="polite">
                <span class="dashboard-status-indicator" aria-hidden="true"></span>
                <span id="dashboardDataStatus">Cargando datos…</span>
                <button type="button" id="dashboardRetry" class="btn-secondary" hidden>Reintentar</button>
            </div>
        </div>` : `
        <div class="dashboard-filter-card dashboard-filter-card-standard">
            <button type="button" class="dashboard-filter-toggle dashboard-filter-toggle-minimal" aria-expanded="true" aria-label="Mostrar u ocultar filtros">
                <span class="dashboard-filter-toggle-label"><i data-lucide="sliders-horizontal"></i> Filtros</span>
                <i data-lucide="chevron-down"></i>
            </button>
            <div class="dashboard-filter-content">
                <input type="hidden" id="dashboardTarget" value="${esc(currentUser)}">
                
                <div class="form-group" style="margin:0; min-width: 90px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Año</label>
                    <select id="dashboardYear" class="form-control" onchange="window.onDashboardYearChange()">
                        <option value="${currentYear}" selected>${currentYear}</option>
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Mes</label>
                    <select id="dashboardMonth" class="form-control" onchange="window.onDashboardMonthChange()">
                        <option value="${currentMonthName}" selected>${currentMonthName}</option>
                        <option value="Todos">Todos</option>
                    </select>
                </div>
                
                <div class="form-group" style="margin:0; min-width: 140px; flex: 0 1 auto; text-align: center;">
                    <label class="form-label" style="display: block; width: 100%;">Semana</label>
                    <select id="dashboardWeek" class="form-control" onchange="window.onDashboardWeekChange()">
                        <option value="${currentWeek}" selected>Semana ${currentWeek}</option>
                        <option value="Todos">Todas</option>
                    </select>
                </div>

                <div style="display:flex; gap:8px; align-self: flex-end;">
                    <button id="btnClearFilters" class="btn-secondary" aria-label="Limpiar filtros" style="height:42px; width: 42px; padding:0; display:flex; align-items:center; justify-content:center;" title="Limpiar filtros"><i data-lucide="refresh-ccw" style="width:16px;"></i></button>
                </div>
            </div>
            <div id="dashboardStatusBar" class="dashboard-data-status dashboard-filter-status" data-state="loading" role="status" aria-live="polite">
                <span class="dashboard-status-indicator" aria-hidden="true"></span>
                <span id="dashboardDataStatus">Cargando datos…</span>
                <button type="button" id="dashboardRetry" class="btn-secondary" hidden>Reintentar</button>
            </div>
        </div>`;

    const html = `
        <style>
            #mainChartsContainer, #adminWidgets {
                display: grid !important;
                grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
                gap: 1.5rem !important;
            }
            @media (max-width: 980px) {
                #mainChartsContainer, #adminWidgets {
                    grid-template-columns: 1fr !important;
                }
            }
        </style>
        <div class="dash-module fade-in">
            <header class="dash-header">
                <div>
                    <span class="page-eyebrow">Centro de operaciones</span>
                    <h2>&iexcl;Hola, ${esc(realName)}!</h2>
                    <p id="dashPeriodText">
                        ${isAdmin ? 'Visión global del equipo y actividad reciente.' : 'Tu actividad, objetivos y próximos pasos.'}
                    </p>
                </div>
                
            </header>

            ${filterCard}

            <section class="bento-grid metric-strip" aria-label="Indicadores del periodo">
                <div class="bento-item metric-item metric-primary">
                    <span class="metric-icon"><i data-lucide="activity"></i></span>
                    <div class="metric-copy">
                        <span class="metric-label">Actividades</span>
                        <div id="stat_count" class="metric-value">0</div>
                    </div>
                </div>

                <div class="bento-item metric-item">
                    <span class="metric-icon"><i data-lucide="users"></i></span>
                    <div class="metric-copy">
                        <span class="metric-label">Alumnos formados</span>
                        <div id="stat_alumnos" class="metric-value">0</div>
                    </div>
                </div>

                <div class="bento-item metric-item">
                    <span class="metric-icon"><i data-lucide="layers"></i></span>
                    <div class="metric-copy">
                        <span class="metric-label">Sesiones</span>
                        <div id="stat_sesiones" class="metric-value">0</div>
                    </div>
                </div>

                <div class="bento-item metric-item">
                    <span class="metric-icon"><i data-lucide="clock"></i></span>
                    <div class="metric-copy">
                        <span class="metric-label">Horas</span>
                        <div id="stat_horas" class="metric-value">0</div>
                    </div>
                </div>
            </section>

            <div id="mainChartsContainer" class="charts-container">
                <section class="workspace-panel workspace-panel-primary">
                    <div class="workspace-panel-heading"><div><span class="page-eyebrow">Evolución</span><h3>Tendencia semanal</h3></div><i data-lucide="bar-chart-3"></i></div>
                    <div class="chart-wrapper"><canvas id="chartWeekly" role="img" aria-label="Tendencia semanal de actividad"></canvas></div>
                </section>
                <section class="workspace-panel">
                    <div class="workspace-panel-heading"><div><span class="page-eyebrow">Mix de actividad</span><h3>Distribución por método</h3></div><i data-lucide="list-filter"></i></div>
                    <div class="chart-wrapper chart-wrapper-methods"><canvas id="chartMethods" role="img" aria-label="Distribución de actividad por metodología"></canvas></div>
                </section>
            </div>

            ${isAdmin ? `
            <div id="adminWidgets" class="charts-container" style="margin-top: 2rem;">
                  <section class="workspace-panel">
                      <div class="workspace-panel-heading"><div><span class="page-eyebrow">Alcance</span><h3>Impacto por cuenta</h3></div><i data-lucide="building"></i></div>
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
                  </section>
                  <section class="workspace-panel">
                      <div class="workspace-panel-heading"><div><span class="page-eyebrow">Rendimiento</span><h3>Rendimiento trainers</h3></div><i data-lucide="award"></i></div>
                      <div class="chart-wrapper"><canvas id="chartTrainers" role="img" aria-label="Comparativa de rendimiento entre trainers"></canvas></div>
                  </section>
            </div>` : ''}

            <div class="glass-card" style="padding: 0; overflow: hidden; border-radius: 32px;">
                <div style="padding: 2rem 2.5rem 1.25rem; border-bottom: 1px solid var(--border-main);">
                    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 20px; margin-bottom: 1.5rem;">
                        <h3 style="margin:0; font-size: 1.4rem; display: flex; align-items: center; gap: 12px;"><i data-lucide="history" style="color: var(--xiaomi-orange);"></i> Historial de Actividad</h3>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="btnToggleHistoryRange" class="btn-secondary" aria-label="Cambiar entre periodo y rango de fechas" style="height: 44px; width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; padding: 0; border: 1px solid var(--border-main);" title="Alternar Rango/Periodos">
                                <i data-lucide="calendar" style="width:20px;"></i>
                            </button>
                            ${isAdmin ? `
                            <button id="btnExportHistory" class="btn-secondary" aria-label="Exportar Historial CSV" style="height: 44px; width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; padding: 0; border: 1px solid var(--border-main);" title="Exportar Historial CSV">
                                <i data-lucide="download" style="width:20px;"></i>
                            </button>` : ''}
                            <button id="btnClearHistory" class="btn-secondary" aria-label="Limpiar filtros del historial" style="height: 44px; width: 44px; display: flex; align-items: center; justify-content: center; border-radius: 12px; padding: 0; border: 1px solid var(--border-main);" title="Limpiar Filtros">
                                <i data-lucide="refresh-ccw" style="width:18px;"></i>
                            </button>
                        </div>
                    </div>
                    
                    <div class="filters-grid" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 20px; margin-bottom: 0.75rem;">
                        ${isAdmin ? `
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.65rem; color: var(--text-muted); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Trainer</label>
                            <select id="histFilterTrainer" class="form-control" style="height: 36px; font-size: 0.8rem; margin:0;">
                                <option value="Total">Dato Global</option>
                            </select>
                        </div>` : ''}
                        <div id="histPeriodYear" class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Año</label>
                            <select id="histFilterYear" class="form-control" style="font-size: 0.8rem; margin:0;">
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                        <div id="histPeriodMonth" class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Mes</label>
                            <select id="histFilterMonth" class="form-control" style="font-size: 0.8rem; margin:0;">
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                        <div id="histPeriodWeek" class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Semana</label>
                            <select id="histFilterWeek" class="form-control" style="font-size: 0.8rem; margin:0;">
                                <option value="Todos">Todas</option>
                            </select>
                        </div>
                        <div id="histRangeStart" class="form-group" style="margin:0; display:none;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Desde</label>
                            <input type="date" id="histFilterDateStart" class="form-control" style="font-size: 0.85rem; margin:0;">
                        </div>
                        <div id="histRangeEnd" class="form-group" style="margin:0; display:none;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Hasta</label>
                            <input type="date" id="histFilterDateEnd" class="form-control" style="font-size: 0.85rem; margin:0;">
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Cuenta</label>
                            <select id="histFilterAccount" class="form-control" style="font-size: 0.8rem; margin:0;">
                                <option value="Todos">Todas</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Dispositivo</label>
                            <select id="histFilterDevice" class="form-control" style="font-size: 0.8rem; margin:0;">
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                        <div class="form-group" style="margin:0;">
                            <label class="filter-label" style="font-size: 0.7rem; color: var(--graphite-medium); font-weight: 800; text-transform: uppercase; margin-bottom: 4px; display: block;">Metodología</label>
                            <select id="histFilterMethod" class="form-control" style="font-size: 0.8rem; margin:0;" multiple>
                                <option value="Todos">Todos</option>
                            </select>
                        </div>
                    </div>
                    <div id="historyStatusBar" class="dashboard-data-status dashboard-filter-status" data-state="loading" role="status" aria-live="polite">
                        <span class="dashboard-status-indicator" aria-hidden="true"></span>
                        <span id="historyDataStatus">Cargando datos…</span>
                        <button type="button" id="historyRetry" class="btn-secondary" hidden>Reintentar</button>
                    </div>
                </div>
                <div id="historyTableContainer" style="overflow-x: auto;">
                    <table class="report-table" style="width: 100%; border-collapse: collapse; font-size: 0.9rem;">
                        <thead style="background: #f8fafc;">
                            <tr>
                                <th style="padding: 12px; text-align: left; color: var(--text-muted);"><button class="table-sort-button" onclick="window.sortHistory('fecha')">Fecha <i data-lucide="chevrons-up-down"></i></button></th>
                                ${isAdmin ? `<th style="padding: 12px; text-align: left; color: var(--text-muted);"><button class="table-sort-button" onclick="window.sortHistory('trainer')">Trainer <i data-lucide="chevrons-up-down"></i></button></th>` : ''}
                                <th style="padding: 12px; text-align: left; color: var(--text-muted);"><button class="table-sort-button" onclick="window.sortHistory('cuenta')">Cuenta <i data-lucide="chevrons-up-down"></i></button></th>
                                <th style="padding: 12px; text-align: left; color: var(--text-muted);">Metodología</th>
                                <th style="padding: 12px; text-align: center; color: var(--text-muted);"><button class="table-sort-button" onclick="window.sortHistory('alumnos')">Alumnos <i data-lucide="chevrons-up-down"></i></button></th>
                                <th style="padding: 12px; text-align: center; color: var(--text-muted);"><button class="table-sort-button" onclick="window.sortHistory('duracion')">Horas <i data-lucide="chevrons-up-down"></i></button></th>
                                <th style="padding: 12px; text-align: right; color: var(--text-muted);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="historyBody">
                            <tr><td colspan="${isAdmin ? 7 : 6}" style="padding: 2rem; text-align: center; color: #94a3b8;">Cargando historial...</td></tr>
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

        <div id="modalReport" class="calendar-overlay">
             <div class="glass-card" style="max-width: 500px; width: 90%; margin: auto; position: relative;">
                <button style="position: absolute; top: 15px; right: 15px; background: none; border: none; color: var(--text-muted); cursor: pointer;" onclick="document.getElementById('modalReport').style.display='none'"><i data-lucide="x" style="width: 20px;"></i></button>
                <h3 id="modalTitle" style="color: var(--xiaomi-orange); margin-bottom: 1rem;">Detalles del Reporte</h3>
                <div id="modalContent" style="font-size: 0.9rem; line-height: 1.6;"></div>
                <button class="btn-primary" style="width: 100%; margin-top: 1.5rem;" onclick="document.getElementById('modalReport').style.display='none'">Cerrar</button>
             </div>
        </div>
    `;

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    ['multiMonthContainer', 'multiWeekContainer'].forEach(id => {
        const control = document.getElementById(id);
        control?.addEventListener('keydown', event => {
            if (event.key === 'Enter' || event.key === ' ') {
                event.preventDefault();
                control.click();
            }
        });
    });
    const dashboardFilterCard = container.querySelector('.dashboard-filter-card');
    const dashboardFilterToggle = dashboardFilterCard?.querySelector('.dashboard-filter-toggle');
    if (dashboardFilterCard && dashboardFilterToggle) {
        const startsCollapsed = window.matchMedia('(max-width: 768px)').matches;
        dashboardFilterCard.classList.toggle('is-collapsed', startsCollapsed);
        dashboardFilterToggle.setAttribute('aria-expanded', startsCollapsed ? 'false' : 'true');
        dashboardFilterToggle.addEventListener('click', () => {
            const collapsed = dashboardFilterCard.classList.toggle('is-collapsed');
            dashboardFilterToggle.setAttribute('aria-expanded', collapsed ? 'false' : 'true');
        });
    }

    // Limpiar cualquier instancia previa de TomSelect al iniciar
    window.tsInstances = window.tsInstances || {};
    Object.keys(window.tsInstances).forEach(k => {
        try { window.tsInstances[k].destroy(); } catch(e){}
    });
    window.tsInstances = {};

    const initTomSelect = (selectId, placeholder) => {
        if (typeof TomSelect === 'undefined') return;
        const el = document.getElementById(selectId);
        if (!el) return;
        
        if (window.tsInstances[selectId]) {
            try { window.tsInstances[selectId].destroy(); } catch(e){}
        }
        
        const isMultiple = el.hasAttribute('multiple');
        const config = {
            placeholder: placeholder,
            sortField: { field: "text", direction: "asc" },
            dropdownParent: 'body',
            hideSelected: false, // Maintain selected options in the list
            controlInput: isMultiple ? null : '<input type="text" autocomplete="off" size="1">',
            score: function(search) {
                var scoreFunc = this.getScoreFunction(search);
                return function(item) {
                    if (item.value === 'Todos') return 1000; // Todos always on top and visible
                    if (typeof scoreFunc === 'function') {
                        return scoreFunc(item);
                    }
                    return 1;
                };
            },
            onInitialize: function() {
                const wrapper = this.control.parentElement.querySelector('.ts-wrapper');
                if (wrapper) {
                    wrapper.style.minWidth = '120px';
                    wrapper.style.borderRadius = '8px';
                }
            }
        };

        if (isMultiple) {
            config.plugins = {
                'remove_button': {
                    title: 'Eliminar'
                }
            };
        }
        config.onChange = function(values) {
            const isDashboardFilter = selectId.startsWith('dashboard');
            if (!isDashboardFilter && window.isUpdatingHistoryFilters) return;
            const normalized = normalizeDashboardSelection(values, isMultiple);
            const signature = JSON.stringify(normalized);
            if (this._lastValue === signature) return;
            this._lastValue = signature;
            // "Todos" es exclusivo; no dejar un instante con valores intermedios.
            if (JSON.stringify(values) !== signature) this.setValue(normalized, true);
            if (isDashboardFilter) scheduleStats();
            else scheduleHistory();
        };

        window.tsInstances[selectId] = new TomSelect("#" + selectId, config);
    };

    const weeksList = Array.from({length: 53}, (_, i) => i + 1);
    const sW = document.getElementById('dashboardWeek');
    const hW = document.getElementById('histFilterWeek');
    const mWeekCont = document.getElementById('multiWeekContainer');
    
    // El usuario ha pedido cambiar el filtro base para que arranque con la semana actual de nuevo,
    // pero manteniendo el mes actual para la gráfica de tendencia semanal.
    let selectedWeeksSet = new Set([currentWeek]);

    const updateMultiWeekUI = () => {
        if (!mWeekCont) return;
        const sorted = Array.from(selectedWeeksSet).sort((a,b)=>a-b);
        
        if (sorted.length === weeksList.length || sorted.length === 0) {
            mWeekCont.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">Todas</span>';
            if(sW) sW.value = "Todos";
        } else if (sorted.length > 8) {
            mWeekCont.innerHTML = `<span class="badge badge-extra" style="font-size: 0.75rem; padding: 4px 8px; margin: 2px;">${sorted.length} Semanas</span>`;
            if(sW) sW.value = sorted.join(',');
        } else {
            mWeekCont.innerHTML = sorted.map(w => `<span class="badge badge-extra" style="font-size: 0.65rem; padding: 2px 6px; margin: 2px;">Sem ${w}</span>`).join('');
            if(sW) sW.value = sorted.join(',');
        }
    };
    // Inicializar UI de semanas
    updateMultiWeekUI();

    const injectWeeks = (select, list, selected = null) => {
        if (!select) return;
        const currentVal = selected || select.value;
        select.innerHTML = '<option value="Todos">Todas</option>';
        list.forEach(w => {
            const opt = document.createElement('option');
            opt.value = w;
            opt.innerText = `Semana ${w}`;
            if(currentVal && w == currentVal) opt.selected = true;
            select.appendChild(opt);
        });
    };
    // Lógica de Multi-Selección de Meses (Pop-up)
    const mMonthCont = document.getElementById('multiMonthContainer');
    const sMonthInput = document.getElementById('dashboardMonth');
    let selectedMonthsSet = new Set([currentMonthName]); // Arranca en el mes actual

    const updateMultiMonthUI = () => {
        if (!mMonthCont) return;
        if (selectedMonthsSet.size === 0 || selectedMonthsSet.size === 12) {
            mMonthCont.innerHTML = '<span style="color: var(--text-muted); font-size: 0.8rem; padding: 4px;">Todos</span>';
            if(sMonthInput) sMonthInput.value = "Todos";
        } else {
            const sorted = Array.from(selectedMonthsSet).sort((a,b) => allMonthsList.indexOf(a) - allMonthsList.indexOf(b));
            mMonthCont.innerHTML = sorted.map(m => `<span class="badge badge-approved" style="font-size: 0.65rem; padding: 2px 6px; margin: 2px;">${m.substring(0,3)}</span>`).join('');
            if(sMonthInput) sMonthInput.value = sorted.join(',');
        }
    };
    updateMultiMonthUI();
    window.updateMultiMonthUI = updateMultiMonthUI;

    window.syncWeeksByMonth = (forceCurrentWeek = false) => {
        const monthStr = document.getElementById('dashboardMonth')?.value || "Todos";
        const year = parseInt(document.getElementById('dashboardYear')?.value) || currentYear;
        
        const mNames = allMonthsList;
        const monthWeeks = [];
        
        if (monthStr !== "Todos" && monthStr.trim() !== "") {
            const selectedMonths = monthStr.split(',').map(m => m.trim());
            selectedMonths.forEach(mName => {
                const mIdx = mNames.indexOf(mName);
                if (mIdx !== -1) {
                    for (let d = 1; d <= 31; d++) {
                        const date = new Date(year, mIdx, d);
                        if (date.getMonth() !== mIdx) break;
                        const w = weekNumberISO(date);
                        if (!monthWeeks.includes(w)) monthWeeks.push(w);
                    }
                }
            });
        }

        selectedWeeksSet = new Set(monthStr !== "Todos" && monthStr.trim() !== "" ? monthWeeks : weeksList);
        updateMultiWeekUI();

        // Soporte para usuario estándar (select simple sin multiselección)
        if (!isAdmin) {
            const selW = document.getElementById('dashboardWeek');
            if (selW && selW.tagName === 'SELECT') {
                const prevVal = selW.value;
                const listToInject = (monthStr !== "Todos" && monthWeeks.length > 0) ? monthWeeks : weeksList;
                injectWeeks(selW, listToInject);
                if (forceCurrentWeek && listToInject.includes(currentWeek)) {
                    selW.value = currentWeek;
                } else if (prevVal && prevVal !== "Todos" && listToInject.includes(Number(prevVal))) {
                    selW.value = prevVal;
                } else if (prevVal === "Todos" && !forceCurrentWeek) {
                    selW.value = "Todos";
                } else if (listToInject.includes(currentWeek)) {
                    selW.value = currentWeek;
                } else {
                    selW.value = "Todos";
                }
            }
        }
    };

    window.onDashboardYearChange = () => {
        if (isAdmin) {
            const dM = document.getElementById('dashboardMonth');
            if(dM) dM.value = "Todos";
            selectedMonthsSet.clear();
            if(window.updateMultiMonthUI) window.updateMultiMonthUI();
            selectedWeeksSet = new Set(weeksList);
            updateMultiWeekUI();
        } else {
            window.syncWeeksByMonth();
        }
        scheduleStats();
    };

    window.onDashboardMonthChange = () => {
        window.syncWeeksByMonth();
        scheduleStats();
    };

    window.onDashboardWeekChange = () => {
        scheduleStats();
    };

    if (!isAdmin) {
        const sYearInput = document.getElementById('dashboardYear');
        if (sYearInput && sYearInput.tagName === 'SELECT') {
            const recentYears = [currentYear - 1, currentYear, currentYear + 1];
            sYearInput.innerHTML = '<option value="Todos">Todos</option>' + recentYears.map(y => `<option value="${y}" ${y === currentYear ? 'selected' : ''}>${y}</option>`).join('');
            sYearInput.value = currentYear.toString();
        }
        if (sMonthInput && sMonthInput.tagName === 'SELECT') {
            sMonthInput.innerHTML = '<option value="Todos">Todos</option>' + allMonthsList.map(m => `<option value="${m}" ${m === currentMonthName ? 'selected' : ''}>${m}</option>`).join('');
            sMonthInput.value = currentMonthName;
        }
        window.syncWeeksByMonth(true);
        const selW = document.getElementById('dashboardWeek');
        if (selW) {
            selW.value = currentWeek;
        }
    }

    if(mMonthCont) {
        mMonthCont.onclick = (e) => {
            let picker = document.getElementById('monthPickerPop');
            if(picker) { picker.remove(); return; }
            
            picker = document.createElement('div');
            picker.id = 'monthPickerPop';
            picker.style = `position: absolute; top: 100%; left: 0; width: 200px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100; padding: 10px; display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px;`;
            
            const hdr = document.createElement('button');
            hdr.className = selectedMonthsSet.size === 0 ? 'btn-primary' : 'btn-outline';
            hdr.style = `grid-column: span 3; margin-bottom: 4px; font-size: 0.75rem; height: auto; padding: 4px;`;
            hdr.innerText = "Todos";
            hdr.onclick = (ev) => {
                ev.stopPropagation();
                selectedMonthsSet.clear();
                updateMultiMonthUI();
                picker.remove();
                selectedWeeksSet = new Set(weeksList);
                window.syncWeeksByMonth();
                scheduleStats();
            };
            picker.appendChild(hdr);

            allMonthsList.forEach(m => {
                const isSel = selectedMonthsSet.has(m);
                const btn = document.createElement('button');
                btn.className = isSel ? 'btn-primary' : 'btn-outline';
                btn.style = `padding: 4px; font-size: 0.7rem; height: auto; border-radius: 4px; ${!isSel ? 'border-color: #f1f5f9; color: #64748b;' : ''}`;
                btn.innerText = m.substring(0,3);
                btn.onclick = (ev) => {
                    ev.stopPropagation();
                    if(selectedMonthsSet.has(m)) selectedMonthsSet.delete(m);
                    else selectedMonthsSet.add(m);
                    updateMultiMonthUI();
                    btn.className = selectedMonthsSet.has(m) ? 'btn-primary' : 'btn-outline';
                    btn.style.borderColor = selectedMonthsSet.has(m) ? '' : '#f1f5f9';
                    btn.style.color = selectedMonthsSet.has(m) ? '' : '#64748b';
                    window.syncWeeksByMonth();
                    scheduleStats();
                };
                picker.appendChild(btn);
            });
            
            mMonthCont.parentElement.appendChild(picker);
            document.addEventListener('click', function closeM(e) {
                if(!picker.contains(e.target) && !mMonthCont.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', closeM);
                }
            });
        };
    }

    // Lógica de Multi-Selección de Semanas con Botón Contextual "Seleccionar Todas"
    if(mWeekCont) {
        updateMultiWeekUI();
        mWeekCont.onclick = (e) => {
            let picker = document.getElementById('weekPickerPop');
            if(picker) { picker.remove(); return; }
            
            picker = document.createElement('div');
            picker.id = 'weekPickerPop';
            picker.style = `position: absolute; top: 100%; left: 0; width: 100%; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); z-index: 100; padding: 10px; display: grid; grid-template-columns: repeat(4, 1fr); gap: 4px; max-height: 220px; overflow-y: auto;`;
            
            const currentActiveWeeks = [];
            const monthStr = document.getElementById('dashboardMonth')?.value || "Todos";
            if (monthStr === "Todos" || monthStr.trim() === "") {
                weeksList.forEach(w => currentActiveWeeks.push(w));
            } else {
                const year = parseInt(document.getElementById('dashboardYear')?.value) || new Date().getFullYear();
                const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
                const selectedMonths = monthStr.split(',').map(m => m.trim());
                selectedMonths.forEach(mName => {
                    const mIdx = mNames.indexOf(mName);
                    if (mIdx !== -1) {
                        for (let d = 1; d <= 31; d++) {
                            const date = new Date(year, mIdx, d);
                            if (date.getMonth() !== mIdx) break;
                            const w = weekNumberISO(date);
                            if (!currentActiveWeeks.includes(w)) currentActiveWeeks.push(w);
                        }
                    }
                });
            }
            currentActiveWeeks.sort((a,b)=>a-b);

            const tBtn = document.createElement('button');
            tBtn.className = 'btn-secondary';
            tBtn.style = `grid-column: span 4; margin-bottom: 4px; font-size: 0.75rem; height: auto; padding: 4px;`;
            tBtn.innerText = "Todos";
            tBtn.onclick = (ev) => {
                ev.stopPropagation();
                const allActiveSelected = currentActiveWeeks.every(w => selectedWeeksSet.has(w));
                if (allActiveSelected) {
                    currentActiveWeeks.forEach(w => selectedWeeksSet.delete(w));
                } else {
                    currentActiveWeeks.forEach(w => selectedWeeksSet.add(w));
                }
                updateMultiWeekUI();
                scheduleStats();
                picker.remove();
            };
            picker.appendChild(tBtn);

            currentActiveWeeks.forEach(w => {
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
                    scheduleStats();
                    btn.className = selectedWeeksSet.has(w) ? 'btn-primary' : 'btn-outline';
                    btn.style.borderColor = selectedWeeksSet.has(w) ? '' : '#f1f5f9';
                    btn.style.color = selectedWeeksSet.has(w) ? '' : '#64748b';
                };
                picker.appendChild(btn);
            });
            mWeekCont.parentElement.appendChild(picker);
            
            document.addEventListener('click', function close(e) {
                if(!picker.contains(e.target) && !mWeekCont.contains(e.target)) {
                    picker.remove();
                    document.removeEventListener('click', close);
                }
            });
        };
    }
    injectWeeks(hW, weeksList, currentWeek);

    // Lógica de alternado Periodo / Rango de Calendario
    const btnToggle = document.getElementById('btnToggleRange');
    const periodDiv = document.getElementById('periodFiltersContainer');
    const rangeDiv = document.getElementById('rangeFiltersContainer');
    let isRangeMode = false;

    if(btnToggle && periodDiv && rangeDiv) {
        btnToggle.onclick = () => {
            isRangeMode = !isRangeMode;
            if(isRangeMode) {
                periodDiv.style.display = 'none';
                rangeDiv.style.display = 'flex';
                btnToggle.innerHTML = '<i data-lucide="list-filter" style="width:18px;"></i>';
                btnToggle.title = "Cambiar a Filtro por Periodos";
            } else {
                periodDiv.style.display = 'flex';
                rangeDiv.style.display = 'none';
                btnToggle.innerHTML = '<i data-lucide="calendar" style="width:18px;"></i>';
                btnToggle.title = "Cambiar a Rango de Fechas";
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
            scheduleStats();
        };
    }

    // Toggle para Historial
    const btnToggleHist = document.getElementById('btnToggleHistoryRange');
    const histPeriodYear = document.getElementById('histPeriodYear');
    const histPeriodMonth = document.getElementById('histPeriodMonth');
    const histPeriodWeek = document.getElementById('histPeriodWeek');
    const histRangeStart = document.getElementById('histRangeStart');
    const histRangeEnd = document.getElementById('histRangeEnd');
    window.isHistoryRangeMode = false;

    const setHistoryRangeMode = (enabled) => {
        window.isHistoryRangeMode = Boolean(enabled);
        if (histPeriodYear) histPeriodYear.style.display = window.isHistoryRangeMode ? 'none' : 'block';
        if (histPeriodMonth) histPeriodMonth.style.display = window.isHistoryRangeMode ? 'none' : 'block';
        if (histPeriodWeek) histPeriodWeek.style.display = window.isHistoryRangeMode ? 'none' : 'block';
        if (histRangeStart) histRangeStart.style.display = window.isHistoryRangeMode ? 'block' : 'none';
        if (histRangeEnd) histRangeEnd.style.display = window.isHistoryRangeMode ? 'block' : 'none';
        if (btnToggleHist) {
            btnToggleHist.innerHTML = window.isHistoryRangeMode
                ? '<i data-lucide="list-filter" style="width:20px;"></i>'
                : '<i data-lucide="calendar" style="width:20px;"></i>';
            btnToggleHist.title = window.isHistoryRangeMode ? "Cambiar a Filtro por Periodos" : "Cambiar a Rango de Fechas";
        }
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    if(btnToggleHist && histPeriodMonth && histRangeStart) {
        btnToggleHist.onclick = () => {
            setHistoryRangeMode(!window.isHistoryRangeMode);
            scheduleHistory();
        };
    }



    const populateAllFilters = () => {
        api.getFilterMetadata({}, true).then(res => {
            if (!active()) return;
            if (res.status === 'success') {
                const yS = document.getElementById('dashboardYear');
                const mS = document.getElementById('dashboardMonth');
                const dS = document.getElementById('dashboardDevice');
                const dM = document.getElementById('dashboardMethodology');
                
                if (res.data.years) {
                    const prevY = yS ? yS.value : (isAdmin ? "Todos" : currentYear.toString());
                    if (yS) {
                        yS.innerHTML = '<option value="Todos">Todos</option>' + res.data.years.map(y => `<option value="${y}" ${y.toString() === prevY.toString() ? 'selected' : ''}>${y}</option>`).join('');
                        if (prevY && (prevY === "Todos" || res.data.years.map(String).includes(prevY.toString()))) {
                            yS.value = prevY;
                        } else if (!isAdmin) {
                            yS.value = currentYear.toString();
                        } else {
                            yS.value = "Todos";
                        }
                    }
                }
                if (mS && mS.tagName === "SELECT") {
                    const prevM = mS.value || currentMonthName;
                    mS.innerHTML = '<option value="Todos">Todos</option>' + (res.data.months || allMonthsList).map(m => `<option value="${esc(m)}" ${m === prevM ? 'selected' : ''}>${esc(m)}</option>`).join('');
                    mS.value = prevM;
                }
                
                if (dS && res.data.devices) {
                    dS.innerHTML = '<option value="Todos" selected>Todos</option>' + res.data.devices.map(d => `<option value="${esc(d)}">${esc(d)}</option>`).join('');
                    initTomSelect('dashboardDevice', 'Busca dispositivo...');
                }
                if (dM && res.data.methodologies) {
                    dM.innerHTML = '<option value="Todos" selected>Todas</option>' + res.data.methodologies.map(m => `<option value="${esc(m)}">${esc(m)}</option>`).join('');
                    initTomSelect('dashboardMethodology', 'Busca metodología...');
                    if (window.tsInstances['dashboardMethodology']) {
                        window.tsInstances['dashboardMethodology'].addItem('Todos', true);
                    }
                }
                const dC = document.getElementById('dashboardContent');
                const hC = document.getElementById('histFilterContent');
                if (res.data.contents) {
                    const opts = '<option value="Todos" selected>Todos</option>' + res.data.contents.map(c => `<option value="${esc(c)}">${esc(c)}</option>`).join('');
                    if (dC) {
                        dC.innerHTML = opts;
                        initTomSelect('dashboardContent', 'Busca contenido...');
                        if (window.tsInstances['dashboardContent']) window.tsInstances['dashboardContent'].addItem('Todos', true);
                    }
                    if (hC) {
                        hC.innerHTML = opts;
                        initTomSelect('histFilterContent', 'Filtra por contenido...');
                        if (window.tsInstances['histFilterContent']) window.tsInstances['histFilterContent'].addItem('Todos', true);
                    }
                }
            }
        });

        if (isAdmin) {
            api.getUsersList({}, true).then(res => {
                if (!active()) return;
                if (res.status === 'success') {
                    const s = document.getElementById('dashboardTarget');
                    const ht = document.getElementById('histFilterTrainer');
                    const optionsHtml = `
                        <option value="Total">Dato Global</option>
                        <option value="${esc(currentUser)}">Solo Mío</option>
                        <hr>
                        ${res.data.map(u => `<option value="${esc(u.user || u)}">${esc(u.name || u)}</option>`).join('')}
                    `;
                    if (s) { const value = s.value; s.innerHTML = optionsHtml; s.value = value; }
                    if (ht) ht.innerHTML = optionsHtml;
                }
            });
        }
        
        // Historial (No requiere caché estricto pero se mantiene la lógica)
        api.getFilterMetadata().then(res => {
            if (!active()) return;
            if(res.status === 'success') {
                const hY = document.getElementById('histFilterYear');
                const hM = document.getElementById('histFilterMonth');
                const hA = document.getElementById('histFilterAccount');
                const hD = document.getElementById('histFilterDevice');
                const hMet = document.getElementById('histFilterMethod');
                if(hY && Array.isArray(res.data.years)) res.data.years.forEach(y => hY.innerHTML += `<option value="${esc(y)}">${esc(y)}</option>`);
                if(hM) res.data.months.forEach(m => hM.innerHTML += `<option value="${esc(m)}">${esc(m)}</option>`);
                if(hA) res.data.accounts.forEach(a => hA.innerHTML += `<option value="${a}">${a}</option>`);
                if(hD) {
                    const reported = new Set(res.data.devices);
                    let opts = '<option value="Todos">Todas</option>';
                    if (isAdmin) {
                        masterDevices.forEach(d => {
                            const hasData = reported.has(d);
                            opts += `<option value="${esc(d)}" ${!hasData ? 'disabled style="color:#aaa"' : ''}>${esc(d)}${!hasData ? ' (Sin datos)' : ''}</option>`;
                        });
                    } else {
                        res.data.devices.sort().forEach(d => {
                            opts += `<option value="${esc(d)}">${esc(d)}</option>`;
                        });
                    }
                    hD.innerHTML = opts;
                    initTomSelect('histFilterDevice', 'Busca dispositivo...');
                }
                if(hMet) {
                    const methods = res.data.methodologies || [];
                    hMet.innerHTML = '<option value="Todos" selected>Todas</option>' + methods.map(h => `<option value="${h}">${h}</option>`).join('');
                    initTomSelect('histFilterMethod', '');
                    if (window.tsInstances['histFilterMethod']) {
                        window.tsInstances['histFilterMethod'].addItem('Todos', true);
                    }
                }
            }
        });
    };
    populateAllFilters();

    const updateWeekSelect = () => {};

    const loadStats = (force = false) => {
        const request = ++statsRequest;
        clearTimeout(statsTimer);
        document.getElementById('mainChartsContainer')?.setAttribute('aria-busy', 'true');
        document.getElementById('dashboardStatusBar')?.setAttribute('data-state', 'loading');
        const status = document.getElementById('dashboardDataStatus');
        if (status) status.textContent = window._lastDashData ? 'Actualizando datos…' : 'Cargando datos…';
        const retry = document.getElementById('dashboardRetry');
        if (retry) retry.hidden = true;
        statsTimer = setTimeout(() => { if (active()) fetchStats(force, request); }, force ? 0 : 400);
    };
    const fetchStats = (force, request) => {
        const dTarget = document.getElementById('dashboardTarget');
        const dWeek = document.getElementById('dashboardWeek');
        const dMonth = document.getElementById('dashboardMonth');
        const dYear = document.getElementById('dashboardYear');
        const dDevice = document.getElementById('dashboardDevice');
        const dStart = document.getElementById('dashboardDateStart');
        const dEnd = document.getElementById('dashboardDateEnd');

        const target = isAdmin ? (dTarget ? dTarget.value : "Total") : currentUser;
        const device = (window.tsInstances && window.tsInstances['dashboardDevice']) 
            ? (window.tsInstances['dashboardDevice'].getValue() || "Todos") 
            : (dDevice ? dDevice.value : "Todos");
        let methodology = "Todos";
        if (window.tsInstances && window.tsInstances['dashboardMethodology']) {
            const vals = window.tsInstances['dashboardMethodology'].getValue();
            methodology = Array.isArray(vals) ? vals.join(',') : (vals || "Todos");
        } else if (document.getElementById('dashboardMethodology')) {
            const mEl = document.getElementById('dashboardMethodology');
            methodology = Array.from(mEl.selectedOptions).map(o => o.value).join(',');
        }

        let content = "Todos";
        if (window.tsInstances && window.tsInstances['dashboardContent']) {
            const vals = window.tsInstances['dashboardContent'].getValue();
            content = Array.isArray(vals) ? vals.join(',') : (vals || "Todos");
        } else if (document.getElementById('dashboardContent')) {
            const cEl = document.getElementById('dashboardContent');
            content = Array.from(cEl.selectedOptions).map(o => o.value).join(',');
        }

        // Conservar los indicadores y gráficos anteriores mientras llega la nueva lectura.

        let params = { targetUser: target, device: device, methodology: methodology, content: content, refresh: force };
        
        if (isRangeMode) {
            params.startDate = dStart ? dStart.value : "";
            params.endDate = dEnd ? dEnd.value : "";
        } else {
            params.week = dWeek ? dWeek.value : "";
            params.month = dMonth ? dMonth.value : "Todos";
            params.year = dYear ? dYear.value : "Todos";
        }
        
        return api.getDashboardStats(params).then(async res => {
            if (!active() || request !== statsRequest) return;
            if (res.status === 'success') {
                try {
                    const sCount = document.getElementById('stat_count'); if(sCount) sCount.innerText = (res.currentWeekData && res.currentWeekData.count !== undefined) ? res.currentWeekData.count : (res.count || 0);
                    const sSesi = document.getElementById('stat_sesiones'); if(sSesi) sSesi.innerText = res.totalSesiones !== undefined ? res.totalSesiones : (res.sesiones || 0);
                    const sAlum = document.getElementById('stat_alumnos'); if(sAlum) sAlum.innerText = res.totalAlumnos !== undefined ? res.totalAlumnos : (res.alumnos || 0);
                    const sHora = document.getElementById('stat_horas'); if(sHora) sHora.innerText = res.totalHoras !== undefined ? res.totalHoras : (res.horas || 0);
                    
                    const pText = document.getElementById('dashPeriodText');
                    if (pText) {
                        pText.textContent = isAdmin
                            ? 'Visión global del equipo y actividad reciente.'
                            : 'Tu actividad, objetivos y próximos pasos.';
                    }

                    updateWeekSelect(res.availableWeeks, isAdmin);
                    window._lastDashData = res;
                    if (isAdmin && res.adminStats) renderAdminStats(res.adminStats);
                } catch(e) { console.error("Shielding error in stats rendering:", e); }

                const rendered = await renderCharts(res, () => active() && request === statsRequest);
                if (!active() || request !== statsRequest) return;
                if (!rendered) throw new Error('No se pudieron actualizar los gráficos.');

                const statusBar = document.getElementById('dashboardStatusBar');
                if (statusBar) statusBar.setAttribute('data-state', res.offline ? 'offline' : 'success');
                const status = document.getElementById('dashboardDataStatus');
                if (status) status.textContent = res.offline ? 'Datos guardados · sin conexión' : 'Datos actualizados';
                document.getElementById('mainChartsContainer')?.setAttribute('aria-busy', 'false');
            } else {
                throw new Error(res.message || 'No se pudo cargar el resumen.');
            }
        }).catch(error => {
            if (!active() || request !== statsRequest) return;
            console.error('Error loading dashboard stats:', error);
            const ids = ['stat_count', 'stat_sesiones', 'stat_alumnos', 'stat_horas'];
            ids.forEach(id => {
                const element = document.getElementById(id);
                if (element && element.innerText === '...') element.innerText = '—';
            });
            document.getElementById('mainChartsContainer')?.setAttribute('aria-busy', 'false');
            const statusBar = document.getElementById('dashboardStatusBar');
            if (statusBar) statusBar.setAttribute('data-state', 'error');
            const status = document.getElementById('dashboardDataStatus');
            if (status) status.textContent = window._lastDashData
                ? 'Error de actualización · se mantienen los últimos datos.'
                : 'Error de actualización. Reintenta la consulta.';
            const retry = document.getElementById('dashboardRetry');
            if (retry) retry.hidden = false;
        });
    };

    const resetHistoryFilters = () => {
        if (isAdmin && document.getElementById('histFilterTrainer')) document.getElementById('histFilterTrainer').value = 'Total';
        ['histFilterYear', 'histFilterMonth', 'histFilterAccount', 'histFilterDevice', 'histFilterMethod'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.value = 'Todos';
                if (window.tsInstances?.[id]) {
                    window.tsInstances[id].setValue(id === 'histFilterMethod' ? ['Todos'] : 'Todos', true);
                }
            }
        });
        if (window.tsInstances?.['histFilterContent']) {
            window.tsInstances['histFilterContent'].setValue(['Todos'], true);
        }
        const hStart = document.getElementById('histFilterDateStart');
        if (hStart) hStart.value = '';
        const hEnd = document.getElementById('histFilterDateEnd');
        if (hEnd) hEnd.value = '';
        if (window.isHistoryRangeMode) setHistoryRangeMode(false);
        const hW = document.getElementById('histFilterWeek');
        if (hW) hW.value = currentWeek;
        const hS = document.getElementById('historySearch');
        if (hS) hS.value = '';
    };

    // Botón de Limpiar Filtros
    const clearBtn = document.getElementById('btnClearFilters');
    if(clearBtn) clearBtn.onclick = () => {
        const dTarget = document.getElementById('dashboardTarget');
        if (dTarget) dTarget.value = isAdmin ? 'Total' : currentUser;

        if (document.getElementById('dashboardYear')) {
            document.getElementById('dashboardYear').value = isAdmin ? 'Todos' : currentYear.toString();
        }
        if (document.getElementById('dashboardMonth')) {
            document.getElementById('dashboardMonth').value = currentMonthName;
        }
        if (window.tsInstances && window.tsInstances['dashboardDevice']) {
            window.tsInstances['dashboardDevice'].setValue('Todos');
        } else if (document.getElementById('dashboardDevice')) {
            document.getElementById('dashboardDevice').value = 'Todos';
        }
        if (window.tsInstances && window.tsInstances['dashboardMethodology']) {
            window.tsInstances['dashboardMethodology'].setValue(['Todos']);
        } else if (document.getElementById('dashboardMethodology')) {
            document.getElementById('dashboardMethodology').value = 'Todos';
        }
        if (window.tsInstances && window.tsInstances['dashboardContent']) {
            window.tsInstances['dashboardContent'].setValue(['Todos']);
        } else if (document.getElementById('dashboardContent')) {
            document.getElementById('dashboardContent').value = 'Todos';
        }
        
        if(document.getElementById('dashboardDateStart')) document.getElementById('dashboardDateStart').value = '';
        if(document.getElementById('dashboardDateEnd')) document.getElementById('dashboardDateEnd').value = '';
        
        selectedMonthsSet = new Set([currentMonthName]);
        if(window.updateMultiMonthUI) window.updateMultiMonthUI();
        
        if(isRangeMode && btnToggle) btnToggle.click();

        selectedWeeksSet = new Set([currentWeek]);
        updateMultiWeekUI(); 

        if (!isAdmin) {
            window.syncWeeksByMonth(true);
            const dW = document.getElementById('dashboardWeek');
            if (dW) dW.value = currentWeek;
        }

        // Historial
        resetHistoryFilters();
        
        loadStats();
        loadHistory();
    };
    
    window.isUpdatingHistoryFilters = false;
    const updateHistoryFilters = (af = {}) => {
        if (window.isUpdatingHistoryFilters) return;
        window.isUpdatingHistoryFilters = true;
        try {
            const selectors = [
                { id: 'histFilterYear', data: Array.isArray(af.years) ? af.years : [], label: 'Todos' },
                { id: 'histFilterMonth', data: Array.isArray(af.months) ? af.months : [], label: 'Todos' },
                { id: 'histFilterWeek', data: (af.weeks && af.weeks.length > 0) ? af.weeks : [...weeksList].sort((a,b)=>b-a), label: 'Todas' },
                { id: 'histFilterAccount', data: Array.isArray(af.accounts) ? af.accounts : [], label: 'Todas' },
                { id: 'histFilterDevice', data: Array.isArray(af.devices) ? af.devices : [], label: 'Todos' },
                { id: 'histFilterMethod', data: Array.isArray(af.methods) ? af.methods : [], label: 'Todas' }
            ];
            
            selectors.forEach(s => {
                const el = document.getElementById(s.id);
                if (!el) return;
                
                let currentVal = el.value;
                if (window.tsInstances && window.tsInstances[s.id]) {
                    const tsVal = window.tsInstances[s.id].getValue();
                    currentVal = Array.isArray(tsVal) ? [...tsVal] : tsVal;
                    const ts = window.tsInstances[s.id];
                    
                    // Update options dynamically without destroying the instance
                    ts.clearOptions();
                    ts.addOption({value: 'Todos', text: s.label});
                    
                    if (s.id === 'histFilterDevice') {
                        const reported = new Set(s.data);
                        if (isAdmin) {
                            masterDevices.forEach(d => {
                                const hasData = reported.has(d);
                                ts.addOption({value: d.toString(), text: hasData ? d : d + ' (Sin datos)', disabled: !hasData});
                            });
                        } else {
                            s.data.sort().forEach(d => ts.addOption({value: d.toString(), text: d}));
                        }
                    } else if (s.id === 'histFilterMethod') {
                        s.data.forEach(v => ts.addOption({value: v.toString(), text: v}));
                    }
                    
                    if (Array.isArray(currentVal)) {
                        currentVal.forEach(v => {
                            if (v !== 'Todos' && !s.data.includes(v)) {
                                ts.addOption({value: v.toString(), text: v.toString()});
                            }
                        });
                        if (currentVal.length === 0) currentVal = ['Todos'];
                    } else if (!currentVal) {
                        currentVal = 'Todos';
                    }
                    
                    ts.setValue(currentVal, true); // true = silent
                } else {
                    if (s.id === 'histFilterDevice') {
                        const reported = new Set(s.data);
                        const isTodosSel = Array.isArray(currentVal) ? currentVal.includes('Todos') : currentVal === 'Todos';
                        let opts = `<option value="Todos" ${isTodosSel ? 'selected' : ''}>${s.label}</option>`;
                        if (isAdmin) {
                            masterDevices.forEach(d => {
                                const hasData = reported.has(d);
                                const isSel = Array.isArray(currentVal) ? currentVal.includes(d.toString()) : d.toString() === currentVal;
                                opts += `<option value="${esc(d)}" ${isSel ? 'selected' : ''} ${!hasData ? 'disabled style="color:#aaa"' : ''}>${esc(d)}${!hasData ? ' (Sin datos)' : ''}</option>`;
                            });
                        } else {
                            s.data.sort().forEach(d => {
                                const isSel = Array.isArray(currentVal) ? currentVal.includes(d.toString()) : d.toString() === currentVal;
                                opts += `<option value="${esc(d)}" ${isSel ? 'selected' : ''}>${esc(d)}</option>`;
                            });
                        }
                        el.innerHTML = opts;
                        initTomSelect('histFilterDevice', 'Busca dispositivo...');
                    } else if (s.id === 'histFilterMethod') {
                        const isTodosSel = (!currentVal || currentVal.length === 0 || (Array.isArray(currentVal) ? currentVal.includes('Todos') : currentVal === 'Todos'));
                        el.innerHTML = `<option value="Todos" ${isTodosSel ? 'selected' : ''}>${s.label}</option>` + 
                            s.data.map(v => {
                                const isSel = Array.isArray(currentVal) ? currentVal.includes(v.toString()) : v.toString() === currentVal;
                                return `<option value="${v}" ${isSel ? 'selected' : ''}>${v}</option>`;
                            }).join('');
                        initTomSelect('histFilterMethod', '');
                        if (window.tsInstances['histFilterMethod'] && isTodosSel) {
                            window.tsInstances['histFilterMethod'].addItem('Todos', true);
                        }
                    } else if (s.id === 'histFilterWeek') {
                        const vals = s.data.map(v => v.toString());
                        const extraOpt = (currentVal && currentVal !== 'Todos' && !vals.includes(currentVal.toString()))
                            ? `<option value="${esc(currentVal)}" selected>Semana ${esc(currentVal)}</option>`
                            : '';
                        el.innerHTML = `<option value="Todos" ${currentVal === 'Todos' ? 'selected' : ''}>Todas</option>` + extraOpt +
                            s.data.map(v => `<option value="${esc(v)}" ${v.toString() === currentVal.toString() ? 'selected' : ''}>Semana ${esc(v)}</option>`).join('');
                    } else {
                        const vals = s.data.map(v => v.toString());
                        const extraOpt = (currentVal && currentVal !== 'Todos' && !vals.includes(currentVal.toString()))
                            ? `<option value="${esc(currentVal)}" selected>${esc(currentVal)}</option>`
                            : '';
                        el.innerHTML = `<option value="Todos" ${currentVal === 'Todos' ? 'selected' : ''}>${s.label}</option>` + extraOpt +
                            s.data.map(v => `<option value="${esc(v)}" ${v.toString() === currentVal.toString() ? 'selected' : ''}>${esc(v)}</option>`).join('');
                    }
                }
            });
        } catch(e) { console.error("Error updating filters:", e); }
        setTimeout(() => { window.isUpdatingHistoryFilters = false; }, 50);
    };

    const loadHistory = (force = false) => {
        const request = ++historyRequest;
        clearTimeout(historyTimer);
        document.getElementById('historyTableContainer')?.setAttribute('aria-busy', 'true');
        document.getElementById('historyStatusBar')?.setAttribute('data-state', 'loading');
        const status = document.getElementById('historyDataStatus');
        if (status) status.textContent = window.dashboardHistoryData !== null ? 'Actualizando datos…' : 'Cargando datos…';
        const retry = document.getElementById('historyRetry');
        if (retry) retry.hidden = true;
        historyTimer = setTimeout(() => { if (active()) fetchHistory(force, request); }, force ? 0 : 400);
    };
    const fetchHistory = (force, request) => {
        // Al cargar historial, respetamos si el admin seleccionó un trainer específico
        const target = isAdmin ? (document.getElementById('histFilterTrainer')?.value || 'Total') : currentUser;
        let year = document.getElementById('histFilterYear')?.value || "Todos";
        let week = document.getElementById('histFilterWeek')?.value || "";
        let month = document.getElementById('histFilterMonth')?.value || "Todos";
        const account = document.getElementById('histFilterAccount')?.value || "Todos";
        const dHistDevice = document.getElementById('histFilterDevice');
        const device = (window.tsInstances && window.tsInstances['histFilterDevice'])
            ? (window.tsInstances['histFilterDevice'].getValue() || "Todos")
            : (dHistDevice ? dHistDevice.value : "Todos");
        const q = document.getElementById('historySearch')?.value || "";
        
        const dateStart = document.getElementById('histFilterDateStart')?.value || "";
        const dateEnd = document.getElementById('histFilterDateEnd')?.value || "";
        const histStartDisplay = document.getElementById('histRangeStart')?.style?.display;
        const useRange = Boolean(window.isHistoryRangeMode || (histStartDisplay && histStartDisplay !== 'none'));

        if (useRange) {
            year = "Todos";
            week = "";
            month = "Todos";
        }

        let methods = [];
        if (window.tsInstances && window.tsInstances['histFilterMethod']) {
            const val = window.tsInstances['histFilterMethod'].getValue();
            if (Array.isArray(val)) {
                methods = val;
            } else if (typeof val === 'string') {
                methods = val.split(',').filter(Boolean);
            }
        } else {
            const el = document.getElementById('histFilterMethod');
            if (el) {
                methods = Array.from(el.selectedOptions || []).map(o => o.value);
            }
        }
        const isMethodTodos = methods.length === 0 || methods.includes('Todos');
        
        let contentVal = "Todos";
        if (window.tsInstances && window.tsInstances['histFilterContent']) {
            const vals = window.tsInstances['histFilterContent'].getValue();
            contentVal = Array.isArray(vals) ? vals.join(',') : (vals || "Todos");
        } else if (document.getElementById('histFilterContent')) {
            const el = document.getElementById('histFilterContent');
            contentVal = Array.from(el.selectedOptions || []).map(o => o.value).join(',') || "Todos";
        }

        const parseDuration = (val) => {
            if (!val) return 0;
            const s = val.toString();
            if (s.includes('T')) {
                const parts = s.split('T')[1].split(':');
                return parseFloat(parts[0]) + (parseFloat(parts[1])/60);
            }
            return parseFloat(s) || 0;
        };

        const historyParams = { 
            targetUser: target === 'Total' ? '' : target, 
            year: year,
            week: (week === "Todos" ? "" : week),
            month: month,
            account: account,
            device: device,
            methodology: isMethodTodos ? "Todos" : methods.join(','),
            content: contentVal,
            startDate: useRange ? dateStart : "",
            endDate: useRange ? dateEnd : "",
            q: q,
            refresh: force,
            limit: 250
        };

        return api.getReportsHistory(historyParams).then(res => {
            if (!active() || request !== historyRequest) return;
            if (!res || res.status !== 'success') {
                throw new Error((res && res.message) || 'No se pudo cargar el historial.');
            }
            if (res.availableFilters) {
                updateHistoryFilters(res.availableFilters);
            }

            const rawData = Array.isArray(res.data) ? res.data : [];
            let filteredData = rawData;
            if (!isMethodTodos) {
                const normalizeStr = (s) => String(s || '').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
                const methodsLower = methods.map(normalizeStr);
                filteredData = filteredData.filter(r => {
                    const rowMethod = normalizeStr(r.metodologia);
                    return methodsLower.includes(rowMethod);
                });
            }
            
            if (useRange) {
                if (dateStart) {
                    const dStart = new Date(dateStart).getTime();
                    filteredData = filteredData.filter(r => new Date(r.fecha).getTime() >= dStart);
                }
                if (dateEnd) {
                    const dEnd = new Date(dateEnd);
                    dEnd.setHours(23, 59, 59, 999);
                    filteredData = filteredData.filter(r => new Date(r.fecha).getTime() <= dEnd.getTime());
                }
            }

            window.dashboardHistoryData = filteredData;

            const body = document.getElementById('historyBody');
            if (body) {
                if (filteredData.length === 0) {
                    body.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">${q ? 'No hay resultados para esa búsqueda.' : 'No se encontraron reportes con los filtros seleccionados.'}</td></tr>`;
                } else {
                    body.innerHTML = filteredData.map((r, idx) => `
                        <tr style="border-bottom: 1px solid var(--border-main);">
                            <td data-label="Fecha" style="padding: 12px; font-weight: 600;">${formatDateSafe(r.fecha)}</td>
                            ${isAdmin ? `<td data-label="Trainer" style="padding: 12px; font-weight: 600; color: var(--xiaomi-orange);">${esc(r.trainer || '-')}</td>` : ''}
                            <td data-label="Cuenta" style="padding: 12px; color: var(--text-medium);">${esc(r.cuenta)}</td>
                            <td data-label="Método" style="padding: 12px;"><span class="badge ${r.metodologia === 'Classroom' ? 'badge-approved' : 'badge-extra'}">${esc(r.metodologia)}</span></td>
                            <td data-label="Alumnos" style="padding: 12px; text-align: center;">${esc(r.alumnos || '0')}</td>
                            <td data-label="Horas" style="padding: 12px; text-align: center;">${parseDuration(r.duracion).toFixed(1)}h</td>
                            <td data-label="Acciones" style="padding: 12px; text-align: right; white-space: nowrap;">
                                <button onclick="handleHistoryAction('view', ${idx})" class="btn-outline btn-compact" style="border-color: #10b981; color: #10b981;" title="Ver Detalles"><i data-lucide="eye" style="width:14px;"></i></button>
                                <button onclick="handleHistoryAction('duplicate', ${idx})" class="btn-outline btn-compact" style="border-color: #0ea5e9; color: #0ea5e9;" title="Duplicar"><i data-lucide="copy" style="width:14px;"></i></button>
                                <button onclick="handleHistoryAction('edit', ${idx})" class="btn-outline btn-compact" title="Editar"><i data-lucide="edit-2" style="width:14px;"></i></button>
                                <button onclick="handleHistoryAction('delete', ${idx})" class="btn-outline danger btn-compact" style="border-color: #ef4444; color: #ef4444;" title="Eliminar"><i data-lucide="trash-2" style="width:14px;"></i></button>
                            </td>
                        </tr>
                    `).join('');
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }

            const statusBar = document.getElementById('historyStatusBar');
            if (statusBar) statusBar.setAttribute('data-state', res.offline ? 'offline' : 'success');
            const status = document.getElementById('historyDataStatus');
            if (status) status.textContent = res.offline ? 'Datos guardados · sin conexión' : 'Datos actualizados';
            const retry = document.getElementById('historyRetry');
            if (retry) retry.hidden = true;
            document.getElementById('historyTableContainer')?.setAttribute('aria-busy', 'false');
        }).catch(error => {
            if (!active() || request !== historyRequest) return;
            console.error('Error loading report history:', error);
            const body = document.getElementById('historyBody');
            if (body && window.dashboardHistoryData === null) {
                body.innerHTML = `<tr><td colspan="${isAdmin ? 7 : 6}" style="padding: 2.5rem; text-align: center; color: var(--text-muted);">No se pudo cargar el historial.</td></tr>`;
            }
            document.getElementById('historyTableContainer')?.setAttribute('aria-busy', 'false');
            const statusBar = document.getElementById('historyStatusBar');
            if (statusBar) statusBar.setAttribute('data-state', 'error');
            const status = document.getElementById('historyDataStatus');
            if (status) status.textContent = window.dashboardHistoryData !== null
                ? 'Error de actualización · se mantienen los últimos datos.'
                : 'Error de actualización. Reintenta la consulta.';
            const retry = document.getElementById('historyRetry');
            if (retry) retry.hidden = false;
        });
    };

    const renderAdminStats = (stats) => {
        const body = document.getElementById('accountTableBody');
        if(!body) return;
        let rows = '', totalSes = 0, totalAlu = 0;
        const accounts = Object.keys(stats.byAccount || {}).sort();
        accounts.forEach(acc => {
            const s = stats.byAccount[acc]?.sesiones || 0;
            const a = stats.byAccount[acc]?.alumnos || 0;
            if (s <= 0 || a <= 0) return;
            totalSes += s; totalAlu += a;
            rows += `
                <tr class="table-row-hover" style="border-bottom:1px solid var(--border-main); transition: background 0.2s;">
                    <td data-label="Cuenta" style="padding:12px 15px; color:var(--text-main); font-weight:600;">${esc(acc)}</td>
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

    window.exportDashboardToPDF = async () => {
        const dTarget = document.getElementById('dashboardTarget');
        const dWeek = document.getElementById('dashboardWeek');
        const dMonth = document.getElementById('dashboardMonth');
        const dYear = document.getElementById('dashboardYear');
        const dDevice = document.getElementById('dashboardDevice');
        const rangeEl = document.getElementById('rangeInputs');
        const isRangeMode = rangeEl ? rangeEl.style.display !== 'none' : false;
        const dStart = document.getElementById('dashboardDateStart');
        const dEnd = document.getElementById('dashboardDateEnd');
        const currentUser = getSessionData().user;

        const target = isAdmin ? (dTarget ? dTarget.value : "Total") : currentUser;
        const device = (window.tsInstances && window.tsInstances['dashboardDevice']) 
            ? (window.tsInstances['dashboardDevice'].getValue() || "Todos") 
            : (dDevice ? dDevice.value : "Todos");
        let methodology = "Todos";
        if (window.tsInstances && window.tsInstances['dashboardMethodology']) {
            const vals = window.tsInstances['dashboardMethodology'].getValue();
            methodology = Array.isArray(vals) ? vals.join(',') : (vals || "Todos");
        } else if (document.getElementById('dashboardMethodology')) {
            const mEl = document.getElementById('dashboardMethodology');
            methodology = Array.from(mEl.selectedOptions).map(o => o.value).join(',');
        }

        let content = "Todos";
        if (window.tsInstances && window.tsInstances['dashboardContent']) {
            const vals = window.tsInstances['dashboardContent'].getValue();
            content = Array.isArray(vals) ? vals.join(',') : (vals || "Todos");
        } else if (document.getElementById('dashboardContent')) {
            const cEl = document.getElementById('dashboardContent');
            content = Array.from(cEl.selectedOptions).map(o => o.value).join(',');
        }

        let params = { targetUser: target, device: device, methodology: methodology, content: content };
        
        if (isRangeMode) {
            params.startDate = dStart ? dStart.value : "";
            params.endDate = dEnd ? dEnd.value : "";
        } else {
            params.week = dWeek ? dWeek.value : "";
            params.month = dMonth ? dMonth.value : "Todos";
            params.year = dYear ? dYear.value : "Todos";
        }

        if (window.showToast) window.showToast("Generando PDF, por favor espera...", "info");
        
        const btn = document.getElementById('btnExportTop');
        if (btn) {
            btn.innerHTML = '<i data-lucide="loader" class="spin" style="width:18px;"></i>';
            if (window.lucide) window.lucide.createIcons();
            btn.disabled = true;
        }

        try {
            const res = await api.getCustomPDF(params);
            if (res.status === 'success') {
                const linkSource = `data:application/pdf;base64,${res.pdfBase64}`;
                const downloadLink = document.createElement("a");
                downloadLink.href = linkSource;
                downloadLink.download = res.filename || "Reporte.pdf";
                downloadLink.click();
                if (window.showToast) window.showToast("PDF generado exitosamente", "success");
            } else {
                if (window.showToast) window.showToast("Error al generar PDF: " + (res.message || "Desconocido"), "error");
            }
        } catch (e) {
            console.error(e);
            if (window.showToast) window.showToast("Error de conexión al generar PDF", "error");
        } finally {
            if (btn) {
                btn.innerHTML = '<i data-lucide="file-text" style="width:18px;"></i>';
                if (window.lucide) window.lucide.createIcons();
                btn.disabled = false;
            }
        }
    };

    window.exportDashboardToCSV = () => {
        if (!window.dashboardHistoryData || window.dashboardHistoryData.length === 0) {
            if (window.showToast) window.showToast("No hay datos para exportar", "error");
            else alert("No hay datos para exportar.");
            return;
        }
        
        const headers = ["Fecha", "Trainer", "Cuenta", "Distribuidor", "Ciudad", "Provincia", "Metodología", "Sesiones", "Alumnos", "Duración", "Dispositivos", "Observaciones"];
        let csvContent = headers.join(";") + "\n";
        
        window.dashboardHistoryData.forEach(r => {
            const pD = (val) => {
                if (!val) return 0;
                const s = val.toString();
                if (s.includes('T')) {
                    const parts = s.split('T')[1].split(':');
                    return parseFloat(parts[0]) + (parseFloat(parts[1])/60);
                }
                return parseFloat(s) || 0;
            };

            const row = [
                r.fecha ? r.fecha.split('T')[0] : "",
                r.trainer || "",
                r.cuenta || "",
                r.distribuidor || "",
                r.ciudad || "",
                r.provincia || "",
                r.metodologia || "",
                r.sesiones || 0,
                r.alumnos || 0,
                pD(r.duracion).toFixed(1),
                (r.dispositivos && Array.isArray(r.dispositivos)) ? r.dispositivos.map(d => typeof d === 'object' ? d.modelo : d).join(", ") : (r.dispositivos || ""),
                (r.observaciones || "").replace(/\n/g, " ")
            ];
            const csvRow = row.map(cell => '"' + String(cell).replace(/"/g, '""') + '"').join(";");
            csvContent += csvRow + "\n";
        });
        
        const blob = new Blob(["\uFEFF" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        const d = new Date();
        link.setAttribute("download", `informes_exportados_${d.getFullYear()}${String(d.getMonth()+1).padStart(2,'0')}${String(d.getDate()).padStart(2,'0')}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const btnExportTop = document.getElementById('btnExportTop');
    if(btnExportTop) btnExportTop.onclick = () => window.exportDashboardToPDF();
    
    const btnExportHistory = document.getElementById('btnExportHistory');
    if(btnExportHistory) btnExportHistory.onclick = () => window.exportDashboardToCSV();

    window.sortHistory = (field) => {
        if(!window.dashboardHistoryData) return;
        
        // Helper interno redundante para asegurar disponibilidad en sort
        const pD = (val) => {
            if (!val) return 0;
            const s = val.toString();
            if (s.includes('T')) {
                const parts = s.split('T')[1].split(':');
                return parseFloat(parts[0]) + (parseFloat(parts[1])/60);
            }
            return parseFloat(s) || 0;
        };

        const dir = window._sortDir === 'asc' ? 'desc' : 'asc';
        window._sortDir = dir;
        window.dashboardHistoryData.sort((a, b) => {
            let vA = a[field], vB = b[field];
            if(field === 'fecha') { 
                const dA = a[field] && a[field].toString().includes('T') ? new Date(a[field]) : new Date((a[field] || "").toString() + 'T12:00:00');
                const dB = b[field] && b[field].toString().includes('T') ? new Date(b[field]) : new Date((b[field] || "").toString() + 'T12:00:00');
                vA = dA.getTime(); vB = dB.getTime(); 
            }
            if(field === 'duracion') { vA = pD(vA); vB = pD(vB); }
            if(field === 'alumnos') { vA = parseFloat(vA) || 0; vB = parseFloat(vB) || 0; }
            if(vA < vB) return dir === 'asc' ? -1 : 1;
            if(vA > vB) return dir === 'asc' ? 1 : -1;
            return 0;
        });
        // Re-render sin fetch
        const body = document.getElementById('historyBody');
        body.innerHTML = window.dashboardHistoryData.map((r, idx) => `
            <tr style="border-bottom: 1px solid var(--border-main);">
                <td data-label="Fecha" style="padding: 12px; font-weight: 600;">${formatDateSafe(r.fecha)}</td>
                ${isAdmin ? `<td data-label="Trainer" style="padding: 12px; font-weight: 600; color: var(--xiaomi-orange);">${esc(r.trainer || '-')}</td>` : ''}
                <td data-label="Cuenta" style="padding: 12px; color: var(--text-medium);">${esc(r.cuenta)}</td>
                <td data-label="Método" style="padding: 12px;"><span class="badge ${r.metodologia === 'Classroom' ? 'badge-approved' : 'badge-extra'}">${esc(r.metodologia)}</span></td>
                <td data-label="Alumnos" style="padding: 12px; text-align: center;">${esc(r.alumnos || '0')}</td>
                <td data-label="Horas" style="padding: 12px; text-align: center;">${pD(r.duracion).toFixed(1)}h</td>
                <td data-label="Acciones" style="padding: 12px; text-align: right; white-space: nowrap;">
                    <button onclick="handleHistoryAction('view', ${idx})" class="btn-outline btn-compact" style="border-color: #10b981; color: #10b981;" title="Ver Detalles"><i data-lucide="eye" style="width:14px;"></i></button>
                    <button onclick="handleHistoryAction('duplicate', ${idx})" class="btn-outline btn-compact" style="border-color: #0ea5e9; color: #0ea5e9;" title="Duplicar"><i data-lucide="copy" style="width:14px;"></i></button>
                    <button onclick="handleHistoryAction('edit', ${idx})" class="btn-outline btn-compact" title="Editar"><i data-lucide="edit-2" style="width:14px;"></i></button>
                    <button onclick="handleHistoryAction('delete', ${idx})" class="btn-outline danger btn-compact" style="border-color: #ef4444; color: #ef4444;" title="Eliminar"><i data-lucide="trash-2" style="width:14px;"></i></button>
                </td>
            </tr>
        `).join('');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };

    window.handleHistoryAction = (action, index) => {
        const report = window.dashboardHistoryData[index];
        if(!report) return;

        const pD = (val) => {
            if (!val) return 0;
            const s = val.toString();
            if (s.includes('T')) {
                const parts = s.split('T')[1].split(':');
                return parseFloat(parts[0]) + (parseFloat(parts[1])/60);
            }
            return parseFloat(s) || 0;
        };

        if(action === 'view') {
            const modal = document.getElementById('modalReport');
            const content = document.getElementById('modalContent');
            content.innerHTML = `
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; border-bottom: 1px solid var(--border-main); padding-bottom: 15px; margin-bottom: 15px;">
                    <div><strong style="color:var(--text-muted); font-size:0.75rem; display:block; text-transform:uppercase;">Trainer</strong> <span style="font-weight:700;">${esc(report.trainer)}</span></div>
                    <div><strong style="color:var(--text-muted); font-size:0.75rem; display:block; text-transform:uppercase;">Fecha</strong> <span style="font-weight:700;">${formatDateSafe(report.fecha)}</span></div>
                </div>
                <div style="line-height: 1.8;">
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Metodología:</strong> <span style="font-weight:600;">${esc(report.metodologia)}</span></div>
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Cuenta:</strong> <span style="font-weight:600;">${esc(report.cuenta)} ${report.distribuidor ? `(${esc(report.distribuidor)})` : ''}</span></div>
                    <div style="margin-bottom:12px;"><strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase;">Ubicación:</strong> <span style="font-weight:600;">${esc(report.ciudad)}, ${esc(report.provincia)}</span></div>
                    <hr style="border: 0; border-top: 1px solid var(--border-main); margin: 15px 0;">
                    <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 10px; background:var(--bg-main); padding: 15px; border-radius:12px; margin-bottom:15px; text-align:center;">
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${report.sesiones}</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Sesiones</span></div>
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${report.alumnos}</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Alumnos</span></div>
                        <div><span style="display:block; font-size:1.25rem; font-weight:800; color:var(--xiaomi-orange);">${pD(report.duracion).toFixed(1)}h</span><span style="font-size:0.6rem; text-transform:uppercase; color:var(--text-muted);">Duración</span></div>
                    </div>
                    <hr style="border: 0; border-top: 1px solid var(--border-main); margin: 15px 0;">
                    <p style="margin-bottom:8px;"><strong>Contenidos:</strong> ${esc(report.contenidos)}</p>
                    <p style="margin-bottom:8px;"><strong>Móviles:</strong> ${esc(report.dispositivos || '-')}</p>
                    <p style="margin-bottom:8px;"><strong>Ecosistema:</strong> ${esc(report.dispositivos_no_movil || '-')}</p>
                    <p style="margin-bottom:15px;"><strong>Comentarios:</strong><br><span style="color: var(--text-medium); font-style: italic;">${esc(report.comentarios || 'Sin comentarios')}</span></p>
                    <hr style="border: 0; border-top: 1px solid var(--border-main); margin: 15px 0;">
                    <div style="margin-top:10px;">
                        <strong style="color:var(--text-muted); font-size:0.75rem; text-transform:uppercase; display:block; margin-bottom:12px;">FOTOS:</strong>
                        <div style="display: flex; flex-wrap: wrap; gap: 12px;">
                            ${report.photoLinks ? report.photoLinks.split(/[\n,]+/).filter(url => url.trim().startsWith('http')).map((url, i) => {
                                const p = window.safeExternalUrl ? window.safeExternalUrl(url.trim()) : '';
                                if (!p) return '';
                                const idMatch = p.match(/id=([^&]+)/) || p.match(/\/d\/([^/]+)/);
                                const fileId = idMatch ? idMatch[1] : '';
                                const thumb = fileId ? `https://drive.google.com/thumbnail?id=${fileId}&sz=w300` : p;
                                const fallbackThumb = fileId ? `https://lh3.googleusercontent.com/d/${fileId}=w300` : '';
                                return `
                                    <a href="${esc(p)}" target="_blank" rel="noopener noreferrer" class="report-photo-link" title="Ver foto ${i + 1} en Google Drive">
                                        <img src="${esc(thumb)}" loading="lazy" referrerpolicy="no-referrer" alt="Foto adjunta ${i + 1}" ${fallbackThumb ? `onerror="if(!this.dataset.triedFallback){this.dataset.triedFallback='1';this.src='${esc(fallbackThumb)}';}"` : ''}>
                                    </a>
                                `;
                            }).join('') : '<span style="color:var(--text-muted); font-style:italic; font-size:0.8rem;">No hay fotos adjuntas</span>'}
                        </div>
                    </div>
                </div>
            `;
            modal.style.display = 'flex';
            if (typeof lucide !== 'undefined') lucide.createIcons();
        } else if(action === 'duplicate' || action === 'edit') {
            window.reportEditData = { ...report, mode: action };
            window.location.hash = '#report';
        } else if(action === 'delete') {
            if(!report.id) {
                showToast("Error", "No se puede eliminar: el reporte no tiene un ID válido.");
                return;
            }
            if(!confirm("¿Seguro que quieres eliminar este reporte permanentemente?")) return;
            
            const btn = document.activeElement;
            const originalHTML = btn ? btn.innerHTML : '';
            if(btn) {
                btn.disabled = true;
                btn.innerHTML = '<div class="loader" style="width:12px; height:12px; border-width:2px; border-color:white transparent transparent;"></div>';
            }

            api.deleteReport(report.id).then(res => {
                if(res.status === 'success') {
                    showToast("Eliminado", "Reporte borrado correctamente");
                    loadHistory(true);
                    loadStats(true);
                } else {
                    showToast("Error", res.message || "No se pudo eliminar el reporte");
                    if(btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
                }
            }).catch(e => {
                showToast("Error", "Fallo de conexión o error en el servidor");
                if(btn) { btn.disabled = false; btn.innerHTML = originalHTML; }
            });
        }
    };

    const btnFilter = document.getElementById('btnFilter');
    if(btnFilter) btnFilter.onclick = () => {
        if (!isAdmin) {
            const dYear = document.getElementById('dashboardYear');
            const dMonth = document.getElementById('dashboardMonth');
            const dWeek = document.getElementById('dashboardWeek');
            const hYear = document.getElementById('histFilterYear');
            const hMonth = document.getElementById('histFilterMonth');
            const hWeek = document.getElementById('histFilterWeek');
            if (dYear && hYear && dYear.value) {
                hYear.value = dYear.value;
            }
            if (dMonth && hMonth && dMonth.value) {
                hMonth.value = dMonth.value;
            }
            if (dWeek && hWeek && dWeek.value) {
                injectWeeks(hWeek, weeksList, dWeek.value);
                hWeek.value = dWeek.value;
            }
        }
        loadStats();
        loadHistory();
    };

    const btnClearHistory = document.getElementById('btnClearHistory');
    if(btnClearHistory) btnClearHistory.onclick = () => {
        resetHistoryFilters();
        loadHistory();
    };

    const btnRefreshHistory = document.getElementById('btnRefreshHistory');
    if(btnRefreshHistory) btnRefreshHistory.onclick = () => { 
        loadStats(true);
        loadHistory(true); 
    };

    const historySearch = document.getElementById('historySearch');
    if(historySearch) historySearch.onkeyup = (e) => { if(e.key === 'Enter') loadHistory(); };
    
        // Los cambios de todos los filtros del dashboard e historial usan lectura automática con debounce.
        ['dashboardTarget', 'dashboardDateStart', 'dashboardDateEnd'].forEach(id => {
            document.getElementById(id)?.addEventListener('change', scheduleStats);
        });
        [
            'histFilterTrainer', 'histFilterYear', 'histFilterMonth', 'histFilterWeek',
            'histFilterDateStart', 'histFilterDateEnd', 'histFilterAccount',
            'histFilterDevice', 'histFilterMethod'
        ].forEach(id => {
            document.getElementById(id)?.addEventListener('change', scheduleHistory);
        });
        document.getElementById('dashboardRetry')?.addEventListener('click', () => loadStats(true));
        document.getElementById('historyRetry')?.addEventListener('click', () => loadHistory(true));
        dashboardFiltersReady = true;
        loadStats();
        loadHistory();
    } catch(e) {
        console.error("Dashboard Render Error:", e);
        container.innerHTML = `<div class="glass-card" style="padding:40px; text-align:center;"><h3>Error al cargar el Dashboard</h3><p>${e.message}</p></div>`;
    }
}

let weeklyChart, methodsChart, trainersChart;
let inlineDataLabelsRegistered = false;

function registerInlineDataLabels() {
    if (inlineDataLabelsRegistered || typeof Chart === 'undefined') return;
    Chart.register({
            id: 'inlineDataLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if(meta.hidden) return;
                    meta.data.forEach((bar, index) => {
                        if (!chart.chartArea || !Number.isFinite(bar.x) || !Number.isFinite(bar.y)) return;
                        const data = dataset.data[index];
                        if(data !== 0 && data !== undefined) {
                            ctx.fillStyle = (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')) ? '#ffffff' : '#4b5563';
                            ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            
                            let textToDraw = data;
                            if (typeof data === 'number' && !Number.isInteger(data)) {
                                textToDraw = data.toFixed(1);
                            }
                            
                            const textWidth = ctx.measureText(textToDraw).width;
                            if(chart.options.indexAxis === 'y') {
                                if (bar.x + 12 + (textWidth/2) > chart.chartArea.right) {
                                    ctx.fillStyle = '#ffffff'; // inside bar, make it white
                                    ctx.fillText(textToDraw, bar.x - 12 - (textWidth/2), bar.y);
                                } else {
                                    ctx.fillText(textToDraw, bar.x + 12 + (textWidth/2), bar.y);
                                }
                            } else {
                                ctx.fillText(textToDraw, bar.x, bar.y - 12);
                            }
                        }
                    });
                });
            }
    });
    inlineDataLabelsRegistered = true;
}

async function renderCharts(data, isCurrent = () => window.location.hash === '#dashboard') {
    const originalCanvas = document.getElementById('chartWeekly');
    if (!data || !isCurrent() || !originalCanvas) return false;
    const normalized = normalizeDashboardCharts(data);
    if (typeof Chart === 'undefined') {
        try {
            await window.loadScriptOnce('https://cdn.jsdelivr.net/npm/chart.js@4.4.8/dist/chart.umd.min.js', 'Chart');
        } catch (error) {
            console.error('No se pudo cargar Chart.js.', error);
            return false;
        }
    }
    if (!isCurrent() || originalCanvas !== document.getElementById('chartWeekly')) return false;
    registerInlineDataLabels();
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const isMobile = window.innerWidth < 768;
    const primaryColor = getComputedStyle(document.querySelector('.btn-primary') || document.documentElement).backgroundColor || '#ff6700';
    const primaryGradientEnd = isDark ? 'oklch(78% 0.16 55)' : 'oklch(78% 0.17 55)';
    const secondaryColor = isDark ? '#334155' : '#cbd5e0';
    const secondaryGradientEnd = isDark ? '#1e293b' : '#f1f5f9';
    const gridColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.12)';
    const textColor = isDark ? '#777777' : '#888888';
    const isLandscape = window.innerHeight < window.innerWidth && isMobile;
    const fontSize = isMobile ? (isLandscape ? 8 : 9) : 12;
    const tickSize = isMobile ? (isLandscape ? 7 : 8) : 11;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    try {
        // Configuración global de Chart.js
        Chart.defaults.font.family = "'Inter', 'Outfit', sans-serif";
        Chart.defaults.color = textColor;
        Chart.defaults.borderColor = gridColor;
        Chart.defaults.animation = reducedMotion ? false : { duration: 420, easing: 'easeOutQuart' };

        const createGrad = (ctx, start, end) => {
            if (!ctx) return start;
            try {
                const g = ctx.createLinearGradient(0, 0, 0, 300);
                g.addColorStop(0, start);
                g.addColorStop(1, end);
                return g;
            } catch(e) { return start; }
        };

        const applyChart = (canvas, previous, config) => {
            try {
                return updateDashboardChart(canvas, previous, config);
            } catch (err) {
                const existing = Chart.getChart?.(canvas) || previous;
                try { existing?.destroy?.(); } catch (_) {}
                return new Chart(canvas.getContext('2d'), config);
            }
        };

        // --- Weekly Chart ---
        const canvasW = document.getElementById('chartWeekly');
        if (!canvasW) return false;
        const ctxW = canvasW.getContext('2d');

        
        const gradOrange = createGrad(ctxW, primaryColor, primaryGradientEnd);
        const gradGray = createGrad(ctxW, secondaryColor, secondaryGradientEnd);

        weeklyChart = applyChart(canvasW, weeklyChart, {
            type: 'bar',
            data: { 
                labels: normalized.weekly.labels, 
                datasets: [
                    { 
                        label: 'Sesiones', 
                        data: normalized.weekly.sessions, 
                        backgroundColor: gradOrange, 
                        borderRadius: 12,
                        hoverBackgroundColor: primaryColor,
                        maxBarThickness: 45
                    },
                    { 
                        label: 'Alumnos', 
                        data: normalized.weekly.students, 
                        backgroundColor: gradGray, 
                        borderRadius: 12,
                        hoverBackgroundColor: secondaryColor,
                        maxBarThickness: 45
                    }
                ]
            },
            options: { 
                responsive: true, 
                maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
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
        if (!canvasM) return false;
        const ctxM = canvasM.getContext('2d');

        const methodValues = normalized.methods.values;
        methodsChart = applyChart(canvasM, methodsChart, {
            type: 'bar',
            data: { 
                labels: normalized.methods.labels, 
                datasets: [{ 
                    label: 'Horas',
                    data: methodValues,
                    backgroundColor: methodValues.map((_, index) => index === 0 ? primaryColor : secondaryColor),
                    borderWidth: 0,
                    borderRadius: 12,
                    borderSkipped: false,
                    maxBarThickness: 24
                }] 
            },
            options: { 
                indexAxis: 'y',
                responsive: true, 
                maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, 
                animation: reducedMotion ? false : { duration: 360, easing: 'easeOutQuart' },
                layout: { padding: isMobile ? { top: 6, bottom: 6, left: 0, right: 8 } : { top: 8, right: 12 } },
                plugins: { 
                    legend: { display: false },
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
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        grid: { color: gridColor, drawBorder: false },
                        ticks: { color: textColor, font: { size: tickSize }, maxTicksLimit: 4 }
                    },
                    y: {
                        grid: { display: false },
                        ticks: { color: textColor, font: { size: tickSize, weight: 600 } }
                    }
                }
            }
        });

        // --- Trainers Chart (Admin) ---
        if(data.adminStats && document.getElementById('chartTrainers')) {
            const ctxT = document.getElementById('chartTrainers').getContext('2d');

            const trainerStats = data.adminStats.byTrainer || {};
            const names = Object.keys(trainerStats);
            
            const gradT_Orange = createGrad(ctxT, primaryColor, primaryGradientEnd);
            const gradT_Gray = createGrad(ctxT, secondaryColor, secondaryGradientEnd);

            trainersChart = applyChart(document.getElementById('chartTrainers'), trainersChart, {
                type: 'bar',
                data: {
                    labels: names,
                    datasets: [
                        { label: 'Personas', data: names.map(n => trainerStats[n]?.alumnos || 0), backgroundColor: gradT_Orange, borderRadius: 12, maxBarThickness: 24, borderWidth: 0, borderSkipped: false },
                        { label: 'Sesiones', data: names.map(n => trainerStats[n]?.sesiones || 0), backgroundColor: gradT_Gray, borderRadius: 12, maxBarThickness: 24, borderWidth: 0, borderSkipped: false }
                    ]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
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
        showDashboardEmptyState(canvasW, normalized.weekly.sessions.every(n => n === 0) && normalized.weekly.students.every(n => n === 0), 'Sin actividad para los filtros seleccionados.');
        showDashboardEmptyState(canvasM, !normalized.methods.values.some(n => n !== 0), 'Sin horas registradas para estos filtros.');
        return true;
    } catch(e) { console.error("Error renderCharts:", e); return false; }
}
window.destroyDashboardCharts = () => {
    const charts = new Set([weeklyChart, methodsChart, trainersChart]);
    if (typeof Chart !== 'undefined') {
        ['chartWeekly', 'chartMethods', 'chartTrainers'].forEach(id => {
            const canvas = document.getElementById(id);
            if (canvas) charts.add(Chart.getChart?.(canvas));
        });
    }
    charts.forEach(chart => chart?.destroy?.());
    weeklyChart = null;
    methodsChart = null;
    trainersChart = null;
};
window.renderDashboard = renderDashboard;


function normalizeDashboardSelection(value, multiple) {
    if (!multiple) return Array.isArray(value) ? value[0] || 'Todos' : value || 'Todos';
    const values = (Array.isArray(value) ? value : String(value || '').split(','))
        .map(item => String(item).trim()).filter(Boolean);
    if (!values.length) return ['Todos'];
    if (values[values.length - 1] === 'Todos') return ['Todos'];
    return Array.from(new Set(values.filter(item => item !== 'Todos')));
}

function normalizeDashboardCharts(data) {
    const list = (...values) => values.find(Array.isArray) || [];
    const labels = list(data.chartLabels, data.labels).map(String);
    const sessions = list(data.chartSesiones, data.sesiones);
    const students = list(data.chartAlumnos, data.alumnos);
    const methodLabels = list(data.pieLabels, data.methodLabels).map(String);
    const methodValues = list(data.pieData, data.methodData);
    const number = n => Number.isFinite(Number(n)) ? Number(n) : 0;
    return {
        weekly: {
            labels: labels.length ? labels : ['Sin datos'],
            sessions: labels.length ? labels.map((_, i) => number(sessions[i])) : [0],
            students: labels.length ? labels.map((_, i) => number(students[i])) : [0]
        },
        methods: { labels: methodLabels, values: methodLabels.map((_, i) => number(methodValues[i])) }
    };
}

function updateDashboardChart(canvas, previous, config) {
    const chart = Chart.getChart?.(canvas) || previous;
    if (chart && chart.canvas === canvas) {
        const oldData = chart.data, oldOptions = chart.config.options;
        try {
            chart.data = config.data;
            chart.options = config.options;
            chart.update('none');
            return chart;
        } catch (error) {
            chart.data = oldData;
            chart.options = oldOptions;
            try { chart.update('none'); } catch (_) { /* La lectura anterior permanece disponible. */ }
            throw error;
        }
    }
    return new Chart(canvas.getContext('2d'), config);
}

function showDashboardEmptyState(canvas, empty, message) {
    let status = canvas.parentElement.querySelector('.dashboard-chart-empty');
    if (!status) {
        status = document.createElement('p');
        status.className = 'dashboard-chart-empty';
        canvas.parentElement.appendChild(status);
    }
    status.textContent = message;
    status.hidden = !empty;
}
