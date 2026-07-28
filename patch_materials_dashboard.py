import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
dash_path = os.path.join(app_dir, "src", "views", "Dashboard.js")
mat_path = os.path.join(app_dir, "src", "views", "Materials.js")
index_path = os.path.join(app_dir, "index.html")

# 1. Dashboard.js: Fix trainers chart styles and data labels
with open(dash_path, "r", encoding="utf-8") as f:
    dash = f.read()

# Make trainersChart bars match the others
dash = dash.replace(
    "{ label: 'Personas', data: names.map(n => trainerStats[n]?.alumnos || 0), backgroundColor: gradT_Orange, borderRadius: 20 },",
    "{ label: 'Personas', data: names.map(n => trainerStats[n]?.alumnos || 0), backgroundColor: gradT_Orange, borderRadius: 7, maxBarThickness: 24, borderWidth: 0, borderSkipped: false },"
)
dash = dash.replace(
    "{ label: 'Sesiones', data: names.map(n => trainerStats[n]?.sesiones || 0), backgroundColor: gradT_Gray, borderRadius: 20 }",
    "{ label: 'Sesiones', data: names.map(n => trainerStats[n]?.sesiones || 0), backgroundColor: gradT_Gray, borderRadius: 7, maxBarThickness: 24, borderWidth: 0, borderSkipped: false }"
)

# Improve data labels plugin (handle all charts gracefully and adjust font/colors)
new_plugin = """
        Chart.register({
            id: 'inlineDataLabels',
            afterDatasetsDraw: (chart) => {
                const ctx = chart.ctx;
                chart.data.datasets.forEach((dataset, i) => {
                    const meta = chart.getDatasetMeta(i);
                    if(meta.hidden) return;
                    meta.data.forEach((bar, index) => {
                        const data = dataset.data[index];
                        if(data !== 0 && data !== undefined) {
                            ctx.fillStyle = (document.documentElement.getAttribute('data-theme') === 'dark' || document.documentElement.classList.contains('dark')) ? '#ffffff' : '#4b5563';
                            ctx.font = 'bold 12px Inter, system-ui, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            if(chart.options.indexAxis === 'y') {
                                ctx.fillText(data, bar.x + 12, bar.y);
                            } else {
                                ctx.fillText(data, bar.x, bar.y - 12);
                            }
                        }
                    });
                });
            }
        });
"""
# Replace the previous plugin code entirely
dash = re.sub(r'Chart\.register\(\{\s*id: \'inlineDataLabels\'.*?\}\);', '', dash, flags=re.DOTALL)
dash = dash.replace("const isMobile = window.innerWidth <= 768;", "const isMobile = window.innerWidth <= 768;\n" + new_plugin)

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash)

# 2. Materials.js: Global Search
with open(mat_path, "r", encoding="utf-8") as f:
    mat = f.read()

# Modify renderContent to optionally ignore the fallback text if it's a global search
mat = mat.replace(
    "function renderContent(cat) {",
    "function renderContent(cat, isGlobalSearch = false) {"
)

mat = mat.replace(
    """<div class="glass-card" style="text-align: center; padding: 5rem 2rem;">
                          <i data-lucide="folder-open" style="width: 64px; height: 64px; margin-bottom: 1.5rem; color: var(--border-main);"></i>
                          <p style="color: var(--text-medium); font-size: 1.1rem;">No hay materiales disponibles en esta búsqueda.</p>
                      </div>""",
    """${isGlobalSearch ? '' : `<div class="glass-card" style="text-align: center; padding: 5rem 2rem;">
                          <i data-lucide="folder-open" style="width: 64px; height: 64px; margin-bottom: 1.5rem; color: var(--border-main);"></i>
                          <p style="color: var(--text-medium); font-size: 1.1rem;">No hay materiales disponibles en esta búsqueda.</p>
                      </div>`}"""
)

# Modify the update loop logic
old_update_logic = """if (contentContainer) contentContainer.innerHTML = renderContent(categories.find(c => c.id === activeCatId));"""
new_update_logic = """if (contentContainer) {
                      if (searchQuery.trim()) {
                          const allHtml = categories.map(c => renderContent(c, true)).filter(html => html.includes('<section class="material-group"')).join('');
                          contentContainer.innerHTML = allHtml || `<div class="glass-card" style="text-align: center; padding: 5rem 2rem;"><p style="color: var(--text-medium); font-size: 1.1rem;">No hay resultados en ninguna categoría.</p></div>`;
                      } else {
                          contentContainer.innerHTML = renderContent(categories.find(c => c.id === activeCatId));
                      }
                  }"""

mat = mat.replace(old_update_logic, new_update_logic)

with open(mat_path, "w", encoding="utf-8") as f:
    f.write(mat)

# 3. Bump version in index.html to cache bust
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.1", "v=44.2")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

# 4. Bump sw.js too
sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.2';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Patch applied.")
