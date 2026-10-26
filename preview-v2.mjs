import http from 'node:http';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import worker from './dist/server/index.js';
import {database} from './tests/db.mjs';
await mkdir('../work/preview',{recursive:true});
const DB=database('../work/preview/ridaas.db');
for(const sql of (await readFile('drizzle/0000_ridaas_store.sql','utf8')).split(';').filter(s=>s.trim()))await DB.prepare(sql).run();
// Local preview identity is injected only by this loopback development server.
const env={DB,ADMIN_EMAIL:'preview@example.com',BUCKET:{async put(key,bytes,metadata){await writeFile('../work/preview/'+key.replaceAll('/','_'),bytes);await writeFile('../work/preview/'+key.replaceAll('/','_')+'.json',JSON.stringify(metadata))},async get(key){try{const bytes=await readFile('../work/preview/'+key.replaceAll('/','_'));const meta=JSON.parse(await readFile('../work/preview/'+key.replaceAll('/','_')+'.json','utf8'));return {body:bytes,writeHttpMetadata(h){h.set('content-type',meta.httpMetadata.contentType)}}}catch{return null}}}};
http.createServer(async(req,res)=>{const chunks=[];for await(const c of req)chunks.push(c);const request=new Request('http://127.0.0.1:4173'+req.url,{method:req.method,headers:{...req.headers,'oai-authenticated-user-id':'local-preview','oai-authenticated-user-email':'preview@example.com'},body:['GET','HEAD'].includes(req.method)?undefined:Buffer.concat(chunks)});const response=await worker.fetch(request,env);res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()))}).listen(4173,'127.0.0.1',()=>console.log('Local: http://127.0.0.1:4173'));
