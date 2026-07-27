function renderLogin(container) {
    var html = `
    <div class="login-module fade-in" style="display:flex; align-items:center; justify-content:center; min-height: 80vh;">
        <div class="glass-card login-card" style="max-width: 400px; width:100%; padding: 2.5rem; text-align:center;">
            <img src="./Xiaomi_logo_(2021-).svg.png" alt="Xiaomi Logo" class="login-logo" style="width: 60px; margin-bottom: 1.5rem;">
            <h2 class="login-title" style="font-size: 1.75rem; color:var(--text-main);">¡Hola, Equipo! <i data-lucide="sparkles" style="color: var(--xiaomi-orange); width: 24px; vertical-align: middle;"></i></h2>
            <p class="login-subtitle" style="color:var(--text-muted); margin-bottom: 2rem; font-weight: 500;">Accede para organizar tu día y conectar con los demás.</p>
            
            <form id="loginForm">
                <div class="form-group">
                    <label for="username" class="form-label">Usuario</label>
                    <select id="username" name="username" class="form-control" autocomplete="username" required disabled>
                        <option value="" selected>Cargando usuarios...</option>
                    </select>
                    <button type="button" id="retryUsers" class="btn-secondary" style="display:none; width:100%; margin-top:8px;">Volver a cargar usuarios</button>
                </div>
                
                <div class="form-group">
                    <label for="password" class="form-label">Contraseña</label>
                    <div style="position: relative;">
                        <input type="password" id="password" name="password" class="form-control" autocomplete="current-password" placeholder="*************" required style="padding-right: 48px; width: 100%;">
                        <button type="button" id="togglePassword" aria-label="Mostrar contraseña" aria-pressed="false" style="position: absolute; right: 4px; top: 50%; transform: translateY(-50%); background: none; border: none; cursor: pointer; color: var(--text-muted); padding: 10px; display: flex; align-items: center;" title="Mostrar/Ocultar contraseña">
                            <i data-lucide="eye" id="eyeIcon" style="width: 20px;"></i>
                        </button>
                    </div>
                </div>
                
                <button type="submit" id="btnSubmit" class="btn-primary" style="width: 100%; margin-top: 1.5rem; height: 50px; font-size: 1rem; border-radius: 12px;">
                    <i data-lucide="lock" style="width:18px;"></i> Entrar a mi espacio
                </button>
                
                <small id="errorMsg" role="alert" aria-live="assertive" style="color: var(--status-rejected-text); display: none; margin-top: 15px; text-align: center; font-weight: 500;"></small>
            </form>
        </div>
    </div>`;

    container.innerHTML = html;
    if (typeof lucide !== 'undefined') lucide.createIcons();
    var form = document.getElementById('loginForm');
    var errorMsg = document.getElementById('errorMsg');
    var btnSubmit = document.getElementById('btnSubmit');
    var userInput = document.getElementById('username');
    var togglePassword = document.getElementById('togglePassword');
    var passwordInput = document.getElementById('password');
    var retryUsers = document.getElementById('retryUsers');

    function setLoginError(message) {
        errorMsg.innerText = message;
        errorMsg.style.display = 'block';
    }

    function loadLoginUsers() {
        userInput.disabled = true;
        btnSubmit.disabled = true;
        retryUsers.style.display = 'none';
        errorMsg.style.display = 'none';
        userInput.replaceChildren(new Option('Cargando usuarios...', '', true, true));

        api.getLoginUsers().then(function(res) {
            if (res.status !== 'success' || !Array.isArray(res.data) || !res.data.length) {
                throw new Error(res.message || 'No hay usuarios disponibles.');
            }

            var fragment = document.createDocumentFragment();
            fragment.appendChild(new Option('Selecciona tu usuario', '', true, true));
            res.data.forEach(function(item) {
                var label = item.name && item.name !== item.user
                    ? item.name + ' · ' + item.user
                    : item.user;
                fragment.appendChild(new Option(label, item.user));
            });
            userInput.replaceChildren(fragment);
            userInput.disabled = false;
            btnSubmit.disabled = false;
            userInput.focus();
        }).catch(function() {
            userInput.replaceChildren(new Option('Usuarios no disponibles', '', true, true));
            retryUsers.style.display = 'block';
            setLoginError('No se pudo cargar la lista. Publica el Code.gs actualizado como una nueva versión de Apps Script.');
        });
    }

    retryUsers.addEventListener('click', loadLoginUsers);
    loadLoginUsers();

    if (togglePassword && passwordInput) {
        togglePassword.addEventListener('click', function() {
            var type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
            passwordInput.setAttribute('type', type);
            togglePassword.setAttribute('aria-pressed', type === 'text' ? 'true' : 'false');
            togglePassword.setAttribute('aria-label', type === 'text' ? 'Ocultar contraseña' : 'Mostrar contraseña');
            var eyeIcon = document.getElementById('eyeIcon');
            if (type === 'password') {
                eyeIcon.setAttribute('data-lucide', 'eye');
            } else {
                eyeIcon.setAttribute('data-lucide', 'eye-off');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        });
    }

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        var user = userInput.value.trim();
        var pass = document.getElementById('password').value;
        if (!user) {
            setLoginError('Selecciona tu usuario.');
            return;
        }
        
        btnSubmit.disabled = true;
        btnSubmit.innerText = 'Iniciando sesión...';
        errorMsg.style.display = 'none';
        
        // Mantenemos el nombre del endpoint al array original: login
        api.login(user, pass).then(function(res) {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Entrar a mi espacio';
            if (res.status === 'success') {
                setSessionData({ user: res.user, name: res.name, role: res.role, sede: res.sede, email: res.email, token: res.token, expiresAt: res.expiresAt });
                navigate('#dashboard');
            } else {
                setLoginError(res.message || 'Usuario o contraseña incorrectos.');
            }
        }).catch(function() {
            btnSubmit.disabled = false;
            btnSubmit.innerText = 'Entrar a mi espacio';
            setLoginError('Error de red. Intenta de nuevo.');
        });
    });
}
window.renderLogin = renderLogin;
