import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
index_path = os.path.join(app_dir, "index.html")
sw_path = os.path.join(app_dir, "sw.js")

# 1. Bump versions in index.html
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()

idx = idx.replace("v=44.0", "v=44.1")

with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

# 2. Bump cache version in sw.js to force invalidation
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()

sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.1';", sw)

with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Cache busted successfully.")
