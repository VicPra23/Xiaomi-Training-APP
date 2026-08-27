// ==================================================
// XIAOMI TRAINER INTRANET - Backend V4.9 (SENIOR REFACTOR)
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
  MATERIALES_SHEET_NAME: "MATERIALES",
  VERSION: "V5.0",
  ADMINS: ["Training Manager", "Training Coordinator", "Training Creator"]
};

// CONFIGURACIÓN DE COLUMNAS DINÁMICAS (V5.5)
function _getColMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((h, i) => {
    const clean = h.toString().trim().toUpperCase();
    if (clean === "FECHA") map.FECHA = i;
    else if (clean.includes("FECHA") && map.FECHA === undefined) map.FECHA = i;
    else if (clean.includes("CUENTA")) map.CUENTA = i;
    else if (clean.includes("DISTRIBUIDOR")) map.DISTRIBUIDOR = i;
    else if (clean.includes("METODOLOG")) map.METODOLOGIA = i;
    else if (clean.includes("SESION")) map.SESIONES = i;
    else if (clean.includes("PERFIL")) map.PERFIL = i; // Perfil tiene prioridad sobre la palabra "Alumno"
    else if (clean === "ALUMNOS" || clean.includes("Nº ALUM") || clean.includes("CANT. ALUM")) map.ALUMNOS = i;
    else if (clean.includes("HORA") || clean.includes("DURAC")) map.HORAS = i;
    else if (clean.includes("TIENDA") && !clean.includes("DISTRIBUIDOR")) map.TIENDAS = i;
    else if (clean.includes("CIUDAD") || clean.includes("POBLAC") || clean.includes("MUNICIPIO")) map.CIUDAD = i;
    else if (clean.includes("PROVINCIA")) map.PROVINCIA = i;
    else if (clean.includes("CONTENIDO")) map.CONTENIDOS = i;
    else if (clean.includes("DISPOSITIVO") && !clean.includes("NO")) map.DISP_MOVIL = i;
    else if (clean.includes("ECOSISTEMA") || clean.includes("NO M")) map.DISP_ECO = i;
    else if (clean.includes("COMENTARIO")) map.COMENTARIOS = i;
    else if (clean.includes("FOTO") || clean.includes("URL")) map.FOTOS = i;
    else if (clean.includes("TRAINER") || clean.includes("USUARIO") || clean.includes("NOMBRE")) map.TRAINER = i;
  });
  return map;
}

const CACHE_EXPIRATION = 300; // 5 minutos en segundos

// MEJORA SENIOR: Super-calculadora de duraciones (V5.6)
function _parseDur(val) {
  if (val === undefined || val === null || val === "") return 0;
  
  // 1. Si Google Sheets lo envía como un objeto Date nativo (formato Duración)
  if (val instanceof Date) {
    const baseDate = new Date(1899, 11, 30);
    let diff = (val.getTime() - baseDate.getTime()) / (1000 * 60 * 60);
    if (diff > 100000) return Math.abs(val.getHours() + (val.getMinutes() / 60) + (val.getSeconds() / 3600));
    return Math.abs(diff);
  }

  let s = val.toString().trim().replace(',', '.');

  // 2. Si viene en formato hora "HH:MM" o "T14:30" (común en móviles)
  if (s.includes(':')) {
    let timePart = s.includes('T') ? s.split('T')[1] : s;
    let parts = timePart.split(':');
    let hh = parseFloat(parts[0]) || 0;
    let mm = parseFloat(parts[1]) || 0;
    let ss = parseFloat(parts[2]) || 0;
    return Math.abs(hh + (mm / 60) + (ss / 3600));
  }
  
  // 3. Si viene como número o texto decimal ("2.5")
  const num = parseFloat(s.replace(/[^0-9.-]/g, '')) || 0;
  return Math.abs(num);
}

// 🛠️ FIX 2: CACHÉ REAL DE APPS SCRIPT CON SOPORTE PARA REFRESH FORZADO
function _getValuesCached(ssId, sheetName, forceRefresh = false) {
  const cache = CacheService.getScriptCache();
  const key = ssId + "_" + sheetName;
  
  if (!forceRefresh) {
    const cachedData = cache.get(key);
    if (cachedData) {
      try { return JSON.parse(cachedData); } catch(e) { cache.remove(key); }
    }
  } else {
    cache.remove(key);
  }
  
  try {
    const ss = SpreadsheetApp.openById(ssId);
    const s = ss.getSheetByName(sheetName);
    if (!s) return [];
    const d = s.getDataRange().getValues();
    try {
      cache.put(key, JSON.stringify(d), CACHE_EXPIRATION);
    } catch(cacheError) {
      // CacheService limit is 100KB. If it fails, ignore and return data anyway.
    }
    return d;
  } catch(e) { return []; }
}

function _invalidateCache(ssId, sheetName) {
  CacheService.getScriptCache().remove(ssId + "_" + sheetName);
}

const SESSION_TTL_MS = 8 * 60 * 60 * 1000;

function _digest(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value))
    .map(function(byte) { return ("0" + (byte & 255).toString(16)).slice(-2); })
    .join("");
}

function _createSession(user, role) {
  _cleanupExpiredSessions();
  const token = Utilities.getUuid() + Utilities.getUuid();
  const expiresAt = Date.now() + SESSION_TTL_MS;
  const session = { user: user, role: role, expiresAt: expiresAt };
  const key = "SESSION_" + _digest(token);
  PropertiesService.getScriptProperties().setProperty(key, JSON.stringify(session));
  CacheService.getScriptCache().put(key, JSON.stringify(session), 21600);
  return { token: token, expiresAt: expiresAt };
}

function _cleanupExpiredSessions() {
  const props = PropertiesService.getScriptProperties();
  const all = props.getProperties();
  Object.keys(all).forEach(function(key) {
    if (key.indexOf("SESSION_") !== 0) return;
    try {
      const session = JSON.parse(all[key]);
      if (!session.expiresAt || Date.now() >= session.expiresAt) props.deleteProperty(key);
    } catch (error) {
      props.deleteProperty(key);
    }
  });
}

function _getSession(token) {
  if (!token) return null;
  const key = "SESSION_" + _digest(token);
  const cache = CacheService.getScriptCache();
  const props = PropertiesService.getScriptProperties();
  const raw = cache.get(key) || props.getProperty(key);
  if (!raw) return null;
  try {
    const session = JSON.parse(raw);
    if (!session.expiresAt || Date.now() >= session.expiresAt) {
      cache.remove(key);
      props.deleteProperty(key);
      return null;
    }
    cache.put(key, raw, Math.min(21600, Math.max(60, Math.floor((session.expiresAt - Date.now()) / 1000))));
    return session;
  } catch (error) {
    return null;
  }
}

function _destroySession(token) {
  if (!token) return;
  const key = "SESSION_" + _digest(token);
  CacheService.getScriptCache().remove(key);
  PropertiesService.getScriptProperties().deleteProperty(key);
}

function _requireSession(req, adminOnly) {
  const session = _getSession(req && req.token);
  if (!session) {
    const authError = new Error("Tu sesión ha caducado. Vuelve a iniciar sesión.");
    authError.code = "AUTH_REQUIRED";
    throw authError;
  }
  if (adminOnly && session.role !== "Admin") {
    const permissionError = new Error("No tienes permiso para realizar esta acción.");
    permissionError.code = "FORBIDDEN";
    throw permissionError;
  }
  return session;
}

function _errorResponse(error) {
  return {
    status: "error",
    code: error && error.code ? error.code : "SERVER_ERROR",
    message: error && error.message ? error.message : String(error)
  };
}

function doGet(e) {
  const p = e.parameter || {};
  const action = (p.action || "").toString().trim();
  const callback = /^[A-Za-z_$][0-9A-Za-z_$]{0,80}$/.test(p.callback || "") ? p.callback : "callback";
  
  let res = { status: "error", message: "Accion [" + action + "] no encontrada" };
  try {
    const forceRefresh = p._t ? true : false;
    if (action === "getLoginUsers") {
      // Endpoint público mínimo para completar el selector de acceso.
      // No expone contraseña, rol, sede, correo ni ningún otro dato privado.
      res = getLoginUsers();
    } else {
      const session = _requireSession(p, action === "getAdminData");
      if (session.role !== "Admin") p.targetUser = session.user;
      if (action === "getUsersList")      res = getUsersList();
      if (action === "getVacationData")   res = getVacationData(session.role === "Admin" && p.user ? p.user : session.user, forceRefresh);
      if (action === "getAdminData")      res = getAdminData(forceRefresh);
      if (action === "getDashboardStats") res = getDashboardStats(p);
      if (action === "getReportsHistory") res = getReportsHistory(p);
      if (action === "getCitiesList")     res = getCitiesList();
      if (action === "getFilterMetadata") res = getFilterMetadata();
      if (action === "getMaterials")      res = getMaterialsCatalog();
      if (action === "getMessages")       res = getMessages({ targetUser: session.user });
      if (action === "getWeekly")         res = getWeeklySchedule(p);
    }
  } catch(err) { res = _errorResponse(err); }
  if (p.callback) {
    return ContentService.createTextOutput(callback + "(" + JSON.stringify(res) + ")").setMimeType(ContentService.MimeType.JAVASCRIPT);
  } else {
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  }
}

function doPost(e) {
  try {
    const req = JSON.parse(e.postData.contents);
    if (req.action === "login") {
      return ContentService.createTextOutput(JSON.stringify(attemptLogin(req.user, req.pass))).setMimeType(ContentService.MimeType.JSON);
    }
    if (req.action === "logout") {
      _destroySession(req.token);
      return ContentService.createTextOutput(JSON.stringify({ status: "success" })).setMimeType(ContentService.MimeType.JSON);
    }
    const adminActions = ["updateRequest", "modifyExtra", "modifyBase", "adminProcessSelection"];
    const session = _requireSession(req, adminActions.indexOf(req.action) !== -1);
    let res = { status: "error", message: "Accion no encontrada" };
    if (req.action === "saveReport") {
      if (session.role !== "Admin") req.data.trainer = session.user;
      res = handleSaveReport(req.data, req.photos);
    }
    if (req.action === "updateReport")    res = updateReport(req, session);
    if (req.action === "deleteReport")    res = deleteReport(req, session);
    if (req.action === "requestVacation") {
      req.user = session.user;
      res = handleRequestVacation(req);
    }
    if (req.action === "updateRequest")   res = updateRequestStatus(req.id, req.status);
    if (req.action === "modifyExtra")     res = modifyExtraDays(req.user, req.delta);
    if (req.action === "modifyBase")      res = modifyBaseDays(req.user, req.delta);
    if (req.action === "markMessageRead") res = handleMarkMessageRead(req, session);
    if (req.action === "markAllMessagesRead") {
      req.user = session.user;
      res = handleMarkAllMessagesRead(req);
    }
    if (req.action === "saveAssignment") {
      if (session.role !== "Admin") req.user = session.user;
      req.modifiedBy = session.user;
      res = saveWeeklyAssignment(req);
    }
    if (req.action === "adminProcessSelection") res = adminProcessSelection(req);
    if (req.action === "exportCustomPDF") res = generateCustomPDF(req);
    return ContentService.createTextOutput(JSON.stringify(res)).setMimeType(ContentService.MimeType.JSON);
  } catch(err) { return ContentService.createTextOutput(JSON.stringify(_errorResponse(err))).setMimeType(ContentService.MimeType.JSON); }
}

function getMaterialsCatalog() {
  try {
    const rows = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.MATERIALES_SHEET_NAME);
    if (!rows || rows.length < 2) return { status: "success", data: [] };
    const headers = rows[0].map(function(value) { return String(value || "").trim().toLowerCase(); });
    const col = function(names) {
      for (let i = 0; i < names.length; i++) {
        const idx = headers.indexOf(names[i]);
        if (idx !== -1) return idx;
      }
      return -1;
    };
    const indexes = {
      categoryId: col(["categoria id", "category id", "id categoria"]),
      category: col(["categoria", "category"]),
      icon: col(["icono", "icon"]),
      subcategory: col(["subcategoria", "subcategory"]),
      name: col(["nombre", "material", "name"]),
      link: col(["enlace", "link", "url"]),
      newUntil: col(["nuevo hasta", "new until"])
    };
    if (indexes.category === -1 || indexes.name === -1 || indexes.link === -1) {
      return { status: "error", message: "La hoja MATERIALES necesita las columnas Categoria, Nombre y Enlace." };
    }
    const categoryMap = {};
    rows.slice(1).forEach(function(row) {
      const title = String(row[indexes.category] || "").trim();
      const name = String(row[indexes.name] || "").trim();
      const link = String(row[indexes.link] || "").trim();
      if (!title || !name || !/^https:\/\//i.test(link)) return;
      const id = indexes.categoryId >= 0 && row[indexes.categoryId]
        ? String(row[indexes.categoryId]).trim().toLowerCase().replace(/[^a-z0-9_-]/g, "-")
        : title.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      if (!categoryMap[id]) categoryMap[id] = {
        id: id,
        title: title,
        icon: indexes.icon >= 0 && row[indexes.icon] ? String(row[indexes.icon]).trim() : "folder",
        subcategories: []
      };
      const subName = indexes.subcategory >= 0 && row[indexes.subcategory] ? String(row[indexes.subcategory]).trim() : "General";
      let sub = categoryMap[id].subcategories.filter(function(item) { return item.name === subName; })[0];
      if (!sub) {
        sub = { name: subName, items: [] };
        categoryMap[id].subcategories.push(sub);
      }
      let isNew = false;
      if (indexes.newUntil >= 0 && row[indexes.newUntil]) {
        const until = parseDateStable(row[indexes.newUntil]);
        isNew = Boolean(until && until.getTime() >= new Date().setHours(0, 0, 0, 0));
      }
      sub.items.push({ name: name, link: link, isNew: isNew });
    });
    return { status: "success", data: Object.keys(categoryMap).map(function(key) { return categoryMap[key]; }) };
  } catch (error) {
    return { status: "error", message: error.toString() };
  }
}

