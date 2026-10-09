# Lab 4 Evidence Directory

The reviewed Issue #61 visual run contains 16 PNG screenshots across four
product areas and four required viewports. Dashboard and Ticket workflow images
are full-page; Action images focus on the complete Actions Taken region.

| Directory | State | Files |
|---|---|---:|
| `screenshots/requester-dashboard/` | owner-scoped nonzero Requester dashboard | 4 |
| `screenshots/operations-dashboard/` | nonzero Staff queue, Action, and recent-work metrics | 4 |
| `screenshots/actions/` | populated Action card and all operational controls | 4 |
| `screenshots/ticket-workflow/` | complete Staff Ticket detail and workflow context | 4 |

Each group includes `desktop` (1440 x 900), `tablet` (768 x 1024), `mobile`
(390 x 844), and `boundary-320` (320 x 700). The browser test asserts that the
document width never exceeds the viewport before each capture. The 320 px
Action and operational-dashboard images were also inspected manually for
clipping, overlap, readable labels, and non-color status cues.

Reproduce and intentionally replace the reviewed images from the repository
root with:

```powershell
$env:PROMOTE_LAB4_EVIDENCE='1'
npm run test:e2e:lab4 -- --grep "captures"
Remove-Item Env:PROMOTE_LAB4_EVIDENCE
```

Ordinary runs write temporary captures, HTML reports, traces, and failure
screenshots to ignored paths under `artifacts/lab-04/`. See
`docs/lab-04/issue-61-evidence.md` for the full execution record.
