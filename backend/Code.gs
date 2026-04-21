// ==================================================
// XIAOMI TRAINER INTRANET - Backend V4.8 (POLISHED ADMIN)
// ==================================================

const CONFIG = {
  REPORTES_SS_ID: "117UB1wEqZg7D_vdmp2lZ-RN3BQHnQZk7HP49YP-0MPo",
  USUARIOS_SS_ID: "1K0vGOPwteG6ZjNVT7cDaEwIeb3ONcjmNec3-FGlH10g",
  DRIVE_FOLDER_ID: "14LBhHOVqdGJf2x-02GTrZREuZYxM_GV_",
  REPORTES_SHEET_NAME: "DATOS",
  USUARIOS_SHEET_NAME: "USUARIOS",
  VACACIONES_SHEET_NAME: "VACACIONES",
  FESTIVOS_SHEET_NAME: "FESTIVOS",
  DIAS_EXTRAS_SHEET_NAME: "DIAS EXTRAS",
  MENSAJES_SHEET_NAME: "MENSAJES",
  PLANIFICACION_SHEET_NAME: "PLANIFICACION",
  VERSION: "V4.8",
  ADMINS: ["Training Manager", "Training Coordinator", "Training Creator"]
};

// --- CACHE DE EJECUCIÓN (V1.0) ---
const _SS_CACHE = {}; 
function _getValuesCached(ssId, sheetName) {
  const key = ssId + "_" + sheetName;
  if (_SS_CACHE[key]) return _SS_CACHE[key];
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const s = ss.getSheetByName(sheetName);
    if (!s) return [];
    const d = s.getDataRange().getValues();
    _SS_CACHE[key] = d;
    return d;
  } catch(e) { return []; }
}

function doGet(e) {
  const p = e.parameter || {};
  const action = (p.action || "").toString().trim();
  const callback = p.callback || "callback";
  const userParam = (p.user || "").toString().trim();
  
  let res = { status: "error", message: "Accion [" + action + "] no encontrada" };
  try {
    if (action === "login")             res = attemptLogin(userParam, p.pass);
    if (action === "getUsersList")      res = getUsersList();
    if (action === "getVacationData")   res = getVacationData(userParam);
    if (action === "getAdminData")      res = getAdminData();
    if (action === "getDashboardStats") res = getDashboardStats(p);
    if (action === "getReportsHistory")  res = getReportsHistory(p);
    if (action === "getCitiesList")     res = getCitiesList();
    if (action === "getFilterMetadata") res = getFilterMetadata();
    if (action === "getMessages")       res = getMessages(p);
    if (action === "getWeekly")         res = getWeeklySchedule(p);
    if (action === "getUsersList")      res = getUsersList();
    if (action === "getCitiesList")     res = getCitiesList();
  } catch(err) { res = { status: "error", message: "Backend Error: " + err.toString() }; }
  return ContentService.createTextOutput(callback + "(" + JSON.stringify(res) + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    let res = { status: "error", message: "Accion no encontrada" };
    if (req.action === "saveReport")      res = handleSaveReport(req.data, req.photos);
    if (req.action === "updateReport")    res = updateReport(req);
    if (req.action === "requestVacation") res = handleRequestVacation(req);
    if (req.action === "updateRequest")   res = updateRequestStatus(req.id, req.status);
    if (req.action === "modifyExtra")     res = modifyExtraDays(req.user, req.delta);
    if (req.action === "markMessageRead") res = handleMarkMessageRead(req);
    if (req.action === "markAllMessagesRead") res = handleMarkAllMessagesRead(req);
    if (req.action === "saveAssignment")  res = saveWeeklyAssignment(req);
    if (req.action === "adminProcessSelection") res = adminProcessSelection(req);
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) { return ContentService.createTextOutput(JSON.stringify({ status: "error", message: err.toString() })).setMimeType(ContentService.MimeType.JSON); }
}