// --- ADMIN FEATURES ---
function getAdminData(forceRefresh = false) {
  try {
    const dU = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME, forceRefresh);
    const dE = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME, forceRefresh);
    const extraMap = {}; 
    for(let i=1; i<dE.length; i++) {
       if (!dE[i][0]) continue;
       const uKey = dE[i][0].toString().trim().toLowerCase();
       if(uKey) extraMap[uKey] = parseFloat(dE[i][1]) || 0;
    }
    
    const dV = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME, forceRefresh);
    const consumedMap = {}; 
    for(let i=1; i<dV.length; i++) {
        if (!dV[i][1]) continue; 
        const u = dV[i][1].toString().trim().toLowerCase();
        if(dV[i][5] !== 'Rechazado') {
            if(!consumedMap[u]) consumedMap[u] = {base:0, extra:0};
            
            const rangeStr = dV[i][2] ? dV[i][2].toString() : "";
            let count = parseFloat(dV[i][6]) || 0;
            
            const matches = rangeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
            if (matches) {
                const parseDate = (s) => {
                    const parts = s.split("/");
                    let y = parseInt(parts[2]);
                    if (y < 100) y += 2000;
                    return new Date(y, parseInt(parts[1]) - 1, parseInt(parts[0]));
                };
                const start = parseDate(matches[0]);
                const end = matches.length > 1 ? parseDate(matches[matches.length - 1]) : start;
                let cur = new Date(start);
                let laborableCount = 0;
                while (cur <= end) {
                    if (cur.getDay() !== 0 && cur.getDay() !== 6) {
                        laborableCount++;
                    }
                    cur.setDate(cur.getDate() + 1);
                }
                count = laborableCount;
            }
            
            if(dV[i][4] === 'Vacaciones') consumedMap[u].base += count;
            else consumedMap[u].extra += count;
        }
    }

    const allUsers = dU.slice(1).map(r => {
        const u = r[0].toString().trim().toLowerCase();
        const cons = consumedMap[u] || {base:0, extra:0};
        const totalExtra = extraMap[u] || 0;
        const totalBase = parseFloat(r[6]) || 23; 
        return { 
          user: r[0], 
          name: r[1], 
          sede: r[2], 
          baseTotal: totalBase,
          baseAvail: totalBase - cons.base, 
          extraTotal: totalExtra,
          extraAvail: totalExtra - cons.extra
        };
    });

    const pending = dV.slice(1).filter(r => r[5] === 'Pendiente').map(r => ({ id: r[7], date: r[0], user: r[1], fechas: r[2], month: r[3], type: r[4], count: r[6] }));
    const approved = dV.slice(1).filter(r => r[5] === 'Aprobado').map(r => ({ id: r[7], date: r[0], user: r[1], fechas: r[2], month: r[3], type: r[4], count: r[6] }));

    return { status: "success", allUsers: allUsers, pendingRequests: pending, approvedRequests: approved };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function getUsersList() {
  try {
    const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
    const users = d.slice(1).map(r => ({ user: r[0], name: r[1] }));
    return { status: "success", data: users };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function getLoginUsers() {
  try {
    const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
    const users = d.slice(1)
      .filter(function(row) { return String(row[0] || "").trim(); })
      .map(function(row) {
        const user = String(row[0] || "").trim();
        return { user: user, name: String(row[1] || user).trim() };
      })
      .sort(function(a, b) {
        return (a.name || a.user).localeCompare(b.name || b.user, "es", { sensitivity: "base" });
      });
    return { status: "success", data: users };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function updateRequestStatus(id, status) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME);
    const d = s.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
        if (d[i][7] === id) { 
            s.getRange(i + 1, 6).setValue(status);
            notifyUser(d[i][1], "Tu solicitud de " + (d[i][4]||"Vacaciones") + " (" + d[i][2] + ") ha sido " + (status === "Aprobado" ? "APROBADA ✅" : "RECHAZADA ❌") + ".");
            _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
            return { status: "success" }; 
        }
    }
    return { status: "error", message: "ID no encontrado" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function modifyBaseDays(user, delta) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    let s = ss.getSheetByName(CONFIG.USUARIOS_SHEET_NAME);
    const d = s.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (d[i][0].toString().toLowerCase() === user.toLowerCase()) {
        const current = (parseFloat(d[i][6]) || 23);
        const newVal = Math.max(0, current + delta);
        s.getRange(i + 1, 7).setValue(newVal);
        if(newVal !== current) notifyUser(user, "Se han actualizado tus días de vacaciones.");
        _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
        return { status: "success", newVal: newVal };
      }
    }
    return { status: "error", message: "Usuario no encontrado" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function modifyExtraDays(user, delta) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    let s = ss.getSheetByName(CONFIG.DIAS_EXTRAS_SHEET_NAME);
    if (!s) s = ss.insertSheet(CONFIG.DIAS_EXTRAS_SHEET_NAME);
    const d = s.getDataRange().getValues();
    for (let i = 1; i < d.length; i++) {
      if (d[i][0].toString().toLowerCase() === user.toLowerCase()) {
        const current = (parseFloat(d[i][1]) || 0);
        const newVal = Math.max(0, current + delta);
        s.getRange(i + 1, 2).setValue(newVal);
        notifyUser(user, "Se han actualizado tus días de vacaciones.");
        _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME);
        return { status: "success", newVal: newVal };
      }
    }
    s.appendRow([user, Math.max(0, delta)]);
    _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME);
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

// --- CORE VACATION LOGIC ---
function getVacationData(user, forceRefresh = false) {
  if (!user) return { status: "error" };
  let festivos = [], userSede = "Genérica", baseTotal = 23;
  
  const dU = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME, forceRefresh);
  for (let i = 1; i < dU.length; i++) {
    if (dU[i][0].toString().trim().toLowerCase() === user.trim().toLowerCase()) {
      baseTotal = parseFloat(dU[i][6]) || 23;
      break;
    }
  }

  const dF = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.FESTIVOS_SHEET_NAME, forceRefresh);
  for (let i = 1; i < dF.length; i++) {
    if (dF[i][0].toString().trim().toLowerCase() === user.trim().toLowerCase()) {
      userSede = (dF[i][2] || "Genérica").toString();
      for (let col = 3; col < dF[i].length; col++) {
        const dO = parseDateStable(dF[i][col]);
        if (dO) {
          const dStr = dO.getFullYear() + "-" + ("0" + (dO.getMonth() + 1)).slice(-2) + "-" + ("0" + dO.getDate()).slice(-2);
          festivos.push(dStr);
        }
      }
      break;
    }
  }

  let extra = 0;
  const dE = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.DIAS_EXTRAS_SHEET_NAME, forceRefresh);
  for (let i=1; i<dE.length; i++) if (dE[i][0].toString().trim().toLowerCase() === user.trim().toLowerCase()) { extra = parseFloat(dE[i][1]) || 0; break; }

  let uB = 0, uE = 0, history = [];
  const dV = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME, forceRefresh);
  for (let i = 1; i < dV.length; i++) {
    if (!dV[i][1]) continue;
    const rowUser = dV[i][1].toString().trim().toLowerCase();
    if (rowUser === user.trim().toLowerCase()) {
      const status = dV[i][5], count = parseFloat(dV[i][6]) || 0, type = dV[i][4];
      if (status !== "Rechazado") { if (type === "Vacaciones") uB += count; else uE += count; }
      history.push({ id: dV[i][7], user: rowUser, date: dV[i][0], fechas: dV[i][2], month: dV[i][3], type: type, status: status, count: count });
    }
  }
  return { status: "success", stats: { baseTotal: baseTotal, extraTotal: extra, usedBase: uB, usedExtra: uE, sede: userSede }, festivos: festivos, history: history };
}

function handleRequestVacation(req) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    if (!req.user || !Array.isArray(req.dates) || req.dates.length < 1 || req.dates.length > 60) {
      return { status: "error", message: "La solicitud no contiene un rango de fechas válido." };
    }
    if (["Vacaciones", "Dias Extras"].indexOf(req.type) === -1) {
      return { status: "error", message: "Tipo de solicitud no válido." };
    }
    const uniqueDates = Array.from(new Set(req.dates.map(function(value) { return String(value || "").trim(); }))).sort();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const vacationData = getVacationData(req.user, true);
    if (vacationData.status !== "success") return vacationData;
    const holidays = vacationData.festivos || [];
    for (let i = 0; i < uniqueDates.length; i++) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(uniqueDates[i])) return { status: "error", message: "Fecha no válida." };
      const date = parseDateStable(uniqueDates[i]);
      if (!date || date <= today || date.getDay() === 0 || date.getDay() === 6 || holidays.indexOf(uniqueDates[i]) !== -1) {
        return { status: "error", message: "La solicitud contiene días pasados, festivos o fines de semana." };
      }
    }
    const available = req.type === "Vacaciones"
      ? vacationData.stats.baseTotal - vacationData.stats.usedBase
      : vacationData.stats.extraTotal - vacationData.stats.usedExtra;
    if (uniqueDates.length > available) {
      return { status: "error", message: "Saldo insuficiente para solicitar " + uniqueDates.length + " días." };
    }
    req.dates = uniqueDates;
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    let sV = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME) || ss.insertSheet(CONFIG.VACACIONES_SHEET_NAME);
    const groups = {};
    req.dates.forEach(dStr => {
      const d = parseDateStable(dStr) || new Date(dStr);
      const mLabel = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"][d.getMonth()] + " " + d.getFullYear();
      if (!groups[mLabel]) groups[mLabel] = []; groups[mLabel].push(dStr);
    });
    for (let m in groups) {
      const s = groups[m].sort();
      const label = s.length>1 ? ("Del "+formatDateS(s[0])+" al "+formatDateS(s[s.length-1])) : ("Día "+formatDateS(s[0]));
      const uniqueId = "REQ_" + Date.now() + "_" + Math.floor(Math.random() * 1000);
      sV.appendRow([ new Date(), req.user, label, m, req.type, "Pendiente", s.length, uniqueId ]);
      notifyAdmins("Nueva solicitud de " + req.user + " (" + req.type + "): " + label, req.user);
    }
    _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { lock.releaseLock(); }
}

function formatDateS(iso) { 
    if (!iso) return "";
    const p = iso.toString().split("-").map(Number);
    return Utilities.formatDate(new Date(p[0], p[1]-1, p[2]), Session.getScriptTimeZone(), "dd/MM/yy"); 
}

// --- DASHBOARD / LOGIN ---
function _hashPassword(password, salt, rounds) {
  let value = String(password || "") + ":" + String(salt || "");
  for (let i = 0; i < rounds; i++) value = _digest(value + ":" + salt);
  return value;
}

function _verifyPassword(stored, supplied) {
  const value = String(stored || "");
  if (value.indexOf("sha256$") !== 0) return value === String(supplied || "").trim();
  const parts = value.split("$");
  const rounds = parseInt(parts[1], 10) || 800;
  return _hashPassword(supplied, parts[2], rounds) === parts[3];
}

function attemptLogin(u, p) {
  const d = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
  const up = (p || "").toString().trim();
  const normalizedUser = (u || "").toString().trim().toLowerCase();
  for (let i = 1; i < d.length; i++) {
    const storedPassword = (d[i][3] || "").toString().trim();
    if ((d[i][0] || "").toString().trim().toLowerCase() === normalizedUser && _verifyPassword(storedPassword, up)) {
      const isAdmin = CONFIG.ADMINS.some(a => d[i][0].toString().toLowerCase() === a.toLowerCase()) || /Manager|Coordinator|Creator/i.test(d[i][0]);
      if (storedPassword.indexOf("sha256$") !== 0) {
        const rounds = 800;
        const salt = Utilities.getUuid().replace(/-/g, "");
        const upgraded = "sha256$" + rounds + "$" + salt + "$" + _hashPassword(up, salt, rounds);
        SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID).getSheetByName(CONFIG.USUARIOS_SHEET_NAME).getRange(i + 1, 4).setValue(upgraded);
        _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
      }
      const role = isAdmin ? "Admin" : "User";
      const auth = _createSession(d[i][0], role);
      return {
        status: "success",
        user: d[i][0],
        name: d[i][1],
        sede: d[i][2],
        role: role,
        token: auth.token,
        expiresAt: auth.expiresAt
      };
    }
  }
  return { status: "error", message: "Credenciales incorrectas" };
}

