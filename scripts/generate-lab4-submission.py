"""One nine-part PDF; final mode refuses unverified main or invented approval.

Preview output is always labelled and kept in tmp/pdfs, not the submission folder.
"""
import argparse
import hashlib
import json
import re
import subprocess
from pathlib import Path
from xml.sax.saxutils import escape

from PIL import Image as PILImage
from reportlab.lib import colors
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, PageBreak, Image, KeepTogether

ROOT = Path(__file__).resolve().parents[1]
REPO = "https://github.com/MacOverlorD/toktickit"
parser = argparse.ArgumentParser(description=__doc__)
parser.add_argument("--preview", action="store_true")
parser.add_argument("--manifest", type=Path)
parser.add_argument("--snapshot", type=Path)
args = parser.parse_args()
snapshot = json.loads((args.snapshot or ROOT / "artifacts/lab-04/review-history.json").read_text(encoding="utf-8"))
sha = subprocess.check_output(["git", "rev-parse", "HEAD"], cwd=ROOT, text=True).strip()
manifest = json.loads(args.manifest.read_text(encoding="utf-8")) if args.manifest else None
if not args.preview:
    if not manifest or not manifest.get("passed") or manifest.get("mode") != "final-main":
        raise SystemExit("Final output requires a passed final-main verification manifest.")
    if manifest["commit"] != sha:
        raise SystemExit("Manifest SHA does not match checked-out source.")
    subprocess.run(["git", "fetch", "origin", "main"], cwd=ROOT, check=True)
    if subprocess.check_output(["git", "rev-parse", "origin/main"], cwd=ROOT, text=True).strip() != sha:
        raise SystemExit("Source is not the latest fetched main.")
    if subprocess.check_output(["git", "status", "--porcelain"], cwd=ROOT, text=True).strip():
        raise SystemExit("Final source must be clean.")
    releases = snapshot.get("releasePulls", [])
    def peer_approved(pull):
        decisions = {}
        for review in pull["reviews"]:
            if review["author"] != "MacOverlorD" and review["state"] in ("APPROVED", "CHANGES_REQUESTED"):
                decisions[review["author"]] = review
        return any(r["state"] == "APPROVED" and r["commit"] == pull.get("headRefOid") for r in decisions.values())
    if not any(p["state"] == "MERGED" and p["baseRefName"] == "main"
               and (p.get("mergeCommit") or {}).get("oid") == sha and peer_approved(p)
               for p in releases):
        raise SystemExit("Snapshot must contain a genuinely peer-approved merged release PR to main.")
    if not all(any(i["issue"] == number and i["status"] == "Done" for i in snapshot["project"]["items"])
               for number in range(54, 63)):
        raise SystemExit("Final submission requires all nine Project issues Done.")
    expected = {"audit-documents", "release-tool-tests", "prisma-generate", "prisma-deploy", "prisma-status",
                "prisma-seed-first", "prisma-seed-repeat", "quality-all"}
    if {c["name"] for c in manifest["commands"]} != expected:
        raise SystemExit("Incomplete command manifest.")
    for command in manifest["commands"]:
        if command["exitCode"] != 0:
            raise SystemExit("A recorded verification command failed.")
        log = args.manifest.parent / command["log"]
        if hashlib.sha256(log.read_bytes()).hexdigest() != command["sha256"]:
            raise SystemExit("Verification log hash mismatch.")
    history = manifest.get('history')
    if not history or hashlib.sha256((args.manifest.parent / history['log']).read_bytes()).hexdigest() != history['sha256']:
        raise SystemExit('Missing or changed commit-history evidence.')

