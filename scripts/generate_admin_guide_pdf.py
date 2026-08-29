from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib.colors import HexColor
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem, PageBreak

OUT = r"c:\Users\Dell\Desktop\ftadmin\Admin_Panel_Simple_Guide.pdf"

doc = SimpleDocTemplate(
    OUT,
    pagesize=A4,
    leftMargin=0.65 * inch,
    rightMargin=0.65 * inch,
    topMargin=0.55 * inch,
    bottomMargin=0.55 * inch,
)

styles = getSampleStyleSheet()
title = ParagraphStyle(
    "TitleMain", parent=styles["Heading1"], fontSize=17, textColor=HexColor("#1F4E79"), spaceAfter=4
)
subtitle = ParagraphStyle(
    "Sub", parent=styles["Normal"], fontSize=10, textColor=HexColor("#555555"), spaceAfter=12
)
h2 = ParagraphStyle(
    "H2",
    parent=styles["Heading2"],
    fontSize=13,
    textColor=HexColor("#1F4E79"),
    spaceBefore=12,
    spaceAfter=4,
)
h3 = ParagraphStyle(
    "H3",
    parent=styles["Heading3"],
    fontSize=11,
    textColor=HexColor("#2E75B6"),
    spaceBefore=8,
    spaceAfter=3,
)
body = ParagraphStyle("Body", parent=styles["Normal"], fontSize=10, leading=13, spaceAfter=3)
bullet_style = ParagraphStyle("Bullet", parent=styles["Normal"], fontSize=10, leading=13)
small = ParagraphStyle(
    "Small", parent=styles["Normal"], fontSize=9, leading=12, textColor=HexColor("#444444")
)


def bullets(items, style=bullet_style):
    return ListFlowable(
        [
            ListItem(Paragraph(i, style), leftIndent=6, bulletColor=HexColor("#1F4E79"))
            for i in items
        ],
        bulletType="bullet",
        start="•",
        leftIndent=14,
        spaceBefore=1,
        spaceAfter=4,
    )


story = []

story.append(Paragraph("Fayyaz Travels Admin Panel — Simple Guide", title))
story.append(Paragraph("Point-wise • Sidebar menu explained • Add Package 14 steps", subtitle))

# -------- Intro --------
story.append(Paragraph("Quick start", h2))
story.append(
    bullets(
        [
            "Login with email and password.",
            "You land on Dashboard (home).",
            "Use left sidebar to open each module.",
            "Top bar has search, enquiry alerts, and logout.",
        ]
    )
)

story.append(Paragraph("Dashboard", h2))
story.append(
    bullets(
        [
            "Shows stats (packages, blogs, pages, users, enquiries).",
            "Shows chart and recent activity.",
            "Quick Actions take you to Add Package, Blogs, etc.",
            "View only — use sidebar to create or edit content.",
        ]
    )
)

# -------- Blogs --------
story.append(Paragraph("Blogs Management", h2))
story.append(Paragraph("Same as sidebar:", body))
story.append(
    bullets(
        [
            "<b>All Posts</b> — see every blog in one list.",
            "<b>Write New Blog</b> — create a new blog (title, content, image, category).",
            "<b>Drafts</b> — blogs not published yet.",
            "<b>Pending Review</b> — waiting for approval.",
            "<b>Scheduled</b> — set to publish later automatically.",
            "<b>Published</b> — live on the website.",
            "<b>Blog Categories</b> — add/edit categories used on blogs.",
        ]
    )
)
story.append(Paragraph("How it works:", body))
story.append(
    bullets(
        [
            "Write New Blog → fill details → save as draft / schedule / publish.",
            "Open any post from a list to edit.",
            "Change status anytime (draft ↔ published).",
        ]
    )
)

# -------- Pages --------
story.append(Paragraph("Page Management", h2))
story.append(Paragraph("Same as sidebar:", body))
story.append(
    bullets(
        [
            "<b>All Pages</b> — all CMS pages in one list.",
            "<b>Create Page</b> — make a new website page (About, Contact, etc.).",
            "<b>Drafts</b> — pages not live yet.",
            "<b>Published</b> — pages live on the website.",
        ]
    )
)
story.append(Paragraph("How it works:", body))
story.append(
    bullets(
        [
            "Create Page → add content + SEO → save.",
            "Edit from the list anytime.",
            "Publish when ready; it shows on the public site.",
        ]
    )
)

