#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {pathToFileURL} from 'node:url';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {parseCsv} from './lib/csv.mjs';
import {table as htmlTable,page,writeOut} from './lib/render.mjs';

export const reads={
 'products':'select code,name,gtin,unit from products order by code',
 'locations':'select code,name,contact,phone,email,address,country from locations order by code',
 'lots':'select lot,product,unit,supplier,date_mark,quantity,held,samples,distributed,undistributed from lot_balance order by lot',
 'shipments':`select s.code,l.code lot,p.unit,d.code destination,s.quantity,s.shipped_on,s.source_ref from shipments s join lots l on l.id=s.lot_id join products p on p.id=l.product_id join locations d on d.id=s.destination_id order by s.shipped_on,s.code`,
 'recalls':'select code,name,mode,jurisdiction,owner,started_on,response_due,status from recalls order by started_on desc,code',
 'recall-round':`select recall,mode,owner,lot,destination,unit,distributed,returned,destroyed,consumed,unaccounted,notified,acknowledged from recovery_balance where status='open' order by recall,lot,destination`,
 'recovery-balance':'select recall,mode,lot,destination,unit,distributed,returned,destroyed,consumed,unaccounted from recovery_balance order by recall,lot,destination',
 'unacknowledged':`select recall,lot,destination,owner,response_due from recovery_balance where status='open' and not acknowledged order by response_due,recall,destination`,
 'overdue-response':`select recall,lot,destination,owner,response_due,unaccounted,unit from recovery_balance where status='open' and response_due<current_date and (not acknowledged or unaccounted>0) order by response_due,recall,destination`,
 'contact-gaps':"select recall,lot,destination,business,contact,phone,address from distribution_contacts where contact='' or phone='' or address='' order by recall,lot,destination",
 'distribution-list':'select * from distribution_contacts order by recall,lot,destination',
 'owner-workload':`select owner,count(distinct recall) recalls,count(*) record_gaps from record_checks group by owner order by record_gaps desc,owner`,
 'report-deadlines':`select r.code,r.mode,r.jurisdiction,r.started_on+14 interim_due,r.started_on+28 final_due,exists(select 1 from reports p where p.recall_id=r.id and p.kind='interim') interim_recorded,exists(select 1 from reports p where p.recall_id=r.id and p.kind='final') final_recorded from recalls r where r.jurisdiction='AU' and r.status='open' order by r.started_on,r.code`,
 'stale-plans':'select code,jurisdiction,owner,reference,reviewed_on,review_due from plans where review_due<current_date order by review_due,code',
 'plans':'select code,jurisdiction,owner,reference,reviewed_on,review_due from plans order by jurisdiction,reviewed_on desc',
 'attention':'select * from record_checks order by recall,rule,finding',
 'compliance':'select * from record_checks order by recall,rule,finding',
 'import-history':'select source_name,sha256,row_count,created_at from imports order by created_at',
 'audit':'select table_name,record_id,action,actor,created_at from audit_log order by created_at,id',
 'reports':`select r.code recall,p.kind,p.reference,p.recorded_on,p.actor from reports p join recalls r on r.id=p.recall_id order by p.recorded_on,r.code`,
 'notes':`select r.code recall,n.body,n.actor,n.created_at from notes n join recalls r on r.id=n.recall_id order by n.created_at`,
};
const allTables=['products','locations','lots','shipments','recalls','recall_lots','recipients','communications','recoveries','reports','plans','notes','imports','audit_log','contact_verifications'];
const req=(o,k)=>{if(o[k]===undefined||o[k]===true||String(o[k]).trim()==='')throw Error(`Required --${k}=value`);return String(o[k]).trim();};
const decimal=(v,name)=>{if(!/^\d+(\.\d{1,3})?$/.test(String(v))||Number(v)>99999999999)throw Error(`${name} must be a nonnegative quantity with at most three decimals`);return String(v);};
const date=(v)=>{if(!/^\d{4}-\d{2}-\d{2}$/.test(v)||!Number.isFinite(Date.parse(v))||new Date(v).toISOString().slice(0,10)!==v)throw Error('Date must be a real YYYY-MM-DD calendar date');return v;};
function code(v){if(!/^[A-Za-z0-9][A-Za-z0-9_.-]{0,79}$/.test(v))throw Error('Code must use letters, digits, dots, hyphens or underscores, at most 80 characters');return v;}
export function parseArgs(args){const pos=[],opts={};for(const a of args){if(a.startsWith('--')){const i=a.indexOf('=');const k=a.slice(2,i<0?undefined:i);if(k in opts)throw Error(`Repeated flag --${k}`);opts[k]=i<0?true:a.slice(i+1);}else pos.push(a);}return {pos,opts};}
export async function resolve(db,t,ref){
 if(!['products','locations','lots','recalls'].includes(t))throw Error('Unsupported reference');
 if(!ref)throw Error(`A ${t} reference is required`);
 const name=['products','locations','recalls'].includes(t)?'name':'code';
 const rows=await db.query(`select id,code,${name} label from ${t} where lower(code)=lower($1) or id::text=$1 order by code`,[ref]);
 if(rows.length===1)return rows[0].id;
 const candidates=rows.length?rows:await db.query(`select id,code,${name} label from ${t} where left(lower(code),length($1))=lower($1) or left(id::text,length($1))=$1 or strpos(lower(${name}),lower($1))>0 order by code`,[ref]);
 if(candidates.length!==1)throw Error(`${candidates.length?'Ambiguous':'Unknown'} ${t} reference ${ref}. Candidates: ${JSON.stringify(candidates.length?candidates:await db.query(`select code,${name} label from ${t} order by code`))}`);
 return candidates[0].id;
}
async function insert(db,t,row){const keys=Object.keys(row);return (await db.query(`insert into ${t}(${keys.join(',')}) values(${keys.map((_,i)=>'$'+(i+1)).join(',')}) returning *`,Object.values(row)))[0];}
async function recipient(db,o){const r=await resolve(db,'recalls',req(o,'recall')),l=await resolve(db,'lots',req(o,'lot')),d=await resolve(db,'locations',req(o,'destination'));const rows=await db.query('select id from recipients where recall_id=$1 and lot_id=$2 and location_id=$3',[r,l,d]);if(rows.length!==1)throw Error('This lot and destination are not in the recall scope');return rows[0].id;}
function timestamp(v){if(!/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(v)||!Number.isFinite(Date.parse(v)))throw Error('Timestamp requires an explicit timezone');return v;}
function safeOutput(name,base){const root=path.resolve(process.env.OUTPUT_DIR||REPO_ROOT,base);const out=path.resolve(root,name);if(!out.startsWith(root+path.sep))throw Error(`Output must stay inside ${base}`);return out;}
async function readSheet(file,sheet){
 if(file.toLowerCase().endsWith('.csv'))return parseCsv(fs.readFileSync(file,'utf8'));
 if(!file.toLowerCase().endsWith('.xlsx'))throw Error('Import accepts CSV or XLSX files');
 const {default:ExcelJS}=await import('exceljs');const wb=new ExcelJS.Workbook();await wb.xlsx.readFile(file);const ws=sheet?wb.getWorksheet(sheet):wb.worksheets[0];if(!ws)throw Error('Workbook sheet missing');
 const cell=c=>{if(c.value===null||c.value===undefined)return '';if(c.value instanceof Date)return c.value.toISOString().slice(0,10);if(typeof c.value==='object')throw Error('Formula, rich text and linked cells must be converted to plain values');return String(c.value);};
 const h=ws.getRow(1).values.slice(1).map((_,i)=>cell(ws.getRow(1).getCell(i+1)).trim());if(!h.length||h.some(x=>!x)||new Set(h.map(x=>x.toLowerCase())).size!==h.length)throw Error('Workbook requires unique nonempty headers');
 const out=[];ws.eachRow((r,n)=>{if(n===1)return;if(r.cellCount>h.length)throw Error('Workbook row has extra cells');out.push(Object.fromEntries(h.map((k,i)=>[k,cell(r.getCell(i+1))])));});return out;
}
async function importFoodlogiq(db,o){
 const root=path.resolve(req(o,'dir')),map=JSON.parse(fs.readFileSync(req(o,'map'),'utf8'));const raw={},hash=createHash('sha256').update(JSON.stringify(map));
 for(const t of ['products','locations','lots','shipments']){
 const m=map[t];if(!m?.file||!m.columns)throw Error(`Mapping needs ${t}.file and columns`);const file=path.resolve(root,m.file);if(!file.startsWith(root+path.sep))throw Error('Import files must remain under the import directory');const bytes=fs.readFileSync(file);hash.update(t).update(bytes);raw[t]=await readSheet(file,m.sheet);if(!raw[t].length)throw Error(`No ${t} rows found`);
 }
 const digest=hash.digest('hex');if((await db.query('select id from imports where sha256=$1',[digest])).length)return [{duplicate:true,sha256:digest}];
 let count=0;
 for(const t of ['products','locations','lots','shipments'])for(const source of raw[t]){
 const row={};for(const [k,h]of Object.entries(map[t].columns)){if(!(h in source))throw Error(`Missing ${t} export heading ${h}`);row[k]=String(source[h]).trim();}
 const command={products:'add-product',locations:'add-location',lots:'add-lot',shipments:'ship'}[t];
 // Repeated identical master records are allowed. A changed record always needs a reviewed mapping.
 const normalized=await entityRow(db,command,row);
 const existing=await db.query(`select * from ${t} where code=$1`,[normalized.code]);
 if(existing.length){for(const [k,v]of Object.entries(normalized)){const actual=existing[0][k];const equal=['quantity','held','samples'].includes(k)?Number(actual)===Number(v):String(actual??'')===String(v??'');if(!equal)throw Error(`Conflicting ${t} code ${normalized.code}: ${k}`);}}
 else await insert(db,t,normalized);
 count++;
 }
 await insert(db,'imports',{sha256:digest,source_name:path.basename(root),row_count:count,mapping:JSON.stringify(map),raw_rows:JSON.stringify(raw)});
 return [{imported_rows:count,sha256:digest,dry_run:!!o['dry-run']}];
}
async function entityRow(db,cmd,o){
 const c=code(req(o,'code'));
 if(cmd==='add-product')return {code:c,name:req(o,'name'),gtin:o.gtin||'',unit:req(o,'unit')};
 if(cmd==='add-location')return {code:c,name:req(o,'name'),contact:o.contact||'',phone:o.phone||'',email:o.email||'',address:o.address||'',country:req(o,'country')};
 if(cmd==='add-lot')return {code:c,product_id:await resolve(db,'products',req(o,'product')),supplier:req(o,'supplier'),date_mark:date(req(o,'date-mark')),quantity:decimal(req(o,'quantity'),'quantity'),held:decimal(o.held||'0','held'),samples:decimal(o.samples||'0','samples'),source_ref:req(o,'reference')};
 if(cmd==='ship')return {code:c,lot_id:await resolve(db,'lots',req(o,'lot')),destination_id:await resolve(db,'locations',req(o,'destination')),quantity:decimal(req(o,'quantity'),'quantity'),shipped_on:date(req(o,'date')),source_ref:req(o,'reference')};
 throw Error('Unknown entity');
}
export async function run(db,args){
 const {pos,opts:o}=parseArgs(args);const cmd=pos[0]||'help';
 if(cmd==='help'||o.help)return [{commands:[...Object.keys(reads),'trace-lot','trace-destination','recall','add-product','add-location','add-lot','ship','start','scope','verify-contact','notify','acknowledge','recover','report','plan','log','close','weekly-review','draft-notice','draft-reconciliation','import foodlogiq','export'].join(', ')}];
 if(reads[cmd])return db.query(reads[cmd]);
 if(cmd==='trace-lot'){const id=await resolve(db,'lots',pos[1]);return db.query(`select s.code shipment,l.code lot,d.code destination,d.name,d.contact,d.phone,s.quantity,p.unit,s.shipped_on from shipments s join lots l on l.id=s.lot_id join products p on p.id=l.product_id join locations d on d.id=s.destination_id where s.lot_id=$1 order by s.code`,[id]);}
 if(cmd==='trace-destination'){const id=await resolve(db,'locations',pos[1]);return db.query(`select s.code shipment,l.code lot,p.name product,p.unit,s.quantity,s.shipped_on from shipments s join lots l on l.id=s.lot_id join products p on p.id=l.product_id where s.destination_id=$1 order by s.shipped_on,s.code`,[id]);}
 if(cmd==='recall'){const id=await resolve(db,'recalls',pos[1]);return [{recall:(await db.query('select * from recalls where id=$1',[id]))[0],lots:await db.query('select l.code from recall_lots x join lots l on l.id=x.lot_id where x.recall_id=$1',[id]),recipients:await db.query('select * from recovery_balance where recall_id=$1 order by lot,destination',[id]),notes:await db.query('select * from notes where recall_id=$1 order by created_at',[id])}];}
 if(cmd==='export'){
 const out=safeOutput(req(o,'out'),'exports');if(fs.existsSync(out))throw Error('Export folder already exists');
 const data={format:1,generated_at:new Date().toISOString(),tables:{}};await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');try{for(const t of allTables)data.tables[t]=await db.query(`select * from ${t} order by created_at,id`);}finally{await db.exec('ROLLBACK');}
 fs.mkdirSync(out,{recursive:true,mode:0o700});const file=path.join(out,'records.json');fs.writeFileSync(file,JSON.stringify(data,null,2),{flag:'wx',mode:0o600});return [{file,sha256:createHash('sha256').update(fs.readFileSync(file)).digest('hex')}];
 }
 if(['weekly-review','draft-notice','draft-reconciliation'].includes(cmd)){
 let sections;
 await db.exec('BEGIN ISOLATION LEVEL REPEATABLE READ READ ONLY');
 try{
 if(cmd==='weekly-review'){sections=[];for(const c of ['recall-round','attention','report-deadlines'])sections.push({title:c.replaceAll('-',' '),html:htmlTable(await db.query(reads[c]))});}
 else{const id=await resolve(db,'recalls',pos[1]);const r=(await db.query('select * from recalls where id=$1',[id]))[0];sections=[{title:'Operator review required',note:`${r.mode.toUpperCase()}. Draft working record only. No safety decision, public notice or message has been issued. Use the regulator-approved template for an actual recall.`,html:htmlTable([{recall:r.code,reason:r.reason,owner:r.owner}])},{title:'Distribution and recovery',html:htmlTable(await db.query('select lot,destination,unit,distributed,returned,destroyed,consumed,unaccounted from recovery_balance where recall_id=$1 order by lot,destination',[id]))}];}
 }finally{await db.exec('ROLLBACK');}
 const file=writeOut('drafts',`${cmd}-${randomUUID()}`,page({title:cmd.replaceAll('-',' '),subtitle:'DRAFT. Human review required. Nothing sent.',sections}));return [{file}];
 }
 const actor=req(o,'actor');await db.exec('BEGIN');
 try{
 await db.query("select set_config('recall.actor',$1,true)",[actor]);let result;
 if(['add-product','add-location','add-lot','ship'].includes(cmd)){const t={'add-product':'products','add-location':'locations','add-lot':'lots',ship:'shipments'}[cmd];result=await insert(db,t,await entityRow(db,cmd,o));}
 else if(cmd==='start'){result=await insert(db,'recalls',{code:code(req(o,'code')),name:req(o,'name'),mode:req(o,'mode'),jurisdiction:req(o,'jurisdiction'),owner:req(o,'owner'),reason:req(o,'reason'),started_on:date(req(o,'date')),response_due:date(req(o,'due'))});const lots=req(o,'lots').split(',');for(const l of lots)await insert(db,'recall_lots',{recall_id:result.id,lot_id:await resolve(db,'lots',l)});}
 else if(cmd==='scope')result=await insert(db,'recall_lots',{recall_id:await resolve(db,'recalls',req(o,'recall')),lot_id:await resolve(db,'lots',req(o,'lot'))});
 else if(['notify','acknowledge'].includes(cmd))result=await insert(db,'communications',{recipient_id:await recipient(db,o),kind:cmd==='notify'?'notified':'acknowledged',occurred_at:timestamp(req(o,'at')),method:req(o,'method'),reference:req(o,'reference'),actor});
 else if(cmd==='verify-contact')result=await insert(db,'contact_verifications',{recipient_id:await recipient(db,o),contact:req(o,'contact'),phone:req(o,'phone'),address:req(o,'address'),reference:req(o,'reference'),actor});
 else if(cmd==='recover')result=await insert(db,'recoveries',{recipient_id:await recipient(db,o),disposition:req(o,'disposition'),quantity:decimal(req(o,'quantity'),'quantity'),reference:req(o,'reference'),actor});
 else if(cmd==='report')result=await insert(db,'reports',{recall_id:await resolve(db,'recalls',req(o,'recall')),kind:req(o,'kind'),reference:req(o,'reference'),recorded_on:date(req(o,'date')),actor});
 else if(cmd==='plan')result=await insert(db,'plans',{code:code(req(o,'code')),jurisdiction:req(o,'jurisdiction'),owner:req(o,'owner'),reference:req(o,'reference'),reviewed_on:date(req(o,'date')),review_due:date(req(o,'due'))});
 else if(cmd==='log')result=await insert(db,'notes',{recall_id:await resolve(db,'recalls',req(o,'recall')),body:req(o,'body'),actor});
 else if(cmd==='close'){
 const id=await resolve(db,'recalls',req(o,'recall'));
 await db.query('select id from recalls where id=$1 for update',[id]);
 result=(await db.query("update recalls set status='closed',close_ref=$2,reviewer=$3,closed_at=now() where id=$1 returning *",[id,req(o,'reference'),req(o,'reviewer')]))[0];
 }
 else if(cmd==='import'&&pos[1]==='foodlogiq')result=await importFoodlogiq(db,o);
 else throw Error(`Unknown command ${cmd}; use --help`);
 await db.exec(o['dry-run']?'ROLLBACK':'COMMIT');return Array.isArray(result)?result:[result];
 }catch(e){await db.exec('ROLLBACK');throw e;}
}
export function format(rows){
 if(!rows.length)return 'No matching records.';
 const cols=Object.keys(rows[0]);const s=v=>v===null?'':typeof v==='object'?JSON.stringify(v):String(v);
 const widths=cols.map(k=>Math.min(90,Math.max(k.length,...rows.map(r=>s(r[k]).length))));
 return [cols.map((k,i)=>k.replaceAll('_',' ').padEnd(widths[i])).join('  '),cols.map((_,i)=>'-'.repeat(widths[i])).join('  '),...rows.map(r=>cols.map((k,i)=>s(r[k]).slice(0,90).padEnd(widths[i])).join('  '))].join('\n');
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){let db;try{db=await getDb();const rows=await run(db,process.argv.slice(2));console.log(process.argv.includes('--json')?JSON.stringify(rows,null,2):format(rows));}catch(e){console.error(e.message);process.exitCode=1;}finally{if(db)await db.close();}}
