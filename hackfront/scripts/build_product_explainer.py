"""Build the shareable Loss Finder product explainer PDF."""
from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import (
    BaseDocTemplate, Frame, KeepTogether, PageBreak, PageTemplate,
    Paragraph, Spacer, Table, TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "loss_finder_product_explainer.pdf"
OUT.parent.mkdir(parents=True, exist_ok=True)

pdfmetrics.registerFont(TTFont("ArialLF", r"C:\Windows\Fonts\arial.ttf"))
pdfmetrics.registerFont(TTFont("ArialLFBold", r"C:\Windows\Fonts\arialbd.ttf"))
NAVY = colors.HexColor("#10233F")
BLUE = colors.HexColor("#2463D8")
INK = colors.HexColor("#203049")
MUTED = colors.HexColor("#56677D")
LINE = colors.HexColor("#DCE5F1")
PALE = colors.HexColor("#F2F6FC")
GREEN = colors.HexColor("#087E68")

styles = {
    "eyebrow": ParagraphStyle("eyebrow", fontName="ArialLFBold", fontSize=8.2, leading=12, textColor=BLUE, spaceAfter=7),
    "title": ParagraphStyle("title", fontName="ArialLFBold", fontSize=31, leading=34, textColor=NAVY, spaceAfter=10),
    "subtitle": ParagraphStyle("subtitle", fontName="ArialLF", fontSize=12.3, leading=18, textColor=MUTED, spaceAfter=16),
    "h1": ParagraphStyle("h1", fontName="ArialLFBold", fontSize=19.5, leading=24, textColor=NAVY, spaceAfter=9),
    "h2": ParagraphStyle("h2", fontName="ArialLFBold", fontSize=11.4, leading=15, textColor=NAVY, spaceBefore=12, spaceAfter=6),
    "body": ParagraphStyle("body", fontName="ArialLF", fontSize=9.2, leading=13.6, textColor=INK, spaceAfter=7),
    "small": ParagraphStyle("small", fontName="ArialLF", fontSize=8.1, leading=11.4, textColor=INK, spaceAfter=4),
    "muted": ParagraphStyle("muted", fontName="ArialLF", fontSize=8.2, leading=11.6, textColor=MUTED, spaceAfter=5),
    "label": ParagraphStyle("label", fontName="ArialLFBold", fontSize=8.6, leading=12, textColor=NAVY, spaceAfter=3),
    "white": ParagraphStyle("white", fontName="ArialLFBold", fontSize=10.2, leading=15, textColor=colors.white),
    "white_small": ParagraphStyle("white_small", fontName="ArialLF", fontSize=8.4, leading=12.5, textColor=colors.white),
    "source": ParagraphStyle("source", fontName="ArialLF", fontSize=7.8, leading=11, textColor=MUTED, spaceAfter=5),
}

def p(text, kind="body"):
    return Paragraph(text, styles[kind])

def section(number, title):
    return [p(f"{number}  {title}", "h1"), Spacer(1, 2)]

def card(title, body, bg=PALE, border=LINE):
    content = [p(title, "label"), p(body, "small")]
    table = Table([[content]], colWidths=[499])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), bg),
        ("BOX", (0, 0), (-1, -1), 0.6, border),
        ("LEFTPADDING", (0, 0), (-1, -1), 11),
        ("RIGHTPADDING", (0, 0), (-1, -1), 11),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    return table

def two_col(left, right, widths=(242, 242)):
    t = Table([[left, right]], colWidths=list(widths), hAlign="LEFT")
    t.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BACKGROUND", (0, 0), (-1, -1), PALE),
        ("BOX", (0, 0), (-1, -1), 0.6, LINE),
        ("INNERGRID", (0, 0), (-1, -1), 0.6, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ("RIGHTPADDING", (0, 0), (-1, -1), 10),
        ("TOPPADDING", (0, 0), (-1, -1), 9),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
    ]))
    return t

def header_footer(canvas, doc):
    canvas.saveState()
    w, h = A4
    canvas.setFillColor(NAVY)
    canvas.rect(0, h - 8, w, 8, fill=1, stroke=0)
    canvas.setFont("ArialLFBold", 8)
    canvas.setFillColor(NAVY)
    canvas.drawString(48, 30, "LOSS FINDER  /  PRODUCT EXPLAINER")
    canvas.setFont("ArialLF", 8)
    canvas.setFillColor(MUTED)
    canvas.drawRightString(w - 48, 30, f"22 Nov 2026   |   {doc.page}")
    canvas.setStrokeColor(LINE)
    canvas.line(48, 43, w - 48, 43)
    canvas.restoreState()

