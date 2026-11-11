# Recall record checks

Checked 11 November 2026. These checks show missing evidence. They do not decide whether food is safe, decide a recall, certify compliance, notify anyone or close a regulator's case. The business's food safety lead and relevant authority retain those responsibilities.

## Australia

[FSANZ food recall requirements](https://www.foodstandards.gov.au/business/food-recalls) explains the written recall system requirement for manufacturers, wholesalers and importers under Standard 3.2.2. The plan needs responsibilities, contacts, product identifiers, retrieval arrangements and quantity records. Keep the real plan and evidence in your controlled document store.

[FSANZ recall templates](https://www.foodstandards.gov.au/food-recalls/recalltemplates) specifies direct-recipient details and evidence of notification. It describes interim reporting two weeks after action and final reporting four weeks after action. Our dates use the operator's action date, not the date a database row was inserted. Confirm dates with the coordinator. Generated HTML is a working record, not the authority's submission form or an approved public recall notice.

[Food Industry Recall Protocol](https://www.foodstandards.gov.au/food-recalls/firp) explains the response process. Record the actual scope and decision made by the food safety lead. Do not wait for this software to send a warning: it never sends anything.

## New Zealand

[MPI step-by-step recall guidance](https://www.mpi.govt.nz/dmsdocument/50719/direct) describes reconciliation of produced or imported quantities, on-hold stock, samples, returns and unaccounted quantities. Keep correspondence and the assessed product scope. Australian reporting deadlines are never applied to NZ records. Agree reporting dates and actions with your case officer.

## Implemented rules

| Rule | What is checked | Basis |
|---|---|---|
| PLAN-MISSING | No current plan reference for the recall jurisdiction | Written plan requirement above. The next review date is a local policy, not a statutory annual interval. |
| CONTACT-GAP | Recipient lacks contact, phone or address evidence | FSANZ direct-recipient list. Corrections are appended and the original snapshot is retained. |
| NOTIFY-EVIDENCE | No recorded notification evidence for a recipient | FSANZ notification records. The operator records an actual communication, never a scheduled message. |
| ACK-EVIDENCE | No recorded recipient acknowledgement | FSANZ confirmation guidance and local exercise controls. |
| RESPONSE-OVERDUE | The operator's follow-up date passed with unresolved quantities or acknowledgement | Local policy. No statutory response interval is implied. |
| AU-INTERIM | No interim report reference after the two-week point | FSANZ post-recall report guidance. Exercises use the same cadence for practice. |
| AU-FINAL | No final report reference after the four-week point | FSANZ post-recall report guidance. |
| Quantity controls | Distribution cannot exceed the entered lot balance. Recovery cannot exceed distribution. Units remain separate. | Local integrity controls supporting reconciliation. |
| Closure | All recipient quantities accounted for, notifications and acknowledgements recorded, checks clear, reviewer and decision reference supplied. AU also needs a final report reference. | Local closure policy. A database closure is not an authority decision or a declaration that food is safe. |

The free base tracks direct distribution of finished lots. It does not calculate ingredient transformations, downstream redistribution, allergens, food risk or FSMA 204 compliance. Confirm scope independently. A clean list is not proof of completeness: it cannot identify records omitted from an export.

Returned, destroyed and consumed quantities are separate dispositions of the originally distributed stock. Record a returned quantity once. Later destruction of that returned stock is a note with an evidence reference, not a second recovery. Consumed stock is accounted for but is never labelled recovered. On-site held stock, samples and undistributed stock remain visible in the report and require operator review.

Evidence references identify records in your controlled store. This repository does not copy attachments or validate that a reference is authentic. Back up that store alongside the database. Database owners can change database controls and audit history. This is not an independently certified evidence archive.