OUT = ROOT / ("tmp/pdfs/TokTickIT_Lab4_Preview.pdf" if args.preview else "output/pdf/TokTickIT_Lab4_Submission.pdf")
OUT.parent.mkdir(parents=True, exist_ok=True)
base = getSampleStyleSheet()
GREEN = colors.HexColor("#164E3B")
styles = {
    "body": ParagraphStyle("L4body", parent=base["BodyText"], fontSize=9.5, leading=13, spaceAfter=6, allowWidows=0, allowOrphans=0),
    "h1": ParagraphStyle("L4h1", parent=base["Heading1"], fontSize=18, leading=22, textColor=GREEN, spaceAfter=12),
    "h2": ParagraphStyle("L4h2", parent=base["Heading2"], fontSize=12, leading=16, textColor=GREEN, spaceBefore=8, spaceAfter=6),
    "small": ParagraphStyle("L4small", parent=base["BodyText"], fontSize=8, leading=10.5, spaceAfter=5),
}
story = []

def clean(text):
    return text.translate(str.maketrans({"\u2013": "-", "\u2014": "-", "\u2011": "-", "\u2018": "'", "\u2019": "'",
                                        "\u201c": '"', "\u201d": '"', "\u2192": "->", "\u2264": "<=", "\u2265": ">="}))

def markup(text):
    value = escape(clean(text))
    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", lambda m: '<link color="#166E50" href="' +
                   escape(resolve_link(m[2]), {'"': '&quot;'}) + '"><u>' + m[1] + '</u></link>', value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", value)
    return value.replace("`", "")

def resolve_link(target):
    if target.startswith("http"):
        return target.replace("&amp;", "&")
    if target.startswith("../../"):
        target = target[6:]
    else:
        target = "docs/lab-04/" + target.removeprefix("./")
    return f"{REPO}/blob/{sha}/{target}"

def p(text, kind="body"):
    story.append(Paragraph(markup(text), styles[kind]))

def link(label, target):
    p(f"[{label}]({target})")

def render_document(file, selected=None):
    """Render text and table rows as readable cards rather than tiny wide tables."""
    link(f"Immutable full document: {file}", f"{REPO}/blob/{sha}/docs/lab-04/{file}")
    lines = (ROOT / "docs/lab-04" / file).read_text(encoding="utf-8").splitlines()
    include = selected is None
    table_header = None
    fenced = False
    for line in lines:
        if line.startswith("## "):
            include = selected is None or any(line.startswith(section) for section in selected)
            table_header = None
        if not include or not line.strip():
            continue
        if line.startswith("```"):
            fenced = not fenced
            continue
        if line.startswith("#"):
            table_header = None
            p(line.lstrip("# "), "h2")
        elif line.startswith("|"):
            cells = [c.strip() for c in line.strip().strip("|").split("|")]
            if all(re.fullmatch(r"[: -]+", c) for c in cells):
                continue
            if table_header is None:
                table_header = cells
                continue
            p("; ".join(f"**{label}:** {cell}" for label, cell in zip(table_header, cells)), "small")
        else:
            table_header = None
            p(line if fenced else line.removeprefix("- "), "small" if fenced else "body")

def begin(number, title):
    if story:
        story.append(PageBreak())
    p(f"Answer Part {number}:", "h1")
    p(title, "h2")

def figure(folder, filename, caption, top=0, height=850, max_width=170*mm):
    relative = f"artifacts/lab-04/screenshots/{folder}/{filename}"
    original = PILImage.open(ROOT / relative)
    # Show viewport-sized readable extracts, never shrink a long full-page image to a thumbnail.
    from io import BytesIO
    buffer = BytesIO()
    cropped = original.crop((0, top, original.width, min(original.height, top + height)))
    cropped.save(buffer, format="PNG")
    buffer.seek(0)
    width = min(max_width, cropped.width * 0.6)
    image = Image(buffer, width=width, height=width * cropped.height / cropped.width)
    caption_flow = Paragraph(markup(caption + f" [Full-resolution source]({REPO}/blob/{sha}/{relative})"), styles['small'])
    story.append(KeepTogether([image, Spacer(1, 3 * mm), caption_flow]))

