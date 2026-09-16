import os
from io import BytesIO
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import BaseDocTemplate, Frame, Image, PageBreak, PageTemplate, Paragraph, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "output" / "pdf" / "TokTickIT_Lab3_Submission.pdf"
REPO = "https://github.com/MacOverlorD/toktickit"
EVIDENCE_REF = os.getenv("TOKTICKIT_EVIDENCE_REF", "main")

NAVY = colors.HexColor("#16324F")
BLUE = colors.HexColor("#12618C")
TEAL = colors.HexColor("#18796F")
PALE = colors.HexColor("#EEF8F6")
INK = colors.HexColor("#17212B")
MUTED = colors.HexColor("#46545F")
LINE = colors.HexColor("#AAB8C2")
WHITE = colors.white

base = getSampleStyleSheet()
styles = {
    "cover": ParagraphStyle("cover", parent=base["Title"], fontName="Helvetica-Bold", fontSize=27, leading=31, textColor=NAVY, alignment=TA_CENTER, spaceAfter=8),
    "subtitle": ParagraphStyle("subtitle", parent=base["Normal"], fontSize=12, leading=16, textColor=MUTED, alignment=TA_CENTER),
    "part": ParagraphStyle("part", parent=base["Heading1"], fontName="Helvetica-Bold", fontSize=18, leading=22, textColor=NAVY, spaceAfter=8, keepWithNext=True),
    "h2": ParagraphStyle("h2", parent=base["Heading2"], fontName="Helvetica-Bold", fontSize=11.5, leading=14, textColor=BLUE, spaceBefore=6, spaceAfter=4, keepWithNext=True),
    "body": ParagraphStyle("body", parent=base["BodyText"], fontSize=9, leading=12.3, textColor=INK, spaceAfter=5),
    "small": ParagraphStyle("small", parent=base["BodyText"], fontSize=7.4, leading=9.6, textColor=MUTED),
    "th": ParagraphStyle("th", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=7.6, leading=9.6, textColor=WHITE),
    "td": ParagraphStyle("td", parent=base["BodyText"], fontSize=7.4, leading=9.6, textColor=INK),
    "callout": ParagraphStyle("callout", parent=base["BodyText"], fontName="Helvetica-Bold", fontSize=9, leading=12.3, textColor=NAVY, backColor=PALE, borderColor=TEAL, borderWidth=0.8, borderPadding=6, spaceAfter=7),
}


def para(text, style="body"):
    return Paragraph(text, styles[style])


def link(label, url):
    return f'<link href="{escape(url)}" color="#12618C"><u>{escape(label)}</u></link>'


def repo_link(label, relative):
    return link(label, f"{REPO}/blob/{EVIDENCE_REF}/{relative}")


def bullets(items):
    return [para(f"• {item}") for item in items]


def grid(rows, widths, header=True, font="td"):
    built = []
    for row_index, row in enumerate(rows):
        style = "th" if header and row_index == 0 else font
        built.append([cell if hasattr(cell, "wrap") else para(str(cell), style) for cell in row])
    table = Table(built, colWidths=widths, repeatRows=1 if header else 0, hAlign="LEFT")
    commands = [
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("GRID", (0, 0), (-1, -1), 0.45, LINE),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
        ("TOPPADDING", (0, 0), (-1, -1), 3.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 3.5),
    ]
    if header:
        commands.append(("BACKGROUND", (0, 0), (-1, 0), NAVY))
    table.setStyle(TableStyle(commands))
    return table


_buffers = []


def crop(relative, box=None, width=160 * mm):
    source = PILImage.open(ROOT / relative).convert("RGB")
    if box:
        left, top, right, bottom = box
        source = source.crop((max(0, left), max(0, top), min(source.width, right), min(source.height, bottom)))
    stream = BytesIO()
    source.save(stream, format="JPEG", quality=88, optimize=True)
    stream.seek(0)
    _buffers.append(stream)
    image = Image(stream)
    scale = width / image.imageWidth
    image.drawWidth = width
    image.drawHeight = image.imageHeight * scale
    return image


def figure(relative, caption, box=None, width=160 * mm):
    return [crop(relative, box, width), Spacer(1, 1.5 * mm), para(f"Figure: {escape(caption)}", "small"), Spacer(1, 3 * mm)]


