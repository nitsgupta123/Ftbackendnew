from openpyxl import Workbook
from openpyxl.styles import Font, PatternFill, Alignment, Border, Side
from openpyxl.utils import get_column_letter

wb = Workbook()

header_fill = PatternFill("solid", fgColor="1F4E79")
header_font = Font(bold=True, color="FFFFFF", size=11)
section_fill = PatternFill("solid", fgColor="D6EAF8")
section_font = Font(bold=True, size=11, color="1F4E79")
step_fill = PatternFill("solid", fgColor="FFF2CC")
title_font = Font(bold=True, size=14, color="1F4E79")
wrap = Alignment(wrap_text=True, vertical="top")
thin = Border(
    left=Side(style="thin", color="BFBFBF"),
    right=Side(style="thin", color="BFBFBF"),
    top=Side(style="thin", color="BFBFBF"),
    bottom=Side(style="thin", color="BFBFBF"),
)
alt_fill = PatternFill("solid", fgColor="F8F9FA")
green_fill = PatternFill("solid", fgColor="E8F5E9")
orange_fill = PatternFill("solid", fgColor="FFF3E0")


def style_header(ws, cols):
    for col in range(1, cols + 1):
        cell = ws.cell(1, col)
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(wrap_text=True, vertical="center", horizontal="center")
        cell.border = thin


def autosize(ws, widths):
    for i, w in enumerate(widths, 1):
        ws.column_dimensions[get_column_letter(i)].width = w


def write_rows(ws, rows, start=2):
    for r_idx, row in enumerate(rows):
        for c_idx, val in enumerate(row, 1):
            cell = ws.cell(start + r_idx, c_idx, val)
            cell.alignment = wrap
            cell.border = thin
            if (start + r_idx) % 2 == 0:
                cell.fill = alt_fill
        ws.row_dimensions[start + r_idx].height = 45


# ===================== SHEET 1: Overview =====================
ws = wb.active
ws.title = "01 Overview"
ws["A1"] = "Fayyaz Travels Admin Panel — How It Works (Step-by-Step Guide)"
ws["A1"].font = title_font
ws.merge_cells("A1:D1")
ws.row_dimensions[1].height = 28

overview = [
    ["Item", "Details"],
    ["Product", "Fayyaz Travels Admin (ftadmin)"],
    ["Purpose", "Manage travel packages, blogs, CMS pages, suppliers, enquiries, users & permissions"],
    ["Tech stack", "Next.js (UI) + Fastify API (port 4000) + MySQL database"],
    ["Login", "Go to /login → enter email & password → JWT token saved → redirect to Dashboard (/)"],
    ["Layout", "After login: Left Sidebar (menu) + Top Header (search, enquiries, user menu) + Main content"],
    ["Permissions", "Sidebar & actions filtered by role (view / edit / delete). Super admin can manage users & access."],
    ["Data flow", "Page → API client (*-api.ts) → Fastify /api/* → Repository → MySQL"],
    ["How to use this Excel", "Read sheets in order 01 → 10. Each sheet starts from that module and lists user steps."],
]
for r, row in enumerate(overview, 1):
    for c, v in enumerate(row, 1):
        cell = ws.cell(r + 1, c, v)
        cell.alignment = wrap
        cell.border = thin
        if r == 1:
            cell.fill = header_fill
            cell.font = header_font
        elif c == 1:
            cell.fill = section_fill
            cell.font = section_font
        else:
            cell.fill = alt_fill
    ws.row_dimensions[r + 1].height = 35

ws["A12"] = "Sidebar menu order (follow this sequence)"
ws["A12"].font = section_font
ws.merge_cells("A12:B12")
nav_order = [
    ["Order", "Module", "Route", "Sheet"],
    ["1", "Dashboard", "/", "02 Dashboard"],
    ["2", "Settings (General, Users, Roles, Access)", "/settings/*, /user-management", "03 Settings"],
    ["3", "Blogs Management", "/blogs/*", "04 Blogs"],
    ["4", "Page Management (CMS)", "/pages/*", "05 Pages"],
    ["5", "Packages (+ Add Package wizard)", "/packages/*, /add-package", "06 Packages"],
    ["6", "Suppliers", "/suppliers", "07 Suppliers"],
    ["7", "Promotions", "/promotions", "08 Promotions"],
    ["8", "Enquiry", "/enquiry", "09 Enquiry"],
]
for r, row in enumerate(nav_order, 13):
    for c, v in enumerate(row, 1):
        cell = ws.cell(r, c, v)
        cell.alignment = wrap
        cell.border = thin
        if r == 13:
            cell.fill = header_fill
            cell.font = header_font
        else:
            cell.fill = green_fill if r == 14 else alt_fill