p("TokTickIT - Lab 4", "h1")
p("Actions Taken, Dashboards, and Final Regression", "h2")
p("Name: __________________________________________________")
p("Student ID: ______________________________________________")
p("Repository owner: MacOverlorD; peer reviewer: Ohmmykung09.")
p(f"Source commit: {sha}", "small")
p("PREVIEW - NOT A FINAL SUBMISSION. Release approval, merge, exact-main checks and all-Done evidence remain required."
  if args.preview else "Final-main verification is tied to the commit above; the retained logs are hashed in the verification manifest.")
p("Name and ID are intentionally blank at the student's request. Screenshots are readable extracts of the reviewed integration evidence; full-resolution originals are linked.")

begin(1, "Git use and engineering workflow")
p("The Lab 3 baseline was 6e327a799531e9814101c0ef8309bf70d1e05064. Eight separately reviewed Lab 4 feature branches were merged into lab4-staging. The release must then preserve this history in main through a separately reviewed merge PR.")
link("GitHub Project / Kanban", snapshot["project"]["url"])
link("Commit history at the exact source SHA", f"{REPO}/commits/{sha}")
if manifest and manifest.get('history'):
    p("Captured feature/staging/release graph", "h2")
    history = (args.manifest.parent / manifest['history']['log']).read_text(encoding='utf-8')
    for line in history.splitlines()[:30]:
        p(line, "small")
p(f"GitHub snapshot captured at {snapshot['capturedAt']}; it is historical evidence, not a claim that the live board has never changed.")
for item in snapshot["project"]["items"]:
    p(f"Issue #{item['issue']}: {item['status']}", "small")
for pull in snapshot["pulls"] + snapshot.get("releasePulls", []):
    approved = [r for r in pull["reviews"] if r["state"] == "APPROVED" and r["author"] != "MacOverlorD"]
    p(f"[PR #{pull['number']}]({pull['url']}): {pull['headRefName']} -> {pull['baseRefName']}; {pull['state']}; merge {(pull.get('mergeCommit') or {}).get('oid', 'not merged')}", "small")
    for review in approved:
        p(f"[{review['author']} approval]({review['url']}), {review['submittedAt']}; reviewed {review['commit']}", "small")
render_document("reviewer.md", ["## Implementation review", "## Release review"])
link("Setup / migration / tests / demonstration README", f"{REPO}/blob/{sha}/README.md")
link("Generated files and secrets excluded by .gitignore", f"{REPO}/blob/{sha}/.gitignore")
p("Required tree: docs/lab-04 (specification, tests, UI, API, reviewer, AI-use); server/tests/lab-04; client/tests/lab-04; e2e/lab-04; artifacts/lab-04/screenshots; scripts (audit, verification, PDF generator).")

begin(2, "Spec DD")
p("The contract was peer-approved in PR #63 on 2026-09-24 before the data implementation PR #64 merged on 2026-09-28 and before all later feature completions. This chronology is confirmed by the review snapshot, rather than inferred from the current document timestamp.")
render_document("specification.md")
link("Exact schema, types, indexes, migration/backfill and recovery contract", f"{REPO}/blob/{sha}/docs/lab-04/data-migration.md")
p("Design decisions: Restrict foreign keys preserve audit relationships; versioned writes prevent silent lost updates; workCycle separates reopened work; ordered indexes support ownership/status dashboard queries. Migration preserves legacy rows, defaults workCycle=1, invents neither Actions nor resolvedAt. Seed is idempotent and avoids overwriting user-managed state.")