def two_figures(left, right, widths=(80 * mm, 80 * mm)):
    cells = []
    for spec, width in zip((left, right), widths):
        relative, caption, box = spec
        cells.append([crop(relative, box, width), para(escape(caption), "small")])
    table = Table([[cells[0][0], cells[1][0]], [cells[0][1], cells[1][1]]], colWidths=list(widths), hAlign="LEFT")
    table.setStyle(TableStyle([("VALIGN", (0, 0), (-1, -1), "TOP"), ("LEFTPADDING", (0, 0), (-1, -1), 0), ("RIGHTPADDING", (0, 0), (-1, -1), 4)]))
    return table


def footer(canvas, doc):
    canvas.saveState()
    canvas.setStrokeColor(LINE)
    canvas.line(18 * mm, 15 * mm, A4[0] - 18 * mm, 15 * mm)
    canvas.setFillColor(MUTED)
    canvas.setFont("Helvetica", 7.2)
    canvas.drawString(18 * mm, 10 * mm, "TokTickIT - CPE334 Lab 3")
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"Page {doc.page}")
    canvas.restoreState()


class Doc(BaseDocTemplate):
    def __init__(self, target):
        super().__init__(target, pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm, topMargin=17 * mm, bottomMargin=20 * mm, title="TokTickIT Lab 3 Submission", author="MacOverlorD with disclosed OpenAI Codex assistance")
        frame = Frame(self.leftMargin, self.bottomMargin, self.width, self.height, id="body")
        self.addPageTemplates([PageTemplate(id="main", frames=frame, onPage=footer)])


story = []
story += [Spacer(1, 25 * mm), para("TokTickIT", "cover"), para("CPE334 Lab 3 - Submission Evidence", "subtitle"), Spacer(1, 8 * mm)]
story += [para("Exactly one PDF with nine rubric sections in the required order. Evidence is rendered in the document; links are supplementary.", "callout")]
story += [grid([
    ["Field", "Value"],
    ["Repository", link("MacOverlorD/toktickit", REPO)],
    ["Workflow", "feature branches -> lab3-staging -> main"],
    ["Release PR", link("PR #51", f"{REPO}/pull/51")],
    ["Repository evidence ref", EVIDENCE_REF],
    ["Verification", "Release candidate: server 144, client 134, build passed, Playwright 10/10"],
], [48 * mm, 116 * mm])]
story += [Spacer(1, 6 * mm), para("Release truth", "h2"), para("This review artifact does not claim a completed final-main run or all Issues Done. The generator uses stable main links; after the reviewed release is merged, the PDF must be regenerated on main and REL-01 updated with the real final commit and command output.")]
story += [PageBreak()]

