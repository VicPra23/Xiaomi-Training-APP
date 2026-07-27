const calendarCache = {};

function renderCalendar(container) {
    const MONTHS = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
    const DAYS = ["Lun", "Mar", "Mié", "Jue", "Vie", "Sáb", "Dom"];
    const categories = [
        { id: "eci", label: "ECI", color: "#00c853" },
        { id: "mm", label: "MM", color: "#d0021b" },
        { id: "crf", label: "CRF", color: "#2196f3" },
        { id: "mistores", label: "Mi Stores", color: "#ffb800" },
        { id: "osp", label: "OSP", color: "#ff6700" },
        { id: "vdf", label: "VDF", color: "#f44336" },
        { id: "mmy", label: "MMY", color: "#9c27b0" },
        { id: "tme", label: "TME", color: "#00bcd4" },
        { id: "interno", label: "Interno", color: "#ffeb3b" },
        { id: "materiales", label: "Materiales", color: "#795548" },
        { id: "otros", label: "Otros", color: "#607d8b" }
    ];

    const now = new Date();
    const session = getSessionData();
    const currentUser = session ? session.user : "";
    const isAdmin = Boolean(session && session.role === "Admin");
    let selectedYear = now.getFullYear();
    let calendarData = null;
    let suggestionCatalog = [];
    let trainerFilter = "";
    let hideWeekends = false;
    let monthObserver = null;

    const createLocalDate = (year, month, day) => new Date(year, month, day, 0, 0, 0, 0);
    const toISO = (date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
    const todayISO = toISO(now);
    const deepCopyItems = (items) => (items || []).map(item => ({ text: String(item.text || ""), category: item.category || "otros" }));
    const escapeHTML = (value) => String(value ?? "").replace(/[&<>"']/g, char => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));

    container.innerHTML = `
        <section class="calendar-module continuous-calendar fade-in" aria-labelledby="calendar-title">
            <header class="calendar-command-bar">
                <div class="calendar-title-group">
                    <span class="calendar-eyebrow">Planificación anual</span>
                    <h2 id="calendar-title">Calendario <strong id="calendarActiveMonth">${MONTHS[now.getMonth()]}</strong></h2>
                    <p>Desplázate para recorrer el año. Pulsa un día para planificarlo.</p>
                </div>
                <div class="calendar-primary-actions">
                    <button id="calendarToday" class="btn-primary calendar-today-btn" type="button">
                        <i data-lucide="locate-fixed"></i><span>Hoy</span>
                    </button>
                    <label class="calendar-year-control">
                        <span>Año</span>
                        <select id="calendarYear" aria-label="Seleccionar año">
                            ${Array.from({ length: 5 }, (_, index) => now.getFullYear() - 2 + index)
                                .map(year => `<option value="${year}" ${year === selectedYear ? "selected" : ""}>${year}</option>`).join("")}
                        </select>
                    </label>
                </div>
            </header>

            <div class="calendar-tool-row">
                <label class="calendar-search">
                    <i data-lucide="search"></i>
                    <input id="calendarTrainerSearch" type="search" placeholder="Buscar formador…" autocomplete="off">
                </label>
                <label class="calendar-weekend-toggle">
                    <input id="calendarWeekendToggle" type="checkbox">
                    <span>Ocultar fin de semana</span>
                </label>
                <button id="calendarClipboardStatus" type="button" class="calendar-clipboard-status" aria-live="polite">
                    <i data-lucide="clipboard"></i><span>Portapapeles vacío</span>
                </button>
            </div>

            <details class="calendar-legend" open>
                <summary><i data-lucide="palette"></i><span>Leyenda de actividades</span><small>Colores del calendario</small></summary>
                <div class="calendar-legend-grid">
                    ${categories.map(category => `
                        <div class="calendar-legend-item"><span class="calendar-legend-swatch cat-${category.id}"></span><strong>${category.label}</strong></div>
                    `).join("")}
                    <div class="calendar-legend-item"><span class="calendar-legend-swatch calendar-legend-holiday"></span><strong>Festivo</strong></div>
                    <div class="calendar-legend-item"><span class="calendar-legend-swatch calendar-legend-vacation"></span><strong>Vacaciones</strong></div>
                </div>
            </details>

            <nav id="calendarMonthRail" class="calendar-month-rail" aria-label="Ir a un mes">
                ${MONTHS.map((month, index) => `
                    <button type="button" data-month="${index}" class="${index === now.getMonth() ? "is-active" : ""}">
                        <span>${String(index + 1).padStart(2, "0")}</span>${month.slice(0, 3)}
                    </button>
                `).join("")}
            </nav>

            <div id="calendarLoading" class="calendar-loading" role="status">
                <div class="calendar-loader-mark"></div>
                <div><strong>Preparando el año</strong><span>Sincronizando planificación y ausencias…</span></div>
            </div>
            <div id="calendarYearScroll" class="calendar-year-scroll" tabindex="0" aria-label="Calendario anual con desplazamiento">
                <div id="calendarMonths" class="calendar-months"></div>
            </div>
            <div id="calendarLiveRegion" class="sr-only" aria-live="polite"></div>
        </section>
    `;

    const yearScroll = container.querySelector("#calendarYearScroll");
    const monthRail = container.querySelector("#calendarMonthRail");
    const loading = container.querySelector("#calendarLoading");

    if (typeof lucide !== "undefined") lucide.createIcons();
    updateClipboardStatus();
    loadYear(selectedYear, now.getMonth());

    container.querySelector("#calendarYear").addEventListener("change", event => {
        selectedYear = Number(event.target.value);
        loadYear(selectedYear, selectedYear === now.getFullYear() ? now.getMonth() : 0);
    });

    container.querySelector("#calendarToday").addEventListener("click", async () => {
        if (selectedYear !== now.getFullYear()) {
            selectedYear = now.getFullYear();
            container.querySelector("#calendarYear").value = selectedYear;
            await loadYear(selectedYear, now.getMonth());
        } else {
            scrollToToday(true);
        }
    });

    monthRail.addEventListener("click", event => {
        const button = event.target.closest("[data-month]");
        if (button) scrollToMonth(Number(button.dataset.month), true);
    });

    container.querySelector("#calendarTrainerSearch").addEventListener("input", event => {
        trainerFilter = event.target.value.trim().toLocaleLowerCase("es");
        renderYear({ preserveScroll: true });
    });

    container.querySelector("#calendarWeekendToggle").addEventListener("change", event => {
        hideWeekends = event.target.checked;
        container.classList.toggle("calendar-hide-weekends", hideWeekends);
    });
    container.querySelector("#calendarClipboardStatus").addEventListener("click", async () => {
        const entries = getClipboards();
        if (entries.length) await chooseClipboard(entries, "Portapapeles", "Selecciona una copia para ver su contenido");
    });

    async function loadYear(year, focusMonth = 0) {
        loading.hidden = false;
        yearScroll.classList.add("is-loading");
        const start = `${year}-01-01`;
        const end = `${year}-12-31`;
        const cacheKey = `${start}_${end}`;

        try {
            if (!calendarCache[cacheKey]) {
                const [usersRes, scheduleRes] = await Promise.all([
                    api.getUsersList(),
                    api.getWeekly({ start, end })
                ]);
                if (usersRes.status !== "success" || scheduleRes.status !== "success") {
                    throw new Error(usersRes.message || scheduleRes.message || "No se pudo cargar el calendario.");
                }
                calendarCache[cacheKey] = {
                    users: usersRes.data || [],
                    schedule: scheduleRes.schedule || {},
                    blocks: scheduleRes.blocks || {}
                };
            }
            calendarData = calendarCache[cacheKey];
            buildSuggestionCatalog();
            renderYear();
            window.requestAnimationFrame(() => {
                if (year === now.getFullYear() && focusMonth === now.getMonth()) scrollToToday(false);
                else scrollToMonth(focusMonth, false);
            });
        } catch (error) {
            console.error(error);
            container.querySelector("#calendarMonths").innerHTML = `
                <div class="calendar-error">
                    <i data-lucide="cloud-off"></i>
                    <strong>No hemos podido sincronizar el calendario</strong>
                    <span>${escapeHTML(error.message)}</span>
                    <button type="button" class="btn-secondary" id="calendarRetry">Reintentar</button>
                </div>
            `;
            container.querySelector("#calendarRetry")?.addEventListener("click", () => loadYear(selectedYear, focusMonth));
        } finally {
            loading.hidden = true;
            yearScroll.classList.remove("is-loading");
            if (typeof lucide !== "undefined") lucide.createIcons();
        }
    }

    function buildSuggestionCatalog() {
        const seen = new Map();
        Object.values(calendarData.schedule || {}).forEach(daySchedule => {
            Object.values(daySchedule || {}).forEach(items => {
                (items || []).forEach(item => {
                    const text = String(item.text || "").trim();
                    if (!text) return;
                    const key = text.toLocaleLowerCase("es");
                    const current = seen.get(key);
                    if (current) current.frequency += 1;
                    else seen.set(key, { text, category: item.category || "otros", frequency: 1 });
                });
            });
        });

        try {
            const saved = JSON.parse(localStorage.getItem("xiaomiCalendarSuggestions") || "[]");
            saved.forEach(item => {
                const text = String(item.text || "").trim();
                if (text && !seen.has(text.toLocaleLowerCase("es"))) {
                    seen.set(text.toLocaleLowerCase("es"), { text, category: item.category || "otros", frequency: 1 });
                }
            });
        } catch (error) {
            console.warn("No se pudo recuperar el historial de actividades.", error);
        }

        suggestionCatalog = Array.from(seen.values())
            .sort((a, b) => b.frequency - a.frequency || a.text.localeCompare(b.text, "es"))
            .slice(0, 150);
    }

    function renderYear({ preserveScroll = false } = {}) {
        if (!calendarData) return;
        const oldScrollTop = preserveScroll ? yearScroll.scrollTop : 0;
        const users = calendarData.users.filter(userObj => {
            const userId = typeof userObj === "object" ? userObj.user : userObj;
            const displayName = typeof userObj === "object" && userObj.name ? userObj.name : userId;
            if (userId === "Training Manager" || displayName === "Training Manager") return false;
            if (!trainerFilter) return true;
            return `${displayName} ${userId}`.toLocaleLowerCase("es").includes(trainerFilter);
        });

        container.querySelector("#calendarMonths").innerHTML = MONTHS.map((month, monthIndex) =>
            renderMonth(month, monthIndex, users)
        ).join("");

        bindCalendarInteractions();
        observeMonths();
        if (preserveScroll) yearScroll.scrollTop = oldScrollTop;
        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function renderMonth(monthName, monthIndex, users) {
        const firstDay = createLocalDate(selectedYear, monthIndex, 1);
        const lastDay = createLocalDate(selectedYear, monthIndex + 1, 0);
        const gridStart = new Date(firstDay);
        gridStart.setDate(gridStart.getDate() - ((gridStart.getDay() + 6) % 7));
        const gridEnd = new Date(lastDay);
        gridEnd.setDate(gridEnd.getDate() + (7 - gridEnd.getDay()) % 7);
        const weeks = [];
        const cursor = new Date(gridStart);

        while (cursor <= gridEnd) {
            const week = Array.from({ length: 7 }, (_, index) => {
                const date = new Date(cursor);
                date.setDate(cursor.getDate() + index);
                return date;
            });
            weeks.push(week);
            cursor.setDate(cursor.getDate() + 7);
        }

        const activityCount = Object.entries(calendarData.schedule || {}).reduce((total, [date, byUser]) => {
            if (!date.startsWith(`${selectedYear}-${String(monthIndex + 1).padStart(2, "0")}`)) return total;
            return total + Object.values(byUser || {}).reduce((sum, items) => sum + (items || []).length, 0);
        }, 0);

        return `
            <section class="calendar-month-section" id="calendar-month-${monthIndex}" data-month-section="${monthIndex}">
                <header class="calendar-month-heading">
                    <div><span>${String(monthIndex + 1).padStart(2, "0")}</span><h3>${monthName}</h3></div>
                    <p>${activityCount} ${activityCount === 1 ? "actividad" : "actividades"} planificadas</p>
                </header>
                <div class="calendar-month-weeks">
                    ${users.length ? weeks.map(week => renderWeek(week, monthIndex, users)).join("") : `
                        <div class="calendar-empty-filter">
                            <i data-lucide="user-search"></i><span>No hay formadores que coincidan con la búsqueda.</span>
                        </div>
                    `}
                </div>
            </section>
        `;
    }

    function renderWeek(days, monthIndex, users) {
        const weekNumber = getWeekNumber(days[0]);
        return `
            <div class="calendar-week-card" data-week="${weekNumber}">
                <div class="calendar-week-label">Semana ${weekNumber}</div>
                <div class="calendar-week-table-wrap">
                    <table class="calendar-weekly calendar-continuous-table">
                        <thead><tr>
                            <th class="trainer-col">Formador</th>
                            ${days.map((date, index) => `
                                <th class="${index >= 5 ? "day-wknd" : ""} ${toISO(date) === todayISO ? "is-today" : ""}">
                                    <span>${DAYS[index]}</span><strong>${date.getDate()}</strong>
                                </th>
                            `).join("")}
                        </tr></thead>
                        <tbody>
                            ${users.map(user => renderTrainerRow(user, days, monthIndex)).join("")}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    function renderTrainerRow(userObj, days, monthIndex) {
        const userId = typeof userObj === "object" ? userObj.user : userObj;
        const displayName = typeof userObj === "object" && userObj.name ? userObj.name : userId;
        return `
            <tr>
                <td class="trainer-col" title="${escapeHTML(userId)}">${escapeHTML(displayName)}</td>
                ${days.map((date, index) => renderDayCell(userId, date, monthIndex, index >= 5)).join("")}
            </tr>
        `;
    }

    function renderDayCell(userId, date, monthIndex, isWeekend) {
        const iso = toISO(date);
        const outsideMonth = date.getMonth() !== monthIndex;
        if (outsideMonth) return `<td class="day-cell day-outside ${isWeekend ? "day-wknd" : ""}" aria-hidden="true"></td>`;

        const blocks = calendarData.blocks || {};
        const userBlocks = blocks[userId] || blocks[String(userId).toLowerCase()] || {};
        const vacation = (userBlocks.vacationInfo || []).find(item => isInRange(iso, item.fechas));
        const isHoliday = userBlocks[iso] === "FESTIVO";
        const byDate = calendarData.schedule[iso] || {};
        const items = byDate[userId] || byDate[String(userId).toLowerCase()] || [];
        const canEdit = !vacation && (isAdmin || (userId === currentUser && !isWeekend));
        const blocked = vacation || (!isAdmin && isHoliday) || !canEdit;
        let content = "";

        if (vacation) {
            content = `<div class="assignment-tag calendar-absence">${vacation.status === "Pendiente" ? "Solicitud" : "Vacaciones"}</div>`;
        } else {
            if (isHoliday) content += `<div class="assignment-tag cat-fest">Festivo</div>`;
            content += items.map(item => `
                <div class="assignment-tag cat-${escapeHTML(item.category || "otros")}">${linkify(item.text)}</div>
            `).join("");
            if (!content && canEdit) content = `<span class="calendar-cell-empty">Añadir actividad</span>`;
        }

        return `
            <td class="day-cell ${isWeekend ? "day-wknd" : ""} ${blocked ? "day-blocked" : ""} ${iso === todayISO ? "is-today" : ""}"
                data-date="${iso}" data-user="${escapeHTML(userId)}" tabindex="${canEdit ? "0" : "-1"}"
                aria-label="${escapeHTML(displayDate(date))}, ${escapeHTML(userId)}${items.length ? `, ${items.length} actividades` : ""}">
                <div class="calendar-cell-actions">
                    ${items.length ? `<button type="button" data-copy-day title="Copiar día" aria-label="Copiar actividades de este día"><i data-lucide="copy"></i></button>` : ""}
                    ${canEdit && getClipboards().length ? `<button type="button" data-paste-day title="Pegar en este día" aria-label="Pegar actividades en este día"><i data-lucide="clipboard-paste"></i></button>` : ""}
                    ${canEdit && items.length ? `<button type="button" class="calendar-delete-day" data-delete-day title="Borrar día" aria-label="Borrar todas las actividades de este día"><i data-lucide="trash-2"></i></button>` : ""}
                </div>
                ${content}
            </td>
        `;
    }

    function bindCalendarInteractions() {
        container.querySelectorAll(".day-cell[data-date]").forEach(cell => {
            const getCellItems = () => getItems(cell.dataset.date, cell.dataset.user);
            const editable = cell.tabIndex === 0;

            if (editable) {
                cell.addEventListener("click", event => {
                    if (!event.target.closest(".calendar-cell-actions") && event.target.tagName !== "A") {
                        openEditPanel(cell.dataset.user, cell.dataset.date, getCellItems());
                    }
                });
                cell.addEventListener("keydown", event => {
                    if (event.key === "Enter" || event.key === " ") {
                        event.preventDefault();
                        openEditPanel(cell.dataset.user, cell.dataset.date, getCellItems());
                    }
                    if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "v") {
                        event.preventDefault();
                        pickClipboard().then(clipboard => {
                            if (clipboard?.items?.length) openEditPanel(cell.dataset.user, cell.dataset.date, clipboard.items, true);
                        });
                    }
                });
            }

            cell.querySelector("[data-copy-day]")?.addEventListener("click", event => {
                event.stopPropagation();
                copyDay(getCellItems(), cell.dataset.user, cell.dataset.date);
            });
            cell.querySelector("[data-paste-day]")?.addEventListener("click", async event => {
                event.stopPropagation();
                const clipboard = await pickClipboard();
                if (clipboard?.items?.length) openEditPanel(cell.dataset.user, cell.dataset.date, clipboard.items, true);
            });
            cell.querySelector("[data-delete-day]")?.addEventListener("click", async event => {
                event.stopPropagation();
                await deleteDay(cell.dataset.user, cell.dataset.date, getCellItems(), event.currentTarget);
            });
        });
    }

    function getItems(date, userId) {
        const byUser = calendarData.schedule[date] || {};
        return deepCopyItems(byUser[userId] || byUser[String(userId).toLowerCase()] || []);
    }

    async function copyDay(items, userId, date) {
        const copied = await storeClipboardEntry(items, userId, date);
        if (!copied) return false;
        updateClipboardStatus();
        renderYear({ preserveScroll: true });
        announce(`Día copiado: ${items.length} ${items.length === 1 ? "actividad" : "actividades"}.`);
        return true;
    }

    async function deleteDay(userId, date, items, triggerButton = null) {
        const savedItems = deepCopyItems(items).filter(item => item.text.trim());
        if (!savedItems.length) return false;

        const dateLabel = formatLongDate(date);
        const confirmed = window.confirm(
            `¿Borrar todas las actividades del ${dateLabel}?\n\nGuardaremos una copia en el portapapeles para que puedas recuperarlas con “Pegar”.`
        );
        if (!confirmed) return false;

        const backupStored = await storeClipboardEntry(savedItems, userId, date);
        if (!backupStored) {
            announce("Borrado cancelado: no se eligió una ranura para la copia de seguridad.");
            return false;
        }
        updateClipboardStatus();

        if (triggerButton) {
            triggerButton.disabled = true;
            triggerButton.setAttribute("aria-busy", "true");
            triggerButton.innerHTML = `<span class="calendar-button-spinner"></span>`;
        }

        try {
            const response = await api.saveAssignment({
                user: userId,
                date,
                items: [],
                modifiedBy: currentUser
            });
            if (response.status !== "success") throw new Error(response.message || "No se pudo borrar el día.");

            const daySchedule = calendarData.schedule[date];
            if (daySchedule) {
                delete daySchedule[userId];
                delete daySchedule[String(userId).toLowerCase()];
                if (!Object.keys(daySchedule).length) delete calendarData.schedule[date];
            }

            renderYear({ preserveScroll: true });
            announce("Día borrado. Sus actividades están disponibles en el portapapeles.");
            return true;
        } catch (error) {
            if (triggerButton) {
                triggerButton.disabled = false;
                triggerButton.removeAttribute("aria-busy");
                triggerButton.innerHTML = `<i data-lucide="trash-2"></i>`;
                if (typeof lucide !== "undefined") lucide.createIcons();
            }
            announce(`Error: ${error.message}`, true);
            return false;
        }
    }

    function getClipboards() {
        try {
            const stored = JSON.parse(sessionStorage.getItem("xiaomiCalendarClipboards") || "null");
            if (Array.isArray(stored)) return stored.filter(entry => entry?.items?.length).slice(0, 2);
            const legacy = JSON.parse(sessionStorage.getItem("xiaomiCalendarClipboard") || "null");
            if (legacy?.items?.length) {
                sessionStorage.removeItem("xiaomiCalendarClipboard");
                sessionStorage.setItem("xiaomiCalendarClipboards", JSON.stringify([legacy]));
                return [legacy];
            }
            return [];
        } catch (error) {
            return [];
        }
    }

    function saveClipboards(entries) {
        sessionStorage.setItem("xiaomiCalendarClipboards", JSON.stringify(entries.slice(0, 2)));
    }

    async function storeClipboardEntry(items, userId, date) {
        const entry = { items: deepCopyItems(items), sourceUser: userId, sourceDate: date, copiedAt: Date.now() };
        const entries = getClipboards();
        if (entries.length < 2) entries.push(entry);
        else {
            const selected = await chooseClipboard(entries, "Portapapeles lleno", "Elige la copia que quieres reemplazar");
            if (!selected) return false;
            entries[selected.index] = entry;
        }
        saveClipboards(entries);
        return true;
    }

    async function pickClipboard() {
        const entries = getClipboards();
        if (entries.length === 0) return null;
        if (entries.length === 1) return entries[0];
        const selected = await chooseClipboard(entries, "¿Qué copia quieres pegar?", "Selecciona una de las dos copias disponibles");
        return selected?.entry || null;
    }

    function chooseClipboard(entries, title, subtitle) {
        return new Promise(resolve => {
            const overlay = document.createElement("div");
            overlay.className = "calendar-clipboard-overlay";
            overlay.innerHTML = `
                <section class="calendar-clipboard-picker" role="dialog" aria-modal="true" aria-labelledby="clipboard-picker-title">
                    <header>
                        <div><span>Máximo 2 copias</span><h3 id="clipboard-picker-title">${escapeHTML(title)}</h3><p>${escapeHTML(subtitle)}</p></div>
                        <button type="button" data-close aria-label="Cerrar"><i data-lucide="x"></i></button>
                    </header>
                    <div class="calendar-clipboard-options">
                        ${entries.map((entry, index) => `
                            <button type="button" data-clipboard-index="${index}">
                                <span class="calendar-clipboard-number">0${index + 1}</span>
                                <span class="calendar-clipboard-copy">
                                    <strong>${escapeHTML(formatLongDate(entry.sourceDate))}</strong>
                                    <small>${escapeHTML(entry.sourceUser)} · ${entry.items.length} ${entry.items.length === 1 ? "actividad" : "actividades"}</small>
                                    <em>${escapeHTML(entry.items.map(item => item.text).join(" · "))}</em>
                                </span>
                                <i data-lucide="chevron-right"></i>
                            </button>
                        `).join("")}
                    </div>
                </section>
            `;
            document.body.appendChild(overlay);
            const finish = result => {
                document.removeEventListener("keydown", onKeydown);
                overlay.remove();
                resolve(result);
            };
            const onKeydown = event => { if (event.key === "Escape") finish(null); };
            document.addEventListener("keydown", onKeydown);
            overlay.addEventListener("mousedown", event => { if (event.target === overlay) finish(null); });
            overlay.querySelector("[data-close]").addEventListener("click", () => finish(null));
            overlay.querySelectorAll("[data-clipboard-index]").forEach(button => {
                button.addEventListener("click", () => {
                    const index = Number(button.dataset.clipboardIndex);
                    finish({ index, entry: entries[index] });
                });
            });
            window.requestAnimationFrame(() => {
                overlay.classList.add("is-open");
                overlay.querySelector("[data-clipboard-index]")?.focus();
            });
            if (typeof lucide !== "undefined") lucide.createIcons();
        });
    }

    function updateClipboardStatus() {
        const status = container.querySelector("#calendarClipboardStatus");
        if (!status) return;
        const entries = getClipboards();
        status.classList.toggle("has-content", entries.length > 0);
        status.disabled = entries.length === 0;
        const text = entries.length
            ? `${entries.length}/2 ${entries.length === 1 ? "copia" : "copias"}${entries.length === 2 ? " · elegir al pegar" : ""}`
            : "Portapapeles vacío";
        status.querySelector("span").textContent = text;
    }

    function openEditPanel(userId, date, currentItems, pasted = false) {
        let workingItems = deepCopyItems(currentItems);
        const overlay = document.createElement("div");
        overlay.className = "calendar-editor-overlay";
        overlay.innerHTML = `
            <aside class="calendar-edit-panel" role="dialog" aria-modal="true" aria-labelledby="calendar-editor-title">
                <header class="calendar-editor-header">
                    <div>
                        <span>${escapeHTML(formatLongDate(date))}</span>
                        <h3 id="calendar-editor-title">${escapeHTML(userId)}</h3>
                    </div>
                    <button type="button" class="calendar-editor-close" aria-label="Cerrar"><i data-lucide="x"></i></button>
                </header>
                ${pasted ? `<div class="calendar-paste-notice"><i data-lucide="clipboard-check"></i>Contenido pegado. Revísalo antes de guardar.</div>` : ""}
                <div class="calendar-editor-tools">
                    <button type="button" data-editor-copy><i data-lucide="copy"></i>Copiar día</button>
                    <button type="button" data-editor-paste ${getClipboards().length ? "" : "disabled"}><i data-lucide="clipboard-paste"></i>Pegar</button>
                    ${currentItems.length ? `<button type="button" class="calendar-editor-delete" data-editor-delete><i data-lucide="trash-2"></i>Borrar día</button>` : ""}
                </div>
                <div class="calendar-assignment-list" data-items></div>
                <button type="button" class="calendar-add-assignment" data-add-item>
                    <i data-lucide="plus"></i>Añadir otra actividad
                </button>
                <footer class="calendar-editor-footer">
                    <span>Esc para cerrar</span>
                    <div>
                        <button type="button" class="btn-outline" data-cancel>Cancelar</button>
                        <button type="button" class="btn-primary" data-save><i data-lucide="check"></i>Guardar cambios</button>
                    </div>
                </footer>
            </aside>
        `;
        document.body.appendChild(overlay);
        document.body.classList.add("calendar-editor-open");
        const list = overlay.querySelector("[data-items]");

        const renderRows = () => {
            list.innerHTML = "";
            workingItems.forEach((item, index) => list.appendChild(createItemRow(item, index)));
            if (!workingItems.length) list.appendChild(createItemRow({ text: "", category: "osp" }, 0));
            if (typeof lucide !== "undefined") lucide.createIcons();
        };

        const close = () => {
            document.removeEventListener("keydown", onEscape);
            document.body.classList.remove("calendar-editor-open");
            overlay.classList.add("is-closing");
            window.setTimeout(() => overlay.remove(), 180);
        };
        const onEscape = event => { if (event.key === "Escape") close(); };
        document.addEventListener("keydown", onEscape);
        overlay.addEventListener("mousedown", event => { if (event.target === overlay) close(); });
        overlay.querySelector(".calendar-editor-close").addEventListener("click", close);
        overlay.querySelector("[data-cancel]").addEventListener("click", close);

        overlay.querySelector("[data-add-item]").addEventListener("click", () => {
            syncRows();
            workingItems.push({ text: "", category: "osp" });
            renderRows();
            list.lastElementChild?.querySelector(".calendar-activity-input")?.focus();
        });

        overlay.querySelector("[data-editor-copy]").addEventListener("click", async () => {
            syncRows();
            const nonEmptyItems = workingItems.filter(item => item.text.trim());
            if (nonEmptyItems.length) await copyDay(nonEmptyItems, userId, date);
        });

        overlay.querySelector("[data-editor-paste]").addEventListener("click", async () => {
            const clipboard = await pickClipboard();
            if (!clipboard?.items?.length) return;
            syncRows();
            if (workingItems.some(item => item.text.trim()) && !window.confirm("¿Reemplazar las actividades actuales por las copiadas?")) return;
            workingItems = deepCopyItems(clipboard.items);
            renderRows();
            announce("Contenido pegado. Todavía no se ha guardado.");
        });

        overlay.querySelector("[data-editor-delete]")?.addEventListener("click", async event => {
            const deleted = await deleteDay(userId, date, getItems(date, userId), event.currentTarget);
            if (deleted) close();
        });

        overlay.querySelector("[data-save]").addEventListener("click", async event => {
            syncRows();
            const newItems = workingItems
                .map(item => ({ text: item.text.trim(), category: item.category }))
                .filter(item => item.text);
            const saveButton = event.currentTarget;
            saveButton.disabled = true;
            saveButton.innerHTML = `<span class="calendar-button-spinner"></span>Guardando…`;
            try {
                const response = await api.saveAssignment({ user: userId, date, items: newItems, modifiedBy: currentUser });
                if (response.status !== "success") throw new Error(response.message || "No se pudo guardar.");
                if (!calendarData.schedule[date]) calendarData.schedule[date] = {};
                calendarData.schedule[date][userId] = deepCopyItems(newItems);
                rememberSuggestions(newItems);
                buildSuggestionCatalog();
                close();
                renderYear({ preserveScroll: true });
                announce("Planificación guardada.");
            } catch (error) {
                saveButton.disabled = false;
                saveButton.innerHTML = `<i data-lucide="check"></i>Guardar cambios`;
                if (typeof lucide !== "undefined") lucide.createIcons();
                announce(`Error: ${error.message}`, true);
            }
        });

        function syncRows() {
            workingItems = Array.from(list.querySelectorAll(".calendar-assignment-row")).map(row => ({
                text: row.querySelector(".calendar-activity-input").value,
                category: row.querySelector(".sel-cat").value
            }));
        }

        function createItemRow(item, index) {
            const row = document.createElement("div");
            row.className = "calendar-assignment-row";
            row.innerHTML = `
                <div class="calendar-row-index">${String(index + 1).padStart(2, "0")}</div>
                <div class="calendar-row-fields">
                    <select class="sel-cat" aria-label="Categoría de actividad">
                        ${categories.map(category => `
                            <option value="${category.id}" ${category.id === item.category ? "selected" : ""}>${category.label}</option>
                        `).join("")}
                    </select>
                    <div class="calendar-autocomplete">
                        <textarea class="calendar-activity-input" rows="2" placeholder="Escribe una actividad…" aria-label="Detalle de actividad">${escapeHTML(item.text)}</textarea>
                        <div class="calendar-suggestions" role="listbox"></div>
                    </div>
                </div>
                <div class="calendar-row-actions">
                    <button type="button" data-move-up aria-label="Subir actividad"><i data-lucide="chevron-up"></i></button>
                    <button type="button" data-move-down aria-label="Bajar actividad"><i data-lucide="chevron-down"></i></button>
                    <button type="button" data-remove aria-label="Eliminar actividad"><i data-lucide="trash-2"></i></button>
                </div>
            `;
            const input = row.querySelector(".calendar-activity-input");
            const categorySelect = row.querySelector(".sel-cat");
            const suggestions = row.querySelector(".calendar-suggestions");

            const showSuggestions = () => {
                const query = input.value.trim().toLocaleLowerCase("es");
                const matches = suggestionCatalog
                    .filter(suggestion => !query || suggestion.text.toLocaleLowerCase("es").includes(query))
                    .slice(0, 6);
                suggestions.innerHTML = matches.map(suggestion => `
                    <button type="button" role="option" data-text="${escapeHTML(suggestion.text)}" data-category="${escapeHTML(suggestion.category)}">
                        <span>${highlightMatch(suggestion.text, query)}</span>
                        <small>${escapeHTML(categoryLabel(suggestion.category))}</small>
                    </button>
                `).join("");
                suggestions.classList.toggle("is-visible", matches.length > 0 && (document.activeElement === input));
            };

            input.addEventListener("input", showSuggestions);
            input.addEventListener("focus", showSuggestions);
            input.addEventListener("blur", () => window.setTimeout(() => suggestions.classList.remove("is-visible"), 120));
            suggestions.addEventListener("mousedown", event => event.preventDefault());
            suggestions.addEventListener("click", event => {
                const option = event.target.closest("[data-text]");
                if (!option) return;
                input.value = option.dataset.text;
                categorySelect.value = option.dataset.category;
                suggestions.classList.remove("is-visible");
                input.focus();
            });

            row.querySelector("[data-remove]").addEventListener("click", () => {
                syncRows();
                workingItems.splice(index, 1);
                renderRows();
            });
            row.querySelector("[data-move-up]").addEventListener("click", () => {
                if (index === 0) return;
                syncRows();
                [workingItems[index - 1], workingItems[index]] = [workingItems[index], workingItems[index - 1]];
                renderRows();
            });
            row.querySelector("[data-move-down]").addEventListener("click", () => {
                syncRows();
                if (index >= workingItems.length - 1) return;
                [workingItems[index + 1], workingItems[index]] = [workingItems[index], workingItems[index + 1]];
                renderRows();
            });
            return row;
        }

        renderRows();
        window.requestAnimationFrame(() => {
            overlay.classList.add("is-open");
            list.querySelector(".calendar-activity-input")?.focus();
        });
        if (typeof lucide !== "undefined") lucide.createIcons();
    }

    function rememberSuggestions(items) {
        const merged = [...items, ...suggestionCatalog].reduce((map, item) => {
            const text = String(item.text || "").trim();
            if (text) map.set(text.toLocaleLowerCase("es"), { text, category: item.category || "otros" });
            return map;
        }, new Map());
        try {
            localStorage.setItem("xiaomiCalendarSuggestions", JSON.stringify(Array.from(merged.values()).slice(0, 150)));
        } catch (error) {
            console.warn("No se pudo guardar el historial local.", error);
        }
    }

    function observeMonths() {
        monthObserver?.disconnect();
        monthObserver = new IntersectionObserver(entries => {
            const visible = entries
                .filter(entry => entry.isIntersecting)
                .sort((a, b) => Math.abs(a.boundingClientRect.top) - Math.abs(b.boundingClientRect.top))[0];
            if (!visible) return;
            setActiveMonth(Number(visible.target.dataset.monthSection));
        }, { root: yearScroll, rootMargin: "-12% 0px -70% 0px", threshold: 0 });
        container.querySelectorAll("[data-month-section]").forEach(section => monthObserver.observe(section));
    }

    function setActiveMonth(monthIndex) {
        container.querySelector("#calendarActiveMonth").textContent = MONTHS[monthIndex];
        monthRail.querySelectorAll("[data-month]").forEach(button => {
            const active = Number(button.dataset.month) === monthIndex;
            button.classList.toggle("is-active", active);
            if (active) {
                monthRail.scrollTo({
                    left: Math.max(0, button.offsetLeft - (monthRail.clientWidth / 2) + (button.offsetWidth / 2)),
                    behavior: "smooth"
                });
            }
        });
    }

    function scrollToMonth(monthIndex, smooth) {
        const section = container.querySelector(`#calendar-month-${monthIndex}`);
        if (!section) return;
        yearScroll.scrollTo({ top: Math.max(0, section.offsetTop - 8), behavior: smooth ? "smooth" : "auto" });
        setActiveMonth(monthIndex);
    }

    function scrollToToday(smooth) {
        scrollToMonth(now.getMonth(), smooth);
        window.setTimeout(() => {
            const todayCell = container.querySelector(`[data-date="${todayISO}"][data-user]`);
            if (!todayCell) return;
            const scrollerRect = yearScroll.getBoundingClientRect();
            const cellRect = todayCell.getBoundingClientRect();
            const targetTop = yearScroll.scrollTop + (cellRect.top - scrollerRect.top) - (yearScroll.clientHeight / 2) + (cellRect.height / 2);
            const targetLeft = yearScroll.scrollLeft + (cellRect.left - scrollerRect.left) - (yearScroll.clientWidth / 2) + (cellRect.width / 2);
            yearScroll.scrollTo({
                top: Math.max(0, targetTop),
                left: Math.max(0, targetLeft),
                behavior: smooth ? "smooth" : "auto"
            });
            todayCell.focus({ preventScroll: true });
            window.scrollTo({ top: 0, left: 0, behavior: "auto" });
            todayCell.classList.add("calendar-today-arrival");
            window.setTimeout(() => todayCell.classList.remove("calendar-today-arrival"), 1100);
        }, smooth ? 360 : 60);
    }

    function announce(message, isError = false) {
        const region = container.querySelector("#calendarLiveRegion");
        if (region) region.textContent = message;
        if (typeof window.showToast === "function") {
            window.showToast(isError ? "No se pudo completar" : "Calendario", message, "#calendar");
        }
    }

    function linkify(text) {
        const escaped = escapeHTML(text);
        const urlRegex = /(https?:\/\/[^\s<]+|www\.[^\s<]+|meet\.google\.com\/[^\s<]+|teams\.microsoft\.com\/[^\s<]+)/gi;
        return escaped.replace(urlRegex, url => {
            const href = url.startsWith("http") ? url : `https://${url}`;
            return `<a href="${href}" target="_blank" rel="noopener noreferrer">Abrir enlace</a>`;
        });
    }

    function highlightMatch(text, query) {
        const safe = escapeHTML(text);
        if (!query) return safe;
        const index = text.toLocaleLowerCase("es").indexOf(query);
        if (index < 0) return safe;
        return `${escapeHTML(text.slice(0, index))}<mark>${escapeHTML(text.slice(index, index + query.length))}</mark>${escapeHTML(text.slice(index + query.length))}`;
    }

    function categoryLabel(categoryId) {
        return categories.find(category => category.id === categoryId)?.label || "Otros";
    }

    function displayDate(date) {
        return new Intl.DateTimeFormat("es-ES", { weekday: "long", day: "numeric", month: "long" }).format(date);
    }

    function formatLongDate(iso) {
        const [year, month, day] = iso.split("-").map(Number);
        return displayDate(createLocalDate(year, month - 1, day));
    }

    function isInRange(iso, rangeStr) {
        if (!rangeStr) return false;
        const matches = String(rangeStr).match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
        if (!matches) return false;
        const parseRangeDate = value => {
            const [day, month, rawYear] = value.split("/").map(Number);
            return createLocalDate(rawYear < 100 ? rawYear + 2000 : rawYear, month - 1, day).getTime();
        };
        const [year, month, day] = iso.split("-").map(Number);
        const target = createLocalDate(year, month - 1, day).getTime();
        const start = parseRangeDate(matches[0]);
        const end = parseRangeDate(matches[matches.length - 1]);
        return target >= start && target <= end;
    }

    function getWeekNumber(dateValue) {
        const date = new Date(dateValue.getTime());
        date.setHours(0, 0, 0, 0);
        date.setDate(date.getDate() + 3 - (date.getDay() + 6) % 7);
        const weekOne = new Date(date.getFullYear(), 0, 4);
        return 1 + Math.round(((date.getTime() - weekOne.getTime()) / 86400000 - 3 + (weekOne.getDay() + 6) % 7) / 7);
    }
}

window.renderCalendar = renderCalendar;
