import re

# 1. Update Calendar.js
cal_path = r'C:\Users\victo\Documents\xiaomi-trainer-app\src\views\Calendar.js'
with open(cal_path, 'r', encoding='utf-8') as f:
    cal_content = f.read()

# Fix monthRail smooth scroll
cal_content = cal_content.replace(
    'function setActiveMonth(monthIndex) {',
    'function setActiveMonth(monthIndex, smooth = false) {'
)
cal_content = cal_content.replace(
    'behavior: "smooth"',
    'behavior: smooth ? "smooth" : "auto"'
)
cal_content = cal_content.replace(
    'setActiveMonth(monthIndex);',
    'setActiveMonth(monthIndex, smooth);'
)

# Optional: if Calendar also has a delete report prompt, replace it. 
# But user said "Pop up de borrado que est alineado..." which is mainly used in Dashboard History.
# We will do it in Dashboard.js instead, as that's where api.deleteReport is called.

with open(cal_path, 'w', encoding='utf-8') as f:
    f.write(cal_content)
print("Calendar patched")

# 2. Update Dashboard.js
dash_path = r'C:\Users\victo\Documents\xiaomi-trainer-app\src\views\Dashboard.js'
with open(dash_path, 'r', encoding='utf-8') as f:
    dash_content = f.read()

# Replace confirm() with custom modal for deleteReport
dash_delete_code = '''
            if(!confirm("¿Seguro que quieres eliminar este reporte permanentemente?")) return;
            
            const btn = document.activeElement;
            api.deleteReport(report.id).then(res => {
'''

custom_modal_code = '''
            const btn = document.activeElement;
            
            // Custom Delete Modal
            const modalHtml = `
                <div id="customDeleteModal" style="position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 10000; opacity: 0; transition: opacity 0.3s ease;">
                    <div class="glass-card" style="max-width: 400px; width: 90%; padding: 2rem; border-radius: 16px; transform: translateY(20px); transition: transform 0.3s ease;">
                        <h3 style="margin-bottom: 1rem; display: flex; align-items: center; gap: 8px; color: var(--text-main);"><i data-lucide="trash-2" style="color: #ef4444;"></i> Eliminar Reporte</h3>
                        <p style="margin-bottom: 1.5rem; color: var(--text-muted); font-size: 0.95rem;">¿Estás seguro de que deseas eliminar este reporte permanentemente?</p>
                        <textarea id="deleteComment" class="form-control" placeholder="Escribe un motivo (opcional)..." style="width: 100%; height: 80px; margin-bottom: 1.5rem; resize: none;"></textarea>
                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button id="btnCancelDelete" class="btn-secondary">Cancelar</button>
                            <button id="btnConfirmDelete" class="btn-primary" style="background: #ef4444;">Eliminar</button>
                        </div>
                    </div>
                </div>
            `;
            document.body.insertAdjacentHTML('beforeend', modalHtml);
            if (typeof lucide !== 'undefined') lucide.createIcons();
            
            const modal = document.getElementById('customDeleteModal');
            setTimeout(() => { modal.style.opacity = '1'; modal.querySelector('.glass-card').style.transform = 'translateY(0)'; }, 10);
            
            const closeModal = () => {
                modal.style.opacity = '0';
                modal.querySelector('.glass-card').style.transform = 'translateY(20px)';
                setTimeout(() => modal.remove(), 300);
            };
            
            document.getElementById('btnCancelDelete').onclick = closeModal;
            document.getElementById('btnConfirmDelete').onclick = () => {
                const comment = document.getElementById('deleteComment').value.trim();
                closeModal();
                api.deleteReport(report.id, comment).then(res => {
'''
dash_content = dash_content.replace(dash_delete_code, custom_modal_code)
# Ensure api.deleteReport signature in Dashboard
dash_content = dash_content.replace(
    'deleteReport: (id) => _fetch("deleteReport", { id }),',
    'deleteReport: (id, comment) => _fetch("deleteReport", { id, comment }),'
)

with open(dash_path, 'w', encoding='utf-8') as f:
    f.write(dash_content)
print("Dashboard patched")

# 3. Update Code.gs
code_path = r'C:\Users\victo\Documents\xiaomi-trainer-app\backend\Code.gs'
with open(code_path, 'r', encoding='utf-8') as f:
    code_content = f.read()

# Inside Code.gs, deleteReport needs to handle the comment and send notifications
delete_report_target = '''
  function deleteReport(req, session) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
      const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
'''
delete_report_replacement = '''
  function deleteReport(req, session) {
    const lock = LockService.getScriptLock();
    try {
      lock.waitLock(10000);
      const ss = SpreadsheetApp.openById(CONFIG.REPORTES_SS_ID);
      const s = ss.getSheetByName(CONFIG.REPORTES_SHEET_NAME);
      
      if (req.comment && req.comment.trim() !== "") {
          const commentMsg = `El reporte ${req.id} ha sido eliminado. Motivo: ${req.comment}`;
          notifyAdmin(session.user, commentMsg);
          notifyUser(session.user, commentMsg, "System");
      }
'''
code_content = code_content.replace(delete_report_target, delete_report_replacement)

with open(code_path, 'w', encoding='utf-8') as f:
    f.write(code_content)
print("Code.gs patched")
