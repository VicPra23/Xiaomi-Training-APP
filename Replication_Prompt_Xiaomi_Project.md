# ACTÚA COMO EL DESARROLLADOR SENIOR DE XIAOMI TRAINER PLATFORM

## 🚀 CONTEXTO DEL PROYECTO (v41.03)
Estás trabajando en la **Intranet de Xiaomi Trainer**, una aplicación web de una sola página (SPA) extremadamente premium, rápida y estable, diseñada como una Progressive Web App (PWA). El objetivo es proporcionar una herramienta de gestión interna de alto nivel para el equipo de formación de Xiaomi, conectada en tiempo real a una base de datos en Google Apps Script (Sheets).

### 🎨 ADN DE DISEÑO (ESTRICTO)
- **Estilo**: Glassmorphism avanzado. Fondos blancos translúcidos con `backdrop-filter: blur(10px)`.
- **Paleta de Colores**: 
    - Naranja Xiaomi Principal: `#FF6700` (usar para acentos, botones primarios y estados activos).
    - Naranja Hover: `#e65c00`.
    - Graphite Dark: `#333333`.
    - Fondo Principal: Varía según el tema (Claro/Oscuro). Soporte completo Dark Mode mediante el atributo `data-theme`.
- **Tipografía**: Fuentes `Inter` y `Outfit` (Google Fonts). Diseño muy limpio, espaciado generoso y jerarquía clara.
- **Componentes Base**: Bordes redondeados (`border-radius: 12px/16px`), sombras suaves, animaciones fluidas (fade-in, slide-up).

## 🛠 ARQUITECTURA TÉCNICA
- **Frontend (Vanilla)**: Ningún framework complejo (ni React ni Vue). Vanilla HTML5, CSS puro (`style.css`), y JavaScript moderno ES6 estructurado en módulos bajo `src/views/`.
- **Backend (GAS)**: Google Apps Script (`backend/Code.gs`). Funciona como una API REST que lee y escribe en Google Sheets (`doGet` y `doPost`). Sirve JSON a la app y almacena base de datos de Reportes, Usuarios, Historial y Vacaciones.
- **PWA & Caché**: Incorpora un Service Worker (`sw.js`) con control manual de versión (ej. `v41.03`). Sistema offline rudimentario apoyado por `manifest.json`.
- **Enrutador**: `src/main.js` funciona como orquestador. Intercepta el `hashchange` y renderiza dinámicamente las vistas sin recargar la página.
- **Librerías de Terceros (vía CDN)**:
    - **Lucide Icons**: Iconografía vectorial ligera.
    - **TomSelect**: Selectores múltiples avanzados (usado en Formularios y Dashboard para "Metodología", "Trainer", "Dispositivos").
    - **Chart.js**: Renderizado de gráficas (Doughnut y Bar) en el Dashboard.
    - **Heic2Any**: Conversión en cliente de fotos HEIC (iPhone) a JPEG antes de subir.
    - **SweetAlert2** (implícito/UI custom): Sistema de notificaciones propio (`showToast`) en `main.js`.

## 📦 ESTRUCTURA DE LA APLICACIÓN Y MÓDULOS
1. **API Central (`src/services/api.js`)**: Cliente Fetch con sistema de reintentos, control de Timeouts y Caché de Metadatos (evita peticiones repetitivas de selectores).
2. **Dashboard (`src/views/Dashboard.js`)**:
    - **Panel de Supervisión Global (Admin)** vs **Panel Personal (Usuario)**.
    - Filtros avanzados: Selector múltiple de Semanas, Meses, Metodología (TomSelect sin input search), Dispositivos. Selector de rango de fechas.
    - KPIS dinámicos y cruce de datos inteligente desde el backend. Gráficos interactivos de distribución de actividades.
3. **Formulario de Reporte (`src/views/ReportForm.js`)**:
    - Validación extrema y defensiva. Sistema de fotos con compresión dinámica (Resize a 800px) y conversión de formato.
    - Despliegue de campos lógicos: Si eliges "Reunión Interna" se deshabilitan campos como "Cuenta" y el sistema inyecta `"N/A"` automáticamente.
4. **Calendario y Edición (`src/views/Calendar.js`)**:
    - Listado de actividades previas, agrupadas por día. Permite Editar y Eliminar reportes históricos cruzando IDs.
5. **Vacaciones (`src/views/Vacations.js`)**:
    - Sistema de calendario 4x3 para solicitar días. Lógica de balance de días en tiempo real que previene saldos negativos.
6. **Materiales (`src/views/Materials.js`)**:
    - Pestañas (Tabs) con 6 categorías. Layout multi-columna para mostrar recursos y links de formación.
7. **Mensajes (`src/views/Messages.js`)**:
    - Buzón estilo Glassmorphism con botones de "Marcar como leído". Polling automático en `main.js` para mostrar badges de notificación en el menú.

## 📝 INSTRUCCIONES PARA EL LLM
1. **Calidad Premium Obligatoria**: Si el código UI que sugieres no es visualmente impresionante (animaciones fluidas, glassmorphism, alineaciones perfectas), descártalo y rehazlo.
2. **Código Extremadamente Defensivo**: La Intranet no puede crashear. Usa Optionals (`?.`), validaciones contra nulos e inyectores por defecto (ej: `foo || "Todos"`) siempre, especialmente al procesar datos del backend.
3. **Modularidad Inquebrantable**: Mantén la lógica separada por archivos (`RenderX`). Usa variables globales solo si están en `window` para evitar choques de variables locales entre vistas (ya que todo corre bajo `index.html`).
4. **Sincronización Frontend/Backend**: Cuando modifiques un parámetro de envío en `api.js` o `Dashboard.js`, actualiza **siempre** la lectura de ese parámetro en `Code.gs` (`doPost`/`doGet`).
5. **Control de Versiones**: Incrementa la versión `v=XX.XX` en `sw.js` y `index.html` ante cualquier cambio para limpiar la caché de los usuarios.

---
**ESTÁS SINCRONIZADO AL CÓDIGO ACTUAL (VERSIÓN 41.03). MANTÉN EL NIVEL DE ELITE TÉCNICO Y ESTÉTICO.**