ws.column_dimensions["A"].width = 12
ws.column_dimensions["B"].width = 48
ws.column_dimensions["C"].width = 40
ws.column_dimensions["D"].width = 18

# ===================== SHEET 2: Dashboard =====================
ws2 = wb.create_sheet("02 Dashboard")
headers2 = ["Step", "What you see / do", "Where", "What happens behind the scenes", "What to do next"]
for c, h in enumerate(headers2, 1):
    ws2.cell(1, c, h)
style_header(ws2, 5)

dash_rows = [
    [
        "0 — Open app",
        "Open admin URL. If not logged in, you land on Login.",
        "/login",
        "RouteGuard blocks private pages without JWT.",
        "Enter credentials and sign in.",
    ],
    [
        "1 — Login",
        "Enter email & password → click Login.",
        "/login",
        "POST /api/auth/login → JWT + user saved → GET /api/auth/me + GET /api/permissions/me.",
        "You are redirected to Dashboard (/).",
    ],
    [
        "2 — Land on Dashboard",
        "Welcome message + overview of the platform.",
        "/",
        "Page loads AdminShell (Sidebar + Header).",
        "Scan the 7 stat cards first.",
    ],
    [
        "3 — Read stat cards",
        "Cards show key counts (packages, blogs, pages, users, destinations, enquiries, etc.).",
        "Dashboard top",
        "GET /api/dashboard?chartDays=… via getDashboardOverview().",
        "Click a card to jump to that module (e.g. Packages, Users).",
    ],
    [
        "4 — Chart",
        "Activity/trend chart for last 7 / 30 / 90 days.",
        "Dashboard middle",
        "Same dashboard API; chartDays query changes range.",
        "Switch day range to see trends.",
    ],
    [
        "5 — Recent activities",
        "List of latest admin actions / content updates.",
        "Dashboard middle-lower",
        "Returned in dashboard overview payload.",
        "Use this to see what changed recently.",
    ],
    [
        "6 — Quick actions",
        "Shortcuts: Add Package, manage blogs, packages hub, users, categories.",
        "Dashboard lower",
        "Client links to routes (no extra API).",
        "Pick an action based on your task.",
    ],
    [
        "7 — Content summary",
        "Summary of content status across modules.",
        "Dashboard bottom",
        "Part of dashboard overview response.",
        "Go deeper via Sidebar if needed.",
    ],
    [
        "8 — Header search",
        "Search packages + quick links from top bar.",
        "Header",
        "Searches package data; also shows open-enquiry notifications.",
        "Open a package or Enquiry from results/notifications.",
    ],
    [
        "9 — Sidebar navigation",
        "Left menu: Dashboard → Settings → Blogs → Pages → Packages → Suppliers → Promotions → Enquiry.",
        "Sidebar",
        "Items filtered by can(module, 'view') permissions.",
        "Click next module you need (see sheets 03–09).",
    ],
]
write_rows(ws2, dash_rows)
autosize(ws2, [18, 55, 22, 55, 40])
ws2.row_dimensions[1].height = 30
for i in range(2, 12):
    ws2.cell(i, 1).fill = step_fill
    ws2.cell(i, 1).font = Font(bold=True)

ws2["A13"] = (
    "Dashboard is VIEW-ONLY — it does not create content. "
    "Use Quick Actions or Sidebar to start real work."
)
ws2["A13"].font = Font(italic=True, color="C65911")
ws2.merge_cells("A13:E13")

# ===================== SHEET 3: Settings =====================
ws3 = wb.create_sheet("03 Settings")
for c, h in enumerate(["Step", "Sub-module", "What you do", "Route / API", "Result / next step"], 1):
    ws3.cell(1, c, h)
style_header(ws3, 5)

