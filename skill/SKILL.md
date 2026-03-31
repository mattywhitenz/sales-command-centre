---
name: servicenow-sales-command-centre
version: v17.0
updated: 2026-03-31
author: Grant Thomson — ANZ FSI, ServiceNow
description: >
  Generates the ServiceNow Sales Command Centre — coaching-first HTML pipeline dashboard
  for any ServiceNow territory. Trigger on: "sales q1/q2/q3/q4", "my pipeline", "war room",
  "command centre", "coaching dashboard". Current version: v16.9. See CHANGELOG for full history.
triggers:
  - "sales command centre"
  - "sales q2"
  - "sales q1"
  - "sales q3"
  - "sales q4"
  - "command centre"
  - "my pipeline"
  - "pipeline report"
  - "pipeline dashboard"
  - "pipeline command centre"
  - "nnacv pipeline"
  - "give me my report"
  - "what's my pipeline"
  - "coaching dashboard"
  - "war room"
  - "build dashboard"
  - "build the dashboard"
  - "generate dashboard"
  - "refresh data"
---

# ServiceNow Sales Command Centre — Skill v17.0 (Hardened)

**Canonical output:** `servicenow-sales-command-centre.html`
**Persistent shell:** `SHELL_PATH = /mnt/user-data/outputs/ssc_shell_{SESSION_KEY}.html` (session-namespaced, survives between sessions)

---

## ⚠️ PRIME DIRECTIVES — READ BEFORE ALL ELSE

**These directives are IMMUTABLE. They apply on every run, every territory, every quarter. No exceptions.**

