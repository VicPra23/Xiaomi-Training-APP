function renderLogin(container) {
    container.innerHTML = `
        <div class="login-module fade-in">
            <section class="login-shell" aria-labelledby="loginTitle">
                <div class="login-brand-panel" aria-hidden="true">
                    <div class="login-brand-lockup">
                        <img src="./Xiaomi_logo_(2021-).svg.png" alt="" width="52" height="52">
                        <span>Xiaomi Trainer</span>
                    </div>
                    <div class="login-brand-copy">
                        <span class="login-eyebrow">Plataforma interna</span>
                        <h1>Tu jornada,<br>bien coordinada.</h1>
                        <p>Planificación, reportes y recursos del equipo de formación en un único espacio.</p>
                    </div>
                </div>

                <div class="login-card">
                    <div class="login-mobile-brand">
                        <img src="./Xiaomi_logo_(2021-).svg.png" alt="" width="44" height="44">
                        <strong>Xiaomi Trainer</strong>
                    </div>
                    <h2 id="loginTitle" class="login-title">Bienvenido al equipo</h2>
                    <p class="login-subtitle">Selecciona tu perfil e introduce tu contraseña.</p>

                    <form id="loginForm" novalidate>
                        <div class="form-group">
                            <label for="username" class="form-label">Usuario</label>
                            <select id="username" name="username" class="form-control" autocomplete="username" required disabled>
                                <option value="" selected>Cargando usuarios…</option>
                            </select>
                            <button type="button" id="retryUsers" class="btn-secondary login-retry">Volver a cargar usuarios</button>
                        </div>

                        <div class="form-group">
                            <label for="password" class="form-label">Contraseña</label>
                            <div class="password-field">
                                <input type="password" id="password" name="password" class="form-control" autocomplete="current-password" placeholder="Introduce tu contraseña" required aria-describedby="errorMsg">
                                <button type="button" id="togglePassword" class="password-toggle" aria-label="Mostrar contraseña" aria-pressed="false" title="Mostrar contraseña">
                                    <i data-lucide="eye" id="eyeIcon"></i>
                                </button>
                            </div>
                        </div>

                        <button type="submit" id="btnSubmit" class="btn-primary login-submit">
                            <i data-lucide="arrow-right"></i><span>Entrar a mi espacio</span>
                        </button>
                        <p id="errorMsg" class="login-error" role="alert" aria-live="assertive"></p>
                    </form>
                    <p class="login-privacy"><i data-lucide="shield-check"></i> La contraseña se envía de forma protegida y no aparece en la URL.</p>
                </div>
            </section>
        </div>`;

    if (typeof lucide !== 'undefined') lucide.createIcons();
    const form = document.getElementById('loginForm');
    const errorMsg = document.getElementById('errorMsg');
    const btnSubmit = document.getElementById('btnSubmit');
    const userInput = document.getElementById('username');
    const togglePassword = document.getElementById('togglePassword');
    const passwordInput = document.getElementById('password');
    const retryUsers = document.getElementById('retryUsers');

    function setLoginError(message) {
        errorMsg.textContent = String(message || '');
        errorMsg.classList.toggle('is-visible', Boolean(message));
    }

    function setSubmitLoading(isLoading) {
        btnSubmit.disabled = isLoading;
        btnSubmit.innerHTML = isLoading
            ? '<span class="button-spinner" aria-hidden="true"></span><span>Verificando acceso…</span>'
            : '<i data-lucide="arrow-right"></i><span>Entrar a mi espacio</span>';
        if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    function loadLoginUsers() {
        userInput.disabled = true;
        btnSubmit.disabled = true;
        retryUsers.classList.remove('is-visible');
        setLoginError('');
        userInput.replaceChildren(new Option('Cargando usuarios…', '', true, true));

        api.getLoginUsers().then(res => {
            if (res.status !== 'success' || !Array.isArray(res.data) || !res.data.length) {
                throw new Error(res.message || 'No hay usuarios disponibles.');
            }

            const fragment = document.createDocumentFragment();
            fragment.appendChild(new Option('Selecciona tu usuario', '', true, true));
            res.data.forEach(item => {
                const user = String(item && item.user || '').trim();
                if (!user) return;
                const name = String(item.name || user).trim();
                fragment.appendChild(new Option(name !== user ? `${name} · ${user}` : user, user));
            });
            userInput.replaceChildren(fragment);
            userInput.disabled = false;
            btnSubmit.disabled = false;
        }).catch(() => {
            userInput.replaceChildren(new Option('Usuarios no disponibles', '', true, true));
            retryUsers.classList.add('is-visible');
            setLoginError('No hemos podido cargar los usuarios. Revisa la conexión y vuelve a intentarlo.');
        });
    }

    retryUsers.addEventListener('click', loadLoginUsers);
    loadLoginUsers();
    userInput.addEventListener('change', () => setLoginError(''));
    passwordInput.addEventListener('input', () => setLoginError(''));

    togglePassword.addEventListener('click', () => {
        const showPassword = passwordInput.type === 'password';
        passwordInput.type = showPassword ? 'text' : 'password';
        togglePassword.setAttribute('aria-pressed', showPassword ? 'true' : 'false');
        togglePassword.setAttribute('aria-label', showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña');
        togglePassword.title = showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña';
        document.getElementById('eyeIcon')?.setAttribute('data-lucide', showPassword ? 'eye-off' : 'eye');
        if (typeof lucide !== 'undefined') lucide.createIcons();
    });

    form.addEventListener('submit', event => {
        event.preventDefault();
        const user = userInput.value.trim();
        const pass = passwordInput.value;
        if (!user) {
            setLoginError('Selecciona tu usuario para continuar.');
            userInput.focus();
            return;
        }
        if (!pass) {
            setLoginError('Introduce tu contraseña para continuar.');
            passwordInput.focus();
            return;
        }

        setSubmitLoading(true);
        setLoginError('');
        api.login(user, pass).then(res => {
            setSubmitLoading(false);
            if (res.status === 'success') {
                setSessionData({ user: res.user, name: res.name, role: res.role, sede: res.sede, email: res.email, token: res.token, expiresAt: res.expiresAt });
                navigate('#dashboard');
            } else {
                setLoginError(res.message || 'No hemos podido validar esas credenciales.');
                passwordInput.focus();
                passwordInput.select();
            }
        }).catch(() => {
            setSubmitLoading(false);
            setLoginError('No hemos podido conectar con el servidor. Comprueba tu conexión y reintenta.');
        });
    });
}

window.renderLogin = renderLogin;
