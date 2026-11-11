import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {getDb,REPO_ROOT} from './lib/db.mjs';
import {migrate} from './migrate.mjs';
import {seed} from './seed.mjs';
import {run,reads,resolve,format} from './recall.mjs';
import {parseCsv} from './lib/csv.mjs';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'food-recall-test-'));
process.env.DATA_DIR=path.join(tmp,'db');process.env.OUTPUT_DIR=path.join(tmp,'output');
// Never inherit a production database. CI opts into a disposable database explicitly.
process.env.DATABASE_URL=process.env.RECALL_TEST_POSTGRES_URL||'';
let db=await getDb(),checks=0;
const ok=(value,msg)=>{assert.ok(value,msg);checks++;};
const eq=(a,b)=>{assert.deepEqual(a,b);checks++;};
const fails=async(fn,re)=>{await assert.rejects(fn,re);checks++;};
const call=(...a)=>run(db,a);
const write=(cmd,o)=>run(db,[cmd,...Object.entries({...o,actor:'Test Operator'}).map(([k,v])=>`--${k}=${v}`)]);
const today=new Date().toISOString().slice(0,10),tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10),lastMonth=new Date(Date.now()-35*86400000).toISOString().slice(0,10);
try{
 eq((await migrate(db)).ran.length,3);eq((await migrate(db)).ran.length,0);
 await seed(db);const count=(await db.query('select count(*) n from audit_log'))[0].n;await seed(db);eq((await db.query('select count(*) n from audit_log'))[0].n,count);
 for(const c of Object.keys(reads)){ok(Array.isArray(await call(c)),c);}
 const balance=await call('recovery-balance');eq(balance.map(x=>Number(x.unaccounted)),[100,300]);
 ok((await call('attention')).some(x=>x.rule==='AU-INTERIM'));ok((await call('contact-gaps')).length===1);
 eq(await resolve(db,'products','roasted pumpkin'),await resolve(db,'products','demo-soup'));
 await fails(()=>resolve(db,'locations','Quay'),/Ambiguous.*DEMO-NORTH.*DEMO-SOUTH/);
 await fails(()=>resolve(db,'lots','nonexistent'),/Unknown/);
 eq((await call('trace-lot','DEMO-BATCH-A')).length,2);eq((await call('trace-destination','DEMO-NORTH')).length,2);eq((await call('recall','DEMO-EXERCISE'))[0].lots.length,1);ok((await call('help'))[0].commands.includes('recover'));
 await fails(()=>write('ship',{code:'BAD-HELD',lot:'DEMO-BATCH-A',destination:'DEMO-NORTH',quantity:1,date:today,reference:'bad'}),/open recall/);
 await fails(()=>write('ship',{code:'BAD-EXCESS',lot:'DEMO-BATCH-B',destination:'DEMO-NORTH',quantity:1000,date:today,reference:'bad'}),/exceeds/);
 await fails(()=>write('start',{code:'BAD-SCOPE',name:'Bad',mode:'exercise',jurisdiction:'AU',owner:'Mara',reason:'test',date:today,due:tomorrow,lots:'DEMO-BATCH-A'}),/already has/);
 eq((await db.query("select count(*) n from recalls where code='BAD-SCOPE'"))[0].n,0);
 await fails(()=>write('close',{recall:'DEMO-EXERCISE',reference:'bad',reviewer:'Reviewer'}),/Unaccounted/);
 await fails(()=>write('recover',{recall:'DEMO-EXERCISE',lot:'DEMO-BATCH-A',destination:'DEMO-NORTH',disposition:'returned',quantity:101,reference:'TOO-MUCH'}),/exceeds/);
 await fails(()=>write('recover',{recall:'DEMO-EXERCISE',lot:'DEMO-BATCH-A',destination:'DEMO-NORTH',disposition:'returned',quantity:'0.0001',reference:'PRECISION'}),/three decimals/);
 await fails(()=>call('add-product','--code=NO-ACTOR'),/actor/);
 await fails(()=>write('add-lot',{code:'BAD-DATE',product:'DEMO-SOUP',supplier:'Example',quantity:10,'date-mark':'2026-02-31',reference:'test'}),/real YYYY/);
 const parts={recall:'DEMO-EXERCISE',lot:'DEMO-BATCH-A',destination:'DEMO-SOUTH'};
 await fails(()=>write('notify',{...parts,at:'2026-01-01T10:00:00',method:'phone',reference:'MISSING-TZ'}),/timezone/);
 await write('verify-contact',{...parts,contact:'Bo Sample',phone:'fictional phone',address:'Fictional address',reference:'TEST-CONTACT'});eq((await call('contact-gaps')).length,0);
 await fails(()=>write('notify',{...parts,at:'2000-01-01T00:00:00Z',method:'phone',reference:'BEFORE-EVENT'}),/predates/);
 await write('notify',{...parts,at:new Date().toISOString(),method:'exercise telephone',reference:'TEST-NOTIFY'});
 await write('acknowledge',{...parts,at:new Date().toISOString(),method:'exercise written reply',reference:'TEST-ACK'});
 await write('recover',{...parts,disposition:'destroyed',quantity:300,reference:'TEST-DESTROYED'});
 await write('recover',{...parts,destination:'DEMO-NORTH',disposition:'returned',quantity:100,reference:'TEST-RETURN'});
 await fails(()=>write('close',{recall:'DEMO-EXERCISE',reference:'test',reviewer:'Reviewer'}),/record checks/);
 await write('plan',{code:'CURRENT-AU',jurisdiction:'AU',owner:'Mara',reference:'Reviewed plan revision 3',date:today,due:tomorrow});
 await write('report',{recall:'DEMO-EXERCISE',kind:'interim',reference:'Exercise report reviewed',date:today});
 await fails(()=>write('close',{recall:'DEMO-EXERCISE',reference:'test',reviewer:'Reviewer'}),/Final report/);
 await write('report',{recall:'DEMO-EXERCISE',kind:'final',reference:'Exercise final report reviewed',date:today});
 await write('log',{recall:'DEMO-EXERCISE',body:'Exercise review finished'});
 eq((await call('attention')).length,0);
 await write('close',{recall:'DEMO-EXERCISE',reference:'Exercise reviewer sign-off, on-site count verified',reviewer:'Named reviewer'});
 await fails(()=>write('recover',{...parts,disposition:'returned',quantity:1,reference:'AFTER-CLOSE'}),/closed/);
 await fails(()=>write('scope',{recall:'DEMO-EXERCISE',lot:'DEMO-BATCH-B'}),/closed/);
 await fails(()=>db.exec("update recoveries set quantity=1"),/append-only/);
 await fails(()=>db.exec('delete from audit_log'),/append-only/);
 await write('add-product',{code:'TEST-RICE',name:'Rice <script>alert(1)</script>',unit:'kg'});
 await write('add-location',{code:'TEST-STORE',name:'Test store',country:'NZ',contact:'Test',phone:'000',address:'Test address'});
 await write('add-lot',{code:'TEST-R1',product:'TEST-RICE',supplier:'Fictional grower',quantity:'10.125','date-mark':tomorrow,reference:'PROD-R1'});
 await write('ship',{code:'TEST-S1',lot:'TEST-R1',destination:'TEST-STORE',quantity:'8.125',date:today,reference:'SHIP-R1'});
 await write('start',{code:'TEST-NZ',name:'NZ exercise',mode:'exercise',jurisdiction:'NZ',owner:'Eli',reason:'Fictional exercise',date:lastMonth,due:today,lots:'TEST-R1'});
 ok(!(await call('report-deadlines')).some(x=>x.code==='TEST-NZ'));
 await write('plan',{code:'CURRENT-NZ',jurisdiction:'NZ',owner:'Eli',reference:'Reviewed NZ plan',date:today,due:tomorrow});
 // Scope supports multiple batches and takes an immutable snapshot of recipients.
 await write('scope',{recall:'TEST-NZ',lot:'DEMO-BATCH-B'});
 eq((await call('recall','TEST-NZ'))[0].lots.length,2);
 const imp=path.join(tmp,'import');fs.mkdirSync(imp);
 const files={
 products:'Code,Name,GTIN,Unit\nIMP-P,Imported soup,123,each\n',
 locations:'Code,Name,Contact,Phone,Email,Address,Country\nIMP-L,Imported shop,Sam,000,sam@example.invalid,Example address,AU\n',
 lots:`Code,Product,Supplier,Date,Quantity,Held,Samples,Reference\nIMP-B,IMP-P,Example supplier,${tomorrow},20,2,0,source batch 1\n`,
 shipments:`Code,Lot,Destination,Quantity,Date,Reference\nIMP-S,IMP-B,IMP-L,10,${today},source shipment 1\n`
 };
 const columns={products:{code:'Code',name:'Name',gtin:'GTIN',unit:'Unit'},locations:{code:'Code',name:'Name',contact:'Contact',phone:'Phone',email:'Email',address:'Address',country:'Country'},lots:{code:'Code',product:'Product',supplier:'Supplier','date-mark':'Date',quantity:'Quantity',held:'Held',samples:'Samples',reference:'Reference'},shipments:{code:'Code',lot:'Lot',destination:'Destination',quantity:'Quantity',date:'Date',reference:'Reference'}};
 const mapping={};for(const [k,v] of Object.entries(files)){fs.writeFileSync(path.join(imp,k+'.csv'),v);mapping[k]={file:k+'.csv',columns:columns[k]};}
 const map=path.join(imp,'map.json');fs.writeFileSync(map,JSON.stringify(mapping));
 const importArgs=['import','foodlogiq','--dir='+imp,'--map='+map,'--actor=Importer'];
 await run(db,[...importArgs,'--dry-run']);eq((await db.query("select count(*) n from products where code='IMP-P'"))[0].n,0);
 eq((await run(db,importArgs))[0].imported_rows,4);eq((await run(db,importArgs))[0].duplicate,true);
 const {default:ExcelJS}=await import('exceljs');const wb=new ExcelJS.Workbook();const ws=wb.addWorksheet('Export');ws.addRow(['Code','Name','GTIN','Unit']);ws.addRow(['IMP-P','Imported soup','123','each']);await wb.xlsx.writeFile(path.join(imp,'products.xlsx'));mapping.products.file='products.xlsx';mapping.products.sheet='Export';fs.writeFileSync(map,JSON.stringify(mapping));eq((await run(db,importArgs))[0].imported_rows,4);
 fs.writeFileSync(path.join(imp,'shipments.csv'),files.shipments.replace(',10,',',19,'));await fails(()=>run(db,importArgs),/Conflicting/);
 fs.writeFileSync(path.join(imp,'products.csv'),files.products.replace('IMP-P','NEW-P'));
 mapping.products.file='products.csv';fs.writeFileSync(map,JSON.stringify(mapping));await fails(()=>run(db,importArgs),/Conflicting/);eq((await db.query("select count(*) n from products where code='NEW-P'"))[0].n,0);
 eq(parseCsv('\uFEFFA,B\r\n"one, two","a""b"\r\n')[0],{A:'one, two',B:'a"b'});
 assert.throws(()=>parseCsv('a,a\n1,2'),/unique/);checks++;
 assert.throws(()=>parseCsv('a,b\n"unterminated'),/unclosed/);checks++;
 for(const c of ['weekly-review','draft-notice','draft-reconciliation']){const r=await call(c,'TEST-NZ');ok(fs.readFileSync(r[0].file,'utf8').includes('DRAFT'));}
 const ex=(await call('export','--out=proof'))[0];const data=JSON.parse(fs.readFileSync(ex.file));eq(Object.keys(data.tables).length,15);ok(data.tables.contact_verifications.length===1);ok(data.tables.imports[0].raw_rows.products.length===1);
 await fails(()=>call('export','--out=proof'),/already exists/);await fails(()=>call('export','--out=../../escape'),/inside exports/);
 ok(format(await call('recovery-balance')).includes('unaccounted'));
 await db.close();db=null;
 for(const script of ['view.mjs','docs.mjs']){const r=spawnSync(process.execPath,['scripts/'+script],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(r.status,0);}
 const view=fs.readFileSync(path.join(process.env.OUTPUT_DIR,'views','week.html'),'utf8');ok(view.includes('&lt;script&gt;'));ok(!view.includes('<script>alert'));
 // Exercise the actual CLI entry point as well as the shared dispatch function.
 const cli=spawnSync(process.execPath,['scripts/recall.mjs','recalls','--json'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(cli.status,0);ok(JSON.parse(cli.stdout).length>=2);
 const ambiguous=spawnSync(process.execPath,['scripts/recall.mjs','trace-destination','Quay'],{cwd:REPO_ROOT,env:process.env,encoding:'utf8'});eq(ambiguous.status,1);ok(ambiguous.stderr.includes('Ambiguous'));
 console.log(`PASS: ${checks} assertions; every read and mutation, CSV/XLSX import, rollback, recall controls, documents and CLI (${process.env.RECALL_TEST_POSTGRES_URL?'PostgreSQL':'PGlite'}).`);
}finally{if(db)await db.close();fs.rmSync(tmp,{recursive:true,force:true});}