function getDashboardStats(p) {
  const force = p.refresh === 'true' || p.refresh === true;
  const now = new Date();
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME, force);
  
  const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
  const sRef = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
  const colMap = _getColMap(sRef);
  
  const target = (p.targetUser || "Total").toString().trim();
  const targetWeeksStr = (p.weeks || p.week || "").toString().trim();
  const targetMonth = (p.month || "Todos").toString().trim();
  const targetYear = (p.year || "Todos").toString().trim();
  const targetDevice = (p.device || "todos").toString().trim().toLowerCase();
  const targetMethodology = (p.methodology || "Todos").toString().trim().toLowerCase();
  const targetContent = (p.content || "Todos").toString().trim().toLowerCase();

  // 1️⃣ NUEVO: Leer Rango de Fechas (Si el Admin lo usa)
  const startDateStr = (p.startDate || "").toString().trim();
  const endDateStr = (p.endDate || "").toString().trim();
  let startD = startDateStr ? new Date(startDateStr) : null;
  let endD = endDateStr ? new Date(endDateStr) : null;
  if(startD) startD.setHours(0,0,0,0);
  if(endD) endD.setHours(23,59,59,999);

  let selectedWeeks = [];
  if (targetWeeksStr && targetWeeksStr !== "todos" && targetWeeksStr !== "Todos") {
    const matches = targetWeeksStr.match(/\d+/g);
    if (matches) selectedWeeks = matches.map(Number);
  }

  // 2️⃣ NUEVO: Soporte para Múltiples Meses (Ej: "Mayo,Junio")
  let selectedMonths = [];
  if (targetMonth !== "Todos") {
      selectedMonths = targetMonth.split(',').map(m => m.trim());
  }

  let selectedMethodologies = [];
  if (targetMethodology !== "todos" && targetMethodology !== "") {
      selectedMethodologies = targetMethodology.split(',').map(m => m.trim());
  }
  let selectedContents = [];
  if (targetContent !== "todos" && targetContent !== "") {
      selectedContents = targetContent.split(',').map(m => m.trim());
  }

  const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  let tS=0, tA=0, tH=0, count=0; 
  let mS={}; 
  let monthlyWS = {}; 
  let statsByAccount = {}; 
  let statsByTrainer = {};
  let availableWeeks = new Set();

  for (var i=1; i<d.length; i++) {
    var fVal = colMap.FECHA !== undefined ? d[i][colMap.FECHA] : d[i][2];
    var tVal = colMap.TRAINER !== undefined ? d[i][colMap.TRAINER] : d[i][1];
    if (!fVal || !tVal) continue; 

    var dO = parseDateStable(fVal); if (!dO) continue;
    var rowYear = dO.getFullYear();
    var rowMonth = dO.getMonth();
    var rowWeek = getWeekNumber(dO);

    // 3️⃣ NUEVO: Aplicación lógica de los Filtros
    if (startD && endD) {
        // Modo Rango de Fechas
        if (dO.getTime() < startD.getTime() || dO.getTime() > endD.getTime()) continue;
        availableWeeks.add(rowWeek);
    } else {
        // Modo Estándar (Año, Mes, Semana)
        if (targetYear !== "Todos" && rowYear.toString() !== targetYear) continue;
        // Si hay meses seleccionados y este mes NO está en la lista, saltamos
        if (selectedMonths.length > 0 && !selectedMonths.includes(mNames[rowMonth])) continue;
        if (selectedMonths.length === 0 || selectedMonths.includes(mNames[rowMonth])) availableWeeks.add(rowWeek);
    }
    
    if (targetDevice !== "todos") {
        const mobiles = (colMap.DISP_MOVIL !== undefined ? d[i][colMap.DISP_MOVIL] : (d[i][11]||"")).toString().toLowerCase();
        const eco = (colMap.DISP_ECO !== undefined ? d[i][colMap.DISP_ECO] : (d[i][12]||"")).toString().toLowerCase();
        if (mobiles.indexOf(targetDevice) === -1 && eco.indexOf(targetDevice) === -1) continue;
    }
    
    if (selectedMethodologies.length > 0 && !selectedMethodologies.includes("todos")) {
        const rowMethodology = (colMap.METODOLOGIA !== undefined ? d[i][colMap.METODOLOGIA] : "").toString().trim().toLowerCase();
        let match = false;
        for (let j = 0; j < selectedMethodologies.length; j++) {
            if (rowMethodology === selectedMethodologies[j] || (selectedMethodologies[j] === "reunión interna" && rowMethodology.indexOf("reuni") !== -1)) {
                match = true;
                break;
            }
        }
        if (!match) continue;
    }

    if (selectedContents.length > 0 && !selectedContents.includes("todos")) {
        const rowContent = (colMap.CONTENIDOS !== undefined ? d[i][colMap.CONTENIDOS] : "").toString().trim().toLowerCase();
        let match = false;
        for (let j = 0; j < selectedContents.length; j++) {
            if (rowContent === selectedContents[j]) {
                match = true;
                break;
            }
        }
        if (!match) continue;
    }

    const rowTrainer = (d[i][colMap.TRAINER]||d[i][1]||"").toString().trim().toLowerCase();
    const targetLower = target.toLowerCase();
    const matchesUser = (target === "Total" || rowTrainer === targetLower);
    
    var sVal = colMap.SESIONES !== undefined ? d[i][colMap.SESIONES] : d[i][6];
    var aVal = colMap.ALUMNOS !== undefined ? d[i][colMap.ALUMNOS] : d[i][8];
    var hVal = colMap.HORAS !== undefined ? d[i][colMap.HORAS] : d[i][9];
    var ses=parseFloat(sVal)||0, alu=parseFloat(aVal)||0, hor=_parseDur(hVal);
    var trainer = (d[i][colMap.TRAINER]||d[i][1]||"Desconocido").toString().trim();
    var cuenta = (d[i][colMap.CUENTA]||"Otros").toString().trim();

    // Sumar a totales si coincide la semana (o si estamos en modo Rango de Fechas)
    const inSelectedWeek = (startD && endD) ? true : (selectedWeeks.length === 0 || selectedWeeks.includes(rowWeek));

    if (inSelectedWeek) {
      if (matchesUser) {
        tS+=ses; tA+=alu; tH+=hor; count++;
        var met=(colMap.METODOLOGIA !== undefined ? d[i][colMap.METODOLOGIA] : (d[i][3]||"Otros")).toString().trim(); 
        mS[met]=(mS[met]||0)+hor;
        if(!statsByAccount[cuenta]) statsByAccount[cuenta] = { sesiones:0, alumnos:0 };
        statsByAccount[cuenta].sesiones += ses; statsByAccount[cuenta].alumnos += alu;
        if(!statsByTrainer[trainer]) statsByTrainer[trainer] = { sesiones:0, alumnos:0 };
        statsByTrainer[trainer].sesiones += ses; statsByTrainer[trainer].alumnos += alu;
      }
    }

    // Acumular para el gráfico de barras semanal
    if (matchesUser) {
        const matchesMonthForChart = (startD && endD) ? true : (selectedMonths.length === 0 || selectedMonths.includes(mNames[rowMonth]));
        if (matchesMonthForChart) {
            if(!monthlyWS[rowWeek]) monthlyWS[rowWeek] = { sesiones:0, alumnos:0 };
            monthlyWS[rowWeek].sesiones += ses; monthlyWS[rowWeek].alumnos += alu;
        }
    }
  }
  
  var sW = Object.keys(monthlyWS).sort((a,b)=>a-b);
  return { 
    status:"success", totalSesiones:tS, totalAlumnos:tA, totalHoras:tH.toFixed(1), 
    currentWeekData:{count:count, week: selectedWeeks.join(',')}, 
    chartLabels:sW.length > 0 ? sW.map(w=>"Sem "+w) : ["Sin Datos"], 
    chartSesiones:sW.length > 0 ? sW.map(w=>monthlyWS[w].sesiones) : [0], 
    chartAlumnos:sW.length > 0 ? sW.map(w=>monthlyWS[w].alumnos) : [0], 
    pieLabels:Object.keys(mS), pieData:Object.values(mS),
    adminStats: { byAccount: statsByAccount, byTrainer: statsByTrainer },
    availableWeeks: Array.from(availableWeeks).sort((a,b) => a-b)
  };
}