settings_rows = [
    [
        "1",
        "Open Settings",
        "From Sidebar click Settings (or a settings child).",
        "Sidebar → Settings",
        "Choose General / Users / Roles / Access.",
    ],
    [
        "2",
        "General Settings",
        "View/edit site metadata, contact, global options → Save.",
        "/settings/general → GET/PATCH /api/settings",
        "Site-wide settings updated.",
    ],
    [
        "3",
        "User Management",
        "Open user list; view stats; edit or deactivate users.",
        "/user-management → /api/users, /api/users/stats",
        "Accounts maintained.",
    ],
    [
        "4",
        "Add User (super_admin)",
        "Click Add User → fill form → create.",
        "/user-management (super_admin only)",
        "New admin user can log in (subject to role).",
    ],
    [
        "5",
        "Role Management",
        "Create/structure admin roles (governance UI).",
        "/settings/role-management",
        "Roles defined for the org.",
    ],
    [
        "6",
        "Access Control",
        "Open permission matrix; toggle view/edit/delete per role & module.",
        "/settings/roles → /api/permissions",
        "Sidebar & package steps respect new permissions.",
    ],
    [
        "7",
        "Reset / update permissions",
        "Update role permissions or reset defaults.",
        "/api/permissions (update/reset)",
        "Users with that role get new access on next load.",
    ],
]
write_rows(ws3, settings_rows)
autosize(ws3, [8, 24, 55, 45, 40])
for i in range(2, 9):
    ws3.cell(i, 1).fill = step_fill

# ===================== SHEET 4: Blogs =====================
ws4 = wb.create_sheet("04 Blogs")
for c, h in enumerate(["Step", "Action", "Where", "API / data", "Outcome"], 1):
    ws4.cell(1, c, h)
style_header(ws4, 5)

blog_rows = [
    [
        "1",
        "Open Blogs Management",
        "Sidebar → Blogs",
        "/blogs redirects to /blogs/all",
        "See all posts list.",
    ],
    [
        "2",
        "Filter by status",
        "Use sub-pages: All / Drafts / Pending Review / Scheduled / Published",
        "/blogs/[module]",
        "Filtered list via BlogsPanel.",
    ],
    [
        "3",
        "Check stats",
        "Stats shown on blogs panels",
        "GET /api/blogs/stats",
        "Counts by status.",
    ],
    [
        "4",
        "Create new blog",
        "Write New → /blogs/new → fill title, content, media, category, schedule",
        "POST /api/blogs (+ media upload)",
        "Post created; redirected to matching status list.",
    ],
    [
        "5",
        "Edit blog",
        "Open post → /blogs/edit/[id]",
        "GET/PATCH /api/blogs/:id",
        "Update content, SEO, status.",
    ],
    [
        "6",
        "Manage categories",
        "Blogs → Categories",
        "/blogs/categories → /api/blog-categories",
        "CRUD blog categories.",
    ],
    [
        "7",
        "Schedule / publish",
        "Set status scheduled or published (cron publishes scheduled)",
        "Blog status fields + server cron",
        "Goes live on public site when published.",
    ],
]
write_rows(ws4, blog_rows)
autosize(ws4, [8, 28, 55, 40, 40])
for i in range(2, 9):
    ws4.cell(i, 1).fill = step_fill

# ===================== SHEET 5: Pages =====================
ws5 = wb.create_sheet("05 Pages")
for c, h in enumerate(["Step", "Action", "Where", "API / data", "Outcome"], 1):
    ws5.cell(1, c, h)
style_header(ws5, 5)

page_rows = [
    [
        "1",
        "Open Page Management",
        "Sidebar → Pages",
        "/pages → /pages/all",
        "CMS page list.",
    ],
    [
        "2",
        "Filter lists",
        "All / Drafts / Published",
        "/pages/[module] → PagesPanel",
        "Filtered CMS pages.",
    ],
    [
        "3",
        "Create page",
        "Create New → /pages/new → fill content, SEO, nav",
        "POST /api/pages",
        "Often redirected to /pages/edit/[id].",
    ],
    [
        "4",
        "Edit page",
        "Open page → edit content / SEO / navigation",
        "GET/PATCH /api/pages/:id",
        "Page updated.",
    ],
    [
        "5",
        "Publish",
        "Change status to published from editor or list",
        "/api/pages",
        "Live on public site.",
    ],
    [
        "6",
        "View stats",
        "Stats on pages panels",
        "GET /api/pages/stats",
        "Draft vs published counts.",
    ],
]
write_rows(ws5, page_rows)
autosize(ws5, [8, 22, 50, 35, 40])
for i in range(2, 8):
    ws5.cell(i, 1).fill = step_fill

