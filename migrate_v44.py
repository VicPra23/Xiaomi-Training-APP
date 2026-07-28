import os
import shutil

src_v44 = r"C:\Users\victo\Downloads\xiaomi-trainer-platform-v44.0\xiaomi-trainer-app"
dest = r"C:\Users\victo\Documents\xiaomi-trainer-app"

# 1. Copy style.css and index.html
shutil.copy2(os.path.join(src_v44, "style.css"), os.path.join(dest, "style.css"))
shutil.copy2(os.path.join(src_v44, "index.html"), os.path.join(dest, "index.html"))

# 2. Copy src files EXCEPT Calendar.js and api.js
for root, dirs, files in os.walk(os.path.join(src_v44, "src")):
    for file in files:
        if file in ["Calendar.js", "api.js"]:
            continue
        
        full_src_path = os.path.join(root, file)
        rel_path = os.path.relpath(full_src_path, src_v44)
        full_dest_path = os.path.join(dest, rel_path)
        
        os.makedirs(os.path.dirname(full_dest_path), exist_ok=True)
        shutil.copy2(full_src_path, full_dest_path)

print("Files copied successfully, maintaining Calendar.js and api.js")

# 3. Inject update button logic in index.html
index_path = os.path.join(dest, "index.html")
with open(index_path, 'r', encoding='utf-8') as f:
    idx = f.read()

# Add the sidebar update button logic to the service worker callback
old_sw_code = """                            if (!document.querySelector('.app-update-notice')) {
                                const notice = document.createElement('div');
                                notice.className = 'app-update-notice';
                                notice.textContent = 'Nueva versión disponible — Actualizar';
                                notice.onclick = () => window.location.reload(true);
                                document.body.appendChild(notice);
                            }"""

new_sw_code = """                            if (!document.querySelector('.app-update-notice')) {
                                const notice = document.createElement('div');
                                notice.className = 'app-update-notice';
                                notice.textContent = 'Nueva versión disponible — Actualizar';
                                notice.onclick = () => window.location.reload(true);
                                document.body.appendChild(notice);
                            }
                            // Insert update button next to user in sidebar
                            const navUser = document.getElementById('navUser');
                            if (navUser && !document.getElementById('sidebarUpdateBtn')) {
                                const sidebarBtn = document.createElement('button');
                                sidebarBtn.id = 'sidebarUpdateBtn';
                                sidebarBtn.className = 'btn-primary btn-compact';
                                sidebarBtn.style = 'margin-left: auto; font-size: 0.7rem; padding: 4px 8px; background: var(--xiaomi-orange); color: white; display: flex; align-items: center; gap: 4px;';
                                sidebarBtn.innerHTML = '<i data-lucide="download" style="width:14px; height:14px;"></i> Actualizar';
                                sidebarBtn.onclick = () => window.location.reload(true);
                                navUser.appendChild(sidebarBtn);
                                if (typeof lucide !== 'undefined') lucide.createIcons();
                            }"""

# Fallback string replace in case encoding issues or missing accents
if "notice.className = 'app-update-notice';" in idx:
    idx = idx.replace(old_sw_code, new_sw_code)
    # Just in case the exact string match fails due to encoding/accents on "versión"
    # let's do a more robust replace using regex
    import re
    idx = re.sub(
        r"(document\.body\.appendChild\(notice\);\s*})",
        r"\1\n" + "\n".join(new_sw_code.split('\n')[7:]),
        idx
    )
with open(index_path, 'w', encoding='utf-8') as f:
    f.write(idx)

# 4. Enhance tooltips in Dashboard.js
dash_path = os.path.join(dest, "src", "views", "Dashboard.js")
with open(dash_path, 'r', encoding='utf-8') as f:
    dash = f.read()

# Add interaction mode for easier hover tooltips
dash = dash.replace("maintainAspectRatio: false,", "maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },")
with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash)

print("Patches applied to index.html and Dashboard.js")