story += [para("Answer Part 1 - Git Use with Engineering Workflow", "part")]
story += [para("Rendered workflow record", "h2"), grid([
    ["Issue", "Branch / scope", "PR", "Recorded result"],
    ["#33", "3-01 contract", "#42", "Approved; merged"], ["#34", "3-02 migration", "#44", "Changes fixed; merged"],
    ["#35", "3-03 authentication", "#45", "Changes fixed; merged"], ["#36", "3-04 requester", "#46", "Changes fixed; merged"],
    ["#37", "3-05 queue", "#47", "Changes fixed; merged"], ["#38", "3-06 detail", "#48", "Changes fixed; merged"],
    ["#39", "3-07 admin", "#49", "Changes fixed; merged"], ["#40", "3-08 verification", "#50", "Changes fixed; reviewer merged"],
    ["#41", "3-09 release", "#51", "Changes requested; fixes in progress"],
], [17 * mm, 52 * mm, 16 * mm, 79 * mm])]
story += [para("Rendered reviewer record", "h2"), grid([
    ["Reviewer", "Finding / response", "Decision evidence"],
    ["Titihinan Sobking (Ohmmykung09)", "PR #42 contract review; source-section correction applied.", "Approved commit 270bf9a; merged 6418e3f"],
    ["Ohmmykung09", "PRs #44-#50 requested migration, auth, regression, queue, detail, admin, keyboard and visual fixes; each response and commit is recorded.", "Merged after fixes; no formal approval invented where absent"],
    ["Ohmmykung09", "PR #51 requested readable crops, complete rendered rubric evidence, stable final-main links, and corrected table-header contrast.", "Changes requested 2026-09-16; this revision responds"],
], [42 * mm, 78 * mm, 44 * mm])]
story += [para(f"Working record: {repo_link('reviewer.md', 'docs/lab-03/reviewer.md')} | {link('PR #51 review', f'{REPO}/pull/51#pullrequestreview-5221601951')}")]
story += [PageBreak()]
story += [para("Part 1 continued - Repository and Project Evidence", "part")]
story += [para("Final Kanban", "h2"), para("Issues #33-#40 are merged into lab3-staging. Issue #41 remains in PR Review/Fixing until this PR is approved, the final release is merged to main, final-main verification passes, and the Project item moves to Done. This is the accurate current board state; the final PDF must replace this paragraph with an all-Done capture after completion.")]
story += [para("README and .gitignore evidence", "h2"), grid([
    ["Artifact", "Rendered evidence"],
    ["README", "Setup includes environment files, PostgreSQL, dependency installation, Prisma generate/deploy/seed, development ports, authentication/session behavior, Lab 3 test commands, isolated E2E ports, scoped cleanup, and promoted visual evidence."],
    [".gitignore", "Ignores node_modules, uploads, secrets, build/coverage, Playwright reports/results and tmp; explicitly keeps Lab 3 Markdown and exactly one submission PDF."],
], [37 * mm, 127 * mm])]
story += [para("Repository structure", "h2"), grid([
    ["Path", "Purpose"],
    ["docs/lab-03/", "specification.md, tests.md, ui-spec.md, api-spec.md, reviewer.md, ai-use.md"],
    ["server/tests/lab-03/", "authentication, migration, password, queue, detail, account and domain tests"],
    ["client/tests/lab-03/", "authentication, queue, detail, requester communication and user management UI tests"],
    ["e2e/lab-03/", "authentication, requester flow, queue, ticket workflow, administration and visual evidence"],
    ["artifacts/lab-03/screenshots/", "37 tracked authentication, requester, queue, detail and administration captures"],
    ["output/pdf/", "TokTickIT_Lab3_Submission.pdf only"],
], [55 * mm, 109 * mm])]
story += [para("Direct authorization proof", "h2"), para("server/tests/lab-03/staff-ticket-detail.api.test.ts exercises role denial, current-actor checks, private-note isolation, attachment access, optimistic conflicts and every permitted/forbidden transition. All cases passed in the 144-test server run.")]
story += [para(f"Links: {repo_link('README', 'README.md')} | {repo_link('.gitignore', '.gitignore')} | {link('Project board', 'https://github.com/users/MacOverlorD/projects/2')}")]
story += [PageBreak()]

story += [para("Answer Part 2 - Specification-Driven Development", "part")]
story += [para("The specification was approved in PR #42 before implementation PRs #44-#50. The rendered summary below mirrors the numbered source contract.", "callout")]
story += [grid([
    ["Requirement group", "Rendered numbered contract"],
    ["FR-01..FR-03", "Login/session restoration, mandatory password change, role-aware shell and direct-route protection"],
    ["FR-04..FR-06", "Authenticated Requester regression, data-preserving migration, Staff queue"],
    ["FR-07..FR-09", "Staff detail/workflow, communication, Administrator user management"],
    ["FR-10", "Integrated accessibility, responsive evidence, traceability and release submission"],
    ["BR-01..BR-26", "Server-owned identity; one role; active/current actor; safe errors; exact transitions; optimistic versions; append-only communication; last-admin and self-deactivation safeguards"],
    ["AC-01..AC-17", "Authentication through release evidence, each mapped to executable tests in the following traceability section"],
], [42 * mm, 122 * mm])]
story += [para("Authorization rules", "h2"), grid([
    ["Capability", "Requester", "IT Staff", "Administrator"],
    ["Own tickets / public comments", "Yes", "Operational read/comment", "No"],
    ["Staff queue/detail and internal notes", "No", "Yes", "No"],
    ["Account management", "No", "No", "Yes"],
    ["Direct API/route denial", "403/redirect outside role", "403/redirect outside role", "403/redirect outside role"],
], [57 * mm, 35 * mm, 35 * mm, 37 * mm])]
story += [para("Migration decisions and Product Definition of Done", "h2")]
story += bullets([
    "Forward-only, data-preserving migration with complete legacy-email preflight, transaction rollback proof, immutable seed fixture identity, repeatable seed, and Argon2id local provisioning.",
    "Done requires implemented requirements, automated unit/API/UI/authorization/regression/E2E coverage, reviewed responsive evidence, peer-review record, one nine-part PDF, reviewed release to main, and a passing final-main rerun.",
])
story += [para(f"Source: {repo_link('specification.md', 'docs/lab-03/specification.md')} | Pre-implementation evidence: {link('PR #42', f'{REPO}/pull/42')}")]
story += [PageBreak()]