function getReportsHistory(p) {
  try {
    const force = p.refresh === 'true' || p.refresh === true;
    const target = (p.targetUser || "").toString().trim();
    const limit = parseInt(p.limit) || 20;
    const weekFilter = p.week ? parseInt(p.week) : null;
    const monthFilter = (p.month || "").toString().trim();
    const accountFilter = (p.account || "").toString().trim();
    const deviceFilter = (p.device || "").toString().trim().toLowerCase();
    const methodologyFilter = (p.methodology || "").toString().trim();
    const query = (p.q || "").toString().trim().toLowerCase();
    
    const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME, force);
    const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
    const sRef = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    const colMap = _getColMap(sRef);

    const result = [];
    const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    const availableFilters = { weeks: new Set(), months: new Set(), accounts: new Set(), methods: new Set(), devices: new Set() };

    const targetLower = target.toLowerCase();

    for (var j=1; j<d.length; j++) {
        var tVal = colMap.TRAINER !== undefined ? d[j][colMap.TRAINER] : d[j][1];
        var fVal = colMap.FECHA !== undefined ? d[j][colMap.FECHA] : d[j][2];
        if (!fVal || !tVal) continue;

        const rowTrainer = tVal.toString().trim().toLowerCase();
        const matchesUser = (target === "Total" || !target || rowTrainer === targetLower);
        
        if (matchesUser) {
            const dO = parseDateStable(fVal);
            if (dO) {
                const rowMonth = mNames[dO.getMonth()];
                const rowWeek = getWeekNumber(dO);
                availableFilters.accounts.add((d[j][colMap.CUENTA]||"Otros").toString().trim());
                availableFilters.methods.add((d[j][colMap.METODOLOGIA]||"Otros").toString().trim());
                if (monthFilter === "Todos" || rowMonth === monthFilter) availableFilters.weeks.add(rowWeek);
                if (weekFilter === null || rowWeek == weekFilter) availableFilters.months.add(rowMonth);
                const devs = ((d[j][colMap.DISP_MOVIL]||"") + ", " + (d[j][colMap.DISP_ECO]||"")).split(",");
                devs.forEach(dev => {
                    const clean = dev.trim();
                    if(clean && clean !== "-" && clean !== "0") availableFilters.devices.add(clean);
                });
            }
        }
    }

  
    for (let i = d.length - 1; i >= 1; i--) {
      var tVal = colMap.TRAINER !== undefined ? d[i][colMap.TRAINER] : d[i][1];
      var fVal = colMap.FECHA !== undefined ? d[i][colMap.FECHA] : d[i][2];
      if (!fVal || !tVal) continue;

      const rowTrainer = tVal.toString().trim().toLowerCase();
      const matchesUser = (target === "Total" || !target || rowTrainer === targetLower);
      
      if (!matchesUser) continue;
      const dO = parseDateStable(fVal);
      if (!dO) continue;
      
      if (weekFilter && weekFilter !== "Todos" && getWeekNumber(dO) != weekFilter) continue;
      if (monthFilter && monthFilter !== "Todos" && mNames[dO.getMonth()] !== monthFilter) continue;
      if (accountFilter && accountFilter !== "Todos" && (d[i][colMap.CUENTA]||"").toString().trim() !== accountFilter) continue;
      if (methodologyFilter && methodologyFilter !== "Todos" && (d[i][colMap.METODOLOGIA]||"").toString().trim() !== methodologyFilter) continue;
      
      if (deviceFilter && deviceFilter !== "todos") {
        const mobiles = (d[i][colMap.DISP_MOVIL]||"").toString().toLowerCase();
        const eco = (d[i][colMap.DISP_ECO]||"").toString().toLowerCase();
        if (mobiles.indexOf(deviceFilter) === -1 && eco.indexOf(deviceFilter) === -1) continue;
      }

      if (query) {
        const rowStr = [Utilities.formatDate(dO, Session.getScriptTimeZone(), "dd/MM/yyyy"), d[i][colMap.CUENTA], d[i][colMap.TIENDAS], d[i][colMap.DISP_MOVIL], d[i][colMap.DISP_ECO]].join(" ").toLowerCase();
        if (rowStr.indexOf(query) === -1) continue;
      }
      
      const dVal = d[i][0];
      let rowTimestamp = 0;
      if (dVal) {
          const parsed = (dVal instanceof Date) ? dVal : new Date(dVal);
          rowTimestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      const uniqueId = "RID_" + rowTimestamp + "_" + i;

      result.push({
        rowIdx: i + 1,
        id: uniqueId,
        timestamp: d[i][0], 
        trainer: (d[i][colMap.TRAINER] || d[i][1] || "").toString(), 
        fecha: (() => {
          let val = d[i][colMap.FECHA];
          if (!val) return "";
          let dO2 = (val instanceof Date) ? val : parseDateStable(val);
          if (!dO2) return val.toString();
          return dO2.getFullYear() + "-" + ("0" + (dO2.getMonth() + 1)).slice(-2) + "-" + ("0" + dO2.getDate()).slice(-2);
        })(),
        cuenta: (d[i][colMap.CUENTA] || "").toString(), 
        distribuidor: (d[i][colMap.DISTRIBUIDOR] || d[i][4] || "").toString(), 
        metodologia: (d[i][colMap.METODOLOGIA] || "").toString(),
        sesiones: d[i][colMap.SESIONES], 
        alumnos: d[i][colMap.ALUMNOS], 
        provincia: (d[i][colMap.PROVINCIA] || d[i][8] || "").toString(), 
        duracion: d[i][colMap.HORAS], 
        tiendas: d[i][colMap.TIENDAS], 
        perfil: (d[i][colMap.PERFIL] || "").toString(), 
        ciudad: (d[i][colMap.CIUDAD] || "").toString(), 
        contenidos: (d[i][colMap.CONTENIDOS] || "").toString(), 
        dispositivos: (d[i][colMap.DISP_MOVIL] || "").toString(), 
        dispositivos_no_movil: (d[i][colMap.DISP_ECO] || "").toString(), 
        comentarios: (d[i][colMap.COMENTARIOS] || "").toString(),
        photoLinks: (d[i][colMap.FOTOS] || "").toString()
      });
      if (result.length >= limit) break;
    }
    
    return { 
      status: "success", data: result,
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

function updateReport(p, session) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    let data = p.data;
    if (typeof data === 'string') data = JSON.parse(data);
    data = _validateReportData(data);
    const rowIdx = parseInt(p.rowIdx);
    if (!rowIdx || rowIdx < 1) {
        return { status: "error", message: "Error: No se ha recibido un índice de fila válido para actualizar (rowIdx=" + p.rowIdx + ")" };
    }
    const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
    const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    const colMap = _getColMap(s);
    
    const currentRow = s.getRange(rowIdx, 1, 1, s.getLastColumn()).getValues()[0];
    const existingTrainer = (currentRow[colMap.TRAINER] || currentRow[1] || "").toString().trim().toLowerCase();
    let incomingTrainer = (data.trainer || "").toString().trim().toLowerCase();
    const sessionUser = (session && session.user || "").toString().trim().toLowerCase();
    const isAdmin = Boolean(session && session.role === "Admin");
    
    if (!isAdmin && existingTrainer !== sessionUser) {
        return { status: "error", message: "No tienes permiso para editar." };
    }
    if (!isAdmin) {
      data.trainer = currentRow[colMap.TRAINER] || currentRow[1];
      incomingTrainer = existingTrainer;
    }

    var newPhotoUrls = _uploadPhotos(p.photos, data);
    // IMPORTANTE: Respetar la selección de fotos del frontend (permite borrar fotos antiguas)
    const keptPhotos = (data.existingPhotos || "").toString().trim();
    
    let finalPhotos = keptPhotos;
    if (newPhotoUrls.length > 0) {
        finalPhotos = keptPhotos ? (keptPhotos + "\n" + newPhotoUrls.join("\n")) : newPhotoUrls.join("\n");
    }

    // Limpiar y convertir a número
    const cleanNum = (v) => {
        if (v === undefined || v === null || v === "") return 0;
        const s = v.toString().replace(',', '.').replace(/[^0-9.]/g, '');
        return parseFloat(s) || 0;
    };

    const rowData = [...currentRow];
    
    if (colMap.TRAINER !== undefined) rowData[colMap.TRAINER] = data.trainer;
    if (colMap.FECHA !== undefined) rowData[colMap.FECHA] = data.fecha;
    if (colMap.CUENTA !== undefined) rowData[colMap.CUENTA] = data.cuenta;
    if (colMap.DISTRIBUIDOR !== undefined) rowData[colMap.DISTRIBUIDOR] = data.distribuidor;
    if (colMap.METODOLOGIA !== undefined) rowData[colMap.METODOLOGIA] = data.metodologia;
    if (colMap.SESIONES !== undefined) rowData[colMap.SESIONES] = cleanNum(data.sesiones);
    if (colMap.ALUMNOS !== undefined) rowData[colMap.ALUMNOS] = cleanNum(data.alumnos);
    if (colMap.PROVINCIA !== undefined) rowData[colMap.PROVINCIA] = data.provincia;
    if (colMap.HORAS !== undefined) rowData[colMap.HORAS] = cleanNum(data.duracion);
    if (colMap.TIENDAS !== undefined) rowData[colMap.TIENDAS] = cleanNum(data.tiendas);
    if (colMap.PERFIL !== undefined) rowData[colMap.PERFIL] = data.perfil;
    if (colMap.CIUDAD !== undefined) rowData[colMap.CIUDAD] = data.ciudad;
    if (colMap.CONTENIDOS !== undefined) rowData[colMap.CONTENIDOS] = data.contenidos;
    if (colMap.DISP_MOVIL !== undefined) rowData[colMap.DISP_MOVIL] = data.dispositivos;
    if (colMap.DISP_ECO !== undefined) rowData[colMap.DISP_ECO] = data.dispositivos_no_movil;
    if (colMap.COMENTARIOS !== undefined) rowData[colMap.COMENTARIOS] = data.comentarios;
    if (colMap.FOTOS !== undefined) rowData[colMap.FOTOS] = finalPhotos;
    
    s.getRange(rowIdx, 1, 1, rowData.length).setValues([rowData]);
    if (isAdmin && existingTrainer !== incomingTrainer) notifyUser(currentRow[1], "Se ha actualizado un reporte. Revísalo en tu historial", "Admin");
    
    _invalidateCache(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
    return { status: "success", message: "Reporte editado correctamente" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function deleteReport(p, session) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const id = p.id;
    if (!id) throw new Error("ID de reporte no proporcionado.");
    
    const s = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID).getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    const colMap = _getColMap(s);
    const d = s.getDataRange().getValues();
    
    let targetRow = -1;
    for (let i = d.length - 1; i >= 1; i--) {
      // FIX SENIOR: El timestamp debe ser consistente incluso si viene de caché (string) o de hoja (Date)
      const dVal = d[i][0];
      let rowTimestamp = 0;
      if (dVal) {
          const parsed = (dVal instanceof Date) ? dVal : new Date(dVal);
          rowTimestamp = isNaN(parsed.getTime()) ? 0 : parsed.getTime();
      }
      const currentUniqueId = "RID_" + rowTimestamp + "_" + i;
      
      if (currentUniqueId === id) {
        targetRow = i + 1;
        break;
      }
    }
    
    if (targetRow === -1) throw new Error("No se encontró el reporte.");

    const targetData = d[targetRow - 1];
    const targetTrainer = (targetData[colMap.TRAINER] || targetData[1] || "").toString().trim().toLowerCase();
    const sessionUser = (session && session.user || "").toString().trim().toLowerCase();
    if (!session || (session.role !== "Admin" && targetTrainer !== sessionUser)) {
      return { status: "error", code: "FORBIDDEN", message: "No tienes permiso para eliminar este reporte." };
    }
    
    s.deleteRow(targetRow);
    _invalidateCache(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
    return { status: "success", message: "Reporte eliminado" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function getWeekNumber(d) {
  var d2 = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  d2.setUTCDate(d2.getUTCDate() + 4 - (d2.getUTCDay() || 7));
  return Math.ceil((((d2 - new Date(Date.UTC(d2.getUTCFullYear(), 0, 1))) / 86400000) + 1) / 7);
}

function getCitiesList() {
  const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
  const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
  const colMap = _getColMap(s);
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
  return { status:"success", data:Array.from(new Set(d.slice(1).map(r=>(r[colMap.CIUDAD]||"").toString().trim()).filter(Boolean))) };
}

function getFilterMetadata() {
  const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
  const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
  const colMap = _getColMap(s);
  const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
  
  var ys = new Set(), ms = new Set(), devs = new Set(), accounts = new Set(), methodologies = new Set(), contents = new Set();
  var mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
  
  for (var i=1; i<d.length; i++) {
    var fVal = colMap.FECHA !== undefined ? d[i][colMap.FECHA] : d[i][2];
    if (!fVal) continue;
    var dO = parseDateStable(fVal);
    if(dO) { ys.add(dO.getFullYear().toString()); ms.add(mNames[dO.getMonth()]); }
    if(d[i][colMap.CUENTA]) accounts.add(d[i][colMap.CUENTA].toString().trim());
    if(d[i][colMap.METODOLOGIA]) methodologies.add(d[i][colMap.METODOLOGIA].toString().trim());
    if(d[i][colMap.CONTENIDOS]) contents.add(d[i][colMap.CONTENIDOS].toString().trim());
    
    var d1 = (d[i][colMap.DISP_MOVIL]||"").toString().split(',');
    var d2 = (d[i][colMap.DISP_ECO]||"").toString().split(',');
    d1.concat(d2).forEach(item => {
      var t = item.trim();
      if(t && t !== "0" && t !== "-") devs.add(t);
    });
  }
  return {
    status: "success", 
    data: {
      years: Array.from(ys).sort().reverse(),
      months: Array.from(ms),
      devices: Array.from(devs).sort(),
      accounts: Array.from(accounts).sort(),
      methodologies: Array.from(methodologies).sort(),
      contents: Array.from(contents).sort()
    }
  };
}

function _uploadPhotos(photos, data) {
  var photoUrls = [];
  if (photos && photos.length > 0) {
    try {
      var folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
      
      var cleanName = function(str) {
        if (!str) return "";
        return str.toString().trim()
          .replace(/[\/\?%\*:\x22<>\|]/g, '') // remove invalid filename chars
          .replace(/\s+/g, '_'); // replace spaces with underscores
      };
      
      var trainer = cleanName(data && data.trainer ? data.trainer : "usuario");
      var tienda = cleanName(data && data.cuenta ? data.cuenta : "tienda");
      var fecha = cleanName(data && data.fecha ? data.fecha : "fecha");
      
      for (var i=0; i<Math.min(photos.length, 20); i++) {
          var p = photos[i];
          if (p && p.base64Data && /^data:image\/(jpeg|jpg|png|webp);base64,/i.test(p.base64Data) && p.base64Data.length < 2600000) {
              try {
                var splitted = p.base64Data.split(',');
                // El replace(/\s/g, '') arregla los saltos de línea de iOS/Android que rompen el decodificador
                var base64 = (splitted.length > 1 ? splitted[1] : splitted[0]).replace(/\s/g, ''); 
                
                var ext = "jpg";
                if (p.mimeType && p.mimeType.indexOf("/") !== -1) {
                  ext = p.mimeType.split("/")[1];
                }
                var fileName = trainer + "_" + tienda + "_" + fecha + "_" + (i + 1) + "." + ext;
                var blob = Utilities.newBlob(Utilities.base64Decode(base64), p.mimeType || "image/jpeg", fileName);
                var file = folder.createFile(blob);
                file.setName(fileName); // Force Google Drive to set the clean filename
                photoUrls.push(file.getUrl());
              } catch(err) { console.error("Error individual photo:", err); }
          }
      }
    } catch(e) { console.error("Error uploading photos:", e); }
  }
  return photoUrls;
}

function _validateReportData(input) {
  const data = input || {};
  const text = function(value, max) {
    return String(value == null ? "" : value)
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
      .trim()
      .slice(0, max);
  };
  const number = function(value, max) {
    const parsed = parseFloat(String(value == null ? "" : value).replace(",", ".").replace(/[^0-9.]/g, "")) || 0;
    return Math.min(max, Math.max(0, parsed));
  };
  const allowedMethods = ["Backoffice", "Classroom", "Evento", "Hospitality", "Live", "POS", "Reunión Interna", "Training Material", "Viaje", "Webinar"];
  const result = {
    trainer: text(data.trainer, 100),
    fecha: text(data.fecha, 10),
    cuenta: text(data.cuenta, 120),
    distribuidor: text(data.distribuidor, 180),
    metodologia: text(data.metodologia, 50),
    sesiones: number(data.sesiones, 1000),
    alumnos: number(data.alumnos, 100000),
    provincia: text(data.provincia, 100),
    duracion: number(data.duracion, 1000),
    tiendas: number(data.tiendas, 10000),
    perfil: text(data.perfil, 100),
    ciudad: text(data.ciudad, 120),
    contenidos: text(data.contenidos, 120),
    dispositivos: text(data.dispositivos, 1000),
    dispositivos_no_movil: text(data.dispositivos_no_movil, 1000),
    comentarios: text(data.comentarios, 5000),
    existingPhotos: text(data.existingPhotos, 10000)
  };
  if (!result.trainer || !result.cuenta || !/^\d{4}-\d{2}-\d{2}$/.test(result.fecha) || allowedMethods.indexOf(result.metodologia) === -1) {
    const error = new Error("El reporte contiene campos obligatorios o valores no válidos.");
    error.code = "VALIDATION_ERROR";
    throw error;
  }
  return result;
}

function handleSaveReport(data, photos) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    data = _validateReportData(data);
    const s = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID).getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    const colMap = _getColMap(s);
    
    // Limpiar y convertir a número de forma segura
    const cleanNum = (v) => {
        if (v === undefined || v === null || v === "") return 0;
        const s = v.toString().replace(',', '.').replace(/[^0-9.]/g, '');
        return parseFloat(s) || 0;
    };

    var photoUrls = _uploadPhotos(photos, data);
    var urlsString = photoUrls.join("\n");
    
    // Obtenemos el número real de columnas de la hoja
    const totalCols = Math.max(s.getLastColumn(), 20); // Asegura al menos 20 huecos de memoria
    const rowData = new Array(totalCols).fill(""); 
    
    // Asignación segura basada en el colMap
    rowData[0] = new Date(); // Asumimos que la Col A (índice 0) es Timestamp
    
    if (colMap.TRAINER !== undefined) rowData[colMap.TRAINER] = data.trainer;
    if (colMap.FECHA !== undefined) rowData[colMap.FECHA] = data.fecha;
    if (colMap.CUENTA !== undefined) rowData[colMap.CUENTA] = data.cuenta;
    if (colMap.DISTRIBUIDOR !== undefined) rowData[colMap.DISTRIBUIDOR] = data.distribuidor;
    if (colMap.METODOLOGIA !== undefined) rowData[colMap.METODOLOGIA] = data.metodologia;
    if (colMap.SESIONES !== undefined) rowData[colMap.SESIONES] = cleanNum(data.sesiones);
    if (colMap.ALUMNOS !== undefined) rowData[colMap.ALUMNOS] = cleanNum(data.alumnos);
    if (colMap.PROVINCIA !== undefined) rowData[colMap.PROVINCIA] = data.provincia;
    if (colMap.HORAS !== undefined) rowData[colMap.HORAS] = cleanNum(data.duracion);
    if (colMap.TIENDAS !== undefined) rowData[colMap.TIENDAS] = cleanNum(data.tiendas);
    if (colMap.PERFIL !== undefined) rowData[colMap.PERFIL] = data.perfil;
    if (colMap.CIUDAD !== undefined) rowData[colMap.CIUDAD] = data.ciudad;
    if (colMap.CONTENIDOS !== undefined) rowData[colMap.CONTENIDOS] = data.contenidos;
    if (colMap.DISP_MOVIL !== undefined) rowData[colMap.DISP_MOVIL] = data.dispositivos;
    if (colMap.DISP_ECO !== undefined) rowData[colMap.DISP_ECO] = data.dispositivos_no_movil;
    if (colMap.COMENTARIOS !== undefined) rowData[colMap.COMENTARIOS] = data.comentarios;
    if (colMap.FOTOS !== undefined) rowData[colMap.FOTOS] = urlsString;
    
    s.appendRow(rowData);
    _invalidateCache(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME);
    return { status:"success" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { lock.releaseLock(); }
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
        if ((rowTo === target) || (isAdmin && rowTo === "admin")) {
            result.push({ id: d[i][0], date: d[i][1], to: d[i][2], from: d[i][3], text: d[i][4], read: d[i][5] === true || (d[i][5] && d[i][5].toString().toUpperCase() === "TRUE") });
        }
    }
    return { status: "success", data: result.reverse() };
  } catch(e) { return { status: "error", message: e.toString() }; }
}

function handleMarkMessageRead(p, session) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
      const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
      if (!smsg) return { status: "error", message: "No sheet" };
      const d = smsg.getDataRange().getValues();
      for (let i = 1; i < d.length; i++) {
        if (d[i][0].toString() === p.msgId.toString()) {
          const recipient = (d[i][2] || "").toString().trim().toLowerCase();
          const sessionUser = (session && session.user || "").toString().trim().toLowerCase();
          if (!session || (session.role !== "Admin" && recipient !== sessionUser)) {
            return { status: "error", code: "FORBIDDEN", message: "No tienes permiso para modificar este mensaje." };
          }
          smsg.getRange(i+1, 6).setValue("TRUE");
          return { status: "success" };
        }
      }
      return { status: "error", message: "Not found ID" };
    } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function handleMarkAllMessagesRead(p) {
    const lock = LockService.getScriptLock();
    try {
        lock.waitLock(10000);
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
        return { status: "success" };
    } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function notifyAdmins(text, fromUser) {
    try {
        const safeUser = (fromUser || "").toString();
        const isAdmin = CONFIG.ADMINS.some(a => a.toLowerCase() === safeUser.toLowerCase()) || /Manager|Coordinator|Creator/i.test(safeUser);
        if (isAdmin) return;
        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        let smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) smsg = ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
        if (smsg.getLastRow() === 0) smsg.appendRow(["ID", "Date", "ToUser", "FromUser", "Text", "Read"]);
        smsg.appendRow([ Date.now() + Math.floor(Math.random()*1000), new Date(), "Admin", safeUser, text, "FALSE" ]);
    } catch(e) {}
}

function notifyAllUsers(text) {
    try {
        const dU = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.USUARIOS_SHEET_NAME);
        dU.slice(1).forEach(r => notifyUser(r[0].toString(), text));
    } catch(e) {}
}

function notifyUser(toUser, text, fromUser) {
    try {
        const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
        let smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
        if (!smsg) smsg = ss.insertSheet(CONFIG.MENSAJES_SHEET_NAME);
        smsg.appendRow([ Date.now() + Math.floor(Math.random()*1000), new Date(), toUser, fromUser || "System", text, "FALSE" ]);
    } catch(e) {}
}

function getWeeklySchedule(p) {
  try {
    const start = p.start, end = p.end;
    const dPlan = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.PLANIFICACION_SHEET_NAME);
    const dVacas = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
    const dFest = _getValuesCached(CONFIG.USUARIOS_SS_ID, CONFIG.FESTIVOS_SHEET_NAME);
    const users = getUsersList().data || [];

    const scheduleByDay = {};
    for (let i = 1; i < dPlan.length; i++) {
        const dO = parseDateStable(dPlan[i][2]);
        if (!dO) continue;
        const dStr = dO.getFullYear() + "-" + ("0" + (dO.getMonth() + 1)).slice(-2) + "-" + ("0" + dO.getDate()).slice(-2);
        if (dStr >= start && dStr <= end) {
            if (!scheduleByDay[dStr]) scheduleByDay[dStr] = {};
            const u = (dPlan[i][1]||"").toString();
            if (!u) continue;
            if (!scheduleByDay[dStr][u]) scheduleByDay[dStr][u] = [];
            scheduleByDay[dStr][u].push({ id: dPlan[i][0], text: dPlan[i][3], category: dPlan[i][4] });
        }
    }

    const blocks = {};
    const normalizedBlocks = {}; 
    users.forEach(u => {
      const data = { vacationInfo: [], festivos: [] };
      blocks[u.user] = data; 
      normalizedBlocks[(u.user || "").toString().trim().toLowerCase()] = data;
    });

    for (let i = 1; i < dFest.length; i++) {
        const uKey = (dFest[i][0]||"").toString().trim().toLowerCase();
        if (normalizedBlocks[uKey]) {
            for (let col = 3; col < dFest[i].length; col++) {
                const dO = parseDateStable(dFest[i][col]);
                if (dO) {
                    const fStr = dO.getFullYear() + "-" + ("0" + (dO.getMonth() + 1)).slice(-2) + "-" + ("0" + dO.getDate()).slice(-2);
                    if (fStr >= start && fStr <= end) {
                        normalizedBlocks[uKey].festivos.push(fStr);
                        normalizedBlocks[uKey][fStr] = "FESTIVO";
                    }
                }
            }
        }
    }

    for (let i = 1; i < dVacas.length; i++) {
        const uKey = (dVacas[i][1]||"").toString().trim().toLowerCase();
        const status = dVacas[i][5];
        if (normalizedBlocks[uKey] && (status === "Aprobado" || status === "Pendiente")) {
            normalizedBlocks[uKey].vacationInfo.push({ fechas: dVacas[i][2], status: status });
        }
    }
    return { status: "success", schedule: scheduleByDay, blocks: blocks };
  } catch(e) { return { status: "error", message: "getWeekly error: " + e.toString() }; }
}

