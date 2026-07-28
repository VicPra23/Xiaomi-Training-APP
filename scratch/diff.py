import os
import difflib

dir1 = r'C:\Users\victo\Documents\xiaomi-trainer-app'
dir2 = r'C:\Users\victo\Downloads\xiaomi-trainer-platform-v43.1'

files_to_check = [
    'index.html', 'style.css', 'sw.js', 'manifest.json',
    'backend/Code.gs', 'src/main.js', 'src/views/Dashboard.js',
    'src/views/Login.js', 'src/views/Materials.js', 'src/views/Messages.js',
    'src/views/ReportForm.js', 'src/views/Vacations.js'
]

with open(os.path.join(dir1, 'scratch', 'audit.txt'), 'w', encoding='utf-8') as out:
    for f in files_to_check:
        path1 = os.path.join(dir1, f)
        path2 = os.path.join(dir2, f)
        if not os.path.exists(path1) or not os.path.exists(path2):
            out.write(f"{f}: Missing in one of the directories.\n")
            continue
            
        with open(path1, 'r', encoding='utf-8', errors='ignore') as f1, \
             open(path2, 'r', encoding='utf-8', errors='ignore') as f2:
            lines1 = f1.readlines()
            lines2 = f2.readlines()
            
            diff = list(difflib.unified_diff(lines1, lines2, n=0))
            additions = sum(1 for line in diff if line.startswith('+') and not line.startswith('+++'))
            deletions = sum(1 for line in diff if line.startswith('-') and not line.startswith('---'))
            
            out.write(f"\n--- {f} ---\n")
            out.write(f"Additions: {additions}, Deletions: {deletions}\n")
            if additions > 0 or deletions > 0:
                # show up to 10 context-less lines of changes
                out.write("Sample changes:\n")
                added_lines = [l for l in diff if l.startswith('+') and not l.startswith('+++')]
                for al in added_lines[:15]:
                    out.write(al.strip() + "\n")