story += [para("Answer Part 3 - Test-Driven Development and Traceability", "part")]
story += [para("Rendered AC traceability", "h2"), grid([
    ["IDs", "Types and actual paths", "Status"],
    ["AC-01..04", "API: server/tests/lab-03/auth.api.test.ts, login-rate-limit.test.ts; UI/E2E: authentication-ui.test.tsx, authentication.spec.ts", "Passed"],
    ["AC-05..06", "Lab 2 API/UI regression plus e2e/lab-03/requester-ticket-flow.spec.ts", "Passed"],
    ["AC-07", "staff-queue.api.test.ts; StaffTicketQueue.test.tsx; staff-queue.spec.ts", "Passed"],
    ["AC-08..10", "staff-ticket-detail.api.test.ts; ticket-domain.test.ts; StaffTicketDetail.test.tsx; ticket-workflow.spec.ts", "Passed"],
    ["AC-11..13", "users-admin.api.test.ts; account-domain.test.ts; UserManagement.test.tsx; user-administration.spec.ts", "Passed"],
    ["AC-14", "migration.test.ts; password-foundation.test.ts", "Passed"],
    ["AC-15..16", "UI suites; visual-evidence.spec.ts; 37 screenshots", "Passed"],
    ["AC-17", "reviewer.md; PDF; final-main command output", "Release candidate passed; final-main pending"],
], [25 * mm, 111 * mm, 28 * mm])]
story += [para("Release-candidate output (2026-09-16)", "h2"), grid([
    ["Command", "Observed output"],
    ["npm run prisma:generate --prefix server", "Prisma Client generated successfully"],
    ["npm run test:server", "24 files, 144 tests passed"],
    ["npm run test:client", "17 files, 134 tests passed"],
    ["npm run build", "Server/client TypeScript and Vite production build passed"],
    ["npm run test:e2e", "10 Playwright tests passed in 2.3 minutes on isolated ports 3100/5174"],
], [78 * mm, 86 * mm])]
story += [para("Coverage includes unit, API/integration, UI, authorization, Lab 2 regression, migration, concurrency, E2E, keyboard focus and responsive visual checks. Final-main output cannot be truthfully rendered until the reviewed release reaches main; REL-01 remains In progress.", "callout")]
story += [para(f"Source: {repo_link('tests.md', 'docs/lab-03/tests.md')}")]
story += [PageBreak()]

story += [para("Answer Part 4 - AI Use with Reflection", "part")]
story += [para("LLM used: OpenAI Codex (exact deployed model variant is not exposed to the repository). Selected prompt summaries:", "callout")]
story += [grid([
    ["#", "Selected prompt summary"],
    ["1", "Read the Lab 3 handout and propose an issue count."], ["2", "Reduce the plan to eight or nine issues without losing coverage."],
    ["3", "Continue after the Staff Queue merge and open the next feature PR."], ["4", "Address PR #46 findings, update evidence, reply, and request re-review."],
    ["5", "Complete Issue 1 authoring and make its PR ready."], ["6", "Merge the reviewed Issue 1 PR."],
    ["7", "Continue with Issue 2 after Issue 1 merged."], ["8", "Address PR #44 findings and resubmit."],
    ["9", "Continue with the next Lab 3 issue after merge."], ["10", "Run front/back, confirm the remaining issue, and complete release evidence."],
], [10 * mm, 154 * mm])]
story += [para("My Reflection", "h2"), para("AI was most useful for turning the handout into traceable requirements, implementing repetitive API/UI tests, and checking behavior across roles and screen sizes. I did not treat generated work or self-review as proof: I used executable server, client, build and browser checks, inspected visual evidence, and kept formal review decisions separate from positive comments. A key limitation was environment sensitivity: a live development API changed a unit-test result, so unexpected network access was isolated and the full suite rerun before the evidence was trusted.")]
story += [para("This is a Codex-assisted draft based on the recorded work; the student must confirm it matches their experience.", "callout"), para(f"Source: {repo_link('ai-use.md', 'docs/lab-03/ai-use.md')}")]
story += [PageBreak()]

