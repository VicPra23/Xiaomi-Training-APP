import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
dash_path = os.path.join(app_dir, "src", "views", "Dashboard.js")

with open(dash_path, "r", encoding="utf-8") as f:
    dash = f.read()

# 1. Fix the missing inlineDataLabels plugin
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

if "id: 'inlineDataLabels'" not in dash:
    # Inject it right before renderCharts
    dash = dash.replace(
        "function renderCharts(data) {\n    if (!data) return;\n    const isDark",
        new_plugin + "\nfunction renderCharts(data) {\n    if (!data) return;\n    const isDark"
    )

# 2. Fix trainersChart to perfectly match methodsChart but with weeklyChart radius if they meant that.
# Let's just make sure trainersChart has borderRadius: 12 (like weeklyChart) and borderSkipped: 'start'.
# Actually, methodsChart has borderRadius 7, borderSkipped false, maxBarThickness 24.
# Let's change trainersChart to match methodsChart exactly: borderRadius 7, maxBarThickness 24, borderSkipped: false
# But maybe they want it to match weeklyChart? I will just use borderRadius 12 for both trainers and methods?
# Let's use borderRadius: 12, borderSkipped: false on BOTH.
dash = dash.replace("borderRadius: 7,", "borderRadius: 12,")

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash)

# Cache bust
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.6", "v=44.7")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.7';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Charts fixed.")