function adminProcessSelection(req) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const action = req.opAction; 
    if (action === 'notify_materials') {
        const msg = req.mensajeNovedad ? req.mensajeNovedad : "Nuevos materiales disponibles en tu repositorio.";
        notifyAllUsers(msg);
        return { status: "success" };
    }

    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.VACACIONES_SHEET_NAME);
    const userNorm = req.user.trim().toLowerCase();

    if (action === 'remove') {
      const d = s.getDataRange().getValues();
      const datesToRemove = req.dates; 
      const toISO = (dateObj) => dateObj.getFullYear() + "-" + String(dateObj.getMonth() + 1).padStart(2, '0') + "-" + String(dateObj.getDate()).padStart(2, '0');

      let newData = [d[0]]; 
      let newIndividualDays = [];

      for (let i = 1; i < d.length; i++) {
        if (d[i][1].toString().trim().toLowerCase() !== userNorm) {
            newData.push(d[i]); 
            continue;
        }
        
        const rangeStr = d[i][2].toString();
        const type = d[i][4];
        const matches = rangeStr.match(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g);
        
        if (!matches) { newData.push(d[i]); continue; }
        
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

        let thisRowRemoved = false;
        let daysToKeep = [];

        daysInRow.forEach(day => {
            if (datesToRemove.includes(toISO(day))) { thisRowRemoved = true; }
            else daysToKeep.push(day);
        });

        if (thisRowRemoved) {
            daysToKeep.forEach(day => newIndividualDays.push({date: day, type: type, originalDateVal: d[i][0]}));
        } else {
            newData.push(d[i]); 
        }
      }

      const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
      newIndividualDays.forEach((obj, idx) => {
          const dObj = obj.date;
          const label = "Día " + Utilities.formatDate(dObj, Session.getScriptTimeZone(), "dd/MM/yy");
          const mLabel = mNames[dObj.getMonth()] + " " + dObj.getFullYear();
          const id = "ADM_" + Date.now() + "_" + Math.floor(Math.random()*1000) + "_" + idx;
          newData.push([obj.originalDateVal, req.user, label, mLabel, obj.type, "Aprobado", 1, id]);
      });

      s.clearContents();
      if(newData.length > 0) s.getRange(1, 1, newData.length, newData[0].length).setValues(newData);

      const smsg = ss.getSheetByName(CONFIG.MENSAJES_SHEET_NAME);
      if (smsg) {
          const dMsg = smsg.getDataRange().getValues();
          for (let i = 1; i < dMsg.length; i++) {
              if (dMsg[i][2] === "Admin" && (dMsg[i][4]||"").toString().includes(req.user) && dMsg[i][5].toString().toUpperCase() === "FALSE") {
                  smsg.getRange(i+1, 6).setValue("TRUE");
              }
          }
      }

      _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
      notifyUser(req.user, `Admin ha ELIMINADO vacaciones/días extra de tu calendario para: ${req.dates.join(", ")}.`);
      return { status: "success", action: "removed" };
    } else {
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
      
      Object.keys(groups).forEach((m, idx) => {
          const sDates = groups[m].sort();
          let label = sDates.length > 1 
            ? "Del " + Utilities.formatDate(parseDateStable(sDates[0]), Session.getScriptTimeZone(), "dd/MM/yy") + " al " + Utilities.formatDate(parseDateStable(sDates[sDates.length - 1]), Session.getScriptTimeZone(), "dd/MM/yy")
            : "Día " + Utilities.formatDate(parseDateStable(sDates[0]), Session.getScriptTimeZone(), "dd/MM/yy");
          const id = "ADM_" + Date.now() + "_" + Math.floor(Math.random()*1000) + "_" + idx;
          s.appendRow([new Date(), req.user, label, m, type, "Aprobado", sDates.length, id]);
      });

      _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.VACACIONES_SHEET_NAME);
      notifyUser(req.user, `Admin ha ASIGNADO ${type} en tu calendario para: ${req.dates.join(", ")}.`);
      return { status: "success", action: "added" };
    }
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function saveWeeklyAssignment(req) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(10000);
    const ss = SpreadsheetApp.openById(CONFIG.USUARIOS_SS_ID);
    const s = ss.getSheetByName(CONFIG.PLANIFICACION_SHEET_NAME);
    const d = s.getDataRange().getValues();
    
    const rowsToDelete = [];
    for (let i = 1; i < d.length; i++) {
        const pDate = parseDateStable(d[i][2]);
        if (!pDate) continue;
        
        const dStr = pDate.getFullYear() + "-" + ("0" + (pDate.getMonth() + 1)).slice(-2) + "-" + ("0" + pDate.getDate()).slice(-2);
        if (d[i][1] === req.user && dStr === req.date) rowsToDelete.push(i + 1);
    }
    rowsToDelete.sort(function(a, b) { return b - a; }).forEach(function(row) { s.deleteRow(row); });
    
    if (req.items && req.items.length > 0) {
      const rows = req.items
        .filter(function(it) { return it && String(it.text || "").trim(); })
        .slice(0, 20)
        .map(function(it) {
          return [Date.now(), req.user, req.date, String(it.text).trim().slice(0, 1000), String(it.category || "otros").slice(0, 50), req.modifiedBy || ""];
        });
      if (rows.length) s.getRange(s.getLastRow() + 1, 1, rows.length, rows[0].length).setValues(rows);
    }
    
    _invalidateCache(CONFIG.USUARIOS_SS_ID, CONFIG.PLANIFICACION_SHEET_NAME);
    if (req.notify) {
        notifyUser(req.user, "Se ha actualizado tu planificación semanal.");
    }
    return { status: "success" };
  } catch(e) { return { status: "error", message: e.toString() }; } finally { SpreadsheetApp.flush(); lock.releaseLock(); }
}