// --- ADMIN FEATURES (PROTECTED) ---
function getAdminData() {
  try {
    const dU = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
    const dE = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME);
    const extraMap = {}; 
    for(let i=1; i<dE.length; i++) {
       if (!dE[i][0]) continue;
       const uKey = dE[i][0].toString().trim().toLowerCase();
       if(uKey) extraMap[uKey] = parseFloat(dE[i][1]) || 0;
    }
    
    const dV = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
    const consumedMap = {}; 
    for(let i=1; i<dV.length; i++) {
        const u = dV[i][1].toString().toLowerCase();
        if(dV[i][5] !== 'Rechazado') {
            if(!consumedMap[u]) consumedMap[u] = {base:0, extra:0};
            if(dV[i][4] === 'Vacaciones') consumedMap[u].base += parseFloat(dV[i][6]) || 0;
            else consumedMap[u].extra += parseFloat(dV[i][6]) || 0;
        }
    }

    const allUsers = dU.slice(1).map(r => {
        const u = r[0].toString().toLowerCase();
        const cons = consumedMap[u] || {base:0, extra:0};
        const totalExtra = extraMap[u] || 0;
        return { user: r[0], name: r[1], sede: r[2], baseAvail: 23 - cons.base, extraAvail: totalExtra - cons.extra, extraTotal: totalExtra };
    });

    const pending = dV.slice(1).filter(r => r[5] === 'Pendiente').map(r => ({ id: r[7], date: r[0], user: r[1], fechas: r[2], month: r[3], type: r[4], count: r[6] }));

    return { status: "success", allUsers: allUsers, pendingRequests: pending };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function getUsersList() {
  try {
    const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
    const users = d.slice(1).map(r => ({ user: r[0], name: r[1] }));
    return { status: "success", data: users };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function updateRequestStatus(id, status) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME);
    const d = s.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
        if (d[i][7] === id) { 
            s.getRange(i + 1, 6).setValue(status);
            notifyUser(d[i][1], "Tu solicitud de " + (d[i][4]||"Vacaciones") + " (" + d[i][2] + ") ha sido " + (status === "Aprobado" ? "APROBADA ✅" : "RECHAZADA ❌") + ".");
            return { status: "success" }; 
        }
    }
    return { status: "error", message: "ID no encontrado" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); }
}

function modifyExtraDays(user, delta) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    let s = ss.getSheetByName(CONFIG.DIAS_EXTRAS_SHEET_NAME);
    if (!s) s = ss.insertSheet(CONFIG.DIAS_EXTRAS_SHEET_NAME);
    const d = s.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (d[i][0].toString().toLowerCase() === user.toLowerCase()) {
        const current = (parseFloat(d[i][1]) || 0);
        const newVal = Math.max(0, current + delta);
        s.getRange(i + 1, 2).setValue(newVal);
        const diff = newVal - current;
        if(diff !== 0) {
            // Calcular disponibilidad real para el mensaje
            let usedE = 0;
            const dV = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
            for (let j=1; j<dV.length; j++) {
              if (dV[j][1].toString().toLowerCase() === user.toLowerCase() && dV[j][4] !== "Vacaciones" && dV[j][5] !== "Rechazado") {
                 usedE += parseFloat(dV[j][6]) || 0;
              }
            }
            const avail = Math.max(0, newVal - usedE);
            notifyUser(user, "Se han " + (diff > 0 ? "añadido" : "restado") + " " + Math.abs(diff) + " día(s) extra(s). Tu nuevo saldo disponible es: " + avail + ".");
        }
        return { status: "success", newVal: newVal };
      }
    }
    s.appendRow([user, Math.max(0, delta)]);
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); }
}

// --- CORE VACATION LOGIC ---
function getVacationData(user) {
  if (!user) return { status: "error" };
  let festivos = [], userSede = "Genérica";
  
  const dF = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.FESTIVOS_SHEET_NAME);
  for (let i = 1; i < dF.length; i++) {
    if (dF[i][0].toString().trim().toLowerCase() === user.toLowerCase()) {
      userSede = (dF[i][2] || "Genérica").toString();
      for (let col = 3; col < dF[i].length; col++) {
        const dO = parseDateStable(dF[i][col]);
        if (dO) festivos.push(Utilities.formatDate(dO, Session.getScriptTimeZone(), "yyyy-MM-dd"));
      }
      break;
    }
  }

  let extra = 0;
  const dE = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME);
  for (let i=1; i<dE.length; i++) if (dE[i][0].toString().toLowerCase() === user.toLowerCase()) { extra = parseFloat(dE[i][1]) || 0; break; }

  let uB = 0, uE = 0, history = [];
  const dV = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
  for (let i = 1; i < dV.length; i++) {
    if (dV[i][1].toString().toLowerCase() === user.toLowerCase()) {
      const status = dV[i][5], count = parseFloat(dV[i][6]) || 0, type = dV[i][4];
      if (status !== "Rechazado") { if (type === "Vacaciones") uB += count; else uE += count; }
      history.push({ id: dV[i][7], date: dV[i][0], fechas: dV[i][2], month: dV[i][3], type: type, status: status, count: count });
    }
  }
  return { status: "success", stats: { baseTotal: 23, extraTotal: extra, usedBase: uB, usedExtra: uE, sede: userSede }, festivos: festivos, history: history };
}

