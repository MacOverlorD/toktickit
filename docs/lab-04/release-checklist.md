# Issue #62 Release and Submission Checklist

Status: release preparation in progress. This file is deliberately not a final-main passing certificate.

## Review and integration sequence

1. Review `feature/4-09-release-submission` against `lab4-staging`, including evidence tooling, reflection provenance, dependency updates, and document changes. Obtain genuine peer review and merge using a merge commit.
2. Open a release PR from `lab4-staging` to `main`. Obtain a separate peer approval of the complete release diff and merge using a merge commit (do not squash away feature/staging history).
3. Fetch `origin/main`; use a clean worktree whose HEAD equals the exact fetched main SHA. Install dependencies from lockfiles and configure the ignored `server/.env` locally. Never commit credentials.
4. Run `npm run verify:release:lab4`. It records generate/deploy/status, two seed runs, client/server/build/both browser suites, exact SHA, timestamps, output hashes, and exit codes. A candidate run is useful but does not satisfy final-main verification.
5. Refresh GitHub review evidence, record the release PR approval and merge, and generate the PDF against that SHA. Verify immutable links and render every page. Exactly one Lab 4 submission PDF is delivered; do not submit the lab handout or preview as another submission file.
6. Only after release checks and PDF QA succeed, close #62 and set its Project item Done. Capture the final all-Done board and refresh the final PDF's workflow evidence. Do not change the tested main source merely to insert its own SHA into a committed PDF.

## Commands

Release tooling needs Node/npm/Git/GitHub CLI plus Python 3 with `reportlab`, `Pillow`, `pdfplumber` and `pypdf` installed. Poppler's `pdftoppm` is required for visual PDF QA. These are document-authoring prerequisites, not server runtime dependencies. Install the Python packages with `python -m pip install reportlab Pillow pdfplumber pypdf` if absent.

```powershell
npm run audit:docs:lab4
npm run verify:release:lab4 -- --candidate
# After the reviewed release merges, from a clean exact-main worktree:
git fetch origin main
npm run verify:release:lab4
# Keep the final live review/Project snapshot outside tracked source:
$releaseSha = git rev-parse HEAD
$env:TOKTICKIT_REVIEW_SNAPSHOT="artifacts/lab-04/release-results/$releaseSha/review-history.json"
# Replace N with the real staging-to-main release PR number:
npm run evidence:reviews:lab4 -- N
Remove-Item Env:TOKTICKIT_REVIEW_SNAPSHOT
python scripts/generate-lab4-submission.py --manifest "artifacts/lab-04/release-results/$releaseSha/verification.json" --snapshot "artifacts/lab-04/release-results/$releaseSha/review-history.json"
python scripts/check-lab4-pdf.py output/pdf/TokTickIT_Lab4_Submission.pdf
pdftoppm -png output/pdf/TokTickIT_Lab4_Submission.pdf tmp/pdfs/lab4-final
```

Verification output is ignored under `artifacts/lab-04/release-results/<full-SHA>/` so recording results does not dirty the source commit. The one final PDF belongs under `output/pdf/TokTickIT_Lab4_Submission.pdf`; this generated delivery artifact remains ignored so its exact-main reference is not self-referential. Source documents, review snapshots, audit scripts and PDF source are version-controlled.

## Rubric evidence map

| Heading | Required evidence | Source |
|---|---|---|
| Answer Part 1 | Feature -> staging -> main history; all-Done board; reviewer identity/findings/replies/approvals; README/ignore/tree | `reviewer.md`, `review-history.json`, release PR and exact-main manifest |
| Answer Part 2 | Rendered specification; FR/BR/AC; transitions; calculations; data decisions/DoD; spec predates implementation | `specification.md`, `data-migration.md`, PR #63 chronology |
| Answer Part 3 | Rendered test plan; planned cases and AC mapping; real files; final-main passing output | `tests.md`, exact-main verification logs |
| Answer Part 4 | LLM; eight actual selected prompts; My Reflection | `ai-use.md` (student input, AI-assisted wording) |
| Answer Part 5 | Staff metrics/current-user Actions/lists/drill-downs; state feedback; DB query agreement | `dashboard.api.test.ts`, `Dashboards.test.tsx`, `dashboards.spec.ts`, operational PNGs |
| Answer Part 6 | Action list/create/assign/edit/start/complete/cancel; validation/inactive assignee/roles/failure; multiple Actions | `actions.api.test.ts`, `ActionsTaken.test.tsx`, `actions-taken.spec.ts`, Action PNGs |
| Answer Part 7 | Ticket edges; stable Action ordering; append-only history; role visibility | `ticket-workflow.test.ts`, Lab 3 communication tests, workflow PNGs |
| Answer Part 8 | Requester ownership/metrics/attention/drill-down; all earlier critical functions | dashboard tests, Lab 3 suites, `regression.spec.ts`, archived earlier PNGs |
| Answer Part 9 | Rendered UI spec; desktop/tablet/mobile/320; completed design and accessibility audit | `ui-spec.md`, `issue-61-evidence.md`, axe tests, 16 promoted PNGs |

## Final gates

- [x] Issues #54-#61 closed and Project Done after actual approved merges.
- [x] Eight feature PRs, reviewer identities, finding/reply pairs and approval SHAs collected from GitHub.
- [x] Eight selected real prompt summaries and student-supplied reflection recorded.
- [ ] Issue #62 preparation PR peer-approved and merged into staging.
- [ ] Separate staging-to-main release PR peer-approved and merged.
- [ ] Exact merged-main SHA passes all verification commands with retained output.
- [ ] One nine-part PDF produced, links checked, all pages rendered and visually reviewed.
- [ ] Issue #62 closed and final all-Done Project evidence captured.

Name and student ID are intentionally left blank in the submission for the student to fill in, as requested.

The final generator requires the real merged/approved release PR and all-Done board snapshot. Prepare and visually check a preview first, complete the other acceptance gates, then close #62/mark Done and immediately refresh the final snapshot and build/check the final PDF. If the final audit fails, reopen #62 and correct the failure; never leave a failed final deliverable marked complete.

Update the source reviewer record with genuine release findings/approval/merge through a reviewed evidence-only follow-up if necessary; run exact-main verification after the last source merge. Keep final SHA certificates/PDF delivery ignored so recording the current main SHA does not itself change that SHA. Any later source change requires a new exact-main run.