story += [para("Answer Part 5 - Working Login and Password Change UI", "part")]
story += [grid([
    ["Required demonstration", "Rendered evidence"],
    ["Valid login", "authentication.spec.ts signs in with a seeded active account and verifies the role home"],
    ["Invalid login / inactive account", "Generic safe failure; no account-existence disclosure; API/UI assertions cover both"],
    ["Busy / safe failure", "Disabled submission while pending and generic retryable feedback"],
    ["Mandatory first password change", "Initial-password account is gated until valid replacement succeeds"],
    ["Authenticated user/role", "Role-aware shell displays identity and navigation"],
    ["Logout / direct access blocked", "Session invalidated; protected API and replayed route denied"],
], [58 * mm, 106 * mm])]
story += [Spacer(1, 3 * mm), two_figures(
    ("artifacts/lab-03/screenshots/authentication/login-desktop.png", "Login form crop: labels, controls and safe sign-in action", (380, 80, 1060, 850)),
    ("artifacts/lab-03/screenshots/authentication/login-validation-boundary-320.png", "Invalid input feedback at 320px", (0, 0, 320, 844)),
    (96 * mm, 64 * mm),
)]
story += [Spacer(1, 4 * mm), two_figures(
    ("artifacts/lab-03/screenshots/authentication/mandatory-change-desktop.png", "Mandatory password-change form", (380, 80, 1060, 850)),
    ("artifacts/lab-03/screenshots/authentication/change-password-validation-boundary-320.png", "Password validation and first-invalid focus", (0, 0, 320, 844)),
    (96 * mm, 64 * mm),
)]
story += [PageBreak()]

story += [para("Answer Part 6 - Working IT Staff Ticket Queue UI", "part")]
story += [grid([
    ["Rubric scenario", "Demonstration"],
    ["Realistic data / open detail", "Seeded multi-status tickets with ticket-number detail links"],
    ["Search / filters / sorting / page size", "URL-backed controls trigger normalized API queries immediately"],
    ["Pagination", "Snapshot-consistent paging with recoverable out-of-range state"],
    ["Ownership / badges", "Assigned and unassigned owners plus status and IT-priority badges"],
    ["Empty / no results / failure", "Distinct states with Clear Filters or Retry"],
    ["Responsive", "Eight-column desktop table; tablet/mobile cards; 320px overflow assertion"],
], [60 * mm, 104 * mm])]
story += figure("artifacts/lab-03/screenshots/staff-queue/queue-desktop.png", "Readable desktop queue crop with controls, ownership, badges and Open action", (80, 0, 1360, 900), 164 * mm)
story += [PageBreak(), para("Part 6 continued - Responsive Queue Evidence", "part")]
story += [two_figures(
    ("artifacts/lab-03/screenshots/staff-queue/queue-mobile.png", "Mobile queue top: navigation and filters", (0, 0, 390, 1050)),
    ("artifacts/lab-03/screenshots/staff-queue/queue-mobile.png", "Mobile queue cards: owner, badges and detail actions", (0, 1050, 390, 2200)),
    (78 * mm, 78 * mm),
), Spacer(1, 5 * mm)]
story += [two_figures(
    ("artifacts/lab-03/screenshots/staff-queue/queue-mobile.png", "Mobile paging and page-size controls", (0, 2200, 390, 3154)),
    ("artifacts/lab-03/screenshots/staff-queue/queue-boundary-320.png", "320px boundary: no horizontal page overflow", (0, 0, 320, 1000)),
    (78 * mm, 78 * mm),
)]
story += [PageBreak()]

