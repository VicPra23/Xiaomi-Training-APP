import re

path = r'C:\Users\victo\Documents\xiaomi-trainer-app\src\views\Dashboard.js'
with open(path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Quitar título y subtítulo de filtro
content = re.sub(
    r'<button type="button" class="dashboard-filter-toggle" aria-expanded="true">\s*<i data-lucide="sliders-horizontal"></i>\s*<span>Filtros del resumen<small>.*?</small></span>\s*<i data-lucide="chevron-down"></i>\s*</button>',
    r'<button type="button" class="dashboard-filter-toggle" aria-expanded="true">\n                <i data-lucide="chevron-down"></i>\n            </button>',
    content, flags=re.DOTALL
)
content = re.sub(
    r'<button type="button" class="dashboard-filter-toggle" aria-expanded="true">\s*<i data-lucide="sliders-horizontal"></i>\s*<span>Periodo del resumen<small>.*?</small></span>\s*<i data-lucide="chevron-down"></i>\s*</button>',
    r'<button type="button" class="dashboard-filter-toggle" aria-expanded="true">\n                <i data-lucide="chevron-down"></i>\n            </button>',
    content, flags=re.DOTALL
)

# 2. Si los impactos o las sesiones son 0, que no salgan en la tabla de impacto por cuenta.
# Find `renderImpactTable`
target_render = r'function renderImpactTable\(data\) \{[\s\S]*?body\.innerHTML = data\.map\(\(item, index\) => `\n'
replacement_render = r'''function renderImpactTable(data) {
    const tableContainer = document.getElementById('impactTableContainer');
    if (!tableContainer) return;
    const body = document.getElementById('impactTableBody');
    if (!body) return;

    if (!data || data.length === 0) {
        body.innerHTML = '<tr><td colspan="4" style="text-align:center; padding:20px; color:var(--text-muted);">No hay datos disponibles para este periodo.</td></tr>';
        return;
    }

    const filteredData = data.filter(item => !(item.sesiones === 0 || item.impactos === 0));

    body.innerHTML = filteredData.map((item, index) => `
'''
# Using regex to replace the start of renderImpactTable up to the map
content = re.sub(r'function renderImpactTable\(data\) \{.*?body\.innerHTML = data\.map\(\(item, index\) => `\n', replacement_render, content, flags=re.DOTALL)

# 3. Que cuando arranque la semana, lo deje arrás (show current week properly without falling back)
# Check where weeks are populated from API
content = content.replace(
    'const weeks = Array.from(res.data.weeks || []);',
    'const weeks = Array.from(res.data.weeks || []);\n        if (!weeks.includes(currentWeek)) weeks.push(currentWeek);'
)

# 4. Eliminar el filtro de búsqueda de formador
content = re.sub(
    r'(\$\{isAdmin \? `\s*<div class="form-group" style="margin:0;">\s*<label class="filter-label"[^>]*>Trainer</label>\s*<select id="histFilterTrainer".*?</select>\s*</div>` : \'\'\})',
    '',
    content, flags=re.DOTALL
)
content = content.replace(
    "const target = isAdmin ? (document.getElementById('histFilterTrainer')?.value || 'Total') : currentUser;",
    "const target = isAdmin ? 'Total' : currentUser; // Formador filter removed per user request"
)

# 5. Filtro de año, que deje desde 2026
content = content.replace(
    'if (yS) yS.innerHTML = \'<option value="Todos">Todos</option>\' + res.data.years.map(y => `<option value="${y}">${y}</option>`).join(\'\');',
    'if (yS) { const validYears = res.data.years.filter(y => parseInt(y) >= 2026).sort((a,b)=>b-a); yS.innerHTML = \'<option value="Todos">Todos</option>\' + validYears.map(y => `<option value="${y}">${y}</option>`).join(\'\'); }'
)

with open(path, 'w', encoding='utf-8') as f:
    f.write(content)
print("Dashboard patched successfully")