function handleRequestVacation(req) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    let sV = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME) || ss.insertSheet(CONFIG.VACACIONES_SHEET_NAME);
    const groups = {};
    req.dates.forEach(dStr => {
      const d = new Date(dStr);
      const mLabel = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][d.getMonth()] + " " + d.getFullYear();
      if (!groups[mLabel]) groups[mLabel] = []; groups[mLabel].push(dStr);
    });
    for (let m in groups) {
      const s = groups[m].sort();
      const label = s.length>1 ? ("Del "+formatDateS(s[0])+" al "+formatDateS(s[s.length-1])) : ("Día "+formatDateS(s[0]));
      sV.appendRow([ new Date(), req.user, label, m, req.type, "Pendiente", s.length, "REQ_"+Date.now() ]);
      notifyAdmins("Nueva solicitud de " + req.user + " (" + req.type + "): " + label, req.user);
    }
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function parseDateStable(v) {
  if (v instanceof Date && !isNaN(v.getTime())) return v;
  if (!v) return null;
  const s = v.toString();
  const d = new Date(s); if (!isNaN(d.getTime())) return d;
  const p = s.split(/[-\/]/);
  if (p.length === 3) {
    var dd, mm, yy;
    if (p[0].length === 4) { yy = parseInt(p[0]); mm = parseInt(p[1]); dd = parseInt(p[2]); }
    else { dd = parseInt(p[0]); mm = parseInt(p[1]); yy = parseInt(p[2]); }
    if (yy < 100) yy += 2000;
    return new Date(yy, mm - 1, dd);
  }
  return null;
}

function formatDateS(iso) { 
    const p = iso.split("-").map(Number);
    return Utilities.formatDate(new Date(p[0], p[1]-1, p[2]), Session.getScriptTimeZone(), "dd/MM/yy"); 
}

// --- DASHBOARD / LOGIN (PROTECTED - DO NOT MODIFY) ---
function attemptLogin(u, p) {
  const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
  const up = (p || "").toString().trim();
  for (let i = 1; i < d.length; i++) {
    if ((d[i][0] || "").toString().trim().toLowerCase() === u.toLowerCase() && (d[i][3] || "").toString().trim() === up) {
      const isAdmin = CONFIG.ADMINS.some(function(a){ return d[i][0].toString().toLowerCase() === a.toLowerCase(); }) || /Manager|Coordinator|Creator/i.test(d[i][0]);
      return { status: "success", user: d[i][0], name: d[i][1], sede: d[i][2], role: isAdmin ? "Admin" : "User" };
    }
  }
  return { status: "error", message: "Credenciales incorrectas" };
}

function getUsersList() {
  const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
  return { status: "success", data: d.slice(1).map(function(r){return r[0].toString();}).filter(Boolean) };
}

