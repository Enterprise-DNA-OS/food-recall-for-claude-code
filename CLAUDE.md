# Food Recall for Claude Code

A finished-lot distribution and recall records desk. Ask the operator for their business, jurisdiction and role before replacing the fictional demo configuration.

## Rules

- Read the CLI records before answering. Never invent a contact, communication, quantity, risk assessment or approval.
- Food safety decisions, recall scope, required notifications and authority contact belong to the operator and their regulator. Do not act as the food safety lead.
- Never send, email, publish, take payments or contact a supplier, customer or regulator. Drafts are local files for review.
- Distinguish exercise records from live events in every response. Dates and quantities in the demo are fictional.
- Every mutation needs a named actor. History is append-only. Ambiguity lists candidates and exits 1.
- Read docs/compliance.md before interpreting a rule. Clear record checks do not prove a complete export or legal compliance.
- Read docs/replace-foodlogiq.md before importing. Verify scope and identifiers. Never fabricate missing lot balances or map unknown values to zero.
- Keep private imports, exports, reports and credentials out of Git. Use a restricted database operator, not an anonymous hosted connection.
- Run npm test after code changes. It uses disposable data and never inherits DATABASE_URL.
- The database owner can alter records and audit controls. Do not call the history tamper-proof.

## Recurring jobs

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

## Files

scripts/recall.mjs is the one CLI. Add --json for machines. supabase/migrations holds the schema, supabase/seed.sql the fictional demo. DATABASE_URL selects Postgres; otherwise PGlite uses DATA_DIR or .data/db. brand.json sets the name, colours and logo. views.json and documents.json use the shared read-only renderer. Source evidence remains in the operator's controlled store; references do not copy attachments.

Built and run for you through Omni by Enterprise DNA: https://enterprisedna.co/omni/instead-of/foodlogiq