doc = BaseDocTemplate(str(OUT), pagesize=A4, leftMargin=48, rightMargin=48,
                      topMargin=50, bottomMargin=57, title="Loss Finder | Product Explainer",
                      author="Loss Finder")
frame = Frame(48, 57, A4[0] - 96, A4[1] - 107, leftPadding=0, rightPadding=0,
              topPadding=0, bottomPadding=0)
doc.addPageTemplates(PageTemplate(id="main", frames=frame, onPage=header_footer))
story = []

# 1 - The product and the problem
story += [p("THE PRODUCT IN PLAIN LANGUAGE", "eyebrow"), p("LOSS FINDER", "title"),
          p("Know which recurring payments are leaving your account, why they changed, and what to review next.", "subtitle")]
hero = Table([[[p("One-sentence pitch", "white"),
                p("Loss Finder turns bank-statement CSVs into a clear, evidence-backed subscription watchlist and helps people decide what to keep, revisit or consider cancelling.", "white_small")]]], colWidths=[499])
hero.setStyle(TableStyle([("BACKGROUND", (0,0),(-1,-1), NAVY), ("LEFTPADDING",(0,0),(-1,-1),15),
                          ("RIGHTPADDING",(0,0),(-1,-1),15), ("TOPPADDING",(0,0),(-1,-1),13),
                          ("BOTTOMPADDING",(0,0),(-1,-1),11)]))
story += [hero, Spacer(1, 13)]
story += section("01", "The problems and the specific solutions")
problems = [
    ("Unreadable bank narrations", "Map statement strings such as CARD/RECUR/... to a recognizable merchant and category; keep the original transaction as evidence."),
    ("Payments scattered across statements", "Accept several supported bank CSVs in one analysis, normalize rows and remove matching duplicates within that analysis."),
    ("Quiet price and trial changes", "Compare repeated charges over time; flag likely price hikes and trial-to-paid transitions and project the yearly cost."),
    ("Awareness without a next step", "Let signed-in users save Keep, Review later or Consider cancelling; show estimated renewals and cancellation guidance."),
]
for title, body in problems:
    story += [card(title, body), Spacer(1, 6)]
story += [p("Why this matters", "h2"),
          p("Recurring billing is easy to start and easy to overlook. Research on card-network transactions finds that active renewal events increase cancellation, consistent with consumer inattention or switching friction [1]. Loss Finder makes the payment history visible so the user can make the decision."),
          p("Important boundary: the app identifies likely subscriptions and offers guides. It does not log in to a bank, stop a mandate, cancel a merchant account or guarantee that a payment will recur.", "muted")]
story.append(PageBreak())

# 2 - Method and user journey
story += [p("HOW IT WORKS", "eyebrow")]
story += section("02", "From statement to action")
steps = [
    ("1. Import", "A guest or signed-in user chooses one or more CSV statements. The form checks file type, size and recognizable headings; an optional usage-log CSV is experimental."),
    ("2. Read and normalize", "The browser parses dates, descriptions and debit amounts across supported bank formats. Known merchant patterns turn raw narrations into readable names and categories."),
    ("3. Find recurring patterns", "Rules group charges by merchant and look for monthly, quarterly or yearly spacing. Duplicate references and near-duplicate charges are handled before projection."),
    ("4. Explain the signal", "The app shows detected subscriptions, transaction evidence, payment history, possible price hikes, trial changes and estimated annual spend."),
    ("5. Choose an action", "A signed-in user saves a review choice for each detected subscription. The Review Centre displays upcoming dates inferred from recent charges; the Saved Decisions page groups the choices."),
    ("6. Revisit later", "A signed-in user can open a previous analysis or upload a new statement. Each upload remains a separate analysis rather than being silently mixed with older results."),
]
for title, body in steps:
    story += [card(title, body), Spacer(1, 6)]
story += [p("The detection method", "h2"),
          p("The MVP uses deterministic rules and a merchant pattern catalogue, not an AI model. Repeated dates establish cadence; charge amounts support price-change and trial flags. Every finding should be treated as a lead for user review, especially when a statement is incomplete or a merchant name is unfamiliar."),
          p("A simple example", "h2"),
          two_col([p("Raw statement", "label"), p("UPI/AUTOPAY/SPOTIFY_INDIA", "small"), p("119.00 debit each month", "muted")],
                  [p("Loss Finder view", "label"), p("Spotify Premium - Music", "small"), p("Recurring monthly payment; INR 1,428 projected per year, with the matching charges visible.", "muted")])]