# ===================== SHEET 6: Packages =====================
ws6 = wb.create_sheet("06 Packages")
for c, h in enumerate(["Step", "Area", "What you do", "Route / API", "Notes"], 1):
    ws6.cell(1, c, h)
style_header(ws6, 5)

pkg_rows = [
    [
        "1",
        "Package Dashboard",
        "Open Packages from Sidebar — see stats + recent packages table.",
        "/packages → getPackageStats, listAllPackages",
        "Hub for all package work.",
    ],
    [
        "2",
        "Browse lists",
        "Open All / Drafts / Pending Review / Expiring Rates / Supplier Quotes / Archived.",
        "/packages/[module]",
        "Each list uses PackageListTable.",
    ],
    [
        "3",
        "Categories",
        "Manage package categories.",
        "/packages/categories → /api/categories",
        "Used when building packages.",
    ],
    [
        "4",
        "Pricing rules",
        "Configure pricing rules.",
        "/packages/pricing-rules → /api/pricing-rules",
        "Affects pricing step.",
    ],
    [
        "5",
        "Templates",
        "Manage / apply package templates.",
        "/packages/templates → /api/package-templates",
        "Can start Add Package with ?templateId=",
    ],
    [
        "6",
        "Guide",
        "Read package builder guide cards.",
        "/packages/guide",
        "Static help, no API.",
    ],
    [
        "7",
        "Start Add Package",
        "Click Add Package (dashboard or packages).",
        "/add-package",
        "Opens 14-step wizard.",
    ],
    [
        "8",
        "Edit existing",
        "From table: Edit → opens wizard with package id.",
        "/add-package?id=…",
        "Loads getPackage(id).",
    ],
    [
        "9",
        "Table actions",
        "Edit / View / Delete / Preview from list.",
        "update/delete package APIs",
        "Preview opens public-facing view.",
    ],
    [
        "10",
        "Publish workflow",
        "Complete wizard → Review & Publish (step 14).",
        "See sheet 06b Package Wizard",
        "Status becomes published or pending_review.",
    ],
]
write_rows(ws6, pkg_rows)
autosize(ws6, [8, 20, 55, 45, 40])
for i in range(2, 12):
    ws6.cell(i, 1).fill = step_fill

# ===================== SHEET 6b: Package Wizard =====================
ws6b = wb.create_sheet("06b Package Wizard")
for c, h in enumerate(
    ["Step #", "Wizard step name", "What admin fills / does", "Key component / data", "Continue to"], 1
):
    ws6b.cell(1, c, h)
style_header(ws6b, 5)

wiz = [
    ["1", "Supplier Source", "Choose/link supplier for this package.", "Package step form; suppliers API", "Step 2"],
    ["2", "Package Basics", "Title, destination, duration, core fields.", "Basics form → create/update package", "Step 3"],
    ["3", "Media & Front-End", "Upload images / front-end media.", "/api/media + package media fields", "Step 4"],
    ["4", "Pricing", "Set prices / pricing structure.", "PricingForm + pricing rules", "Step 5"],
    [
        "5",
        "Itinerary",
        "Build day-by-day itinerary (activities, notes).",
        "ItineraryForm → saved as package itinerary JSON",
        "Step 6",
    ],
    ["6", "Hotels", "Add hotel stays for the package.", "Hotels form on package", "Step 7"],
    ["7", "Inclusions", "Inclusions / exclusions.", "Inclusions form", "Step 8"],
    [
        "8",
        "Booking Policy",
        "Cancellation, booking terms (NOT a bookings module).",
        "Booking policy form",
        "Step 9",
    ],
    ["9", "Consultant View", "Internal consultant-facing details.", "Consultant form", "Step 10"],
    ["10", "Supplier Quote Tool", "Configure supplier quote tool settings.", "Quote tool form", "Step 11"],
    ["11", "Front-End FAQs", "Add FAQs shown on public package page.", "FAQs form", "Step 12"],
    ["12", "Sales & Ads Assets", "Sales/marketing assets.", "Assets form", "Step 13"],
    ["13", "SEO", "Meta title, description, slugs, SEO fields.", "SEO form", "Step 14"],
    [
        "14",
        "Review & Publish",
        "Review all steps → Save draft / Submit / Publish.",
        "ReviewPublishForm → status published or pending_review",
        "Back to Packages lists",
    ],
]
write_rows(ws6b, wiz)
autosize(ws6b, [10, 24, 55, 45, 18])
for i in range(2, 16):
    ws6b.cell(i, 1).fill = step_fill
    if i == 6:  # itinerary highlight
        for c in range(1, 6):
            ws6b.cell(i, c).fill = orange_fill