function parseDateStable(val) {
  if (!val) return null;
  
  // 1. Si es un objeto Date nativo de Google Sheets (lectura fresca)
  if (val instanceof Date && !isNaN(val.getTime())) {
    // Hack senior: sumamos 6 horas al UTC para evitar que el desfase 
    // de medianoche local tire la fecha al día anterior.
    const d = new Date(val.getTime() + (6 * 60 * 60 * 1000));
    return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
  }
  
  try {
    const s = val.toString().trim();
    
    // 2. EL FIX DEL BUG DE LA CACHÉ: 
    // Si viene congelado de la caché en formato UTC (ej: "2026-04-30T22:00:00.000Z")
    if (s.includes('T') && s.endsWith('Z')) {
        const d = new Date(s);
        // Le sumamos 6 horas virtuales para que pase de las 22:00 a las 04:00 del día correcto
        d.setTime(d.getTime() + (6 * 60 * 60 * 1000));
        return new Date(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 12, 0, 0, 0);
    }
    
    // 3. String puro (ej: "15/04/2026" o "2026-04-15") escrito a mano
    const p = s.split(/[-\/]/); 
    if (p.length === 3 && !s.includes('T')) {
      let dd, mm, yy;
      // Detectamos el orden según si el año va primero o último
      if (p[0].length === 4) { yy = parseInt(p[0]); mm = parseInt(p[1]); dd = parseInt(p[2]); }
      else { dd = parseInt(p[0]); mm = parseInt(p[1]); yy = parseInt(p[2]); }
      if (yy < 100) yy += 2000;
      // Fijamos a mediodía para tener margen por ambos lados
      return new Date(yy, mm - 1, dd, 12, 0, 0, 0); 
    }
    
    // 4. Fallback genérico
    const d = new Date(val);
    if (!isNaN(d.getTime())) { d.setHours(12, 0, 0, 0); return d; }
    return null;
  } catch(e) { return null; }
}

// --- AUTO-LIMPIEZA AL EDITAR EL EXCEL MANUALMENTE ---
function onManualSheetChange(e) {
  // Limpia la caché de los reportes automáticamente si alguien borra o edita una fila a mano
  CacheService.getScriptCache().remove(CONFIG.REPORTES_SS_ID + "_" + CONFIG.REPORTES_SHEET_NAME);
}

// --- AUTOMATED PDF REPORTS ---
function setupAllTriggers() {
  const triggers = ScriptApp.getProjectTriggers();
  ["runWeekly", "runMonthly", "runQuarterly", "runAnnual"].forEach(fn => {
    triggers.forEach(t => { if (t.getHandlerFunction() === fn) ScriptApp.deleteTrigger(t); });
  });

  // Weekly: Mondays at 09:30
  ScriptApp.newTrigger("runWeekly")
    .timeBased()
    .onWeekDay(ScriptApp.WeekDay.MONDAY)
    .atHour(9).nearMinute(30).create();

  // Monthly: 1st of every month at 08:30
  ScriptApp.newTrigger("runMonthly")
    .timeBased()
    .onMonthDay(1)
    .atHour(8).nearMinute(30).create();

  // Quarterly and Annual also run on the 1st of the month, but will abort inside if it's the wrong month
  ScriptApp.newTrigger("runQuarterly")
    .timeBased()
    .onMonthDay(1)
    .atHour(9).nearMinute(0).create();

  ScriptApp.newTrigger("runAnnual")
    .timeBased()
    .onMonthDay(1)
    .atHour(9).nearMinute(30).create();
}

function runWeekly() { generatePDFReport("WEEKLY"); }
function runMonthly() { generatePDFReport("MONTHLY"); }
function runQuarterly() { 
  const m = new Date().getMonth();
  if ([0, 3, 6, 9].includes(m)) generatePDFReport("QUARTERLY"); 
}
function runAnnual() {
  if (new Date().getMonth() === 0) generatePDFReport("ANNUAL");
}

