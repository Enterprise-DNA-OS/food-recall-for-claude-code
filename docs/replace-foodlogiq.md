# Bring FoodLogiQ records across

The supported switch is the finished-lot distribution and recall records desk. Keep FoodLogiQ and your existing emergency communications process until a reviewed exercise proves your new scope, contacts and quantities are complete.

## Export and map

Trustwell documents [FSMA 204 Electronic Sortable Spreadsheet exports](https://www.trustwell.com/products/foodlogiq/traceability/), delivered in a ZIP with event, location and product information. Its [Spring 2023 release notes](https://blog.trustwell.com/foodlogiq-spring-2023-release) describe the same export. Export the investigation covering the selected products and dates. Retain the original ZIP unchanged, and extract it into a private import folder. CSV and XLSX are supported. XLSX cells must contain plain values, not formulas, links or rich text.

The vendor's public pages do not publish a stable set of export headings. This repository therefore requires an explicit mapping, rather than guessing what an authenticated export looks like. The fixture is fictional, not a captured vendor export. Review the source files, sheets, date formats and identifiers with the operator before using them.

Use `tests/fixtures/mapping.json` as the shape. Each of products, locations, lots and shipments declares a file, optional XLSX sheet and a mapping from the local field to an exact source heading. Different sections can use the same source file if it contains all the required fields. Repeated identical master records are accepted. Stable shipment codes must identify one lot, one destination and one event line, not an entire multi-line shipment. Preserve original event IDs in the reference field.

FoodLogiQ event exports are not assumed to prove total production. Supply a reviewed lot balance file from production or stock records with quantity, held stock and samples. Do not substitute zero for unknown stock or infer complete production from one investigation's shipments. Dates must be ISO YYYY-MM-DD, quantities nonnegative with up to three decimals and units each, kg or litre. Convert incompatible units explicitly before import and retain that mapping evidence.

```bash
npm run recall -- import foodlogiq --dir=imports/export --map=imports/export/mapping.json --actor="Recall lead" --dry-run
npm run recall -- import foodlogiq --dir=imports/export --map=imports/export/mapping.json --actor="Recall lead"
```

The second line is the one-command import after the export has been mapped and checked. It loads products, locations, reviewed lot balances and shipments in one transaction. A failure leaves no partial records. Exact file-plus-mapping reimports are skipped. Changed content with a conflicting identifier is rejected. All original mapped source rows, including extra columns, are kept in import history. No recall or notification is silently inferred from a shipping record.

## What maps

| Source | Local record | Check before accepting |
|---|---|---|
| Product identifiers, name, unit | Product | Units and identifiers match the actual packaged product. |
| Location identifiers and contact details | Direct recipient | Address, phone, country and responsible contact are current. |
| Reviewed production or stock file | Lot balance | Total, holds, samples and date mark reconcile with the source. |
| Exported shipping event lines | Shipment | Scope covers the period, line identifiers are unique, destinations and quantities agree. |

Supplier network connections, attachments, ingredient genealogy, downstream movements, mobile capture, messages, legal notices, approvals and historic withdrawal responses do not automatically transfer. Keep the source archive. Record a reviewed event through `start`, then append actual communication, recovery and report evidence using the corresponding commands. Enterprise DNA maps further history and connections as part of your version.

## Acceptance and rollback

Run `lots`, `shipments`, `trace-lot` and `trace-destination`. Compare every imported quantity by lot and destination against the source. Check contact gaps with a practice recall. Run a complete exercise before retiring the original workflow. The dry run tests database constraints but cannot prove the source export is complete.

Take a database backup before a real import. Committed history is append-only. If an import is wrong, restore the pre-import backup into a separate database, fix the mapping and reconcile again. Never edit an existing batch to make the totals appear right. Retain the erroneous archive and correction explanation under your retention policy.

`npm run recall -- export --out=review-copy` writes a complete JSON snapshot under exports/review-copy, including raw import rows, contacts, notes, source references and audit history. It never overwrites an existing export. This is a portable record archive, not a one-command database restore. Use a database backup and restore process for disaster recovery and test it before deployment.
