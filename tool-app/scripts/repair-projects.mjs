import {readFile, readdir, writeFile} from 'node:fs/promises';
import {join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {applyContentType} from '../src/templates.js';

const APP=resolve(fileURLToPath(new URL('..',import.meta.url))); const ROOT=resolve(APP,'..');
const core=JSON.parse(await readFile(join(ROOT,'video-engine','src','content','case001.json'),'utf8'));
const dir=join(APP,'data','projects');
const merge=(a,b)=>Array.isArray(a)?(Array.isArray(b)?b:a):a&&typeof a==='object'?Object.fromEntries(Object.keys(a).map(k=>[k,merge(a[k],b?.[k])]).concat(Object.keys(b||{}).filter(k=>!(k in a)).map(k=>[k,b[k]]))):b===undefined?a:b;
for(const name of (await readdir(dir)).filter(x=>x.endsWith('.json'))){const path=join(dir,name);let p=JSON.parse(await readFile(path,'utf8'));const raw=JSON.stringify(p);const broken=raw.includes('�')||raw.includes('D?NG')||(raw.match(/\?/g)||[]).length>18;p.core=broken?merge(core,{data:p.core?.data,voice:p.core?.voice}):merge(core,p.core);if(broken&&p.id==='case-001'){p.name='Bullish Engulfing · Pattern Lab';p=applyContentType(p,'candle-pattern')}await writeFile(path,JSON.stringify(p,null,2),'utf8');console.log(`${name}: ${broken?'repaired':'migrated'}`)}