begin(3, "Test DD and traceability")
p("Planned cases were established with the contract. The current plan records implementation results separately from final-main verification. A prior feature-branch pass is never relabelled as a main pass.")
if manifest:
    p(f"Observed verification mode: {manifest['mode']}; SHA {manifest['commit']}; overall passed={manifest['passed']}.")
    for command in manifest["commands"]:
        p(f"{command['command']} - exit {command['exitCode']}; finished {command['finishedAt']}; output SHA-256 {command['sha256']}", "small")
    quality = (args.manifest.parent / "quality-all.txt").read_text(encoding="utf-8")
    summaries = [clean(re.sub(r"\x1b\[[0-9;]*m", "", line)).strip() for line in quality.splitlines()
                 if re.search(r"Test Files|Tests\s+\d|\d+ passed \(", line)]
    p("Observed aggregate output", "h2")
    for line in summaries:
        p(line, "small")
else:
    p("No exact-main verification manifest has been supplied. Final-main output is pending.")
render_document("tests.md", ["## 2.", "## 3.", "## 4.", "## 5."])

begin(4, "AI use with reflection")
render_document("ai-use.md")

begin(5, "Working IT Staff dashboard")
p("Operational metrics use authoritative backend queries: unassigned and owned-by-me count the five active Ticket states; byStatus covers all eight states; byPriority covers active Tickets. Assigned Actions require active parent/current cycle and actor assignment. Performed work requires COMPLETED, performer=actor and the inclusive seven-day completion window. Creator, assignee and performer remain distinct.")
p("Dashboard API tests compare each metric with direct Prisma queries, including enum-zero keys, UTC snapshot boundaries, 10-item limits, descending timestamp/ID ties and formula-preserving drill-down result totals. Administrator account counts are omitted for Staff. Component/browser tests cover loading, zeros, failure, role denial and responsive navigation.")
link("Database-query and drill-down assertions", f"{REPO}/blob/{sha}/server/tests/lab-04/dashboard.api.test.ts")
figure("operations-dashboard", "dashboard-mobile.png", "Staff dashboard: nonzero current-user operational overview, mobile.", height=700)

begin(6, "Working Actions Taken UI")
p("Ticket Detail supports list, create, assign/unassign, edit, start, complete and cancel. One Ticket may contain multiple Actions by different staff. The server supplies creator and completion-time performer; assignee eligibility is checked inside the write transaction. PLANNED -> IN_PROGRESS/COMPLETED/CANCELLED and IN_PROGRESS -> COMPLETED/CANCELLED are the only allowed Action edges.")
p("Description is 1-2000 Unicode code points; completion result 1-4000; follow-up note 1-1000 and required only when true; evidence notes 1-1000 if supplied. Time must be a timezone-qualified ISO instant within +5 minutes. Inactive/non-operational assignees reject; requester writes return 403; cross-owner reads return non-disclosing 404. Repeated keys replay the same create, changed payloads conflict, stale versions preserve newer state, and recoverable UI failures retain drafts.")
link("Action API lifecycle, validation, ordering and concurrency tests", f"{REPO}/blob/{sha}/server/tests/lab-04/actions.api.test.ts")
link("UI modes, draft recovery and first-invalid focus", f"{REPO}/blob/{sha}/client/tests/lab-04/ActionsTaken.test.tsx")
figure("actions", "ticket-actions-mobile.png", "Planned Action with assignment and lifecycle controls.", height=990, max_width=86*mm)
story.append(PageBreak())
p("Multiple Actions on the same Ticket", "h2")
figure("actions", "ticket-actions-mobile.png", "Completed Actions preserve work time, result and actual performer; terminal records are read-only.", top=990, height=1050, max_width=105*mm)

begin(7, "Working Ticket workflow")
p("The self-contained 19-edge matrix is rendered in Part 2. Only Staff/Admin execute formal transitions; owner and confirmation requirements are enforced server-side. Requester indication is advisory. Resolution requires a completed nonblank-result Action in the current work cycle; reopen increments the cycle and clears resolution metadata, so old work cannot resolve a new cycle.")
p("Terminal Actions are immutable, corrections append a new Action referencing the old ID, and communication remains append-only. Shared-safe requester projections omit internal notes and operational control fields. Lists are ordered by createdAt DESC, id DESC; API tests verify stable ties and role visibility. Ticket-workflow tests exhaust both allowed and forbidden edges, direct gate bypass, concurrent conflicts and reopen cycles.")
link("Workflow transaction and gate coverage", f"{REPO}/blob/{sha}/server/tests/lab-04/ticket-workflow.test.ts")
figure("ticket-workflow", "staff-ticket-detail-mobile.png", "Owner, IT priority and permitted next-status controls, mobile.", top=1180, height=570)

