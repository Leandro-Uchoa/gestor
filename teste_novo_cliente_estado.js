const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const code = n => fs.readFileSync(path.join(__dirname, 'novo', n), 'utf8');
const defer = () => { let resolve, reject; const promise = new Promise((a,b) => {resolve=a;reject=b;}); return {promise,resolve,reject}; };
const tick = () => new Promise(r => setImmediate(r));
const filtro = {marca:['OLY'],tipo:'tenis',genero:[],categoria:[]};
function dom() {
 const els = new Map();
 class El {
  constructor(tag='div'){this.tag=tag;this.children=[];this.style={};this.value='';this.hidden=false;this.attrs={};}
  set id(v){this._id=v;els.set(v,this);} get id(){return this._id;}
  set innerHTML(v){this.html=v;for(const m of v.matchAll(/id="([^"]+)"/g)){const el=new El();el.id=m[1];}}
  appendChild(e){this.children.push(e);return e;} replaceChildren(){this.children=[];}
  setAttribute(k,v){this.attrs[k]=v;} remove(){els.delete(this.id);}
 }
 const main=new El(); main.id='main';
 return {els,main,body:new El(),createElement:t=>new El(t),getElementById:id=>els.get(id),querySelector:s=>s==='.main'?main:null,querySelectorAll:()=>[]};
}
function glue({startError=false, search='?cliente=A'}={}){
 const document=dom(), requests=[], renders=[], opens=[]; let filters=0,writes=0;
 const Dados={MODO_CLIENTE:false,sessao:async()=>({}),clientes:async()=>{if(startError){startError=false;throw Error('offline');}return [{cliente:'A'},{cliente:'B'}];},carregar:c=>{const d=defer();requests.push({c,...d});return d.promise;},refiltrar:()=>{filters++;return {cliente:{nome:'filtered'}};},sb:{auth:{getUser:async()=>({data:{user:null}})},from:()=>{writes++;throw Error('write forbidden');}},sair:()=>{}};
 const window={desenhar:d=>{assert.equal(document.main.hidden,false,"renderer must measure visible layout");renders.push(d);},open:(...x)=>opens.push(x)};
 vm.runInNewContext(code('cliente_glue.js'),{window,document,Dados,URLSearchParams,location:{search,hash:'',reload(){}},console,alert:()=>{throw Error('unexpected alert');}});
 return {document,requests,renders,window,get filters(){return filters},get writes(){return writes},select(c){const e=document.els.get('ti-sel');e.value=c;e.onchange();}};
}
function dados(cartSlow=false){
 const req=[], carts=[];
 const sb={rpc:(name,args)=>{if(name==='raio_x_consulta')return Promise.resolve({data:null});const d=defer();req.push({c:args.p_cliente,...d});return d.promise;},from:table=>{let cliente, columns;const q={select:c=>{columns=c;return q;},eq:(k,v)=>{if(k==='cliente')cliente=v;return q;},order:()=>q,gte:()=>q,range:async()=>{if(cartSlow && table==='venda_mensal' && columns.includes('faixa')){const d=defer();carts.push({c:cliente,...d});return d.promise;}return {data:[]};}};return q;}};
 const window={supabase:{createClient:()=>sb}};
 vm.runInNewContext(code('cliente_dados.js'),{window,URL_SB:'fake',CHAVE:'fake',URLSearchParams,location:{search:''},console});
 return {api:window.Dados,req,carts};
}
(async()=>{
 let count=0;const test=async(name,fn)=>{await fn();count++;console.log('OK '+name);};
 await test('late A cannot replace B in screen or busy state',async()=>{const h=glue();await tick();h.select('B');h.requests[1].resolve({cliente:{nome:'B'}});await tick();h.requests[0].resolve({cliente:{nome:'A'}});await tick();assert.equal(h.renders.at(-1).cliente.nome,'B');assert.equal(h.renders.length,1);assert.equal(h.document.main.hidden,false);});
 await test('late A error cannot replace successful B',async()=>{const h=glue();await tick();h.select('B');h.requests[1].resolve({cliente:{nome:'B'}});await tick();h.requests[0].reject(Error('offline'));await tick();assert.equal(h.document.els.get('ti-estado').hidden,true);assert.equal(h.renders.at(-1).cliente.nome,'B');});
 await test('loading and error guard filter and TOPICS; retry recovers',async()=>{const h=glue();await tick();h.window.onFiltro(filtro);await h.window.onTopico('feito','x');assert.equal(h.filters,0);assert.equal(h.writes,0);assert.equal(h.document.main.hidden,true);h.requests[0].reject(Error('offline'));await tick();h.window.onFiltro(filtro);await h.window.onTopico('feito','x');assert.equal(h.filters,0);const retry=h.document.els.get('ti-estado').children[1];retry.onclick();assert.equal(h.requests.length,2);h.requests[1].resolve({cliente:{nome:'A'}});await tick();assert.equal(h.document.main.hidden,false);});
 await test('startup failure offers retry instead of unhandled rejection',async()=>{const h=glue({startError:true});await tick();const aviso=h.document.els.get('ti-estado');assert.match(aviso.children[0].textContent,/iniciar/);aviso.children[1].onclick();await tick();assert.equal(h.requests.length,1);});
 await test('empty selection invalidates pending result',async()=>{const h=glue();await tick();h.select('');h.requests[0].resolve({cliente:{nome:'A'}});await tick();assert.equal(h.renders.length,0);assert.equal(h.document.main.hidden,true);});
 await test('BRUTO commits only latest load, old load retains own data',async()=>{const h=dados();const a=h.api.carregar('A'), b=h.api.carregar('B');h.req[1].resolve({data:{perfil:{nome:'B'}}});assert.equal((await b).cliente.nome,'B');h.req[0].resolve({data:{perfil:{nome:'A'}}});assert.equal((await a).cliente.nome,'A');assert.equal(h.api.refiltrar(filtro).cliente.nome,'B');});
 await test('failed latest load never exposes previous cache',async()=>{const h=dados();const a=h.api.carregar('A');h.req[0].resolve({data:{perfil:{nome:'A'}}});await a;const b=h.api.carregar('B');assert.throws(()=>h.api.refiltrar(filtro),/indispon/);h.req[1].reject(Error('offline'));await assert.rejects(b);assert.throws(()=>h.api.refiltrar(filtro),/indispon/);});
 await test('same-client A1 B A2 does not overwrite newest cache',async()=>{const h=dados();const a1=h.api.carregar('A'),b=h.api.carregar('B'),a2=h.api.carregar('A');h.req[2].resolve({data:{perfil:{nome:'A2'}}});await a2;h.req[0].resolve({data:{perfil:{nome:'A1'}}});await a1;h.req[1].resolve({data:{perfil:{nome:'B'}}});await b;assert.equal(h.api.refiltrar(filtro).cliente.nome,'A2');});
 await test('second-stage cart query cannot mix clients or regress cache',async()=>{const h=dados(true);const a=h.api.carregar('A');h.req[0].resolve({data:{perfil:{nome:'A'}}});await tick();assert.equal(h.carts[0].c,'A');const b=h.api.carregar('B');h.req[1].resolve({data:{perfil:{nome:'B'}}});await tick();h.carts[1].resolve({data:[]});assert.equal((await b).cliente.nome,'B');h.carts[0].resolve({data:[]});assert.equal((await a).cliente.nome,'A');assert.equal(h.api.refiltrar(filtro).cliente.nome,'B');});
 console.log(`${count} tests passed; mocked providers, no network or database writes.`);
})().catch(e=>{console.error(e);process.exitCode=1;});
