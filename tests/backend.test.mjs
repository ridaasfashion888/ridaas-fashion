import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import worker from '../src/server.js';
import {database} from './db.mjs';
test('owner authorization, drafts, product validation and atomic inventory lifecycle',async()=>{
 const dir=await mkdtemp(path.join(tmpdir(),'ridaas-test-'));
 try{
 const DB=database(path.join(dir,'test.db'));
 for(const sql of (await readFile(new URL('../drizzle/0000_ridaas_store.sql',import.meta.url),'utf8')).split(';').filter(s=>s.trim()))await DB.prepare(sql).run();
 const env={DB,ADMIN_EMAIL:'owner@example.com'};
 const call=async(url,method='GET',body,owner=false,origin='https://test.local')=>worker.fetch(new Request('https://test.local'+url,{method,headers:{origin,'content-type':'application/json',...(owner?{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'owner@example.com'}:{})},body:body?JSON.stringify(body):undefined}),env);
 assert.equal((await call('/api/admin/dashboard')).status,401);
 assert.equal((await call('/api/admin/products','POST',{},true,'https://evil.test')).status,403);
 const p={name:'Test piece',category:'Women',description:'Test',price_paise:10000,stock:2,sizes:'S, M',image_url:'https://example.com/a.jpg',status:'draft'};
 assert.equal((await call('/api/admin/products','POST',p,true)).status,200);
 assert.equal((await (await call('/api/store')).json()).products.length,0);
 assert.equal((await call('/api/admin/products/1','PUT',{...p,stock:-1},true)).status,400);
 assert.equal((await call('/api/admin/products/1','PUT',{...p,status:'active'},true)).status,200);
 const order={request_id:crypto.randomUUID(),customer_name:'Test',phone:'9876543210',items:[{id:1,quantity:2,size:'M'}]};
 assert.equal((await call('/api/orders','POST',order)).status,201);
 assert.equal((await DB.prepare('SELECT stock FROM products WHERE id=1').first()).stock,0);
 assert.equal((await call('/api/orders','POST',order)).status,200);
 assert.equal((await DB.prepare('SELECT stock FROM products WHERE id=1').first()).stock,0);
 assert.equal((await call('/api/orders','POST',{...order,request_id:crypto.randomUUID()})).status,409);
 assert.equal((await call('/api/admin/orders/1','PUT',{status:'cancelled'},true)).status,200);
 assert.equal((await DB.prepare('SELECT stock FROM products WHERE id=1').first()).stock,2);
 await call('/api/admin/orders/1','PUT',{status:'cancelled'},true);
 assert.equal((await DB.prepare('SELECT stock FROM products WHERE id=1').first()).stock,2);
 assert.equal((await call('/api/admin/orders/1','PUT',{status:'confirmed'},true)).status,400);
 assert.equal((await call('/api/admin/instagram/sync','POST',{},true)).status,503);
 }finally{await rm(dir,{recursive:true,force:true})}
});
