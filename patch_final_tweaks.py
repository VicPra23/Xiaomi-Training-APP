import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
style_path = os.path.join(app_dir, "style.css")
dash_path = os.path.join(app_dir, "src", "views", "Dashboard.js")

# 1. Dashboard.js tweaks
with open(dash_path, "r", encoding="utf-8") as f:
    dash = f.read()

# Remove the "Crear reporte" button
report_btn_pattern = r'<button type="button" class="btn-primary dash-primary-action" onclick="window\.reportEditData=null; window\.location\.hash=\'#report\'">\s*<i data-lucide="plus"></i><span>Crear reporte</span>\s*</button>'
dash = re.sub(report_btn_pattern, '', dash)

# Add align-self: flex-end to the button wrapper
# Replace `<div style="display: flex; gap: 8px;">` with `<div style="display: flex; gap: 8px; align-self: flex-end; margin-bottom: 0px;">`
# There are two of them (admin and normal)
dash = dash.replace(
    '<div style="display: flex; gap: 8px;">',
    '<div style="display: flex; gap: 8px; align-self: flex-end;">'
)
dash = dash.replace(
    '<div style="display:flex; gap:8px;">',
    '<div style="display:flex; gap:8px; align-self: flex-end;">'
)

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash)

# 2. Cache bust
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.4", "v=44.5")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.5';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Final tweaks applied.")