ws6b["A18"] = (
    "Tips: Use ?step= to jump; Save draft anytime; steps gated by role permissions; "
    "duplicatePackage available; apply template via ?templateId="
)
ws6b["A18"].font = Font(italic=True, color="1F4E79")
ws6b.merge_cells("A18:E18")

# ===================== SHEET 7: Suppliers =====================
ws7 = wb.create_sheet("07 Suppliers")
for c, h in enumerate(["Step", "Action", "Where", "API", "Next"], 1):
    ws7.cell(1, c, h)
style_header(ws7, 5)

sup_rows = [
    ["1", "Open Suppliers", "Sidebar → Suppliers", "/suppliers", "See SuppliersPanel + stats."],
    [
        "2",
        "View list / stats",
        "Browse suppliers, countries, contacts.",
        "GET /api/suppliers + stats + countries",
        "Find supplier to edit or add new.",
    ],
    [
        "3",
        "Create supplier",
        "Add supplier: name, contacts, countries, notes.",
        "POST /api/suppliers",
        "Supplier available in package Step 1.",
    ],
    [
        "4",
        "Edit / update",
        "Open supplier → update details.",
        "PATCH /api/suppliers/:id",
        "Changes used in packages/quotes.",
    ],
    ["5", "Delete (if allowed)", "Remove unused supplier.", "DELETE /api/suppliers/:id", "Gone from list."],
    [
        "6",
        "Use in packages",
        "When adding a package, pick this supplier at Step 1.",
        "/add-package (Supplier Source)",
        "Package linked to supplier.",
    ],
]
write_rows(ws7, sup_rows)
autosize(ws7, [8, 24, 45, 40, 40])
for i in range(2, 8):
    ws7.cell(i, 1).fill = step_fill

# ===================== SHEET 8: Promotions =====================
ws8 = wb.create_sheet("08 Promotions")
for c, h in enumerate(["Step", "Action", "Where", "Data source", "Note"], 1):
    ws8.cell(1, c, h)
style_header(ws8, 5)

promo_rows = [
    ["1", "Open Promotions", "Sidebar → Promotions", "/promotions → PromotionsPanel", "List + form UI."],
    [
        "2",
        "View sample list",
        "See existing promotions (sample).",
        "SAMPLE_PROMOTIONS (in-memory)",
        "NOT connected to real API yet.",
    ],
    [
        "3",
        "Create / edit / toggle",
        "Add promotion, select packages, toggle active.",
        "Client-side state only",
        "Changes lost on refresh until API is built.",
    ],
    [
        "4",
        "Delete",
        "Remove a promotion from the UI list.",
        "Local state",
        "Same limitation — UI demo only.",
    ],
]
write_rows(ws8, promo_rows)
autosize(ws8, [8, 28, 45, 40, 45])
for i in range(2, 6):
    ws8.cell(i, 1).fill = step_fill
ws8["A7"] = (
    "IMPORTANT: Promotions module is UI-only with sample data. No /api/promotions backend yet."
)
ws8["A7"].font = Font(bold=True, color="C00000")
ws8.merge_cells("A7:E7")

# ===================== SHEET 9: Enquiry =====================
ws9 = wb.create_sheet("09 Enquiry")
for c, h in enumerate(["Step", "Action", "Where", "API", "Outcome"], 1):
    ws9.cell(1, c, h)
style_header(ws9, 5)