story += [para("Answer Part 7 - Working Staff Ticket Detail UI", "part")]
story += [grid([
    ["Required demonstration", "Rendered implementation/test evidence"],
    ["Claim / reassign", "Owner changes require current version and eligible active IT Staff"],
    ["IT Priority / status", "Allowlisted priority and exact eight-state transitions; invalid pairs rejected"],
    ["Public Comments / Internal Notes", "Append-only server author/time; private notes never leak to Requester"],
    ["Attachment continuity", "Staff read-only metadata/content uses protected authorization"],
    ["Requester resolution indication", "Resolved state explicitly informs Requester while preserving public timeline"],
    ["Role restrictions / direct API", "Requester/Admin Staff endpoints return forbidden; cross-owner/private data protected"],
    ["Validation / safe failure", "Unicode code-point boundaries, first-invalid focus, stale-version recovery and Retry"],
], [55 * mm, 109 * mm])]
story += [para("Direct authorization proof", "h2"), para("server/tests/lab-03/staff-ticket-detail.api.test.ts exercises role denial, current-actor checks, private-note isolation, attachment access, optimistic conflicts and every permitted/forbidden transition. All cases passed in the 144-test server run.")]
story += figure("artifacts/lab-03/screenshots/staff-ticket-detail/ticket-detail-desktop.png", "Desktop detail crop: request context and operational controls", (60, 0, 1380, 920), 164 * mm)
story += [PageBreak(), para("Part 7 continued - Detail Operations and Communication", "part")]
story += [two_figures(
    ("artifacts/lab-03/screenshots/staff-ticket-detail/ticket-detail-mobile.png", "Mobile operations: assignment, priority and status", (0, 650, 390, 1600)),
    ("artifacts/lab-03/screenshots/staff-ticket-detail/ticket-detail-mobile.png", "Public Comments and Internal Notes", (0, 1550, 390, 2500)),
    (78 * mm, 78 * mm),
), Spacer(1, 4 * mm)]
story += [two_figures(
    ("artifacts/lab-03/screenshots/staff-ticket-detail/operation-validation-boundary-320.png", "Operation validation at 320px", (0, 700, 320, 1650)),
    ("artifacts/lab-03/screenshots/staff-ticket-detail/comment-validation-boundary-320.png", "Communication validation at 320px", (0, 1700, 320, 2700)),
    (78 * mm, 78 * mm),
)]
story += [PageBreak()]

story += [para("Answer Part 8 - Working Administrator User Management UI", "part")]
story += [grid([
    ["Required scenario", "Demonstration"],
    ["List / Edit", "Name, Email, Role, Status and Edit action in table/cards"], ["Search / role filter", "Immediate normalized query with ordered-response protection"],
    ["Create", "One permitted role and initial password; credentials cleared after completion"], ["Validation", "Canonical/total email, name, role, boolean and version checks; duplicate email feedback"],
    ["Edit / activation", "Name, email, role, active state; stale draft/version preserved for recovery"], ["Reset password", "New initial password invalidates sessions and requires change at next login"],
    ["Safety", "Current actor cannot self-deactivate; serializable transaction protects last active Administrator"], ["Authorization / failure", "Non-Administrators forbidden; safe errors and Retry"],
], [49 * mm, 115 * mm])]
story += figure("artifacts/lab-03/screenshots/user-management/accounts-desktop.png", "Desktop account list crop with required columns, filters and Edit actions", (40, 0, 1400, 900), 164 * mm)
story += [PageBreak(), para("Part 8 continued - Administration Forms and Safety", "part")]
story += [two_figures(
    ("artifacts/lab-03/screenshots/user-management/accounts-mobile.png", "Mobile account search, filters and cards", (0, 0, 390, 1100)),
    ("artifacts/lab-03/screenshots/user-management/accounts-mobile.png", "Mobile account editor and activation controls", (0, 2500, 390, 3650)),
    (78 * mm, 78 * mm),
), Spacer(1, 4 * mm)]
story += [two_figures(
    ("artifacts/lab-03/screenshots/user-management/create-user-validation-mobile.png", "Create-user validation and first-invalid focus", (0, 0, 390, 844)),
    ("artifacts/lab-03/screenshots/authentication/mandatory-change-mobile.png", "Reset initial password leads to mandatory next-login change", (0, 0, 390, 844)),
    (78 * mm, 78 * mm),
)]
story += [PageBreak()]