function getDashboardStats(p) {
  const now = new Date();
  const todayMonth = now.getMonth();
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
  
  const target = (p.targetUser || "Total").toString().trim();
  const targetWeeksStr = (p.weeks || p.week || "").toString().trim();
  const targetMonth = (p.month || "Todos").toString().trim();
  const targetYear = (p.year || "Todos").toString().trim();
  const targetDevice = (p.device || "todos").toString().trim().toLowerCase();

  // Extraer números de semana (robustez contra "Semana 17" o "17")
  let selectedWeeks = [];
  if (targetWeeksStr) {
    const matches = targetWeeksStr.match(/\d+/g);
    if (matches) selectedWeeks = matches.map(Number);
  }
  
  if (selectedWeeks.length === 0 && targetMonth === "Todos") selectedWeeks = [getWeekNumber(now)];

  const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

  let tS=0, tA=0, tH=0, count=0; // Semanales
  let mS={}; // Semanales (Donut)
  let monthlyWS = {}; // Mensuales (Bar Chart)
  
  let statsByAccount = {}; 
  let statsByTrainer = {};
  let availableWeeks = new Set();

  for (var i=1; i<d.length; i++) {
    var dO = parseDateStable(d[i][2]); if (!dO) continue;
    var rowYear = dO.getFullYear();
    var rowMonth = dO.getMonth();
    var rowWeek = getWeekNumber(dO);

    // 1. Filtro Global (Año/Mes/Dispositivo) para que afecte a TODO el dashboard
    if (targetYear !== "Todos" && rowYear.toString() !== targetYear) continue;
    if (targetMonth !== "Todos" && mNames[rowMonth] !== targetMonth) continue;
    if (targetDevice !== "todos") {
        const mobiles = (d[i][14]||"").toString().toLowerCase();
        const eco = (d[i][15]||"").toString().toLowerCase();
        if (mobiles.indexOf(targetDevice) === -1 && eco.indexOf(targetDevice) === -1) continue;
    }

    // Registrar semana disponible (FILTRADO por mes si aplica para el dropdown dinámico)
    if (targetMonth === "Todos" || mNames[rowMonth] === targetMonth) {
        availableWeeks.add(rowWeek);
    }

    // Filtro de Usuario
    const matchesUser = (target === "Total" || (d[i][1]||"").toString().trim() === target);
    
    var ses=parseFloat(d[i][6])||0, alu=parseFloat(d[i][7])||0, hor=parseFloat(d[i][9])||0;
    var trainer = (d[i][1]||"Desconocido").toString().trim();
    var cuenta = (d[i][3]||"Otros").toString().trim();

    // Lógica SEMANAL (Totales, Donut, Admin Widgets)
    // Si selectedWeeks está vacío, significa que queremos ver TODO el mes seleccionado (o el año)
    if (selectedWeeks.length === 0 || selectedWeeks.includes(rowWeek)) {
      if (matchesUser) {
        tS+=ses; tA+=alu; tH+=hor; count++;
        var met=(d[i][5]||"Otros").toString().trim(); mS[met]=(mS[met]||0)+hor;
      }
      
      if (matchesUser) {
        if(!statsByAccount[cuenta]) statsByAccount[cuenta] = { sesiones:0, alumnos:0 };
        statsByAccount[cuenta].sesiones += ses;
        statsByAccount[cuenta].alumnos += alu;
        
        if(!statsByTrainer[trainer]) statsByTrainer[trainer] = { sesiones:0, alumnos:0 };
        statsByTrainer[trainer].sesiones += ses;
        statsByTrainer[trainer].alumnos += alu;
      }
    }

    // Lógica MENS (Bar Chart) - Basado en el mes filtrado o todos los del año
    if (matchesUser && (targetMonth === "Todos" || rowMonth === mNames.indexOf(targetMonth))) {
      if(!monthlyWS[rowWeek]) monthlyWS[rowWeek] = { sesiones:0, alumnos:0 };
      monthlyWS[rowWeek].sesiones += ses;
      monthlyWS[rowWeek].alumnos += alu;
    }
  }
  
  var sW = Object.keys(monthlyWS).sort((a,b)=>a-b);
  
  return { 
    status:"success", 
    totalSesiones:tS, 
    totalAlumnos:tA, 
    totalHoras:tH.toFixed(1), 
    currentWeekData:{count:count, week: selectedWeeks.join(',')}, 
    chartLabels:sW.length > 0 ? sW.map(w=>"Sem "+w) : ["Sin Datos"], 
    chartSesiones:sW.length > 0 ? sW.map(w=>monthlyWS[w].sesiones) : [0], 
    chartAlumnos:sW.length > 0 ? sW.map(w=>monthlyWS[w].alumnos) : [0], 
    pieLabels:Object.keys(mS), 
    pieData:Object.values(mS),
    adminStats: {
        byAccount: statsByAccount,
        byTrainer: statsByTrainer
    },
    availableWeeks: Array.from(availableWeeks).sort((a,b) => a-b)
  };
}

