import os

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
style_path = os.path.join(app_dir, "style.css")

with open(style_path, "r", encoding="utf-8") as f:
    css = f.read()

# Fix alignment of social bar inside utility bar
fix = """
.materials-utility-bar .social-access-bar {
    margin-bottom: 0 !important;
    margin-top: 0 !important;
}
.materials-utility-bar .materials-search {
    margin-bottom: 0 !important;
    margin-top: 0 !important;
}
"""

if ".materials-utility-bar .social-access-bar" not in css:
    css += fix

with open(style_path, "w", encoding="utf-8") as f:
    f.write(css)

# Bump version to cache bust instantly
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.2", "v=44.3")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
import re
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.3';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Alignment fixed.")
