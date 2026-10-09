# Lab 4 AI-Use Record

Status: active log; student reflection pending.

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

## Assistance boundaries

AI suggestions are proposals, not peer approval or test evidence. Credentials and secrets must not be inserted into prompts or committed. Any suggested domain choice is recorded in `decisions.md` and remains proposed until reviewed. Generated text is checked against the handout and actual codebase; commands/results are recorded only when observed.

## Student reflection

Pending. The student must personally write the final reflection covering useful assistance, changes/rejections, verification performed, limitations/risks, and lessons learned. It must not be fabricated by the AI.