story.append(PageBreak())

# 3 - Implementation and truth boundary
story += [p("THE BUILD", "eyebrow")]
story += section("03", "Technology and data flow")
story += [p("Guest: CSV -> React browser analysis -> on-screen results. Signed in: CSV -> normalized transactions -> Express API -> Neo4j import snapshot -> review decisions and analysis history."), Spacer(1, 7)]
stack = [
    ["Layer", "What the project uses", "Why it is here"],
    ["Interface", "React 19, Vite 6, Tailwind CSS", "Upload, charts, review and responsive pages"],
    ["Analysis", "JavaScript parsing and rule-based detection", "Explainable merchant, cadence and cost signals"],
    ["API", "Node.js, Express", "Authenticated imports and account routes"],
    ["Data", "Neo4j Aura via neo4j-driver", "User, import, transaction, merchant and subscription links"],
    ["Protection", "bcryptjs, JWT cookie, Helmet, CORS, rate limits, Zod", "Password handling and API input safeguards"],
    ["Hosting pattern", "Vercel frontend, Render API, Neo4j Aura", "Separate static UI, server and persistent database"],
]
tab = Table([[p(x, "label" if i == 0 else "small") for x in row] for i, row in enumerate(stack)],
            colWidths=[80, 200, 219], repeatRows=1)
tab.setStyle(TableStyle([
    ("BACKGROUND", (0,0),(-1,0), colors.HexColor("#E4EDFC")),
    ("ROWBACKGROUNDS", (0,1),(-1,-1), [colors.white, PALE]),
    ("GRID", (0,0),(-1,-1), .45, LINE),
    ("VALIGN", (0,0),(-1,-1), "TOP"),
    ("LEFTPADDING", (0,0),(-1,-1), 8), ("RIGHTPADDING", (0,0),(-1,-1), 8),
    ("TOPPADDING", (0,0),(-1,-1), 7), ("BOTTOMPADDING", (0,0),(-1,-1), 5),
]))
story += [tab, Spacer(1, 13), p("Why Neo4j?", "h2"),
          p("The graph connects a user to import batches, transactions, merchants and detected subscriptions. This makes it possible to open an earlier analysis, trace a finding back to its charges and preserve review choices for that analysis. The product benefit is the traceable relationship, not the graph database name itself."),
          p("Privacy and honest limits", "h2"),
          card("Current protections", "Guest analysis stays in browser memory. Signed-in API routes require authentication; account data is scoped by user. The backend also has security headers, origin checks, rate limits and validation. Users can request account deletion."),
          Spacer(1, 6),
          card("What still needs validation", "Real-bank CSV coverage, false-positive rates, production deployment behavior and security review need testing. Renewal dates are estimates shown in the app, not sent as email or push alerts. A usage-log signal is experimental. Merchant cancellation and bank-mandate control are outside the MVP."),
          Spacer(1, 9),
          p("The distinction to explain", "h2"),
          p("A dashboard tells people what happened. Loss Finder adds a review loop: trace the payment, decide what to do, and return to earlier saved analyses after a later upload. It remains user-controlled because the app does not take financial action on anyone's behalf.")]
story.append(PageBreak())

# 4 - Market
story += [p("WHO NEEDS IT", "eyebrow")]
story += section("04", "Market, users and positioning")
story += [p("Starting market: digitally active people in India who use several paid services and can export bank CSVs. The same pain exists internationally, but bank formats, currencies, payment rails and privacy rules would need local adaptation before a global launch."), Spacer(1, 5)]
segments = [
    ("Primary - young salaried professionals", "Multiple entertainment, productivity and cloud subscriptions across accounts. Main jobs: uncover recurring debits and review price changes or forgotten plans."),
    ("Students and young adults", "A limited budget makes small recurring charges meaningful. Main jobs: see total monthly or annual burden and decide which services still justify the cost."),
    ("Freelancers and independent professionals", "Paid software, hosting and creative tools can accumulate while income varies. Main jobs: see work-tool spend and review overlapping or unused services."),
]
for title, body in segments:
    story += [card(title, body), Spacer(1, 7)]
