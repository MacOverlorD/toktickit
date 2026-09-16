from pathlib import Path
from xml.sax.saxutils import escape

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.pdfbase.pdfmetrics import stringWidth
from reportlab.platypus import (
    BaseDocTemplate,
    Frame,
    Image,
    KeepTogether,
    PageBreak,
    PageTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "TokTickIT_Lab3_Submission.pdf"
REPO = "https://github.com/MacOverlorD/toktickit"

NAVY = colors.HexColor("#16324F")
BLUE = colors.HexColor("#1D70A2")
TEAL = colors.HexColor("#2A9D8F")
PALE = colors.HexColor("#EEF6F8")
INK = colors.HexColor("#1F2933")
MUTED = colors.HexColor("#52616B")
LINE = colors.HexColor("#CBD5E1")
GREEN = colors.HexColor("#E9F7EF")
AMBER = colors.HexColor("#FFF4D6")

styles = getSampleStyleSheet()
styles.add(ParagraphStyle(name="CoverTitle", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=28, leading=32, textColor=NAVY, alignment=TA_CENTER, spaceAfter=10))
styles.add(ParagraphStyle(name="CoverSub", parent=styles["Normal"], fontName="Helvetica", fontSize=12, leading=17, textColor=MUTED, alignment=TA_CENTER))
styles.add(ParagraphStyle(name="Part", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=19, leading=23, textColor=NAVY, spaceAfter=10, keepWithNext=True))
styles.add(ParagraphStyle(name="Section", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=12, leading=15, textColor=BLUE, spaceBefore=8, spaceAfter=5, keepWithNext=True))
styles.add(ParagraphStyle(name="Body2", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.2, leading=13, textColor=INK, spaceAfter=6))
styles.add(ParagraphStyle(name="Small", parent=styles["BodyText"], fontName="Helvetica", fontSize=7.8, leading=10.5, textColor=MUTED))
styles.add(ParagraphStyle(name="Callout", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=9.3, leading=13, textColor=NAVY, backColor=PALE, borderColor=TEAL, borderWidth=0.8, borderPadding=7, spaceAfter=9))
styles.add(ParagraphStyle(name="Bullet2", parent=styles["BodyText"], fontName="Helvetica", fontSize=9, leading=12.5, leftIndent=12, firstLineIndent=-7, bulletIndent=2, textColor=INK, spaceAfter=3))


def link(label, url):
    return f'<link href="{escape(url)}" color="#1D70A2"><u>{escape(label)}</u></link>'


def p(text, style="Body2"):
    return Paragraph(text, styles[style])


def bullets(items):
    return [p(f"• {item}", "Bullet2") for item in items]


def evidence_image(relative, caption, max_height=86 * mm):
    path = ROOT / relative
    if not path.exists():
        return [p(f"Evidence image unavailable: {escape(relative)}", "Small")]
    img = Image(str(path))
    max_width = 169 * mm
    scale = min(max_width / img.imageWidth, max_height / img.imageHeight)
    img.drawWidth = img.imageWidth * scale
    img.drawHeight = img.imageHeight * scale
    return [img, Spacer(1, 2 * mm), p(f"Figure: {escape(caption)} - <font color='#52616B'>{escape(relative)}</font>", "Small"), Spacer(1, 4 * mm)]


def table(rows, widths, header=True):
    converted = [[cell if hasattr(cell, "wrap") else p(str(cell), "Small") for cell in row] for row in rows]
    t = Table(converted, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    cmds = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]
    if header:
        cmds += [("BACKGROUND", (0, 0), (-1, 0), NAVY), ("TEXTCOLOR", (0, 0), (-1, 0), colors.white)]
        for cell in converted[0]:
            cell.style = ParagraphStyle("TableHead", parent=styles["Small"], fontName="Helvetica-Bold", textColor=colors.white)
    t.setStyle(TableStyle(cmds))
    return t


def page_decor(canvas, doc):
    canvas.saveState()
    width, height = A4
    canvas.setStrokeColor(LINE)
    canvas.line(20 * mm, 15 * mm, width - 20 * mm, 15 * mm)
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(MUTED)
    canvas.drawString(20 * mm, 10 * mm, "TokTickIT - CPE334 Lab 3")
    page = f"Page {doc.page}"
    canvas.drawRightString(width - 20 * mm, 10 * mm, page)
    canvas.restoreState()


class SubmissionDoc(BaseDocTemplate):
    def __init__(self, filename):
        super().__init__(filename, pagesize=A4, leftMargin=20 * mm, rightMargin=20 * mm, topMargin=18 * mm, bottomMargin=20 * mm, title="TokTickIT Lab 3 Submission", author="MacOverlorD with disclosed OpenAI Codex assistance")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates([PageTemplate(id="all", frames=frame, onPage=page_decor)])


story = []
story += [Spacer(1, 28 * mm), p("TokTickIT", "CoverTitle"), p("CPE334 Lab 3 - Release Evidence", "CoverSub"), Spacer(1, 8 * mm)]
story += [p("Nine-part submission covering workflow, specification, traceability, AI use, authentication, Staff operations, Administration, and responsive visual evidence.", "Callout")]
story += [Spacer(1, 8 * mm)]
story += [table([
    ["Field", "Release-candidate value"],
    ["Repository", link("MacOverlorD/toktickit", REPO)],
    ["Integration baseline", "lab3-staging @ 93d270d"],
    ["Submission branch", "feature/3-09-release-submission"],
    ["Verification date", "2026-09-16 (Asia/Bangkok)"],
    ["Current gate", "Peer review and final-main verification remain required"],
], [42 * mm, 123 * mm])]
story += [Spacer(1, 7 * mm), p("Integrity note", "Section"), p("This PDF reports the GitHub record as it exists. PR #50 has a positive follow-up comment and reviewer merge, but no later formal approval. AI assistance is disclosed in the AI-use section. The final-main result is not claimed before the release PR is reviewed and merged.")]
story += [PageBreak()]

story += [p("Answer Part 1 - Git and Workflow", "Part")]
story += [p("Lab 3 was delivered as nine scoped issues on a GitHub Project. Feature branches started from <b>lab3-staging</b>, targeted that branch through pull requests, and preserved <b>main</b> for the reviewed release.", "Callout")]
story += [table([
    ["Issue", "Scope", "PR / result"],
    ["#33", "Engineering contract", link("PR #42 - approved and merged", f"{REPO}/pull/42")],
    ["#34", "Data migration", link("PR #44 - fixes merged", f"{REPO}/pull/44")],
    ["#35", "Authentication and shell", link("PR #45 - fixes merged", f"{REPO}/pull/45")],
    ["#36", "Requester regression", link("PR #46 - fixes merged", f"{REPO}/pull/46")],
    ["#37", "Staff queue", link("PR #47 - fixes merged", f"{REPO}/pull/47")],
    ["#38", "Detail/workflow/communication", link("PR #48 - fixes merged", f"{REPO}/pull/48")],
    ["#39", "User management", link("PR #49 - fixes merged", f"{REPO}/pull/49")],
    ["#40", "Integrated verification", link("PR #50 - reviewer merged", f"{REPO}/pull/50")],
    ["#41", "Release and evidence", link("PR #51 - review requested", f"{REPO}/pull/51")],
], [19 * mm, 66 * mm, 80 * mm])]
story += [p("Review evidence", "Section")]
story += bullets([
    f"The exact collaborator identity, comments, fixes, commits, and decision state are recorded in {link('docs/lab-03/reviewer.md', f'{REPO}/blob/feature/3-09-release-submission/docs/lab-03/reviewer.md')}.",
    "PR #42 has a formal approval. PRs #44-#50 were merged after fixes, but no later formal approval is invented where GitHub still records Changes requested.",
    "Repository structure documents client, server, Lab 3 browser tests, reviewed screenshots, and the single output PDF. Generated reports and temporary results remain ignored.",
])
story += [PageBreak()]

story += [p("Answer Part 2 - Specification-Driven Development", "Part")]
story += [p("The specification was merged before feature implementation. It defines the contract for authentication, authorization, eight-state ticket workflow, communication, migration, responsive UI, and submission evidence.", "Callout")]
story += [table([
    ["Artifact", "Evidence"],
    ["Functional requirements", "FR-01 through FR-10 (10 total)"],
    ["Business rules", "BR-01 through BR-26 (26 total)"],
    ["Acceptance criteria", "AC-01 through AC-17 (17 total)"],
    ["Design decisions", "D-01 through D-07 with rationale"],
    ["Baseline PR", link("PR #42", f"{REPO}/pull/42")],
], [52 * mm, 113 * mm])]
story += [p("Traceable implementation choices", "Section")]
story += bullets([
    "Server-owned identity replaced spoofable requester headers and client identity selectors.",
    "Opaque HttpOnly sessions, exact Origin and CSRF checks, Argon2id password verification, session rotation, and concurrent-safe login limits implement the security contract.",
    "Ticket operations use allowlisted transitions, role checks, current-version preconditions, transactions, and safe conflict feedback.",
    "Migration preserves Lab 2 data and relationships, preflights legacy email validity, and keeps seed identity independent from editable email.",
])
story += [p(f"Primary artifact: {link('docs/lab-03/specification.md', f'{REPO}/blob/feature/3-09-release-submission/docs/lab-03/specification.md')}")]
story += [PageBreak()]

story += [p("Answer Part 3 - Test-Driven Development and Traceability", "Part")]
story += [p("Every acceptance criterion is mapped to API, UI, unit, migration, browser, accessibility, or release verification. Regression tests were added with each reviewer finding and defect.", "Callout")]
story += [table([
    ["Release-candidate command", "Result"],
    ["npm run prisma:generate --prefix server", "Passed"],
    ["npm run test:server", "24 files / 144 tests passed"],
    ["npm run test:client", "17 files / 134 tests passed"],
    ["npm run build", "Server/client TypeScript and Vite passed"],
    ["npm run test:e2e", "10 Playwright tests passed in 2.3 min"],
], [78 * mm, 87 * mm])]
story += [p("Defect-to-regression example", "Section")]
story += [p("A development API already running on port 3000 exposed an unmocked unit-test request. Its real 401 emitted the application's unauthenticated event and redirected the test to Login. The shared client test setup now rejects unexpected fetches, while the inherited Attachment suite explicitly mocks its communication dependency. The full client suite was rerun and passed.")]
story += [p("Release gate", "Section"), p("REL-01 is <b>In progress</b>: the complete release-candidate suite passes, but the same verification must run again on final main after peer review and merge. This PDF does not claim that future result.")]
story += [p(f"Full matrix and per-issue commands: {link('docs/lab-03/tests.md', f'{REPO}/blob/feature/3-09-release-submission/docs/lab-03/tests.md')}")]
story += [PageBreak()]

story += [p("Answer Part 4 - AI Use and Reflection", "Part")]
story += [p("OpenAI Codex was used for repository inspection, specification drafting, implementation, test generation, review-fix work, verification, evidence organization, and this disclosed PDF. Selected prompts and an issue-by-issue work record are retained in the repository.", "Callout")]
story += [p("My Reflection", "Section")]
story += [p("AI was most useful for turning the Lab 3 handout into traceable requirements, implementing repetitive API/UI tests, and checking the same behavior across roles and screen sizes. I did not treat generated work or self-review as proof: I used executable server, client, build and browser checks, inspected visual evidence, and kept the collaborator's formal review state separate from positive comments. The main limitation was environment sensitivity, demonstrated when a running development API changed a unit-test result; isolating network access and rerunning the complete suites was necessary before trusting the evidence.")]
story += [p("Student confirmation", "Section"), p("This reflection is a Codex-assisted draft based on the recorded work. The student must confirm that it matches their experience before submission.")]
story += [p(f"Disclosure log: {link('docs/lab-03/ai-use.md', f'{REPO}/blob/feature/3-09-release-submission/docs/lab-03/ai-use.md')}")]
story += [PageBreak()]

story += [p("Answer Part 5 - Login and Password Change UI", "Part")]
story += [p("The login flow provides generic failure feedback, rate-limit handling, session restoration, role-aware routing, logout, and mandatory first-password change. Protected routes cannot be reached by changing a URL or client state.", "Callout")]
story += evidence_image("artifacts/lab-03/screenshots/authentication/login-desktop.png", "Desktop login with explicit labels and focused, keyboard-reachable controls", 72 * mm)
story += evidence_image("artifacts/lab-03/screenshots/authentication/mandatory-change-mobile.png", "Mandatory password change at mobile width", 82 * mm)
story += [PageBreak()]

story += [p("Answer Part 6 - IT Staff Ticket Queue", "Part")]
story += [p("Authorized IT Staff can search, filter, sort, page, and change page size. Controls are URL-backed and immediate; the desktop table and compact mobile cards preserve ticket, requester, status, priority, and assignment context.", "Callout")]
story += evidence_image("artifacts/lab-03/screenshots/staff-queue/queue-desktop.png", "Eight-column Staff Queue desktop table", 82 * mm)
story += evidence_image("artifacts/lab-03/screenshots/staff-queue/queue-mobile.png", "Staff Queue mobile cards and navigation", 82 * mm)
story += [PageBreak()]

story += [p("Answer Part 7 - Staff Ticket Detail, Workflow, and Communication", "Part")]
story += [p("The Staff detail view combines operational context, read-only attachments, assignment, priority, exact status transitions, optimistic versions, Public Comments, and private Internal Notes. Transactions recheck the current actor and return explicit stale-conflict recovery.", "Callout")]
story += evidence_image("artifacts/lab-03/screenshots/staff-ticket-detail/ticket-detail-desktop.png", "Staff Ticket Detail with workflow and communication", 96 * mm)
story += evidence_image("artifacts/lab-03/screenshots/staff-ticket-detail/operation-validation-boundary-320.png", "First-invalid operation focus and readable feedback at 320px", 74 * mm)
story += [PageBreak()]

story += [p("Answer Part 8 - Administrator User Management", "Part")]
story += [p("Administrators can search/filter accounts and create, edit, activate/deactivate, change roles, or reset passwords. Canonical email rules, optimistic versions, session invalidation, current-actor checks, serializable last-admin protection, and atomic ticket-owner cleanup protect the workflow.", "Callout")]
story += evidence_image("artifacts/lab-03/screenshots/user-management/accounts-desktop.png", "Administrator account list and editor at desktop width", 88 * mm)
story += evidence_image("artifacts/lab-03/screenshots/user-management/create-user-validation-boundary-320.png", "Create-user validation and first-invalid focus at 320px", 76 * mm)
story += [PageBreak()]

story += [p("Answer Part 9 - Zen Green UI and Responsive Verification", "Part")]
story += [p("The shared Zen Green visual system uses calm teal/green surfaces, strong text contrast, consistent spacing, role-aware navigation, visible keyboard focus, flat data presentation, and responsive layouts verified at desktop, tablet, mobile, and the 320px boundary.", "Callout")]
story += [table([
    ["Evidence area", "Coverage"],
    ["Authentication", "Desktop, tablet, mobile, boundary, validation"],
    ["Requester", "List, detail, comments, four widths"],
    ["Staff Queue", "Table/cards, filters, navigation, four widths"],
    ["Staff Detail", "Operations, communication, validation, four widths"],
    ["User Management", "List/editor, validation, four widths"],
    ["Keyboard", "Complete target traversal, visible focus, mobile navigation"],
], [55 * mm, 110 * mm])]
story += [Spacer(1, 5 * mm)]
story += evidence_image("artifacts/lab-03/screenshots/requester/my-tickets-tablet.png", "Zen Green Requester list at tablet width", 48 * mm)
story += evidence_image("artifacts/lab-03/screenshots/user-management/accounts-mobile.png", "Role-aware Administrator navigation and cards at mobile width", 48 * mm)
story += [p("Submission checkpoint", "Section"), p("This release-candidate document contains all nine required answer headings and links its claims to tracked source evidence. Peer review, release merge, and final-main rerun remain explicit gates before Issue #41 can be marked Done.")]

OUT.parent.mkdir(parents=True, exist_ok=True)
SubmissionDoc(str(OUT)).build(story)
print(OUT)