# -------- Packages --------
story.append(Paragraph("Packages", h2))
story.append(Paragraph("Same as sidebar:", body))
story.append(
    bullets(
        [
            "<b>Package Dashboard</b> — package overview and stats.",
            "<b>All Packages</b> — full package list.",
            "<b>Draft Packages</b> — unfinished packages.",
            "<b>Pending Reviews</b> — waiting for approval.",
            "<b>Expiring Rates</b> — packages whose rates expire soon.",
            "<b>Add Package</b> — open the 14-step package wizard (see next section).",
            "<b>Supplier Quote Requests</b> — packages used for supplier quotes.",
            "<b>Package Categories</b> — categories for packages (under Settings).",
            "<b>Pricing Rules</b> — pricing rules used in packages (under Settings).",
        ]
    )
)
story.append(Paragraph("How it works:", body))
story.append(
    bullets(
        [
            "Click <b>Add Package</b> to create a new tour package.",
            "Or open a package from any list to edit (same 14 steps).",
            "From the list you can edit, preview, or delete.",
        ]
    )
)

story.append(PageBreak())

# -------- 14 steps --------
story.append(Paragraph("Add Package (14 steps) — how each step works", title))
story.append(
    Paragraph(
        "Open sidebar → Packages → Add Package. Fill each step, click <b>Save & continue</b>. You can save draft anytime.",
        body,
    )
)

story.append(Paragraph("1. Supplier Source — choose supplier", h3))
story.append(
    bullets(
        [
            "Select or enter the supplier for this package.",
            "Fill: supplier name, package name, country, contact person.",
            "Add emails, WhatsApp, and upload quotation / brochure / rate sheet.",
            "Add internal supplier notes if needed.",
            "Save & continue → package is created (if new) → go to step 2.",
        ],
        small,
    )
)

story.append(Paragraph("2. Package Basics — name, destination, duration", h3))
story.append(
    bullets(
        [
            "Enter front-end package title (customer-facing name).",
            "Slug is created from the title (URL name).",
            "Add short intro and Package Overview.",
            "Set tour type, countries, cities, start/end point.",
            "Set days / nights, categories, landing pages.",
            "Add Important Info and Frontend Notes.",
            "Save & continue → go to step 3.",
        ],
        small,
    )
)

story.append(Paragraph("3. Media & Front-End — photos / images", h3))
story.append(
    bullets(
        [
            "Upload desktop hero, mobile hero, and package card images.",
            "Add alt text for images.",
            "Upload Package Highlights images.",
            "Optional: video link.",
            "Set price display type and primary / secondary CTA buttons.",
            "Add WhatsApp number and “Why choose this package”.",
            "Save & continue → go to step 4.",
        ],
        small,
    )
)

story.append(Paragraph("4. Pricing — package price", h3))
story.append(
    bullets(
        [
            "Choose pricing type: General Package or Fixed Departure.",
            "Add prices per hotel category.",
            "Set adult price tiers (net / markup / selling).",
            "Set child pricing if needed.",
            "Add blackout dates and promotions.",
            "Save & continue → go to step 5.",
        ],
        small,
    )
)

story.append(Paragraph("5. Itinerary — day-by-day plan", h3))
story.append(
    bullets(
        [
            "One tab for each day (based on days set in Package Basics).",
            "Per day: title, description, activities, highlights.",
            "Mark meals (Breakfast / Lunch / Dinner).",
            "Add internal notes (consultant, mobility, dietary, supplier).",
            "Save & continue → go to step 6.",
        ],
        small,
    )
)

story.append(Paragraph("6. Hotels — hotel details", h3))
story.append(
    bullets(
        [
            "Add one or more hotels.",
            "Fill: hotel name, city, star rating, room type, nights.",
            "Add child policy, max occupancy, address, Google Maps link.",
            "Choose if hotel shows on front-end; add internal notes.",
            "Save & continue → go to step 7.",
        ],
        small,
    )
)

story.append(Paragraph("7. Inclusions — what is included / excluded", h3))
story.append(
    bullets(
        [
            "Turn on transport options (flights / train / transfers) if included.",
            "Add Included list, Excluded list, and Optional add-ons.",
            "Add local fees, taxes, and non-refundable items.",
            "Save & continue → go to step 8.",
        ],
        small,
    )
)

