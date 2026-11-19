const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
const root=path.resolve(__dirname,'..');
const source=fs.readFileSync(path.join(root,'src/views/Dashboard.js'),'utf8');
function helpers(){const ctx={window:{},console,Chart:{getChart:()=>null}};vm.createContext(ctx);vm.runInContext(source,ctx);return ctx;}
function payload(value){return {status:'success',totalSesiones:value,totalAlumnos:value*10,totalHoras:value,currentWeekData:{count:value},chartLabels:['Sem 44'],chartSesiones:[value],chartAlumnos:[value*10]};}
function reader(){
 const nodes=new Map();const el=id=>{if(!nodes.has(id))nodes.set(id,{value:'Todos',innerText:'25',textContent:'',hidden:true,selectedOptions:[{value:'Todos'}],setAttribute(k,v){this[k]=v}});return nodes.get(id)};
 const timers=new Map();let timerId=0;let calls=[];let waiting=[];
 const ctx={console,window:{_lastDashData:payload(25),tsInstances:{}},document:{getElementById:el},isAdmin:true,currentUser:'demo',isRangeMode:false,active:()=>true,statsRequest:0,statsTimer:null,
 setTimeout:fn=>{timers.set(++timerId,fn);return timerId},clearTimeout:id=>timers.delete(id),
 api:{getDashboardStats:params=>{calls.push(params);return new Promise((resolve,reject)=>waiting.push({resolve,reject}))}},
 renderCharts:async()=>true,updateWeekSelect(){},renderAdminStats(){}};
 vm.createContext(ctx);
 const a=source.indexOf('    const loadStats = (force = false)');const b=source.indexOf('    // Botón de Limpiar Filtros',a);
 vm.runInContext(source.slice(a,b)+'\nthis.loadStats=loadStats;',ctx);
 return {ctx,el,calls,waiting,run(){const jobs=[...timers.values()];timers.clear();jobs.forEach(fn=>fn())},settle:()=>new Promise(r=>setImmediate(r))};
}
test('multi-select keeps Todos exclusive and normalizes empty selection',()=>{
 const c=helpers();const normalize=x=>JSON.stringify(c.normalizeDashboardSelection(x,true));
 assert.equal(normalize(['Todos','Online']),JSON.stringify(['Online']));assert.equal(normalize(['Online','Todos']),JSON.stringify(['Todos']));assert.equal(normalize([]),JSON.stringify(['Todos']));assert.equal(normalize(['Online','Online']),JSON.stringify(['Online']));
});
test('chart response accepts numeric strings and avoids scalar totals as datasets',()=>{
 const c=helpers();const n=c.normalizeDashboardCharts({chartLabels:['Sem 1','Sem 2'],chartSesiones:['3','no'],alumnos:12,pieLabels:['Online'],pieData:['2.5']});
 assert.equal(JSON.stringify(n.weekly.sessions),'[3,0]');assert.equal(JSON.stringify(n.weekly.students),'[0,0]');assert.equal(n.methods.values[0],2.5);
});
test('empty response yields explicit zero series without throwing',()=>{
 const c=helpers();const n=c.normalizeDashboardCharts({chartLabels:[],chartSesiones:[],chartAlumnos:[],pieLabels:[],pieData:[]});assert.equal(n.weekly.labels[0],'Sin datos');assert.equal(n.weekly.sessions[0],0);
});
test('updating chart preserves canvas and chart instance without destruction',()=>{
 const c=helpers();const canvas={};const chart={canvas,data:{},options:{},config:{options:{}},update(mode){this.mode=mode},destroy(){throw Error('must not destroy')}};c.Chart.getChart=()=>chart;
 const config={data:{labels:['Sem 1'],datasets:[{data:[5]}]},options:{responsive:true}};
 assert.equal(c.updateDashboardChart(canvas,chart,config),chart);assert.equal(chart.data,config.data);assert.equal(chart.mode,'none');
});
test('failed chart update restores the previous data',()=>{
 const c=helpers();const canvas={};const old={labels:['Anterior']};let count=0;
 const chart={canvas,data:old,options:{},config:{options:{}},update(){if(++count===1)throw Error('render failed')}};c.Chart.getChart=()=>chart;
 assert.throws(()=>c.updateDashboardChart(canvas,chart,{data:{labels:['Nueva']},options:{}}));assert.equal(chart.data,old);assert.equal(count,2);
});
test('rapid filter changes debounce into a single request with the final product',async()=>{
 const f=reader();f.el('dashboardDevice').value='Producto A';f.ctx.loadStats();f.el('dashboardDevice').value='Producto B';f.ctx.loadStats();f.run();assert.equal(f.calls.length,1);assert.equal(f.calls[0].device,'Producto B');
 f.waiting[0].resolve(payload(8));await f.settle();assert.equal(f.el('stat_sesiones').innerText,8);
});
test('out-of-order responses cannot replace the latest selected filters',async()=>{
 const f=reader();f.ctx.loadStats();f.run();f.el('dashboardDevice').value='Producto B';f.ctx.loadStats();f.run();
 f.waiting[1].resolve(payload(9));await f.settle();f.waiting[0].resolve(payload(2));await f.settle();assert.equal(f.el('stat_sesiones').innerText,9);assert.equal(f.ctx.window._lastDashData.totalSesiones,9);
});
test('loading and failed requests keep prior values and offer retry',async()=>{
 const f=reader();f.ctx.loadStats();assert.equal(f.el('stat_count').innerText,'25');f.run();f.waiting[0].reject(Error('mock offline'));await f.settle();
 assert.equal(f.el('stat_count').innerText,'25');assert.equal(f.el('dashboardRetry').hidden,false);assert.match(f.el('dashboardDataStatus').textContent,/últimos datos/);
});
test('each request carries month, product and training type together',()=>{
 const f=reader();f.el('dashboardMonth').value='Octubre,Noviembre';f.ctx.window.tsInstances.dashboardMethodology={getValue:()=>['Presencial','Online']};f.ctx.window.tsInstances.dashboardDevice={getValue:()=> 'Xiaomi 18 Pro Series'};f.ctx.loadStats();f.run();assert.equal(f.calls[0].month,'Octubre,Noviembre');assert.equal(f.calls[0].methodology,'Presencial,Online');assert.equal(f.calls[0].device,'Xiaomi 18 Pro Series');
 f.waiting[0].resolve(payload(5));
});
test('removed calendar is absent from navigation, view registry and app shell',()=>{
 assert.equal(fs.existsSync(path.join(root,'src/views/Calendar.js')),false);
 assert.ok(!fs.readFileSync(path.join(root,'index.html'),'utf8').includes('href="#calendar"'));
 for(const file of ['src/main.js','sw.js'])assert.ok(!fs.readFileSync(path.join(root,file),'utf8').includes('src/views/Calendar.js'));
});