story += [p("Evidence that the problem is worth testing", "h2"),
          p("NPCI reports 25,466.70 million UPI transactions in October 2026 [2]. This shows the scale of digital-payment activity in the starting market; it is <b>not</b> a count of subscriptions or potential Loss Finder customers."),
          p("In a 2024 sweep of 642 selected subscription sites and apps, ICPEN found nearly 76% used at least one possible dark pattern [3]. This is evidence of a consumer-choice problem in the sampled services, not a prevalence estimate for all services or for India."),
          p("Positioning", "h2"),
          p("A bank app shows transactions. A subscription provider shows only its own service. Loss Finder aims to combine statement evidence across providers, translate confusing labels and keep the user's review choices in one place. This advantage must be tested against how people already track payments."),
          p("Do not present a guessed market size", "h2"),
          p("A defensible market estimate needs evidence for reachable CSV-exporting users, number of paid recurring services per user, upload willingness, repeat usage and willingness to pay. Digital-payment volume alone cannot supply a TAM. Start with interviews and observed product behavior."),
          p("Three validation measures", "h2"),
          p("1. Detection quality: how many user-verified subscriptions are correctly identified?  2. Activation: what share of first-time users completes a statement analysis and reviews a result?  3. Return value: after a later statement, do users revisit saved decisions or act on a flagged change?"),
          p("Go-to-market hypothesis", "h2"),
          p("Use a free guest demo to earn trust, then invite users who want saved history and decisions to create an account. Test whether returning users value a paid tier only after the core import and review experience is reliable. Pricing and willingness to pay remain unvalidated.")]
story.append(PageBreak())

# 5 - How to explain and sources
story += [p("TELL THE STORY", "eyebrow")]
story += section("05", "A 60-second explanation")
story += [card("Say this", "People often cannot tell which services are charging them, especially when bank statements use cryptic transaction labels. Loss Finder lets them upload bank CSVs, turns those rows into readable recurring-payment insights and shows the charges behind each finding. It highlights possible price hikes and trial conversions, estimates annual cost, and lets signed-in users save what to keep or review. Our starting users are Indian professionals, students and freelancers. We use React, an Express API and Neo4j to keep each person's analyses and decisions connected. The app informs decisions; it does not access bank accounts or cancel payments."),
          Spacer(1, 12), p("Questions you are likely to hear", "h2"),
          p("<b>Why upload a statement?</b> It uses records the user already has, without requesting banking credentials. New information requires a new upload."),
          p("<b>Are reminders automatic?</b> Today they are estimated dates inside the Review Centre. There is no delivered email, SMS or push reminder."),
          p("<b>Does it save money automatically?</b> No. It exposes possible savings and gives the user evidence and choices; only the user can verify or cancel a service."),
          p("<b>Why might it get a result wrong?</b> Bank formats vary, statements can be incomplete, and two payments to a merchant do not always imply a subscription. The result is a review prompt."),
          p("Research and market reading", "h2")]
readings = [
    ("[1] Einav, Klopack & Mahoney, Selling Subscriptions (American Economic Review, 2025).", "Why subscriptions persist when consumers must actively renew; use this to frame the core behavior.", "https://www.aeaweb.org/articles?id=10.1257/aer.20231612"),
    ("[2] NPCI, UPI Product Statistics, FY 2026-27.", "Official India payment-volume context; do not treat the volume as subscription-market size.", "https://www.npci.org.in/product/upi/product-statistics?financialYear=2026-27"),
    ("[3] FTC/ICPEN, 2024 Subscription Services Dark Patterns Sweep.", "Concrete evidence about the design barriers users may face when reviewing or cancelling plans.", "https://search.ftc.gov/news-events/news/press-releases/2024/07/ftc-icpen-gpen-announce-results-review-use-dark-patterns-affecting-subscription-services-privacy"),
    ("[4] Sheil et al., Staying at the Roach Motel (CHI 2024).", "Research on difficult cancellation journeys; useful when designing honest cancellation guides.", "https://arxiv.org/abs/2309.17145"),
    ("[5] World Bank, Global Findex Database 2025.", "Compare digital-account and payment adoption across countries and age or income groups.", "https://www.worldbank.org/en/publication/globalfindex/report"),
    ("[6] Yeh et al., Merchant Category Identification Using Credit Card Transactions (2020).", "Technical reading on merchant categorization; its learning approach is research, not a feature in this MVP.", "https://arxiv.org/abs/2011.02602"),
]
for title, why, url in readings:
    story += [p(f'<link href="{escape(url)}" color="#2463D8"><u>{escape(title)}</u></link>', "source"),
              p(why, "source")]
story += [Spacer(1, 5), p("Source notes: external market figures are dated to the cited publication or reporting period. Product claims were checked against the local project source on 22 November 2026.", "muted")]

doc.build(story)
print(OUT)
