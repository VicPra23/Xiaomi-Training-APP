import os
import re

app_dir = r"C:\Users\victo\Documents\xiaomi-trainer-app"
style_path = os.path.join(app_dir, "style.css")
dash_path = os.path.join(app_dir, "src", "views", "Dashboard.js")
index_path = os.path.join(app_dir, "index.html")
cal_path = os.path.join(app_dir, "src", "views", "Calendar.js")

# 1. Filtros text next to emoji
with open(style_path, "r", encoding="utf-8") as f:
    css = f.read()

# Replace fixed width of 44px to allow text
css = css.replace(
    ".dashboard-filter-toggle-minimal {\n      width: 44px;\n      min-height: 36px;\n      margin: -0.2rem 0 0.45rem auto;\n      justify-content: center;",
    ".dashboard-filter-toggle-minimal {\n      width: auto;\n      padding: 0 12px;\n      min-height: 36px;\n      margin: -0.2rem 0 0.45rem auto;\n      justify-content: center;"
)

with open(style_path, "w", encoding="utf-8") as f:
    f.write(css)

# 2. Methodology max height fix & 3. Data labels inline plugin registration
with open(dash_path, "r", encoding="utf-8") as f:
    dash = f.read()

# Add inline datalabels plugin at the top of render
plugin_code = """
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
                            ctx.fillStyle = (document.documentElement.dataset.theme === 'dark' || window.matchMedia('(prefers-color-scheme: dark)').matches) ? '#ffffff' : '#4b5563';
                            ctx.font = 'bold 11px Inter, sans-serif';
                            ctx.textAlign = 'center';
                            ctx.textBaseline = 'middle';
                            if(chart.options.indexAxis === 'y') {
                                ctx.fillText(data, bar.x - 12, bar.y);
                            } else {
                                ctx.fillText(data, bar.x, bar.y - 12);
                            }
                        }
                    });
                });
            }
        });
"""

if "inlineDataLabels" not in dash:
    dash = dash.replace(
        "const isMobile = window.innerWidth <= 768;",
        "const isMobile = window.innerWidth <= 768;\n" + plugin_code
    )

dash = dash.replace(
    '<select id="dashboardMethodology" class="form-control" multiple>',
    '<select id="dashboardMethodology" class="form-control" multiple style="max-height: 42px; overflow: hidden;">'
)

with open(dash_path, "w", encoding="utf-8") as f:
    f.write(dash)

# 4. Fix Calendar smooth scroll bug
with open(cal_path, "r", encoding="utf-8") as f:
    cal = f.read()

# Disable smooth scroll by forcing auto if not smooth
scroll_month = """    function scrollToMonth(monthIndex, smooth) {
        const section = container.querySelector(`#calendar-month-${monthIndex}`);
        if (!section) return;
        yearScroll.style.scrollBehavior = smooth ? "smooth" : "auto";
        yearScroll.scrollTo({ top: Math.max(0, section.offsetTop - 8), behavior: smooth ? "smooth" : "auto" });
        setActiveMonth(monthIndex);
    }"""
cal = re.sub(r'function scrollToMonth.*?setActiveMonth\(monthIndex\);\s*}', scroll_month, cal, flags=re.DOTALL)

scroll_today = """    function scrollToToday(smooth) {
        yearScroll.style.scrollBehavior = smooth ? "smooth" : "auto";
        document.documentElement.style.scrollBehavior = smooth ? "smooth" : "auto";
        scrollToMonth(now.getMonth(), smooth);"""
cal = cal.replace("function scrollToToday(smooth) {\n        scrollToMonth(now.getMonth(), smooth);", scroll_today)

# Restore document scroll behavior at the end of scrollToToday
cal = cal.replace(
    "todayCell.classList.add(\"calendar-today-arrival\");",
    "todayCell.classList.add(\"calendar-today-arrival\");\n            document.documentElement.style.scrollBehavior = \"\";\n            yearScroll.style.scrollBehavior = \"\";"
)

with open(cal_path, "w", encoding="utf-8") as f:
    f.write(cal)

print("All tweaks applied successfully!")
