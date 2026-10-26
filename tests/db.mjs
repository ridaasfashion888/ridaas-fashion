import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
export function database(file){
 const execute=queries=>{const p=spawnSync(process.env.RIDAAS_PYTHON||'python',[fileURLToPath(new URL('./sqlite_bridge.py',import.meta.url)),file],{input:JSON.stringify(queries),encoding:'utf8'});if(p.status!==0)throw new Error(p.stdout||p.stderr);return JSON.parse(p.stdout)};
 return {prepare(sql){return {sql,params:[],bind(...params){this.params=params;return this},async all(){return execute([this])[0]},async first(){return execute([this])[0].results[0]||null},async run(){return execute([this])[0]}}},async batch(queries){return execute(queries)}};
}