function getReportsHistory(p) {
  try {
    const target = (p.targetUser || "").toString().trim();
    const limit = parseInt(p.limit) || 20;
    
    // Filtros específicos
    const weekFilter = p.week ? parseInt(p.week) : null;
    const monthFilter = (p.month || "").toString().trim();
    const accountFilter = (p.account || "").toString().trim();
    const deviceFilter = (p.device || "").toString().trim().toLowerCase();
    const methodologyFilter = (p.methodology || "").toString().trim();
    const query = (p.q || "").toString().trim().toLowerCase();
    
    const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
    const result = [];
    const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];

    const availableFilters = { weeks: new Set(), months: new Set(), accounts: new Set(), methods: new Set(), devices: new Set() };

    // Pasada para poblar filtros disponibles para este usuario
    for (var j=1; j<d.length; j++) {
        const rowTrainer = (d[j][1]||"").toString().trim();
        if (!target || rowTrainer === target) {
            const dO = parseDateStable(d[j][2]);
            if (dO) {
                const rowMonth = mNames[dO.getMonth()];
                const rowWeek = getWeekNumber(dO);

                // Popular filtros siempre con los datos del usuario
                availableFilters.accounts.add((d[j][3]||"Otros").toString().trim());
                availableFilters.methods.add((d[j][5]||"Otros").toString().trim());
                
                // Vinculación: Los filtros de Mes/Semana/Dispositivo se retroalimentan
                // Si el usuario ya filtró por mes, solo mostramos semanas de ese mes
                if (monthFilter === "Todos" || rowMonth === monthFilter) {
                    availableFilters.weeks.add(rowWeek);
                }
                if (weekFilter === null || rowWeek == weekFilter) {
                    availableFilters.months.add(rowMonth);
                }

                const devs = ((d[j][14]||"") + ", " + (d[j][15]||"")).split(",");
                devs.forEach(dev => {
                    const clean = dev.trim();
                    if(clean && clean !== "-" && clean !== "undefined") availableFilters.devices.add(clean);
                });
            }
        }
    }

    // Pasada para obtener el historial filtrado (inversa para limit reciente)
    for (let i = d.length - 1; i >= 1; i--) {
      if (target && (d[i][1]||"").toString().trim() !== target) continue;
      
      const dO = parseDateStable(d[i][2]);
      if (!dO) continue;
      
      if (weekFilter && weekFilter !== "Todos" && getWeekNumber(dO) != weekFilter) continue;
      if (monthFilter && monthFilter !== "Todos" && mNames[dO.getMonth()] !== monthFilter) continue;
      if (accountFilter && accountFilter !== "Todos" && (d[i][3]||"").toString().trim() !== accountFilter) continue;
      if (methodologyFilter && methodologyFilter !== "Todos" && (d[i][5]||"").toString().trim() !== methodologyFilter) continue;
      if (deviceFilter && deviceFilter !== "todos") {
        const mobiles = (d[i][14]||"").toString().toLowerCase();
        const eco = (d[i][15]||"").toString().toLowerCase();
        if (mobiles.indexOf(deviceFilter) === -1 && eco.indexOf(deviceFilter) === -1) continue;
      }

      if (query) {
        const rowStr = [Utilities.formatDate(dO, Session.getScriptTimeZone(), "dd/MM/yyyy"), d[i][3], d[i][10], d[i][14], d[i][15], d[i][16]].join(" ").toLowerCase();
        if (rowStr.indexOf(query) === -1) continue;
      }
      
      result.push({
        rowIdx: i + 1,
        id: d[i][18] || ("R_" + dO.getTime() + "_" + i),
        timestamp: d[i][0], trainer: d[i][1], fecha: d[i][2], cuenta: d[i][3], metodologia: d[i][5],
        sesiones: d[i][6], alumnos: d[i][7], duracion: d[i][9], tiendas: d[i][10], dispositivos: d[i][14], comentarios: d[i][16]
      });
      if (result.length >= limit) break;
    }
    
    return { 
      status: "success", 
      data: result,
      availableFilters: {
          weeks: Array.from(availableFilters.weeks).sort((a,b) => b-a),
          months: Array.from(availableFilters.months).sort((a,b) => mNames.indexOf(a) - mNames.indexOf(b)),
          accounts: Array.from(availableFilters.accounts).sort(),
          methods: Array.from(availableFilters.methods).sort(),
          devices: Array.from(availableFilters.devices).sort()
      }
    };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function updateReport(p) {
  try {
    const data = p.data;
    const rowIdx = parseInt(p.rowIdx);
    const s = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID).getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    
    // Verificamos que el rowIdx sea válido y coincida el usuario (seguridad básica)
    const currentRow = s.getRange(rowIdx, 1, 1, 2).getValues()[0];
    if (currentRow[1] !== data.trainer && !CONFIG.ADMINS.includes(data.trainer)) {
        return { status: "error", message: "No tienes permiso para editar este reporte." };
    }

    // Actualizamos la fila (manteniendo el timestamp original o actualizando?)
    // El usuario dijo "Sobreescribe", mantendremos el timestamp original en Col 1
    const rowData = [
      currentRow[0], // Original timestamp
      data.trainer,
      data.fecha,
      data.cuenta,
      data.distribuidor,
      data.metodologia,
      data.sesiones,
      data.alumnos,
      data.provincia,
      data.duracion,
      data.tiendas || "0",
      data.perfil,
      data.ciudad,
      data.contenidos,
      data.dispositivos,
      data.dispositivos_no_movil,
      data.comentarios,
      p.photos || "" // Si enviamos nuevas fotos se sobreescriben las URLs
    ];
    
    s.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function getWeekNumber(d) {
  var d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d2.setUTCDate(d2.getUTCDate() + 4 - (d2.getUTCDay() || 7));
  return Math.ceil((((d2 - new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

function getCitiesList() {
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
  return { status:"success", data:Array.from(new Set(d.slice(1).map(r=>(r[12]||"").toString().trim()).filter(Boolean))) };
}

function getFilterMetadata() {
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
  var ys = new Set(), ms = new Set(), devs = new Set(), accounts = new Set(), methodologies = new Set();
  var mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  
  for (var i=1; i<d.length; i++) {
    var dO = parseDateStable(d[i][2]);
    if(dO) { ys.add(dO.getFullYear().toString()); ms.add(mNames[dO.getMonth()]); }
    
    if(d[i][3]) accounts.add(d[i][3].toString().trim());
    if(d[i][5]) methodologies.add(d[i][5].toString().trim());
    
    // Unificar dispositivos (Col 15 y 16)
    var d1 = (d[i][14]||"").toString().split(',');
    var d2 = (d[i][15]||"").toString().split(',');
    d1.concat(d2).forEach(item => {
      var t = item.trim();
      if(t && t !== "0") devs.add(t);
    });
  }
  
  return { 
    status:"success", 
    data: { 
      years: Array.from(ys).sort().reverse(), 
      months: Array.from(ms), 
      accounts: Array.from(accounts).sort(),
      methodologies: Array.from(methodologies).sort(),
      devices: Array.from(devs).sort()
    } 
  };
}

function handleSaveReport(data, photos) {
  const s = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID).getSheetByName(CONFIG.REPORTES_SHEET_NAME);
  var photoUrls = [];
  if (photos && photos.length > 0) {
    var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
    for (var i=0; i<photos.length; i++) {
        var p = photos[i];
        if (p && p.base64Data) {
            var splitted = p.base64Data.split(',');
            var base64 = splitted.length > 1 ? splitted[1] : splitted[0];
            var blob;
            try {
                blob = Utilities.newBlob(Utilities.base64Decode(base64), p.mimeType || "image/jpeg", p.name || ("photo_" + i + ".jpg"));
                var file = folder.createFile(blob);
                photoUrls.push(file.getUrl());
            } catch(e) {}
        }
    }
  }
  var urlsString = photoUrls.join("\n");
  s.appendRow([ new Date(), data.trainer, data.fecha, data.cuenta, data.distribuidor, data.metodologia, data.sesiones, data.alumnos, data.provincia, data.duracion, data.tiendas || "0", data.perfil, data.ciudad, data.contenidos, data.dispositivos, data.dispositivos_no_movil, data.comentarios, urlsString ]);
  return { status:"success" };
}

function getMessages(p) {
  try {
    const target = (p.targetUser || "").toString().trim().toLowerCase();
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME) || ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
    const d = smsg.getDataRange().getValues();
    const result = [];
    for (let i = 1; i < d.length; i++) {
        const rowTo = (d[i][2] || "").toString().toLowerCase();
        const isAdmin = CONFIG.ADMINS.some(a => a.toLowerCase() === target) || /Manager|Coordinator|Creator/i.test(target);
        
        // Match personal messages OR group Admin messages if user is admin
        const matches = (rowTo === target) || (isAdmin && rowTo === "admin");
        
        if (matches) {
            result.push({
                id: d[i][0],
                date: d[i][1],
                to: d[i][2],
                from: d[i][3],
                text: d[i][4],
                read: d[i][5] === true || (d[i][5] && d[i][5].toString().toUpperCase() === "TRUE")
            });
        }
    }
    return { status: "success", data: result.reverse() };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function handleMarkMessageRead(p) {
    const msgId = p.msgId;
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
    if (!smsg) return { status: "error", message: "No sheet" };
    const d = smsg.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (d[i][0].toString() === msgId.toString()) {
        smsg.getRange(i+1, 6).setValue("TRUE");
        SpreadsheetApp.flush();
        return { status: "success" };
      }
    }
    return { status: "error", message: "Not found ID" };
}

function handleMarkAllMessagesRead(p) {
    try {
        const target = (p.user || "").toString().trim().toLowerCase();
        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) return { status: "success" };
        const d = smsg.getDataRange().getValues();
        const isAdmin = CONFIG.ADMINS.some(a => a.toLowerCase() === target) || /Manager|Coordinator|Creator/i.test(target);
        
        for (let i = 1; i < d.length; i++) {
            const rowTo = (d[i][2] || "").toString().toLowerCase();
            const matches = (rowTo === target) || (isAdmin && rowTo === "admin");
            if (matches && d[i][5].toString().toUpperCase() !== "TRUE") {
                smsg.getRange(i+1, 6).setValue("TRUE");
            }
        }
        SpreadsheetApp.flush();
        return { status: "success" };
    } catch(e) { return { status: "error", message: e.toString() }; }
}

function notifyAdmins(text, fromUser) {
    try {
        // No notificar si el que pide ya es Admin (él mismo lo ve en su panel)
        const isAdmin = CONFIG.ADMINS.some(a => a.toLowerCase() === fromUser.toLowerCase()) || /Manager|Coordinator|Creator/i.test(fromUser);
        if (isAdmin) return;

        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        let smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) smsg = ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
        if (smsg.getLastRow() === 0) smsg.appendRow(["ID", "Date", "ToUser", "FromUser", "Text", "Read"]);
        
        // Un solo mensaje para todo el grupo Admin (estado compartido)
        smsg.appendRow([ Date.now() + Math.floor(Math.random()*1000), new Date(), "Admin", fromUser, text, "FALSE" ]);
    } catch(e) {}
}

function notifyUser(user, text) {
    try {
        const target = user.trim().toLowerCase();
        const isAdmin = CONFIG.ADMINS.some(a => a.toLowerCase() === target) || /Manager|Coordinator|Creator/i.test(target);
        if (isAdmin) return;

        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        let smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) smsg = ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
        
        smsg.appendRow([ Date.now() + Math.floor(Math.random()*1000), new Date(), user, "System", text, "FALSE" ]);
    } catch(e) {}
}

function notifyAllUsers(text) {
    try {
        const dU = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
        dU.slice(1).forEach(r => {
            const user = r[0].toString();
            notifyUser(user, text);
        });
    } catch(e) {}
}

// --- CALENDAR WEEKLY LOGIC ---
function getWeeklySchedule(p) {
  try {
    const start = p.start, end = p.end;
    
    const dPlan = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.PLANIFICACION_SHEET_NAME);
    const dVacas = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
    const dFest = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.FESTIVOS_SHEET_NAME);
    const users = getUsersList().data || [];

    // 2. Procesar Planificación
    const scheduleByDay = {};
    for (let i = 1; i < dPlan.length; i++) {
        const dO = parseDateStable(dPlan[i][2]);
        if (!dO) continue;
        const dStr = Utilities.formatDate(dO, Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (dStr >= start && dStr <= end) {
            if (!scheduleByDay[dStr]) scheduleByDay[dStr] = {};
            const u = (dPlan[i][1]||"").toString();
            if (!u) continue;
            if (!scheduleByDay[dStr][u]) scheduleByDay[dStr][u] = [];
            scheduleByDay[dStr][u].push({ id: dPlan[i][0], text: dPlan[i][3], category: dPlan[i][4] });
        }
    }

    // 3. Procesar Festivos y Vacaciones en bloque (Mapas por usuario normalizado)
    const blocks = {};
    const normalizedBlocks = {}; // Map lowercase name to data object
    
    users.forEach(u => {
      const data = { vacationInfo: [], festivos: [] };
      blocks[u] = data;
      normalizedBlocks[u.trim().toLowerCase()] = data;
    });

    // Mapear Festivos
    for (let i = 1; i < dFest.length; i++) {
        const uKey = (dFest[i][0]||"").toString().trim().toLowerCase();
        if (normalizedBlocks[uKey]) {
            for (let col = 3; col < dFest[i].length; col++) {
                const dO = parseDateStable(dFest[i][col]);
                if (dO) {
                    const fStr = Utilities.formatDate(dO, Session.getScriptTimeZone(), "yyyy-MM-dd");
                    if (fStr >= start && fStr <= end) {
                        normalizedBlocks[uKey].festivos.push(fStr);
                        normalizedBlocks[uKey][fStr] = "FESTIVO";
                    }
                }
            }
        }
    }

    // Mapear Vacaciones
    for (let i = 1; i < dVacas.length; i++) {
        const uName = (dVacas[i][1]||"").toString().trim();
        const uKey = uName.toLowerCase();
        const status = dVacas[i][5];
        if (normalizedBlocks[uKey] && (status === "Aprobado" || status === "Pendiente")) {
            normalizedBlocks[uKey].vacationInfo.push({ fechas: dVacas[i][2], status: status });
        }
    }

    return { status: "success", schedule: scheduleByDay, blocks: blocks };
  } catch(e) { return { status: "error", message: "getWeekly error: " + e.toString() }; }
}

function adminProcessSelection(req) {
  try {
    const action = req.opAction; 
    
    if (action === 'notify_materials') {
        notifyAllUsers("Nuevos materiales disponibles en tu repositorio.");
        return { status: "success" };
    }

    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME);
    const userNorm = req.user.trim().toLowerCase();
    const results = [];

    if (action === 'remove') {
      const d = s.getDataRange().getValues();
      const datesToRemove = req.dates; // already in "YYYY-MM-DD" format
      
      const toISO = (dateObj) => {
          return dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');
      };

      let rowsToDelete = [];
      let newIndividualDays = [];

      for (let i = d.length - 1; i >= 1; i--) {
        if (d[i][1].toString().trim().toLowerCase() !== userNorm) continue;
        const rangeStr = d[i][2].toString();
        const type = d[i][4];
        
        const matches = rangeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
        if (!matches) continue;
        
        const parseMatch = (str) => {
            const p = str.split('/');
            let y = parseInt(p[2]); if(y < 100) y += 2000;
            return new Date(y, parseInt(p[1]) - 1, parseInt(p[0]));
        };

        const startDate = parseMatch(matches[0]);
        const endDate = matches.length > 1 ? parseMatch(matches[matches.length - 1]) : startDate;
        
        let daysInRow = [];
        let cur = new Date(startDate.getFullYear(), startDate.getMonth(), startDate.getDate());
        let curEnd = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
        
        while(cur.getTime() <= curEnd.getTime()) {
           daysInRow.push(new Date(cur.getTime()));
           cur.setDate(cur.getDate()+1);
        }

        let removedAny = false;
        let daysToKeep = [];

        daysInRow.forEach(day => {
            const beingRemoved = datesToRemove.includes(toISO(day));
            if (beingRemoved) removedAny = true;
            else daysToKeep.push(day);
        });

        if (removedAny) {
            rowsToDelete.push(i + 1);
            daysToKeep.forEach(day => newIndividualDays.push({date: day, type: type, originalDateVal: d[i][0]}));
        }
      }

      rowsToDelete.forEach(rowIdx => s.deleteRow(rowIdx));

      // AUTO-LIMPIEZA: Marcar mensajes de "Nueva solicitud" de este usuario como leídos
      const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
      if (smsg) {
          const dMsg = smsg.getDataRange().getValues();
          for (let i = 1; i < dMsg.length; i++) {
              if (dMsg[i][2] === "Admin" && dMsg[i][4].includes(req.user) && dMsg[i][5].toString().toUpperCase() === "FALSE") {
                  smsg.getRange(i+1, 6).setValue("TRUE");
              }
          }
      }

      const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      newIndividualDays.forEach(obj => {
          const dObj = obj.date;
          const label = "Día " + Utilities.formatDate(dObj, Session.getScriptTimeZone(), "dd/MM/yy");
          const mLabel = mNames[dObj.getMonth()] + " " + dObj.getFullYear();
          const id = "ADM_" + Date.now() + "_" + Math.floor(Math.random()*1000);
          s.appendRow([obj.originalDateVal, req.user, label, mLabel, obj.type, "Aprobado", 1, id]);
      });

      SpreadsheetApp.flush();
      notifyUser(req.user, `Admin ha ELIMINADO vacaciones/días extra de tu calendario para: ${req.dates.join(", ")}.`);
      return { status: "success", action: "removed" };
    } else {
      // AÑADIR (Vacaciones o Extras)
      const type = (action === 'add_vacation') ? 'Vacaciones' : 'Dias Extras';
      const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      
      const groups = {};
      req.dates.forEach(dStr => {
          const d = parseDateStable(dStr);
          if(d) {
              const mLabel = mNames[d.getMonth()] + " " + d.getFullYear();
              if(!groups[mLabel]) groups[mLabel] = [];
              groups[mLabel].push(dStr); 
          }
      });
      
      for (let m in groups) {
          const sDates = groups[m].sort();
          let label = "";
          if (sDates.length > 1) {
              const d0 = parseDateStable(sDates[0]);
              const d1 = parseDateStable(sDates[sDates.length - 1]);
              label = "Del " + Utilities.formatDate(d0, Session.getScriptTimeZone(), "dd/MM/yy") + " al " + Utilities.formatDate(d1, Session.getScriptTimeZone(), "dd/MM/yy");
          } else {
              const dObj = parseDateStable(sDates[0]);
              label = "Día " + Utilities.formatDate(dObj, Session.getScriptTimeZone(), "dd/MM/yy");
          }
          const id = "ADM_" + Date.now() + "_" + Math.floor(Math.random()*1000);
          s.appendRow([new Date(), req.user, label, m, type, "Aprobado", sDates.length, id]);
      }

      notifyUser(req.user, `Admin ha ASIGNADO ${type} en tu calendario para: ${req.dates.join(", ")}.`);
      SpreadsheetApp.flush();
      return { status: "success", action: "added" };
    }
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function notifyUser(toUser, text, fromUser) {
    try {
        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        let smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) smsg = ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
        smsg.appendRow([ Date.now() + Math.floor(Math.random()*1000), new Date(), toUser, fromUser || "System", text, "FALSE" ]);
    } catch(e) {}
}

function saveWeeklyAssignment(req) {
  try {
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.PLANIFICACION_SHEET_NAME);
    // Borramos existentes para ese user/dia para reescribir
    const d = s.getDataRange().getValues();
    for (let i = d.length - 1; i >= 1; i--) {
        const dStr = Utilities.formatDate(new Date(d[i][2]), Session.getScriptTimeZone(), "yyyy-MM-dd");
        if (d[i][1] === req.user && dStr === req.date) {
            s.deleteRow(i + 1);
        }
    }
    // Añadimos nuevos
    if (req.items && req.items.length > 0) {
      req.items.forEach(it => {
        s.appendRow([Date.now(), req.user, req.date, it.text, it.category, req.modifiedBy || '']);
      });
      SpreadsheetApp.flush();
      notifyUser(req.user, "Se ha actualizado tu planificación semanal.");
      return { status: "success" };
    }
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); }
}


function parseDateStable(val) {
  if (!val) return null;
  if (val instanceof Date) return val;
  try {
    const s = val.toString();
    if (s.indexOf('/') > -1) {
      const p = s.split('/');
      let y = parseInt(p[2]); if (y < 100) y += 2000;
      return new Date(y, parseInt(p[1]) - 1, parseInt(p[0]));
    }
    const d = new Date(val);
    return isNaN(d.getTime()) ? null : d;
  } catch(e) { return null; }
}
