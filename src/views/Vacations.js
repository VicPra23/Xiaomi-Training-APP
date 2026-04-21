window.adminAction = {
    updateStatus: async (id, status) => {
        if(!confirm(`¿Deseas ${status.toLowerCase()} esta solicitud?`)) return;
        const btn = event.target; btn.disabled = true; btn.innerText = '...';
        try {
            const res = await sendPost('updateRequest', { id, status });
            if(res.status === 'success') { if(window.refreshVacationsData) window.refreshVacationsData(); }
            else showToast('Error', 'No se pudo actualizar', '#vacations');
        } catch(e) { console.error(e); }
        btn.disabled = false; btn.innerText = status === 'Aprobado' ? 'Ok' : 'No';
    },
    modifyExtra: async (user, delta) => {
        const el = document.getElementById(`extra-${user}`); if (!el) return;
        let current = parseFloat(el.innerText) || 0;
        if (current <= 0 && delta < 0) return;
        const newVal = current + delta;
        el.innerText = newVal;
        const btnMinus = event.target.closest('div').querySelector('.btn-minus');
        if (btnMinus) btnMinus.disabled = (newVal <= 0);
        try {
            await sendPost('modifyExtra', { user: user, delta: delta });
            if(window.refreshVacationsData) window.refreshVacationsData();
        } catch(e) { console.error(e); }
    },
    processSelection: async (opAction, user, dates) => {
        if (!dates || dates.length === 0) return;
        const btn = event.target; btn.disabled = true;
        const oldText = btn.innerText; btn.innerText = '...';
        try {
            const res = await sendPost('adminProcessSelection', { opAction, user, dates });
            if (res.status === 'success') {
                showToast("✅ ¡Hecho!", "Calendario actualizado", "#vacations");
                if(window.refreshVacationsData) window.refreshVacationsData();
            } else { showToast("Error", res.message, "#vacations"); }
        } catch(e) { console.error(e); }
        btn.disabled = false; btn.innerText = oldText;
    }
};

