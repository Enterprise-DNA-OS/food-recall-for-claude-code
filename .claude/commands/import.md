# import

Import reviewed FoodLogiQ export sheets with explicit column mapping. Read docs/replace-foodlogiq.md first. Run a dry run, compare the result, then apply the same mapped import.

Run `npm run recall -- import foodlogiq --dir=imports/export --map=imports/export/mapping.json --actor="Operator" --dry-run`. Replace placeholders with verified records. Show returned facts and the local output path in chat. Drafts stay under drafts/ and exports under exports/. Never email, upload or publish them. For imports compare quantities, units, contacts and coverage with the original files before the actual run. For drafts, include unresolved evidence and the responsible reviewer.
