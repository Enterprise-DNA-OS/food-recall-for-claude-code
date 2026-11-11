# Food Recall for Claude Code

Finished batches, direct recipients, recall evidence and stock reconciliation in a database you own. Free MIT-licensed software from Enterprise DNA. Works with Claude Code, Codex, OpenCode or Cursor.

| Do it yourself | We customise it | We run it for you |
|---|---|---|
| Clone, install and own it. [Quick start](#quick-start). | Your stock units, contact rules, reports and FoodLogiQ exports mapped across. [Get your version built](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=foodlogiq). | Installed, connected and operated through Omni by Enterprise DNA. One setup fee, then a retainer. [Book a call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=foodlogiq). |

## What it does

Follow a finished lot to its direct recipients, record actual notification and acknowledgement evidence, reconcile quantities and prepare the coordinator's working documents. Keep an exercise separate from a live recall. Find missing contact evidence, overdue follow-ups and missing reports before the review ends.

This replaces the records and review work inside a FoodLogiQ recall process. It does not replace the whole Trustwell suite, the supplier network, ingredient genealogy, mobile capture or emergency notification channels. Food safety decisions stay with the business and its relevant authority. Not affiliated with or endorsed by Trustwell or FoodLogiQ.

## Quick start

Node 20 or later. A disposable demo needs no account or server.

~~~bash
git clone https://github.com/Enterprise-DNA-OS/food-recall-for-claude-code.git
cd food-recall-for-claude-code
npm install
npm test
npm run demo
npm run recall -- recall-round
npm run view
npm run docs
~~~

The seed is idempotent and uses fictional records with relative dates. There is an overdue exercise, missing contact evidence and an expired local plan review. Never seed a production database. For Postgres, migrate an empty database and use seed only with --demo-database in a disposable environment.

DATABASE_URL chooses Postgres. Without it, embedded PGlite stores records under .data/db or DATA_DIR. No extensions are needed. Hosted anonymous access is blocked by row security and privilege revocation. A shared deployment needs trusted operators, an access design, backups and controlled evidence storage. This is not a multi-user authorisation service.

Open the folder in your coding agent. Ask for the recall round. AGENTS.md routes every runtime to the same CLAUDE.md and .claude/commands library.

## Commands

The one CLI is npm run recall -- followed by the command. Add --json for machine-readable results. References accept case-insensitive exact codes, unique prefixes, IDs and unique name fragments. Ambiguous references list candidates and exit 1. The command recipes document all required inputs.

| Recipe | Job |
|---|---|
| /products | Read the packaged products and the unit used for each quantity. |
| /locations | Read the direct-recipient contact directory. |
| /lots | Reconcile production, on-site holds, samples and recorded distribution by batch. |
| /shipments | Read the dated distribution history and its source references. |
| /recalls | Read the open and closed recalls, including whether each is an exercise. |
| /recall-round | Run the coordinator round: scope, recipients, acknowledgement and unaccounted quantities. |
| /recovery-balance | Compare distributed, returned, destroyed, consumed and unaccounted stock by recipient and batch. |
| /unacknowledged | Find direct recipients without acknowledgement evidence. |
| /overdue-response | Find follow-up work past the operator-assigned date. |
| /contact-gaps | Find recipient contact details that still need verification. |
| /distribution-list | Read the recall contact list with appended contact verifications. |
| /owner-workload | Count unresolved record checks by responsible owner. |
| /report-deadlines | Review the Australian interim and final reporting dates. Exercises use the same practice cadence. |
| /stale-plans | Find plan references past their locally chosen review date. |
| /plans | Read the recall plan revision references and their owners. |
| /attention | Read every open record check before the daily round ends. |
| /compliance | Check recall evidence against the cited guidance and local rules in docs/compliance.md. |
| /import-history | Read source hashes, import counts and dates. |
| /audit | Read the append-only change history and named actors. |
| /reports | Read the recorded interim and final report references. |
| /notes | Read the coordinator notes in time order. |
| /add-product | Record a product with its actual quantity unit. |
| /add-location | Record a direct recipient with verified contact details. |
| /add-lot | Record a reviewed finished-lot balance from production or stock records. |
| /ship | Record an actual shipment of one batch to one recipient. |
| /start | Record a recall or exercise already scoped by the responsible food safety lead. |
| /scope | Add another reviewed batch to an open event. The command snapshots its direct recipients. |
| /verify-contact | Append verified contact details without changing the original recall snapshot. |
| /notify | Record a notification that already happened through the operator's communication process. This command sends nothing. |
| /acknowledge | Record an actual recipient acknowledgement and its evidence. |
| /recover | Record one quantity disposition from an actual stock reconciliation. |
| /report | Record an interim or final report already reviewed or lodged by the operator. |
| /plan | Append a reviewed plan revision and its local review date. |
| /log | Append an operational note without changing the original records. |
| /close | Record the responsible person's reviewed closure decision. It does not declare food safe or close a regulator case. |
| /trace-lot | Find every recorded direct destination of a lot. |
| /trace-destination | Find every batch recorded as supplied to one destination. |
| /recall | Read one complete event before writing any new record. |
| /weekly-review | Prepare the Monday exercise and recall review from recall-round, attention and report-deadlines. It writes a draft HTML report. |
| /draft-notice | Draft a factual distribution and scope brief. Use the regulator-approved template and a human review for any actual notice. Nothing sends. |
| /draft-reconciliation | Draft the batch-by-recipient quantity reconciliation. Keep consumed separate from recovered and review on-site stock. |
| /import | Import reviewed FoodLogiQ export sheets with explicit column mapping. Read docs/replace-foodlogiq.md first. Run a dry run, compare the result, then apply the same mapped import. |
| /export | Write every record and source row to a new private archive directory. It is a data archive, not a database restore. |
| /customise | Add a field, workflow or review rule with a migration and a test. |
| /new-view | Add a branded read-only report for a decision the operator makes. |

## Ten questions to ask

These combine your local records and your own follow-up rules. They are executable questions, not a claim that FoodLogiQ cannot provide similar reports.

1. Which recipients still have no acknowledgement evidence? `unacknowledged`
2. How much stock remains unaccounted for at each destination? `recovery-balance`
3. Which overdue follow-ups belong to the same coordinator? `overdue-response`
4. Which current recall contacts still need verification? `contact-gaps`
5. Where did this finished batch go? `trace-lot DEMO-BATCH-A`
6. Which batches went to one destination? `trace-destination DEMO-NORTH`
7. How much of each batch was held, sampled or left undistributed? `lots`
8. Which Australian exercise reports are due or missing? `report-deadlines`
9. Which plan references are past their own review date? `stale-plans`
10. Which coordinator has the most unresolved record checks? `owner-workload`

## Your first hour: ten things to ask for

1. Put our business name, colours and logo in brand.json.
2. Map one FoodLogiQ investigation export and preserve its original archive.
3. Add our verified lot balances from production records.
4. Compare one batch's distribution with the original delivery records.
5. Verify the phone and address of each direct recipient.
6. Record our current recall plan reference and review date.
7. Run an exercise for one finished batch.
8. Record one actual practice acknowledgement and stock reconciliation.
9. Produce the working distribution list and review its gaps.
10. Configure a shared database, controlled evidence storage and tested backups.

## Switching

[Bring FoodLogiQ records across](docs/replace-foodlogiq.md) explains the vendor's documented spreadsheet export, the required mapping and the lot balances the operator must supply. A reviewed CSV/XLSX bundle loads in one command. Dry runs roll back, repeated identical imports skip and conflicting identifiers fail without partial writes. Raw rows and mapping evidence stay in the database. The fixture is fictional, not an authenticated vendor export.

## Records and limits

[Record checks](docs/compliance.md) cites Australian and New Zealand guidance and labels local rules. Quantity controls reject excess distribution and excess recovery. Returned, destroyed and consumed amounts are separate. Consumed is accounted for but not recovered. Do not count later destruction of already returned stock twice.

Starting an event snapshots direct-recipient details. Contact corrections are appended. Communication and recovery history is immutable through the application. Closure requires reconciled recipients, communication evidence, clear checks and a named reviewer with a decision reference. Australian events also require a final report reference under local closure policy. Closing a record does not close a regulator's case or declare food safe.

Evidence references point to records kept outside this repository. No attachment is copied or authenticated. Back up the evidence store with the database. A database owner can alter the records and audit controls. Whole-system recovery uses a tested database backup, not the portable JSON archive alone.

## Documents and views

npm run docs renders a branded recall working report and distribution list per event. They are draft working documents for the operator, not regulator-approved notices. npm run view renders the weekly review and recipient follow-up. Each is read-only HTML with the business name, colours and optional logo from brand.json. Nothing sends. [Why no front end](docs/why-no-front-end.md) describes capture and notification work that needs a custom implementation.

## Tests

npm test uses a temporary database and output directory. It applies migrations and seeds twice, exercises every CLI operation, validates CSV/XLSX mapping, rollback, duplicate imports, quantity and closure controls, contact corrections, ambiguity, JSON exports and rendered documents. Windows and Linux CI run the same tests on Node 20 and 22. PostgreSQL 16 has a separate CI job.

## Installed for you

Enterprise DNA builds and operates your version through Omni by Enterprise DNA. Your records, your recall plan and your reporting rules. One setup fee, then a retainer. [Book Sam's 30-minute call](https://enterprisedna.co/omni/book/?offer=replace-software&utm_source=github&utm_campaign=foodlogiq).

## Licence

MIT. Copyright 2026 Enterprise DNA.
