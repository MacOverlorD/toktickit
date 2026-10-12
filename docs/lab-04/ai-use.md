# Lab 4 AI-Use Record

Status: active release log; My Reflection is based on the student's supplied account and request to elaborate it. Release approval and final-main checks remain pending.

## Tool

- System used: OpenAI Codex.
- Purpose: analyze the Lab 4 handout, identify domain ambiguities, plan traceable issues, and draft the initial engineering contract.
- Human responsibility: verify requirements and decisions, review every repository change, run/interpret tests, obtain genuine peer review, and write the final personal reflection.

## Selected prompt log

The final submission requires 6-10 selected prompts. Only prompts actually used are recorded; more will be added as work proceeds.

| Seq. | Prompt summary | How the output was used | Human verification/status |
|---|---|---|---|
| 1 | Read `docs/lab-04/SE+Lab+4.pdf` carefully and summarize how many issues are needed. | Produced a nine-issue dependency plan covering contract, data, API, UI, workflow, dashboards, hardening, and release. | Checked against all handout sections; setup accepted by the student. |
| 2 | Start the setup. | Created label/issues/Project states, isolated branches/worktree, and draft contract documents. | Repository and GitHub results must be reviewed before Issue #54 approval. |
| 3 | Continue after Issue #58 was merged and implement the next issue. | Closed merged Issue #58 and implemented Issue #59 Requester Dashboard from the approved API/UI/test contracts, including authoritative metrics, drill-downs, responsive UI, and automated evidence. | Builds, targeted API/UI tests, full server/client regression, and Lab 4 browser tests were executed; peer review remains required before merge. |
| 4 | Continue after the Requester Dashboard PR was merged and implement the next issue. | Implemented Issue #60 operational dashboard for Staff/Admin, including session-derived metrics, current-cycle Actions, exact queue drill-downs, Administrator summary, responsive UI, and traceable tests. | Build, API, component, queue, and browser evidence were executed; peer review remains required before merge. |
| 5 | Address every requested change on the operational-dashboard PR, reply per thread, and request approval again. | Used the peer findings to add an active queue scope, a distinct performed-Action projection/drill-down, and post-load Action hash focus, with result-set and browser regression coverage. | Build passed; full server 185, client 163, and Lab 4 browser 7-test suites passed before the revision was returned for peer approval. |
| 6 | Continue after the operational-dashboard PR was merged and implement the next issue. | Implemented Issue #61 integrated hardening: full role/route regression, axe accessibility checks, keyboard-focus verification, a 1,000-Ticket/5,000-Action performance smoke, four-viewport evidence, migration/seed checks, and current setup/verification documentation. | The student should inspect the 16 promoted screenshots and review the measured commands/results in `issue-61-evidence.md` before approving the PR. |
| 7 | Address PR #70's requested changes, reply to each comment, and request approval again. | Corrected the aggregate test command, loaded-state screenshot/axe readiness, tablet overflow, and reproducible schema-isolated performance workload. | Real replies and approval of `0b95dbc` are preserved in `reviewer.md` and the GitHub snapshot; PR #70 merged as `c0ec977`. |
| 8 | Do the final issue. Leave name/student ID blank; expand the supplied reflection. | Prepared release-review records, a nine-part submission source, document auditing, and exact-main verification tooling. | Final release review/merge, exact-main rerun, PDF rendering and final Project completion are separate remaining gates, not inferred from earlier test results. |

## Assistance boundaries

Review follow-up for prompt 6 used PR #70's four peer findings to complete the
root aggregate command, wait for loaded content before axe/screenshots, fix
the responsive header, regenerate the 16 images, and measure performance in a
fresh schema with asserted baseline/fixture counts. Actual commands and
controlled-schema p95 values are recorded in `issue-61-evidence.md`; genuine
peer approval was subsequently recorded for PR #70. It does not approve the release PR.

AI suggestions are proposals, not peer approval or test evidence. Credentials and secrets must not be inserted into prompts or committed. Any suggested domain choice is recorded in `decisions.md` and remains proposed until reviewed. Generated text is checked against the handout and actual codebase; commands/results are recorded only when observed.

## My Reflection

AI helped me work on parts of the project that I did not yet understand. In the specification-agent role, it helped turn the lab sheet into clearer requirements, business rules, and a manageable issue plan. In the coding-agent role, it helped connect those requirements to implementation, tests, documentation, and the review workflow.

I checked information by finding references instead of assuming an AI answer was correct. The important lesson is that generated code or a confident explanation is not enough: it must agree with the requirements, reliable references, actual test results, and peer-review findings. When an answer or implementation needs correction, the evidence should guide the change.

This project helped me learn how real-world software work is organized: specification, issues, feature branches, review, revision, staged integration, and release verification. AI made unfamiliar work more approachable, but responsibility for understanding the result and deciding whether it meets the requirements remains with me. I would continue using AI as an assistant while checking its assumptions and avoiding invented evidence.

Provenance: the student stated that AI helped with unfamiliar work, that verification used references, and that the project taught real-world workflow, then asked for that account to be expanded. Codex edited the wording; it does not attribute unreported manual test execution or specific rejected suggestions to the student.