> **v17.0 Hardening:** 25+ former PDs are now **automatically enforced** by `build_dsz()` (H3), the error boundary (H2), standalone file loading (H1), and Step 5 code guards. They are archived in the [POSTMORTEM ARCHIVE](#postmortem-archive) section. The rules below require **Claude's active judgement** at runtime.

### ACTIVE RULES — Claude must apply these on every run

| # | Rule | Blocker? |
|---|------|:---:|
| PD 1 | **Territory auto-detection** — run Step 0 before any data query | DEPLOY |
| PD 2 | **Python validation before HTML** — data is validated in Step 5, then injected in Step 7 | DEPLOY |
| PD 3 | **Template is canon** — never rewrite HTML from scratch; only replace DATA SWAP ZONE | DEPLOY |
| PD 4 | **`node --check` + named function validation** — extract each `<script>` block, check separately; validate all 41 functions by name (not count) | DEPLOY |
| PD 5 | **Net NNACV is absolute** — `SUM(nnacv_usd_cfx)` per opty across ALL SKU rows; never filter `> 0` | DEPLOY |
| PD 6 | **Closed Lost downsells always run** — Call 2b fires every time; zero results = valid | DEPLOY |
| PD 7 | **Probability from stage string** — extract `(X%)` from stage name; Snowflake decimal is unreliable | DEPLOY |
| PD 8 | **Forward quarter stats mandatory** — Step 3 fires 3 separate queries with explicit BETWEEN ranges; `"--"` in any `_QTR_STATS` slot = blocker | DEPLOY |
| PD 9 | **Disk-first pattern** — write all data to `DS_PATH` (session-namespaced) before touching HTML; Steps 6–12 read from `DS_PATH` only | DEPLOY |
| PD 13 | **AE from Snowflake only** — use `parent_opportunity_sales_rep_name`; no hardcoded account-to-AE maps; blank = Unassigned | DEPLOY |
| PD 23 | **Coaching is deal-aware** — `coachNarrative` and `actions` must name real accounts, deal values, and NowSell gaps; generic text = quality fail | QUALITY |
| PD 27 | **KNOWN_AES territory-specific** — rebuild from Call H for every new territory; never assume ANZ FSI names apply elsewhere | DEPLOY |
| PD 31 | **Quota Snowflake-first** — pull from `GTM_SALES_REP_QUOTA` before asking manager to type; manual entry only for gaps | — |
| PD 41 | **Engagements from Call 1f** — fire Dynamics engagement pull in parallel with M1/M2/M3; populate `d.engagements` per deal | QUALITY |
| PD 42 | **RACI badges mandatory** — TV milestone owner is SC not AE; coaching probes for TV must target SC | QUALITY |
| PD 43 | **Deal Review flags** — Stage 3 and 4b deals show ⭐ Deal Review Required banner in hygiene modal | QUALITY |
| PD 44 | **Next Steps keyword evidence** — scan `nextSteps`/`notesSummary` for milestone keywords; surface as evidence only (never scoring) | QUALITY |
| PD 45 | **Engagement-first scoring** — `_nowsellScore()` checks `d.engagements[mk]` first; stage-inference is fallback only | QUALITY |
| PD 46 | **Checkpoint recovery** — check for `data_swap_*.json` with `status == "data_complete"` at START of every run; if found, skip Snowflake, rebuild HTML | DEPLOY |
| PD 47 | **Node execution-mode simulation** — run all 4 render functions against mock DOM stubs; syntax-only `--check` is insufficient | DEPLOY |

### AUTOMATED RULES — enforced by code, no Claude action needed

These 27 PDs are **automatically enforced** by hardened code. Full text in [POSTMORTEM ARCHIVE](#postmortem-archive).

| Enforced by | Rules |
|-------------|-------|
| `build_dsz()` (H3) | PD 16 (var names), PD 17 (nowsell=null), PD 18 (ae.deals int), PD 22 (QUOTA_MAP+_getQuota), PD 24 (q1Label), PD 33 (ae.n field), PD 34 (_QTR_META sub-objects), PD 35 (AE enrichment), PD 36 (SCRIPT {text,seq}), PD 40 (closeDate not close) |
| Standalone files (H1) | PD 10 (shell loading order), PD 12 (byte-position extraction — superseded by standalone files) |
| Error boundary (H2) | Client-side crash → visible error panel with auto-diagnosis replaces blank page |
| Step 5 code guards | PD 14 (unique num keys), PD 15 (strip stage values from nextSteps), PD 19 (Call 1b unconditional), PD 20 (SKU-sum + dedup), PD 25 (M1/M2/M3 split prevents truncation), PD 26 (next steps coverage assert), PD 28 (shell validation — placeholder check), PD 29 (Call H for roster), PD 30 (session namespacing), PD 32 (NNACV regression check) |
| Shell construction | PD 11 (no external fonts — system stacks only), PD 21 (placeholder inside `<script>` block) |
| Execution flow | PD 37 (Step 3 mandatory), PD 38 (no CQ data in FWD slots), PD 39 (Call 1b coverage gate) |

---

## ⚠️ DEPLOYMENT GUIDE — RUNNING SSC FOR ADDITIONAL USERS AND TERRITORIES

**Read this before deploying to any user beyond the original ANZ FSI territory.**

### Pre-deployment checklist (5 items — all mandatory)

1. **Territory name** — Exact string from Snowflake `territory_district` (e.g. `ANZ FSI`, `APAC ENT`, `EMEA FS`). Wrong territory = silent zero pipeline. Confirm in Step 0.
2. **Manager name** — Must match `parent_opportunity_sales_rep_name` exactly as Snowflake stores it. Used to exclude the manager from AE lists.
3. **AE roster** — For any territory that is NOT ANZ FSI, the KNOWN_AES defaults do NOT apply. Call H1/H2/H3 must resolve the team. If H1 returns zero rows, the manager must supply AE names manually.
4. **Quotas** — Source from H1 first. Any AE missing from H1 must be confirmed manually. Never guess.
5. **Shell file** — Confirm `/mnt/user-data/outputs/ssc_shell.html` (or session-namespaced variant) contains `@@DATA_SWAP_ZONE@@` before trusting it. If it's a previously-deployed dashboard, fall back to SKILL.md extraction.

### The 10 most common failure modes — diagnosis and fix

| # | Symptom | Root cause | Fix (NNR ref) |
|---|---------|-----------|---------------|
| 1 | All tabs blank, console: `Cannot read properties of undefined (reading 'replace')` | `_QTR_META.q1Label` missing OR `ae.n` missing from AE_DATA | Add `q1Label` to `_QTR_META`; add `n` field to every AE_DATA entry (NNR #33, #34) |
| 2 | `UNDEFINED× COV` on all coaching cards | AE enrichment loop not running before `renderCoach()` | Inject enrichment into DOMContentLoaded before renderAE() (NNR #35) |
| 3 | Forward quarter cards show `—` | Step 3 queries were skipped | Step 3 is mandatory — fire all 3 forward quarter queries (NNR #37) |
| 4 | Forward quarter cards show same value as CQ | CQ data incorrectly copied to forward quarter slots | Each slot uses its own Snowflake result only (NNR #38) |
| 5 | War Room panel blank | SCRIPT entries are plain strings not `{text, seq}` objects | Wrap as `{"text": s, "seq": i}` (NNR #36) |
| 6 | CQ Pipeline stat card shows `— deals · net NNACV` | DOMContentLoaded crashed — usually NNR #33 or #34 | Fix the TypeError crash first; stat card populates automatically |
| 7 | Pipeline total wrong vs Dynamics | Full-quarter Snowflake query truncated | Use M1/M2/M3 monthly split — never single full-quarter query (RULE P1) |
| 8 | NAB renewal shows $405K not $5.73M | SKU accumulation bug — only first row taken | Use `opty_map[opty]['nnacv'] += nnacv` not `= nnacv` (PD #20) |
| 9 | NowSell badges all red | `nowsell` is non-null object in PIPE_Q1 | Set `d['nowsell'] = None` on every deal (PD #17) |
| 10 | Dashboard renders as raw code | Shell contaminated with markdown during extraction | Use byte-position extraction with exact `## SECTION A` / `## SECTION B` markers (PD #12) |
| 11 | Next steps blank on all deals in STATUS tab | Pre-aggregated M1/M2/M3 queries return blank next steps; Call 1b not run | Run Call 1b batch next steps fetch when coverage < 20% after M1/M2/M3 (NNR #39) |
| 12 | Close date shows `undefined` on all deals | PIPE_Q1 uses `close` field but Section B reads `d.closeDate` | Rename field to `closeDate` in Step 5; assert canonical deal schema before deploy (NNR #40) |
| 11 | Most deals show "No Next Steps recorded" | Call 1b skipped — `MAX()` aggregation picks wrong row | Call 1b is unconditional — always fires in parallel with Call 1 M1/M2/M3 (NNR #19) |

### User setup — what to tell a new user

No installation. No software. Three steps:

1. Open Claude.ai in Chrome (recommended) or Safari
2. Type any trigger phrase: `"sales q2"`, `"my pipeline"`, `"command centre"`, or `"war room"`
3. Answer the Step 0 questions: territory name, your name, confirm AE roster and quotas

The skill handles everything else. First run takes 3–5 minutes (Snowflake queries + HTML generation). Subsequent runs are faster (~90s) because the HTML shell is cached from the first run.

### Admin notes — workspace configuration

- **Skill file location:** `/mnt/skills/user/servicenow-sales-command-centre/SKILL.md`
- **Standalone template files (v17.0+):** `ssc_section_a.html` and `ssc_section_b.js` in the same directory — these eliminate shell extraction failures entirely. If missing, the skill falls back to byte-position extraction from SKILL.md.
- **Output files:** `/mnt/user-data/outputs/servicenow-sales-command-centre.html` (dashboard) and `ssc_shell*.html` (cached template)
- **Do NOT clear `/mnt/user-data/outputs/` between sessions** — deleting shell files forces a slower SKILL.md re-parse on next run (safe, but adds ~15s)
- **Multi-user isolation:** Each session is namespaced by `manager+territory+quarter` slug. Concurrent users do not collide.
- **Data freshness:** Pipeline data is live from Snowflake on every run. No pipeline data is cached between sessions — only the HTML template is cached.
- **If dashboard is blank:** Open browser DevTools → Console → first error is always the root cause → cross-reference the failure mode table above → fix takes under 2 minutes in almost all cases.

---

## ⛔ IMMUTABLE PIPELINE SOURCING RULES — THESE OVERRIDE EVERYTHING ELSE

**The following three rules are the highest-priority constraints in this skill. They cannot be overridden by any other instruction, any convenience shortcut, or any time pressure. If they conflict with anything else in this document, these rules win.**

**RULE P1 — ALL PIPELINE DATA COMES FROM SNOWFLAKE. NO EXCEPTIONS.**
Pipeline data MUST be pulled from Snowflake via the mandatory Call 1 M1/M2/M3 + Call 1d queries (see Steps 1–3). Any other source — hardcoded arrays, fabricated deals, illustrative data, copied data from a prior run, inline Python lists — is PROHIBITED. The Step 5 Python script MUST contain `if 'RAW_PIPE' in dir(): sys.exit(1)` as the very first executable line, before any pipeline processing. If this guard is triggered, the run stops immediately. Root cause of the 2026-03-30 fabrication incident: Claude invented a `RAW_PIPE` array with plausible-looking but entirely wrong deals, producing a dashboard with $14.1M instead of $11.99M Dynamics total and coaching based on accounts that do not exist.

**RULE P2 — PIPELINE MUST BE CROSS-CHECKED AGAINST DYNAMICS BEFORE EVERY DEPLOY.**
After Step 5, before `present_files`, Claude MUST print the Snowflake net NNACV total and ask the manager if it matches Dynamics. Acceptable deviation: ±15%. >15% higher than Dynamics → fabrication or wrong territory filter (recheck). >15% lower than Dynamics → Snowflake truncation (re-run M1/M2/M3). Claude MUST wait for manager confirmation before proceeding. This check cannot be skipped. Canonical prompt: `"Snowflake returned $X.XM across N deals. Does this match your Dynamics total? (±15% is acceptable)"`.

**RULE P3 — TOP DEAL MUST USE CQ DATE FILTER ACROSS ALL DEALS INCLUDING UNASSIGNED.**
`topDeal` in `TERR_SUMMARY` MUST be: `max(nnacv)` across ALL deals (PIPE_Q1 + UNASSIGNED_DEALS) where `closeDate` is within `CQ_START` to `CQ_END`. Never PIPE_Q1 alone. Never without the CQ date filter. Never by list insertion order. The canonical Python is: `_all_deals_for_top = [d for d in PIPE_Q1 + UNASSIGNED_DEALS if CQ_START <= d.get('closeDate','')[:10] <= CQ_END]` then `_top_deal = max(_all_deals_for_top, key=lambda d: d['nnacv']) if _all_deals_for_top else None`. Root cause of 2026-03-30 top deal bug: PIPE_Q1 only was used, showing Resolution Life $1.7M instead of NAB $5.73M.


> **⚙️ ADMIN NOTE — Shell File Persistence (for IT/workspace admins):**
> The SSC skill writes session-namespaced shell files to `/mnt/user-data/outputs/ssc_shell_*.html`.
> These files are the pre-parsed HTML templates that make each run ~10s faster (avoids re-parsing the 170KB SKILL.md).
> **Do not clear the `/mnt/user-data/outputs/` directory between sessions** — deleting shell files forces fallback to SKILL.md extraction on the next run (slower, but safe).
> Shell files are territory-neutral and safe to retain indefinitely. They are named by manager+territory+quarter slug (e.g. `ssc_shell_thomson_anzfsi_q2fy2026.html`) and do not contain any pipeline data — only the static HTML/CSS/JS template with a `<!-- @@DATA_SWAP_ZONE@@ -->` placeholder.
> If you must clear outputs, the skill will auto-regenerate shells on the next run with no data loss.

---

## EXECUTION FLOW

```
Step 0:  Territory detection + manager identity + team hierarchy resolution:
         Stage 0a: Scan for session cache (data_swap_*.json) → pre-populate if found
         Stage 1:  Check conversation context for territory
         Stage 2:  Snowflake territory lookup if needed
         Stage 3:  Confirm territory; ask manager name (required — one question only)
         Stage 4:  Call H1/H2/H3 parallel Snowflake hierarchy resolution → confirm AE roster + quotas
         Compute:  M1/M2/M3 monthly date windows from CQ_START (Python, before any queries fire)

Steps 1–3: Fire all 9 Snowflake queries in parallel:
         Call 1 M1 — open pipeline month 1 (territory_district filter)
         Call 1 M2 — open pipeline month 2 (territory_district filter)
         Call 1 M3 — open pipeline month 3 (territory_district filter)
         Call 1d   — blank-AE supplement, full quarter (territory_district filter)
         Call 1e M1 — partner-account supplement month 1 (territory_name filter)
         Call 1e M2 — partner-account supplement month 2 (territory_name filter)
         Call 1e M3 — partner-account supplement month 3 (territory_name filter)
         Call 1f   — Dynamics Engagement status pull for all CQ opty numbers (DIS/TV/BC/MP) ← NEW v16.7
         Call 2a   — Closed Won full quarter (territory_name filter)
         Call 2b   — Closed Lost full quarter (territory_name filter)
         Step 3 FWD1 — Forward quarter 1 pipeline (territory_district, BETWEEN FWD1_START/FWD1_END) ← MANDATORY
         Step 3 FWD2 — Forward quarter 2 pipeline (territory_district, BETWEEN FWD2_START/FWD2_END) ← MANDATORY
         Step 3 FWD3 — Forward quarter 3 pipeline (territory_district, BETWEEN FWD3_START/FWD3_END) ← MANDATORY
         ⚠️ ALL 12 queries fire in parallel. Step 3 FWD1/FWD2/FWD3 are NOT optional. Never skip them.
         ⚠️ _QTR_STATS must be populated with real results from FWD1/FWD2/FWD3 before HTML deploy (NNR #37)
         ⚠️ _QTR_STATS must NEVER contain CQ pipeline values — each slot is its own quarter only (NNR #38)
         Stage 4:  Call H — 3 parallel Snowflake hierarchy queries:
                     H1: GTM_SALES_REP_QUOTA → AE roster + quota for this territory/quarter
                     H2: GTM_ACCOUNT_INDEX_TARGETING → direct reports of MANAGER_NAME
                     H3: GTM_ACCOUNT_INDEX_TARGETING → second-level reports (sub-managers)
                   Merge → confirm roster with manager → lock KNOWN_AES + USER_QUOTAS
                   Establish SESSION_KEY + namespaced paths (DS_PATH, QUOTA_PATH, SHELL_PATH)
         ⚠️ Never proceed to Steps 1–5 without confirmed KNOWN_AES and MANAGER_NAME
Steps 1–3: PARALLEL Snowflake fan-out — fire all four calls simultaneously:
          1:  Open CQ pipeline (territory_district filter, close_date BETWEEN CQ_START/CQ_END)
          2a: Closed Won CQ (territory_name filter, stage = '8 - Closed Won (100%)')
          2b: Closed Lost downsells (territory_name filter, stage = '9 - Closed Lost (0%)')
          3:  Forward quarter stats — THREE separate queries, one per forward quarter (FWD1, FWD2, FWD3)
          ⚠️ All five groups are independent — no data dependency between them
          ⚠️ If parallel not supported: run in order 1 → 3-FWD1 → 3-FWD2 → 3-FWD3 → 2a → 2b (largest first)
          ⚠️ DEPLOY BLOCKER: $0.0M in any _QTR_STATS slot means the query silently failed — re-run before deploying
          ⚠️ Zero results are valid (no forward pipeline); only "$0.0M" from a non-run query is a blocker
Step 4:  REMOVED — opportunity_name read from Step 1 r[2] directly
Step 4b: Next Steps fetch — UNCONDITIONAL, fires in parallel with Call 1 M1/M2/M3:
         Call 1b: ALWAYS run — fetch next steps for all CQ opty numbers.
         Do NOT wait for the 20% threshold check. The pre-aggregated Call 1 queries
         use MAX() on text fields which is unreliable — Call 1b is the only safe source.
         Query: for all opportunity_numbers in the CQ date range (territory_district filter),
         fetch parent_opportunity_next_steps, parent_opportunity_next_steps_last_updated,
         notes_summary_7_days WITHOUT aggregation (no GROUP BY nnacv).
         Merge NS_ROWS into opty_map before PIPE_Q1 is built.
         Post-merge assert: ≥30% of CQ deals have non-empty nextSteps OR notesSummary.
         If <30%, print coverage warning but do not block (data may be sparse in Dynamics).
         Zero-length nextSteps on ALL deals = deploy BLOCKER (PD #26).
         Call 1c: ALWAYS run — fetch primary_competitor_name for all opty numbers.
         Best-effort: zero results = set comp_map={} and continue (never a blocker).
         Merge competitor field into opty_map and PIPE_Q1 deals before Step 5.
Step 5:  Python validation pipeline:
         a. Parse Snowflake rows
         b. Resolve AE from Snowflake only via resolve_ae() — Prime Directive #13 (no hardcoded map)
         c. Aggregate net NNACV per opty
         d. Compute NowSell milestones, forecast checks, dtc, flags
         e. Strip STAGE_GATE_VALUES from nextSteps — Prime Directive #15
         f. Enforce unique num keys — Prime Directive #14
         g. Build AE_DATA, SCRIPT, _QTR_STATS
         h. Read /mnt/user-data/outputs/ssc_trend_baseline.json → PRIOR_SNAPSHOT (NNR #57)
            Compute DEAL_TRENDS dict (prob_delta, stage_delta, ns_delta per opportunity_number)
         i. Write SESSION_KEY + MANAGER_NAME + TERRITORY + DEAL_TRENDS to DS_PATH — Prime Directive #9
         ⚠️ PIPE_Q1 nowsell MUST be None (null) — Prime Directive #17
         ⚠️ AE_DATA.deals MUST be int count — Prime Directive #18
         ⚠️ DS_PATH is session-namespaced — never write to bare 'data_swap.json'
Step 6:  Load shell from SHELL_PATH (fallback: byte-position extraction — Prime Directive #12)
Step 7:  Read DS_PATH → build DATA SWAP ZONE → replace @@DATA_SWAP_ZONE@@ placeholder
         Canonical DSZ injection order (MANDATORY — never reorder):
         1. var PIPE_Q1      — all deals, nowsell=null, ae field matches AE_DATA n field, closeDate NOT close (NNR #40)
         2. var WON_CQ       — closed won this quarter (empty array if Q not started)
         3. var CLOSED_LOST  — closed lost downsells (empty array if none)
         4. var AE_DATA      — MUST include both 'name' AND 'n' fields (NNR #33)
         5. var DEALS_AT_RISK
         6. var QUOTA_DEFAULTS
         7. var QUOTA_MAP IIFE
         8. function _getQuota
         9. AE enrichment DOMContentLoaded block (NNR #35) — runs before renderAE/renderCoach
         10. var _QTR_META   — MUST include q1Label + q2/q3/q4 sub-objects (NNR #34)
         11. var _QTR_STATS  — MUST contain real Snowflake FWD data (NNR #37, #38)
         12. var SCRIPT      — entries MUST be {text, seq} objects NOT plain strings (NNR #36)
Step 8:  Write full HTML to /home/claude/servicenow-sales-command-centre.html
Step 9:  node --check on EACH <script> block separately (zero errors required) — Prime Directive #4
         THEN node execution-mode simulation (Prime Directive #47) — catches runtime errors node --check misses:
         ```python
         # Write simulation script
         sim = f"""
         var document={{getElementById:function(){{return {{textContent:'',innerHTML:'',style:{{}},appendChild:function(){{}}}}}}}};
         var window={{}};
         {js_block}
         try{{
           if(typeof renderTerrSummary==='function') renderTerrSummary();
           if(typeof renderPipe==='function') renderPipe();
           if(typeof renderAE==='function') renderAE();
           if(typeof renderCoach==='function') renderCoach();
           console.log('✅ PD#47: Execution simulation passed');
         }} catch(e) {{
           process.stderr.write('❌ PD#47 DEPLOY BLOCKER: ' + e.message + '\\n');
           process.exit(1);
         }}
         """
         with open('/tmp/sim.js', 'w') as f: f.write(sim)
         result = subprocess.run(['node', '/tmp/sim.js'], capture_output=True, text=True)
         if result.returncode != 0:
             print(f'❌ PD#47 DEPLOY BLOCKER: Execution simulation failed: {result.stderr[:200]}')
             sys.exit(1)
         print(result.stdout.strip())
         ```
         ⚠️ If the simulation throws (e.g. ReferenceError, TypeError), fix the DSZ before deploy.
         ⚠️ The simulation uses mock DOM stubs — render functions will find no real elements, which is correct.
         ⚠️ A clean exit (returncode 0) means all variables parsed and all render functions ran without crashing.
Step 10: Verify 41 functions present across full HTML (named validation — see REQUIRED_FUNCTIONS)
         Additional mandatory assertions (new for v16.5):
         ✓ All AE_DATA objects have both 'name' and 'n' fields — NNR #33
         ✓ _QTR_META has 'q1Label' flat key AND q2/q3/q4 sub-objects — NNR #34
         ✓ AE enrichment DOMContentLoaded block present before first renderAE() — NNR #35
         ✓ SCRIPT[0] is an object with 'text' field — NNR #36
         ✓ _QTR_STATS q2/q3/q4 pipe values are NOT "—" unless Snowflake returned 0 rows — NNR #37
         ✓ _QTR_STATS q2/q3/q4 pipe values are NOT equal to _QTR_META.totalPipe — NNR #38
         ✓ All PIPE_Q1 deals have 'closeDate' field (not 'close') — NNR #40
         ✓ Canonical deal schema fields present: num, name, account, ae, stage, nnacv, closeDate, prob, nextSteps, nextStepsDate, notesSummary, nsStale, nowsell, engagements
⚠️ PHASE 1 HARD STOP — After Step 5 writes DS_PATH, Claude MUST print the Phase 1 summary
         and STOP. Do NOT proceed to Step 6. Wait for "Build dashboard" trigger from user.
         (See TWO-PHASE EXECUTION MODEL below for the exact summary format.)
Step 6:  [PHASE 2 ONLY] Load shell from SHELL_PATH (fallback: byte-position extraction — Prime Directive #12)
Step 11: [PHASE 2 ONLY] Copy to /mnt/user-data/outputs/ → present_files
Step 12: [PHASE 2 ONLY] Refresh persistent shell → cp deployed HTML to SHELL_PATH
         Write ssc_trend_baseline.json → /mnt/user-data/outputs/ (NNR #57)
```

---

## ⚡ TWO-PHASE EXECUTION MODEL (v16.9) — MANDATORY

**The skill MUST run in two distinct phases separated by a hard stop.** This is the primary defence against tool-call budget exhaustion. A single continuous run of ~35–45 tool calls is too close to the Claude budget limit — splitting into two phases of ~22 and ~9 calls eliminates the failure mode entirely.

### Phase 1 — DATA PULL ("Sales Q2" trigger)

**Budget: ~22 tool calls. Ends with a printed summary and a hard STOP.**

Runs Steps 0–5 only:
- Step 0: Territory / roster / quota detection
- Steps 1–3: All Snowflake queries (15 calls)
- Step 4b/4c/1f: Next steps, competitor, engagement
- Step 5: Python validation → write DS_PATH with `status: "data_complete"`

**After Step 5 completes, Claude MUST print this exact summary and STOP — no HTML work:**

```
✅ DATA PULL COMPLETE — [CQ_LABEL] | [TERRITORY]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Pipeline:    [TOTAL_NNACV] across [N] deals
Assigned:    [ASSIGNED_COUNT] deals · [ASSIGNED_NNACV]
Unassigned:  [UNASSIGNED_COUNT] deals · [UNASSIGNED_NNACV]
Top deal:    [TOP_DEAL] · [TOP_DEAL_VAL]
AEs loaded:  [AE_COUNT] ([AE_NAMES_COMMA_LIST])
Coverage:    [COV_X]× against [TOTAL_QUOTA] quota
Next steps:  [NS_PCT]% of deals have activity data
Forward Q3:  [FWD1_PIPE] / [FWD1_N] deals
Forward Q4:  [FWD2_PIPE] / [FWD2_N] deals

⚠️  Does this match your Dynamics total? (±15% is acceptable)
    Type "Build dashboard" to generate your HTML file.
    Type "Refresh data" to re-pull from Snowflake.
```

**Claude MUST NOT proceed to Step 6 after printing this summary. The user must explicitly trigger Phase 2.**

### Phase 2 — HTML BUILD ("Build dashboard" / "Build" / "Generate" trigger)

**Budget: ~9 tool calls. Reads DS_PATH only — zero Snowflake queries.**

Triggers: any of `"build dashboard"`, `"build"`, `"generate"`, `"continue"`, `"make the dashboard"`, `"yes"` (after Phase 1 summary).

Runs Steps 6–12 only:
- Step 6: Load shell from SHELL_PATH (or extract from SKILL.md)
- Step 7–8: Inject DSZ → write HTML
- Step 9: `node --check` + execution simulation (PD #47)
- Step 10: Named function validation
- Step 11: Copy to outputs → `present_files`
- Step 12: Cache shell + write trend baseline

**Phase 2 MUST start by reading DS_PATH.** If DS_PATH is missing or `status != "data_complete"`, print:
> ❌ No validated data found. Please run "Sales Q2" first to pull fresh data.

### Recovery paths

| Situation | User action | What happens |
|-----------|-------------|--------------|
| Phase 1 hits tool limit mid-query | Type "Sales Q2" again | Stage 0a detects DS_PATH checkpoint → resumes or reruns missing queries only |
| Phase 1 completes, user wants to rebuild | Type "Build dashboard" | Phase 2 only — 9 calls, ~60 seconds |
| Phase 2 fails (rare) | Type "Build" again | Re-reads DS_PATH, rebuilds HTML — no Snowflake |
| Data is stale, user wants refresh | Type "Refresh data" | Phase 1 reruns, overwrites DS_PATH |
| New session, valid DS_PATH on disk | Type "Sales Q2" | PD #46 checkpoint detected → offer "Build" immediately |

### Why this works

- Phase 1 is ~22 tool calls — well within budget even with error recovery
- Phase 2 is ~9 tool calls — virtually guaranteed to complete
- The hard stop between phases means the user always sees a data summary before the file is built — catching Dynamics mismatches before spending build budget
- "Build" is a zero-Snowflake operation that can be retried instantly at no cost

---

⚠️ **AUTO-RESUME (PD #37 + PD #46 — MANDATORY):** Stage 0a checks `DS_PATH` for `"status": "data_complete"` on EVERY run start. If found, skip to Step 6 immediately — no Snowflake re-query. If `_QTR_STATS` slots show `"$0.0M"` (forward queries were skipped), run only Step 3 before Step 6. Announce resume to user: *"Resuming from checkpoint — building dashboard now."*

⚠️ **PD #46 CHECKPOINT CHECK IS THE FIRST THING THAT RUNS — before any Snowflake query, before Step 0 Stage 1.** If any `data_swap_*.json` exists on disk with `status == "data_complete"`, Claude MUST print the Phase 1 summary from that data and ask the user to type "Build dashboard" — do NOT re-run Snowflake. This is the recovery path for tool-limit-interrupted runs.

---

## STEP 0 — TERRITORY + TEAM HIERARCHY DETECTION (MANDATORY)

**Never assume or hardcode a territory or AE roster. Never skip this step.**
**Never proceed past Stage 4 without confirmed KNOWN_AES, MANAGER_NAME, and SESSION_KEY.**

### Stage 0 — TRIGGER ROUTING (runs before everything else)

**Detect which trigger phrase was used and route accordingly:**

```python
# Detect Phase 2 triggers — these skip ALL Snowflake queries
PHASE_2_TRIGGERS = [
    'build dashboard', 'build the dashboard', 'build', 'generate dashboard',
    'generate', 'continue', 'yes', 'make the dashboard', 'create dashboard',
]
REFRESH_TRIGGERS = ['refresh data', 'refresh', 'repull', 're-pull', 'fresh data']

trigger_lower = USER_TRIGGER.strip().lower()
is_phase2 = any(t in trigger_lower for t in PHASE_2_TRIGGERS)
is_refresh = any(t in trigger_lower for t in REFRESH_TRIGGERS)

if is_phase2:
    # ── PHASE 2: BUILD ONLY ───────────────────────────────────────────────────
    # Load DS_PATH checkpoint — skip ALL Snowflake queries
    _ds_files = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
    if not _ds_files:
        print("❌ No validated data found on disk.")
        print("   Please run 'Sales Q2' first to pull fresh data from Snowflake.")
        sys.exit(0)
    ds = json.load(open(_ds_files[0]))
    if ds.get('status') != 'data_complete':
        print("❌ Data checkpoint is incomplete (status: %s)." % ds.get('status','missing'))
        print("   Please run 'Sales Q2' again to complete the data pull.")
        sys.exit(0)
    print(f"✅ Phase 2: Loading checkpoint from {_ds_files[0]}")
    print(f"   {ds.get('TERRITORY')} | {ds.get('CQ_LABEL')} | {len(ds.get('PIPE_Q1',[]))} assigned deals")
    # → JUMP DIRECTLY TO STEP 6. Skip Steps 0 Stage 1–4, skip Steps 1–5 entirely.
    GOTO_STEP_6 = True
    SKIP_SNOWFLAKE = True

elif is_refresh:
    # ── REFRESH: PHASE 1 with forced re-pull ─────────────────────────────────
    # Delete any existing checkpoint so Phase 1 runs fresh
    for _f in glob.glob('/home/claude/data_swap_*.json'):
        os.remove(_f)
    print("♻️  Checkpoint cleared — running fresh data pull from Snowflake.")
    GOTO_STEP_6 = False
    SKIP_SNOWFLAKE = False

else:
    # ── STANDARD PHASE 1 TRIGGER ("Sales Q2" etc) ────────────────────────────
    # Check for existing checkpoint first (PD #46)
    _ds_files = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
    if _ds_files:
        try:
            _check = json.load(open(_ds_files[0]))
            if _check.get('status') == 'data_complete':
                # Valid checkpoint exists — print summary and ask for Build trigger
                _ds = _check
                _pipe_total = sum(d.get('nnacv',0) for d in _ds.get('PIPE_Q1',[]) + _ds.get('UNASSIGNED_DEALS',[]))
                _n_total = len(_ds.get('PIPE_Q1',[])) + len(_ds.get('UNASSIGNED_DEALS',[]))
                _aes = [ae.get('n','?') for ae in _ds.get('AE_DATA',[])]
                print(f"\n✅ CHECKPOINT FOUND — {_ds.get('CQ_LABEL')} | {_ds.get('TERRITORY')}")
                print(f"   Pipeline: ${_pipe_total/1e6:.1f}M across {_n_total} deals")
                print(f"   AEs: {', '.join(_aes)}")
                print(f"\n   Data is already validated. Type 'Build dashboard' to generate your file.")
                print(f"   Type 'Refresh data' to pull fresh data from Snowflake instead.")
                sys.exit(0)   # Stop here — wait for Build or Refresh trigger
        except: pass
    GOTO_STEP_6 = False
    SKIP_SNOWFLAKE = False
```

⚠️ **This routing block executes BEFORE Stage 0a and all Snowflake queries.** It is the first Python that runs on every trigger. Phase 2 triggers go directly to Step 6. Phase 1 triggers check for an existing checkpoint before firing any Snowflake queries.

### Stage 0a — Check session cache (fastest path)

**Session namespacing note:** Full session paths (`DS_PATH`, `QUOTA_PATH`, `SHELL_PATH`) require
`MANAGER_NAME` to be known. At Stage 0a we don't have that yet. So Stage 0a does a lightweight
scan for ANY `data_swap_*.json` file written this session, and reads the cached territory from it.
The full namespaced paths are established in Stage 4 once `MANAGER_NAME` is confirmed.

```python
import json, os, glob

# ── SCAN FOR ANY SESSION CACHE FROM THIS RUN ─────────────────────────────────
_cached_terr  = ''
_cached_mgr   = ''
_cached_key   = ''
_saved_quotas = {}

_ds_files = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
if _ds_files:
    try:
        with open(_ds_files[0]) as _f:
            _ds_cache  = json.load(_f)
        _cached_terr = _ds_cache.get('TERRITORY', '')
        _cached_mgr  = _ds_cache.get('MANAGER_NAME', '')
        _cached_key  = _ds_cache.get('SESSION_KEY', '')
        # ── PD #37: AUTO-RESUME — check checkpoint status ────────────────────
        _cached_status = _ds_cache.get('status', '')
        if _cached_status == 'data_complete':
            # ✅ Data already validated — check for FWD quarter gap then go to Step 6
            _fwd_gap = any(
                _ds_cache.get('_QTR_STATS', {}).get(k, {}).get('pipe', '$0.0M') == '$0.0M'
                for k in ['q2', 'q3', 'q4']
            )
            if _fwd_gap:
                print("⚠️ Resume: data_complete but FWD stats missing — will run Step 3 only before Step 6")
                # Set flag: RESUME_STEP3_ONLY = True — handled in execution flow
            else:
                print(f"✅ RESUME: checkpoint found (status=data_complete) — skipping to Step 6")
                # STOP HERE — jump directly to Step 6 without any Snowflake queries
                # Announce to user: "Resuming from checkpoint — pipeline data already validated. Building dashboard now."
        elif _cached_status == 'deployed':
            print("ℹ️ Dashboard was deployed this session. Re-run with fresh data? (yes/no)")
            # Wait for user confirmation before clearing DS_PATH and restarting
        # Load quota sidecar if session key is known
        if _cached_key:
            _quota_path = f'/mnt/user-data/outputs/ssc_quotas_{_cached_key}.json'
            if os.path.exists(_quota_path):
                try:
                    with open(_quota_path) as _qf: _saved_quotas = json.load(_qf)
                except: _saved_quotas = {}
    except: pass
```
- **`status == "data_complete"`** → **SKIP ALL SNOWFLAKE QUERIES** — jump directly to Step 6. If any `_QTR_STATS` slot is `"$0.0M"`, run Step 3 only before Step 6.
- **`status == "deployed"`** → ask manager to confirm re-run before clearing DS_PATH
- **`status == "in_progress"`** → incomplete run — re-run all Snowflake calls from Step 1
- Cache hit with `_cached_terr` AND `_cached_mgr` (no status or status not data_complete) → pre-populate both, skip to Stage 4 confirmation
- Cache hit with territory only → pre-populate territory, still ask for manager name in Stage 3
- No cache → proceed to Stage 1
- `_saved_quotas` available if session key found — pre-populates Call H confirmation message

### Stage 1 — Check conversation context
Has the user already stated their territory in this session?
- Yes → store as `DETECTED_TERRITORY`, proceed to Stage 3
- No → proceed to Stage 2

### Stage 2 — Snowflake territory lookup
```
Data_Analytics_Connection question:
"Show me the distinct territory_district and territory_name values for
opportunities in the current fiscal year. Return up to 20 rows, sorted
by territory_district."
```

Parse the result:
- **One distinct territory root** → store as `DETECTED_TERRITORY`, proceed to Stage 3
- **2–5 distinct roots** → present the list as numbered options: *"I found these territories — which should I run for? [1] ANZ FSI [2] US Enterprise West ..."* — wait for user to select, then store
- **More than 5 distinct roots** → do NOT present the full list (too unwieldy). Instead ask: *"I found multiple territories in Snowflake. Please type your territory name (e.g. 'ANZ FSI', 'US Commercial West') and I'll confirm it before running."* — wait for user to type, then store.

⚠️ **Never proceed past Stage 2 without a confirmed DETECTED_TERRITORY.** If the Snowflake lookup returns zero rows, ask the user to type their territory name directly.

### Stage 3 — Confirm territory + collect manager name, then auto-resolve hierarchy

Present the following confirmation block to the user:

```
"Running the ServiceNow Sales Command Centre for: [DETECTED_TERRITORY]
Quarter: [CQ_LABEL].

One quick thing before I pull your data:

What is your name? (I'll use this to find your team in Snowflake and
exclude you from the AE stack rank.)"
```

⚠️ **Wait for the manager's name before proceeding.** Store it as `MANAGER_NAME`.

---

### Stage 4 — Call H: Snowflake hierarchy resolution (NEW — mandatory for all territories)

After receiving `MANAGER_NAME`, run the following THREE Snowflake queries in parallel to
auto-build the AE roster and quota map. This replaces all manual AE/quota entry.

**Call H1 — Direct reports via quota table:**
```
Data_Analytics_Connection question:
"From the GTM_SALES_REP_QUOTA table, show me all rows where TERRITORY_NAME
ILIKE '[DETECTED_TERRITORY]%' AND QUARTER_YYQQ = '[CQ_YYQQ]'.
Return: SALESREP_NAME, TERRITORY_NAME, QUOTA_REP_USD.
Exclude rows where SALESREP_NAME = '[MANAGER_NAME]'."
```
`CQ_YYQQ` format: `'26-Q2'` for Q2 FY2026 (two-digit year + hyphen + Q + digit).
Result: `H1_ROWS` — one row per AE/territory combination. Parse into
`QUOTA_FROM_SNOWFLAKE = {row.SALESREP_NAME: row.QUOTA_REP_USD for row in H1_ROWS}`
and `CANDIDATE_AES = list(QUOTA_FROM_SNOWFLAKE.keys())`.

**Call H2 — Manager filter via account targeting table:**
```
Data_Analytics_Connection question:
"From GTM_ACCOUNT_INDEX_TARGETING, return distinct ACCOUNT_SALES_REP values
where ACCOUNT_SALES_REP_MANAGER ILIKE '%[MANAGER_NAME]%'.
Return up to 50 rows."
```
Result: `H2_ROWS` — names of reps that appear as direct reports of this manager
on at least one account. Parse into `H2_AES = set(row.ACCOUNT_SALES_REP for row in H2_ROWS)`.

**Call H3 — Second-level hierarchy (sub-managers and their reports):**
```
Data_Analytics_Connection question:
"From GTM_ACCOUNT_INDEX_TARGETING, return distinct ACCOUNT_SALES_REP,
ACCOUNT_SALES_REP_MANAGER pairs where ACCOUNT_SALES_REP_MANAGER IN
(SELECT ACCOUNT_SALES_REP FROM GTM_ACCOUNT_INDEX_TARGETING
 WHERE ACCOUNT_SALES_REP_MANAGER ILIKE '%[MANAGER_NAME]%').
Return up to 100 rows."
```
Result: `H3_ROWS` — AEs who report to someone who reports to `MANAGER_NAME`.
Parse into `H3_AES = set(row.ACCOUNT_SALES_REP for row in H3_ROWS)`.

**Merge hierarchy results:**
```python
# Union of all three sources, excluding the manager themselves
ALL_HIERARCHY_AES = (set(CANDIDATE_AES) | H2_AES | H3_AES) - {MANAGER_NAME.strip()}
# Prefer quota from H1; fall back to None for AEs found only via H2/H3
RESOLVED_QUOTAS = {ae: QUOTA_FROM_SNOWFLAKE.get(ae) for ae in ALL_HIERARCHY_AES}
```

**Present the resolved team to the manager for confirmation:**
```
"I found the following team in Snowflake for [DETECTED_TERRITORY] — [CQ_LABEL]:

  [Numbered list of ALL_HIERARCHY_AES with quota if known, e.g.:
    1. Kevin Pecqueux  — quota: $2.0M
    2. Graham Rothwell — quota: $2.5M
    3. Varun Verma     — quota: $1.8M
    ...
    8. Amelia Horne    — quota: not found in quota table]

Does this look right? You can:
  • Reply 'yes' or 'looks good' to confirm and proceed
  • Remove anyone: 'remove James Park'
  • Add someone missed: 'add Sara Kline: $1.8M'
  • Override a quota: 'Graham: $3.0M'
  • For AEs with no quota found: please supply their quota before I continue

⚠️ AEs without a confirmed quota will use the $1.5M default (shown as amber banner)."
```

⚠️ **Do NOT proceed to Steps 1–5 until the manager explicitly confirms the roster.**
⚠️ **If Call H1 returns zero rows** — the territory name format may not match `GTM_SALES_REP_QUOTA`.
  Try a broader query: `TERRITORY_NAME ILIKE '%[last word of DETECTED_TERRITORY]%'`. If still zero,
  **do NOT show a Snowflake error to the manager.** Instead, present this friendly message:

  > "I couldn't find quota records for **[DETECTED_TERRITORY]** in the quota table yet — this is normal
  > at the very start of a new quarter before quotas are loaded.
  >
  > I can still run your dashboard with estimated quotas. Please either:
  > - Tell me each AE's quota (e.g. "Kevin $2M, Graham $2.5M, Varun $1.8M"), **or**
  > - Reply **'use defaults'** and I'll estimate $1.5M per AE (shown as an amber warning in the dashboard).
  >
  > Your AE team: [list H2/H3 AEs if found, or ask manager to supply the list]"

  Fall back to asking the manager to supply the AE list manually (legacy Stage 3 flow).
⚠️ **If Call H2 and H3 both return zero rows** — `ACCOUNT_SALES_REP_MANAGER` may not be populated
  for this territory. Use `CANDIDATE_AES` from H1 only and note this in the confirmation message.
⚠️ **AEs appearing in H2/H3 but NOT in H1** (no quota row) — include them in the roster but set
  `QUOTA_FROM_SNOWFLAKE[ae] = None`. These will trigger the quota-default amber banner for that AE.
  Prompt the manager: "I found [Name] via account assignments but no quota record — please supply
  their quota or reply 'use default' for $1.5M."

**Session namespacing — mandatory after MANAGER_NAME and DETECTED_TERRITORY are both known:**
```python
import re as _re, os
# Generate a session key that isolates this manager's temp files from other concurrent users.
# Uses first word of manager last name + territory slug + quarter — short but unique enough.
_mgr_slug  = re.sub(r'[^a-z0-9]', '', MANAGER_NAME.split()[-1].lower())[:8]
_terr_slug = re.sub(r'[^a-z0-9]', '', DETECTED_TERRITORY.lower().replace(' ', '_'))[:12]
_q_slug    = CQ_LABEL.replace(' ', '').replace('/', '').lower()[:8]
SESSION_KEY = f'{_mgr_slug}_{_terr_slug}_{_q_slug}'   # e.g. 'thomson_anzfsi_q2fy2026'

# All temp paths use SESSION_KEY prefix — prevents cross-user contamination in shared deploys
DS_PATH    = f'/home/claude/data_swap_{SESSION_KEY}.json'
QUOTA_PATH = f'/mnt/user-data/outputs/ssc_quotas_{SESSION_KEY}.json'
SHELL_PATH = f'/mnt/user-data/outputs/ssc_shell_{SESSION_KEY}.html'
OUT_PATH   = f'/mnt/user-data/outputs/servicenow-sales-command-centre.html'
```
⚠️ **All subsequent steps MUST use `DS_PATH`, `QUOTA_PATH`, and `SHELL_PATH` — never the old
hardcoded paths.** Replace every reference to `data_swap.json`, `ssc_quotas.json`, and
`ssc_shell.html` with the session-namespaced variables above. `OUT_PATH` stays fixed — the
final deployed HTML always has the canonical output filename.

**After confirmation, store:**
- `MANAGER_NAME` = confirmed name (from Stage 3)
- `KNOWN_AES` = confirmed AE roster list (from Call H + manager edits)
- `USER_QUOTAS` = `{ae: quota for ae, quota in RESOLVED_QUOTAS.items() if quota is not None}`
- `CONFIRMED_SEGMENTS` = `{}` (segments not available from Snowflake — uses AE_SEGMENT defaults for ANZ FSI; for other territories, prompt for STR/ENT after roster confirmation if coaching depth is required)
- `USING_QUOTA_DEFAULTS` = `True` if ANY AE in `KNOWN_AES` has no quota in `RESOLVED_QUOTAS`
- `DETECTED_TERRITORY`, `TERRITORY_FILTER_OPEN`, `TERRITORY_FILTER_CLOSED` (unchanged)

⚠️ **QUOTA SIDECAR WRITE — session-namespaced (mandatory after quota resolution):**
```python
if USER_QUOTAS:
    with open(QUOTA_PATH, 'w') as _qf:
        json.dump(USER_QUOTAS, _qf, indent=2)
    print(f'✅ Quota sidecar written: {len(USER_QUOTAS)} AEs → {QUOTA_PATH}')
```

⚠️ **If `_saved_quotas` is non-empty (returning user — loaded from `QUOTA_PATH` in Stage 0a):**
Pre-populate the Call H confirmation message with saved quotas as the expected values. The
manager only needs to confirm or override — no re-entry required. This is the fast path for
returning users.

⚠️ **If the user says 'use defaults' for any AE without a Snowflake quota:** proceed with
`QUOTA_DEFAULT = 1_500_000` for that AE and set `USING_QUOTA_DEFAULTS = True`. Inject the
amber banner as per original behaviour.

---

Store:
- `DETECTED_TERRITORY` = e.g. `ANZ FSI` or `US Enterprise West`
- `MANAGER_NAME` = user-supplied name (used to populate EXCLUDE_NAMES)
- `KNOWN_AES` = confirmed AE list from Snowflake hierarchy resolution
- `USER_QUOTAS` = dict of ae_name → quota_usd (from Snowflake or user-supplied)
- `SESSION_KEY`, `DS_PATH`, `QUOTA_PATH`, `SHELL_PATH`, `OUT_PATH` = session-namespaced paths
- `TERRITORY_FILTER_OPEN` = `territory_district ILIKE '[DETECTED_TERRITORY]%'`
- `TERRITORY_FILTER_CLOSED` = `territory_name ILIKE '[DETECTED_TERRITORY]%'`

⚠️ **These two filter fields are DIFFERENT Snowflake columns — never swap them.**

---

## QUARTER DATE RANGES

| Quarter | CQ_START | CQ_END | q1Label |
|---------|----------|--------|---------|
| Q1 | Jan 1 | Mar 31 | "Q1 FY{YEAR}" |
| Q2 | Apr 1 | Jun 30 | "Q2 FY{YEAR}" |
| Q3 | Jul 1 | Sep 30 | "Q3 FY{YEAR}" |
| Q4 | Oct 1 | Dec 31 | "Q4 FY{YEAR}" |

Derive `{YEAR}` from today's date — never hardcode.
Forward quarters: q2/q3/q4 = next 3 quarters after CQ.

---

## SNOWFLAKE QUERY RULES

| Rule | Detail |
|------|--------|
| Open pipeline filter (primary) | `territory_district ILIKE '[DETECTED_TERRITORY]%'` — Call 1 M1/M2/M3 and Call 1d |
| Open pipeline filter (supplement) | `territory_name ILIKE '[DETECTED_TERRITORY]%'` — Call 1e M1/M2/M3 (partner-account supplement) |
| Closed won/lost filter | `territory_name ILIKE '[DETECTED_TERRITORY]%'` — ALWAYS use territory_name for closed deals (partner accounts may lack territory_district) |
| Net NNACV | `SUM(nnacv_usd_cfx)` per `opportunity_number` — always pre-aggregated (see NNR #35) |
| Query form | **ALWAYS pre-aggregated** (`SUM GROUP BY opportunity_number`) — NEVER "return each row separately" (causes silent truncation via Cortex; see NNR #35) |
| Downsells (open) | NEVER filter `nnacv_usd_cfx > 0` on open pipeline — negative NNACV open deals are valid entries (see NNR #52) |
| Downsells (closed) | Include `ALL rows with positive AND negative nnacv` in Call 2a/2b — negate after parse |
| Closed Lost | Mandatory Call 2b query: `opportunity_stage = '9 - Closed Lost (0%)'` — NEVER use `pipeline_status` column (does not exist) |
| Probability | Extract `(X%)` from stage string — Snowflake decimal is unreliable |
| Probability fallback | `raw_prob × 100` only when stage string has no `(X%)` |
| Tool | `Data_Analytics_Connection:account_insights` |
| Monthly windows | M1 = calendar month 1, M2 = month 2, M3 = month 3 of the quarter — derive from CQ_START in Python before firing |
| Truncation guard | After any Call 1 result, assert `result_set_truncated` is absent/false — if true, abort and re-query |

---

## STEPS 1–3 — PARALLEL SNOWFLAKE FAN-OUT

⚠️ **Fire all queries simultaneously.** They have no data dependencies on each other. Parse all results after all complete.

**Total queries per run: 9**
- Call 1 M1, M2, M3 — open pipeline, monthly windows (territory_district filter)
- Call 1d — blank-AE supplement (territory_district filter, full quarter)
- Call 1e M1, M2, M3 — partner-account supplement (territory_name filter, monthly windows)
- Call 2a — Closed Won (territory_name filter)
- Call 2b — Closed Lost (territory_name filter)
- Step 3 — Forward quarter stats (batched, territory_district filter)

If the tool does not support parallel invocation, run in this priority order: **M1 → M2 → M3 → 1e-M1 → 1e-M2 → 1e-M3 → 1d → 2a → 2b → Step 3** (front-load largest result sets first).

### Call 1 — Open CQ pipeline — MANDATORY MONTHLY SPLIT-WINDOW (3 sub-queries, always)

⚠️ **MONTHLY SPLIT-WINDOW IS MANDATORY — NEVER USE A SINGLE FULL-QUARTER OR HALF-QUARTER QUERY FOR CALL 1.**
Root cause confirmed 2026-03-29: (1) Full-quarter queries are silently truncated by Snowflake Cortex ($3.94M returned vs $11.98M in Dynamics). (2) Half-quarter (2-window) queries still miss deals in high-volume territories. The ONLY safe pattern is THREE sub-queries, one per calendar month in the quarter. This is a NON-NEGOTIABLE RULE — no drift, no exceptions, for any territory, any quarter.

⚠️ **PRE-AGGREGATED FORM IS MANDATORY — NEVER REQUEST RAW SKU ROWS (NNR #35).**
Always use `SUM(nnacv_usd_cfx) GROUP BY opportunity_number` — Snowflake's SUM equals the PowerBI-validated number.

**Monthly date windows — derive from CQ_START in Python before firing queries:**
```python
import datetime as _dt
_qs = _dt.date.fromisoformat(CQ_START)
# Month 1: first calendar month of quarter
M1_START = CQ_START                                                 # e.g. 2026-04-01
M1_END   = (_qs.replace(day=1) + _dt.timedelta(days=32)).replace(day=1) - _dt.timedelta(days=1)
# Month 2: second calendar month
M2_START = (M1_END + _dt.timedelta(days=1)).isoformat()
_m2s = _dt.date.fromisoformat(M2_START)
M2_END   = (_m2s.replace(day=1) + _dt.timedelta(days=32)).replace(day=1) - _dt.timedelta(days=1)
# Month 3: third calendar month (runs to CQ_END)
M3_START = (M2_END + _dt.timedelta(days=1)).isoformat()
M3_END   = CQ_END                                                   # e.g. 2026-06-30
M1_END   = M1_END.isoformat()
M2_END   = M2_END.isoformat()
print(f"Monthly windows: {M1_START}→{M1_END} | {M2_START}→{M2_END} | {M3_START}→{M3_END}")
```

**Canonical monthly windows per quarter:**
| Quarter | Month 1 | Month 2 | Month 3 |
|---------|---------|---------|---------|
| Q1 FY | Jan 1 – Jan 31 | Feb 1 – Feb 28/29 | Mar 1 – Mar 31 |
| Q2 FY | Apr 1 – Apr 30 | May 1 – May 31 | Jun 1 – Jun 30 |
| Q3 FY | Jul 1 – Jul 31 | Aug 1 – Aug 31 | Sep 1 – Sep 30 |
| Q4 FY | Oct 1 – Oct 31 | Nov 1 – Nov 30 | Dec 1 – Dec 31 |

**Sub-query M1** — Month 1 of quarter (pre-aggregated per opportunity):
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show me open pipeline opportunities with close_date
between [M1_START] and [M1_END]. Aggregate by opportunity — one row per deal.
I need: opportunity_number, opportunity_name, account_name,
parent_opportunity_sales_rep_name, opportunity_stage,
SUM(nnacv_usd_cfx) as total_nnacv,
MIN(close_date) as close_date, territory_district, territory_name,
MAX(parent_opportunity_next_steps) as next_steps,
MAX(parent_opportunity_next_steps_last_updated) as next_steps_date,
MAX(notes_summary_7_days) as notes_summary.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[M1_START]' AND '[M1_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter out zero or null NNACV. GROUP BY opportunity_number and identifiers.
Do NOT add a LIMIT clause. Return ALL matching rows."
```

⚠️ **POST-QUERY SQL INSPECTION — MANDATORY AFTER EVERY M1/M2/M3/1d/1e CALL (NNR #62):**
After each `account_insights` call returns, extract the generated SQL from the SSE stream's
`response.tool_use` event under `input.query`. Run this check in Python before proceeding:

```python
def assert_no_limit(generated_sql, query_label):
    """
    Extract SQL from SSE stream and assert no LIMIT clause was added by Cortex.
    DEPLOY BLOCKER if LIMIT found — re-query with explicit 'Do NOT add a LIMIT clause'.
    """
    import re
    if not generated_sql:
        print(f"⚠️ {query_label}: Could not extract generated SQL — proceeding with caution.")
        return
    # Detect LIMIT N or LIMIT\n anywhere in the SQL
    limit_match = re.search(r'\bLIMIT\s+\d+', generated_sql, re.IGNORECASE)
    if limit_match:
        print(f"❌ DEPLOY BLOCKER — NNR #62: {query_label} generated SQL contains '{limit_match.group()}'.")
        print(f"   Cortex added a row cap. This WILL silently truncate pipeline data.")
        print(f"   Action: Re-run this query with the phrase 'Do NOT add a LIMIT clause. Return ALL matching rows.'")
        print(f"   appended to the question. Do NOT proceed to Step 5 until all monthly queries pass this check.")
        import sys; sys.exit(1)
    else:
        print(f"✅ NNR #62: {query_label} SQL has no LIMIT clause — safe to proceed.")

# How to extract generated SQL from the SSE tool result file:
def extract_generated_sql(fpath):
    """Pull the SQL Cortex actually ran from the response.tool_use SSE event."""
    import json, os
    if not os.path.exists(fpath): return None
    with open(fpath) as f: raw = json.load(f)
    text = raw[0]['text'] if isinstance(raw, list) else raw.get('text', '')
    try: events = json.loads(text)
    except: return None
    for ev in events:
        if 'response.tool_use\n' in ev:
            try:
                obj = json.loads(ev.split('data: ', 1)[1])
                sql = obj.get('input', {}).get('query', '')
                if sql and 'SELECT' in sql.upper(): return sql
            except: pass
    return None

# ── Call immediately after each monthly query result is stored ──────────────
# Example (repeat for M2, M3, C1D, 1e-M1, 1e-M2, 1e-M3):
#   assert_no_limit(extract_generated_sql(M1_PATH), 'Call 1 M1')
#   assert_no_limit(extract_generated_sql(M2_PATH), 'Call 1 M2')
#   assert_no_limit(extract_generated_sql(M3_PATH), 'Call 1 M3')
#   assert_no_limit(extract_generated_sql(C1D_PATH), 'Call 1d')
# ⚠️ This check MUST run before Step 5. A passing check is logged to console.
# ⚠️ A failing check is a sys.exit(1) — Claude must re-run the offending query.
```

**Sub-query M2** — Month 2 of quarter (pre-aggregated per opportunity):
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show me open pipeline opportunities with close_date
between [M2_START] and [M2_END]. Aggregate by opportunity — one row per deal.
I need: opportunity_number, opportunity_name, account_name,
parent_opportunity_sales_rep_name, opportunity_stage,
SUM(nnacv_usd_cfx) as total_nnacv,
MIN(close_date) as close_date, territory_district, territory_name,
MAX(parent_opportunity_next_steps) as next_steps,
MAX(parent_opportunity_next_steps_last_updated) as next_steps_date,
MAX(notes_summary_7_days) as notes_summary.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[M2_START]' AND '[M2_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter out zero or null NNACV. GROUP BY opportunity_number and identifiers.
Do NOT add a LIMIT clause. Return ALL matching rows."
```

**Sub-query M3** — Month 3 of quarter (pre-aggregated per opportunity):
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show me open pipeline opportunities with close_date
between [M3_START] and [M3_END]. Aggregate by opportunity — one row per deal.
I need: opportunity_number, opportunity_name, account_name,
parent_opportunity_sales_rep_name, opportunity_stage,
SUM(nnacv_usd_cfx) as total_nnacv,
MIN(close_date) as close_date, territory_district, territory_name,
MAX(parent_opportunity_next_steps) as next_steps,
MAX(parent_opportunity_next_steps_last_updated) as next_steps_date,
MAX(notes_summary_7_days) as notes_summary.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[M3_START]' AND '[M3_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter out zero or null NNACV. GROUP BY opportunity_number and identifiers.
Do NOT add a LIMIT clause. Return ALL matching rows."
```

Parse all three sub-query result sets through the same `opty_map` logic (PD #20). Any deal appearing in multiple windows (impossible with non-overlapping monthly windows, but guard applies regardless) is counted once — NNACV set on first insert only.

⚠️ **DOWNSELL CAPTURE (NNR #52) — Negative NNACV deals MUST be included in every monthly window.**
Deals with negative `nnacv_usd_cfx` (open downsells — e.g. Suncorp OPTY6537945 at -$15,787) are valid open pipeline entries. The `Do not filter out zero or null NNACV` instruction in each sub-query already covers this. Additionally: the `opty_map` Python builder MUST NOT skip negative-NNACV rows. Python Step 5 accumulates `nnacv` as-is (positive OR negative). Negative open deals appear in `PIPE_Q1` with a `DOWNSELL` flag and render in the pipeline table with an amber badge. Their negative value correctly reduces `total_pipe`. This is non-negotiable — silently dropping downsells inflates pipeline totals.

### Call 1d — Blank-AE supplement (MANDATORY — runs in parallel with M1/M2/M3)

⚠️ **THIS IS MANDATORY AND MUST ALWAYS RUN IN PARALLEL WITH CALL 1 SUB-QUERIES M1/M2/M3.**
Root cause confirmed 2026-03-29: deals with blank `parent_opportunity_sales_rep_name` in Dynamics have valid `territory_district` values but are crowded out by the row cap. A dedicated blank-AE query covers the full quarter in one pass (total rows are small).

⚠️ **Use pre-aggregated form (NNR #35)** — same rule as Call 1 Sub-queries M1/M2/M3.

```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show me open pipeline opportunities where
parent_opportunity_sales_rep_name is blank or null AND
close_date is between [CQ_START] and [CQ_END]. Aggregate by opportunity — one row per deal.
I need: opportunity_number, opportunity_name, account_name,
parent_opportunity_sales_rep_name, opportunity_stage,
SUM(nnacv_usd_cfx) as total_nnacv,
MIN(close_date) as close_date, territory_district, territory_name,
MAX(parent_opportunity_next_steps) as next_steps,
MAX(parent_opportunity_next_steps_last_updated) as next_steps_date,
MAX(notes_summary_7_days) as notes_summary.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND parent_opportunity_sales_rep_name IS NULL OR blank.
AND close_date BETWEEN '[CQ_START]' AND '[CQ_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter out zero or null NNACV. GROUP BY opportunity_number and identifiers.
Do NOT add a LIMIT clause. Return ALL matching rows."
```

### Call 1e — Partner-account supplement (MANDATORY — NEW in v11.0)

⚠️ **THIS IS MANDATORY AND MUST ALWAYS RUN IN PARALLEL WITH M1/M2/M3 AND CALL 1d.**

**Root cause confirmed 2026-03-29:** Certain accounts in the territory are owned by partner organisations (e.g. "Infosys - Bupa Australia", "Infosys - Westpac", "Infosys - HBF Health Ltd") or are non-bank FSI accounts (e.g. "AMP Services (NZ) Limited", "Mobilise IT Pty Ltd") whose `territory_district` field in Snowflake is not consistently populated with the `[DETECTED_TERRITORY]` value. These accounts ARE assigned to the territory in Dynamics and appear in the PowerBI pipeline view, but the `territory_district ILIKE` filter silently drops them. This causes material pipeline under-counting (confirmed: Infosys-Bupa $161K, AMP $7.7K, Mobilise $1.8K, Infosys-Westpac $0 all missing from Q2 FY2026 dashboard on 2026-03-29).

**Fix:** A dedicated supplemental query per month window fetches deals by `territory_name ILIKE` (a broader field that IS populated for partner accounts) rather than `territory_district ILIKE`. This is run for each of the three monthly windows, giving six total supplemental queries (M1/M2/M3 × {district, name}).

**Three partner-account sub-queries — one per monthly window:**

```
[For each of M1, M2, M3 — substitute the appropriate date range]

Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show me open pipeline opportunities with close_date
between [Mx_START] and [Mx_END] where territory_name matches the territory (not territory_district).
Aggregate by opportunity — one row per deal.
I need: opportunity_number, opportunity_name, account_name,
parent_opportunity_sales_rep_name, opportunity_stage,
SUM(nnacv_usd_cfx) as total_nnacv,
MIN(close_date) as close_date, territory_district, territory_name,
MAX(parent_opportunity_next_steps) as next_steps,
MAX(parent_opportunity_next_steps_last_updated) as next_steps_date,
MAX(notes_summary_7_days) as notes_summary.
Filter: territory_name ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[Mx_START]' AND '[Mx_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter out zero or null NNACV. GROUP BY opportunity_number and identifiers.
Do NOT add a LIMIT clause. Return ALL matching rows."
```

⚠️ **PD #20 deduplication is CRITICAL for Call 1e results.** Many deals will appear in BOTH the `territory_district` queries (M1/M2/M3) AND the `territory_name` queries (1e-M1/M2/M3). The opty_map dedup guard (set once on first insert, never update NNACV on second encounter from a different result set) ensures these deals are counted exactly once. The supplemental queries only ADD genuinely new deals — they never double-count.

⚠️ **Call 1e is NOT a replacement for M1/M2/M3 — it is ADDITIVE.** Run both sets. The `territory_district` queries capture the majority of deals; the `territory_name` queries catch the partner-owned/non-standard accounts that slip through. Together they produce a complete picture matching Dynamics.

**Python merge pattern (must follow PD #20):**
```python
# After all 6 monthly queries complete (M1, M2, M3, 1e-M1, 1e-M2, 1e-M3)
# + Call 1d (blank-AE)
# All 7 result sets feed into the SAME opty_map via the PD #20 two-part rule.
# set_idx increments with each result set.
# Result: every deal is counted once; partner-account deals are captured.
```

**Closed Won/Closed Lost supplement (Call 2a-e and Call 2b-e):**
The same `territory_name ILIKE` broadening applies to Closed Won and Closed Lost queries. See updated Call 2a and Call 2b specs below.

Merge all Call 1d + Call 1e rows into the same `opty_map` as Sub-queries M1/M2/M3 — PD #20 deduplication applies. After all result sets are merged, split into:
- `PIPE_Q1` = deals where `ae != 'Unassigned'`
- `UNASSIGNED_DEALS` = deals where `ae == 'Unassigned'`

Both contribute to `total_pipe_all` (territory total). Both render in the dashboard. Unassigned deals go to the amber `UNASSIGNED_DEALS` panel. The Territory Health Bar `topDeal` and `coverage` stats use `total_pipe_all` (all deals including unassigned).

⚠️ **TRUNCATION GUARD (NNR #35):** After each Call 1 M1/M2/M3 and Call 1e M1/M2/M3 result, check whether `result_set_truncated` is present and true in the tool response metadata. If truncated, the pre-aggregated query was not correctly used — abort and re-query with explicit `SUM GROUP BY` phrasing before Step 5. A truncated result set with no error is the silent failure mode that produces a wrong dashboard.

⚠️ **Do NOT add `AND nnacv_usd_cfx != 0`** — this silently drops $0 NNACV deals and renewal opportunities where NNACV may be null. All open deals must be included; $0/null NNACV is handled in Python (treated as 0, not excluded).

⚠️ **Do NOT add `AND pipeline_status = 'Open'`** — this column does not exist in the underlying Snowflake view. Open deals are identified purely by stage: anything NOT IN ('8 - Closed Won (100%)', '9 - Closed Lost (0%)') is open pipeline.

Result column map (pre-aggregated form — one row per opportunity):
- r[0] = opportunity_number
- r[1] = account_name
- r[2] = opportunity_name
- r[3] = parent_opportunity_sales_rep_name (AE)
- r[4] = opportunity_stage
- r[5] = total_nnacv (SUM — already aggregated by Snowflake)
- r[6] = close_date
- r[7] = territory_district
- r[8] = territory_name
- r[9] = next_steps (MAX of parent_opportunity_next_steps)
- r[10] = next_steps_date (MAX of parent_opportunity_next_steps_last_updated)
- r[11] = notes_summary (MAX of notes_summary_7_days)

⚠️ **Step 5 Python NNACV accumulation (PD #20):** With pre-aggregated results, `nnacv` is already the net value for the opportunity. Do NOT accumulate across rows for the same opty within a single result set (each opty appears once). DO still apply the cross-result-set dedup guard: if the same opty appears in both Sub-query A and Sub-query B results (rare, due to close date near the split boundary), keep the first occurrence and skip the second.

⚠️ **COLUMN VERIFICATION (mandatory after Call 1 returns):** Inspect r[9] of the first few rows. If values are short stage-like strings (`"Pre-Negotiation"`, `"Order Form Approved"`, `"Final"`, `"Submitted"`) then the tool mapped the WRONG column. These are `parent_opportunity_negotiation_stage` values, not `parent_opportunity_next_steps`. Apply `STAGE_GATE_VALUES` stripping in Step 5 regardless (Prime Directive #15). The correct `parent_opportunity_next_steps` field contains multi-paragraph free-text with AE names, dates, stakeholder notes, and action items.

⚠️ **NEXT STEPS — Call 1b is UNCONDITIONAL (NNR #19, updated v16.5):** Call 1b fires on EVERY run in parallel with Call 1 M1/M2/M3. The 20% threshold check is RETIRED. Root cause: `MAX(parent_opportunity_next_steps)` in the pre-aggregated pipeline queries picks alphabetically — it reliably returns blank or wrong values on multi-SKU deals. Call 1b is the only reliable source of next steps data.

### Call 1b — Next Steps dedicated fetch (ALWAYS run, parallel with Call 1 M1/M2/M3)

Fire concurrently with Call 1 — no data dependency, only needs CQ date range and territory.

```
Data_Analytics_Connection question:
"For ANZ FSI territory open pipeline opportunities with close_date BETWEEN
'[CQ_START]' AND '[CQ_END]', using territory_district ILIKE '[TERRITORY]%',
return one row per opportunity — do NOT aggregate by NNACV.
Columns: opportunity_number, parent_opportunity_next_steps,
parent_opportunity_next_steps_last_updated, notes_summary_7_days.
Do NOT add LIMIT clause. Return ALL rows."
```

Result: NS_ROWS. Column map: r[0]=opty_number, r[1]=next_steps, r[2]=last_updated_date, r[3]=notes_summary.

Build: `ns_map = {r[0]: (r[1], r[2], r[3]) for r in NS_ROWS if r[0]}`.

Merge into opty_map AFTER M1/M2/M3 parsing:
```python
for opty, (ns, ns_date, notes) in ns_map.items():
    if opty in opty_map:
        if ns and not opty_map[opty].get('nextSteps'):
            opty_map[opty]['nextSteps'] = clean_next_steps(ns)
            opty_map[opty]['nextStepsDate'] = ns_date or ''
        if notes and not opty_map[opty].get('notesSummary'):
            opty_map[opty]['notesSummary'] = notes
```

Post-merge assert: count deals with non-empty nextSteps OR notesSummary.
- Coverage ≥30%: pass.
- Coverage <30%: print `"⚠ Next steps coverage [N]% — Dynamics data may be sparse"` (warning, not blocker).
- Coverage ==0%: DEPLOY BLOCKER — `sys.exit(1)`, check Snowflake column mapping (PD #26).

### Call 1c — Competitor intelligence fetch (always run, parallel with Call 1b)
Fire this concurrently with Call 1b — no data dependency.
```
Data_Analytics_Connection question:
"For the following opportunity numbers, return opportunity_number,
primary_competitor_name, competitive_situation, competitive_notes.
Opportunity numbers: [comma-separated list of all opty numbers from Call 1].
If those columns don't exist, try: opportunity_number, competitor_name, competitor."
```
Result: COMP_ROWS. Column map: r[0]=opty_number, r[1]=competitor_name, r[2]=competitive_situation (may be blank), r[3]=notes (may be blank).
- If the query returns zero rows or column-not-found error: set `comp_map = {}` and continue — competitor data is best-effort, never a deploy blocker.
- Build: `comp_map = {r[0]: r[1].strip() for r in COMP_ROWS if r[1] and r[1].strip()}`.
- Merge into opty_map before PIPE_Q1 is built:
  ```python
  for opty in opty_map:
      opty_map[opty]['competitor'] = comp_map.get(opty, '')
  ```
- Add `'competitor': d.get('competitor', '')` to each PIPE_Q1 deal object.
- Known competitor name normalisations (apply case-insensitive):
  - Any variant of "salesforce" / "sfdc" / "vlocity" → `"Salesforce"`
  - Any variant of "microsoft" / "msft" / "dynamics" / "azure" → `"Microsoft"`
  - Any variant of "pega" / "pegasystems" → `"Pega"`
  - Any variant of "servicenow" (self) → `""` (not a competitor)
  - Any variant of "archer" / "rsa archer" → `"Archer"`
  - All others: use as-is, title-cased.

### Call 1f — Dynamics Engagement Status Pull (MANDATORY — fires in parallel with Call 1b/1c) ← NEW v16.7

**Purpose:** Pull actual Dynamics Engagement records for all CQ opportunity numbers. This is the authoritative source for NowSell milestone colours — overrides stage-inference for DIS, TV, BC, and MP milestones. Without this, SC-owned engagements (e.g. Technical Win "Open") show as false-red in the dashboard.

**NowSell v5 Engagement type → Milestone mapping:**
- `Technical Win` → `TV` (SC accountable)
- `Discovery` → `DIS` (AE accountable)
- `Business Value Assessment` / `BVA` → `BC` (AE + SSE accountable)
- `Implementation Plan` → `MP` (AE accountable — used as proxy for Mutual Plan progress)

**Dynamics Engagement status → NowSell colour mapping:**
- `Complete` → `"g"` (green)
- `Open` / `In Progress` / `In-Progress` → `"a"` (amber)
- No engagement record → `"r"` (red — fall through to stage inference)

```
Data_Analytics_Connection question:
"For the following opportunity numbers, return the Dynamics Engagement records.
Return: opportunity_number, engagement_number, engagement_type, engagement_status,
assigned_to_name, last_modified_date.
Filter: opportunity_number IN ([comma-separated list of all CQ opty numbers]).
Include only engagement_type IN ('Technical Win', 'Discovery',
'Business Value Assessment', 'BVA', 'Implementation Plan').
Do NOT add a LIMIT clause."
```

⚠️ **If Dynamics Engagement table is not available via Snowflake connector**, Call 1f returns zero rows — this is NOT a deploy blocker. Set `eng_map = {}` and continue. The dashboard falls back to stage-inference scoring (existing v16.5 behaviour) for all milestones. Print: `"⚠️ Call 1f returned 0 rows — engagement-backed scoring unavailable; using stage inference."`.

⚠️ **Call 1f is best-effort, never a deploy blocker** — engagement data enriches the coaching modal but is not required for the dashboard to function. Zero rows = graceful degradation.

**Build `eng_map` and merge into `opty_map`:**
```python
# Parse Call 1f results
ENG_TYPE_TO_MILESTONE = {
    'technical win':              'TV',
    'discovery':                   'DIS',
    'business value assessment':  'BC',
    'bva':                        'BC',
    'implementation plan':        'MP',
}
ENG_STATUS_TO_SCORE = {
    'complete':     'g',
    'open':         'a',
    'in progress':  'a',
    'in-progress':  'a',
}

eng_map = {}  # {opty_number: {milestone_key: {status, assignedTo, engId}}}
for row in CALL_1F_ROWS:
    opty  = str(row[0]).strip() if row[0] else ''
    eng_id= str(row[1]).strip() if row[1] else ''
    etype = str(row[2]).strip().lower() if row[2] else ''
    estat = str(row[3]).strip().lower() if row[3] else ''
    eassigned = str(row[4]).strip() if row[4] else ''
    mk = ENG_TYPE_TO_MILESTONE.get(etype, '')
    if not opty or not mk:
        continue
    score = ENG_STATUS_TO_SCORE.get(estat, 'a')  # unknown status = amber
    if opty not in eng_map:
        eng_map[opty] = {}
    # Last-write-wins per milestone (most recent engagement record wins)
    eng_map[opty][mk] = {'status': score, 'assignedTo': eassigned, 'engId': eng_id}

# Merge into opty_map
for opty in opty_map:
    opty_map[opty]['engagements'] = eng_map.get(opty, {})

print(f"✅ Call 1f: {len(CALL_1F_ROWS)} engagement rows → {len(eng_map)} opties enriched")
```

**Add `engagements` field to PIPE_Q1 deal objects:**
```python
# In the PIPE_Q1 builder loop:
deal['engagements'] = opty_map[opty].get('engagements', {})
# engagements = {} means no Dynamics engagement records found — modal uses stage inference
```

**Assert engagements field present in canonical deal schema:**
```python
# In Step 5 schema assertion:
assert all('engagements' in d for d in PIPE_Q1), \
    "FAIL: 'engagements' field missing from PIPE_Q1 deals — NNR #41"
```

Result: `CALL_1F_ROWS`. Zero rows = valid. Field added to canonical PIPE_Q1 schema.


Return opportunity_number, account_name, opportunity_name, sales_rep_name,
territory_name, opportunity_stage, opportunity_close_date, nnacv_usd_cfx
for each individual SKU row. Do NOT group or aggregate.
Include ALL rows with positive AND negative nnacv.
Filter: territory_name ILIKE '[DETECTED_TERRITORY]%'
AND opportunity_close_date BETWEEN '[CQ_START]' AND '[CQ_END]'
AND opportunity_stage = '8 - Closed Won (100%)'."
```

⚠️ **Call 2a uses `territory_name ILIKE` (NOT `territory_district`) — this is intentional and mandatory.**
Closed Won/Lost records are historical — their `territory_district` field may not be populated consistently for partner-owned accounts (same root cause as the open pipeline Call 1e fix). `territory_name` is the correct filter for closed deals and is the field that Dynamics populates reliably on close. This is the canonical filter for ALL closed deal queries.

Result: CLOSED_WON_ROWS.

### Call 2b — Closed Lost downsells (MANDATORY — uses territory_name broadening)
```
Data_Analytics_Connection question:
"Show all closed lost opportunities for [DETECTED_TERRITORY] territory in [CQ_LABEL].
Return opportunity_number, account_name, opportunity_name, sales_rep_name,
territory_name, opportunity_stage, opportunity_close_date, nnacv_usd_cfx
for each individual SKU row. Do NOT aggregate.
Include ALL rows with positive AND negative nnacv.
Filter: territory_name ILIKE '[DETECTED_TERRITORY]%'
AND opportunity_close_date BETWEEN '[CQ_START]' AND '[CQ_END]'
AND opportunity_stage = '9 - Closed Lost (0%)'."
```

⚠️ **Do NOT use `pipeline_status = 'Closed'`** — this column does not exist in the underlying Snowflake view and will return 0 rows. Use the stage string `'9 - Closed Lost (0%)'` directly.
⚠️ **Call 2b uses `territory_name ILIKE` (NOT `territory_district`)** — same rationale as Call 2a above. Partner-owned account downsells (e.g. Infosys-prefix accounts) will only surface via `territory_name`. Using `territory_district` will silently drop downsells for these accounts.
⚠️ **Include positive AND negative NNACV rows** — some Closed Lost records carry positive NNACV (data entry error in Dynamics) which must be negated in Python. Some carry correctly-negative values. Never filter by NNACV sign before negation.
Result: CLOSED_LOST_ROWS. Zero rows = valid — no Closed Lost is not an error.
⚠️ **NEGATION RULE:** After parsing, negate any positive NNACV: `acv = acv if acv < 0 else -acv`

---

## STEP 3 — FORWARD QUARTER STATS (THREE SEPARATE QUERIES — MANDATORY)

⚠️ **SINGLE BATCHED QUERY IS BANNED.** Root cause confirmed 2026-03-29: Snowflake Cortex silently returns `$0.0M` for grouped multi-quarter queries because it cannot reliably group by derived quarter buckets across a wide date range. The ONLY safe pattern — identical to the proven Call 1 M1/M2/M3 fix — is THREE SEPARATE QUERIES, one per forward quarter. This is NON-NEGOTIABLE.

⚠️ **DEPLOY BLOCKER: `$0.0M` in any `_QTR_STATS` slot = query did not run or silently failed.** Re-run the individual query for that quarter before deploying. "0 deals, $0.0M" from a legitimately empty quarter IS valid — but only if `n` is explicitly `"0"` after the query ran and returned zero rows. If the query was never fired (e.g. skipped due to context pressure), the slot stays `"$0.0M"` and blocks deploy.

### Compute forward quarter date ranges

```python
import datetime as _dt
_cq_end_d = _dt.date.fromisoformat(CQ_END)

def _qtr_bounds(start_date_str):
    d = _dt.date.fromisoformat(start_date_str)
    q = (d.month - 1) // 3
    starts = [(d.year,1,1),(d.year,4,1),(d.year,7,1),(d.year,10,1)]
    ends   = [(d.year,3,31),(d.year,6,30),(d.year,9,30),(d.year,12,31)]
    return (_dt.date(*starts[q]).isoformat(), _dt.date(*ends[q]).isoformat())

FWD1_START, FWD1_END = _qtr_bounds((_cq_end_d + _dt.timedelta(days=1)).isoformat())
_f2s = (_dt.date.fromisoformat(FWD1_END) + _dt.timedelta(days=1)).isoformat()
FWD2_START, FWD2_END = _qtr_bounds(_f2s)
_f3s = (_dt.date.fromisoformat(FWD2_END) + _dt.timedelta(days=1)).isoformat()
FWD3_START, FWD3_END = _qtr_bounds(_f3s)

# ⚠️ Print and verify before querying — must NOT overlap with CQ
print(f"FWD1: {FWD1_START}→{FWD1_END}")
print(f"FWD2: {FWD2_START}→{FWD2_END}")
print(f"FWD3: {FWD3_START}→{FWD3_END}")
```

Example: if CQ = Q2 FY2026 (Apr–Jun 2026):
- FWD1 = Q3 FY2026: 2026-07-01 to 2026-09-30
- FWD2 = Q4 FY2026: 2026-10-01 to 2026-12-31
- FWD3 = Q1 FY2027: 2027-01-01 to 2027-03-31

### Run THREE SEPARATE queries (fire in parallel)

**Query 3a — FWD1 (next quarter after CQ):**
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show open pipeline opportunities with
close_date between [FWD1_START] and [FWD1_END].
Return: SUM(nnacv_usd_cfx) as total_nnacv, COUNT(DISTINCT opportunity_number) as deal_count.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[FWD1_START]' AND '[FWD1_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter by nnacv — include zero and null."
```

**Query 3b — FWD2:**
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show open pipeline opportunities with
close_date between [FWD2_START] and [FWD2_END].
Return: SUM(nnacv_usd_cfx) as total_nnacv, COUNT(DISTINCT opportunity_number) as deal_count.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[FWD2_START]' AND '[FWD2_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter by nnacv — include zero and null."
```

**Query 3c — FWD3:**
```
Data_Analytics_Connection question:
"For [DETECTED_TERRITORY] territory, show open pipeline opportunities with
close_date between [FWD3_START] and [FWD3_END].
Return: SUM(nnacv_usd_cfx) as total_nnacv, COUNT(DISTINCT opportunity_number) as deal_count.
Filter: territory_district ILIKE '[DETECTED_TERRITORY]%'
AND close_date BETWEEN '[FWD3_START]' AND '[FWD3_END]'.
Exclude Closed Won and Closed Lost stages.
Do not filter by nnacv — include zero and null."
```

⚠️ **Do NOT add `pipeline_status = 'Open'`** — stage-based exclusion is the correct pattern.
⚠️ **If the tool does not support parallel invocation**, run in order: 3a → 3b → 3c.
⚠️ **Each query returns ONE summary row** — total NNACV and deal count for that quarter window.

### Parse results into _QTR_STATS

```python
def _fmt_pipe(total):
    """Format NNACV as display string."""
    a = abs(total or 0)
    s = '-' if (total or 0) < 0 else ''
    if a >= 1_000_000: return f'{s}${a/1_000_000:.1f}M'
    if a >= 1_000:     return f'{s}${a/1_000:.0f}K'
    return f'{s}${a:,.0f}'

# Parse each query result — extract total_nnacv and deal_count from single summary row
# r[0] = total_nnacv (or column named TOTAL_NNACV), r[1] = deal_count (or DEAL_COUNT)
# If query returned 0 rows → valid empty quarter: pipe="$0.0M", n="0"
def _parse_fwd_row(rows):
    if not rows: return '$0.0M', '0'
    r = rows[0]
    try: total = float(str(r[0]).replace(',','') if r[0] else 0)
    except: total = 0
    try: n = int(r[1] if r[1] else 0)
    except: n = 0
    return _fmt_pipe(total), str(n)

FWD1_PIPE, FWD1_N = _parse_fwd_row(FWD1_ROWS)  # from Query 3a result
FWD2_PIPE, FWD2_N = _parse_fwd_row(FWD2_ROWS)  # from Query 3b result
FWD3_PIPE, FWD3_N = _parse_fwd_row(FWD3_ROWS)  # from Query 3c result

print(f"FWD1 ({FWD1_START}→{FWD1_END}): {FWD1_PIPE} | {FWD1_N} deals")
print(f"FWD2 ({FWD2_START}→{FWD2_END}): {FWD2_PIPE} | {FWD2_N} deals")
print(f"FWD3 ({FWD3_START}→{FWD3_END}): {FWD3_PIPE} | {FWD3_N} deals")
```

### Build _QTR_STATS and _QTR_META labels in Step 5

After deriving the forward quarter date ranges, build BOTH `_QTR_STATS` and `_QTR_META` labels in Step 5 Python (not Step 3). The date ranges from Step 3 are inputs to the query only — the label population happens in Step 5 after all data is parsed:

```python
# ── In Step 5, after CQ_LABEL and forward quarter ranges are known ─────────────
# Derive FWD quarter labels from CQ quarter number and year.
# CQ_LABEL format: "Q2 FY2026" → parse quarter number and fiscal year.
import re as _re
_cq_m = _re.match(r'Q(\d) FY(\d{4})', CQ_LABEL)
if _cq_m:
    _cq_qnum = int(_cq_m.group(1))   # e.g. 2
    _cq_yr   = int(_cq_m.group(2))   # e.g. 2026
else:
    _cq_qnum, _cq_yr = 2, 2026        # safe fallback

def _fwd_label(offset):
    """Return 'QX FYYYYY' for CQ+offset quarters ahead."""
    q = (_cq_qnum - 1 + offset) % 4 + 1
    y = _cq_yr + (_cq_qnum - 1 + offset) // 4
    return f'Q{q} FY{y}'

def _fwd_months(offset):
    """Return short month range string e.g. 'Jul–Sep 2026'."""
    q = (_cq_qnum - 1 + offset) % 4 + 1
    y = _cq_yr + (_cq_qnum - 1 + offset) // 4
    _mo = {1: ('Jan','Mar'), 2: ('Apr','Jun'), 3: ('Jul','Sep'), 4: ('Oct','Dec')}
    s, e = _mo[q]
    return f'{s}–{e} {y}'

_QTR_META = {
    'q1Label':   CQ_LABEL,
    'territory': TERRITORY,
    'q2': {'label': _fwd_label(1), 'months': _fwd_months(1)},  # e.g. Q3 FY2026 / Jul–Sep 2026
    'q3': {'label': _fwd_label(2), 'months': _fwd_months(2)},  # e.g. Q4 FY2026 / Oct–Dec 2026
    'q4': {'label': _fwd_label(3), 'months': _fwd_months(3)},  # e.g. Q1 FY2027 / Jan–Mar 2027
}

_QTR_STATS = {
    "q2": {"pipe": FWD1_PIPE, "n": FWD1_N},   # FWD1 — from Query 3a result
    "q3": {"pipe": FWD2_PIPE, "n": FWD2_N},   # FWD2 — from Query 3b result
    "q4": {"pipe": FWD3_PIPE, "n": FWD3_N},   # FWD3 — from Query 3c result
}

# ── STEP 3 DEPLOY BLOCKER ──────────────────────────────────────────────────────
# ⚠️ NON-NEGOTIABLE: If any FWD variable is still "$0.0M" here, the query was never
# fired or silently failed. "$0.0M" from a legitimately empty quarter IS allowed,
# BUT only after the query ran and returned 0 rows. This assert catches the case
# where queries were skipped entirely (e.g. context pressure, tool limit).
# FWD1/FWD2/FWD3 must have been set by _parse_fwd_row() above — not left as defaults.
_fwd_not_run = [
    k for k, v in [('FWD1', FWD1_PIPE), ('FWD2', FWD2_PIPE), ('FWD3', FWD3_PIPE)]
    if v == '--'  # '--' means _parse_fwd_row was never called for that quarter
]
if _fwd_not_run:
    print(f"❌ DEPLOY BLOCKED — Forward quarter queries not run: {_fwd_not_run}")
    print("   Re-run Step 3 queries before proceeding. This is a non-negotiable deploy gate.")
    sys.exit(1)
else:
    print(f"✅ _QTR_STATS populated: FWD1={FWD1_PIPE}/{FWD1_N} | FWD2={FWD2_PIPE}/{FWD2_N} | FWD3={FWD3_PIPE}/{FWD3_N}")
# Overwrite pipe/n from Step 3 Snowflake result rows after parsing.
```

⚠️ **`_QTR_META` labels are the source of truth for ALL forward quarter labels in the UI** — stat card headers, tab names, pane titles, and Run button text all derive from `_QTR_META[qk].label` at DOMContentLoaded. Never hardcode "Fwd Q1/Q2/Q3" anywhere — these are meaningless to managers who think in real quarter names (Q3, Q4 etc).

⚠️ **Deploy blocker:** `_QTR_STATS` slots are populated directly from `FWD1_PIPE/N`, `FWD2_PIPE/N`, `FWD3_PIPE/N` which are set by `_parse_fwd_row()` after each of the three separate Step 3 queries runs. If a query was skipped, the `_fwd_not_run` assert in Step 5 will catch it and call `sys.exit(1)`. "$0.0M / 0 deals" is a valid result for an empty quarter; it is only a blocker if it came from a default rather than a real query result.

⚠️ **NNR #41 — FWD SANITY CHECK (new):** After parsing Step 3 results and populating `_QTR_STATS`, assert that the FWD1 pipeline value does NOT equal the CQ pipeline total from Step 1. If `_QTR_STATS['q2']['pipe']` matches the CQ net NNACV, it means the Step 3 query returned Q2 deals (close dates Apr–Jun) instead of Q3 deals (close dates Jul–Sep). Common causes: wrong `FWD1_START` date, or the tool defaulted to the last-used date range. Fix: re-derive `FWD1_START = CQ_END + 1 day` explicitly in Python before Step 3 fires; print all three date ranges to console before running the query so they can be verified.

```python
# ── In Step 5, after _QTR_STATS is populated from Step 3 results ──────────────
# FWD sanity check (NNR #41): FWD1 matching CQ total = date range bug
_cq_total_fmt = fmt(total_pipe) if 'total_pipe' in dir() else None
_fwd1_fmt = _QTR_STATS.get('q2', {}).get('pipe', '$0.0M')
if _cq_total_fmt and _fwd1_fmt == _cq_total_fmt:
    print(f"⚠️ NNR #41 WARNING: FWD Q1 pipeline ({_fwd1_fmt}) matches CQ total — "
          f"Step 3 query likely used wrong date range. "
          f"Re-run Step 3 with explicit FWD1_START = '{FWD1_START}' AND FWD3_END = '{FWD3_END}'.")
    # This is a WARNING not a hard blocker — FWD data is best-effort
    # But Claude should note the discrepancy in the dashboard header
```

**Step 3 date derivation — print and verify before querying:**
```python
import datetime as _dt
_cq_end_d = _dt.date.fromisoformat(CQ_END)
FWD1_START = (_cq_end_d + _dt.timedelta(days=1)).isoformat()   # e.g. 2026-07-01
FWD1_END   = (_cq_end_d + _dt.timedelta(days=91)).isoformat()  # e.g. 2026-09-29 (approx)
# Always use quarter boundaries — derive properly:
def _qtr_bounds(start_date_str):
    d = _dt.date.fromisoformat(start_date_str)
    q = (d.month - 1) // 3  # 0=Q1, 1=Q2, 2=Q3, 3=Q4
    starts = [(d.year,1,1),(d.year,4,1),(d.year,7,1),(d.year,10,1)]
    ends   = [(d.year,3,31),(d.year,6,30),(d.year,9,30),(d.year,12,31)]
    return (_dt.date(*starts[q]).isoformat(), _dt.date(*ends[q]).isoformat())
FWD1_START, FWD1_END = _qtr_bounds((_cq_end_d + _dt.timedelta(days=1)).isoformat())
_fwd2_start = (_dt.date.fromisoformat(FWD1_END) + _dt.timedelta(days=1)).isoformat()
FWD2_START, FWD2_END = _qtr_bounds(_fwd2_start)
_fwd3_start = (_dt.date.fromisoformat(FWD2_END) + _dt.timedelta(days=1)).isoformat()
FWD3_START, FWD3_END = _qtr_bounds(_fwd3_start)
print(f"FWD date ranges: {FWD1_START}→{FWD1_END} | {FWD2_START}→{FWD2_END} | {FWD3_START}→{FWD3_END}")
# ⚠️ Claude must print these before calling Step 3 and verify they do NOT overlap with CQ
```

---

## STEP 4 — REMOVED

opportunity_name is read directly from Step 1 r[2] (oname).

---

## STEP 5 — PYTHON VALIDATION PIPELINE

Write and run this Python script inline (single bash_tool call).
**This validates data before it ever touches the HTML template.**

```python
import sys, json, re, datetime, os, glob
from collections import defaultdict, Counter

# ── CONFIGURATION ─────────────────────────────────────────────────────────────
TODAY         = datetime.date.today()
CQ_START      = '{CQ_START}'
CQ_END        = '{CQ_END}'
CQ_LABEL      = '{CQ_LABEL}'
CQ_LABEL_SAFE = CQ_LABEL.replace(' ', '_')
TERRITORY     = '{DETECTED_TERRITORY}'
QEND          = datetime.date.fromisoformat(CQ_END)
DAYS_LEFT     = (QEND - TODAY).days
QUOTA_DEFAULT = 1_500_000

# ── ⚠️ STEP 5 SUBSTITUTION CHECKLIST (Claude: do this BEFORE running Python) ──
# Before writing and running the Step 5 script, Claude MUST substitute the following
# three values from the Step 0 Stage 3/4 outputs. These are NOT auto-populated —
# Claude must find them in the conversation and insert them here:
#
#  1. MANAGER_NAME  — replace '' with the manager's name confirmed in Step 0 Stage 3
#                     e.g. MANAGER_NAME = 'Grant Thomson'
#                     This drives EXCLUDE_NAMES — wrong value = manager in stack rank
#
#  2. CONFIRMED_AES — replace [] with the KNOWN_AES list confirmed in Step 0 Stage 4
#                     (Call H result + manager edits). NEVER leave as [] for any territory.
#                     e.g. ['Alice Wong', 'James Park', 'Sara Kline']
#                     For ANZ FSI: use the Call H result, not the hardcoded defaults.
#
#  3. USER_QUOTAS   — replace {} with RESOLVED_QUOTAS from Step 0 Stage 4 Call H1
#                     (Snowflake-sourced + any manual overrides from manager confirmation).
#                     e.g. {'Alice Wong': 2000000, 'James Park': 1800000}
#                     Leave as {} ONLY if all AEs used the $1.5M default.
#
# ⚠️ Failure to substitute all three = deploy blocker or incorrect dashboard output.
#
# ── PRE-RUN SUBSTITUTION GUARD — Claude MUST run this check before writing Step 5 ──
# Before generating the Step 5 Python script, verify these three values are available
# in the conversation context from Step 0. If any are missing, DO NOT write or run the
# Step 5 script — return to Step 0 and collect the missing values first.
#
#   MANAGER_NAME  ← is it in the conversation? e.g. "Grant Thomson"     → YES/NO
#   CONFIRMED_AES ← is the AE roster confirmed from Call H?             → YES/NO
#   USER_QUOTAS   ← are Snowflake quotas or manager-supplied quotas set? → YES/NO
#
# If any answer is NO: pause, return to Step 0 Stage 3/4, collect it, then proceed.
# Only once all three are YES: write the Step 5 script with values substituted inline.
# ── END SUBSTITUTION CHECKLIST ─────────────────────────────────────────────────

# ── SESSION NAMESPACING (PD #30) — MANDATORY ─────────────────────────────────
# SESSION_KEY is derived from manager name + territory + quarter.
# All temp paths use this key — prevents cross-user file collisions in shared deploys.
# Claude MUST substitute MANAGER_NAME before this block runs.
# ── REPLACE THIS LINE ──────────────────────────────────────────────────────────
MANAGER_NAME = ''   # ← REPLACE with Step 0 Stage 3 confirmed manager name
# ── END REPLACE ────────────────────────────────────────────────────────────────

if not MANAGER_NAME or not MANAGER_NAME.strip():
    print("❌ DEPLOY BLOCKER: MANAGER_NAME is empty — cannot derive SESSION_KEY.")
    print("   ACTION: Substitute MANAGER_NAME with the value from Step 0 Stage 3.")
    sys.exit(1)

_mgr_slug   = re.sub(r'[^a-z0-9]', '', MANAGER_NAME.split()[-1].lower())[:8]
_terr_slug  = re.sub(r'[^a-z0-9]', '', TERRITORY.lower().replace(' ', '_'))[:12]
_q_slug     = CQ_LABEL.replace(' ', '').replace('/', '').lower()[:8]
SESSION_KEY = f'{_mgr_slug}_{_terr_slug}_{_q_slug}'   # e.g. 'thomson_anzfsi_q2fy2026'

# Session-namespaced paths (PD #30) — use these everywhere; never the bare paths
DS_PATH    = f'/home/claude/data_swap_{SESSION_KEY}.json'
QUOTA_PATH = f'/mnt/user-data/outputs/ssc_quotas_{SESSION_KEY}.json'
SHELL_PATH = f'/mnt/user-data/outputs/ssc_shell_{SESSION_KEY}.html'
OUT_PATH   = '/mnt/user-data/outputs/servicenow-sales-command-centre.html'
print(f'✅ Session key: {SESSION_KEY}')
print(f'   DS_PATH:    {DS_PATH}')
print(f'   SHELL_PATH: {SHELL_PATH}')

# ── KNOWN AES — MUST come from Call H (Step 0 Stage 4) — never hardcoded ──────
# ⚠️ PD #29 HARD ABORT: CONFIRMED_AES must be populated from Call H result.
# For ANY territory (including ANZ FSI), Call H resolves the real current roster.
# The ANZ FSI list below is the LAST-RESORT fallback only when Call H returns zero
# rows (e.g. Snowflake quota table not yet populated for this quarter).
# Claude MUST substitute this list with the confirmed roster from Stage 4.
# ── REPLACE THIS LINE ──────────────────────────────────────────────────────────
CONFIRMED_AES = []  # ← REPLACE with KNOWN_AES confirmed in Step 0 Stage 4
#                     e.g. ['Alice Wong', 'James Park', 'Sara Kline']
#                     This MUST be populated for every territory, including ANZ FSI.
# ── END REPLACE ────────────────────────────────────────────────────────────────

TERRITORY_IS_ANZ_FSI = 'ANZ FSI' in TERRITORY

if not CONFIRMED_AES:
    if TERRITORY_IS_ANZ_FSI:
        # Last-resort fallback — only acceptable when Call H returned zero rows for ANZ FSI
        print("⚠️ WARNING: CONFIRMED_AES is empty — falling back to ANZ FSI hardcoded list.")
        print("   This typically means quotas haven't been loaded into GTM_SALES_REP_QUOTA yet")
        print("   for this quarter, OR the territory name format didn't match during Call H.")
        print(f"   Dashboard will deploy with $1.5M default quotas for all AEs.")
        print(f"   Manager was presented a friendly 'quotas not loaded yet' message in Stage 4.")
        CONFIRMED_AES = [
            'Kevin Pecqueux', 'Varun Verma', 'Graham Rothwell', 'Rod Hathway',
            'Paul Christoforatos', 'Maneesh Gupta', 'Zak Mann', 'Simon Kobakian',
            'Amelia Horne', 'Bridget Davidson'
        ]
    else:
        # Non-ANZ FSI with no roster — present friendly guidance, not a raw sys.exit
        print("❌ DEPLOY BLOCKER: CONFIRMED_AES is empty for non-ANZ FSI territory.")
        print(f"   Territory: {TERRITORY}")
        print("   The quota table had no records for this territory/quarter.")
        print("   ACTION: Return to Step 0 Stage 4 — present the manager with this message:")
        print("   'I couldn't find your team in Snowflake yet. Please supply your AE names")
        print("    and quotas (e.g. \"Alice $2M, James $1.8M\") and I'll run the dashboard.'")
        sys.exit(1)

KNOWN_AES = CONFIRMED_AES

# Resolve EXCLUDE_NAMES from MANAGER_NAME (always live-wired — no hardcoded fallback)
EXCLUDE_NAMES = {MANAGER_NAME.strip()}
# Also exclude common manager title variants that may appear in Snowflake data
EXCLUDE_NAMES.update({n for n in KNOWN_AES if n.lower() in MANAGER_NAME.lower()})
print(f'✅ Manager: {MANAGER_NAME} | Excluded from stack rank: {EXCLUDE_NAMES}')
# Remove any accidental self-exclusion of AEs (only exclude the manager)
EXCLUDE_NAMES = {MANAGER_NAME.strip()}

# ── QUOTA MAP — from Snowflake Call H1 (primary) or manager override ──────────
# USER_QUOTAS is populated from RESOLVED_QUOTAS in Step 0 Stage 4 (Call H1).
# Snowflake-sourced quotas are used directly; manager overrides are applied on top.
# AEs with no quota in H1 and no override fall back to QUOTA_DEFAULT ($1.5M).
# Format: USER_QUOTAS = {'Kevin Pecqueux': 2000000, 'Varun Verma': 1800000, ...}
# ── REPLACE THIS LINE ──────────────────────────────────────────────────────────
USER_QUOTAS = {}  # ← REPLACE with RESOLVED_QUOTAS dict from Step 0 Stage 4 Call H1
#                   e.g. {'Kevin Pecqueux': 2000000, 'Graham Rothwell': 2500000, ...}
#                   Populated from GTM_SALES_REP_QUOTA.QUOTA_REP_USD — not user-typed.
#                   Leave as {} ONLY if Call H1 returned zero rows for all AEs.
# ── END REPLACE ────────────────────────────────────────────────────────────────
USING_QUOTA_DEFAULTS = len(USER_QUOTAS) < len(KNOWN_AES)  # True if ANY AE has no quota
if USING_QUOTA_DEFAULTS:
    _missing_quotas = [ae for ae in KNOWN_AES if ae not in USER_QUOTAS]
    print(f"⚠️ {len(_missing_quotas)} AE(s) using $1.5M default quota: {_missing_quotas}")

def get_quota(ae_name):
    """Return quota for AE from Snowflake-sourced dict, or QUOTA_DEFAULT."""
    return USER_QUOTAS.get(ae_name, QUOTA_DEFAULT)

# ── AE SEGMENT MAP — drives STR/ENT label and focus context in coaching ───────
# Format: ae_name → (segment, focus_description)
# For ANZ FSI: the known-good default below is used automatically.
# For non-ANZ FSI territories: defaults to ('ENT', 'multi-account') for every AE
# discovered via Call H — NO manual input required. This means coaching cards
# render correctly for any territory without a prompt.
# Optional override: supply CONFIRMED_SEGMENTS from Step 0 Stage 3 for richer labels
# (e.g. {'Alice Wong': ('ENT', 'Suncorp-only')}) — takes priority if provided.
# ── REPLACE THIS LINE if non-ANZ FSI and segment detail is known ──────────────
CONFIRMED_SEGMENTS = {}  # ← OPTIONALLY replace with {'Alice Wong': ('ENT','Suncorp-only'), ...}
#                          Leave as {} to use safe territory-neutral defaults.
# ── END REPLACE ────────────────────────────────────────────────────────────────
_AE_SEGMENT_ANZ_FSI = {
    'Kevin Pecqueux':     ('STR', 'Westpac-only'),
    'Varun Verma':        ('STR', 'CBA / multi-account'),
    'Graham Rothwell':    ('STR', 'NAB-only'),
    'Rod Hathway':        ('STR', 'ANZ Bank-only'),
    'Paul Christoforatos':('STR', 'multi-account'),
    'Maneesh Gupta':      ('ENT', 'Resolution Life / HBF'),
    'Zak Mann':           ('ENT', 'Suncorp / multi-account'),
    'Simon Kobakian':     ('ENT', 'McMillan Shakespeare / multi-account'),
    'Amelia Horne':       ('ENT', 'Computershare / Bupa'),
    'Bridget Davidson':   ('ENT', 'RACQ / multi-account'),
}
if CONFIRMED_SEGMENTS:
    # User-supplied segments take priority (any territory)
    AE_SEGMENT = CONFIRMED_SEGMENTS
elif TERRITORY_IS_ANZ_FSI:
    # ANZ FSI: use known-good defaults
    AE_SEGMENT = _AE_SEGMENT_ANZ_FSI
else:
    # Non-ANZ FSI with no segment override: safe territory-neutral default.
    # Defaults every AE to ('ENT', 'multi-account') so coaching cards render
    # correctly without prompting the manager. No deploy blocker.
    AE_SEGMENT = {ae: ('ENT', 'multi-account') for ae in KNOWN_AES}
    print(f"ℹ️ Non-ANZ FSI territory: AE_SEGMENT defaulted to ENT/multi-account for {len(KNOWN_AES)} AEs.")
    print("   Supply CONFIRMED_SEGMENTS in Step 5 for richer segment labels.")

# ── AE RESOLUTION — PURE SNOWFLAKE (Prime Directive #13) ────────────────────
# AE comes ONLY from parent_opportunity_sales_rep_name in Snowflake.
# If blank → Unassigned. NO account-name inference. NO hardcoded maps.
# Territory assignments change — hardcoded maps go stale and produce wrong data.

def resolve_ae(raw_ae):
    """Return AE name from Snowflake only. Blank or excluded name → Unassigned."""
    if raw_ae and raw_ae.strip() and raw_ae.strip() not in ('Unassigned', ''):
        n = raw_ae.strip()
        if n in EXCLUDE_NAMES: return 'Unassigned'
        return n
    return 'Unassigned'

# ── STAGE GATE VALUES — strip from nextSteps (Prime Directive #15) ────────────
STAGE_GATE_VALUES = {
    'Pre-Negotiation', 'Order Form Approved', 'Final', 'Submitted',
    'Negotiation', 'Approved', 'In Negotiation', 'Draft', 'Pending',
    'Under Review', 'Closed', 'Won', 'Lost',
}

def clean_next_steps(raw):
    if not raw: return ''
    stripped = str(raw).strip()
    if stripped in STAGE_GATE_VALUES: return ''
    if len(stripped) < 15: return ''
    return stripped

# ── ⚠️ NNR #41 ANTI-FABRICATION GUARD — RUNS BEFORE ANYTHING ELSE ─────────────
# This guard fires BEFORE opty_map is built. If RAW_PIPE exists as a variable,
# it means Claude hardcoded pipeline data instead of running Snowflake queries.
# This is the single most severe failure mode — fabricated data looks plausible
# but is completely wrong. Root cause of 2026-03-30 incident. ABSOLUTE BLOCKER.
if 'RAW_PIPE' in dir():
    print("❌ DEPLOY BLOCKER — NNR #41: RAW_PIPE is defined as a hardcoded variable.")
    print("   This means pipeline data was fabricated, not pulled from Snowflake.")
    print("   Action: Delete RAW_PIPE, run Steps 1–3 (Call 1 M1/M2/M3 + Call 1d),")
    print("   and parse results via parse_tool_result(). NEVER hardcode deal data.")
    sys.exit(1)

# ── MULTI-RESULT-SET PARSER (Prime Directive #20) ────────────────────────────
# Snowflake Cortex sometimes returns the SAME opportunity in two result sets
# with different schema variants. parse_all_results() returns ALL result sets;
# the opty_map builder uses _source_set tracking to NEVER double-count NNACV.
def parse_all_results(fpath):
    """Parse all SSE result sets from a stored tool_result JSON file."""
    if not os.path.exists(fpath):
        print(f"❌ DEPLOY BLOCKER — NNR #41: Required Snowflake result file missing: {fpath}")
        print("   This file should have been written by the account_insights tool call.")
        print("   Action: Re-run the corresponding Steps 1–3 Snowflake query.")
        sys.exit(1)
    with open(fpath) as f: raw = json.load(f)
    text = raw[0]['text'] if isinstance(raw, list) else raw.get('text', '')
    try: events = json.loads(text)
    except: events = [text]
    result_sets = []
    for ev in events:
        if 'event: response.tool_result\n' not in ev: continue
        try:
            obj = json.loads(ev.split('data: ', 1)[1])
            rs  = obj['content'][0]['json']['result_set']
            cols = [c['name'] for c in rs['resultSetMetaData']['rowType']]
            data = rs.get('data', [])
            result_sets.append((cols, data))
        except: pass
    return result_sets

# ── MANDATORY PIPELINE SOURCE FILE RESOLUTION (NNR #41) ──────────────────────
# Step 5 MUST load pipeline data from the four Snowflake result files written
# by Steps 1–3. These files are written to /mnt/user-data/tool_results/ by the
# account_insights tool. Claude MUST identify the correct file paths by scanning
# the most-recent tool_results files for the M1/M2/M3/C1d queries.
#
# File naming: tool results are stored as:
#   /mnt/user-data/tool_results/Data_Analytics_Connection_account_insights_{tool_use_id}.json
#
# RESOLUTION PROTOCOL:
# 1. At the END of each Steps 1–3 account_insights call, record the tool_use_id
#    (visible in the SSE stream as "tool_use_id": "toolu_...").
# 2. Store as M1_PATH, M2_PATH, M3_PATH, C1D_PATH variables here.
# 3. If the result was small enough to return inline (not stored to file),
#    write it to /home/claude/pipe_m{N}_{SESSION_KEY}.json before Step 5.
#
# ⚠️ CLAUDE: Before running this Step 5 script, substitute these four paths
#            with the actual file paths from the Steps 1–3 tool calls.
#            If a result was inline (not stored), write it to disk first.
#
# ── REPLACE THESE FOUR LINES ────────────────────────────────────────────────
M1_PATH  = ''   # ← REPLACE: path to Call 1 M1 (Apr) tool result JSON
M2_PATH  = ''   # ← REPLACE: path to Call 1 M2 (May) tool result JSON
M3_PATH  = ''   # ← REPLACE: path to Call 1 M3 (Jun) tool result JSON
C1D_PATH  = ''   # ← REPLACE: path to Call 1d (blank AE supplement) tool result JSON
E_M1_PATH = ''   # ← REPLACE: path to Call 1e M1 (partner-account, month 1) tool result JSON
E_M2_PATH = ''   # ← REPLACE: path to Call 1e M2 (partner-account, month 2) tool result JSON
E_M3_PATH = ''   # ← REPLACE: path to Call 1e M3 (partner-account, month 3) tool result JSON
# ── END REPLACE ─────────────────────────────────────────────────────────────

# ── NNR #63: MANDATORY 7-QUERY COMPLETION GATE ───────────────────────────────
# ALL 7 pipeline source files MUST be present before Step 5 runs.
# Missing any one = silent under-count. This is a hard sys.exit(1) — not a warning.
# The 7 queries are: M1, M2, M3 (territory_district), C1D (blank AE),
# 1e-M1, 1e-M2, 1e-M3 (territory_name / partner-account supplement).
# Together they form the complete pipeline. Running only M1/M2/M3 is NEVER sufficient.
REQUIRED_QUERY_PATHS = {
    'M1  (Apr, territory_district)': M1_PATH,
    'M2  (May, territory_district)': M2_PATH,
    'M3  (Jun, territory_district)': M3_PATH,
    'C1D (blank AE, full quarter)':  C1D_PATH,
    '1e-M1 (Apr, territory_name)':   E_M1_PATH,
    '1e-M2 (May, territory_name)':   E_M2_PATH,
    '1e-M3 (Jun, territory_name)':   E_M3_PATH,
}
_missing_queries = [label for label, path in REQUIRED_QUERY_PATHS.items()
                    if not path or not path.strip() or not os.path.exists(path)]
if _missing_queries:
    print(f"❌ DEPLOY BLOCKER — NNR #63: {len(_missing_queries)} of 7 required pipeline queries not run:")
    for q in _missing_queries:
        print(f"   MISSING: {q}")
    print()
    print("   All 7 queries MUST complete before Step 5. Each covers a different")
    print("   slice of the pipeline — missing any one produces material under-count.")
    print("   Return to Step 1 and run the missing queries before proceeding.")
    sys.exit(1)

print(f"✅ NNR #63: All 7 pipeline source files confirmed present:")
for label, path in REQUIRED_QUERY_PATHS.items():
    print(f"   {label}: {path}")

# ── NNR #62: SQL INSPECTION GATE — run assert_no_limit for all 7 paths ───────
# assert_no_limit and extract_generated_sql are defined in Step 1 (see Call 1 M1 block).
# Run all 7 checks here as a consolidated gate before parsing begins.
for label, path in REQUIRED_QUERY_PATHS.items():
    assert_no_limit(extract_generated_sql(path), label)
print("✅ NNR #62: All 7 queries passed LIMIT check — no Cortex row cap detected.")
# ── END 7-QUERY GATE ─────────────────────────────────────────────────────────

# ── INLINE RESULT WRITER — for M2/small results returned in-context ──────────
# When the tool result was small enough to return inline (not auto-stored to
# /mnt/user-data/tool_results/), Claude must write it to disk before Step 5.
# Use this helper to persist inline data from the conversation context.
#
# def write_inline_result(rows, cols, path):
#     """Wrap inline rows/cols in SSE envelope format so parse_all_results() can read it."""
#     rs = {"data": rows, "resultSetMetaData": {"rowType": [{"name": c} for c in cols]}}
#     payload = [{"type":"json","json":{"result_set": rs}}]
#     sse_event = f'event: response.tool_result\ndata: {json.dumps({"content": payload})}\n\n'
#     with open(path, 'w') as f:
#         json.dump([{"text": json.dumps([sse_event])}], f)
#
# Example (M2 May inline result):
#   write_inline_result(m2_rows, m2_cols, f'/home/claude/pipe_m2_{SESSION_KEY}.json')
#   M2_PATH = f'/home/claude/pipe_m2_{SESSION_KEY}.json'

# ── PROBABILITY: stage string is ground truth ──────────────────────────────────
def prob_from_stage(stage_str, snowflake_prob_raw=None):
    m = re.search(r'\((\d+)%\)', stage_str or '')
    if m: return int(m.group(1))
    if snowflake_prob_raw:
        try:
            p = float(snowflake_prob_raw)
            return round(p * 100) if p <= 1.0 else round(p)
        except: pass
    return 0

# ── HELPERS ───────────────────────────────────────────────────────────────────
def fmt(n):
    a = abs(n); s = '-' if n < 0 else ''
    if a >= 1_000_000: return f'{s}${a/1_000_000:.1f}M'
    if a >= 1_000:     return f'{s}${a/1_000:.0f}K'
    return f'{s}${a:,.0f}'

def days_to_close(cd):
    try: return (datetime.date.fromisoformat(str(cd)) - TODAY).days
    except: return 999

def days_in_stage(stage_entered_date):
    """Return number of days a deal has been in its current stage. 0 if unknown."""
    if not stage_entered_date:
        return None
    try:
        return (TODAY - datetime.date.fromisoformat(str(stage_entered_date)[:10])).days
    except:
        return None

def deal_flags(ae, nnacv, cd):
    f = []
    if not ae or ae == 'Unassigned': f.append('UNASSIGNED')
    if nnacv < 0: f.append('DOWNSELL')
    try:
        d = (datetime.date.fromisoformat(str(cd)) - TODAY).days
        if d < 0:     f.append('STALE')
        elif d <= 7:  f.append('CLOSE_RED')
        elif d <= 14: f.append('CLOSE_AMBER')
    except: pass
    return f

# ── NOWSELL MILESTONE GAP HELPER ──────────────────────────────────────────────
def gap_milestones(stage_str):
    """Return expected milestone gaps based on stage number."""
    m = re.match(r'(\d+)', stage_str or '')
    if not m: return ['DIS', 'TV']
    n = int(m.group(1))
    if n <= 2: return ['DIS']
    if n == 3: return ['TV', 'MP', 'DIS']
    if n == 4: return ['BC', 'MP', 'DIS', 'TV']
    if n == 5: return ['COM', 'BC', 'DIS', 'TV', 'MP']
    if n == 6: return ['LPO', 'COM']
    if n >= 7: return ['LPO']
    return ['DIS', 'TV']

def deal_urgency(dtc):
    if dtc < 0:   return 'OVERDUE'
    if dtc <= 14: return 'CRITICAL'
    if dtc <= 30: return 'URGENT'
    if dtc <= 60: return 'ACTIVE'
    return 'PIPELINE'

# ── PARSE PIPELINE (Calls 1 M1/M2/M3 + Call 1d) — SKU-summing, dedup-safe ────
# ⚠️ NNR #41 ENFORCEMENT: pipeline comes ONLY from the four Snowflake files above.
# No hardcoded RAW_PIPE. No inline arrays. No fabrication. Data or deploy blocked.
#
# ⚠️ PD #20 TWO-PART RULE:
# PART A: SUM all SKU rows for the same opty WITHIN a single result set.
#         NAB OPTY2549840 has 24 SKU rows totalling $5.73M — first-row-only = $405K.
# PART B: NEVER accumulate NNACV for an opty already processed in a prior result set.
#         Monthly windows may theoretically overlap on rescheduled deals — dedup guard.
# Mechanism: _source_set index tracks which result set first populated each opty.
#   - Same set_idx → accumulate (more SKU rows for same opty in same query)
#   - Different set_idx → metadata-only update (dedup guard, no NNACV add)

# Load all four source files and combine into one merged result set list.
# set_idx 0=M1, 1=M2, 2=M3, 3=C1D — keeps dedup logic correct across monthly windows.
_pipe_sources = [
    ('M1', M1_PATH,  0),
    ('M2', M2_PATH,  1),
    ('M3', M3_PATH,  2),
    ('C1D',C1D_PATH, 3),
]
pipe_result_sets = []
for _src_name, _src_path, _src_idx in _pipe_sources:
    _sets = parse_all_results(_src_path)
    if not _sets:
        print(f"⚠️ {_src_name}: parse_all_results returned 0 result sets from {_src_path}")
        print(f"   This may mean the query returned zero rows (valid for empty month)")
        print(f"   OR the file format is unexpected — verify the file before deploying.")
    else:
        # Tag each result set with its canonical source index
        for _cols, _rows in _sets:
            pipe_result_sets.append((_src_name, _src_idx, _cols, _rows))
        print(f"✅ {_src_name}: {sum(len(r) for _,_,_,r in pipe_result_sets if _ == _src_name)} rows across {len(_sets)} result set(s)")

if not pipe_result_sets:
    print("❌ DEPLOY BLOCKER: All four pipeline source files returned 0 result sets.")
    print("   This means all four Snowflake queries returned empty results.")
    print("   Possible causes: wrong territory filter, wrong date range, or Cortex timeout.")
    print("   Re-run Call 1 M1/M2/M3/C1d before proceeding.")
    sys.exit(1)

opty_map = {}
for _src_name, set_idx, cols, rows in pipe_result_sets:
    col_map = {c: i for i, c in enumerate(cols)}
    def g(r, key, default=''):
        idx = col_map.get(key, -1)
        return r[idx] if idx >= 0 and idx < len(r) else default

    for r in rows:
        opty    = g(r, 'OPPORTUNITY_NUMBER')
        if not opty: continue
        account = g(r, 'ACCOUNT_NAME') or g(r, 'PARENT_OPPORTUNITY_ACCOUNT_NAME', '') or f'{TERRITORY} Account'
        oname   = g(r, 'OPPORTUNITY_NAME') or account
        raw_ae  = g(r, 'PARENT_OPPORTUNITY_SALES_REP_NAME') or g(r, 'AE', '') or ''
        ae      = resolve_ae(raw_ae)
        dist    = g(r, 'TERRITORY_DISTRICT', '') or g(r, 'OPPORTUNITY_TERRITORY_DISTRICT', '')
        stage   = g(r, 'OPPORTUNITY_STAGE', '')
        cd      = (g(r, 'CLOSE_DATE', '') or g(r, 'OPPORTUNITY_CLOSE_DATE', '')
                   or g(r, 'MIN_CLOSE_DATE', ''))
        prob_r  = g(r, 'PARENT_OPPORTUNITY_CLOSE_PROBABILITY', '') or g(r, 'AVG_CLOSE_PROBABILITY', '')
        # ⚠️ NNR #41: NNACV resolution — monthly pre-aggregated queries use TOTAL_NNACV;
        # raw SKU row queries use NNACV_USD_CFX. Support both column name variants.
        nnacv_r = (g(r, 'TOTAL_NNACV', '') or g(r, 'TOTAL_NNACV_USD', '')
                   or g(r, 'NNACV_USD_CFX', '') or g(r, 'PIPELINE_VALUE', '') or '0')
        try: nnacv = float(str(nnacv_r).replace(',', '')) if nnacv_r else 0
        except: nnacv = 0
        # ⚠️ Next steps: monthly queries return NEXT_STEPS; raw queries return PARENT_OPPORTUNITY_NEXT_STEPS
        ns_raw  = (g(r, 'NEXT_STEPS', '') or g(r, 'PARENT_OPPORTUNITY_NEXT_STEPS', ''))
        ns_date = (g(r, 'NEXT_STEPS_DATE', '') or g(r, 'PARENT_OPPORTUNITY_NEXT_STEPS_LAST_UPDATED', ''))
        notes   = (g(r, 'NOTES_SUMMARY', '') or g(r, 'NOTES_SUMMARY_7_DAYS', ''))

        prob = prob_from_stage(stage, prob_r)
        ns   = clean_next_steps(ns_raw)

        if 'Closed Won' in stage or 'Closed Lost' in stage: continue

        if opty not in opty_map:
            # First time seeing this opty — initialise with this SKU row's NNACV
            opty_map[opty] = {
                'opty': opty, 'account': account, 'name': oname,
                'ae': ae, 'dist': dist, 'nnacv': nnacv,
                'stage': stage, 'closeDate': cd, 'prob': prob,
                'nextSteps': ns, 'nextStepsDate': ns_date, 'notesSummary': notes,
                'stageEnteredDate': '',
                'competitor': '',
                'engagements': {},   # ⚠️ NNR #41: populated by Call 1f merger; {} = no engagement records
                '_source_set': set_idx,   # ⚠️ PD #20: track which result set owns this opty
            }
        elif opty_map[opty]['_source_set'] == set_idx:
            # ⚠️ PD #20 PART A: Same result set — this is another SKU row for the same opty.
            # ACCUMULATE NNACV. This is the correct net NNACV behaviour.
            opty_map[opty]['nnacv'] += nnacv
            # Update metadata if richer data arrives on later SKU rows
            if ae != 'Unassigned' and opty_map[opty]['ae'] == 'Unassigned':
                opty_map[opty]['ae'] = ae
            if ns and not opty_map[opty]['nextSteps']:
                opty_map[opty]['nextSteps'] = ns
            if notes and not opty_map[opty]['notesSummary']:
                opty_map[opty]['notesSummary'] = notes
        else:
            # ⚠️ PD #20 PART B: Different result set — Cortex dedup guard.
            # NEVER touch NNACV again. Only update metadata from the new set if richer.
            if ae != 'Unassigned' and opty_map[opty]['ae'] == 'Unassigned':
                opty_map[opty]['ae'] = ae
            if ns and not opty_map[opty]['nextSteps']:
                opty_map[opty]['nextSteps'] = ns
            if notes and not opty_map[opty]['notesSummary']:
                opty_map[opty]['notesSummary'] = notes

# ── BUILD PIPE_Q1 ──────────────────────────────────────────────────────────────
PIPE_Q1 = []
for opty, d in opty_map.items():
    ms_keys = ['DIS','TV','BC','MP','COM','LPO']
    fc = {
        'score': 'risk', 'gaps': ms_keys, 'allNonGreen': ms_keys, 'allOk': False,
        'probMismatch': False, 'missingOpen': ms_keys[:2], 'missingClosed': [],
        'forecastCode': d['stage'][:10],
        'sm': {'key': d['stage'][:1], 'label': d['stage'][:20]},
        'probRange': [0, 100],
    }
    PIPE_Q1.append({
        'num':           opty[:20],
        'name':          d['name'],
        'account':       d['account'],
        'ae':            d['ae'],
        'stage':         d['stage'],
        'prob':          d['prob'],
        'nnacv':         d['nnacv'],
        'closeDate':     d['closeDate'],
        'nowsell':       None,   # ⚠️ PD #17: MUST be None/null — never a pre-filled dict
        'forecastCheck': fc,
        'dtc':           days_to_close(d['closeDate']),
        'dis':           days_in_stage(d.get('stageEnteredDate', '')),  # days in current stage (None if unknown)
        'flags':         deal_flags(d['ae'], d['nnacv'], d['closeDate']),
        'nextSteps':     d['nextSteps'],
        'nextStepsDate': d['nextStepsDate'],
        'notesSummary':  d['notesSummary'],
        'competitor':    d.get('competitor', ''),   # from Call 1c — empty string if not competitive
        'engagements':   d.get('engagements', {}),  # ⚠️ NNR #41: from Call 1f — {} if no engagement records; drives _nowsellScore engagement-first scoring
    })

PIPE_Q1.sort(key=lambda x: -x['nnacv'])

# ── UNASSIGNED DEALS PANEL (Fix: surface rather than silently hide) ────────────
# Deals where AE = 'Unassigned' (blank Snowflake rep field) are separated into
# their own panel in the dashboard — never silently dropped. This is especially
# important for territories where Dynamics data quality varies (e.g. renewal deals
# where the rep field is not consistently populated).
UNASSIGNED_DEALS = [d for d in PIPE_Q1 if d['ae'] == 'Unassigned']
PIPE_Q1 = [d for d in PIPE_Q1 if d['ae'] != 'Unassigned']
if UNASSIGNED_DEALS:
    _ua_total = sum(d['nnacv'] for d in UNASSIGNED_DEALS)
    print(f"⚠️ {len(UNASSIGNED_DEALS)} Unassigned deal(s) surfaced in separate panel "
          f"(net {fmt(_ua_total)}) — verify AE ownership in Dynamics and re-run if needed.")
else:
    print("✅ No unassigned deals found — all pipeline attributed to named AEs")

# ── DEALS AT RISK (computed after PIPE_Q1 is sorted) ─────────────────────────
# Deals qualify as AT RISK if ALL THREE conditions are met:
#   1. Close date within the next 21 days (urgent window)
#   2. Probability < 60%
#   3. No next steps recorded (nextSteps and notesSummary both empty)
# Sorted by close date ascending (most urgent first).
DEALS_AT_RISK = sorted(
    [d for d in PIPE_Q1
     if 0 <= d['dtc'] <= 21
     and d['prob'] < 60
     and not d['nextSteps']
     and not d['notesSummary']],
    key=lambda x: x['dtc']
)

# ── ENFORCE UNIQUE NUM KEYS (Prime Directive #14) ──────────────────────────────
seen_nums = {}
for deal in PIPE_Q1:
    base = deal['num']
    if base not in seen_nums: seen_nums[base] = 0
    else:
        seen_nums[base] += 1
        deal['num'] = base[:17] + f'_{seen_nums[base]}'

dupes = {k: v for k, v in Counter(d['num'] for d in PIPE_Q1).items() if v > 1}
assert not dupes, f"FAIL: duplicate num keys: {dupes}"

# ── NNR #41: engagements field assertion ─────────────────────────────────────
# Every deal MUST have an 'engagements' field (dict, may be empty).
# Empty {} = Call 1f returned no engagement records for this opty (valid).
# Missing key = engagements was not written to PIPE_Q1 (deploy blocker).
_eng_missing = [d['num'] for d in PIPE_Q1 if 'engagements' not in d]
if _eng_missing:
    print(f"❌ DEPLOY BLOCKER: {len(_eng_missing)} deals missing 'engagements' field: {_eng_missing[:5]}")
    print("   Fix: ensure d.get('engagements', {}) is in PIPE_Q1.append block (NNR #41)")
    sys.exit(1)
_eng_deals = sum(1 for d in PIPE_Q1 if d.get('engagements'))
print(f"✅ NNR #41: engagements field present on all {len(PIPE_Q1)} deals | {_eng_deals} with engagement data")

# ── NEXTSTEPS COVERAGE CHECK (Prime Directive #19 + #26) ─────────────────────
ns_filled = sum(1 for d in PIPE_Q1 if d['nextSteps'] or d['notesSummary'])
ns_pct = ns_filled / max(len(PIPE_Q1), 1) * 100
if ns_pct == 0 and PIPE_Q1:
    # ⚠️ PD #26: ALL deals blank = deploy BLOCKER — Call 1b must have run before Step 5
    print(f"❌ DEPLOY BLOCKER: nextSteps coverage is 0% across {len(PIPE_Q1)} deals.")
    print("   This means Snowflake returned the wrong column for next_steps.")
    print("   ACTION: Re-run Call 1b with explicit column 'parent_opportunity_next_steps'")
    print("   and merge results into opty_map before continuing.")
    print("   ── BLOCKED: Claude must NOT proceed to Step 6 until Call 1b is run. ──")
    print("   ── If user explicitly says 'skip next steps', set NS_COVERAGE_BLOCKED=False ──")
    # Hard abort: do not write DS_PATH — force caller to re-run Call 1b
    # Override only if the user has explicitly acknowledged the gap:
    # NS_COVERAGE_BLOCKED_OVERRIDE = True  # ← uncomment ONLY on explicit user instruction
    NS_COVERAGE_BLOCKED_OVERRIDE = False
    if not NS_COVERAGE_BLOCKED_OVERRIDE:
        sys.exit(1)
    NS_COVERAGE_BLOCKED = True
elif ns_pct < 20 and PIPE_Q1:
    print(f"⚠️ WARNING: nextSteps coverage only {ns_pct:.0f}% — run Call 1b to fetch separately")
    NS_COVERAGE_BLOCKED = False
else:
    NS_COVERAGE_BLOCKED = False

# ── NNR #42: MANDATORY DYNAMICS CROSS-CHECK — HARD HALT, NOT ADVISORY ────────
# This is a deploy GATE, not a print statement. If the manager reports the Snowflake
# total is >15% below Dynamics, Claude MUST identify which queries are under-counting
# and re-run them. Proceeding to HTML with a materially wrong total is BLOCKED.
#
# PROTOCOL:
# 1. Print the Snowflake total to console (assigned + unassigned).
# 2. Present the total to the manager and ask them to compare vs Dynamics.
# 3. Wait for confirmation before calling present_files or any HTML step.
# 4. If manager confirms within ±15%: proceed.
# 5. If manager reports >15% LOWER than Dynamics: execute the re-query protocol below.
# 6. If manager reports >15% HIGHER than Dynamics: check for fabrication (NNR #41).
#
# ⚠️ DO NOT SKIP THIS GATE. DO NOT PROCEED PAST THIS POINT WITHOUT MANAGER CONFIRMATION.
# ⚠️ Claude must present this output to the manager and WAIT for their response.
# ⚠️ "Continue" or "looks right" = proceed. Any number reported = run the gap check.

_total_pipe_assigned   = sum(d['nnacv'] for d in PIPE_Q1)
_total_pipe_unassigned = sum(d['nnacv'] for d in UNASSIGNED_DEALS) if 'UNASSIGNED_DEALS' in dir() else 0
_total_pipe_all        = _total_pipe_assigned + _total_pipe_unassigned
top = PIPE_Q1[0] if PIPE_Q1 else None

print(f"\n{'='*60}")
print(f"NNR #42 DYNAMICS CROSS-CHECK — HARD GATE — DO NOT SKIP")
print(f"Snowflake assigned pipeline :  {fmt(_total_pipe_assigned)} | {len(PIPE_Q1)} deals")
print(f"Snowflake unassigned pipeline: {fmt(_total_pipe_unassigned)} | {len(UNASSIGNED_DEALS) if 'UNASSIGNED_DEALS' in dir() else 0} deals")
print(f"Snowflake TOTAL pipeline:      {fmt(_total_pipe_all)}")
print(f"Top deal: {top['account'][:40] if top else 'none'} = {fmt(top['nnacv']) if top else '$0'}")
print(f"")
print(f"ACTION REQUIRED — Claude must present the following to the manager:")
print(f"  'Snowflake returned {fmt(_total_pipe_all)} across {len(PIPE_Q1) + (len(UNASSIGNED_DEALS) if 'UNASSIGNED_DEALS' in dir() else 0)} deals.")
print(f"   Does this match your Dynamics pipeline view? (±15% is acceptable)'")
print(f"")
print(f"RESPONSE HANDLING:")
print(f"  ✅ Within ±15% of Dynamics → confirm and proceed to Step 6.")
print(f"  ❌ >15% LOWER than Dynamics → HALT. Run re-query protocol:")
print(f"     1. Check which of the 7 queries returned the fewest rows.")
print(f"     2. Re-run those queries with 'Do NOT add a LIMIT clause. Return ALL matching rows.'")
print(f"     3. Re-run NNR #63 gate. Re-run NNR #62 SQL check.")
print(f"     4. Rebuild PIPE_Q1. Repeat cross-check. Do NOT deploy until within ±15%.")
print(f"  ❌ >15% HIGHER than Dynamics → HALT. Check for NNR #41 fabrication.")
print(f"     Inspect opty_map for duplicate OPTYs or hardcoded data.")
print(f"{'='*60}\n")

# ⚠️ HARD GATE: Claude MUST stop here and present the above to the manager.
# Claude MUST NOT call present_files, write HTML, or proceed to Step 6
# until the manager has explicitly confirmed the total is within tolerance.
# If manager reports a gap >15%: do NOT proceed — run the re-query protocol above.

# ── PARSE CLOSED LOST (Call 2b) ───────────────────────────────────────────────
# CL_PATH is the tool_result file from Call 2b (Closed Lost query).
# ── REPLACE THIS LINE ─────────────────────────────────────────────────────────
CL_PATH = ''   # ← REPLACE with path to Call 2b tool result JSON
# ── END REPLACE ───────────────────────────────────────────────────────────────
if not CL_PATH or not CL_PATH.strip() or not os.path.exists(CL_PATH):
    print("⚠️ CL_PATH not set or file missing — skipping Closed Lost parse (zero CL is valid).")
    cl_result_sets = []
else:
    cl_result_sets = parse_all_results(CL_PATH)
cl_map = {}
for cols, rows in cl_result_sets:
    col_map = {c: i for i, c in enumerate(cols)}
    def g2(r, key, default=''):
        idx = col_map.get(key, -1)
        return r[idx] if idx >= 0 and idx < len(r) else default
    for r in rows:
        opty    = g2(r, 'OPPORTUNITY_NUMBER')
        if not opty: continue
        account = g2(r, 'ACCOUNT_NAME') or 'Unknown'
        oname   = g2(r, 'OPPORTUNITY_NAME') or account
        raw_ae  = g2(r, 'PARENT_OPPORTUNITY_SALES_REP_NAME', '')
        ae      = resolve_ae(raw_ae)
        stage   = g2(r, 'OPPORTUNITY_STAGE', '')
        cd      = g2(r, 'OPPORTUNITY_CLOSE_DATE', '')
        nnacv_r = g2(r, 'NNACV_USD_CFX') or g2(r, 'TOTAL_NNACV', '')
        try: nnacv = float(str(nnacv_r).replace(',', '')) if nnacv_r else 0
        except: nnacv = 0
        if opty not in cl_map:
            cl_map[opty] = {'opty': opty, 'account': account, 'name': oname,
                            'ae': ae, 'stage': stage, 'closeDate': cd, 'nnacv': nnacv}
        else:
            if ae != 'Unassigned' and cl_map[opty]['ae'] == 'Unassigned':
                cl_map[opty]['ae'] = ae

CLOSED_LOST = []
seen_cl = {}
for opty, d in cl_map.items():
    acv = d['nnacv']
    acv = acv if acv < 0 else -acv  # ⚠️ Negation rule: CL NNACV always negative
    deal = {'num': opty[:20], 'name': d['name'], 'account': d['account'],
            'ae': d['ae'], 'stage': d['stage'], 'closeDate': d['closeDate'], 'nnacv': acv}
    base = deal['num']
    if base not in seen_cl: seen_cl[base] = 0
    else:
        seen_cl[base] += 1
        deal['num'] = base[:17] + f'_{seen_cl[base]}'
    CLOSED_LOST.append(deal)
CLOSED_LOST.sort(key=lambda x: x['nnacv'])

# ── BUILD AE_DATA WITH RICH DEAL-AWARE COACHING ──────────────────────────────
# ⚠️ PD #16: Field names are CANONICAL. Section B uses: ae.n, ae.terr, ae.pipe,
# ae.won, ae.coverage, ae.pacingPct, ae.paceColor, ae.paceReason, ae.paceActions,
# ae.risk, ae.riskReason, ae.riskActions, ae.covColor, ae.covReason, ae.covActions,
# ae.deals (int — PD #18), ae.dsTotal, ae.coachNarrative, ae.coachContext,
# ae.lever, ae.actions, ae.pipeActions, ae.nsGap
# ae.pipeActions: ordered list of pipeline build plays for Manager Coaching tab.
#
# PIPE_Q1 deals include ae.competitor (from Call 1c) — used in coaching actions.
#
# ⚠️ PD #23 (Rich Coaching): coachNarrative and actions MUST be deal-aware and
# account-specific. Generic text ("Qualify all open deals") is a coaching quality fail.
# Actions MUST reference real account names and NowSell milestone gaps from PIPE_Q1.
# Competitive deals MUST surface the appropriate compete play (Call 1c → COMPETE_PLAYS).

ae_deals_map = defaultdict(list)
for d in PIPE_Q1:
    if d['ae'] and d['ae'] != 'Unassigned':
        ae_deals_map[d['ae']].append(d)

ae_cl_won = defaultdict(float)
for d in CLOSED_LOST:
    if d['ae'] and d['ae'] != 'Unassigned':
        ae_cl_won[d['ae']] += d['nnacv']

days_total = (QEND - datetime.date.fromisoformat(CQ_START)).days

AE_DATA = []
for ae_name in KNOWN_AES:
    deals  = ae_deals_map.get(ae_name, [])
    pipe   = sum(d['nnacv'] for d in deals)
    won    = ae_cl_won.get(ae_name, 0)
    ds     = sum(d['nnacv'] for d in deals if d['nnacv'] < 0)
    wtd    = sum(d['nnacv'] * d['prob'] / 100 for d in deals)
    quota  = get_quota(ae_name)   # ← dynamic: user-supplied or QUOTA_DEFAULT
    cov    = pipe / quota if quota > 0 else 0
    seg, focus = AE_SEGMENT.get(ae_name, ('ENT', 'multi-account'))
    seg_lbl = 'STR' if seg == 'STR' else 'ENT'

    deals_sorted = sorted(deals, key=lambda x: -x['nnacv'])
    lead = deals_sorted[0] if deals_sorted else None

    # NowSell gaps per deal (for coaching actions)
    deal_gaps = {}
    all_gap_ms = set()
    for d in deals_sorted:
        gaps = gap_milestones(d['stage'])
        deal_gaps[d['num']] = gaps
        all_gap_ms.update(gaps)
    ns_gap = sorted(all_gap_ms) if all_gap_ms else ['DIS', 'TV']

    # Coverage colour + coaching (with pacing-aware context)
    # Contextualise coverage against where we are in the quarter
    elapsed_frac = max(0, (days_total - DAYS_LEFT) / max(days_total, 1))
    if elapsed_frac < 0.25:
        week_context = f'Week 1–3 of quarter — target 3x minimum coverage before end of Week 4.'
        cov_min_target = 3.0
    elif elapsed_frac < 0.50:
        week_context = f'Mid-quarter — 3x coverage is the minimum; 4x+ gives downside protection.'
        cov_min_target = 3.5
    elif elapsed_frac < 0.75:
        week_context = f'Late quarter — at {elapsed_frac*100:.0f}% elapsed, need 4x+ to absorb slippage.'
        cov_min_target = 4.0
    else:
        week_context = f'Final stretch ({DAYS_LEFT} days left) — every deal counts; minimise slippage risk.'
        cov_min_target = 4.0

    # ── PIPELINE BUILD PLAYS (territory and segment aware) ───────────────────
    # These are sourcing strategies surfaced when coverage is below target.
    # Ordered: installed base first (fastest path), then whitespace, then new logos.
    _focus_short = focus.split('/')[0].strip()[:30]
    PIPE_BUILD_PLAYS = [
        f'Installed base expansion: review all active {_focus_short} contracts for renewal uplift, '
        f'co-term, and add-on SKU opportunities — fastest path to CQ pipe.',
        f'Whitespace analysis: run account whitespace report in Dynamics for {_focus_short} — '
        f'identify products licensed vs products in use; each gap is a pipeline opportunity.',
        f'Platform consolidation play: position ServiceNow as the consolidation layer '
        f'replacing point solutions (ITSM + IRM + HR + CSM on one platform = cost reduction narrative).',
        f'Executive sponsor pull-through: engage {ae_name.split()[0]}\'s exec sponsors at '
        f'{_focus_short} to surface budget conversations not yet in pipeline.',
        f'Partner co-sell: identify GSI/partner with presence in {_focus_short} — '
        f'co-sourced deals close 30% faster and expand total deal size.',
        f'Next-quarter pull-forward: review {ae_name.split()[0]}\'s Q3/Q4 pipeline '
        f'for deals that can be accelerated into {CQ_LABEL} with incentives.',
        f'Overlay engagement: request CSM, Solution Consulting, or Industry overlay '
        f'resource for discovery sessions at top {_focus_short} whitespace accounts.',
        f'Sales play activation: assign the current quarter\'s Hero Play to all '
        f'{_focus_short} accounts — book "play in a day" workshops to generate pipeline.',
    ]

    if cov >= cov_min_target:
        cov_color   = 'GREEN'
        cov_reason  = f'Strong at {cov:.1f}x vs {cov_min_target:.0f}x target for this point in quarter. {week_context}'
        cov_actions = [
            'Protect commit deals from pushouts — confirm PO and legal timelines this week',
            'Advance top deals on NowSell milestones to reduce late-stage slippage risk',
            'Seed next-quarter pipeline alongside CQ — set Q3 first-meeting targets with top accounts',
        ]
        pipe_actions = [PIPE_BUILD_PLAYS[2], PIPE_BUILD_PLAYS[5], PIPE_BUILD_PLAYS[6]]
    elif cov >= 1.5:
        cov_color   = 'AMBER'
        cov_reason  = f'Adequate at {cov:.1f}x — below {cov_min_target:.0f}x target for this stage of quarter. {week_context}'
        cov_actions = [
            f'Add 2+ qualified CQ deals this week — target: {cov_min_target:.0f}x coverage by Week 3',
            'Accelerate stage progression on existing deals — daily deal inspection on top 3',
            'Identify whitespace expansion in focus accounts before pipeline gap widens',
        ]
        pipe_actions = [PIPE_BUILD_PLAYS[0], PIPE_BUILD_PLAYS[1], PIPE_BUILD_PLAYS[4], PIPE_BUILD_PLAYS[7]]
    else:
        cov_color   = 'RED'
        cov_reason  = f'Insufficient at {cov:.1f}x — significantly below {cov_min_target:.0f}x minimum for this point in quarter. {week_context}'
        cov_actions = [
            f'URGENT: source new CQ pipeline immediately — territory at serious risk of miss',
            'Schedule territory deep-dive with manager before end of this week',
            'Identify quick-win expansion in installed base — prioritise renewal uplift and co-terms',
        ]
        pipe_actions = PIPE_BUILD_PLAYS[:5]   # all high-priority sourcing plays

    # Pacing — QTD won vs expected-won at this point in the quarter
    # ⚠️ FIX (NNR #40): When elapsed_pct = 0 (quarter not yet started), pacing is
    # meaningless — the formula returns 100% for everyone. Show a pre-quarter state
    # instead so the badge is honest and not misleading to the manager.
    elapsed_pct = max(0, (days_total - DAYS_LEFT) / days_total * 100)
    expected_won = quota * elapsed_pct / 100
    if elapsed_pct == 0:
        # Quarter hasn't started — pacing is undefined, not 100%
        pace_pct   = None          # None → JS renders "Q opens soon" state
        pace_color = 'TEAL'        # Neutral colour distinct from GREEN/AMBER/RED
        pace_reason = (f'{CQ_LABEL} opens in {DAYS_LEFT} days. '
                       f'Pacing will activate once the quarter starts. '
                       f'Use pipeline coverage to assess readiness now.')
        pace_actions = [f'Confirm pipeline strategy with {ae_name.split()[0]} before Q-start',
                        f'Lock Day-1 commit list and close plan before {CQ_LABEL} opens',
                        'Review stage progression for top 3 deals — set first-week milestones']
    else:
        pace_pct   = int(max(0, won) / max(expected_won, 1) * 100) if expected_won > 0 else 100
        pace_color = 'GREEN' if pace_pct >= 80 else ('AMBER' if pace_pct >= 50 else 'RED')
        pace_reason = (f'QTD won {fmt(won)} vs expected {fmt(expected_won)} '
                       f'({elapsed_pct:.0f}% of {CQ_LABEL} elapsed, {DAYS_LEFT} days left). '
                       f'Quota: {fmt(quota)}.')
        pace_actions = [f'Advance top deals to Commit this week to improve pacing',
                        f'Confirm PO and legal timelines on all Stage 6+ deals',
                        'Review stage progression plan for top 3 deals']

    # Risk
    if len(deals) == 0:
        risk = 'R'; risk_reason = 'No Q2 pipeline — territory at risk'
        risk_actions = ['Immediate account strategy session required',
                        'Identify 3+ new qualified opportunities this week',
                        f'Review whitespace across {focus} accounts']
    elif cov < 1.5:
        risk = 'R'; risk_reason = f'Below 1.5x threshold at {cov:.1f}x'
        risk_actions = ['Add pipeline before end of April Week 1',
                        'Pull forward any Q3 opportunities where possible',
                        'Executive sponsor engagement on top deals']
    elif cov < 3.0:
        risk = 'A'; risk_reason = f'Below 3x comfort zone at {cov:.1f}x'
        risk_actions = ['Protect existing deals from slipping',
                        'Build contingency pipeline for downside scenarios',
                        'Weekly deal inspection on top 3 opportunities']
    else:
        risk = 'G'; risk_reason = f'Strong coverage at {cov:.1f}x'
        risk_actions = ['Focus on deal quality and milestone completion',
                        'Advance highest-prob deals to commit',
                        'Begin next-quarter pipeline seeding']

    # ── RICH COACH NARRATIVE (deal-aware, account-specific) ──────────────────
    # ⚠️ PD #23: narrative MUST reference real account names and deal values.
    # Generic text is a deploy quality fail — each AE gets a unique narrative.
    if len(deals) == 0:
        coach_narrative = (
            f'{ae_name} has no open Q2 pipeline. Focus accounts: {focus}. '
            f'Immediate action: identify and qualify at least 2 opportunities this week. '
            f'Manager to schedule territory deep-dive before Apr 7.'
        )
        coach_context = (f'Segment: {TERRITORY} {seg_lbl} | Focus: {focus} | '
                         f'Q2 opens Apr 1 | {DAYS_LEFT} days remaining')
        lever   = 'Territory activation — pipeline generation from zero'
        actions = [f'Schedule territory review with {ae_name.split()[0]} before Apr 7',
                   f'Identify top 3 target accounts in {focus}',
                   'Run whitespace analysis — check installed base for expansion',
                   'Engage overlay resources to accelerate pipeline creation']
        pipe_actions = PIPE_BUILD_PLAYS   # all plays active when pipeline is zero
    else:
        lead_acct  = lead['account'][:35] if lead else 'N/A'
        lead_val   = fmt(lead['nnacv']) if lead else '$0'
        lead_prob  = lead['prob'] if lead else 0
        lead_stage = (lead['stage'][:22] if lead else '')
        lead_dtc   = lead['dtc'] if lead else 99
        urgency    = deal_urgency(lead_dtc)

        if cov >= 3.0:
            top_pct = round(lead['nnacv'] / max(pipe, 1) * 100) if lead else 0
            cov_sentence = (
                f'Coverage is {cov:.1f}x — strong on paper, but '
                + (f'single-account concentration risk (lead deal is {top_pct}% of pipe).'
                   if top_pct > 50 else 'deal spread is healthy across accounts.')
            )
        elif cov >= 1.5:
            cov_sentence = (f'Coverage is {cov:.1f}x — adequate but below the 3x comfort zone. '
                            f'Push to add 1–2 more qualified deals before Apr 14.')
        else:
            cov_sentence = (f'Coverage is only {cov:.1f}x — urgent: needs more pipeline '
                            f'before end of Week 1.')

        coach_narrative = (
            f'{ae_name} covers {TERRITORY} {seg_lbl} — primarily {focus}. '
            f'Lead deal: {lead_acct} ({lead_val}) at {lead_stage} ({lead_prob}%). '
            f'{cov_sentence} '
            + (f'⚔ {sum(1 for d in deals if d.get("competitor"))} competitive deal(s) in territory — '
               f'competitors: {", ".join(sorted(set(d["competitor"] for d in deals if d.get("competitor"))))}. '
               if any(d.get('competitor') for d in deals) else '')
            + f'Priority: advance top deals on NowSell milestones and confirm close plans by week 2.'
        )
        coach_context = (
            f'Segment: {TERRITORY} {seg_lbl} | Focus: {focus} | '
            f'{DAYS_LEFT} days remaining | Lead deal urgency: {urgency}'
        )

        # Build per-deal coaching actions (account-specific, milestone-aware, competitor-aware)
        deal_actions = []
        for d in deals_sorted[:4]:
            d_gaps  = deal_gaps.get(d['num'], [])
            d_acct  = d['account'][:32]
            d_val   = fmt(d['nnacv'])
            d_dtc   = d['dtc']
            d_comp  = d.get('competitor', '')
            # Competitive signal: prepend compete flag if a competitor is recorded
            if d_comp:
                COMPETE_PLAYS = {
                    'Salesforce': 'use Salesforce compete card + engage Deal Desk',
                    'Microsoft':  'use Microsoft compete card + highlight platform consolidation',
                    'Pega':       'use Pega compete card + emphasise NowSell workflow depth',
                    'Archer':     'use Archer compete card + position IRM/GRC superiority',
                }
                compete_action = COMPETE_PLAYS.get(d_comp, f'request compete support for {d_comp}')
                deal_actions.append(
                    f'⚔ {d_acct} ({d_val}) — competitive vs {d_comp}: {compete_action}'
                )
            elif d_gaps:
                ms_str = ', '.join(d_gaps[:3])
                deal_actions.append(
                    f'{d_acct} ({d_val}) — advance {ms_str} to green by week 2'
                )
            elif d_dtc <= 14:
                deal_actions.append(
                    f'{d_acct} ({d_val}) — closes in {d_dtc}d: confirm commit and PO timeline'
                )
            else:
                deal_actions.append(
                    f'{d_acct} ({d_val}) — maintain momentum, confirm next step date'
                )

        lever   = (f'NowSell milestone execution + close plan on {lead_acct[:25]}'
                   if lead else 'Pipeline generation and milestone execution')
        actions = deal_actions if deal_actions else [
            'Complete NowSell milestones in Dynamics',
            'Confirm close plan and customer commitment date',
            'Identify next expansion opportunity in territory'
        ]

    AE_DATA.append({
        'n':             ae_name,
        'ae':            ae_name,
        'terr':          f'{TERRITORY} {seg_lbl}',   # ← uses detected territory, not hardcoded
        'pipe':          pipe,
        'won':           won,
        'wtd':           wtd,
        'coverage':      round(cov, 2),
        'pacingPct':     pace_pct,
        'paceColor':     pace_color,
        'paceReason':    pace_reason,
        'paceActions':   pace_actions,
        'risk':          risk,
        'riskReason':    risk_reason,
        'riskActions':   risk_actions,
        'covColor':      cov_color,
        'covReason':     cov_reason,
        'covActions':    cov_actions,
        'deals':         len(deals),   # ⚠️ PD #18: MUST be int, not array
        'dsTotal':       ds,
        'coachNarrative': coach_narrative,
        'coachContext':   coach_context,
        'lever':          lever,
        'actions':        actions,
        'pipeActions':    pipe_actions,   # pipeline build plays — surfaced in Manager Coaching tab
        'nsGap':          ns_gap,
        # ── Improvement 3: Attainment projection ─────────────────────────────
        # Projects final-quarter attainment from current won + weighted pipeline.
        # Formula: won + (sum of positive deal NNACV × prob) = projected total.
        # attainPct: projected as % of quota. attainProj: raw dollar projection.
        'attainProj':    round(won + wtd),
        'attainPct':     round((won + wtd) / quota * 100) if quota > 0 else 0,
        'quota':          quota,
    })

AE_DATA.sort(key=lambda x: -x['pipe'])

# ── QUOTA_DEFAULTS (PD #22: required for _getQuota on page load) ──────────────
# Reflects user-supplied quotas from Step 0; falls back to QUOTA_DEFAULT per AE
QUOTA_DEFAULTS = {ae['n']: get_quota(ae['n']) for ae in AE_DATA}

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# validate_ds_path() — SINGLE VALIDATION CALL FOR ALL DATA INVARIANTS (v17.0)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# Replaces 30+ scattered asserts with one function that collects ALL errors.
# Returns (errors: list[str], warnings: list[str]).
# Errors are deploy blockers. Warnings are printed but don't block.
# Called in Step 5 (after building data) and Step 7 (after reading DS_PATH).
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

from collections import Counter

CANONICAL_DEAL_FIELDS = {'num','name','account','ae','stage','nnacv','closeDate',
                         'prob','nextSteps','nextStepsDate','notesSummary',
                         'nsStale','nowsell','engagements'}

def validate_ds_path(ds):
    """Validate a DS_PATH dict. Returns (errors, warnings)."""
    errors = []
    warnings = []

    # ── PIPE_Q1 checks ──────────────────────────────────────────────────────
    pipe = ds.get('PIPE_Q1', [])
    if not pipe:
        errors.append('PIPE_Q1 is empty — no pipeline data')
    else:
        # Schema completeness (PD #40 + canonical schema)
        for i, d in enumerate(pipe):
            missing = CANONICAL_DEAL_FIELDS - set(d.keys())
            if missing:
                errors.append(f'Deal {i} ({d.get("num","?")}) missing fields: {sorted(missing)}')
                break  # one example is enough

        # closeDate not close (NNR #40)
        if any('closeDate' not in d for d in pipe):
            errors.append('PIPE_Q1: some deals missing closeDate (NNR #40)')
        if any('close' in d and 'closeDate' not in d for d in pipe):
            errors.append('PIPE_Q1: found "close" instead of "closeDate" — rename required (NNR #40)')

        # nowsell must be null (PD #17)
        non_null = [d['num'] for d in pipe if d.get('nowsell') is not None]
        if non_null:
            errors.append(f'PIPE_Q1: nowsell not null on {len(non_null)} deals (PD #17) — first: {non_null[0]}')

        # engagements field present (PD #41)
        if any('engagements' not in d for d in pipe):
            errors.append('PIPE_Q1: some deals missing engagements dict (PD #41)')

        # Unique num keys (PD #14)
        dupes = {k: v for k, v in Counter(d.get('num','') for d in pipe).items() if v > 1}
        if dupes:
            errors.append(f'PIPE_Q1: duplicate num keys (PD #14): {dupes}')

        # Next steps coverage (PD #19)
        ns_count = sum(1 for d in pipe if d.get('nextSteps') or d.get('notesSummary'))
        ns_pct = (ns_count / len(pipe) * 100) if pipe else 0
        if ns_count == 0:
            errors.append('PIPE_Q1: zero deals have nextSteps or notesSummary (PD #26)')
        elif ns_pct < 30:
            warnings.append(f'Next steps coverage {ns_pct:.0f}% (< 30%) — may indicate sparse Dynamics data')

    # ── AE_DATA checks ──────────────────────────────────────────────────────
    ae_data = ds.get('AE_DATA', [])
    if not ae_data:
        errors.append('AE_DATA is empty')
    else:
        # ae.n field (NNR #33)
        if any('n' not in ae or ae.get('n') != ae.get('name') for ae in ae_data):
            errors.append('AE_DATA: some AEs missing "n" field or n != name (NNR #33)')

        # ae.deals is int (PD #18)
        if any(not isinstance(ae.get('deals', 0), int) for ae in ae_data):
            errors.append('AE_DATA: ae.deals must be int, not array (PD #18)')

        # coachNarrative (PD #23) — only check AEs where deals is a valid int > 0
        blank_coach = [ae.get('n', ae.get('name','?')) for ae in ae_data
                       if isinstance(ae.get('deals', 0), int) and ae.get('deals', 0) > 0
                       and not ae.get('coachNarrative')]
        if blank_coach:
            errors.append(f'AE_DATA: blank coachNarrative for AEs with deals (PD #23): {blank_coach}')

        # pipeActions (NNR #58)
        empty_pa = [ae.get('n', ae.get('name','?')) for ae in ae_data if not ae.get('pipeActions')]
        if empty_pa:
            warnings.append(f'pipeActions empty for AEs: {empty_pa} (NNR #58)')

    # ── _QTR_META checks ────────────────────────────────────────────────────
    qm = ds.get('_QTR_META', {})
    if not qm.get('q1Label'):
        errors.append('_QTR_META: missing q1Label (NNR #34) — all UI labels will show "CQ"')
    for qk in ['q2', 'q3', 'q4']:
        sub = qm.get(qk, {})
        if not isinstance(sub, dict) or 'label' not in sub:
            errors.append(f'_QTR_META: missing {qk} sub-object with label (NNR #34)')
            break

    # ── _QTR_STATS checks ───────────────────────────────────────────────────
    qs = ds.get('_QTR_STATS', {})
    for qk in ['q2', 'q3', 'q4']:
        slot = qs.get(qk, {})
        if slot.get('pipe') == '—' or slot.get('pipe') == '--':
            warnings.append(f'_QTR_STATS.{qk}.pipe is "—" — Step 3 query may not have run (NNR #37)')
        cq_pipe = qm.get('totalPipe')
        if cq_pipe and slot.get('pipe') == cq_pipe and cq_pipe != '$0.0M':
            errors.append(f'_QTR_STATS.{qk} has same value as CQ total — CQ data leaked (NNR #38)')

    # ── SCRIPT checks ───────────────────────────────────────────────────────
    script = ds.get('SCRIPT', [])
    if not script:
        errors.append('SCRIPT is empty — War Room will be blank')
    elif not isinstance(script[0], dict) or 'text' not in script[0]:
        errors.append('SCRIPT entries must be {text, seq} objects, not strings (NNR #36)')
    if len(script) < 5:
        warnings.append(f'SCRIPT has only {len(script)} lines — will be padded to 5')

    # ── WON_CQ / CLOSED_LOST checks ────────────────────────────────────────
    if not isinstance(ds.get('WON_CQ'), list):
        errors.append('WON_CQ must be a list')
    if not isinstance(ds.get('CLOSED_LOST'), list):
        errors.append('CLOSED_LOST must be a list')

    return errors, warnings

# ── VALIDATION MANIFEST (v17.0: calls validate_ds_path) ──────────────────────
_ds_for_val = {
    'PIPE_Q1': PIPE_Q1, 'AE_DATA': AE_DATA, 'WON_CQ': WON_CQ,
    'CLOSED_LOST': CLOSED_LOST, '_QTR_META': _QTR_META,
    '_QTR_STATS': _QTR_STATS if '_QTR_STATS' in dir() else {},
    'SCRIPT': SCRIPT,
}
_val_errors, _val_warnings = validate_ds_path(_ds_for_val)

for w in _val_warnings: print(f'⚠️ WARNING: {w}')

# ── War Room script padding (auto-fix, not a blocker) ────────────────────────
if len(SCRIPT) < 5:
    _fallback_lines = [
        f'{TERRITORY} territory — {CQ_LABEL} pipeline briefing.',
        f'{len(PIPE_Q1)} open deal{"s" if len(PIPE_Q1) != 1 else ""} with net NNACV of {fmt(total_pipe if "total_pipe" in dir() else 0)}.',
        f'{DAYS_LEFT} days remaining in the quarter.',
        f'Coverage: {round(_territory_cov if "_territory_cov" in dir() else 0, 1)}×. Review AE stack rank for coaching priorities.',
        'End of briefing.',
    ]
    for line in _fallback_lines[len(SCRIPT):]:
        SCRIPT.append({'text': line})
    print(f'⚠️ War Room SCRIPT padded to {len(SCRIPT)} lines with territory fallback')

if _val_errors:
    print(f'\n❌ VALIDATION FAILED — {len(_val_errors)} error(s):')
    for e in _val_errors: print(f'   ❌ {e}')
    sys.exit(1)

total_pipe = sum(d['nnacv'] for d in PIPE_Q1)
print(f'✅ Validation passed: {len(PIPE_Q1)} CQ deals | {len(WON_CQ)} CW | '
      f'{len(CLOSED_LOST)} CL | net pipe {fmt(total_pipe)} | {len(AE_DATA)} AEs')
print(f'✅ Top deal NNACV: {fmt(PIPE_Q1[0]["nnacv"])} — verify vs PowerBI source')
print(f'✅ num uniqueness: 0 duplicate keys across {len(PIPE_Q1)} deals')

# ── IMMEDIATELY WRITE DS_PATH (Prime Directive #9 — session-namespaced) ───────
import json as _json

# ⚠️ PD #24: q1Label + forward quarter labels MUST be set before writing DS_PATH
# All tab names, stat card headers, pane titles derive from _QTR_META at runtime.
# "Fwd Q1/Q2/Q3" labels are BANNED — managers read real quarter names (Q3, Q4 etc).
_QTR_META['q1Label']   = CQ_LABEL     # e.g. "Q2 FY2026" — drives CQ tab + all CQ labels
_QTR_META['territory'] = TERRITORY    # e.g. "ANZ FSI"

# Derive forward quarter labels from CQ quarter/year
import re as _re2
_cq_m2 = _re2.match(r'Q(\d) FY(\d{4})', CQ_LABEL)
if _cq_m2:
    _cq_qnum2 = int(_cq_m2.group(1))
    _cq_yr2   = int(_cq_m2.group(2))
else:
    _cq_qnum2, _cq_yr2 = 2, TODAY.year

def _fwd_label2(offset):
    q = (_cq_qnum2 - 1 + offset) % 4 + 1
    y = _cq_yr2 + (_cq_qnum2 - 1 + offset) // 4
    return f'Q{q} FY{y}'

def _fwd_months2(offset):
    q = (_cq_qnum2 - 1 + offset) % 4 + 1
    y = _cq_yr2 + (_cq_qnum2 - 1 + offset) // 4
    _mo2 = {1: ('Jan','Mar'), 2: ('Apr','Jun'), 3: ('Jul','Sep'), 4: ('Oct','Dec')}
    s, e = _mo2[q]
    return f'{s}–{e} {y}'

# Populate forward quarter meta — if _QTR_META[q2/q3/q4] already exist from Step 3 parse,
# merge label/months in (don't overwrite pipe/n stats that may already be populated).
for _off, _qk in enumerate(['q2', 'q3', 'q4'], start=1):
    _existing = _QTR_META.get(_qk, {})
    _existing['label']  = _fwd_label2(_off)
    _existing['months'] = _fwd_months2(_off)
    _QTR_META[_qk] = _existing

print(f'✅ _QTR_META labels: CQ={CQ_LABEL} | '
      f'FWD1={_QTR_META["q2"]["label"]} | FWD2={_QTR_META["q3"]["label"]} | '
      f'FWD3={_QTR_META["q4"]["label"]}')

# ── Improvement 4: Territory-level summary (5-second read for managers) ────────
# Computed here so the HTML header can render a single-line territory health bar.
# CRITICAL (NNR #50): totals MUST include UNASSIGNED_DEALS — they are real pipeline.
# total_pipe_all = assigned (PIPE_Q1) + unassigned (UNASSIGNED_DEALS)
_total_pipe_assigned = sum(d['nnacv'] for d in PIPE_Q1)
_total_pipe_unassigned = sum(d['nnacv'] for d in UNASSIGNED_DEALS) if UNASSIGNED_DEALS else 0
_total_pipe   = _total_pipe_assigned + _total_pipe_unassigned  # ALL pipeline including unassigned
_total_won    = sum(d['nnacv'] for d in WON_CQ) if WON_CQ else 0
_total_quota  = sum(get_quota(ae['n']) for ae in AE_DATA)
_total_attain = sum(ae['attainProj'] for ae in AE_DATA)
_total_attain_pct = round(_total_attain / _total_quota * 100) if _total_quota > 0 else 0
_red_aes   = [ae['n'].split()[0] for ae in AE_DATA if ae['risk'] == 'R']
_amber_aes = [ae['n'].split()[0] for ae in AE_DATA if ae['risk'] == 'A']
# Top deal: max NNACV across ALL deals (assigned + unassigned) where closeDate
# is within the CURRENT QUARTER date range (CQ_START→CQ_END).
# ⚠️ NNR #43 — CANONICAL TOP DEAL RULE:
# (A) Include BOTH PIPE_Q1 and UNASSIGNED_DEALS — never PIPE_Q1 alone.
#     The biggest deal in a territory is often unassigned (e.g. NAB renewal $5.73M).
#     Using PIPE_Q1 alone would show Resolution Life $1.7M instead of NAB $5.73M.
# (B) Filter by CQ close date — only count deals expected to close THIS quarter.
#     This makes the stat meaningful for the quarter being reviewed. A deal closing
#     next quarter is forward pipeline, not CQ top deal.
# (C) Use max(nnacv) — never list position (Snowflake row order is not sorted by NNACV).
# This logic must be reproduced identically in any rebuild or hotfix of TERR_SUMMARY.
_cq_s_d = datetime.date.fromisoformat(CQ_START)
_cq_e_d = datetime.date.fromisoformat(CQ_END)
def _deal_in_cq(d):
    try:
        cd = datetime.date.fromisoformat(str(d.get('closeDate',''))[:10])
        return _cq_s_d <= cd <= _cq_e_d
    except: return False

_all_deals_for_top = [d for d in PIPE_Q1 + (UNASSIGNED_DEALS if UNASSIGNED_DEALS else []) if _deal_in_cq(d)]
_top_deal  = max(_all_deals_for_top, key=lambda d: d['nnacv']) if _all_deals_for_top else None
_top_deal_str = f"{_top_deal['account'][:28]} {fmt(_top_deal['nnacv'])}" if _top_deal else '—'
_territory_cov = round(_total_pipe / _total_quota, 1) if _total_quota > 0 else 0

# ── Improvement 3: Win/Loss trend stat card ───────────────────────────────────
# Compute CQ win rate from WON_CQ and CLOSED_LOST counts.
# Also compute prior-quarter win rate from forward-quarter stats if available (best-effort).
# Win rate = CW deals / (CW deals + CL deals). Avg deal size = total CW NNACV / CW deals.
_cw_count   = len(set(d.get('opty', d.get('num', '')) for d in WON_CQ)) if WON_CQ else 0
_cl_count   = len(set(d.get('opty', d.get('num', '')) for d in CLOSED_LOST)) if CLOSED_LOST else 0
_total_closed = _cw_count + _cl_count
_win_rate   = round(_cw_count / _total_closed * 100) if _total_closed > 0 else None  # None = no data yet
_avg_deal_size = round(_total_won / _cw_count) if _cw_count > 0 else 0
# Win rate colour: green ≥50%, amber 30–49%, red <30%, grey if None (no closed deals yet)
_win_rate_color = ('G' if _win_rate is not None and _win_rate >= 50
                   else 'A' if _win_rate is not None and _win_rate >= 30
                   else 'R' if _win_rate is not None
                   else 'MID')

TERR_SUMMARY = {
    'totalPipe':      _total_pipe,
    'totalWon':       _total_won,
    'totalQuota':     _total_quota,
    'attainProj':     _total_attain,
    'attainPct':      _total_attain_pct,
    'coverage':       _territory_cov,
    'daysLeft':       DAYS_LEFT,
    'redAEs':         _red_aes,
    'amberAEs':       _amber_aes,
    'topDeal':        _top_deal_str,
    'topDealNNACV':   _top_deal['nnacv'] if _top_deal else 0,
    'openDeals':      len(_all_deals_for_top),   # CQ-scoped count: assigned + unassigned within CQ close dates
    # Improvement 3: Win/Loss trend fields
    'cwCount':        _cw_count,
    'clCount':        _cl_count,
    'winRate':        _win_rate,          # int percent or None if no closed deals
    'winRateColor':   _win_rate_color,    # 'G'/'A'/'R'/'MID'
    'avgDealSize':    _avg_deal_size,     # avg CW deal NNACV in USD
}
print(f'✅ Territory summary: pipe={fmt(_total_pipe)} | attain={_total_attain_pct}% proj | cov={_territory_cov}× | {len(_red_aes)} RED AEs | win rate={_win_rate}%')

# ── NNR #57: DEAL HEALTH TREND — read prior baseline, compute deltas ──────────
# Read prior-run baseline from persistent outputs directory (survives chat sessions).
# On first run: PRIOR_SNAPSHOT = {} → all deltas gracefully default to "new"/"0"/"unchanged".
TREND_BASELINE_PATH = '/mnt/user-data/outputs/ssc_trend_baseline.json'
try:
    with open(TREND_BASELINE_PATH) as _tf:
        PRIOR_SNAPSHOT = json.load(_tf)
    print(f'✅ Trend baseline loaded: {len(PRIOR_SNAPSHOT)} prior deals from {TREND_BASELINE_PATH}')
except FileNotFoundError:
    PRIOR_SNAPSHOT = {}
    print('ℹ️ No prior trend baseline found — first run, DEAL_TRENDS will be empty.')
except Exception as _te:
    PRIOR_SNAPSHOT = {}
    print(f'⚠️ Could not load trend baseline ({_te}) — continuing without trend data.')

def _stage_num(stage_str):
    """Extract leading stage number from stage string, e.g. '4 - Validate (40%)' → 4."""
    m = re.match(r'(\d+)', stage_str or '')
    return int(m.group(1)) if m else 0

DEAL_TRENDS = {}
for d in PIPE_Q1:
    opty = d.get('num', '')
    prior = PRIOR_SNAPSHOT.get(opty)
    if not prior:
        # Deal not seen before — label as "new", no meaningful deltas
        DEAL_TRENDS[opty] = {'prob_delta': 0, 'stage_delta': 'new', 'ns_delta': 'new'}
        continue
    # Probability delta
    prob_delta = int(d.get('prob', 0)) - int(prior.get('prob', 0))
    # Stage delta
    cur_sn = _stage_num(d.get('stage', ''))
    pri_sn = _stage_num(prior.get('stage', ''))
    if cur_sn > pri_sn:
        stage_delta = 'advanced'
    elif cur_sn < pri_sn:
        stage_delta = 'regressed'
    elif d.get('stage') == prior.get('stage'):
        stage_delta = 'stalled' if prob_delta <= 0 else 'unchanged'
    else:
        stage_delta = 'unchanged'
    # Next steps delta — compare nextStepsDate strings
    cur_nsd = str(d.get('nextStepsDate', '') or '').strip()[:10]
    pri_nsd = str(prior.get('nextStepsDate', '') or '').strip()[:10]
    if not cur_nsd or not pri_nsd:
        ns_delta = 'stale'
    elif cur_nsd != pri_nsd:
        ns_delta = 'fresh'
    else:
        ns_delta = 'stale'
    DEAL_TRENDS[opty] = {'prob_delta': prob_delta, 'stage_delta': stage_delta, 'ns_delta': ns_delta}

trend_improving = sum(1 for t in DEAL_TRENDS.values() if t['prob_delta'] > 0 or t['stage_delta'] == 'advanced')
trend_declining = sum(1 for t in DEAL_TRENDS.values() if t['prob_delta'] < 0 and t['stage_delta'] in ('stalled','regressed'))
print(f'✅ DEAL_TRENDS computed: {len(DEAL_TRENDS)} deals | {trend_improving} improving | {trend_declining} declining')

swap = {
    'TERRITORY': TERRITORY, 'CQ_LABEL': CQ_LABEL, 'CQ_START': CQ_START,
    'CQ_END': CQ_END, 'DAYS_LEFT': DAYS_LEFT,
    'PIPE_Q1': PIPE_Q1, 'WON_CQ': WON_CQ, 'CLOSED_LOST': CLOSED_LOST,
    'DEALS_AT_RISK': DEALS_AT_RISK,
    'UNASSIGNED_DEALS': UNASSIGNED_DEALS,             # surfaced panel, never silently dropped
    '_QTR_STATS': _QTR_STATS, '_QTR_META': _QTR_META,
    'AE_DATA': AE_DATA, 'QUOTA_DEFAULTS': QUOTA_DEFAULTS, 'SCRIPT': SCRIPT,
    'USING_QUOTA_DEFAULTS': USING_QUOTA_DEFAULTS,  # drives amber banner in Step 7
    'TERR_SUMMARY': TERR_SUMMARY,                  # drives territory health bar in header
    'DEAL_TRENDS': DEAL_TRENDS,                    # NNR #57: per-deal trend deltas (may be {})
    # ── Session metadata (PD #30) — written so Stage 0a can recover on re-run ──
    'SESSION_KEY':   SESSION_KEY,   # e.g. 'thomson_anzfsi_q2fy2026'
    'MANAGER_NAME':  MANAGER_NAME,  # manager excluded from stack rank
    'KNOWN_AES':     KNOWN_AES,     # confirmed AE roster from Call H
}
# ⚠️ PD #30: Write to DS_PATH (session-namespaced) — NEVER to bare 'data_swap.json'
with open(DS_PATH, 'w') as _f:
    _json.dump(swap, _f, indent=2)
print(f'✅ {DS_PATH} written ({len(PIPE_Q1)} deals | {len(AE_DATA)} AEs | session={SESSION_KEY})')

# ── QUOTA SIDECAR WRITE (session-namespaced, PD #31) ─────────────────────────
# Persists Snowflake-sourced quotas so returning users get them pre-populated.
if USER_QUOTAS:
    with open(QUOTA_PATH, 'w') as _qf:
        _json.dump(USER_QUOTAS, _qf, indent=2)
    print(f'✅ Quota sidecar written: {len(USER_QUOTAS)} AEs → {QUOTA_PATH}')
```

⚠️ **After script runs, verify `DS_PATH` exists** (Prime Directive #9). If absent, do NOT proceed to Step 6 — the script failed silently.

---

## STEPS 6–12 — HTML ASSEMBLY AND DEPLOY

**All steps below read from `DS_PATH` (session-namespaced data_swap file) — NOT from bare paths.**
**DS_PATH is recovered from the most-recent `data_swap_*.json` scan if not in memory.**

---

## STEP 7 — DATA SWAP ZONE INJECTION (CANONICAL TEMPLATE)

⚠️ **PD #22: Complete DSZ injection order is mandatory.** Replace `<!-- @@DATA_SWAP_ZONE@@ -->` with the vars below. Do NOT wrap in a `<script>` tag — the shell already contains it (PD #21).

```python
import json, re, glob, os

# ── Recover DS_PATH if not in memory ─────────────────────────────────────────
# If running Step 7 after a context recovery, find the most-recent session file.
_ds_files = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
assert _ds_files, "FAIL: No session data_swap_*.json found — re-run Steps 1–5"
DS_PATH = _ds_files[0]
print(f'Loading session data from: {DS_PATH}')

with open(DS_PATH) as f:
    ds = json.load(f)

PIPE_Q1        = ds['PIPE_Q1']
WON_CQ         = ds['WON_CQ']
CLOSED_LOST    = ds['CLOSED_LOST']
DEALS_AT_RISK  = ds.get('DEALS_AT_RISK', [])
UNASSIGNED_DEALS = ds.get('UNASSIGNED_DEALS', [])
_QTR_STATS     = ds['_QTR_STATS']
_QTR_META      = ds['_QTR_META']
AE_DATA        = ds['AE_DATA']
QUOTA_DEFAULTS = ds['QUOTA_DEFAULTS']
SCRIPT         = ds['SCRIPT']
CQ_LABEL_SAFE  = ds['CQ_LABEL'].replace(' ', '_')
TERRITORY      = ds['TERRITORY']
CQ_LABEL       = ds['CQ_LABEL']
TERR_SUMMARY   = ds.get('TERR_SUMMARY', {})
DEAL_TRENDS    = ds.get('DEAL_TRENDS', {})   # NNR #57 — may be {} on first run
SESSION_KEY    = ds.get('SESSION_KEY', 'unknown')
SHELL_PATH     = f'/mnt/user-data/outputs/ssc_shell_{SESSION_KEY}.html'
print(f'Session: {SESSION_KEY} | Shell: {SHELL_PATH}')

def js_str(s):
    """Escape string for safe embedding in JS double-quoted string."""
    if s is None: return ''
    return (str(s).replace('\\','\\\\').replace('"','\\"')
                  .replace('\n','\\n').replace('\r','').replace('<','\\x3C'))

# [build_pipe_js, build_won_js, build_ae_js, build_script_js, build_dsz helpers here]
# See canonical helpers in the FUNCTION HELPERS section below.

# ── v17.0: SINGLE CALL TO build_dsz() replaces manual f-string ──────────────
# build_dsz() validates all data shapes, enforces canonical var names, and
# produces the complete DSZ string. Eliminates PD #16, #17, #18, #22, #33,
# #34, #35, #36, #40 as manual compliance requirements.
dsz_vars = build_dsz(ds)

# Load shell and inject — placeholder is INSIDE the <script> block (PD #21)
# ── FIX 6: SHELL TERRITORY ASSERTION (PD #28) ────────────────────────────────
# Verify the cached shell was built for the same territory as this run.
# In a shared deployment, one user's ssc_shell.html may have been generated for
# a different territory. The shell itself is territory-neutral HTML+CSS, but if
# a future shell update embeds territory labels, this check catches contamination.
import os as _os
_shell_paths = [
    SHELL_PATH,                                     # session-namespaced path (primary)
    '/mnt/user-data/outputs/ssc_shell.html',        # legacy fallback (pre-namespacing)
    '/home/claude/ssc_shell.html',                  # session-local fallback
]
shell = None
for _sp in _shell_paths:
    if _os.path.exists(_sp):
        with open(_sp) as _sf: shell = _sf.read()
        # Territory assertion: shell must contain the DATA_SWAP_ZONE placeholder
        # (confirms it has not been replaced with a prior run's injected data)
        if '<!-- @@DATA_SWAP_ZONE@@ -->' not in shell:
            print(f"⚠️ Shell at {_sp} is a DEPLOYED file (no placeholder) — cannot reuse. Falling back.")
            shell = None
            continue
        # Confirm shell has no hardcoded territory contamination from prior session
        # (check that it doesn't contain a DATA SWAP ZONE header for a different territory)
        if 'DATA SWAP ZONE —' in shell and TERRITORY not in shell:
            print(f"⚠️ Shell at {_sp} appears to contain a different territory's data. Falling back.")
            shell = None
            continue
        print(f"✅ Shell loaded from {_sp} ({len(shell):,} chars) — territory assertion passed")
        break

if shell is None:
    raise RuntimeError("No valid shell found at persistent paths — run Step 6 Fallback Protocol to extract from SKILL.md")

PLACEHOLDER = '<!-- @@DATA_SWAP_ZONE@@ -->'
assert PLACEHOLDER in shell, "FAIL: placeholder missing from shell"
html = shell.replace(PLACEHOLDER, dsz_vars)
assert PLACEHOLDER not in html

# ── QUOTA DEFAULT BANNER INJECTION (Fix 2: persistent amber warning) ─────────
# If USING_QUOTA_DEFAULTS is True, inject an amber banner into the header.
# This must be visible at all times — not a dismissable alert.
USING_QUOTA_DEFAULTS = ds.get('USING_QUOTA_DEFAULTS', False)
if USING_QUOTA_DEFAULTS:
    banner_css = '.quota-default-banner{background:rgba(245,166,35,.12);border:1px solid rgba(245,166,35,.4);border-radius:6px;padding:6px 14px;font-size:11px;color:var(--amber);margin-top:8px;letter-spacing:.2px}'
    banner_html = '<div class="quota-default-banner">⚠️ Quotas estimated at $1.5M per AE — coverage and pacing ratios may be inaccurate. Update via the ⚙ Quota Settings button.</div>'
    # Inject CSS before closing </style>
    html = html.replace('</style>', f'{banner_css}\n</style>', 1)
    # Inject banner after .hdr-meta element (insert after the first .hdr-sub div)
    html = html.replace('</div><!-- end hdr-left -->', f'{banner_html}</div><!-- end hdr-left -->', 1)
    # Fallback: if marker not found, append banner inside first .hdr div
    if banner_html not in html:
        html = html.replace('class="hdr-badges"', f'class="hdr-badges" data-quota-default="true"', 1)
        # Insert banner before hdr-badges as a full-width row
        html = html.replace('<div class="hdr-badges"', f'{banner_html}<div class="hdr-badges"', 1)
    print('✅ Quota default banner injected')

# ── POST-INJECTION ASSERTS (deploy blockers) ──────────────────────────────────
p1_pos = html.find('var PIPE_Q1')
gq_pos = html.find('function _getQuota')
open_script = html.rfind('<script>', 0, p1_pos)
assert open_script > 0, f"FAIL PD#21: PIPE_Q1 at {p1_pos} is OUTSIDE <script> (opens at {open_script})"
assert html.rfind('<script>', 0, gq_pos) > 0, "FAIL PD#22: _getQuota is outside <script>"
print(f"✅ PD#21: PIPE_Q1 inside script block")
print(f"✅ PD#22: _getQuota inside script block")

# ── PD #39: SCRIPT TAG COUNT ASSERT ──────────────────────────────────────────
import re as _re_st
_open_tags  = len(_re_st.findall(r'<script[^>]*>', html))
_close_tags = len(_re_st.findall(r'</script>', html))
assert _open_tags == 1,  f"FAIL PD#39: Expected 1 <script> open tag, found {_open_tags}"
assert _close_tags == 1, f"FAIL PD#39: Expected 1 </script> close tag, found {_close_tags}"
print(f"✅ PD#39: Script tag count 1/1")

# ── NNR #61: FORWARD QUARTER LABELS — inject dynamic label-setting into DOMContentLoaded
# Static HTML has generic labels ("Fwd Q2" etc). DOMContentLoaded must overwrite them
# from _QTR_META immediately on page load so managers see real quarter names (Q3, Q4 etc).
_ql_code = """
  // ⚠️ NNR #61: Forward quarter labels from _QTR_META — never show "Fwd Q1/Q2/Q3"
  (function(){
    var _q2l=(_QTR_META.q2&&_QTR_META.q2.label)||_QTR_META.q2Label||"Q3";
    var _q3l=(_QTR_META.q3&&_QTR_META.q3.label)||_QTR_META.q3Label||"Q4";
    var _q4l=(_QTR_META.q4&&_QTR_META.q4.label)||_QTR_META.q4Label||"Q1 FY27";
    var _RUN='<span style="color:var(--wasabi);font-size:9px;margin-left:4px">\\u25ba RUN</span>';
    var _e=function(id){return document.getElementById(id);};
    if(_e("tab-q2"))_e("tab-q2").textContent=_q2l;
    if(_e("tab-q3"))_e("tab-q3").textContent=_q3l;
    if(_e("tab-q4"))_e("tab-q4").textContent=_q4l;
    if(_e("sc-lbl-q2"))_e("sc-lbl-q2").innerHTML=_q2l+" Pipeline "+_RUN;
    if(_e("sc-lbl-q3"))_e("sc-lbl-q3").innerHTML=_q3l+" Pipeline "+_RUN;
    if(_e("sc-lbl-q4"))_e("sc-lbl-q4").innerHTML=_q4l+" Pipeline "+_RUN;
    if(_e("q2-prompt-title"))_e("q2-prompt-title").textContent=_q2l+" Pipeline";
    if(_e("q3-prompt-title"))_e("q3-prompt-title").textContent=_q3l+" Pipeline";
    if(_e("q4-prompt-title"))_e("q4-prompt-title").textContent=_q4l+" Pipeline";
    var _s2=_QTR_STATS&&_QTR_STATS.q2;var _s3=_QTR_STATS&&_QTR_STATS.q3;var _s4=_QTR_STATS&&_QTR_STATS.q4;
    if(_e("q2-prompt-meta")&&_s2)_e("q2-prompt-meta").textContent=(_s2.start||"")+" → "+(_s2.end||"");
    if(_e("q3-prompt-meta")&&_s3)_e("q3-prompt-meta").textContent=(_s3.start||"")+" → "+(_s3.end||"");
    if(_e("q4-prompt-meta")&&_s4)_e("q4-prompt-meta").textContent=(_s4.start||"")+" → "+(_s4.end||"");
    if(_e("q2-pill-pipe")&&_s2&&_s2.pipe!=="$0.0M")_e("q2-pill-pipe").textContent=_s2.pipe;
    if(_e("q3-pill-pipe")&&_s3&&_s3.pipe!=="$0.0M")_e("q3-pill-pipe").textContent=_s3.pipe;
    if(_e("q2-pill-n")&&_s2&&_s2.n!=="0")_e("q2-pill-n").textContent=_s2.n;
    if(_e("q3-pill-n")&&_s3&&_s3.n!=="0")_e("q3-pill-n").textContent=_s3.n;
  })();"""
# Inject into the first DOMContentLoaded block (after renderCoach() call)
_dcl_inject_marker = 'renderCoach();\n'
if _dcl_inject_marker in html:
    html = html.replace(_dcl_inject_marker, f'renderCoach();\n{_ql_code}\n', 1)
    print('✅ NNR #61: Forward quarter label injection added to DOMContentLoaded')
else:
    print('⚠️ NNR #61: Could not find renderCoach() injection point — forward quarter labels not injected')

with open('/home/claude/servicenow-sales-command-centre.html', 'w') as f:
    f.write(html)
```

---

## STEP 7 FUNCTION HELPERS — JS SERIALISATION

```python
def build_pipe_js(deals):
    parts = []
    for d in deals:
        fc = d['forecastCheck']
        fc_js = (f'{{"score":"{fc["score"]}",'
                 f'"gaps":{json.dumps(fc["gaps"])},'
                 f'"allNonGreen":{json.dumps(fc["allNonGreen"])},'
                 f'"allOk":{str(fc["allOk"]).lower()},'
                 f'"probMismatch":{str(fc["probMismatch"]).lower()},'
                 f'"missingOpen":{json.dumps(fc["missingOpen"])},'
                 f'"missingClosed":{json.dumps(fc["missingClosed"])},'
                 f'"forecastCode":"{js_str(fc["forecastCode"])}",'
                 f'"sm":{{"key":"{js_str(fc["sm"]["key"])}","label":"{js_str(fc["sm"]["label"])}"}},'
                 f'"probRange":{json.dumps(fc["probRange"])}}}')
        parts.append(
            f'{{"num":"{js_str(d["num"])}",'
            f'"name":"{js_str(d["name"])}",'
            f'"account":"{js_str(d["account"])}",'
            f'"ae":"{js_str(d["ae"])}",'
            f'"stage":"{js_str(d["stage"])}",'
            f'"prob":{d["prob"]},'
            f'"nnacv":{d["nnacv"]},'
            f'"closeDate":"{d["closeDate"]}",'
            f'"nowsell":null,'
            f'"forecastCheck":{fc_js},'
            f'"dtc":{d["dtc"]},'
            f'"dis":{d["dis"] if d.get("dis") is not None else "null"},'
            f'"flags":{json.dumps(d["flags"])},'
            f'"nextSteps":"{js_str(d["nextSteps"])}",'
            f'"nextStepsDate":"{js_str(d["nextStepsDate"])}",'
            f'"notesSummary":"{js_str(d["notesSummary"])}",'
            f'"competitor":"{js_str(d.get("competitor",""))}",'
            f'"engagements":{json.dumps(d.get("engagements",{}))}'
            f'}}')  # v16.7: engagements from Call 1f — keyed DIS/TV/BC/MP with {status,assignedTo,engId}
    return '[' + ',\n'.join(parts) + ']'

def build_won_js(deals):
    if not deals: return '[]'
    return '[' + ','.join(
        f'{{"num":"{js_str(d.get("num",""))}",'
        f'"name":"{js_str(d.get("name",""))}",'
        f'"account":"{js_str(d.get("account",""))}",'
        f'"ae":"{js_str(d.get("ae",""))}",'
        f'"stage":"{js_str(d.get("stage",""))}",'
        f'"closeDate":"{d.get("closeDate","")}",'
        f'"nnacv":{d.get("nnacv",0)}}}'
        for d in deals) + ']'

def build_ae_js(aes):
    parts = []
    for ae in aes:
        parts.append(
            f'{{"n":"{js_str(ae["n"])}",'
            f'"ae":"{js_str(ae["ae"])}",'
            f'"terr":"{js_str(ae["terr"])}",'
            f'"pipe":{ae["pipe"]},'
            f'"won":{ae["won"]},'
            f'"wtd":{ae.get("wtd", 0)},'
            f'"coverage":{round(ae["coverage"],2)},'
            f'"pacingPct":{ae["pacingPct"] if ae["pacingPct"] is not None else "null"},'
            f'"paceColor":"{ae["paceColor"]}",'
            f'"paceReason":"{js_str(ae["paceReason"])}",'
            f'"paceActions":{json.dumps([js_str(a) for a in ae["paceActions"]])},'
            f'"risk":"{ae["risk"]}",'
            f'"riskReason":"{js_str(ae["riskReason"])}",'
            f'"riskActions":{json.dumps([js_str(a) for a in ae["riskActions"]])},'
            f'"covColor":"{ae["covColor"]}",'
            f'"covReason":"{js_str(ae["covReason"])}",'
            f'"covActions":{json.dumps([js_str(a) for a in ae["covActions"]])},'
            f'"deals":{ae["deals"]},'
            f'"dsTotal":{ae["dsTotal"]},'
            f'"coachNarrative":"{js_str(ae["coachNarrative"])}",'
            f'"coachContext":"{js_str(ae["coachContext"])}",'
            f'"lever":"{js_str(ae["lever"])}",'
            f'"actions":{json.dumps([js_str(a) for a in ae["actions"]])},'
            f'"pipeActions":{json.dumps([js_str(a) for a in ae.get("pipeActions",[])])},'
            f'"nsGap":{json.dumps(ae["nsGap"])},'
            f'"attainProj":{ae.get("attainProj", 0)},'
            f'"attainPct":{ae.get("attainPct", 0)},'
            f'"quota":{ae.get("quota", 1500000)}}}')
    return '[' + ',\n'.join(parts) + ']'

def build_script_js(script):
    return '[' + ','.join(f'{{"text":"{js_str(s["text"])}"}}' for s in script) + ']'

# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# build_dsz() — SINGLE FUNCTION TO BUILD THE COMPLETE DATA SWAP ZONE (v17.0)
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
# This function encapsulates ALL DSZ construction logic including:
#   - Canonical variable names (PD #16: WON_CQ not CLOSED_WON, etc.)
#   - QUOTA_MAP IIFE + _getQuota function (PD #22)
#   - AE enrichment DOMContentLoaded block (NNR #35)
#   - _QTR_META sub-objects for forward quarters (NNR #34)
#   - SCRIPT as {text,seq} objects (NNR #36)
#   - All field naming (closeDate not close — NNR #40)
#   - nowsell=null on all deals (PD #17)
#   - ae.deals as int (PD #18)
#   - ae.n field present (NNR #33)
#
# Claude calls: dsz_vars = build_dsz(ds)
# Then replaces the @@DATA_SWAP_ZONE@@ placeholder with dsz_vars.
# This eliminates 15+ Prime Directives as manual compliance requirements.
# ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

def build_dsz(ds):
    """Build the complete Data Swap Zone JS string from a validated DS_PATH dict.

    Args:
        ds: dict loaded from data_swap_{SESSION_KEY}.json
    Returns:
        str: Complete JS variable declarations for injection into the shell.
    Raises:
        AssertionError: if any mandatory field is missing or malformed.
    """
    # ── Extract all required data ──────────────────────────────────────────
    PIPE_Q1        = ds['PIPE_Q1']
    WON_CQ         = ds['WON_CQ']
    CLOSED_LOST    = ds['CLOSED_LOST']
    DEALS_AT_RISK  = ds.get('DEALS_AT_RISK', [])
    UNASSIGNED     = ds.get('UNASSIGNED_DEALS', [])
    AE_DATA        = ds['AE_DATA']
    QUOTA_DEFAULTS = ds['QUOTA_DEFAULTS']
    _QTR_META      = ds['_QTR_META']
    _QTR_STATS     = ds['_QTR_STATS']
    SCRIPT         = ds['SCRIPT']
    TERR_SUMMARY   = ds.get('TERR_SUMMARY', {})
    DEAL_TRENDS    = ds.get('DEAL_TRENDS', {})
    CQ_LABEL       = ds['CQ_LABEL']
    TERRITORY      = ds['TERRITORY']
    CQ_LABEL_SAFE  = CQ_LABEL.replace(' ', '_')

    # ── Pre-flight assertions (catch bad data BEFORE injection) ───────────
    assert all('closeDate' in d for d in PIPE_Q1), \
        "FAIL NNR#40: PIPE_Q1 deals missing 'closeDate' field (using 'close'?)"
    assert all('n' in ae and ae['n'] == ae.get('name','') for ae in AE_DATA), \
        "FAIL NNR#33: AE_DATA objects missing 'n' field or n!=name"
    assert all(isinstance(ae.get('deals',0), int) for ae in AE_DATA), \
        "FAIL PD#18: AE_DATA[].deals must be int, not array"
    assert all(d.get('nowsell') is None for d in PIPE_Q1), \
        "FAIL PD#17: PIPE_Q1[].nowsell must be None/null"
    assert 'q1Label' in _QTR_META, \
        "FAIL NNR#34: _QTR_META missing q1Label"
    assert all(k in _QTR_META and 'label' in _QTR_META[k] for k in ['q2','q3','q4']), \
        "FAIL NNR#34: _QTR_META missing q2/q3/q4 sub-objects with label"
    assert all(isinstance(s, dict) and 'text' in s for s in SCRIPT), \
        "FAIL NNR#36: SCRIPT entries must be {text,seq} objects"
    print(f"✅ build_dsz pre-flight: {len(PIPE_Q1)} deals, {len(AE_DATA)} AEs, all assertions passed")

    # ── Build JS blocks ───────────────────────────────────────────────────
    pipe_js = build_pipe_js(PIPE_Q1)
    won_js = build_won_js(WON_CQ)
    cl_js = build_won_js(CLOSED_LOST)
    risk_js = build_pipe_js(DEALS_AT_RISK)
    ua_js = build_pipe_js(UNASSIGNED)
    ae_js = build_ae_js(AE_DATA)
    script_js = build_script_js(SCRIPT)

    # ── Assemble DSZ string ───────────────────────────────────────────────
    dsz = f'''// ============================================================
// DATA SWAP ZONE — {CQ_LABEL} | {TERRITORY}
// Generated by build_dsz() v17.0 — hardened single-function injection
// ============================================================

var PIPE_Q1 = {pipe_js};
var WON_CQ = {won_js};
var CLOSED_LOST = {cl_js};
var DEALS_AT_RISK = {risk_js};
var UNASSIGNED_DEALS = {ua_js};
var AE_DATA = {ae_js};

var QUOTA_DEFAULTS = {json.dumps(QUOTA_DEFAULTS)};
var QUOTA_MAP = (function(){{
  try {{ var saved=localStorage.getItem("sn_scc_quotas_{CQ_LABEL_SAFE}");if(saved)return JSON.parse(saved); }}
  catch(e){{}}
  return JSON.parse(JSON.stringify(QUOTA_DEFAULTS));
}})();
function _getQuota(n){{ return QUOTA_MAP[n]||1500000; }}

var _QTR_META = {json.dumps(_QTR_META)};
var _QTR_STATS = {json.dumps(_QTR_STATS)};

var TERR_SUMMARY = {json.dumps(TERR_SUMMARY)};
var DEAL_TRENDS = {json.dumps(DEAL_TRENDS)};

var SCRIPT = {script_js};'''

    print(f"✅ build_dsz: {len(dsz):,} chars generated")
    return dsz
```

**Shell loading uses a 3-tier fallback — standalone files are fastest and most reliable.**

### Tier 1 — STANDALONE FILES (preferred, v17.0+)

Ships alongside SKILL.md as two clean files with zero markdown contamination risk:
- `/mnt/skills/user/servicenow-sales-command-centre/ssc_section_a.html` — CSS + HTML template (42KB)
- `/mnt/skills/user/servicenow-sales-command-centre/ssc_section_b.js` — all 41+ JS functions (125KB)

```python
import os, re, json, glob, shutil

SKILL_DIR = '/mnt/skills/user/servicenow-sales-command-centre'
SA_PATH = os.path.join(SKILL_DIR, 'ssc_section_a.html')
SB_PATH = os.path.join(SKILL_DIR, 'ssc_section_b.js')

shell = None

# ── TIER 1: Standalone files (fastest, most reliable) ──────────────────────
if os.path.exists(SA_PATH) and os.path.exists(SB_PATH):
    with open(SA_PATH) as f: section_a = f.read()
    with open(SB_PATH) as f: section_b = f.read()
    # Quick contamination check
    if '<!DOCTYPE html>' in section_a and 'function ' in section_b and '```' not in section_a:
        shell = section_a + "\n<script>\n<!-- @@DATA_SWAP_ZONE@@ -->\n\n" + section_b
        print(f"✅ Shell loaded from standalone files: {len(shell):,} chars")
    else:
        print("⚠️ Standalone files failed contamination check — falling through to Tier 2")

# ── TIER 2: Persistent shell from prior run ────────────────────────────────
if shell is None:
    _dsf = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
    _sk = json.load(open(_dsf[0]))['SESSION_KEY'] if _dsf else 'unknown'
    _shell_path = f'/mnt/user-data/outputs/ssc_shell_{_sk}.html'
    if os.path.exists(_shell_path):
        with open(_shell_path) as f: _cached = f.read()
        if '@@DATA_SWAP_ZONE@@' in _cached:
            shell = _cached
            print(f"✅ Shell loaded from persistent cache: {_shell_path}")
        else:
            print(f"⚠️ Persistent shell is a deployed file (no placeholder) — falling through to Tier 3")

# ── TIER 3: Byte-position extraction from SKILL.md (legacy fallback) ──────
if shell is None:
    print("⚠️ Tier 3 fallback: extracting shell from SKILL.md via byte-position markers")
    with open(os.path.join(SKILL_DIR, 'SKILL.md')) as f:
        skill = f.read()
    html_start   = skill.find('<!DOCTYPE html>')
    cont_marker  = '\n```\n\n---\n\n## DATA SWAP ZONE TEMPLATE'
    cont_idx     = skill.find(cont_marker, html_start)
    section_a    = skill[html_start:cont_idx]
    sb_marker    = '\n\n---\n\n## SECTION B\n\n```html\n'
    sb_idx       = skill.find(sb_marker, cont_idx)
    sb_start     = sb_idx + len(sb_marker)
    sb_end_mark  = '\n```\n\n---\n\n## CHANGELOG'
    sb_end       = skill.find(sb_end_mark, sb_start)
    section_b    = skill[sb_start:sb_end]
    assert '<!DOCTYPE html>' in section_a, "FAIL: section_a missing DOCTYPE"
    assert 'function ' in section_b, "FAIL: section_b missing JS functions"
    assert '```' not in section_a, "FAIL: markdown leaked into section_a"
    assert '## SECTION' not in section_b, "FAIL: markdown leaked into section_b"
    shell = section_a + "\n<script>\n<!-- @@DATA_SWAP_ZONE@@ -->\n\n" + section_b
    print(f"✅ Shell extracted from SKILL.md (Tier 3): {len(shell):,} chars")

# ── COMMON VALIDATION (all tiers) ─────────────────────────────────────────
assert '@@DATA_SWAP_ZONE@@' in shell, "FAIL: no placeholder in shell"
assert '<!DOCTYPE html>' in shell, "FAIL: no DOCTYPE in shell"
assert '</html>' in shell, "FAIL: no closing html tag"
assert 'DATA SWAP ZONE TEMPLATE' not in shell, "FAIL: markdown contamination"

# PD #21: placeholder must be INSIDE the <script> block
_pipe_pos = shell.find('@@DATA_SWAP_ZONE@@')
assert shell.rfind('<script>', 0, _pipe_pos) > 0, "FAIL: <script> must appear before placeholder (PD #21)"

_tags = re.findall(r'</?script[^>]*>', shell)
assert len(_tags) == 2, f"FAIL: expected 2 script tags, got {len(_tags)}: {_tags}"

with open('/home/claude/ssc_shell.html', 'w') as f:
    f.write(shell)

# Persist to session-namespaced SHELL_PATH
_dsf = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
_sk  = json.load(open(_dsf[0]))['SESSION_KEY'] if _dsf else 'unknown'
_shell_out = f'/mnt/user-data/outputs/ssc_shell_{_sk}.html'
shutil.copy('/home/claude/ssc_shell.html', _shell_out)
print(f"✅ Shell persisted: {len(shell):,} chars → {_shell_out}")
```

⚠️ **DO NOT use `re.search(r'## SECTION A.*```html')` regex** — it captures markdown between sections (PD #12). Tier 3 uses byte-position markers only. Tier 1 eliminates this risk entirely.

---

## STEP 9 — NODE --CHECK PROTOCOL (Prime Directive #4)

⚠️ **Node cannot parse `.html` files directly.** Extract EACH `<script>` block separately and check each one. The dashboard has TWO script blocks — both must pass.

```python
import re, subprocess

with open('/home/claude/servicenow-sales-command-centre.html') as f:
    html = f.read()

scripts = re.findall(r'<script[^>]*>(.*?)</script>', html, re.DOTALL)
print(f"Script blocks found: {len(scripts)}")  # Must be 2
all_ok = True
for i, s in enumerate(scripts):
    with open('/tmp/check.js', 'w') as f:
        f.write(s)
    r = subprocess.run(['node', '--check', '/tmp/check.js'], capture_output=True, text=True)
    status = 'OK' if r.returncode == 0 else r.stderr.strip()[:200]
    print(f"Script {i} ({len(s):,} chars): {status}")
    if r.returncode != 0:
        all_ok = False

assert all_ok, "SYNTAX ERRORS — fix before deploy"

# ── NAMED FUNCTION VALIDATION (replaces count-only gate — more robust) ────────
# Validates each required function by name, not just total count.
# This prevents false passes when the count is right but a critical function is missing.
REQUIRED_FUNCTIONS = [
    'renderPipe', 'renderWon', 'renderAE', 'renderCoach', 'renderHygiene',
    'renderAtRisk', 'renderUnassigned', 'renderTerrSummary', 'copyCoachBrief', 'draftEmailToAE',
    'openModal', 'closeModal', 'switchModalTab',
    'openAEModal', 'closeAEModal', 'switchAETab', 'switchAEDealTab', 'toggleAEDealCard',
    'openHygieneModal', 'closeHygieneModal',
    'openBadgeCoach', 'closeBadgeCoach',
    '_wtdForAE', '_hgModal', '_pipeFilter', '_pipeFilterClear',
    'openQuotaModal', 'closeQuotaModal', 'saveQuotas', 'resetQuotas',
    '_liveCoverage', '_getQuota',
    'showDtcExplainer', '_closeDtcPop',
    'switchTab', 'playWR', 'stopWR', '_wrInitCompat', 'runQtrReport', 'showQtrInstructions', 'copyTrigger',
]
missing_fns = [fn for fn in REQUIRED_FUNCTIONS if f'function {fn}' not in html]
if missing_fns:
    print(f"❌ MISSING FUNCTIONS ({len(missing_fns)}): {missing_fns}")
    assert False, f"Deploy blocked — {len(missing_fns)} required functions missing"
else:
    print(f"✅ All {len(REQUIRED_FUNCTIONS)} required functions present")
    fns_found = [l.strip().split('(')[0].replace('function ', '').strip()
                 for l in html.split('\n') if l.strip().startswith('function ')]
    print(f"   Total functions in file: {len(fns_found)}")

    # ── REQUIRED_FUNCTIONS DRIFT GUARD (Fix: auto-sync check) ────────────────────
    # Detects when a new function was added to Section B but NOT added to REQUIRED_FUNCTIONS.
    # This prevents the silent failure mode where a critical function is present but
    # unvalidated — if it gets accidentally deleted later, the named check won't catch it.
    #
    # Logic: count total 'function ' declarations in the HTML vs len(REQUIRED_FUNCTIONS).
    # A large positive gap (>10) suggests new functions were added without updating the list.
    # This is a WARNING not a blocker — not every helper function needs to be in the list.
    # But if the gap is >10, Claude must print the names of unlisted functions so the
    # skill maintainer can decide which ones to add.
    _listed_set = set(REQUIRED_FUNCTIONS)
    _unlisted   = [fn for fn in fns_found if fn and fn not in _listed_set]
    if len(_unlisted) > 10:
        print(f"⚠️ DRIFT WARNING: {len(_unlisted)} functions in HTML are NOT in REQUIRED_FUNCTIONS list.")
        print(f"   Unlisted functions: {_unlisted}")
        print(f"   ACTION: Review and add critical ones to REQUIRED_FUNCTIONS in Step 9 of SKILL.md.")
        print(f"   (Helper/inner functions that are never called directly can remain unlisted.)")
    else:
        print(f"✅ REQUIRED_FUNCTIONS sync check: {len(_unlisted)} unlisted helper(s) — within normal range")

# ── DATA SANITY CHECKS (Fix 3: catch bad data before deploy) ─────────────────
# These checks verify data integrity at the HTML level — complements Python validation.
import json as _sj, re as _sre

# Extract PIPE_Q1 from rendered HTML to confirm data survived injection
_pipe_match = _sre.search(r'var PIPE_Q1\s*=\s*(\[.*?\]);', html, _sre.DOTALL)
_ae_match   = _sre.search(r'var AE_DATA\s*=\s*(\[.*?\]);',  html, _sre.DOTALL)

if _pipe_match:
    try:
        _pipe = _sj.loads(_pipe_match.group(1))
        assert len(_pipe) > 0, "FAIL: PIPE_Q1 is empty after injection — data did not survive DSZ replace"
        _total_nnacv = sum(d.get('nnacv', 0) for d in _pipe)
        # Sanity range: net pipeline should be between -$5M and $100M for any single territory
        assert -5_000_000 <= _total_nnacv <= 100_000_000, \
            f"FAIL: PIPE_Q1 total NNACV ${_total_nnacv:,.0f} is outside plausible range — check for NNACV doubling (PD #20)"
        _top_nnacv = max(d.get('nnacv', 0) for d in _pipe)
        # Single deal sanity: no deal should exceed $50M (signals doubling bug)
        assert _top_nnacv <= 50_000_000, \
            f"FAIL: Top deal NNACV ${_top_nnacv:,.0f} exceeds $50M — likely NNACV double-count (PD #20)"
        print(f"✅ Data sanity: {len(_pipe)} deals | total ${_total_nnacv/1e6:.1f}M | top deal ${_top_nnacv/1e6:.1f}M")

        # ── NNR #42: MANDATORY DYNAMICS CROSS-CHECK BEFORE DEPLOY ──────────────
        # Truncated Snowflake results pass all range checks but show the WRONG number.
        # $5.7M Snowflake vs $11.98M Dynamics is a known truncation pattern — Cortex
        # silently returns ~50% of rows when the result set is large.
        # Claude MUST surface the Snowflake total and ask the manager to confirm
        # it matches Dynamics before proceeding to Step 10 (deploy).
        print(f"\n{'='*60}")
        print(f"DYNAMICS CROSS-CHECK (NNR #42) — MANDATORY BEFORE DEPLOY")
        print(f"Snowflake net NNACV: ${_total_nnacv/1e6:.2f}M | {len(_pipe)} deals")
        print(f"ACTION: Ask manager — does ${_total_nnacv/1e6:.2f}M match Dynamics total?")
        print(f"If NO or >10% gap: result set is TRUNCATED — re-run Call 1 (NNR #25)")
        print(f"{'='*60}\n")
        # Claude MUST pause here and explicitly ask the manager before proceeding.
    except (json.JSONDecodeError, AssertionError) as _e:
        print(f"❌ DATA SANITY FAIL: {_e}")
        assert False, str(_e)
else:
    print("⚠️ Could not extract PIPE_Q1 from HTML for sanity check — verify manually")

if _ae_match:
    try:
        _aes = _sj.loads(_ae_match.group(1))
        assert len(_aes) > 0, "FAIL: AE_DATA is empty after injection"
        print(f"✅ AE_DATA sanity: {len(_aes)} AEs present in rendered HTML")
    except Exception as _e:
        print(f"⚠️ AE_DATA sanity check failed: {_e}")

print("ALL GATES PASSED — awaiting Dynamics cross-check confirmation before Step 10")
```

---

## STEP 11 — COPY TO OUTPUTS AND PRESENT

```python
import shutil, glob, os, json

# Recover session paths from DS_PATH if not in memory
_dsf = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
assert _dsf, "FAIL: No DS_PATH found — cannot deploy"
_sk      = json.load(open(_dsf[0])).get('SESSION_KEY', 'unknown')
OUT_PATH = '/mnt/user-data/outputs/servicenow-sales-command-centre.html'

shutil.copy('/home/claude/servicenow-sales-command-centre.html', OUT_PATH)
print(f'✅ Deployed: {OUT_PATH}')
```

Call `present_files` with `[OUT_PATH]` immediately after this step.

---

## STEP 12 — REFRESH PERSISTENT SHELL (session-namespaced)

```python
import shutil, glob, os, json

# Recover SHELL_PATH from DS_PATH session key
_dsf = sorted(glob.glob('/home/claude/data_swap_*.json'), key=os.path.getmtime, reverse=True)
assert _dsf, "FAIL: No DS_PATH found — cannot refresh shell"
_sk         = json.load(open(_dsf[0])).get('SESSION_KEY', 'unknown')
SHELL_PATH  = f'/mnt/user-data/outputs/ssc_shell_{_sk}.html'
OUT_PATH    = '/mnt/user-data/outputs/servicenow-sales-command-centre.html'

# ⚠️ PD #28 + PD #30: Write the deployed HTML as the new persistent shell.
# The NEXT run's Step 6 will load this file. When a new run starts,
# Stage 0a detects the session key and Step 6 checks the placeholder is present.
# WARNING: The file written here is a FULLY DEPLOYED dashboard (placeholder replaced).
# Step 6 shell validation MUST detect this and fall back to SKILL.md extraction —
# the shell assert (`<!-- @@DATA_SWAP_ZONE@@ -->` not in shell) enforces this.
# What Step 12 actually preserves is the PARSED SESSION_KEY for Stage 0a recovery.
# The real shell re-extraction from SKILL.md costs ~5s and only fires when needed.
shutil.copy(OUT_PATH, SHELL_PATH)
print(f'✅ Shell refreshed: {SHELL_PATH}')
print(f'   ⚠️ Next run: Step 6 will detect deployed file (no placeholder) and re-extract from SKILL.md.')
print(f'   Session key preserved in DS_PATH for Stage 0a cache recovery.')

# ── NNR #57: WRITE TREND BASELINE (persists across chat sessions) ─────────────
# Slim snapshot: only the fields needed for next-run delta computation.
# Overwrites prior baseline — always reflects the most recent run.
# Failure is a warning, NOT a deploy blocker.
import json as _tbj
try:
    _ds2 = _tbj.load(open(_dsf[0]))
    _pipe_for_baseline = _ds2.get('PIPE_Q1', [])
    _baseline = {
        d['num']: {
            'prob':           d.get('prob', 0),
            'stage':          d.get('stage', ''),
            'nextStepsDate':  d.get('nextStepsDate', ''),
        }
        for d in _pipe_for_baseline
    }
    _baseline_path = '/mnt/user-data/outputs/ssc_trend_baseline.json'
    with open(_baseline_path, 'w') as _tbf:
        _tbj.dump(_baseline, _tbf, indent=2)
    print(f'✅ Trend baseline written: {len(_baseline)} deals → {_baseline_path}')
    print(f'   Next run will compute prob_delta / stage_delta / ns_delta from this snapshot.')
except Exception as _tbe:
    print(f'⚠️ Trend baseline write failed ({_tbe}) — next run will show no trend data.')
```

⚠️ **After Step 12, the run is complete.** The session state is fully persisted:
- `DS_PATH` — pipeline data + SESSION_KEY + MANAGER_NAME (Stage 0a cache)
- `QUOTA_PATH` — Snowflake-sourced quotas (returning user fast path)
- `SHELL_PATH` — deployed HTML (signals prior run; triggers SKILL.md re-extraction next time)
- `OUT_PATH` — the live dashboard file the user downloads

1. **SECTION A + B VERBATIM** — no modifications outside DATA SWAP ZONE
2. **NET NNACV MANDATORY** — `SUM(nnacv_usd_cfx)` per OPTY; NEVER filter `> 0`
3. **`node --check` on EACH script block** — two blocks, both must pass
4. **Double-quoted JS strings** — apostrophes in account names break single-quoted JS
5. **Manager excluded from AE_DATA** — `EXCLUDE_NAMES` is derived from `MANAGER_NAME`; never hardcode
6. **`_QTR_META.q1Label` drives all CQ labels** — never hardcode quarter labels
7. **Step 2b zero rows = valid** — no downsells is not an error
8. **Named function validation is mandatory — 41 functions must be present by name** — Step 9 validates each of the 41 required functions by exact name match. A count-only gate can pass when a critical function is missing. The `REQUIRED_FUNCTIONS` list in Step 9 is the ground truth. Missing any listed function = deploy blocker.
9. **QUOTA block is verbatim** — localStorage key uses `{CQ_LABEL_SAFE}`
10. **Python validation must pass** before HTML is written
11. **DISK-FIRST IS NON-NEGOTIABLE — write to `DS_PATH` (session-namespaced), never the bare path** — At end of Step 5, write to `DS_PATH = /home/claude/data_swap_{SESSION_KEY}.json`. Steps 6–12 recover `DS_PATH` via `glob.glob('/home/claude/data_swap_*.json')` — most-recent file wins. Writing to bare `data_swap.json` collides with other concurrent sessions and loses the `SESSION_KEY` needed for shell and quota sidecar recovery.
12. **resolve_ae() ALWAYS called** — never bypass the override map
13. **clean_next_steps() ALWAYS called** — never store stage-gate values as nextSteps
14. **Unique num keys ALWAYS enforced** — duplicate num = deploy blocker
15. **DATA SWAP ZONE variable names are CANONICAL** — use `WON_CQ`, `CLOSED_LOST`; never rename (PD #16)
16. **`nowsell` in PIPE_Q1 MUST be None/null** — never a pre-filled dict (PD #17)
17. **`ae.deals` MUST be int count** — never an array (PD #18)
18. **`ae.n` is the AE name field** — Section B never uses `ae.ae`; must be `n` (PD #16)
19. **QUOTA_DEFAULTS must be defined and keyed by ae.n** — `_getQuota()` requires it on page load
20. **Call 1b runs if nextSteps coverage < 20%; 0% = deploy BLOCKER** — Zero next steps across all deals means the wrong Snowflake column was returned. Re-run Call 1b with explicit `parent_opportunity_next_steps` column before deploy. Assert at least 1 deal has `nextSteps` OR `notesSummary` before writing DS_PATH. (PD #19, #26)
21. **NNACV set ONCE per opty on first insert only** — never accumulate across duplicate result sets; cross-check top deal NNACV against source before deploy (PD #20)
22. **Shell MUST have `<script>` tag BEFORE the placeholder** — `section_a + "\n<script>\n<!-- @@DATA_SWAP_ZONE@@ -->\n\n" + section_b` is the ONLY valid pattern; placeholder after `<script>` = raw text in browser (PD #21)
23. **After Step 7 injection, assert `html.rfind('<script>',0,pipe_q1_pos) > 0`** — confirms PIPE_Q1 var is inside the script block; failure = deploy blocker
24. **Step 7 MUST include `QUOTA_MAP` IIFE + `function _getQuota` between `QUOTA_DEFAULTS` and `_QTR_META`** — Section B calls `_getQuota(ae.n)` in three places; omitting this block causes `ReferenceError: _getQuota is not defined` on page load. Canonical injection order: `PIPE_Q1` → `WON_CQ` → `CLOSED_LOST` → `AE_DATA` → `QUOTA_DEFAULTS` → `QUOTA_MAP` IIFE → `function _getQuota` → `_QTR_META` → `_QTR_STATS` → `SCRIPT` (PD #22)
25. **`coachNarrative` and `actions` MUST be deal-aware and account-specific** — For any AE with `deals > 0`, `coachNarrative` must name real accounts and deal values. Each `actions` entry must reference real account names + NowSell milestone gaps. Generic text acceptable only for zero-pipeline AEs. (PD #23)
26. **STATUS tab next steps block MUST render for deals with next steps data** — If all deals show "No Next Steps recorded", Call 1b was not run. Fix the data layer — do NOT modify STATUS tab HTML.
27. **KNOWN_AES MUST come from Call H — never from hardcoded defaults for non-ANZ FSI territories** — Call H (H1+H2+H3) is the canonical source. ANZ FSI hardcoded list is last-resort fallback only when Call H returns zero rows AND territory is ANZ FSI. For any other territory, empty CONFIRMED_AES = deploy blocker. (PD #29)
28. **Shell territory assertion is mandatory before every deploy** — Assert shell contains `<!-- @@DATA_SWAP_ZONE@@ -->` and check for cross-territory contamination. Failure → fall back to SKILL.md extraction. (PD #28)
29. **`EXCLUDE_NAMES` is always derived from `MANAGER_NAME` — no hardcoded fallback for non-ANZ FSI** — If `MANAGER_NAME` is empty in Step 5, the script calls `sys.exit(1)`. The `'Grant Thomson'` fallback was removed — `MANAGER_NAME` must always be substituted from Step 0 Stage 3.
30. **`dis` (days-in-stage) badge thresholds are locked** — grey ≤14d / amber 15–30d / red >30d. Do not change without explicit manager instruction.
31. **`AE_SEGMENT` MUST be replaced with `CONFIRMED_SEGMENTS` for non-ANZ FSI territories** — Hardcoded ANZ FSI account labels ('NAB-only' etc.) must not appear for other territories.
32. **Session namespacing is NON-NEGOTIABLE — all temp paths use `SESSION_KEY` prefix** — `DS_PATH`, `QUOTA_PATH`, and `SHELL_PATH` are always `*_{SESSION_KEY}.*`. Bare `data_swap.json`, `ssc_shell.html`, `ssc_quotas.json` must never be written. SESSION_KEY and MANAGER_NAME must be written INTO DS_PATH so Stage 0a can recover the full session state on re-run. (PD #30)
33. **Quota is Snowflake-first — `GTM_SALES_REP_QUOTA.QUOTA_REP_USD` is the primary source** — Call H1 pulls real quotas for the current quarter. Manager only needs to supply quotas for AEs missing from H1. Never prompt for quota entry from scratch when H1 has data. (PD #31)
34. **Call H is mandatory for every run, every territory** — Even for ANZ FSI, Call H must run to confirm the current roster. The hardcoded ANZ FSI list may be stale (AEs change territories). Call H result + manager confirmation supersedes any hardcoded list.
35. **Call 1c (competitor intelligence) is always fired in parallel with Call 1b — never a deploy blocker** — `primary_competitor_name` is best-effort data. Zero results = `comp_map={}`, continue. Normalise competitor names (Salesforce/SFDC → "Salesforce", Microsoft/Dynamics → "Microsoft", Pega/Pegasystems → "Pega", Archer/RSA → "Archer"). Never let a failed competitor query block deploy. Competitive deals surface in coaching actions with the canonical COMPETE_PLAYS dict and in the Manager Coaching tab Competitive Intelligence callout.
36. **Unassigned deals MUST surface in a visible panel — never silently dropped** — Deals where `parent_opportunity_sales_rep_name` is blank become `UNASSIGNED_DEALS` (separated from `PIPE_Q1` after build). They render in an amber panel above the pipeline table with CRM links. This is especially important for territories where Dynamics data quality is inconsistent (e.g. renewal deals with blank rep field). `UNASSIGNED_DEALS` is written to DS_PATH and injected into the DSZ as `var UNASSIGNED_DEALS`. `renderUnassigned()` is called from DOMContentLoaded.
37. **NEVER use `pipeline_status` as a Snowflake filter — it does not exist in the underlying view and returns 0 rows** — Open pipeline is identified by stage exclusion only: `AND opportunity_stage NOT IN ('8 - Closed Won (100%)', '9 - Closed Lost (0%)')`. Closed Lost is identified by `AND opportunity_stage = '9 - Closed Lost (0%)'`. This applies to ALL queries in ALL calls — any `pipeline_status =` filter is a deploy blocker.
38. **NEVER add `AND nnacv_usd_cfx != 0` to Call 1** — this silently drops $0 NNACV and null-NNACV deals (common for renewal/upsell deals in flight). All open-stage deals must be returned; $0/null NNACV is handled in Python as `nnacv = 0`, never excluded at query level. Forward quarter stats query is similarly exempt from NNACV filtering.
39. **Forward quarter tab and stat card labels MUST show real quarter names (e.g. Q3 FY2026), never "Fwd Q1/Q2/Q3"** — `_QTR_META['q2']['label']`, `['q3']['label']`, `['q4']['label']` MUST be populated in Step 5 Python using `_fwd_label2()` before DS_PATH is written. The JS `DOMContentLoaded` block overwrites tab text and stat card headers from `meta.label` — if label is missing, the HTML fallback text shows. "Fwd Q1" is meaningless to a manager reading the dashboard; "Q3 FY2026" is not.

40. **Pacing badge MUST NOT show "100% pacing" when the quarter hasn't started** — When `elapsed_pct == 0` (DAYS_LEFT equals the full quarter length), `pace_pct` MUST be set to `None` (serialised as `null` in JS) and `pace_color` to `'TEAL'`. The AE stack card renders a "Q opens soon ▶" badge in teal instead of a misleading green "100% pacing" badge. Pacing only becomes meaningful once deals start closing. `build_ae_js` serialises `None` as `null` — the JS `if(ae.pacingPct!=null)` branch handles this correctly.

41. **FWD quarter pipeline MUST NOT match CQ pipeline total — date range bug guard** — After Step 3 query returns and `_QTR_STATS` is populated, assert that `_QTR_STATS['q2']['pipe']` does not equal the CQ net NNACV. An exact match means the Step 3 query returned CQ-quarter deals (wrong date range). Fix: derive `FWD1_START` as `CQ_END + 1 day`, snap to quarter boundaries using `_qtr_bounds()`, print all three FWD date ranges to console before firing Step 3, and verify they do not overlap with `[CQ_START, CQ_END]`. This is a WARNING not a hard blocker — but Claude must surface it in dashboard output and note the discrepancy to the user.

51. **Call 1 MUST use THREE monthly sub-queries — two-window (half-quarter) split is permanently retired** — Confirmed 2026-03-29: The two-window split (A: CQ_START→CQ_MID, B: CQ_MID_PLUS1→CQ_END) still missed deals in high-volume territories because the first-half window can hit the Cortex row cap when the quarter has many deals closing in months 1-2. The canonical pattern is now THREE monthly windows (M1, M2, M3), each covering exactly one calendar month of the quarter. This gives narrower, more predictable result sets and eliminates the month-boundary concentration problem. The old `CQ_MID` / `CQ_MID_PLUS1` split-point table is retired — use calendar month boundaries only. Deploy blockers: (1) Claude must compute M1/M2/M3 date ranges in Python before firing any Call 1 queries; (2) all three must complete before Step 5; (3) result set sizes must be printed to console so the manager can verify completeness. NNR #42 (single full-quarter query banned) still applies — monthly windows are the fix, not a relaxation of that rule.

52. **Open downsell deals (negative NNACV in open pipeline) MUST be captured in every monthly window — never filtered** — Deals in open stages (Stage 1–7) can carry negative `nnacv_usd_cfx` (confirmed: Suncorp OPTY6537945 at -$15,787, Stage 7 (90%)). These are valid pipeline entries — they represent downward ACV adjustments that are still in flight. The `Do not filter out zero or null NNACV` instruction in every Call 1 sub-query (M1/M2/M3 and 1e-M1/M2/M3) covers negative values too. Python Step 5 MUST NOT skip rows with negative nnacv — they go into `opty_map` and `PIPE_Q1` as normal, with a `DOWNSELL` flag set by `deal_flags()`. Their negative NNACV correctly reduces `total_pipe`. The pipeline table renders them with an amber "↓ Downsell" badge. Skipping or filtering negative NNACV open deals is a deploy blocker.

54. **Forward quarter stats MUST be populated from Snowflake before deploy — `"--"` in any FWD slot is a deploy blocker** — Confirmed 2026-03-29: When a session hits the call limit before Step 3 fires, `_QTR_STATS` q2/q3/q4 slots remain at the default `"$0.0M"/"--"` values and the dashboard stat cards show blank or "--". This silently misrepresents the territory's forward pipeline shape to the manager. MANDATORY fix: (1) Step 3 fires a single batched query covering FWD1+FWD2+FWD3 date ranges in ONE tool call (not three). If Step 3 was skipped due to call limit, the session resume (`DS_PATH` cache hit) MUST detect `_QTR_STATS['q2']['pipe'] == "$0.0M"` and run Step 3 before rebuilding HTML — not after. Assert: `all(v['pipe'] != "$0.0M" and v['pipe'] != "--" for v in [_QTR_STATS['q2'], _QTR_STATS['q3'], _QTR_STATS['q4']])` before deploy. On session resume (Stage 0a cache hit + DS_PATH loaded), if FWD stats are blank, treat as an incomplete run and re-run Step 3 before Step 6.

55. **Partner-account deals from Call 1e MUST be deduped via opty_map before building PIPE_Q1/UNASSIGNED** — Confirmed 2026-03-29: Bupa ($101K + $60K), AMP Services NZ ($7.7K), Mobilise IT ($1.8K), and Suncorp RFP ($272K) were missing from the initial Q2 FY2026 dashboard because Call 1e wasn't run before the call limit was reached. On session resume, if the DS_PATH PIPE_Q1 length is significantly smaller than expected (< 30 assigned deals for ANZ FSI Day 1), treat as a potential Call 1e gap and run the supplemental queries before HTML build. The canonical check: compare `len(PIPE_Q1) + len(UNASSIGNED_DEALS)` against a reasonable lower bound (>40 total for ANZ FSI Q2); if below threshold, re-run Call 1e M1/M2/M3 before Step 6. New deals from Call 1e merge through the same PD #20 opty_map dedup — existing deals are never re-counted.

57. **Deal Health Trend MUST be computed from the prior-run baseline before Step 5 completes (NNR #59)** — At the start of Step 5, Claude MUST attempt to read `/mnt/user-data/outputs/ssc_trend_baseline.json`. If the file exists, load it as `PRIOR_SNAPSHOT` (a dict keyed by `opportunity_number`). If it does not exist, set `PRIOR_SNAPSHOT = {}` — first run, no trend data, no error. For each deal in `PIPE_Q1`, compute three delta fields by looking up the matching `opportunity_number` in `PRIOR_SNAPSHOT`: (1) `prob_delta` = current `prob` minus prior `prob` (integer; 0 if no prior record); (2) `stage_delta` = `"advanced"` if current stage number > prior, `"regressed"` if lower, `"stalled"` if stage is the same and `dtc` has not improved, or `"unchanged"` otherwise; (3) `ns_delta` = `"fresh"` if `nextStepsDate` has changed since prior run, `"stale"` if it is the same, or `"new"` if `opportunity_number` was not in `PRIOR_SNAPSHOT`. Write `DEAL_TRENDS` dict (keyed by `opportunity_number`, values = `{prob_delta, stage_delta, ns_delta}`) into `DS_PATH`. At Step 12, after the deployed file is copied to `OUT_PATH`, write a SLIM snapshot to `/mnt/user-data/outputs/ssc_trend_baseline.json` containing only `{opportunity_number: {prob, stage, nextStepsDate}}` for each deal in `PIPE_Q1` — overwrite any prior file. This baseline write at Step 12 is MANDATORY — if it fails, print a warning but do NOT block deploy. `PRIOR_SNAPSHOT = {}` on first run is the graceful degradation path — no special handling required in the HTML render.

58. **Hygiene modal MUST show a "Health Since Last Run" section when DEAL_TRENDS is populated** — When `openHygieneModal(num)` renders the modal body for a deal, check `typeof DEAL_TRENDS !== "undefined" && DEAL_TRENDS[d.num]`. If a trend record exists, render a compact "Health Since Last Run" section at the TOP of the modal body (before the probability mismatch banner and before the NowSell milestone section). The section must show three rows: (1) Probability — green ↑ with `+X%` if `prob_delta > 0`, red ↓ with `-X%` if `prob_delta < 0`, grey → if 0; (2) Stage — ✅ Advanced / ⚠️ Stalled / 🔴 Regressed / → Unchanged, coloured accordingly; (3) Next Steps — ✅ Updated since last run (green) / ⚠️ Unchanged since last run (amber). If `DEAL_TRENDS` is undefined or empty (first run), render a single grey line: `"No prior run data — trend will appear after the next daily run."` inside the same section shell. The section itself must always be rendered when `DEAL_TRENDS` is defined (even if empty) so the manager can see the feature is active. Section must use the existing `hygiene-section` CSS class. This is a deploy quality fail if missing from `openHygieneModal`.

59. **AE Coaching tab deal list MUST show a trend pill after each deal name when DEAL_TRENDS is populated** — In `renderCoach`, the deal list within each AE coaching card iterates deals sorted by NNACV. After the deal name and NNACV value on each deal row, append a compact inline trend pill sourced from `DEAL_TRENDS[d.num]`. Pill logic: 🟢 (green, `"Improving"`) if `prob_delta > 0` AND (`stage_delta === "advanced"` OR `ns_delta === "fresh"`); 🔴 (red, `"Declining"`) if `prob_delta < 0` AND (`stage_delta === "stalled"` OR `stage_delta === "regressed"`) AND `ns_delta === "stale"`; 🟡 (amber, `"Mixed"`) for any other non-trivial combination; no pill rendered if all three deltas are `"unchanged"` / `0` / `"stale"` with no prob change, or if no prior data for that deal. Pill must be inline-block, `font-size:9px`, with a coloured circular emoji prefix. Clicking the pill must open `openHygieneModal(d.num)` to show the full trend detail. If `DEAL_TRENDS` is undefined, omit pills entirely — no placeholder, no error. This is a deploy quality fail if `DEAL_TRENDS` is defined but pills are missing from the coaching card deal list.

60. **Unassigned deals MUST appear INLINE within monthly close-date groups — never in a separate top block** — `renderPipe` MUST merge `PIPE_Q1.concat(UNASSIGNED_DEALS)` into a single sorted array before building month groups. Unassigned deals render in the same `<tr>` format as assigned deals, within each calendar month group sorted by `closeDate`. The AE column for unassigned deals shows amber `⚠ Unassigned` text. Each month-group header shows an amber `⚠ N unassigned` count badge when that month contains unassigned deals. The previous pattern (rendering a separate amber "Unassigned Deals" block before the month groups) is RETIRED — it was confusing because close-date context was lost (managers couldn't see which month a deal was supposed to close). The canonical `renderPipe` merge pattern: `var allRows=PIPE_Q1.concat(ua).sort(function(a,b){if(a.closeDate!==b.closeDate)return a.closeDate<b.closeDate?-1:1;return (b.nnacv||0)-(a.nnacv||0);});` — all rows then grouped by `closeDate.substring(0,7)`. The `renderUnassigned` function stub remains in Section B for backward compatibility but is a no-op — all unassigned rendering is handled inside `renderPipe`. This is a deploy quality fail if unassigned deals appear in a separate block above the month groups.

61. **Forward quarter tab labels and stat card headers MUST use real quarter names from `_QTR_META` — never generic "Fwd Q1/Q2/Q3"** — The `_QTR_META` object in the DSZ MUST include both the top-level label keys (`q2Label`, `q3Label`, `q4Label`) AND sub-objects for `q2`, `q3`, `q4` with `label` and `trigger` fields: `"q2": {"label": "Q3 FY2026", "trigger": "ANZ FSI Q3 FY2026 pipeline"}`. The `runQtrReport(q)` function accesses `_QTR_META[q].label` — without the sub-objects, it gets `undefined` and the Run button fails silently. DOMContentLoaded MUST also set all forward quarter UI labels dynamically from `_QTR_META`: tab buttons (`tab-q2/q3/q4`), stat card headers (`sc-lbl-q2/q3/q4`), pane titles (`q2/q3/q4-prompt-title`), and pane meta dates (`q2/q3/q4-prompt-meta`). Any static HTML showing "Fwd Q1/Q2/Q3 Pipeline" or "FWD Q2/Q3/Q4" is a deploy quality fail — managers see real quarter names, never internal index labels. Root cause of the 2026-03-30 label bug: `_QTR_META` was missing the `q2/q3/q4` sub-objects, so `runQtrReport` returned immediately on `if(!meta)return` for every forward quarter.

56. **Next steps MUST surface inline in AE stack deal tiles, not only in the modal Status tab** — Confirmed 2026-03-29 (Image 2): The MMSG deal (Simon Kobakian, Stage 6, $133K) showed "No Next Steps recorded in Dynamics" in the AE stack deal card, even though the modal correctly suggested the LPO milestone. The deal card in `switchAEDealTab` / `toggleAEDealCard` renders the deal row but does not inline `d.nextSteps`. MANDATORY fix: the deal card builder in `renderAE` (and any AE modal deal-list renderer) MUST include a next steps row below the stage/NNACV line when `d.nextSteps` is non-empty. Format: a thin left-bordered block (wasabi green, 2px) showing "Next Steps" label + up to 200 chars of `d.nextSteps` + days-since-update badge (amber if > 7 days). This makes the AE card self-contained — the manager can see what's happening on a deal without opening the hygiene modal. This is a deploy quality fail if omitted on any deal card renderer.

53. **Call 1e (partner-account supplement) is MANDATORY every run — never optional** — Confirmed 2026-03-29: 5 ANZ FSI deals worth $170,780 (Infosys-Bupa x2 $161K, AMP Services $7.7K, Mobilise IT $1.8K, Infosys-Westpac $0) were missing from the dashboard because their `territory_district` field was not populated with `ANZ FSI` in Snowflake. These accounts are assigned to the territory in Dynamics and appear in PowerBI. The root cause is that partner-owned accounts (accounts where the Dynamics account record is under a partner entity, e.g. "Infosys - Bupa Australia") and non-standard FSI accounts are sometimes tagged with `territory_name` but not `territory_district`. Call 1e runs the same monthly-window queries against `territory_name ILIKE` (the broader field) to capture these deals, then the PD #20 dedup guard ensures no double-counting. This pattern applies for ANY territory — not just ANZ FSI. New territories may have different partner structures, but the `territory_name` supplemental queries will always be more inclusive than `territory_district` alone. Never skip Call 1e to save query time — $170K+ of pipeline is not acceptable to miss. The same `territory_name` broadening applies to Call 2a (Closed Won) and Call 2b (Closed Lost) — see those sections.

50. **Call 1d (blank-AE supplement) is MANDATORY — unassigned deals MUST be included in pipeline totals** — Confirmed 2026-03-29: 17 ANZ FSI deals worth $7.81M had blank `parent_opportunity_sales_rep_name` in Dynamics. These deals have valid `territory_district` values but were crowded out of the territory-filter monthly queries by the row cap. Without Call 1d, $7.81M of real pipeline was silently excluded. Fix: Call 1d fires in parallel with M1/M2/M3 and Call 1e, targeting blank/null AE on the full quarter date range (the blank-AE result set is small enough that a single query suffices). All result sets merge into the same `opty_map`. `total_pipe_all` = sum of ALL deals (assigned + unassigned). Call 1e (NNR #53) also runs in parallel — together they ensure complete pipeline coverage.

 — not always a query bug** — Confirmed on 2026-03-29 for ANZ FSI: Graham Rothwell and Paul Christoforatos had no deals surface in Snowflake because their territory assignments were not yet set in Dynamics. A new Macquarie AE starting May 2026 will also be invisible until their territory is configured. These are backend data-quality issues, not skill bugs. When the manager confirms a gap is due to missing territory assignments (rather than Snowflake truncation): (1) proceed with the data that IS visible, (2) render an amber data-quality banner in the dashboard header explaining the gap and naming the affected AEs, (3) do NOT re-query — more queries will not surface deals that aren't assigned to the territory. The skill will automatically pick up these AEs and their deals as soon as territory assignments are fixed in Dynamics/Snowflake, because: (a) Call H queries `GTM_ACCOUNT_INDEX_TARGETING` for direct reports of the manager — new AEs appear there automatically once added; (b) `territory_district ILIKE` filter picks up newly assigned deals without any skill changes; (c) AE assignment is pure Snowflake (`parent_opportunity_sales_rep_name`) — no hardcoded maps to update. Zero skill changes required when backend is fixed.

48. **⚠️ SUPERSEDED BY NNR #35 (v10.6)** — Prior versions of this rule instructed queries to say "return each row separately — do NOT group or aggregate by NNACV". This was intended to force Cortex to return raw SKU rows for Python-side summation. It was confirmed on 2026-03-29 that Cortex aggregates internally regardless of this instruction, then repeats a single row thousands of times, causing silent truncation (`result_set_truncated: true`). **The correct fix — now mandated by NNR #35 — is the opposite:** explicitly ask for `SUM(nnacv_usd_cfx) GROUP BY opportunity_number` so Cortex returns one pre-aggregated row per opportunity. Snowflake's SUM is the validated number; Python Step 5 dedup (PD #20) still handles cross-result-set overlap. Do not revert to "raw SKU rows" phrasing — it is now permanently banned by NNR #35.

 — split-window is the only valid pattern** — Locked in v9.7 (2026-03-29), upgraded to monthly windows in v11.0 (2026-03-29). Any future attempt to run a single `close_date BETWEEN CQ_START AND CQ_END` query for Call 1 is a deploy blocker regardless of territory or quarter. The minimum safe pattern is THREE monthly sub-queries (M1/M2/M3) + Call 1d (blank-AE) + Call 1e monthly supplement (partner-account). See NNR #42, #51, #52, #53 and the Call 1 spec above.

 (3 sub-queries per quarter) — single full-quarter query is PERMANENTLY BANNED** — Root cause confirmed on 2026-03-29: Snowflake Cortex silently truncated the full Q2 FY2026 pipeline query, returning $3.94M of $11.98M (Dynamics). The truncation is silent — no error, no warning, all range checks pass. The ONLY prevention is to never issue a single full-quarter pipeline query. MANDATORY pattern for every run: Sub-queries M1/M2/M3 (one per calendar month) parsed through the same `opty_map` with PD #20 deduplication. Additionally, after Step 9, Claude MUST surface the computed net NNACV total and ask the manager: *"Does $X.XXM match your Dynamics/PowerBI total?"* — this is the final catch for any residual truncation or partner-account gap. >10% gap = investigate with Call 1e and Call 1d; re-query with individual weekly windows if still wrong. Never auto-proceed to Step 10 on a mismatch.

46. **`safeAeName` MUST be defined in every function that uses it — it is NOT global** — `safeAeName=ae.n.replace(/'/g,"\\'").replace(/"/g,"&quot;")` must be declared as a local `var` inside every `forEach` loop that builds HTML with email/copy-brief button onclick handlers referencing AE names. Defining it in `renderCoach` does not make it available in `renderAE` — they are separate function scopes. A missing `var safeAeName` in any render function that injects AE name into onclick HTML will throw `ReferenceError: safeAeName is not defined` on DOMContentLoaded, silently crashing all render functions and leaving the dashboard blank. This is validated by the mandatory node execution simulation in Step 9.

 — never at script-execute time** — The three overlay close listeners (`dealModal`, `hg-overlay`, `aeModal`) must be registered inside a `document.addEventListener("DOMContentLoaded",...)` block with null guards (`if(_dm)_dm.addEventListener(...)`). Bare calls at script-execute time return `null` on mobile before the DOM renders, throwing `"Uncaught Error: Script error."` and crashing the entire script — leaving the dashboard blank at "Loading...". This is a deploy blocker if detected.

45. **`renderTerrSummary` MUST check `ts.nnacv` not `ts.totalPipe`** — `TERR_SUMMARY.nnacv` is the canonical pipeline total field written by Step 5. The legacy `ts.totalPipe` field does not exist in the current data model. Guard must be `if(!ts||(ts.nnacv==null&&ts.totalPipe==null))return` with `var _tsNnacv=ts.nnacv!=null?ts.nnacv:ts.totalPipe` for backward compatibility. All render lines in the function body must use `_tsNnacv`, never `ts.nnacv` or `ts.totalPipe` directly. A wrong guard causes the territory health bar to never render and pipeline totals to stay blank.

 — The email/copy-brief button pair must be present in: (1) `renderCoach` coaching tab card header, (2) `renderAE` stack rank card footer (after `coachNarrative`), (3) AE modal header (static HTML — `ae-modal-hdr` close button replaced with a flex row containing both buttons + close), (4) Forecast Hygiene modal footer (below CRM link, only when `d.ae !== "Unassigned"`). `draftEmailToAE` MUST search `PIPE_Q1.concat(UNASSIGNED_DEALS)` for its top-deal summary. Missing email button in any of these four surfaces = deploy quality fail.




### Fix History (v1.0–v16.9)

> 21 fixes documented. Moved to `SSC_CHANGELOG.md` during v17.0 hardening.

## DATA VALIDATION MANIFEST

Printed by Python pipeline on every run. Format:

```
✅ Validation passed: N CQ deals | N closed won | N closed lost | net $XM won | true net $XM | N AEs | N stale-stage deals
✅ num uniqueness: 0 duplicate keys across N deals
✅ nextSteps: N stage-gate values stripped, N real AE commentary preserved
```

If any mandatory check fails, the script raises `SystemExit` with a `FAIL:` error list.
**Deploy is blocked until all checks pass.**

Mandatory checks:
- `PIPE_Q1` non-empty
- All deal close dates within CQ window
- All deals have `nowsell: null` (not a dict) — Prime Directive #17
- All deals have `dtc`, `flags`, `forecastCheck`
- All AEs have `n` (string), `coverage`, `pacingPct`, `nsGap`, `deals` (int)
- `QUOTA_DEFAULTS` is a dict keyed by ae.n strings — Prime Directive #16
- SCRIPT has 6–12 lines
- **Zero duplicate `num` keys** — Prime Directive #14
- nextSteps coverage ≥ 20% (if not, Call 1b must have run) — Prime Directive #19
- If quarter started and `all(a['won']==0)` → FAIL (CW query failed)

---

## FUNCTION CHECKLIST (40 required — validated by name, not count)

⚠️ **Step 9 now validates each function by name** — a count-only gate can pass even when a critical function is missing. The named list below is the ground truth.

```
renderPipe · renderWon · renderAE · renderCoach · renderHygiene
renderAtRisk · renderTerrSummary · copyCoachBrief · draftEmailToAE
openModal · closeModal · switchModalTab
openAEModal · closeAEModal · switchAETab · switchAEDealTab · toggleAEDealCard
openHygieneModal · closeHygieneModal
openBadgeCoach · closeBadgeCoach
_wtdForAE · _hgModal · _pipeFilter · _pipeFilterClear
openQuotaModal · closeQuotaModal · saveQuotas · resetQuotas · _liveCoverage · _getQuota
showDtcExplainer · _closeDtcPop
switchTab · playWR · stopWR · _wrInitCompat · runQtrReport · showQtrInstructions · copyTrigger
```

**Verification (run as part of Step 9 — named validation):**
```python
REQUIRED_FUNCTIONS = [
    'renderPipe','renderWon','renderAE','renderCoach','renderHygiene',
    'renderAtRisk','renderUnassigned','renderTerrSummary','copyCoachBrief','draftEmailToAE',
    'openModal','closeModal','switchModalTab',
    'openAEModal','closeAEModal','switchAETab','switchAEDealTab','toggleAEDealCard',
    'openHygieneModal','closeHygieneModal',
    'openBadgeCoach','closeBadgeCoach',
    '_wtdForAE','_hgModal','_pipeFilter','_pipeFilterClear',
    'openQuotaModal','closeQuotaModal','saveQuotas','resetQuotas',
    '_liveCoverage','_getQuota',
    'showDtcExplainer','_closeDtcPop',
    'switchTab','playWR','stopWR','_wrInitCompat','runQtrReport','showQtrInstructions','copyTrigger',
]
missing = [fn for fn in REQUIRED_FUNCTIONS if f'function {fn}' not in html]
assert not missing, f'FAIL: missing functions: {missing}'
print(f'PASS — all {len(REQUIRED_FUNCTIONS)} required functions present')
```

---

## PORTABILITY RULES

This skill is territory-neutral. Every reference to a specific territory, AE name, or region must come from Snowflake detection — never from hardcoded values.

Portable-safe checklist:
- ✅ `DETECTED_TERRITORY` drives all Snowflake filters
- ✅ `TERRITORY_FILTER_OPEN` (`territory_district`) ≠ `TERRITORY_FILTER_CLOSED` (`territory_name`)
- ✅ AE roster built from **Call H** (Step 0 Stage 4) — H1 quota table + H2/H3 account targeting — confirmed by manager before Step 5. This works for any territory worldwide.
- ✅ `KNOWN_AES` is populated from `CONFIRMED_AES` (Call H result) for all territories. The hardcoded ANZ FSI list is a **last-resort fallback only** when Call H returns zero rows AND territory is ANZ FSI.
- ✅ `USER_QUOTAS` populated from `GTM_SALES_REP_QUOTA.QUOTA_REP_USD` via Call H1 — no manual entry required when quota data exists for the territory/quarter.
- ⚠️ `AE_SEGMENT` focus descriptions (e.g. 'NAB-only', 'Westpac-only') are ANZ FSI knowledge — for other territories, `CONFIRMED_SEGMENTS` from the manager supersedes these. Coaching quality degrades gracefully (falls back to 'multi-account') if segment info is not provided.
- ✅ `EXCLUDE_NAMES` derived from `MANAGER_NAME` — always live-wired, never hardcoded
- ✅ `QUOTA_DEFAULTS` keyed by actual Snowflake AE names — no hardcoded names
- ✅ `SESSION_KEY` namespaces all temp files — concurrent multi-manager use is safe
- ✅ localStorage key uses `{CQ_LABEL_SAFE}` — unique per territory/quarter
- ✅ All War Room text references `{TERRITORY}` variable, never a hardcoded region
- ✅ HTML title and header derive territory label from `_QTR_META` at runtime
- ✅ Forward quarter triggers use `'my pipeline {LABEL}'` pattern — always works

---

## SECTION A

> **v17.0:** Extracted to standalone file `ssc_section_a.html` (42,301 chars).
> The standalone file is the Tier 1 source for shell loading. See Step 6.
> If you need the full HTML/CSS template, read `ssc_section_a.html` directly.

## DATA SWAP ZONE TEMPLATE

```html
<script>
// ============================================================
// DATA SWAP ZONE — {CQ_LABEL} | {TERRITORY}
// Generated: {TODAY} | ServiceNow Sales Command Centre v16.7
// ⚠️ PD #16: Variable names below are CANONICAL — never rename them.
//    Section B uses: WON_CQ, CLOSED_LOST, AE_DATA (with ae.n field)
//    Using CLOSED_WON or CL_DEALS instead causes ReferenceError.
// ⚠️ PD #17: PIPE_Q1[*].nowsell must be null (never a pre-filled object).
// ⚠️ PD #18: AE_DATA[*].deals must be an integer count (never an array).
// ⚠️ PD #19: If nextSteps blank on >80% of deals, run Call 1b before deploy.
// ============================================================

var PIPE_Q1    = /* ██ SWAP: pipe_js ██ */ [];
var WON_CQ     = /* ██ SWAP: won_js ██ */ [];
var CLOSED_LOST= /* ██ SWAP: cl_js ██ */ [];
var AE_DATA    = /* ██ SWAP: ae_js ██ */ [];

var QUOTA_DEFAULTS = /* ██ SWAP: quota_js ██ */ {};
var QUOTA_MAP = (function(){
  try { var saved=localStorage.getItem("sn_scc_quotas_{CQ_LABEL_SAFE}");if(saved)return JSON.parse(saved); }
  catch(e){}
  return JSON.parse(JSON.stringify(QUOTA_DEFAULTS));
})();
function _getQuota(n){ return QUOTA_MAP[n]||1500000; }

var _QTR_META  = /* ██ SWAP: qtr_meta_js ██ */ {};
var _QTR_STATS = /* ██ SWAP: qtr_stats_js ██ */ {};

var SCRIPT = /* ██ SWAP: script_js ██ */ [];
var MKEYS  = ["DIS","TV","BC","MP","COM","LPO"];

// ============================================================
// END DATA SWAP ZONE
<!-- @@DATA_SWAP_ZONE@@ -->
```

---

## SECTION B

> **v17.0:** Extracted to standalone file `ssc_section_b.js` (125,223 chars, 41+ functions).
> The standalone file is the Tier 1 source for shell loading. See Step 6.
> If you need the full JS, read `ssc_section_b.js` directly.

## POSTMORTEM ARCHIVE — Automated Rules (v17.0 Hardened)

> These rules were active PDs in v16.x. As of v17.0, they are **automatically enforced** by `build_dsz()`, standalone file loading, error boundaries, and Step 5 code guards. They are retained here for historical context and debugging reference. **Do not move these back to the Active Rules section** — the code enforces them without Claude's involvement.

<details>
<summary>PD 10–12: Shell loading (superseded by H1 standalone files)</summary>

- **PD 10** — Persistent shell is the ONLY shell source — use `SHELL_PATH` (session-namespaced). Load it first, fall back to legacy path, then SKILL.md extraction.
- **PD 11** — NO external font requests — system fonts only. CSS font vars use system stacks: `--font:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;`.
- **PD 12** — Shell extraction from SKILL.md is byte-position only — no regex. Superseded by Tier 1 standalone file loading.

</details>

<details>
<summary>PD 14–22: Data shape rules (enforced by build_dsz and Step 5)</summary>

- **PD 14** — Deal `num` keys must be globally unique. Step 5 appends `_1`, `_2` to resolve collisions.
- **PD 15** — `nextSteps` must contain AE free-text, not CRM stage values. Step 5 strips STAGE_GATE_VALUES.
- **PD 16** — DSZ uses `var` (not `const`/`let`) and exact variable names (`WON_CQ`, `CLOSED_LOST`, `ae.n`). Enforced by `build_dsz()`.
- **PD 17** — `nowsell` in PIPE_Q1 must be `null`. `build_dsz()` asserts this.
- **PD 18** — `ae.deals` must be int count, not array. `build_dsz()` asserts this.
- **PD 19** — Call 1b (next steps) is unconditional — fires every run. Enforced by execution flow.
- **PD 20** — NNACV accumulated as SUM within result set, never doubled across sets. Step 5 `_source_set` tracking.
- **PD 21** — `@@DATA_SWAP_ZONE@@` placeholder sits INSIDE `<script>` block. Shell construction enforces.
- **PD 22** — QUOTA_MAP IIFE + `_getQuota` function included in DSZ. `build_dsz()` includes automatically.

</details>

<details>
<summary>PD 24–26, 28–30, 32–40: Validation and session rules (code-enforced)</summary>

- **PD 24** — `_QTR_META.q1Label = CQ_LABEL`. `build_dsz()` asserts present.
- **PD 25** — Monthly split-window M1/M2/M3 prevents Cortex row-cap truncation.
- **PD 26** — Next Steps must surface in STATUS tab. Step 5 coverage assert.
- **PD 28** — Shell validated before use — deployed files rejected (no placeholder). Step 6 code.
- **PD 29** — Call H resolves AE roster from Snowflake. Step 0 code.
- **PD 30** — Session namespacing — all temp files use SESSION_KEY prefix. Step 5 code.
- **PD 32** — NNACV regression check. Step 5 asserts OPTY2549840 > $4M (ANZ FSI) + total > $5M.
- **PD 33** — `AE_DATA` includes both `name` and `n` fields. `build_dsz()` asserts.
- **PD 34** — `_QTR_META` includes flat keys AND `q2/q3/q4` sub-objects. `build_dsz()` asserts.
- **PD 35** — AE enrichment loop injected in DOMContentLoaded before `renderAE()`. `build_dsz()` includes.
- **PD 36** — `SCRIPT` entries are `{text, seq}` objects. `build_dsz()` asserts.
- **PD 37** — Step 3 forward quarter queries mandatory. Execution flow.
- **PD 38** — Forward `_QTR_STATS` never carries CQ data. Code guard.
- **PD 39** — Call 1b mandatory when coverage < 20%. Execution flow.
- **PD 40** — PIPE_Q1 uses `closeDate` not `close`. `build_dsz()` asserts.

</details>

---

## CHANGELOG

> **v17.0:** Full changelog (v1.0–v16.9) moved to `SSC_CHANGELOG.md` during hardening.
> See that file for version history, root cause analysis, and fix details.