story.append(Paragraph("8. Booking Policy — terms and rules", h3))
story.append(
    bullets(
        [
            "Set payment mode, deposit, and when balance is due.",
            "Set confirmation rule.",
            "Add cancellation charges (From / To / Client charge).",
            "Add amendment policy and exception rules.",
            "Mark refundable vs non-refundable parts.",
            "Save & continue → go to step 9.",
        ],
        small,
    )
)

story.append(Paragraph("9. Consultant View — internal notes", h3))
story.append(
    bullets(
        [
            "Internal only — customers do not see this.",
            "Write how to sell, best client type, common objections.",
            "Add suggested replies, upsells, and do-not-promise notes.",
            "Add visa/passport, dietary, risks, and follow-up tips.",
            "Save & continue → go to step 10.",
        ],
        small,
    )
)

story.append(Paragraph("10. Supplier Quote Tool — quote settings", h3))
story.append(
    bullets(
        [
            "Prepare a quote request to the supplier.",
            "Set travel dates, pax, hotel/rooming/meals, deadline.",
            "Add changes and negotiation notes.",
            "Choose email recipients, subject, and body.",
            "You can save the quote draft and/or send the email.",
            "Save & continue → go to step 11.",
        ],
        small,
    )
)

story.append(Paragraph("11. Front-End FAQs — questions for customers", h3))
story.append(
    bullets(
        [
            "Add FAQs that show on the public package page.",
            "Each FAQ: question + answer + visibility on/off.",
            "Add or remove FAQ rows as needed.",
            "Save & continue → go to step 12.",
        ],
        small,
    )
)

story.append(Paragraph("12. Sales & Ads Assets — marketing files", h3))
story.append(
    bullets(
        [
            "Create sales and ad content for marketing/sales team.",
            "Add Google ad headlines, social captions, share message.",
            "Add campaign WhatsApp link.",
            "Generate sales card preview from hero image, title, price, CTA.",
            "Save & continue → go to step 13.",
        ],
        small,
    )
)

story.append(Paragraph("13. SEO — Google title and description", h3))
story.append(
    bullets(
        [
            "Set meta title and meta description for Google.",
            "Add focus keyword and secondary keywords.",
            "Link related packages and internal links.",
            "Set index status and SEO status.",
            "Save & continue → go to step 14.",
        ],
        small,
    )
)

story.append(Paragraph("14. Review & Publish — final check and go live", h3))
story.append(
    bullets(
        [
            "See which sections are complete (health check).",
            "Assign reviewers if needed (Product / SEO / Ops / Final approver).",
            "Add final review notes.",
            "<b>Save & continue</b> — save review data only.",
            "<b>Submit for review</b> — status becomes Pending Review.",
            "<b>Publish</b> — package goes live on the website.",
            "Use Preview before publishing.",
        ],
        small,
    )
)

story.append(Spacer(1, 8))
story.append(
    Paragraph(
        "Tip: You do not need to finish all 14 steps in one go — save draft and return later. "
        "Edit any package anytime from the Packages list.",
        body,
    )
)

# -------- Suppliers / Promotions / Enquiry --------
story.append(Paragraph("8. Suppliers", h2))
story.append(
    bullets(
        [
            "Add and manage travel suppliers.",
            "Save contact details and countries.",
            "Use these suppliers when creating a package (Step 1).",
        ]
    )
)

story.append(Paragraph("9. Promotions", h2))
story.append(
    bullets(
        [
            "Screen to create offers / promotions.",
            "Currently demo only (sample data, not fully saved to server yet).",
        ]
    )
)

story.append(Paragraph("10. Enquiry", h2))
story.append(
    bullets(
        [
            "See customer enquiries / leads.",
            "Open a lead and read the message.",
            "Update status (open → in progress → closed).",
            "Follow up with the customer by phone or email.",
            "New open enquiries also show in the top header.",
        ]
    )
)

story.append(Paragraph("Common simple flows", h2))
story.append(
    bullets(
        [
            "Publish package: Dashboard → Add Package → complete 14 steps → Publish.",
            "Write blog: Blogs → Write New → Save / Publish.",
            "Create page: Pages → Create → Publish.",
            "Handle lead: Enquiry → open → update status → call/email customer.",
            "Add user: Settings → User Management → Add User (super admin).",
        ]
    )
)

story.append(Paragraph("Simple notes", h2))
story.append(
    bullets(
        [
            "If a menu item is missing, your role may not have permission.",
            "There is no separate Bookings module in this admin.",
            "Logout from the user menu at the top right.",
        ]
    )
)

doc.build(story)
print("Saved:", OUT)