function generateCustomPDF(p) {
    const force = p.refresh === 'true' || p.refresh === true;
    const now = new Date();
    const d = _getValuesCached(CONFIG.REPORTES_SS_ID, CONFIG.REPORTES_SHEET_NAME, force);
    const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
    const sRef = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
    const colMap = _getColMap(sRef);
    
    const target = (p.targetUser || "Total").toString().trim();
    const targetWeeksStr = (p.weeks || p.week || "").toString().trim();
    const targetMonth = (p.month || "Todos").toString().trim();
    const targetYear = (p.year || "Todos").toString().trim();
    const targetDevice = (p.device || "todos").toString().trim().toLowerCase();
    const targetMethodology = (p.methodology || "Todos").toString().trim().toLowerCase();
    const targetContent = (p.content || "Todos").toString().trim().toLowerCase();
    
    const startDateStr = (p.startDate || "").toString().trim();
    const endDateStr = (p.endDate || "").toString().trim();

    let startD = startDateStr ? new Date(startDateStr) : null;
    let endD = endDateStr ? new Date(endDateStr) : null;
    if(startD) { startD.setHours(0,0,0,0); }
    if(endD) { endD.setHours(23,59,59,999); }
    let isTimeFiltered = startD || endD || targetMonth !== "Todos" || targetWeeksStr || targetYear !== "Todos";

    let selectedWeeks = [];
    if (targetWeeksStr) {
      const matches = targetWeeksStr.match(/\d+/g);
      if (matches) selectedWeeks = matches.map(Number);
    }
    let selectedMonths = [];
    if (targetMonth !== "Todos") {
        selectedMonths = targetMonth.split(',').map(m => m.trim());
    }
    let selectedMethodologies = [];
    if (targetMethodology !== "todos" && targetMethodology !== "") selectedMethodologies = targetMethodology.split(',').map(m => m.trim());
    let selectedContents = [];
    if (targetContent !== "todos" && targetContent !== "") selectedContents = targetContent.split(',').map(m => m.trim());
    
    const mNames = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"];
    
    let previousDevice = null;
    let isModelComparison = false;

    if (!isTimeFiltered && targetDevice !== "todos" && targetDevice !== "") {
        const allDevices = new Set();
        for (let i = 1; i < d.length; i++) {
            let devStr = (d[i][colMap.DISP_MOVIL] || d[i][11] || "").toString().trim().toLowerCase();
            if (devStr) {
                let devs = [];
                try {
                    let parsed = JSON.parse(devStr);
                    if (Array.isArray(parsed)) devs = parsed.map(x => (x.modelo || x).toString().trim().toLowerCase());
                    else devs = [devStr];
                } catch(e) {
                    devs = devStr.split(',').map(x => x.trim().toLowerCase());
                }
                devs.forEach(x => { if(x) allDevices.add(x); });
            }
        }
        
        let match = targetDevice.match(/(\d+)/);
        if (match) {
            let num = parseInt(match[1]);
            let baseNameBefore = targetDevice.substring(0, match.index);
            let baseNameAfter = targetDevice.substring(match.index + match[1].length);
            for (let i = num - 1; i > 0; i--) {
                let candidate = baseNameBefore + i + baseNameAfter;
                let found = false;
                for (let dev of allDevices) {
                    if (dev === candidate || dev.includes(candidate)) {
                        previousDevice = dev;
                        found = true;
                        break;
                    }
                }
                if (found) break;
            }
        }
        if (previousDevice) isModelComparison = true;
    }

    let cw = { sesiones: 0, alumnos: 0, horas: 0, byAccount: {}, byTrainer: {} };
    let pw = { sesiones: 0, alumnos: 0, horas: 0 };
    let ly = { sesiones: 0, alumnos: 0, horas: 0 };
    let yt = { sesiones: 0, alumnos: 0, horas: 0 };

    for (let i = 1; i < d.length; i++) {
        var fVal = colMap.FECHA !== undefined ? d[i][colMap.FECHA] : d[i][2];
        var tVal = colMap.TRAINER !== undefined ? d[i][colMap.TRAINER] : d[i][1];
        if (!fVal || !tVal) continue; 
        
        var dO = parseDateStable(fVal); if (!dO) continue;
        var rowYear = dO.getFullYear();
        var rowMonth = dO.getMonth();
        var rowWeek = getWeekNumber(dO);
        const dTime = dO.getTime();

        const ses = parseFloat(d[i][colMap.SESIONES] || d[i][6]) || 0;
        const alu = parseFloat(d[i][colMap.ALUMNOS] || d[i][8]) || 0;
        const hor = _parseDur(d[i][colMap.HORAS] || d[i][9]);
        const trainer = tVal.toString().trim();
        const account = (d[i][colMap.CUENTA] || "Otros").toString().trim() || "Otros";
        const method = (d[i][colMap.METODOLOGIA] || "Otros").toString().trim() || "Otros";
        let devStr = (d[i][colMap.DISP_MOVIL] || d[i][11] || "").toString().trim().toLowerCase();

        if (target !== "Total" && trainer !== target) continue;
        
        let methodMatch = true;
        if (selectedMethodologies.length > 0) {
            methodMatch = selectedMethodologies.includes(method);
        }
        if (!methodMatch) continue;

        let contentMatch = true;
        const rowContent = (d[i][colMap.CONTENIDOS] || "Otros").toString().trim().toLowerCase();
        if (selectedContents.length > 0) {
            contentMatch = selectedContents.includes(rowContent);
        }
        if (!contentMatch) continue;

        let devMatch = false;
        let pastDevMatch = false;
        if (targetDevice === "todos" || targetDevice === "") devMatch = true;
        else if (devStr.includes(targetDevice)) devMatch = true;
        
        if (isModelComparison) {
            if (devStr.includes(previousDevice)) pastDevMatch = true;
        } else {
            pastDevMatch = devMatch;
        }

        let matchesTime = true;
        let matchesPastTime = false;
        let matchesLYTime = false;
        let matchesYTTime = false;

        if (startD && endD) {
            matchesTime = dTime >= startD.getTime() && dTime <= endD.getTime();
            let dur = endD.getTime() - startD.getTime();
            let pEnd = startD.getTime() - 1;
            let pStart = pEnd - dur;
            matchesPastTime = (dTime >= pStart && dTime <= pEnd);
            let lyS = new Date(startD); lyS.setFullYear(lyS.getFullYear()-1);
            let lyE = new Date(endD); lyE.setFullYear(lyE.getFullYear()-1);
            matchesLYTime = isModelComparison ? matchesTime : (dTime >= lyS.getTime() && dTime <= lyE.getTime());
            let ytS = new Date(endD.getFullYear(), 0, 1);
            matchesYTTime = dTime >= ytS.getTime() && dTime <= endD.getTime();
        } else {
            if (targetYear !== "Todos" && rowYear.toString() !== targetYear) matchesTime = false;
            if (selectedMonths.length > 0 && !selectedMonths.includes(mNames[rowMonth])) matchesTime = false;
            if (selectedWeeks.length > 0 && !selectedWeeks.includes(rowWeek)) matchesTime = false;
            
            if (selectedMonths.length === 1 && selectedWeeks.length === 0) {
                let mIdx = mNames.indexOf(selectedMonths[0]);
                let pIdx = mIdx === 0 ? 11 : mIdx - 1;
                let pYear = mIdx === 0 ? (targetYear !== "Todos" ? parseInt(targetYear)-1 : rowYear) : (targetYear !== "Todos" ? parseInt(targetYear) : rowYear);
                matchesPastTime = (rowMonth === pIdx) && (rowYear === pYear);
            } else if (selectedWeeks.length === 1) {
                matchesPastTime = (rowWeek === selectedWeeks[0] - 1) && (rowYear === (targetYear !== "Todos" ? parseInt(targetYear) : rowYear));
            } else if (targetYear !== "Todos" && selectedMonths.length === 0 && selectedWeeks.length === 0) {
                matchesPastTime = rowYear === parseInt(targetYear) - 1;
            }
    
            if (isModelComparison) {
                matchesLYTime = matchesTime;
            } else {
                if (targetYear !== "Todos") {
                    matchesLYTime = (rowYear === parseInt(targetYear) - 1);
                    if (selectedMonths.length > 0 && !selectedMonths.includes(mNames[rowMonth])) matchesLYTime = false;
                    if (selectedWeeks.length > 0 && !selectedWeeks.includes(rowWeek)) matchesLYTime = false;
                }
            }
            if (targetYear !== "Todos") {
                matchesLYTime = (rowYear === parseInt(targetYear) - 1);
                if (selectedMonths.length > 0 && !selectedMonths.includes(mNames[rowMonth])) matchesLYTime = false;
                if (selectedWeeks.length > 0 && !selectedWeeks.includes(rowWeek)) matchesLYTime = false;
                matchesYTTime = (rowYear === parseInt(targetYear));
            } else {
                matchesYTTime = (rowYear === now.getFullYear());
            }
        }

        if (devMatch && matchesYTTime) { yt.sesiones += ses; yt.alumnos += alu; yt.horas += hor; }
        if (devMatch && matchesTime) {
            cw.sesiones += ses; cw.alumnos += alu; cw.horas += hor;
            if (!cw.byAccount[account]) cw.byAccount[account] = { sesiones: 0, alumnos: 0, horas: 0 };
            cw.byAccount[account].sesiones += ses; cw.byAccount[account].alumnos += alu; cw.byAccount[account].horas += hor;
            if (!cw.byTrainer[trainer]) cw.byTrainer[trainer] = { sesiones: 0, alumnos: 0, horas: 0, byMethod: {} };
            cw.byTrainer[trainer].sesiones += ses; cw.byTrainer[trainer].alumnos += alu; cw.byTrainer[trainer].horas += hor;
            if (!cw.byTrainer[trainer].byMethod[method]) cw.byTrainer[trainer].byMethod[method] = 0;
            cw.byTrainer[trainer].byMethod[method] += hor;
        }
        if (devMatch && matchesPastTime) { 
            pw.sesiones += ses; pw.alumnos += alu; pw.horas += hor; 
            if (!pw.byAccount[account]) pw.byAccount[account] = { sesiones: 0, alumnos: 0, horas: 0 };
            pw.byAccount[account].sesiones += ses; pw.byAccount[account].alumnos += alu; pw.byAccount[account].horas += hor;
        }
        if (isModelComparison) {
            if (pastDevMatch && matchesLYTime) { 
                ly.sesiones += ses; ly.alumnos += alu; ly.horas += hor; 
                if (!ly.byAccount[account]) ly.byAccount[account] = { sesiones: 0, alumnos: 0, horas: 0 };
                ly.byAccount[account].sesiones += ses; ly.byAccount[account].alumnos += alu; ly.byAccount[account].horas += hor;
            }
        } else {
            if (devMatch && matchesLYTime) { 
                ly.sesiones += ses; ly.alumnos += alu; ly.horas += hor; 
                if (!ly.byAccount[account]) ly.byAccount[account] = { sesiones: 0, alumnos: 0, horas: 0 };
                ly.byAccount[account].sesiones += ses; ly.byAccount[account].alumnos += alu; ly.byAccount[account].horas += hor;
            }
        }
    }

    let reportTitle = "REPORTE PERSONALIZADO";
    let periodString = "Filtros Personalizados";
    let currentLabel = "Periodo Analizado";
    let pastLabel = "Periodo Anterior";
    const formatD = (date) => Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MM/yy");

    let baseTimeLabel = "";
    if (isTimeFiltered) {
        if (startD && endD) {
            baseTimeLabel = `${formatD(startD)} - ${formatD(endD)}`;
        } else if (selectedMonths.length > 0 && selectedWeeks.length > 0) {
            baseTimeLabel = `${selectedMonths.join(', ')}, Semana ${selectedWeeks.join(', ')}`;
            if (targetYear !== "Todos") baseTimeLabel += ` del ${targetYear}`;
        } else if (selectedMonths.length > 0) {
            baseTimeLabel = `${selectedMonths.join(', ')}`;
            if (targetYear !== "Todos") baseTimeLabel += ` ${targetYear}`;
        } else if (selectedWeeks.length > 0) {
            baseTimeLabel = `Semana ${selectedWeeks.join(', ')}`;
            if (targetYear !== "Todos") baseTimeLabel += ` del ${targetYear}`;
        } else if (targetYear !== "Todos") {
            baseTimeLabel = `Año ${targetYear}`;
        }
    }

    let lyTitle = "Versus Año Anterior";
    let lyColLabel = "Mismo periodo (Año Pasado)";

    if (isModelComparison) {
        reportTitle = "REPORTE DE DISPOSITIVO";
        periodString = baseTimeLabel ? `${baseTimeLabel} (${targetDevice.toUpperCase()})` : targetDevice.toUpperCase();
        currentLabel = baseTimeLabel ? `${baseTimeLabel} (${targetDevice.toUpperCase()})` : targetDevice.toUpperCase();
        pastLabel = "Periodo Anterior";
        lyTitle = `Versus Modelo Anterior (${previousDevice.toUpperCase()})`;
        lyColLabel = previousDevice.toUpperCase();
        yt = null; 
    } else {
        if (baseTimeLabel) {
            if (targetDevice !== "todos" && targetDevice !== "") {
                periodString = `${baseTimeLabel} (${targetDevice.toUpperCase()})`;
                currentLabel = periodString;
                if (selectedMonths.length > 0 && selectedWeeks.length === 0) pastLabel = `Mes Anterior (${targetDevice.toUpperCase()})`;
                else if (selectedWeeks.length > 0) pastLabel = `Semana Anterior (${targetDevice.toUpperCase()})`;
                else pastLabel = `Periodo Anterior (${targetDevice.toUpperCase()})`;
            } else {
                periodString = baseTimeLabel;
                currentLabel = periodString;
                if (selectedMonths.length > 0 && selectedWeeks.length === 0) pastLabel = "Mes Anterior";
                else if (selectedWeeks.length > 0) pastLabel = "Semana Anterior";
                else pastLabel = "Periodo Anterior";
            }
        } else {
            periodString = "Todos los tiempos";
            if (targetDevice !== "todos" && targetDevice !== "") periodString += ` (${targetDevice.toUpperCase()})`;
            currentLabel = "Periodo Analizado";
            pastLabel = "Periodo Anterior";
        }
        pw = pw; ly = ly; yt = yt;
    }

    const htmlContent = _buildPDFHTML(reportTitle, periodString, currentLabel, pastLabel, cw, pw, ly, yt, lyTitle, lyColLabel);
    const blob = Utilities.newBlob(htmlContent, MimeType.HTML);
    const pdfBlob = blob.getAs(MimeType.PDF);
    
    return {
        status: "success",
        pdfBase64: Utilities.base64Encode(pdfBlob.getBytes()),
        filename: "Reporte_Personalizado_" + formatD(now).replace(/\//g,'-') + ".pdf"
    };
}

function testGeneratePDF() {
  generatePDFReport("WEEKLY");
}

function generatePDFReport(periodType) {
  const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
  const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
  const colMap = _getColMap(s);
  const data = s.getDataRange().getValues();

  const today = new Date();
  let currentStart, currentEnd, pastStart, pastEnd;
  let reportTitle = "";
  let currentLabel = "";
  let pastLabel = "";

  if (periodType === "WEEKLY") {
    reportTitle = "REPORTE SEMANAL";
    currentLabel = "Semana Analizada";
    pastLabel = "Semana Anterior";
    const dayOfWeek = today.getDay() === 0 ? 7 : today.getDay();
    currentEnd = new Date(today.getFullYear(), today.getMonth(), today.getDate() - dayOfWeek);
    currentEnd.setHours(23, 59, 59, 999);
    currentStart = new Date(currentEnd);
    currentStart.setDate(currentEnd.getDate() - 6);
    currentStart.setHours(0, 0, 0, 0);

    pastStart = new Date(currentStart); pastStart.setDate(currentStart.getDate() - 7);
    pastEnd = new Date(currentEnd); pastEnd.setDate(currentEnd.getDate() - 7);
    pastEnd.setHours(23, 59, 59, 999);
  } else if (periodType === "MONTHLY") {
    reportTitle = "REPORTE MENSUAL";
    currentLabel = "Mes Analizado";
    pastLabel = "Mes Anterior";
    currentEnd = new Date(today.getFullYear(), today.getMonth(), 0, 23, 59, 59, 999);
    currentStart = new Date(today.getFullYear(), today.getMonth() - 1, 1, 0, 0, 0, 0);

    pastEnd = new Date(today.getFullYear(), today.getMonth() - 1, 0, 23, 59, 59, 999);
    pastStart = new Date(today.getFullYear(), today.getMonth() - 2, 1, 0, 0, 0, 0);
  } else if (periodType === "QUARTERLY") {
    reportTitle = "REPORTE TRIMESTRAL";
    currentLabel = "Trimestre Analizado";
    pastLabel = "Trimestre Anterior";
    // 0=Jan, 3=Apr, 6=Jul, 9=Oct
    const currentQ = Math.floor(today.getMonth() / 3);
    const prevQMonthEnd = currentQ * 3; // e.g., if today is Apr (3), prevQMonthEnd is Mar (3) -- wait, Date(y, 3, 0) is Mar 31.
    currentEnd = new Date(today.getFullYear(), prevQMonthEnd, 0, 23, 59, 59, 999);
    currentStart = new Date(today.getFullYear(), prevQMonthEnd - 3, 1, 0, 0, 0, 0);

    pastEnd = new Date(today.getFullYear(), prevQMonthEnd - 3, 0, 23, 59, 59, 999);
    pastStart = new Date(today.getFullYear(), prevQMonthEnd - 6, 1, 0, 0, 0, 0);
  } else if (periodType === "ANNUAL") {
    reportTitle = "REPORTE ANUAL";
    currentLabel = "Año Analizado";
    pastLabel = "Año Anterior";
    currentEnd = new Date(today.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
    currentStart = new Date(today.getFullYear() - 1, 0, 1, 0, 0, 0, 0);

    pastEnd = new Date(today.getFullYear() - 2, 11, 31, 23, 59, 59, 999);
    pastStart = new Date(today.getFullYear() - 2, 0, 1, 0, 0, 0, 0);
  }

  // YTD (Year to date up to currentEnd)
  const ytdStart = new Date(currentEnd.getFullYear(), 0, 1);
  ytdStart.setHours(0, 0, 0, 0);

  // Last Year same period (YoY)
  const lastYearStart = new Date(currentStart); lastYearStart.setFullYear(currentStart.getFullYear() - 1);
  const lastYearEnd = new Date(currentEnd); lastYearEnd.setFullYear(currentEnd.getFullYear() - 1);

  let cw = { sesiones: 0, alumnos: 0, horas: 0, byAccount: {}, byTrainer: {} };
  let pw = { sesiones: 0, alumnos: 0, horas: 0, byAccount: {} };
  let ly = { sesiones: 0, alumnos: 0, horas: 0, byAccount: {} };
  let yt = { sesiones: 0, alumnos: 0, horas: 0 };

  for (let i = 1; i < data.length; i++) {
    const fVal = colMap.FECHA !== undefined ? data[i][colMap.FECHA] : data[i][2];
    const tVal = colMap.TRAINER !== undefined ? data[i][colMap.TRAINER] : data[i][1];
    if (!fVal || !tVal) continue;
    const dO = parseDateStable(fVal);
    if (!dO) continue;
    
    const dTime = dO.getTime();
    const ses = parseFloat(data[i][colMap.SESIONES] || data[i][6]) || 0;
    const alu = parseFloat(data[i][colMap.ALUMNOS] || data[i][8]) || 0;
    const hor = _parseDur(data[i][colMap.HORAS] || data[i][9]);
    const trainer = tVal.toString().trim();
    const account = (data[i][colMap.CUENTA] || "Otros").toString().trim() || "Otros";
    const method = (data[i][colMap.METODOLOGIA] || "Otros").toString().trim() || "Otros";

    // YTD
    if (dTime >= ytdStart.getTime() && dTime <= currentEnd.getTime()) {
      yt.sesiones += ses; yt.alumnos += alu; yt.horas += hor;
    }
    // Current Period
    if (dTime >= currentStart.getTime() && dTime <= currentEnd.getTime()) {
      cw.sesiones += ses; cw.alumnos += alu; cw.horas += hor;
      if (!cw.byAccount[account]) cw.byAccount[account] = { sesiones: 0, alumnos: 0, horas: 0 };
      cw.byAccount[account].sesiones += ses; cw.byAccount[account].alumnos += alu; cw.byAccount[account].horas += hor;
      if (!cw.byTrainer[trainer]) cw.byTrainer[trainer] = { sesiones: 0, alumnos: 0, horas: 0, byMethod: {} };
      cw.byTrainer[trainer].sesiones += ses; cw.byTrainer[trainer].alumnos += alu; cw.byTrainer[trainer].horas += hor;
      if (!cw.byTrainer[trainer].byMethod[method]) cw.byTrainer[trainer].byMethod[method] = 0;
      cw.byTrainer[trainer].byMethod[method] += hor;
    }
    // Past Period (WoW / MoM / QoQ)
    if (dTime >= pastStart.getTime() && dTime <= pastEnd.getTime()) {
      pw.sesiones += ses; pw.alumnos += alu; pw.horas += hor;
    }
    // Last Year same period (YoY)
    if (dTime >= lastYearStart.getTime() && dTime <= lastYearEnd.getTime()) {
      ly.sesiones += ses; ly.alumnos += alu; ly.horas += hor;
    }
  }

  const formatD = (d) => Utilities.formatDate(d, Session.getScriptTimeZone(), "dd/MM/yy");
  let periodString = `${formatD(currentStart)} - ${formatD(currentEnd)}`;
  if (periodType === "WEEKLY") periodString = `Semana ${Utilities.formatDate(currentStart, Session.getScriptTimeZone(), "w")} (${periodString})`;
  
  const htmlContent = _buildPDFHTML(reportTitle, periodString, currentLabel, pastLabel, cw, pw, ly, yt);

  // Create PDF
  const blob = Utilities.newBlob(htmlContent, MimeType.HTML);
  const pdfBlob = blob.getAs(MimeType.PDF);
  const pdfName = "Reporte_" + periodType + "_" + formatD(currentStart).replace(/\//g,'-') + ".pdf";
  pdfBlob.setName(pdfName);
  
  const folder = DriveApp.getFolderById(CONFIG.DRIVE_FOLDER_ID);
  const pdfFile = folder.createFile(pdfBlob);

  const link = pdfFile.getUrl();
  const msgText = "📊 ¡El " + reportTitle.toLowerCase() + " (" + periodString + ") ya está listo! Visualízalo y descárgalo aquí: " + link;
  
  // Specific users required (all admins)
  notifyUser("Admin", msgText, "System");
}

function _buildPDFHTML(reportTitle, periodString, currentLabel, pastLabel, cw, pw, ly, yt, lyTitle = "Versus Año Anterior", lyColLabel = "Mismo periodo (Año Pasado)") {
  function createVersusChart(title, currentLabel, currentSes, currentAlu, pastLabel, pastSes, pastAlu) {
      const dataTable = Charts.newDataTable()
          .addColumn(Charts.ColumnType.STRING, "Periodo")
          .addColumn(Charts.ColumnType.NUMBER, "Sesiones")
          .addColumn(Charts.ColumnType.NUMBER, "Alumnos")
          .addRow([pastLabel + "\n(Ses: " + pastSes + " | Alu: " + pastAlu + ")", pastSes, pastAlu])
          .addRow([currentLabel + "\n(Ses: " + currentSes + " | Alu: " + currentAlu + ")", currentSes, currentAlu])
          .build();
      const chart = Charts.newColumnChart()
          .setDataTable(dataTable)
          .setTitle(title)
          .setDimensions(400, 250)
          .setColors(['#ff6700', '#2196F3'])
          .setLegendPosition(Charts.Position.BOTTOM)
          .build();
      return Utilities.base64Encode(chart.getAs('image/png').getBytes());
  }

  function createTrainersImpactChart(title, cwData) {
      const dataTable = Charts.newDataTable()
          .addColumn(Charts.ColumnType.STRING, "Formador")
          .addColumn(Charts.ColumnType.NUMBER, "Personas Impactadas");
      
      let added = false;
      for (const t in cwData.byTrainer) {
          if (cwData.byTrainer[t].sesiones === 0 && cwData.byTrainer[t].alumnos === 0) continue;
          dataTable.addRow([t + " (" + cwData.byTrainer[t].alumnos + ")", cwData.byTrainer[t].alumnos]);
          added = true;
      }
      if (!added) dataTable.addRow(["Sin datos", 0]);

      const chart = Charts.newColumnChart()
          .setDataTable(dataTable.build())
          .setTitle(title)
          .setDimensions(500, 250)
          .setColors(['#4CAF50'])
          .setLegendPosition(Charts.Position.NONE)
          .build();
      return Utilities.base64Encode(chart.getAs('image/png').getBytes());
  }

  function createPieChart(title, dataObj) {
      const dataTable = Charts.newDataTable()
          .addColumn(Charts.ColumnType.STRING, "Categoría")
          .addColumn(Charts.ColumnType.NUMBER, "Horas");
      let added = false;
      for (let key in dataObj) { dataTable.addRow([key, dataObj[key]]); added = true; }
      if (!added) dataTable.addRow(["Sin datos", 1]);
      const chart = Charts.newPieChart()
          .setDataTable(dataTable.build())
          .setTitle(title)
          .setDimensions(400, 300)
          .set3D()
          .build();
      return Utilities.base64Encode(chart.getAs('image/png').getBytes());
  }

  const td = (val) => `<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; color: #555;">${val}</td>`;
  const th = (val) => `<th style="padding: 12px; border: 1px solid #ff6700; background-color: #ff6700; color: white; text-align: center; font-weight: bold;">${val}</th>`;
  const getTrend = (current, past) => {
      if (past === 0) return current > 0 ? "<span style='color: #4CAF50;'>📈 +100%</span>" : "<span style='color: #888;'>➖ 0%</span>";
      const diff = ((current - past) / past) * 100;
      if (diff > 0) return "<span style='color: #4CAF50;'>📈 +" + diff.toFixed(1) + "%</span>";
      if (diff < 0) return "<span style='color: #F44336;'>📉 " + diff.toFixed(1) + "%</span>";
      return "<span style='color: #888;'>➖ 0%</span>";
  };

  let accountHtml = "";
  let sortedAccounts = Object.keys(cw.byAccount).sort();
  for (let i = 0; i < sortedAccounts.length; i++) {
      let acc = sortedAccounts[i];
      accountHtml += `<tr>
        <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: 600; color: #333;">${acc}</td>
        ${td(cw.byAccount[acc].sesiones)}
        ${td(cw.byAccount[acc].alumnos)}
        ${td(cw.byAccount[acc].horas.toFixed(1))}
      </tr>`;
  }
  if (!accountHtml) accountHtml = "<tr><td colspan='4' style='text-align: center; padding: 20px; color: #888;'>Sin datos reportados.</td></tr>";

  const renderByAccountTable = (dataObj, label, colLabel) => {
      let accHtml = "";
      let sortedAcc = Object.keys(dataObj.byAccount || {}).sort();
      for (let i = 0; i < sortedAcc.length; i++) {
          let acc = sortedAcc[i];
          accHtml += `<tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: 600; color: #333;">${acc}</td>
            ${td(dataObj.byAccount[acc].sesiones)}
            ${td(dataObj.byAccount[acc].alumnos)}
          </tr>`;
      }
      if (!accHtml) return "";
      return `
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
            <th colspan="3" style="padding: 12px; border: 1px solid #ddd; background-color: #eaeaea; color: #333; text-align: left;">Desglose por Cuenta (${colLabel})</th>
        </tr>
        <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: left;">Cuenta</th>
            ${th("Formaciones")}${th("Impactados")}
        </tr>
        ${accHtml}
      </table>`;
  };

  let trainerHtml = "";
  for (const t in cw.byTrainer) {
      if (cw.byTrainer[t].sesiones === 0 && cw.byTrainer[t].alumnos === 0) continue;
      trainerHtml += `<tr>
        <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: 600; color: #333;">${t}</td>
        ${td(cw.byTrainer[t].sesiones)}
        ${td(cw.byTrainer[t].alumnos)}
        ${td(cw.byTrainer[t].horas.toFixed(1))}
      </tr>`;
  }
  if (!trainerHtml) trainerHtml = "<tr><td colspan='4' style='text-align: center; padding: 20px; color: #888;'>Sin formadores reportados.</td></tr>";

  let trainerPagesHtml = "";
  for (const t in cw.byTrainer) {
      const d = cw.byTrainer[t];
      if (d.sesiones === 0 && d.alumnos === 0) continue;
      const pieB64 = createPieChart("Horas por Metodología", d.byMethod);
      trainerPagesHtml += `
      <div style="page-break-before: always;"></div>
      <div style="padding-top: 40px;">
          <h2 style="color: #ff6700; border-bottom: 2px solid #ff6700; padding-bottom: 10px; font-size: 26px;">Informe Individual: <span style="color: #333;">${t}</span></h2>
          <p style="color: #888;">Periodo Analizado: <strong>${periodString}</strong></p>
          
          <table style="width: 100%; border-collapse: collapse; margin-top: 30px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
            <tr>
              ${th("Formaciones Dadas")}
              ${th("Personas Impactadas")}
              ${th("Horas Trabajadas")}
            </tr>
            <tr>
              ${td(d.sesiones)}
              ${td(d.alumnos)}
              ${td(d.horas.toFixed(1))}
            </tr>
          </table>

          <div style="text-align: center; margin-top: 60px;">
              <h3 style="color: #444; font-size: 20px;">Desglose de Horas por Metodología</h3>
              <img src="data:image/png;base64,${pieB64}" style="width: 450px; height: auto;" />
          </div>
      </div>
      `;
  }

  let htmlContent = `
    <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; max-width: 800px; margin: 0 auto; background: white; padding: 30px;">
      
      <div style="text-align: center; border-bottom: 3px solid #ff6700; padding-bottom: 20px; margin-bottom: 30px;">
        <h1 style="color: #ff6700; margin: 0; font-size: 34px;">${reportTitle}</h1>
        <h2 style="color: #333; margin: 5px 0 0 0; font-size: 20px;">XIAOMI TRAINER INTRANET</h2>
        <p style="color: #888; margin: 10px 0 0 0; font-size: 16px;">Periodo Analizado: <strong>${periodString}</strong></p>
      </div>
      
      <table style="width: 100%; text-align: center; margin-bottom: 40px; border-spacing: 15px 0;">
        <tr>
            <td style="padding: 20px 10px; background-color: #fff8f2; border-radius: 12px; border: 2px solid #ffccaa; width: 33%;">
                <h3 style="margin: 0; color: #ff6700; font-size: 42px;">${cw.sesiones}</h3>
                <p style="margin: 5px 0 0 0; color: #555; font-weight: bold; font-size: 14px; text-transform: uppercase;">Sesiones</p>
            </td>
            <td style="padding: 20px 10px; background-color: #fff8f2; border-radius: 12px; border: 2px solid #ffccaa; width: 33%;">
                <h3 style="margin: 0; color: #ff6700; font-size: 42px;">${cw.alumnos}</h3>
                <p style="margin: 5px 0 0 0; color: #555; font-weight: bold; font-size: 14px; text-transform: uppercase;">Impactados</p>
            </td>
            <td style="padding: 20px 10px; background-color: #fff8f2; border-radius: 12px; border: 2px solid #ffccaa; width: 33%;">
                <h3 style="margin: 0; color: #ff6700; font-size: 42px;">${cw.horas.toFixed(1)}</h3>
                <p style="margin: 5px 0 0 0; color: #555; font-weight: bold; font-size: 14px; text-transform: uppercase;">Horas</p>
            </td>
        </tr>
      </table>

      <h3 style="color: #444; border-left: 4px solid #ff6700; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">1. Desglose por Cuenta (${currentLabel})</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: left;">Cuenta</th>
            ${th("Formaciones")}${th("Impactados")}${th("Horas")}
        </tr>
        ${accountHtml}
      </table>
  `;

  let sectionCounter = 2;

  if (ly) {
      const chartYoY_Ses = createVersusChart(`Sesiones y Alumnos vs ${lyColLabel}`, currentLabel, cw.sesiones, cw.alumnos, lyColLabel, ly.sesiones, ly.alumnos);
      htmlContent += `
      <h3 style="color: #444; border-left: 4px solid #ff6700; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">${sectionCounter++}. ${lyTitle}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: left;">Métrica</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: center;">${currentLabel}</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: center;">${lyColLabel}</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #333; color: white; text-align: center;">Tendencia</th>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Formaciones</td>
            ${td(cw.sesiones)}${td(ly.sesiones)}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.sesiones, ly.sesiones)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Impactados</td>
            ${td(cw.alumnos)}${td(ly.alumnos)}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.alumnos, ly.alumnos)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Horas Impartidas</td>
            ${td(cw.horas.toFixed(1))}${td(ly.horas.toFixed(1))}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.horas, ly.horas)}</td>
        </tr>
      </table>
      ${renderByAccountTable(ly, lyTitle, lyColLabel)}
      <div style="text-align: center; margin-bottom: 50px;">
          <img src="data:image/png;base64,${chartYoY_Ses}" style="width: 400px; height: auto;" />
      </div>`;
  }

  if (pw) {
      const chartWoW_Ses = createVersusChart("Sesiones y Alumnos vs " + pastLabel, currentLabel, cw.sesiones, cw.alumnos, pastLabel, pw.sesiones, pw.alumnos);
      htmlContent += `
      <h3 style="color: #444; border-left: 4px solid #ff6700; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">${sectionCounter++}. Versus ${pastLabel}</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: left;">Métrica</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: center;">${currentLabel}</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: center;">${pastLabel}</th>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #333; color: white; text-align: center;">Tendencia</th>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Formaciones</td>
            ${td(cw.sesiones)}${td(pw.sesiones)}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.sesiones, pw.sesiones)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Impactados</td>
            ${td(cw.alumnos)}${td(pw.alumnos)}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.alumnos, pw.alumnos)}</td>
        </tr>
        <tr>
            <td style="padding: 10px; border: 1px solid #e0e0e0; font-weight: bold; color: #444;">Horas Impartidas</td>
            ${td(cw.horas.toFixed(1))}${td(pw.horas.toFixed(1))}<td style="padding: 10px; border: 1px solid #e0e0e0; text-align: center; font-weight: bold;">${getTrend(cw.horas, pw.horas)}</td>
        </tr>
      </table>
      ${renderByAccountTable(pw, `Versus ${pastLabel}`, pastLabel)}
      <div style="text-align: center; margin-bottom: 50px;">
          <img src="data:image/png;base64,${chartWoW_Ses}" style="width: 400px; height: auto;" />
      </div>`;
  }

  if (yt) {
      htmlContent += `
      <h3 style="color: #444; border-left: 4px solid #ff6700; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">${sectionCounter++}. Resumen Anual Acumulado (YTD)</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>${th("Formaciones Acumuladas")}${th("Alumnos Acumulados")}${th("Horas Acumuladas")}</tr>
        <tr>${td(yt.sesiones)}${td(yt.alumnos)}${td(yt.horas.toFixed(1))}</tr>
      </table>`;
  }

  const chartTrainersImpact = createTrainersImpactChart("Impacto por Formador", cw);
  htmlContent += `
      <h3 style="color: #444; border-left: 4px solid #ff6700; padding-left: 10px; margin-bottom: 15px; font-size: 20px;">${sectionCounter++}. Desglose Global por Formador</h3>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 50px; box-shadow: 0 2px 8px rgba(0,0,0,0.05);">
        <tr>
            <th style="padding: 12px; border: 1px solid #ddd; background-color: #f5f5f5; color: #333; text-align: left;">Formador</th>
            ${th("Formaciones")}${th("Alumnos")}${th("Horas")}
        </tr>
        ${trainerHtml}
      </table>
      <div style="text-align: center; margin-bottom: 50px;">
          <img src="data:image/png;base64,${chartTrainersImpact}" style="width: 500px; height: auto;" />
      </div>
      
      ${trainerPagesHtml}
    </div>
  `;

  return htmlContent;
}
