import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
style_path = os.path.join(app_dir, "style.css")

with open(style_path, "r", encoding="utf-8") as f:
    css = f.read()

# Fix the display: grid overriding inline-flex for the label
fix = """
.dashboard-filter-toggle-label {
    display: inline-flex !important;
    align-items: center !important;
    flex-direction: row !important;
    gap: 0.45rem;
}
"""

if "display: inline-flex !important;" not in css:
    css += fix

with open(style_path, "w", encoding="utf-8") as f:
    f.write(css)

# Cache bust
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.3", "v=44.4")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.4';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Icon and text aligned.")