function renderVacations(container) {
    const sessionData = getSessionData();
    const currentUser = sessionData ? sessionData.user : 'Desconocido';
    const isAdmin = sessionData && sessionData.role && (sessionData.role.toLowerCase() === 'admin');
    
    let targetUser = currentUser;
    let allTrainers = [];
    let holidayDates = [];
    let vacationStats = { baseTotal: 23, extraTotal: 0, usedBase: 0, usedExtra: 0, pendingBase: 0, pendingExtra: 0, history: [] };
    let selection = { start: null, end: null };
    const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];

    window.refreshVacationsData = () => { selection = {start:null,end:null}; loadData(); };

    const html = `
        <div class="vaca-module fade-in">
            <header class="vaca-header">
                <h2 style="font-size: 2.2rem; letter-spacing: -0.03em;"><i data-lucide="umbrella" style="color: var(--xiaomi-orange); width: 32px; vertical-align: middle; margin-right: 12px;"></i> Gestión de Vacaciones</h2>
                <p style="color: var(--text-medium); font-weight: 500; font-size: 1.1rem; margin-top: 10px;">Planifica tus días de descanso, recarga pilas y desconecta del mundo.</p>
            </header>

            <div class="stats-grid">
                <div class="glass-card stat-card">
                    <div class="stat-icon"><i data-lucide="calendar-check"></i></div>
                    <small>Disponibles</small>
                    <h2 id="statBase">--</h2>
                </div>
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(33, 150, 243, 0.1); color: #2196f3;"><i data-lucide="award"></i></div>
                    <small>Días Extras</small>
                    <h2 id="statExtra">--</h2>
                </div>
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(255, 193, 7, 0.1); color: #ffc107;"><i data-lucide="clock"></i></div>
                    <small>Pendientes</small>
                    <h2 id="statPending">--</h2>
                </div>
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(76, 175, 80, 0.1); color: #4caf50;"><i data-lucide="check-circle"></i></div>
                    <small>Aprobadas</small>
                    <h2 id="statAccepted">--</h2>
                </div>
                <div class="glass-card stat-card">
                    <div class="stat-icon" style="background: rgba(156, 39, 176, 0.1); color: #9c27b0;"><i data-lucide="star"></i></div>
                    <small>Extras Aprobados</small>
                    <h2 id="statExtraAcc">--</h2>
                </div>
            </div>

            <div id="adminGlobalPanel" class="admin-panel" style="display: none; background: var(--bg-card); border: 1px solid var(--border-main); border-radius: 32px; box-shadow: var(--shadow-lg); margin-bottom: 3rem; overflow: hidden;">
                <h4 id="adminTitle" style="padding: 2rem; margin:0; color: var(--text-main); display: flex; align-items: center; gap: 12px; border-bottom: 1px solid var(--border-main); font-size: 1.1rem;"><i data-lucide="inbox" style="color: var(--xiaomi-orange);"></i> Peticiones del equipo</h4>
                <div style="overflow-x: auto;">
                    <table class="admin-table">
                        <thead style="background: var(--bg-main);">
                            <tr>
                                <th style="padding:12px; color:var(--text-muted);">Usuario</th>
                                <th style="padding:12px; color:var(--text-muted);">Tipo</th>
                                <th style="padding:12px; text-align:center; color:var(--text-muted);">Días</th>
                                <th style="padding:12px; text-align:center; color:var(--text-muted);">Acciones</th>
                            </tr>
                        </thead>
                        <tbody id="globalPendingTable"></tbody>
                    </table>
                </div>
            </div>

            <div class="main-layout">
                <div class="sidebar-left">
                    <div id="adminUsersPanel" class="sidebar-panel" style="display: none; border-top: 4px solid var(--xiaomi-orange);">
                        <h5 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="users" style="width:16px;"></i> Gestión de Usuarios</h5>
                        <div id="adminUserTableContainer"></div>
                    </div>

                    <div class="sidebar-panel">
                        <h5 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 8px;"><i data-lucide="history" style="width:16px;"></i> Historial de Solicitudes</h5>
                        <div id="myHistory" style="font-size: 0.85rem;">Cargando...</div>
                    </div>
                </div>

                <div class="calendar-wrapper">
                    <div class="calendar-header" style="flex-wrap:wrap; gap:15px;">
                        <div id="calendarTitleContainer" style="display:flex; align-items:center; gap:10px;">
                            <div class="calendar-title" id="vSedeTitle" style="margin:0;">Cargando...</div>
                            <div id="userSelectorContainer"></div>
                        </div>
                        <div class="legend">
                            <div class="legend-item"><div class="legend-box lb-a"></div> Ace</div>
                            <div class="legend-item"><div class="legend-box lb-p"></div> Sol</div>
                            <div class="legend-item"><div class="legend-box lb-e"></div> Ext</div>
                            <div class="legend-item"><div class="legend-box lb-s"></div> Sel</div>
                        </div>
                    </div>
                    <div id="yearGrid" class="year-grid"></div>
                </div>

                <div class="sidebar-right">
                    <div class="sidebar-panel" style="position: sticky; top: 100px;" id="requestPanel">
                        <div id="userRequestUI">
                            <h4 style="margin-bottom: 1.2rem; padding-bottom: 10px; border-bottom: 2px solid #edf2f7;">Solicitar Días</h4>
                            <div class="radio-group" id="t-group">
                                <label class="radio-label">
                                    <input type="radio" name="vSelector" value="Vacaciones" checked> <span><i data-lucide="sun" style="width:14px; vertical-align:middle;"></i> Vacaciones</span>
                                </label>
                                <label class="radio-label">
                                    <input type="radio" name="vSelector" value="Dias Extras"> <span><i data-lucide="star" style="width:14px; vertical-align:middle;"></i> Días extras</span>
                                </label>
                            </div>
                            <div id="r-summary" style="background: var(--xiaomi-orange-light); border-radius: var(--border-radius-sm); padding: 15px; margin-bottom: 1.5rem; text-align: center;">
                                <div id="c-text" style="color: var(--graphite-light); font-weight: 700; font-size: 0.95rem;">Clic inicio... clic fin</div>
                                <div id="s-text" style="font-size: 0.8rem; color: var(--graphite-medium); margin-top: 5px;">Selecciona en el calendario</div>
                            </div>
                            <button id="btnSub" class="btn-primary" style="width:100%; height:50px; border-radius: 12px; font-size:1.05rem;" disabled>Enviar Petición</button>
                        </div>

                        <div id="adminRequestUI" style="display:none;">
                            <h4 style="margin-bottom: 1.2rem; padding-bottom: 10px; border-bottom: 2px solid var(--xiaomi-orange); color:var(--text-main); display: flex; align-items: center; gap: 10px;"><i data-lucide="shield-check"></i> Validar Selección</h4>
                            <div id="admin-summary" style="background: var(--xiaomi-orange-light); border-radius: 12px; padding: 15px; margin-bottom: 1.5rem; text-align: center;">
                                <div id="admin-c-text" style="color: var(--xiaomi-orange); font-weight: 700; font-size: 0.9rem;">Selecciona días...</div>
                                <div id="admin-s-text" style="font-size: 0.75rem; color: var(--text-medium); margin-top: 5px;">Gestionando a <b id="targetLabel"></b></div>
                            </div>
                            <div style="display:flex; flex-direction:column; gap:10px;">
                                <button id="btnAdminVac" class="btn-primary" style="background:#10b981;" disabled><i data-lucide="check-circle"></i> Validar Vacaciones</button>
                                <button id="btnAdminExt" class="btn-primary" style="background:#3b82f6;" disabled><i data-lucide="star"></i> Validar Días Extras</button>
                                <button id="btnAdminDel" class="btn-primary" style="background:#ef4444;" disabled><i data-lucide="trash-2"></i> Eliminar Selección</button>
                                <hr style="margin:5px 0; border:none; border-top:1px solid var(--border-main);">
                                <button class="btn-secondary" style="width:100%; font-size:0.75rem;" onclick="location.reload()">Volver a mi vista</button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    `;

    container.innerHTML = html;
    
    // Listeners para cambio de tipo de día (Vacaciones / Extras)
    document.querySelectorAll('input[name="vSelector"]').forEach(input => {
        input.addEventListener('change', updateSummary);
    });

    loadData();

    async function loadData() {
        try {
            const [uRes, aRes] = await Promise.all([
                sendJSONP('getVacationData', { user: targetUser }),
                isAdmin ? sendJSONP('getAdminData') : Promise.resolve({ status: 'skip' })
            ]);

            if (uRes.status === 'success') {
                holidayDates = uRes.festivos || [];
                document.getElementById('vSedeTitle').innerText = "Calendario de";
                
                const hist = uRes.history || [];
                const uB_A = hist.filter(h => h.status === 'Aprobado' && h.type === 'Vacaciones').reduce((s, h) => s + (parseFloat(h.count)||0), 0);
                const uE_A = hist.filter(h => h.status === 'Aprobado' && h.type !== 'Vacaciones').reduce((s, h) => s + (parseFloat(h.count)||0), 0);
                const pB = hist.filter(h => h.status === 'Pendiente' && h.type === 'Vacaciones').reduce((s, h) => s + (parseFloat(h.count)||0), 0);
                const pE = hist.filter(h => h.status === 'Pendiente' && h.type !== 'Vacaciones').reduce((s, h) => s + (parseFloat(h.count)||0), 0);

                vacationStats = { 
                    baseTotal: 23, 
                    extraTotal: (uRes.stats && uRes.stats.extraTotal) || 0, 
                    usedBase: uB_A, 
                    usedExtra: uE_A, 
                    pendingBase: pB, 
                    pendingExtra: pE, 
                    history: hist 
                };
                updateStatsUI();
                renderHistory(hist);
                buildCalendar();
            }

            if (isAdmin && aRes && aRes.status === 'success') { 
                adminData = aRes; 
                renderAdminUI(); 
                
                // Mover aquí la población del selector para asegurar que adminData existe
                if (!document.getElementById('userSelect')) {
                    allTrainers = adminData.allUsers;
                    renderUserSelector();
                }

                const rUI = document.getElementById('adminRequestUI'); if(rUI) rUI.style.display = 'block';
                const uUI = document.getElementById('userRequestUI'); if(uUI) uUI.style.display = 'none';
                const tLB = document.getElementById('targetLabel'); if(tLB) tLB.innerText = targetUser;
            }
        } catch (e) { 
            console.error("Shielding error in loadData:", e); 
            showToast("Error de carga", "No se pudo sincronizar con el servidor. Reintentando...", "danger");
        }
    }

    function renderUserSelector() {
        const cont = document.getElementById('userSelectorContainer'); if(!cont) return;
        cont.innerHTML = `<select id="userSelect" class="form-control" style="font-weight:bold; color:var(--xiaomi-orange); border-color:var(--xiaomi-orange); padding:2px 10px;">
            ${allTrainers.map(u => `<option value="${u.user}" ${u.user === targetUser ? 'selected' : ''}>${u.name}</option>`).join('')}
        </select>`;
        document.getElementById('userSelect').onchange = (e) => {
            targetUser = e.target.value;
            selection = {start:null,end:null};
            loadData();
        };
    }

    function updateStatsUI() {
        const sB = document.getElementById('statBase'); if(!sB) return;
        const sE = document.getElementById('statExtra'); if(!sE) return;
        const sEA = document.getElementById('statExtraAcc'); if(!sEA) return;
        const sP = document.getElementById('statPending'); if(!sP) return;
        const sA = document.getElementById('statAccepted'); if(!sA) return;

        sB.innerText = Math.max(0, vacationStats.baseTotal - (vacationStats.usedBase + vacationStats.pendingBase));
        sE.innerText = Math.max(0, vacationStats.extraTotal - (vacationStats.usedExtra + vacationStats.pendingExtra));
        sEA.innerText = Math.round(vacationStats.usedExtra);
        sP.innerText = Math.round(vacationStats.pendingBase + vacationStats.pendingExtra);
        sA.innerText = Math.round(vacationStats.usedBase);
    }

    function buildCalendar() {
        const grid = document.getElementById('yearGrid'); if (!grid) return;
        grid.innerHTML = "";
        let start = new Date(2026, 1, 1);
        for(let i=0; i<12; i++) {
            const mDate = new Date(start.getFullYear(), start.getMonth() + i, 1);
            grid.appendChild(createMonthCard(mDate.getFullYear(), mDate.getMonth()));
        }
    }

    function createMonthCard(y, m) {
        const card = document.createElement('div'); card.className = "month-card";
        const title = document.createElement('div'); title.className = "month-title";
        title.innerText = monthNames[m] + " " + y;
        card.appendChild(title);

        const dGrid = document.createElement('div'); dGrid.className = "days-grid";
        ["L","M","M","J","V","S","D"].forEach(d => {
            const h = document.createElement('div'); h.className = "day-head"; h.innerText = d; dGrid.appendChild(h);
        });

        const first = new Date(y, m, 1);
        const last = new Date(y, m + 1, 0);
        let offset = first.getDay() === 0 ? 6 : first.getDay() - 1;
        for(let i=0; i<offset; i++) { const e = document.createElement('div'); e.className = "day-cell empty"; dGrid.appendChild(e); }
        
        for(let d=1; d<=last.getDate(); d++) {
            const date = new Date(y, m, d);
            const iso = y + "-" + String(m+1).padStart(2,'0') + "-" + String(d).padStart(2,'0');
            const cell = document.createElement('div');
            cell.className = "day-cell"; cell.innerText = d; cell.dataset.date = iso;
            
            const today = new Date();
            const todayIso = today.getFullYear() + "-" + String(today.getMonth() + 1).padStart(2,'0') + "-" + String(today.getDate()).padStart(2,'0');
            
            if (iso <= todayIso) {
                cell.classList.add("day-past");
            } else {
                if(date.getDay() === 0 || date.getDay() === 6) cell.classList.add("day-wknd", "day-blocked");
                if(holidayDates.includes(iso)) cell.classList.add("day-holiday", "day-blocked");
            }
            
            vacationStats.history.forEach(h => {
                if (isInHistoryRange(date, h.fechas)) {
                   cell.classList.add('day-blocked');
                   if(h.status === 'Aprobado') cell.classList.add(h.type === 'Vacaciones' ? 'day-approved' : 'day-extra-ap');
                   else if(h.status === 'Pendiente') cell.classList.add('day-pending');
                }
            });

            cell.onclick = () => handleDayClick(iso);
            dGrid.appendChild(cell);
        }
        card.appendChild(dGrid);
        return card;
    }

    function handleDayClick(iso) {
        const cell = document.querySelector(`.day-cell[data-date="${iso}"]`);
        const isPast = cell.classList.contains('day-past');
        const isWknd = cell.classList.contains('day-wknd');
        const isHoli = cell.classList.contains('day-holiday');
        
        if (isPast || isWknd || isHoli) return;
        
        if (!isAdmin) {
            if (cell.classList.contains('day-blocked')) return;
        }

        if (!selection.start || (selection.start && selection.end)) { 
            selection.start = iso; selection.end = null; 
        } else {
            const s = new Date(selection.start.split('-').join('/'));
            const c = new Date(iso.split('-').join('/'));
            if (c < s) { selection.start = iso; } else { selection.end = iso; }
        }
        updateCalendarSelection();
        updateSummary();
    }

    function updateCalendarSelection() {
        document.querySelectorAll('.day-cell').forEach(c => {
            c.classList.remove('day-selected', 'day-range');
            const iso = c.dataset.date; if(!iso) return;
            if (iso === selection.start || iso === selection.end) c.classList.add('day-selected');
            else if (selection.start && selection.end && iso > selection.start && iso < selection.end) {
                const d = new Date(iso.split('-').join('/'));
                // No marcar rango en días bloqueados por calendario base (fines de semana/festivos)
                if (d.getDay()!==0 && d.getDay()!==6 && !holidayDates.includes(iso)) c.classList.add('day-range');
            }
        });
    }

    function updateSummary() {
        const isInAdminMode = isAdmin;
        const cEl = document.getElementById(isInAdminMode ? 'admin-c-text' : 'c-text');
        const sEl = document.getElementById(isInAdminMode ? 'admin-s-text' : 's-text');
        const btnMain = document.getElementById('btnSub');
        
        if (!selection.start) {
            if (isInAdminMode) { 
                cEl.innerText = "Selecciona días..."; 
                sEl.innerText = `Gestionando a ${targetUser}`; 
                document.getElementById('btnAdminVac').disabled = true;
                document.getElementById('btnAdminExt').disabled = true;
                document.getElementById('btnAdminDel').disabled = true;
            } else { 
                cEl.innerText = "Clic inicio... clic fin"; 
                sEl.innerText = "Selecciona en el calendario"; 
                btnMain.disabled = true; 
            }
            return;
        }

        let selectedDates = [];
        let s = new Date(selection.start.split('-').join('/')), e = selection.end ? new Date(selection.end.split('-').join('/')) : s;
        let cur = new Date(s);
        while(cur <= e) {
            const iso = cur.getFullYear() + "-" + String(cur.getMonth()+1).padStart(2,'0') + "-" + String(cur.getDate()).padStart(2,'0');
            if(cur.getDay()!==0 && cur.getDay()!==6 && !holidayDates.includes(iso)) selectedDates.push(iso);
            cur.setDate(cur.getDate()+1);
        }

        if (isInAdminMode) {
            const count = selectedDates.length;
            cEl.innerText = `${count} días seleccionados`;
            sEl.innerText = selection.end ? `Del ${s.toLocaleDateString()} al ${e.toLocaleDateString()}` : `Día ${s.toLocaleDateString()}`;
            
            // ANALISIS DE CONTENIDO PARA BOTONES
            const availBase = Math.max(0, vacationStats.baseTotal - (vacationStats.usedBase + vacationStats.pendingBase));
            const availExtra = Math.max(0, vacationStats.extraTotal - (vacationStats.usedExtra + vacationStats.pendingExtra));
            
            // ¿Algún día de la selección ya tiene algo registrado?
            let hasExisting = false;
            selectedDates.forEach(iso => {
                const d = new Date(iso.split('-').join('/'));
                if (vacationStats.history.some(h => isInHistoryRange(d, h.fechas))) hasExisting = true;
            });

            const btnVac = document.getElementById('btnAdminVac');
            const btnExt = document.getElementById('btnAdminExt');
            const btnDel = document.getElementById('btnAdminDel');

            btnVac.disabled = (count === 0 || count > availBase);
            btnExt.disabled = (count === 0 || count > availExtra);
            btnDel.disabled = (count === 0 || !hasExisting);

            // Block adding if selection contains ANY day-past
            let hasPast = Array.from(document.querySelectorAll('.day-selected, .day-range')).some(c => c.classList.contains('day-past'));
            btnVac.disabled = (count === 0 || count > availBase || hasPast);
            btnExt.disabled = (count === 0 || count > availExtra || hasPast);

            // Feedback visual de error si el saldo es insuficiente o fecha bloqueada
            if (hasPast) {
                btnVac.title = "No se puede adjudicar hoy o en fechas pasadas.";
                btnVac.style.opacity = "0.5";
                btnExt.title = "No se puede adjudicar hoy o en fechas pasadas.";
                btnExt.style.opacity = "0.5";
            } else {
                if (count > availBase) {
                    btnVac.title = "Saldo insuficiente de vacaciones";
                    btnVac.style.opacity = "0.5";
                } else {
                    btnVac.title = "";
                    btnVac.style.opacity = "1";
                }
                if (count > availExtra) {
                    btnExt.title = "Saldo insuficiente de días extras";
                    btnExt.style.opacity = "0.5";
                } else {
                    btnExt.title = "";
                    btnExt.style.opacity = "1";
                }
            }
            
            btnVac.onclick = () => window.adminAction.processSelection('add_vacation', targetUser, selectedDates);
            btnExt.onclick = () => window.adminAction.processSelection('add_extra', targetUser, selectedDates);
            btnDel.onclick = () => window.adminAction.processSelection('remove', targetUser, selectedDates);
            
        } else {
            const count = selectedDates.length;
            cEl.innerText = `${count} días seleccionados`;
            sEl.innerText = selection.end ? `Del ${s.toLocaleDateString()} al ${e.toLocaleDateString()}` : `Día ${s.toLocaleDateString()}`;
            
            const type = document.querySelector('input[name="vSelector"]:checked').value;
            const availBase = Math.max(0, vacationStats.baseTotal - (vacationStats.usedBase + vacationStats.pendingBase));
            const availExtra = Math.max(0, vacationStats.extraTotal - (vacationStats.usedExtra + vacationStats.pendingExtra));
            
            const isOverBase = (type === 'Vacaciones' && count > availBase);
            const isOverExtra = (type === 'Dias Extras' && count > availExtra);

            if (isOverBase || isOverExtra) {
                btnMain.disabled = true;
                btnMain.style.opacity = "0.5";
                const limit = type === 'Vacaciones' ? availBase : availExtra;
                sEl.innerHTML = `<span style="color:#ef4444; font-weight:bold;">Saldo insuficiente (${limit} disp.)</span>`;
            } else {
                btnMain.disabled = count === 0;
                btnMain.style.opacity = "1";
            }
        }
    }

    function isInHistoryRange(d, rangeStr) {
        if (!rangeStr) return false;
        try {
            const dCheck = new Date(d.getFullYear(), d.getMonth(), d.getDate());
            const targetTime = dCheck.getTime();
            
            const matches = rangeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
            if (!matches) return false;
            
            const parseDate = (s) => {
                const parts = s.split("/");
                let y = parseInt(parts[2]);
                if (y < 100) y += 2000;
                return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
            };
            
            const start = parseDate(matches[0]);
            const end = parseDate(matches[matches.length - 1]);
            return targetTime >= start && targetTime <= end;
        } catch(e) { return false; }
    }

    function renderHistory(hist) {
        const hEl = document.getElementById('myHistory'); if(!hEl) return;
        if(!hist || hist.length === 0) { hEl.innerHTML = "<div style='color:var(--text-muted); padding:15px; text-align:center;'>Sin solicitudes.</div>"; return; }
        hEl.innerHTML = hist.slice().reverse().map(req => `
            <div class="history-item">
                <div>
                    <div style="font-weight:700; font-size:0.85rem; color:var(--text-main);">${req.fechas}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">${req.type} (${req.count}d)</div>
                </div>
                <span class="badge ${req.status==='Aprobado'?'badge-approved':(req.status==='Rechazado'?'badge-rejected':'badge-pending')}">${req.status.slice(0,4)}</span>
            </div>
        `).join('');
    }

    function renderAdminUI() {
        document.getElementById('adminGlobalPanel').style.display = 'block';
        document.getElementById('adminUsersPanel').style.display = 'block';
        const pendingCount = adminData.pendingRequests.length;
        document.getElementById('adminTitle').innerHTML = `📥 Peticiones del equipo ${pendingCount > 0 ? '<span class="badge badge-pending" style="margin-left:10px;">' + pendingCount + ' Pendientes</span>' : ''}`;
        
        const gTable = document.getElementById('globalPendingTable');
        gTable.innerHTML = pendingCount === 0 ? "<tr><td colspan='4' style='text-align:center; padding:20px; color:var(--text-muted); font-weight:600;'>No hay peticiones pendientes</td></tr>" : 
            adminData.pendingRequests.map(req => `
                <tr style="border-bottom: 1px solid var(--border-main);">
                    <td data-label="Usuario"><strong style="color:var(--text-main);">${req.user}</strong></td>
                    <td data-label="Tipo"><span class="badge ${req.type==='Vacaciones'?'badge-pending':'badge-extra'}">${req.type.slice(0,3)}</span></td>
                    <td data-label="Días" style="text-align:center;"><b style="color:var(--text-main);">${req.count}</b></td>
                    <td data-label="Acciones" style="text-align:center;">
                        <div style="display:flex; gap:5px; justify-content:center;">
                            <button class="btn-primary btn-compact" style="background:#10b981;" onclick="window.adminAction.updateStatus('${req.id}', 'Aprobado')">OK</button>
                            <button class="btn-primary btn-compact" style="background:#f44336;" onclick="window.adminAction.updateStatus('${req.id}', 'Rechazado')">NO</button>
                        </div>
                    </td>
                </tr>`).join('');
            
        const uContainer = document.getElementById('adminUserTableContainer');
        uContainer.innerHTML = adminData.allUsers.map(u => `
            <div class="history-item">
                <div>
                    <div style="font-weight:700; font-size:0.8rem; color:var(--text-main);">${u.name}</div>
                    <div style="font-size:0.7rem; color:var(--text-muted);">V: <b style="color:var(--xiaomi-orange);">${u.baseAvail}</b> | E: <b id="extra-${u.user}" style="color:#2196f3;">${u.extraAvail}</b></div>
                </div>
                <div style="display:flex; flex-direction:column; gap:4px;">
                    <button class="btn-secondary btn-compact" style="padding:2px 8px;" onclick="window.adminAction.modifyExtra('${u.user}', 1)">+</button>
                    <button class="btn-secondary btn-compact btn-minus" style="padding:2px 8px;" onclick="window.adminAction.modifyExtra('${u.user}', -1)" ${u.extraTotal <= 0 ? 'disabled' : ''}>-</button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('btnSub').onclick = async () => {
        const btn = document.getElementById('btnSub'); btn.disabled = true; btn.innerText = 'Enviando...';
        const laborables = [];
        let s = new Date(selection.start.split('-').join('/')), e = selection.end ? new Date(selection.end.split('-').join('/')) : s;
        let cur = new Date(s);
        while(cur <= e) {
            const iso = cur.getFullYear() + "-" + String(cur.getMonth() + 1).padStart(2,'0') + "-" + String(cur.getDate()).padStart(2,'0');
            if(cur.getDay()!==0 && cur.getDay()!==6 && !holidayDates.includes(iso)) laborables.push(iso);
            cur.setDate(cur.getDate()+1);
        }
        try {
            await sendPost('requestVacation', { user: currentUser, type: document.querySelector('input[name="vSelector"]:checked').value, dates: laborables });
            showToast("✅ ¡Enviado!", "Tu solicitud ha sido enviada.", "#vacations");
            selection = {start:null,end:null}; loadData();
        } catch(e) { console.error(e); btn.disabled = false; btn.innerText = 'Enviar Petición'; }
    };
}
window.renderVacations = renderVacations;
