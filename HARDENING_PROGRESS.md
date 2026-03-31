# SSC Skill Hardening — Progress Tracker
# Ralph Wiggum Mode: "I'm helping!"
# Started: 2026-03-31
# Skill version: v16.9 → v17.0 (hardened) ✅ ALL COMPLETE

## Plan Overview

| # | Change | Status | Notes |
|---|--------|--------|-------|
| H1 | Extract Section A + B into standalone files | COMPLETE | Eliminates shell extraction crashes |
| H2 | Add client-side error boundary to HTML | COMPLETE | No more blank dashboards |
| H3 | Build `build_dsz()` Python function in skill | COMPLETE | Eliminates manual DSZ injection errors |
| H4 | Consolidate rules (47 PDs + 60 NNRs → ~15) | COMPLETE | 20 active + 27 automated; scannable table + archive |
| H5 | Add `validate_ds_path()` function | COMPLETE | Single call finds ALL errors at once |
| H6 | Fix Google Fonts violation in HTML | COMPLETE | System fonts only — zero external requests |
| H7 | Reduce skill file size | COMPLETE | 503KB → 225KB (55% reduction) |

## Milestone Log

### H1 — Extract Section A + B ✅ COMPLETE
- [x] Read Section A boundaries from skill file (lines 3523-4181, 659 lines)
- [x] Extract Section A to `ssc_section_a.html` (42,301 chars)
- [x] Read Section B boundaries from skill file (lines 4230-6075, 1846 lines)
- [x] Extract Section B to `ssc_section_b.js` (125,223 chars)
- [x] Update skill file Step 6 to 3-tier fallback (standalone → cache → markdown extraction)
- [x] Verify no markdown contamination in either file
- [x] Test: reassemble shell → 167,563 chars, 2 script tags, all 41 required functions present
- [x] Update deployment guide to mention standalone files
- **Note:** `_getQuota` correctly absent from Section B — it's injected via DSZ template

### H2 — Client-side error boundary ✅ COMPLETE
- [x] Added try/catch wrapper to main DOMContentLoaded in Section B (standalone + SKILL.md)
- [x] Error panel: shows error message, auto-diagnosis (ae.n, q1Label, ReferenceError, TypeError), stack trace, fix instructions
- [x] Tested BROKEN data (missing ae.n): error panel renders with correct diagnosis "ae.n field missing from AE_DATA (NNR #33)"
- [x] Tested GOOD data: dashboard renders normally — error boundary does not interfere
- [x] Browser-verified via Playwright: screenshot confirms error panel visible, not blank page
- [x] Synced error boundary to both standalone file AND inline SKILL.md Section B

### H3 — `build_dsz()` Python function ✅ COMPLETE
- [x] Function takes validated DS_PATH dict → complete DSZ JS string
- [x] Pre-flight assertions catch: missing closeDate (NNR#40), missing ae.n (NNR#33), non-int ae.deals (PD#18), non-null nowsell (PD#17), missing q1Label (NNR#34), missing q2/q3/q4 sub-objects (NNR#34), non-dict SCRIPT entries (NNR#36)
- [x] All canonical var names: PIPE_Q1, WON_CQ, CLOSED_LOST, AE_DATA, QUOTA_DEFAULTS, QUOTA_MAP IIFE, _getQuota, _QTR_META, _QTR_STATS, TERR_SUMMARY, DEAL_TRENDS, SCRIPT
- [x] Inserted into skill file after function helpers section
- [x] Step 7 updated: `dsz_vars = build_dsz(ds)` replaces 40-line manual f-string
- [x] Tested: correct data → generates all vars; bad data (close instead of closeDate) → AssertionError caught
- **Eliminates PD #16, #17, #18, #22, #33, #34, #36, #40 as manual compliance items**

### H4 — Consolidate rules ✅ COMPLETE
- [x] Audited all 47 PDs — classified as ACTIVE (20) / AUTOMATED (27)
- [x] NNRs remain inline with code (no separate section needed — they're contextual)
- [x] Moved 27 automated rules to POSTMORTEM ARCHIVE section (collapsible `<details>` blocks)
- [x] Rewrote active rules as scannable table (20 rows × 3 columns: #, Rule, Blocker?)
- [x] Verified all 47 PDs accounted for: 20 active + 27 automated = 47
- [x] Added v17.0 Hardening note explaining which systems enforce which rules
- [x] File size reduced from 515KB → 480KB (35KB savings from PD consolidation alone)
- **Key change:** PD section went from 79 lines of dense paragraphs to a 20-row table + summary

### H5 — `validate_ds_path()` function ✅ COMPLETE
- [x] Written `validate_ds_path(ds)` — checks 18 data invariants in one call
- [x] Returns `(errors, warnings)` — errors are blockers, warnings are printed but don't block
- [x] Inserted into skill file before VALIDATION MANIFEST; manifest now calls it
- [x] Checks: PIPE_Q1 schema (14 fields), closeDate/close naming, nowsell null, engagements present, unique num keys, next steps coverage, AE_DATA n/name match, deals int, coachNarrative, pipeActions, _QTR_META q1Label + sub-objects, _QTR_STATS FWD slots, SCRIPT {text,seq} format, WON_CQ/CLOSED_LOST types
- [x] Type guard: `isinstance(deals, int)` check before `> 0` comparison prevents crash when deals is wrong type
- [x] Tested GOOD data: 0 errors ✅
- [x] Tested BAD data (11 deliberate failures): all 11 caught in one pass ✅
- [x] Tested EMPTY data: 7 structural errors caught ✅
- **Key change:** User sees ALL problems at once instead of crashing on first assert

### H6 — Fix Google Fonts ✅ COMPLETE
- [x] Removed `<link href="fonts.googleapis.com...">` from `servicenow-sales-command-centre.html` (line 7)
- [x] Updated `--font` from `'Source Sans 3',sans-serif` to `-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif`
- [x] Updated `--mono` from `'Source Code Pro',monospace` to `'SF Mono','Consolas','Courier New',monospace`
- [x] Verified `ssc_section_a.html` already used system fonts (no change needed)
- [x] Verified `SKILL_SSC_v16_9.md` inline Section A already used system fonts (no change needed)
- [x] Grep confirmed zero external resource requests across all 3 files
- [x] Playwright screenshot confirms dashboard renders correctly with system fonts
- **Note:** Claude.ai sandbox blocks external requests — Google Fonts `<link>` was render-blocking

### H7 — Reduce skill file size ✅ COMPLETE
- [x] Starting size: 503KB (515,097 chars)
- [x] Removed inline Section A (42KB) — extracted to `ssc_section_a.html` by H1
- [x] Removed inline Section B (125KB) — extracted to `ssc_section_b.js` by H1
- [x] Extracted Changelog (74KB) to `SSC_CHANGELOG.md` — full version history preserved
- [x] Removed Fix History (10KB) — 21 historical fixes now in changelog
- [x] Replaced all removed sections with stub references to standalone files
- [x] Final size: 225KB (230,013 chars) — **55% reduction**
- [x] Final integrity check: all 42 markers passed (PDs, Steps, functions, variables, templates)
- **Note:** <100KB target not achievable — remaining 225KB is core execution logic (Steps 0-12, Python code, Snowflake queries). Cannot be removed without breaking the skill. 225KB is well within Claude's reliable processing window.
