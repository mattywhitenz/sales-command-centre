# ServiceNow Sales Command Centre

**Coaching-first HTML pipeline dashboard skill for Claude.ai**

**Author:** Grant Thomson — ANZ FSI, ServiceNow
**Version:** v17.0 (Hardened)
**Updated:** 2026-03-31

---

## What is this?

A Claude.ai skill that generates an interactive HTML sales pipeline dashboard from Snowflake data. Designed for ServiceNow sales managers who need deal-level coaching insights, NowSell milestone tracking, and territory health at a glance.

### Key features

- **Pipeline table** — grouped by close month, with net NNACV, probability, NowSell badges, forecast checks
- **AE Stack Rank** — coverage ratios, pacing, risk flags, deal-aware coaching narratives
- **Coaching tab** — account-specific actions with NowSell milestone gaps and RACI ownership
- **War Room** — auto-generated territory briefing script for weekly pipeline calls
- **Forward quarters** — Q+1/Q+2/Q+3 pipeline stats from live Snowflake queries
- **Forecast hygiene** — per-deal modal with milestone evidence, next steps, and CRM deep links

## Installation

Download HERE: https://github.com/mattywhitenz/sales-command-centre/archive/refs/tags/release.zip

Upload these 3 files to your Claude.ai skill directory (`/mnt/skills/user/servicenow-sales-command-centre/`):

```
SKILL.md              — the skill definition (v17.0 hardened)
ssc_section_a.html    — standalone HTML/CSS template (42KB)
ssc_section_b.js      — standalone JS with error boundary (125KB)
```

Then type any trigger phrase in Claude.ai:
- `"sales q2"` / `"sales q1"` / `"sales q3"` / `"sales q4"`
- `"my pipeline"` / `"command centre"` / `"war room"`
- `"coaching dashboard"` / `"build dashboard"`

## v17.0 Hardening changes

| # | Change | Impact |
|---|--------|--------|
| H1 | Standalone Section A + B files | Eliminates shell extraction crashes |
| H2 | Client-side error boundary | Blank dashboards → visible error panel with auto-diagnosis |
| H3 | `build_dsz()` function | 10 data-shape rules auto-enforced; DSZ injection errors eliminated |
| H4 | Consolidated rules | 47 PDs → 20 active (scannable table) + 27 automated (archived) |
| H5 | `validate_ds_path()` function | Single call checks 18 invariants; shows ALL errors at once |
| H6 | System fonts only | Zero external requests; no render-blocking in sandbox |
| H7 | File size reduction | 503KB → 225KB (55% reduction) |

See [HARDENING_PROGRESS.md](HARDENING_PROGRESS.md) for the full audit trail.

## Repository contents

| File | Purpose |
|------|---------|
| `SKILL.md` | The Claude.ai skill definition — upload this |
| `ssc_section_a.html` | HTML/CSS template — upload this |
| `ssc_section_b.js` | JavaScript (41+ functions) — upload this |
| `servicenow-sales-command-centre.html` | Example deployed dashboard (reference only) |
| `SSC_CHANGELOG.md` | Full version history (v1.0–v16.9) |
| `HARDENING_PROGRESS.md` | v17.0 hardening audit trail |

## Requirements

- **Claude.ai** with skill support enabled
- **Snowflake** `Data_Analytics_Connection:account_insights` tool configured
- ServiceNow CRM data flowing into Snowflake (pipeline, quotas, engagements)

## License

Internal ServiceNow use.
