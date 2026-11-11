# add-lot

Record a reviewed finished-lot balance from production or stock records.

Read the relevant product, lot or recall first. Resolve unique references using the CLI. If a reference is ambiguous, show the candidates and ask the operator to identify the record. Use only facts supplied by the operator or evidenced in the source.

~~~bash
npm run recall -- add-lot --code=BATCH --product=PRODUCT --supplier="Supplier" --date-mark=YYYY-MM-DD --quantity=100 --held=10 --samples=1 --reference="Production record" --actor="Operator name"
~~~

Replace every placeholder with verified values. Do not use the sample quantities as real stock. An exercise must stay marked exercise. Run the relevant read again and show the recorded result.

Recovery dispositions are returned, destroyed or consumed. Count each distributed quantity only once. A later disposal of already returned stock is a note, not another recovery. Notification commands record actual communications and never send. A closure needs clear record checks and the named person's decision evidence. Never make a safety decision for them.