enq_rows = [
    [
        "1",
        "Open Enquiry",
        "Sidebar → Enquiry (or Header notification)",
        "/enquiry",
        "EnquiryManagementPanel opens.",
    ],
    [
        "2",
        "Review stats",
        "See open / closed / total lead counts.",
        "GET /api/enquiries/stats",
        "Know workload.",
    ],
    [
        "3",
        "Browse leads",
        "Open enquiry list; read customer messages.",
        "GET /api/enquiries",
        "Pick a lead to process.",
    ],
    [
        "4",
        "Update status",
        "Change enquiry status (e.g. open → in progress → closed).",
        "PATCH status via /api/enquiries",
        "Lead tracked; Header open-count updates.",
    ],
    [
        "5",
        "Delete if needed",
        "Remove spam / invalid enquiry.",
        "DELETE /api/enquiries/:id",
        "Removed from list.",
    ],
    [
        "6",
        "Follow up offline",
        "Contact customer outside admin (email/phone).",
        "No booking module in admin",
        "Sales happens outside this panel.",
    ],
]
write_rows(ws9, enq_rows)
autosize(ws9, [8, 24, 50, 35, 45])
for i in range(2, 8):
    ws9.cell(i, 1).fill = step_fill

# ===================== SHEET 10: Journeys =====================
ws10 = wb.create_sheet("10 Common Journeys")
for c, h in enumerate(["Journey", "Step-by-step path", "Start", "End"], 1):
    ws10.cell(1, c, h)
style_header(ws10, 4)

journeys = [
    [
        "Publish a package",
        "Login → Dashboard → Add Package → Steps 1–14 (incl. Itinerary) → Review & Publish → Packages list shows published/pending",
        "Dashboard or /packages",
        "Published / pending_review package",
    ],
    [
        "Write a blog",
        "Login → Blogs → Write New → fill & save → appear under Drafts/Scheduled/Published → Edit anytime",
        "/blogs/new",
        "Live or draft blog post",
    ],
    [
        "Create CMS page",
        "Login → Pages → Create → Edit content/SEO → Publish → /pages/published",
        "/pages/new",
        "Published CMS page",
    ],
    [
        "Handle a lead",
        "Header notification or Enquiry → open lead → update status → follow up offline",
        "/enquiry",
        "Enquiry closed / processed",
    ],
    [
        "Set up access",
        "Super admin → Access Control (permissions matrix) → User Management (create users) → users login with limited menu",
        "/settings/roles",
        "Role-based sidebar",
    ],
    [
        "Add supplier then package",
        "Suppliers → Create supplier → Packages → Add Package → Step 1 select supplier → complete wizard",
        "/suppliers",
        "Package linked to supplier",
    ],
]
write_rows(ws10, journeys)
autosize(ws10, [24, 95, 24, 30])
for i in range(2, 8):
    ws10.cell(i, 1).fill = green_fill
    ws10.cell(i, 1).font = Font(bold=True)
    ws10.row_dimensions[i].height = 55

# ===================== SHEET 11: Notes =====================
ws11 = wb.create_sheet("11 Notes")
ws11["A1"] = "Important notes"
ws11["A1"].font = title_font
notes = [
    ["Topic", "Detail"],
    [
        "No Bookings module",
        "There is no reservations/bookings admin. 'Booking Policy' is only wizard step 8 on packages.",
    ],
    [
        "Destinations",
        "Shown as a dashboard metric / link into packages — not a top-level sidebar module.",
    ],
    [
        "Promotions",
        "UI demo with SAMPLE_PROMOTIONS only — not persisted to database.",
    ],
    [
        "Auth pages",
        "/login and /signup are outside AdminShell; everything else uses Sidebar + Header.",
    ],
    [
        "Permissions",
        "If a menu item is missing, your role likely lacks view permission for that module.",
    ],
    [
        "API base",
        "Browser calls NEXT_PUBLIC_API_URL (Fastify). There are no Next.js /api routes for these features.",
    ],
]
for r, row in enumerate(notes, 2):
    for c, v in enumerate(row, 1):
        cell = ws11.cell(r, c, v)
        cell.alignment = wrap
        cell.border = thin
        if r == 2:
            cell.fill = header_fill
            cell.font = header_font
        elif c == 1:
            cell.fill = section_fill
            cell.font = section_font
    ws11.row_dimensions[r].height = 40
autosize(ws11, [22, 100])

out = r"c:\Users\Dell\Desktop\ftadmin\Admin_Panel_How_It_Works.xlsx"
wb.save(out)
print("Saved:", out)
