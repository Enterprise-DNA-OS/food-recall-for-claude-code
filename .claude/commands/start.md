---
description: "Record a recall or exercise already scoped by the responsible food safety lead."
---

# start

Record a recall or exercise already scoped by the responsible food safety lead.

Read the relevant product, lot or recall first. Resolve unique references using the CLI. If a reference is ambiguous, show the candidates and ask the operator to identify the record. Use only facts supplied by the operator or evidenced in the source.

~~~bash
npm run recall -- start --code=EVENT --name="Event name" --mode=exercise --jurisdiction=AU --owner="Coordinator" --reason="Operator supplied reason" --date=YYYY-MM-DD --due=YYYY-MM-DD --lots=BATCH --actor="Operator name"
~~~

Replace every placeholder with verified values. Do not use the sample quantities as real stock. An exercise must stay marked exercise. Run the relevant read again and show the recorded result.

Recovery dispositions are returned, destroyed or consumed. Count each distributed quantity only once. A later disposal of already returned stock is a note, not another recovery. Notification commands record actual communications and never send. A closure needs clear record checks and the named person's decision evidence. Never make a safety decision for them.
