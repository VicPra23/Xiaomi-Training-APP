import os

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
style_path = os.path.join(app_dir, "style.css")

with open(style_path, "r", encoding="utf-8") as f:
    css = f.read()

# I am making sure the rule is added
fix = """
.dashboard-filter-toggle-label {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 0.45rem;
}
"""

if ".dashboard-filter-toggle-label {" not in fix or "flex-direction: row !important;" not in css:
    css += fix

with open(style_path, "w", encoding="utf-8") as f:
    f.write(css)

# Cache bust
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.5", "v=44.6")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
import re
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.6';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("CSS label fix applied.")