story += [para("Answer Part 9 - Zen Green UI and Responsive Evidence", "part")]
story += [para("Rendered ui-spec.md summary", "h2"), grid([
    ["Design area", "Completed specification/check"],
    ["Zen Green system", "Shared teal/green tokens, calm surfaces, strong text contrast, consistent spacing and flat data presentation"],
    ["Role navigation", "Requester, IT Staff and Administrator destinations are visible only when authorized; mobile navigation keyboard-tested"],
    ["Badges", "Status and priority use consistent semantic labels and colors"],
    ["Editable/read-only", "Forms and operational controls are visually distinct from immutable request and audit data"],
    ["Validation", "Field-adjacent messages, safe summaries and first-invalid focus across auth/account/comment/operation forms"],
    ["Focus", "Complete keyboard target traversal with visible focus including upload proxy"],
    ["Clipping/overlap/overflow", "Desktop/tablet/mobile/320px screenshots inspected; automated document-width assertions pass"],
], [50 * mm, 114 * mm])]
story += [para("Major-screen responsive inventory", "h2"), grid([
    ["Screen", "Desktop", "Tablet", "Mobile / boundary"],
    ["Login / password change", "1440x900", "820x1180", "390x844 / 320x844"],
    ["Requester list/detail", "1440x900 / 1655", "827x1391 / 1645", "390x1523 / 1927; 320 boundary"],
    ["Staff Queue", "1440x1112", "827x2163", "390x3154 / 320x3407"],
    ["Staff Detail", "1440x2069", "827x2316", "390x2576 / 320x2853"],
    ["User Management", "1440x2961", "827x4119", "390x4174 / 320x4202"],
], [47 * mm, 37 * mm, 37 * mm, 43 * mm])]
story += [para(f"Source: {repo_link('ui-spec.md', 'docs/lab-03/ui-spec.md')} | 37 tracked screenshots | visual-evidence.spec.ts: 4 tests passed")]

responsive = [
    ("Authentication", "authentication/login-desktop.png", "authentication/login-tablet.png", "authentication/login-mobile.png"),
    ("Requester", "requester/my-tickets-desktop.png", "requester/my-tickets-tablet.png", "requester/my-tickets-mobile.png"),
    ("Staff Queue", "staff-queue/queue-desktop.png", "staff-queue/queue-tablet.png", "staff-queue/queue-mobile.png"),
    ("Staff Detail", "staff-ticket-detail/ticket-detail-desktop.png", "staff-ticket-detail/ticket-detail-tablet.png", "staff-ticket-detail/ticket-detail-mobile.png"),
    ("User Management", "user-management/accounts-desktop.png", "user-management/accounts-tablet.png", "user-management/accounts-mobile.png"),
]
for title, desktop, tablet, mobile in responsive:
    story += [PageBreak(), para(f"Part 9 continued - {title} Responsive Evidence", "part")]
    prefix = "artifacts/lab-03/screenshots/"
    story += figure(prefix + desktop, f"{title} desktop crop", (0, 0, 900, 720), 120 * mm)
    story += [two_figures(
        (prefix + tablet, f"{title} tablet crop", (0, 0, 700, 650)),
        (prefix + mobile, f"{title} mobile crop", (0, 0, 390, 650)),
        (90 * mm, 65 * mm),
    )]

story += [Spacer(1, 4 * mm), para("Completed visual checklist", "h2"), para("Consistency, role navigation, badges, editable/read-only distinction, validation placement, complete keyboard focus, clipping, overlap and horizontal overflow were checked through automated Playwright assertions and manual inspection of the 37 promoted screenshots. Long pages are shown here as purpose-specific crops so labels and controls remain readable at normal PDF size.", "callout")]

OUT.parent.mkdir(parents=True, exist_ok=True)
Doc(str(OUT)).build(story)
print(OUT)