begin(8, "Requester dashboard and final regression")
p("Every requester metric includes requesterId=authenticated actor. Open excludes RESOLVED/CLOSED/CANCELLED; waiting is WAITING_FOR_REQUESTER; recently resolved covers RESOLVED/CLOSED in [asOf-604800000ms, asOf]. Attention/recent lists have a ten-record cap and stable ID tie-break. Drill-downs retain the exact ownership, status and time predicates.")
p("Main verification executes the existing Labs 1-3 browser configuration and the Lab 4 configuration: authentication/password change, My Tickets/create/detail, attachment upload/download/removal, public comments, Staff queue/detail/workflow, private Internal Notes, Administrator user creation/update/deactivation guards, and safe role denial. Tests are stronger evidence for failure/authorization states than a happy-path screenshot.")
link("Integrated critical-route regression", f"{REPO}/blob/{sha}/e2e/lab-04/regression.spec.ts")
link("Earlier end-to-end suites", f"{REPO}/tree/{sha}/e2e/lab-03")
figure("requester-dashboard", "dashboard-mobile.png", "Requester-owned metrics and attention/recent work, mobile.", height=700)

begin(9, "Zen Green, responsive, accessibility and final polish")
render_document("ui-spec.md")
p("Completed integration visual checklist: shared green shell and navigation; labelled metric drill-downs; text/icon status cues; editable versus read-only Actions; first-invalid focus; disabled pending controls; keyboard focus/return; content-loaded captures; no clipping, overlap or document horizontal overflow at 1440, 768, 390 and 320px. Axe checked populated Requester/Staff/Admin critical screens with no serious/critical violations. These are the approved PR #70 integration findings; final-main reruns must also pass before final submission.")
link("Full executed visual/accessibility checklist and performance limits", f"{REPO}/blob/{sha}/docs/lab-04/issue-61-evidence.md")
for folder, prefix in [("operations-dashboard", "dashboard"), ("requester-dashboard", "dashboard"),
                       ("actions", "ticket-actions"), ("ticket-workflow", "staff-ticket-detail")]:
    story.append(PageBreak())
    p(f"{folder}: desktop and tablet", "h2")
    figure(folder, f"{prefix}-desktop.png", "Desktop 1440px (Action region is narrower).", height=450)
    figure(folder, f"{prefix}-tablet.png", "Tablet 768px; no page-level horizontal overflow.", height=500)
    story.append(PageBreak())
    p(f"{folder}: narrow mobile boundary", "h2")
    figure(folder, f"{prefix}-boundary-320.png", "320px boundary extract; full-height evidence linked.", height=1000)

def footer(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 8)
    canvas.setFillColor(GREEN)
    canvas.drawString(18 * mm, 12 * mm, f"TokTickIT Lab 4 | {sha[:12]}" + (" | PREVIEW" if args.preview else ""))
    canvas.drawRightString(192 * mm, 12 * mm, str(doc.page))
    canvas.restoreState()

SimpleDocTemplate(str(OUT), pagesize=A4, leftMargin=18*mm, rightMargin=18*mm,
                  topMargin=18*mm, bottomMargin=20*mm,
                  title="TokTickIT Lab 4 Submission" if not args.preview else "TokTickIT Lab 4 Preview",
                  author="MacOverlorD").build(story, onFirstPage=footer, onLaterPages=footer)
print(OUT)
