import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
cal_path = os.path.join(app_dir, "src", "views", "Calendar.js")

with open(cal_path, "r", encoding="utf-8") as f:
    cal = f.read()

# 1. Add toast to saveAssignment
cal = cal.replace(
    "const response = await api.saveAssignment({ user: userId, date, items: newItems, modifiedBy: currentUser });",
    "const response = await api.saveAssignment({ user: userId, date, items: newItems, modifiedBy: currentUser, notify: false, silent: true });"
)

save_success_block = """
                  calendarData.schedule[date][userId] = deepCopyItems(newItems);
                  rememberSuggestions(newItems);
                  buildSuggestionCatalog();
                  close();
                  if (typeof window.showToast === 'function') {
                      window.showToast("Tarea creada con éxito");
                  }
"""
cal = cal.replace(
    "                  calendarData.schedule[date][userId] = deepCopyItems(newItems);\n                  rememberSuggestions(newItems);\n                  buildSuggestionCatalog();\n                  close();",
    save_success_block.strip("\n")
)

# Cache bust
index_path = os.path.join(app_dir, "index.html")
with open(index_path, "r", encoding="utf-8") as f:
    idx = f.read()
idx = idx.replace("v=44.7", "v=44.8")
with open(index_path, "w", encoding="utf-8") as f:
    f.write(idx)

sw_path = os.path.join(app_dir, "sw.js")
with open(sw_path, "r", encoding="utf-8") as f:
    sw = f.read()
sw = re.sub(r"CACHE_NAME = 'xiaomi-trainer-v[\d\.]+';", "CACHE_NAME = 'xiaomi-trainer-v44.8';", sw)
with open(sw_path, "w", encoding="utf-8") as f:
    f.write(sw)

print("Calendar final patched.")
