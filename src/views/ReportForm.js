function renderReport(container) {
    const provincias = ["Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona","Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba","A Coruña","Cuenca","Girona","Granada","Guadalajara","Gipuzkoa","Huelva","Huesca","Illes Balears","Jaén","León","Lleida","Lugo","Madrid","Málaga","Murcia","Navarra","Ourense","Palencia","Las Palmas","Pontevedra","La Rioja","Salamanca","Segovia","Sevilla","Soria","Tarragona","Santa Cruz de Tenerife","Teruel","Toledo","Valencia","Valladolid","Bizkaia","Zamora","Zaragoza","Ceuta","Melilla"];
    
    const dispositivosMobiles = ["Xiaomi 17 series", "Redmi Note 15 Series", "Redmi 15 Series", "Redmi 15C", "Redmi A5", "Redmi A7 Pro"];
    const dispositivosNoMobiles = ["Xiaomi Watch 5 series", "Xiaomi Watch S4 series", "Redmi Watch 5 Series", "Xiaomi Band 10 series", "Xiaomi Band 9 series", "Xiaomi Buds 5 series", "Xiaomi Openwear Stereo Pro", "Redmi Buds 8 series", "Xiaomi Pad 8 series", "Redmi Pad 2 Pro series", "Redmi Pad 2", "Scooters 6 series", "TV A series", "TV S series", "Vaccuum G40 series", "Robot Vacums"];

    const distribuidores = {
        "Orange": ["ONDALIBRE","KIWITEL","ISP","ONE STORE","ECOPLANA","IS CELL","FREE TELECOM","OK CLUB","MUNDOCOM","ANEVINIP","TELMASUR","PROMOVIL","CLM","OSHOP","Tiendas Propias","ISGF Murcia","FOUNDEVER Sevilla","KONECTA Sevilla","OEST Oviedo","MARKTEL Valencia","Jazzplat Guadalajara","ISGF Alicante","TLP Salamanca","TRANSCOM León","MAJOREL Salamanca","TLP Medellín","Jazzplat Colombia","Konecta Lima"],
        "MásMovil": ["Stream","Konecta Córdoba","Servinform","Konecta Sevilla","Marktel Madrid Negocios","Serviform Valladolid","Servinform Madrid Negocios","Nekxus Peru","Nekxus COLOMBIA"],
        "Vodafone": ["KONECTA Sevilla","KONECTA Valladolid","MAJOREL Zaragoza","TP Ponferrada","KONECTA Sevilla (PIBO)","KONECTA Valladolid (Cartera)","VPLAT Madrid","VPLAT Valladolid","Red chain","Bonatel","Pablo Sánchez XXI","Climent","Eulogio (grupo teleoperator)","Grupo Móvil","Servitel XXI","Ondas System SL","New Concept / vivacom","Mederos","TDC SENSITIA"],
        "Euskaltel": ["IBERMATICA Donostia","LANALDEN Bilbao","LANALDEN Derio","XUPERA","KONECTA A Coruña","GSC","Eulen","OSP","V3"],
        "Telefónica": ["Flagship","Interno","Telyco","Telyman","Complutel"],
        "Alcampo": ["Alcampo Castellón", "Alcampo Gijón", "Alcampo Langreo", "Alcampo Motril", "Alcampo Orihuela", "Alcampo Toledo", "Alcampo Vaguada", "DIAGONAL MAR", "FINESTRELLES", "MATARÓ", "Multiple Store", "Múltiple store", "PARQUE SUR", "REUS", "SANT ADRIA", "Sant boi", "Tortosa", "VILANOVA"],
        "Carrefour": ["Online", "Abrera", "Actur", "Águilas", "Alboraya", "Albacete", "Alcalá de Henares", "Alcalá de Guadaíra", "Alcázar", "Alcobendas", "Alcorcón", "Algeciras", "Alfafar", "Alfonso Molina", "Almería", "Alzira", "Alameda", "Amposta", "Andújar", "Añaza", "Antequera", "Aranda", "Arcos", "Arenas", "Astillero", "Atalayas", "Augusta", "Avda. Mediterráneo", "Azabache", "Badajoz", "Baena", "Bahía", "Barberà", "Barakaldo", "Benidorm", "Burgos", "Cáceres", "Cabrera de Mar", "Cádiz", "Calahorra", "Caletillas", "Camas", "Campanar", "Can Dragó", "Carmona", "Cartagena", "Cartaya", "Castellón", "Caudalia", "Ciudad de la Imagen", "Ciudad Real", "Coll d'en Rabassa", "Coristanco", "Cornellà", "Coruña", "Cuenca", "Cullera", "Denia", "Dos Hermanas", "Écija", "El Casar", "El Ejido", "El Hierro", "El Pinar", "El Prat", "El Rinconcillo", "El Saler", "Elche", "Elviña", "Erandio", "Estepona", "Fan Mallorca", "Ferrol", "Figueres", "Finestrat", "Fuengirola", "Fuentes de Ebro", "Gandía", "Gavà", "Getafe", "Gijón", "Girona", "Glòries", "Gran Turia", "Gran Via (Hospitalet)", "Granada Sur", "Guadalajara", "Hortaleza", "Huelva", "Huesca", "Jaca", "Jaén", "Jerez Norte", "Jerez Sur", "L'Eliana", "L'Hospitalet", "La Calzada", "La Gavia", "La Linea", "La Macarena", "La Maquinista", "La Sierra", "Laguna de Duero", "Lalín", "Las Arenas", "Las Rozas", "Leganés", "León", "Lleida", "Logroño", "Lorca", "Los Alfares", "Los Angeles", "Los Gamos", "Los Patios", "Los Prados", "Los Rosales", "Lucena", "Lugo", "Lugones", "Madrid Sur", "Majadahonda", "Málaga Rosaleda", "Manises", "Manresa", "Martorell", "Massalfassar", "Mérida", "Mijas", "Montequinto", "Montigalà", "Móstoles", "Motril", "Murcia Zaraiche", "Nassica", "Navarra", "Oiartzun", "Oleiros", "Olías", "Olot", "Ontinyent", "Ourense", "Palencia", "Palma", "Pamplona", "Parets", "Parquesol", "Parquesur", "Paterna", "Peñacastillo", "Petrer", "Picaña", "Planetocio", "Plaza Imperial", "Plaza Nueva", "Ponferrada", "Pontevedra", "Portopí", "Puerta Alicante", "Puente Genil", "Puertollano", "Pulianas", "Rambla", "Reus", "Rincón de la Victoria", "Rivas", "Roquetas de Mar", "Sa Coma", "Sagunto", "Salamanca", "San Blas", "San Fernando", "San Javier", "San Juan de Alicante", "San Sebastián de los Reyes", "Sant Cugat", "Santa Coloma", "Santa Cruz", "Sanlúcar", "Santander", "Segovia", "Sestao", "Sevilla", "Son Cotoner", "Talavera", "Tarragona", "Telde", "Toledo", "Torrejón", "Torrelavega", "Torremolinos", "Torrent", "Torrevieja", "Tortosa", "Tres Cantos", "Tudela", "Utebo", "Valdebernardo", "Valdepeñas", "Valladolid 2", "Valle Real", "Vallecas", "Vecindario"],
        "ECI": ["ECI ALBACETE", "ECI ALICANTE", "ECI BADAJOZ", "ECI BILBAO", "ECI CALLAO", "ECI CASTELLANA", "ECI MÁLAGA", "ECI MURCIA", "ECI PAMPLONA", "ECI PRINCESA", "ECI VIGO"],
        "MediaMarkt": ["Fuenlabrada", "MEDIA ALCALA DE HENARES", "MEDIA ALCORCON", "MEDIA ALFAFAR", "MEDIA BADAJOZ", "MEDIA GETAFE", "MEDIA ISLAZUL MADRID", "MEDIA LEGANES", "MEDIA MADRID CASTELLANA", "MEDIA MADRID PLAZA DEL CA", "MEDIA MADRID VALLECAS", "MEDIA RIVAS", "MEDIA VAGUADA", "MEDIA VALLADOLID"],
        "MISTORES": ["MI ALMERIA", "MI CEUTA", "MI VIGO", "MI STORE C.C. LA GAVIA", "MI PUERTO VENECIA", "MI VALLADOLID", "MI STORE CC GRAN VÍA ALICANTE", "MI STORE CC ISLAZUL", "MI STORE GRAN VÍA 2", "MI STORE MAQUINISTA", "MI STORE XANADU", "MI STORE CASTELLÓN"]
    };

    let session = getSessionData(), currentUser = session?session.user:'Desconocido', realName = session?session.name:'Desconocido', role = session?session.role:'User';
    let additiveFiles = [];
    let isLoadingEdit = false;
    
    // RECUPERAR DATOS DE EDICIÓN/DUPLICACIÓN
    const editData = window.reportEditData || null;
    const isEdit = editData && editData.mode === 'edit';
    const isDuplicate = editData && editData.mode === 'duplicate';

    const html = `
        <div class="report-module fade-in">
            <header class="report-header">
                <h2 style="font-size: 2.2rem; letter-spacing: -0.03em;"><i data-lucide="${isEdit ? 'edit-2' : (isDuplicate ? 'copy' : 'rocket')}" style="color: var(--xiaomi-orange); width: 32px; vertical-align: middle; margin-right: 12px;"></i> ${isEdit ? 'Actualizar Reporte' : (isDuplicate ? 'Duplicar Reporte' : 'Registro de Impacto')}</h2>
                <p style="color: var(--text-medium); font-weight: 500; font-size: 1.1rem; margin-top: 10px;">${isEdit ? 'Modifica los datos necesarios y guarda los cambios.' : 'Registra tu actividad diaria y demuestra el potencial de Xiaomi.'}</p>
            </header>
            
            <form id="activityForm" class="glass-card report-form-card">
                <div id="adminArea" style="display:none; background:var(--xiaomi-orange-light); padding:1.5rem; border-radius: 20px; margin-bottom: 2.5rem; border: 1px solid var(--xiaomi-orange);">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label" style="color: var(--xiaomi-orange); font-weight: 700;">Imputar actividad a:</label>
                        <select id="trainer" name="trainer" class="form-control"></select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 2rem; margin-bottom: 1.5rem;">
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Fecha del Reporte *</label>
                        <input type="date" id="fecha" name="fecha" class="form-control" required value="${(() => {
                            if (!editData || !editData.fecha) return '';
                            try {
                                const d = new Date(editData.fecha);
                                if (isNaN(d.getTime())) return '';
                                const y = d.getFullYear();
                                const m = String(d.getMonth() + 1).padStart(2, '0');
                                const day = String(d.getDate()).padStart(2, '0');
                                return `${y}-${m}-${day}`;
                            } catch(e) { return ''; }
                        })()}">
                    </div>
                    <div class="form-group" style="margin-bottom:0;">
                        <label class="form-label">Metodología *</label>
                        <select id="metodologia" name="metodologia" class="form-control" required>
                            <option value="">Selecciona...</option>
                            <option value="Classroom">Classroom</option>
                            <option value="Webinar">Webinar</option>
                            <option value="POS">POS</option>
                            <option value="Training Materials">Training Materials</option>
                            <option value="Backoffice">Backoffice</option>
                            <option value="Commuting">Commuting</option>
                            <option value="Hospitality">Hospitality</option>
                        </select>
                    </div>
                </div>

                <div class="form-group" id="rowCuenta" style="margin-bottom: 2rem; padding-top: 1.5rem; border-top: 1px solid var(--border-main);">
                    <div id="wrapperCuenta">
                        <label id="labelCuenta" class="form-label">Cuenta Principal *</label>
                        <select id="cuenta" name="cuenta" class="form-control" required>
                            <option value="">Selecciona la cuenta...</option>
                            ${Object.keys(distribuidores).map(c=>`<option value="${c}">${c}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div id="distWrapper" style="display:none; margin-bottom:2rem; background: var(--bg-main); padding: 2rem; border-radius: 24px; border: 1px solid var(--border-main);">
                    <div class="form-group" style="margin: 0;">
                        <label class="form-label"><i data-lucide="map-pin" style="width:14px; margin-right:5px;"></i> Distribuidor / Tienda / Call Center *</label>
                        <select id="distribuidor" name="distribuidor" class="form-control"></select>
                    </div>
                    <div id="manualEntry" style="display:none; margin-top:1.5rem;">
                        <input type="text" id="distribuidor_custom" class="form-control" placeholder="Escribe el nombre de la nueva ubicación...">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                    <div class="form-group" id="wrapperSesiones">
                        <label class="form-label">Sesiones Realizadas *</label>
                        <input type="number" id="sesiones" name="sesiones" class="form-control" required min="1" value="${editData ? editData.sesiones : ''}">
                    </div>
                    <div class="form-group" id="wrapperAlumnos">
                        <label class="form-label">Alumnos Formados *</label>
                        <input type="number" id="alumnos" name="alumnos" class="form-control" required min="1" value="${editData ? editData.alumnos : ''}">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2rem;">
                    <div class="form-group">
                        <label class="form-label">Duración Total (h) *</label>
                        <input type="number" id="duracion" name="duracion" class="form-control" step="0.1" required min="0.5" value="${editData ? editData.duracion : ''}">
                    </div>
                    <div class="form-group" id="wrapperTiendas">
                        <label class="form-label">Nº Tiendas *</label>
                        <input type="number" id="tiendas" name="tiendas" class="form-control" required min="0" value="${editData ? (editData.tiendas || 0) : ''}">
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2.5rem; padding: 2rem; background: var(--bg-main); border-radius: 24px;">
                    <div class="form-group" id="wrapperPerfil" style="margin:0;">
                        <label id="labelPerfil" class="form-label">Perfil de Alumno *</label>
                        <select id="perfil" name="perfil" class="form-control" required>
                            <option value="" selected disabled>Selecciona...</option>
                            <option value="Vendedor">Vendedor</option>
                            <option value="Promotor">Promotor</option>
                            <option value="Teleoperador">Teleoperador</option>
                            <option value="Cliente">Cliente</option>
                        </select>
                    </div>
                    <div class="form-group" style="margin:0;">
                        <label class="form-label">Ciudad / Localidad *</label>
                        <select id="ciudad" name="ciudad" class="form-control" required></select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 2rem; margin-bottom: 2.5rem;">
                   <div class="form-group" id="wrapperContenidos">
                        <label id="labelContenidos" class="form-label">Tipo de Contenido *</label>
                        <select id="contenidos" name="contenidos" class="form-control" required>
                            <option value="" selected disabled>Selecciona...</option>
                            <option value="On boarding">On boarding</option>
                            <option value="Launch">Launch</option>
                            <option value="Refresh">Refresh</option>
                            <option value="Reforce">Reforce</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Provincia *</label>
                        <select id="provincia" name="provincia" class="form-control" required>
                            <option value="">Selecciona...</option>
                            ${provincias.map(p=>`<option value="${p}">${p}</option>`).join('')}
                        </select>
                    </div>
                </div>

                <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 2rem; margin-bottom: 2.5rem; padding-top: 2rem; border-top: 1px solid var(--border-main);">
                    <div class="form-group">
                        <label class="form-label"><i data-lucide="smartphone" style="width:14px; margin-right:5px;"></i> Formación en Móviles</label>
                        <select id="dispositivos" name="dispositivos" multiple class="form-control"></select>
                    </div>
                    <div class="form-group">
                        <label class="form-label"><i data-lucide="home" style="width:14px; margin-right:5px;"></i> Formación en Ecosistema</label>
                        <select id="dispositivos_no_movil" name="dispositivos_no_movil" multiple class="form-control"></select>
                    </div>
                </div>

                <div class="form-group" style="margin-bottom: 3rem;">
                    <label class="form-label">Observaciones</label>
                    <textarea name="comentarios" class="form-control" rows="4" placeholder="Algún detalle relevante de la sesión..." style="resize:none; border-radius: 16px;">${editData ? (editData.comentarios || '') : ''}</textarea>
                </div>

                <div id="photoSection" style="background: var(--bg-main); padding: 2.5rem; border-radius: 32px; border: 2px dashed var(--border-main); margin-bottom: 4rem;">
                    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:1.5rem;">
                         <label class="form-label" style="margin:0; display:flex; align-items:center; gap:10px; font-size: 1rem;"><i data-lucide="camera" style="color: var(--xiaomi-orange);"></i> Añadir Fotografías de Evidencia ${isEdit ? '<small style="font-weight:400; color:var(--text-muted);">(Se añadirán a las actuales)</small>' : ''}</label>
                         <span id="photoCounter" class="badge" style="background:var(--xiaomi-orange); color:white; font-weight:700; border-radius: 10px; padding: 5px 12px;">0</span>
                    </div>
                    <div style="text-align:center; padding: 1rem; border: 1px dashed var(--border-main); border-radius: 16px; background: var(--bg-card); cursor: pointer;" onclick="document.getElementById('fotosInput').click()">
                        <i data-lucide="upload-cloud" style="width:32px; height:32px; color:var(--text-muted); margin-bottom:0.5rem;"></i>
                        <p style="font-size:0.85rem; color: var(--text-medium); font-weight:500;">Haz clic para seleccionar o arrastra tus imágenes (Máx 20)</p>
                    </div>
                    <input type="file" id="fotosInput" class="form-control" accept="image/*" multiple style="display:none;">
                    <div id="photoList" style="margin-top:2rem; display:grid; grid-template-columns: repeat(auto-fill, minmax(100px, 1fr)); gap:15px;"></div>
                </div>

                <div style="display: flex; gap: 1.5rem; justify-content: flex-end; padding-top: 2rem; border-top: 1px solid var(--border-main);">
                    <button type="button" onclick="window.reportEditData=null; navigate('#dashboard')" class="btn-secondary" style="height:52px; padding: 0 2rem; border-radius: 16px;">Cancelar</button>
                    <button type="submit" id="btnSubmit" class="btn-primary" style="height:52px; padding: 0 3rem; border-radius: 16px; font-weight: 700; font-size: 1.1rem; background: var(--xiaomi-orange);">
                        <i data-lucide="check" style="width:20px; margin-right: 8px;"></i> ${isEdit ? 'Guardar Cambios' : 'Enviar Reporte'}
                    </button>
                </div>
            </form>
        </div>
    `;

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    if(!editData) document.getElementById('fecha').valueAsDate = new Date();

    if (role === 'Admin') {
        document.getElementById('adminArea').style.display = 'block';
        sendJSONP('getUsersList').then(res => {
            if(res.status === 'success') {
                const s = document.getElementById('trainer'); 
                if(s) {
                    s.innerHTML = '';
                    res.data.forEach(u => s.innerHTML += `<option value="${u}">${u}</option>`);
                    s.value = editData ? editData.trainer : currentUser;
                }
            }
        });
    }

    const tsCiudad = new TomSelect("#ciudad", { create: true, placeholder: "Escribe..." });
    if(editData && editData.ciudad) tsCiudad.setValue(editData.ciudad);
    const tsM = new TomSelect("#dispositivos", { plugins: ['remove_button'], create: true, placeholder: "Móviles..." });
    dispositivosMobiles.forEach(d => tsM.addOption({value:d, text:d}));
    const tsNM = new TomSelect("#dispositivos_no_movil", { plugins: ['remove_button'], create: true, placeholder: "Ecosistema..." });
    dispositivosNoMobiles.forEach(d => tsNM.addOption({value:d, text:d}));

    sendJSONP('getCitiesList').then(res => { 
        if(res.status==='success' && tsCiudad) {
             res.data.forEach(c => tsCiudad.addOption({value:c, text:c}));
             if(editData) tsCiudad.setValue(editData.ciudad);
        }
    });

    const met = document.getElementById('metodologia'), cue = document.getElementById('cuenta'), con = document.getElementById('contenidos'), 
          per = document.getElementById('perfil'), ses = document.getElementById('sesiones'), alu = document.getElementById('alumnos'), tie = document.getElementById('tiendas');
    
    met.onchange = () => {
        const triggers = ["Commuting", "Backoffice", "Training Materials"], isBlock = triggers.includes(met.value);
        cue.disabled = isBlock; cue.required = !isBlock; con.disabled = isBlock; con.required = !isBlock;
        per.disabled = isBlock; per.required = !isBlock; ses.disabled = isBlock; ses.required = !isBlock;
        alu.disabled = isBlock; alu.required = !isBlock; tie.disabled = isBlock; tie.required = !isBlock;
        ['wrapperCuenta', 'wrapperContenidos', 'wrapperPerfil', 'wrapperSesiones', 'wrapperAlumnos', 'wrapperTiendas'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.style.opacity = isBlock ? "0.4" : "1";
        });
        if(isBlock && !isLoadingEdit) { 
            cue.value = ""; con.value = ""; per.value = ""; ses.value = "0"; alu.value = "0"; tie.value = "0"; 
            document.getElementById('distWrapper').style.display='none'; 
        }
    };

    let tsDist;
    cue.onchange = (e) => {
        const val = cue.value, dw = document.getElementById('distWrapper'), ds = document.getElementById('distribuidor');
        if(tsDist) { tsDist.destroy(); tsDist = null; }
        if(distribuidores[val]) {
            dw.style.display = 'block'; ds.innerHTML = '<option value="">Selecciona tienda...</option>';
            ds.innerHTML += `<option value="+">+ Añadir nueva tienda (Manual)</option>`;
            distribuidores[val].forEach(d => ds.innerHTML += `<option value="${d}">${d}</option>`);
            tsDist = new TomSelect("#distribuidor", {
                onItemAdd: (v) => {
                    const me = document.getElementById('manualEntry');
                    if(v === "+") { me.style.display = 'block'; document.getElementById('distribuidor_custom').focus(); } else me.style.display = 'none';
                },
                onItemRemove: () => document.getElementById('manualEntry').style.display = 'none'
            });
            if(editData && editData.cuenta === val) {
                const currentDist = editData.distribuidor || "";
                if(distribuidores[val].includes(currentDist)) tsDist.setValue(currentDist);
                else if(currentDist) { tsDist.setValue("+"); document.getElementById('distribuidor_custom').value = currentDist; }
            }
        } else dw.style.display = 'none';
    };

    // POBLAR DATOS SI ES EDICIÓN/DUPLICACIÓN
    if(editData) {
        isLoadingEdit = true;
        console.log("[DEBUG] Populating editData:", editData);
        try {
            if(editData.metodologia) { met.value = editData.metodologia; met.onchange(); }
            if(editData.cuenta) { cue.value = editData.cuenta; cue.onchange(); }
            if(editData.perfil) per.value = editData.perfil;
            if(editData.contenidos) con.value = editData.contenidos;
            if(editData.provincia) document.getElementById('provincia').value = editData.provincia;
            
            if(editData.sesiones) document.getElementById('sesiones').value = parseFloat(editData.sesiones) || 0;
            if(editData.alumnos) document.getElementById('alumnos').value = parseFloat(editData.alumnos) || 0;
            if(editData.tiendas) document.getElementById('tiendas').value = parseFloat(editData.tiendas) || 0;
            
            // Ciudad se cargará después de inicializar TomSelect

            if(editData.fecha) {
                try {
                    // Evitar el error de resta de día: extraer componentes locales
                    let dStr = "";
                    if (typeof editData.fecha === 'string' && editData.fecha.includes('-')) {
                        dStr = editData.fecha.split('T')[0]; // Ya es YYYY-MM-DD
                    } else {
                        const d = new Date(editData.fecha);
                        if(!isNaN(d.getTime())) {
                            dStr = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
                        }
                    }
                    if(dStr) document.getElementById('fecha').value = dStr;
                } catch(e) { console.error("Error setting date for edit:", e); }
            }
            
            // Extraer horas de forma robusta (maneja números y strings ISO de GAS)
            if(editData.duracion !== undefined && editData.duracion !== null) {
                const durStr = editData.duracion.toString();
                if (durStr.includes('T')) {
                    const parts = durStr.split('T')[1].split(':');
                    const hh = parseFloat(parts[0]) || 0;
                    const mm = parseFloat(parts[1]) || 0;
                    document.getElementById('duracion').value = (hh + (mm/60)).toFixed(1);
                } else {
                    document.getElementById('duracion').value = parseFloat(editData.duracion) || 0;
                }
            }

            if(editData.dispositivos && tsM) {
                const items = editData.dispositivos.split(/,\s*/).filter(Boolean);
                items.forEach(it => tsM.addOption({value: it, text: it})); // Asegurar que existan
                tsM.setValue(items);
            }
            if(editData.dispositivos_no_movil && tsNM) {
                const items = editData.dispositivos_no_movil.split(/,\s*/).filter(Boolean);
                items.forEach(it => tsNM.addOption({value: it, text: it})); // Asegurar que existan
                tsNM.setValue(items);
            }
            if(editData.comentarios) document.getElementsByName('comentarios')[0].value = editData.comentarios;
        } catch(e) { console.error("Error populating editData:", e); }
        isLoadingEdit = false;
    }

    document.getElementById('fotosInput').onchange = (e) => {
        const files = Array.from(e.target.files);
        files.forEach(f => { if(additiveFiles.length < 20) additiveFiles.push(f); });
        updatePhotoList();
    };

    function updatePhotoList() {
        const pl = document.getElementById('photoList');
        pl.innerHTML = additiveFiles.map((f, i) => `
            <div class="badge" style="background:var(--xiaomi-orange-light); color:var(--xiaomi-orange); cursor:pointer; display:flex; align-items:center; gap:6px; font-weight:600; padding:4px 10px; border-radius:8px;" onclick="removePhoto(${i})">
                ${f.name.substring(0,12)}${f.name.length > 12 ? '...' : ''} <i data-lucide="x" style="width:14px;"></i>
            </div>
        `).join('');
        document.getElementById('photoCounter').innerText = `${additiveFiles.length} seleccionados`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }
    window.removePhoto = (i) => { additiveFiles.splice(i, 1); updatePhotoList(); };

    async function _compressImage(file) {
        return new Promise((resolve) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = (e) => {
                const img = new Image();
                img.src = e.target.result;
                img.onload = () => {
                    const canvas = document.createElement('canvas');
                    let width = img.width;
                    let height = img.height;
                    const MAX_SIZE = 1200;
                    if (width > height) {
                        if (width > MAX_SIZE) { height *= MAX_SIZE / width; width = MAX_SIZE; }
                    } else {
                        if (height > MAX_SIZE) { width *= MAX_SIZE / height; height = MAX_SIZE; }
                    }
                    canvas.width = width;
                    canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    ctx.drawImage(img, 0, 0, width, height);
                    resolve(canvas.toDataURL('image/jpeg', 0.7)); // 70% calidad
                };
            };
        });
    }

    const form = document.getElementById('activityForm');
    form.onsubmit = async (e) => {
        e.preventDefault();
        const btn = document.getElementById('btnSubmit'); btn.disabled = true; btn.innerText = isEdit ? "Actualizando..." : "Enviando...";
        let data = Object.fromEntries(new FormData(form).entries());
        data.trainer = (role === 'Admin') ? document.getElementById('trainer').value : currentUser;
        data.dispositivos = tsM.getValue().join(', '); data.dispositivos_no_movil = tsNM.getValue().join(', ');
        if(data.distribuidor === "+") data.distribuidor = document.getElementById('distribuidor_custom').value || "Manual";
        
        const photos = await Promise.all(additiveFiles.map(f => _compressImage(f).then(base64 => ({name: f.name, mimeType: "image/jpeg", base64Data: base64}))));
        
        try {
            const action = isEdit ? 'updateReport' : 'saveReport';
            const payload = isEdit ? { data, rowIdx: editData.rowIdx, photos } : { data, photos };
            console.log("Submitting report:", { action, payload });
            
            // Usamos siempre POST para actualizaciones para garantizar integridad de datos
            const res = await sendPost(action, payload);
            console.log("Server response:", res);
            
            if(res.status === 'success') { 
                console.log("Server message:", res.message);
                showToast("Éxito", res.message || (isEdit ? "Reporte actualizado." : "Reporte enviado."), "#dashboard");
                window.reportEditData = null;
                setTimeout(() => navigate('#dashboard'), 100); 
            } else {
                console.warn("Report error:", res.message);
                showToast("Error", res.message || "No se pudo guardar el reporte.", "#report");
            }
        } catch(err) { 
            console.error("Submission failed:", err);
            showToast("Error", "Fallo de conexión o del servidor.", "#report"); 
        }
        btn.disabled = false;
        btn.innerHTML = `<i data-lucide="check" style="width:20px; margin-right: 8px;"></i> ${isEdit ? 'Actualizar Reporte' : 'Enviar Reporte'}`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
    };
}
window.renderReport = renderReport;