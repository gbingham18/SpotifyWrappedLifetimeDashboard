/* ---------- deterministic synthetic lifetime ---------- */
const rnd=s=>()=>{s|=0;s=s+0x6D2B79F5|0;let t=Math.imul(s^s>>>15,1|s);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296};
const ART=[
 {n:"Vacations",   c:"#66D46E", pk:.10, w:.16, s:1.0, t:["Young","Relax","No Words","Telephones","Home"]},
 {n:"The 1975",    c:"#C9B26A", pk:.27, w:.19, s:.95, t:["Robbers","Somebody Else","Sincerity Is Scary","Love It If We Made It","fallingforyou"]},
 {n:"Mastodon",    c:"#2E8C3B", pk:.46, w:.14, s:1.0, t:["Blood and Thunder","Oblivion","Colony of Birchmen","Steambreather","Sultan's Curse"]},
 {n:"Disturbed",   c:"#C97F4A", pk:.55, w:.11, s:.85, t:["Liberate","Stricken","The Vengeful One","Inside the Fire","Down with the Sickness"]},
 {n:"Big Thief",   c:"#A8C86B", pk:.72, w:.17, s:.9,  t:["Not","Simulation Swarm","Certainty","Masterpiece","Cattails"]},
 {n:"Khruangbin",  c:"#8C7A5E", pk:.86, w:.16, s:.85, t:["White Gloves","August 10","Time (You and I)","So We Won't Forget","Maria También"]},
 {n:"Fleet Foxes", c:"#4FA88C", pk:.95, w:.13, s:.8,  t:["Helplessness Blues","Sunblind","White Winter Hymnal","Can I Believe You","Third of May"]}
];
const TRW=[.34,.26,.18,.13,.09];
const START=new Date(2017,0,1), END=new Date(2026,6,26);
const DAY=864e5, NDAYS=Math.round((END-START)/DAY);
/* each artist has a discovery point and a fade-out; outside that window their share is zero */
ART.forEach((a,k)=>{const r=rnd(k*613+29);a.from=a.pk-a.w*(1.45+r()*.3);a.to=a.pk+a.w*(1.6+r()*.4)});
const dateOf=i=>new Date(START.getTime()+i*DAY);

const days=[];let totalMin=0,totalPlays=0;
for(let i=0;i<NDAYS;i++){
  const r=rnd(i*7919+13), t=i/NDAYS, d=dateOf(i), dow=d.getDay();
  const wk=(dow===0||dow===6)?1.18:1.0;
  const season=1+.16*Math.sin((d.getMonth()+1)/12*Math.PI*2+1.2);
  const life=.85+.45*Math.sin(t*Math.PI*1.05)+.2*Math.sin(t*13.1);
  let mins=Math.max(0,(46*life*wk*season)*(.35+1.5*r()));
  if(r()<.07)mins*=.12;
  if(r()<.03)mins*=2.6;
  const mix=ART.map(a=>{
    if(t<a.from||t>a.to)return 0;
    const g=Math.exp(-Math.pow(t-a.pk,2)/(2*a.w*a.w))*a.s;
    return g*(.45+1.1*r())+.008;
  });
  const sum=mix.reduce((x,y)=>x+y,0);
  const share=mix.map(m=>m/sum);
  mins=Math.round(mins);
  const plays=Math.round(mins/3.6);
  totalMin+=mins;totalPlays+=plays;
  days.push({i,d,mins,plays,share,seed:i*7919+13});
}
const fmtN=n=>n.toLocaleString();
let daysListened=0;
days.forEach(d=>{if(d.mins>=1)daysListened++});
document.getElementById('lifePlays').textContent=fmtN(totalPlays);
document.getElementById('lifeHours').textContent=fmtN(Math.round(totalMin/60));
document.getElementById('lifeDays').textContent=fmtN(daysListened);

/* ---------- state ---------- */
let sel={a:0,b:NDAYS-1};
let focus=null;   /* {k} artist  |  {k,ti} track */
const isTrack=()=>focus&&focus.ti!=null;
const fArt=()=>focus?ART[focus.k]:null;
const fName=()=>!focus?null:isTrack()?ART[focus.k].t[focus.ti]:ART[focus.k].n;
const fColor=()=>focus?ART[focus.k].c:'#66D46E';

/* minutes for a day under the current entity filter */
function dMins(d,f){
  const g=f===undefined?focus:f;
  if(!g)return d.mins;
  const base=d.share[g.k]*d.mins;
  if(g.ti==null)return base;
  const r=rnd(d.seed+g.k*17+g.ti*7);
  return base*TRW[g.ti]*(.55+.9*r());
}
/* one source of truth for range totals of any entity */
function sumRange(a,b,f){let m=0;for(let i=a;i<=b;i++)m+=dMins(days[i],f);return m}
const MPP=3.6; /* minutes per play */
/* per-artist deterministic behaviour */
const behav=k=>{const r=rnd(k*4093+7);return{done:.72+r()*.24,fwd:0,seed:k}};

/* ---------- aggregation ---------- */
function agg(a,b){
  const art=ART.map(()=>0);let mins=0,plays=0;
  for(let i=a;i<=b;i++){const dd=days[i];
    const m=dMins(dd);mins+=m;plays+=m/MPP;
    dd.share.forEach((s,k)=>art[k]+=s*dd.mins);}
  return{mins,plays:Math.round(plays),art};
}
const WEEKS=[];for(let i=0;i<NDAYS;i+=7)WEEKS.push({i,b:Math.min(i+6,NDAYS-1)});
const WAGG=WEEKS.map(w=>{const art=ART.map(()=>0);let mins=0;
  for(let i=w.i;i<=w.b;i++){mins+=days[i].mins;days[i].share.forEach((s,k)=>art[k]+=s*days[i].mins)}
  return{mins,art}});
const WMAX=Math.max(...WAGG.map(w=>w.mins));

/* ---------- master timeline ---------- */
const svg=document.getElementById('timeline'),W=1100,H=118,PAD=6;
const xOf=i=>PAD+(i/(NDAYS-1))*(W-PAD*2);
const iOf=x=>Math.round(((x-PAD)/(W-PAD*2))*(NDAYS-1));
const BASE=H-16;

let hoverK=null;
const areaPath=vals=>{let p='M'+xOf(0).toFixed(1)+' '+BASE;vals.forEach((m,wi)=>{p+='L'+xOf(WEEKS[wi].i).toFixed(1)+' '+(BASE-(m/WMAX)*(H-30)).toFixed(1)});return p+'L'+xOf(NDAYS-1).toFixed(1)+' '+BASE+'Z'};
function buildTimeline(){
  let out='';
  if(!focus){
    out+=`<path d="${areaPath(WAGG.map(w=>w.mins))}" fill="#F2EDDF" fill-opacity="${hoverK==null?'.22':'.12'}"/>`;
    if(hoverK!=null){
      const a=ART[hoverK],ser=WAGG.map(w=>w.art[hoverK]);
      out+=`<path d="${areaPath(ser)}" fill="${a.c}" fill-opacity=".92"/>`;
      const e=eraOf(hoverK);
      const px2=xOf(WEEKS[WAGG.reduce((bi,w,wi)=>w.art[hoverK]>WAGG[bi].art[hoverK]?wi:bi,0)].i);
      out+=`<line x1="${px2.toFixed(1)}" x2="${px2.toFixed(1)}" y1="0" y2="${BASE}" stroke="${a.c}" stroke-opacity=".45" stroke-dasharray="2 3"/>`;
      const tot=WAGG.reduce((s,w)=>s+w.mins,0),mine=WAGG.reduce((s,w)=>s+w.art[hoverK],0);
      document.getElementById('tlLabel').textContent=`${a.n} inside all listening · ${e.sub}`;
      document.getElementById('tlPeak').textContent=`${(mine/tot*100).toFixed(1)}% of nine years · ${Math.round(mine/60).toLocaleString()} h`;
    }else{
      document.getElementById('tlLabel').textContent='Master timeline · weekly minutes, all listening';
      document.getElementById('tlPeak').textContent='hover an artist below to see their share';
    }
  }else{
    /* faint backdrop: all listening */
    let bd='M'+xOf(0).toFixed(1)+' '+BASE;
    WEEKS.forEach((w,wi)=>{bd+='L'+xOf(w.i).toFixed(1)+' '+(BASE-(WAGG[wi].mins/WMAX)*(H-30)).toFixed(1)});
    bd+='L'+xOf(NDAYS-1).toFixed(1)+' '+BASE+'Z';
    out+=`<path d="${bd}" fill="#F2EDDF" fill-opacity=".07"/>`;
    const ser=WEEKS.map(w=>{let m=0;for(let i=w.i;i<=w.b;i++)m+=dMins(days[i]);return m});
    const emax=Math.max(...ser,1);
    let p='M'+xOf(0).toFixed(1)+' '+BASE;
    ser.forEach((m,wi)=>{p+='L'+xOf(WEEKS[wi].i).toFixed(1)+' '+(BASE-(m/emax)*(H-30)).toFixed(1)});
    p+='L'+xOf(NDAYS-1).toFixed(1)+' '+BASE+'Z';
    out+=`<path d="${p}" fill="${fColor()}" fill-opacity=".9"/>`;
    const pi=ser.indexOf(emax),pd=dateOf(WEEKS[pi].i);
    document.getElementById('tlLabel').textContent=`${fName()} · weekly minutes across your whole history`;
    document.getElementById('tlPeak').textContent=`peak ${(emax/60).toFixed(1)} h in the week of ${MON[pd.getMonth()]} ${pd.getDate()}, ${pd.getFullYear()} · scaled to fit`;
  }
  out+=`<line x1="0" y1="${BASE}" x2="${W}" y2="${BASE}" stroke="#2A2620"/>`;
  out+=`<rect id="mL" x="0" y="0" width="0" height="${BASE}" fill="#0E0D0B" opacity=".72"/>`;
  out+=`<rect id="mR" x="0" y="0" width="0" height="${BASE}" fill="#0E0D0B" opacity=".72"/>`;
  out+=`<rect id="bBody" y="0" height="${BASE}" fill="transparent" cursor="grab"/>`;
  out+=`<g id="hA"><line x1="4.5" x2="4.5" y1="0" y2="${BASE}" stroke="#66D46E" stroke-width="1.5"/><rect y="${H/2-16}" width="9" height="28" rx="2" fill="#66D46E" cursor="ew-resize"/></g>`;
  out+=`<g id="hB"><line x1="4.5" x2="4.5" y1="0" y2="${BASE}" stroke="#66D46E" stroke-width="1.5"/><rect y="${H/2-16}" width="9" height="28" rx="2" fill="#66D46E" cursor="ew-resize"/></g>`;
  svg.innerHTML=out;
  paintBrush();
}
const $=id=>document.getElementById(id);
function paintBrush(){
  const xa=xOf(sel.a),xb=xOf(sel.b);
  $('mL').setAttribute('width',Math.max(0,xa));
  $('mR').setAttribute('x',xb);$('mR').setAttribute('width',Math.max(0,W-xb));
  $('bBody').setAttribute('x',xa);$('bBody').setAttribute('width',Math.max(1,xb-xa));
  $('hA').setAttribute('transform',`translate(${xa-4.5},0)`);
  $('hB').setAttribute('transform',`translate(${xb-4.5},0)`);
}
let drag=null;
const px=e=>{const r=svg.getBoundingClientRect();return (e.clientX-r.left)/r.width*W};
svg.addEventListener('pointerdown',e=>{
  const x=px(e),xa=xOf(sel.a),xb=xOf(sel.b);
  if(Math.abs(x-xa)<9)drag={m:'a'};
  else if(Math.abs(x-xb)<9)drag={m:'b'};
  else if(x>xa&&x<xb)drag={m:'pan',x0:x,a0:sel.a,b0:sel.b};
  else{const i=iOf(x);sel={a:i,b:i};drag={m:'b'}}
  svg.setPointerCapture(e.pointerId);move(e);
});
svg.addEventListener('pointermove',e=>{if(drag)move(e)});
svg.addEventListener('pointerup',()=>drag=null);
svg.addEventListener('dblclick',()=>{sel={a:0,b:NDAYS-1};render()});
function move(e){
  const i=Math.max(0,Math.min(NDAYS-1,iOf(px(e))));
  if(drag.m==='a')sel.a=Math.min(i,sel.b);
  else if(drag.m==='b')sel.b=Math.max(i,sel.a);
  else{const d=Math.round(((px(e)-drag.x0)/(W-PAD*2))*(NDAYS-1));let a=drag.a0+d,b=drag.b0+d;
    if(a<0){b-=a;a=0}if(b>NDAYS-1){a-=b-(NDAYS-1);b=NDAYS-1}sel={a,b}}
  render();
}
const MON=["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
$('axis').innerHTML=[2017,2018,2019,2020,2021,2022,2023,2024,2025,2026].map(y=>`<span>${y}</span>`).join('');

/* ---------- heavy rotation: artists with the most weight, and where it fell ---------- */
const TOTMINS=WAGG.reduce((s,w)=>s+w.mins,0);
const ERAS=ART.map((a,k)=>{
  const c=Math.round(a.pk*NDAYS),sp=Math.round(a.w*NDAYS*.95);
  const A=Math.max(0,c-sp),B=Math.min(NDAYS-1,c+sp);
  const mins=WAGG.reduce((s,w)=>s+w.art[k],0);
  let pw=0;WAGG.forEach((w,wi)=>{if(w.art[k]>WAGG[pw].art[k])pw=wi});
  const pd=dateOf(WEEKS[pw].i);
  return{k,a,A,B,mins,share:mins/TOTMINS,peak:pd,
    label:`${(mins/TOTMINS*100).toFixed(1)}%`,
    sub:`heaviest ${MON[pd.getMonth()]} ’${String(pd.getFullYear()).slice(2)}`};
}).sort((x,y)=>y.mins-x.mins);
const eraOf=k=>ERAS.find(e=>e.k===k);
$('chips').innerHTML=`<span class="chipslbl">Heavy rotation</span><button class="chip" data-all="1"><span class="dot" style="background:var(--ink-faint)"></span>All time <span class="yr">2017–2026</span></button>`+
 ERAS.map(e=>`<button class="chip" data-era="${e.k}"><span class="dot" style="background:${e.a.c}"></span>${e.a.n} <span class="yr">${e.label}</span></button>`).join('');
function setHover(k){if(focus||hoverK===k)return;hoverK=k;buildTimeline()}
window.setHover=setHover;
$('chips').addEventListener('pointerover',ev=>{const b=ev.target.closest('.chip');setHover(b&&b.dataset.era?+b.dataset.era:null)});
$('chips').addEventListener('pointerleave',()=>setHover(null));
$('panelBody').addEventListener('pointerover',ev=>{const el=ev.target.closest('.band');setHover(el?+el.dataset.era:null)});
$('panelBody').addEventListener('pointerleave',()=>setHover(null));
$('chips').addEventListener('click',ev=>{
  const b=ev.target.closest('.chip');if(!b)return;
  if(b.dataset.all){sel={a:0,b:NDAYS-1};setFocus(null)}
  else setFocus({k:+b.dataset.era});
});

/* ---------- entity search ---------- */
const ENTS=[];
ART.forEach((a,k)=>{ENTS.push({label:a.n,k,ti:null});a.t.forEach((t,ti)=>ENTS.push({label:`${t} — ${a.n}`,k,ti}))});
$('entities').innerHTML=ENTS.map(e=>`<option value="${e.label.replace(/"/g,'&quot;')}"></option>`).join('');
$('search').addEventListener('change',e=>{
  const v=e.target.value.trim().toLowerCase();
  const hit=ENTS.find(x=>x.label.toLowerCase()===v)||ENTS.find(x=>x.label.toLowerCase().startsWith(v));
  if(hit){setFocus(hit.ti==null?{k:hit.k}:{k:hit.k,ti:hit.ti});e.target.value=''}
});
function setFocus(f){focus=f;hoverK=null;buildTimeline();render()}
window.setFocus=setFocus;

/* ---------- lifetime entity stats ---------- */
function entStats(f){
  let mins=0,first=-1,last=-1,best={m:0,i:0};
  for(let i=0;i<NDAYS;i++){const m=dMins(days[i],f);mins+=m;
    if(m>=1){if(first<0)first=i;last=i;if(m>best.m)best={m,i}}}
  const per=MPP;
  const lifeTot=ART.map((a,k)=>{let s=0;for(let i=0;i<NDAYS;i++)s+=days[i].share[k]*days[i].mins;return s});
  const rank=lifeTot.map((v,k)=>({k,v})).sort((x,y)=>y.v-x.v).findIndex(o=>o.k===f.k)+1;
  const b=behav(f.k),done=f.ti==null?b.done:Math.min(.97,b.done+(rnd(f.k*31+f.ti)()*.2-.06));
  return{mins,plays:Math.round(mins/per),first,last,best,rank,done,
    bestPlays:Math.round(best.m/per)};
}
/* per-year rank of the focused artist */
function yearRanks(k){
  const out=[];
  for(let y=2017;y<=2026;y++){
    const tot=ART.map(()=>0);let any=0;
    days.forEach(d=>{if(d.d.getFullYear()===y){d.share.forEach((s,j)=>tot[j]+=s*d.mins);any+=d.mins}});
    if(!any)continue;
    const r=tot.map((v,j)=>({j,v})).sort((x,y2)=>y2.v-x.v).findIndex(o=>o.j===k)+1;
    out.push({y,mins:tot[k],rank:r});
  }
  return out;
}

/* ---------- render ---------- */
const fmtD=d=>`${MON[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
const hoursOf=(m,unit)=>(unit||(m>=600?'h':'m'))==='h'?fmtN(Math.round(m/60))+" h":Math.round(m)+" min";
function render(){
  const {a,b}=sel,span=b-a+1,A=agg(a,b);
  /* filter chips */
  $('timeChip').innerHTML=`<span class="fk">Time</span>${fmtD(dateOf(a))} → ${fmtD(dateOf(b))} · ${span}d`+
    (span<NDAYS?`<button title="Clear time filter" data-clear="time">×</button>`:'');
  $('entChipSlot').innerHTML=focus?`<div class="fchip ent" style="color:${fColor()}"><span class="fk">${isTrack()?'Track':'Artist'}</span>${fName()}${isTrack()?` <span style="color:var(--ink-faint)">${ART[focus.k].n}</span>`:''}<button title="Clear entity filter" data-clear="ent">×</button></div>`:'';
  paintBrush();
  document.querySelectorAll('.chip').forEach(c=>{
    let on=false;
    if(c.dataset.all)on=(a===0&&b===NDAYS-1&&!focus);
    else on=!!focus&&focus.k===+c.dataset.era&&focus.ti==null;
    c.classList.toggle('on',on);
  });
  renderTiles(a,b,A);
  renderEntHead(a,b,A);
  if(focus&&span>730)viewEntityYears(a,b);
  else if(span>730)viewEras(a,b,A);
  else if(span>92)viewMonths(a,b);
  else if(span>7)viewCalendar(a,b);
  else viewSessions(a,b);
  syncURL();
}
document.querySelector('.fbar').addEventListener('click',e=>{
  const b=e.target.closest('[data-clear]');if(!b)return;
  if(b.dataset.clear==='time'){sel={a:0,b:NDAYS-1};render()}
  else setFocus(null);
});
function head(t,z,s){$('panelTitle').textContent=t;$('zoomTag').textContent=z;$('panelSub').textContent=s}

function renderEntHead(a,b,A){
  if(!focus){$('entHead').innerHTML='';return}
  const s=entStats(focus),inR=A.mins;
  const cells=[
    ['In this range',`${hoursOf(inR)} <small>· ${fmtN(A.plays)} plays</small>`],
    ['Lifetime',`${fmtN(Math.round(s.mins/60))} h <small>· ${fmtN(s.plays)} plays</small>`],
    ['First play',fmtD(dateOf(s.first))],
    ['Most recent',fmtD(dateOf(s.last))],
    isTrack()?['Finished',`${Math.round(s.done*100)}% <small>of plays</small>`]
             :['Rank',`#${s.rank} <small>of your artists</small>`]
  ];
  $('entHead').innerHTML=`<div class="ent">
    <div class="entname"><span class="dot" style="background:${fColor()}"></span>${fName()}</div>
    <div class="entkind">${isTrack()?`Track · <b>${ART[focus.k].n}</b>`:'Artist'}${isTrack()?'':` · <b>${ART[focus.k].t.length} tracks played</b>`}</div>
    <div class="entstats">${cells.map(c=>`<div class="st"><div class="k">${c[0]}</div><div class="v">${c[1]}</div></div>`).join('')}</div>
  </div>`;
}

function renderTiles(a,b,A){
  const T=[];
  if(!focus){
    const order=A.art.map((v,k)=>({k,v})).sort((x,y)=>y.v-x.v).filter(o=>o.v>0);
    const amax=order[0]?order[0].v:1,unit=amax>=600?'h':'m';
    T.push(['Top artists in range',order.slice(0,5).map((o,j)=>`
      <div class="row click" data-art="${o.k}"><span class="n">${String(j+1).padStart(2,'0')}</span><span class="nm">${ART[o.k].n}</span><span class="val">${hoursOf(o.v,unit)}</span></div>
      <div class="meter"><i style="width:${(o.v/amax*100).toFixed(1)}%;background:${ART[o.k].c}"></i></div>`).join('')||`<div class="empty">Nothing in range.</div>`]);
    const tr=[];order.slice(0,4).forEach(o=>ART[o.k].t.forEach((t,ti)=>tr.push({t,k:o.k,ti,art:ART[o.k],v:sumRange(a,b,{k:o.k,ti})})));
    tr.sort((x,y)=>y.v-x.v);
    const tmax=tr[0]?tr[0].v:1;
    T.push(['Top tracks in range',tr.slice(0,5).map((o,j)=>`
      <div class="row click" data-art="${o.k}" data-tr="${o.ti}"><span class="n">${String(j+1).padStart(2,'0')}</span><span class="nm">${o.t}<small>${o.art.n}</small></span><span class="val">${fmtN(Math.round(o.v/MPP))}×</span></div>
      <div class="meter"><i style="width:${(o.v/tmax*100).toFixed(1)}%;background:${o.art.c}"></i></div>`).join('')||`<div class="empty">Nothing in range.</div>`]);
  }else if(!isTrack()){
    const k=focus.k;
    const tr=ART[k].t.map((t,ti)=>({t,ti,v:sumRange(a,b,{k,ti})}));
    tr.sort((x,y)=>y.v-x.v);const tmax=tr[0].v||1;
    T.push([`${ART[k].n} tracks in range`,tr.map((o,j)=>`
      <div class="row click" data-art="${k}" data-tr="${o.ti}"><span class="n">${String(j+1).padStart(2,'0')}</span><span class="nm">${o.t}</span><span class="val">${fmtN(Math.round(o.v/MPP))}×</span></div>
      <div class="meter"><i style="width:${(o.v/tmax*100).toFixed(1)}%;background:${ART[k].c}"></i></div>`).join('')]);
    const yr=yearRanks(k),ymax=Math.max(...yr.map(y=>y.mins),1);
    T.push(['Where they charted',`<div class="rank">`+yr.filter(y=>y.mins>60).map(y=>`
      <div class="row"><span class="n">${String(y.y).slice(2)}</span><span class="nm">#${y.rank} artist${y.rank===1?' — your top':''}</span><span class="val">${hoursOf(y.mins,'h')}</span></div>
      <div class="meter"><i style="width:${(y.mins/ymax*100).toFixed(1)}%;background:${ART[k].c}"></i></div>`).join('')+`</div>`]);
  }else{
    const s=entStats(focus),k=focus.k;
    const done=s.done,fwd=(1-done)*.78,other=1-done-fwd;
    T.push(['Why it ended',`<div class="reasons">
      ${[['trackdone — played out',done,ART[k].c],['fwdbtn — skipped ahead',fwd,'#C97F4A'],['backbtn / other',other,'#847C6B']].map(x=>`
        <div class="rz"><span>${x[0]}</span><span class="rv">${Math.round(x[1]*100)}%</span>
        <span class="rbar"><i style="width:${(x[1]*100).toFixed(1)}%;background:${x[2]}"></i></span></div>`).join('')}
    </div>`]);
    const tops=days.map(d=>({i:d.i,m:dMins(d,focus)})).sort((x,y)=>y.m-x.m).slice(0,4);
    T.push(['Biggest days',tops.map((o,j)=>`
      <div class="row click" data-day="${o.i}"><span class="n">${String(j+1).padStart(2,'0')}</span><span class="nm">${fmtD(dateOf(o.i))}</span><span class="val">${Math.round(o.m/MPP)}×</span></div>`).join('')]);
  }
  $('tiles').innerHTML=T.map(t=>`<div class="card tile"><h3>${t[0]}</h3><div class="rank">${t[1]}</div></div>`).join('');
  $('tiles').querySelectorAll('[data-art]').forEach(el=>el.onclick=()=>{
    const k=+el.dataset.art,ti=el.dataset.tr!=null?+el.dataset.tr:null;
    if(focus&&focus.k===k&&(focus.ti??null)===ti)setFocus(null);
    else setFocus(ti==null?{k}:{k,ti});
  });
  $('tiles').querySelectorAll('[data-day]').forEach(el=>el.onclick=()=>{const i=+el.dataset.day;sel={a:i,b:i};render()});
  $('tiles').querySelectorAll('.row').forEach(el=>{
    if(focus&&el.dataset.art!=null){
      const k=+el.dataset.art,ti=el.dataset.tr!=null?+el.dataset.tr:null;
      el.classList.toggle('on',focus.k===k&&(focus.ti??null)===ti);
    }
  });
}

function viewEras(a,b,A){
  head(focus?`${fName()} · year by year`:"Year by year","Level 01 · Lifetime",focus?"Only this "+(isTrack()?"track":"artist")+" is counted. Click a year to zoom into it.":"Total hours per year. Click a year to zoom into it.");
  const buckets=new Map();
  for(let i=a;i<=b;i++){const d=days[i].d,key=d.getFullYear();
    if(!buckets.has(key))buckets.set(key,{d,mins:0,art:ART.map(()=>0),a:i,b:i});
    const o=buckets.get(key);o.mins+=dMins(days[i]);o.b=i;days[i].share.forEach((s,k)=>o.art[k]+=s*days[i].mins)}
  const arr=[...buckets.values()],mx=Math.max(...arr.map(o=>o.mins),1);
  $('panelBody').innerHTML=`<div class="months years-wide">`+arr.map(o=>`
    <div class="mcol" data-a="${o.a}" data-b="${o.b}" title="${o.d.getFullYear()} · ${hoursOf(o.mins)}">
      <span class="ytot">${hoursOf(o.mins,'h')}</span>
      <div class="mstack" style="height:${(o.mins/mx*100).toFixed(1)}%"><div style="height:100%;background:${fColor()}"></div></div>
      <span class="mlbl">’${String(o.d.getFullYear()).slice(2)}</span>
    </div>`).join('')+`</div>`;
  $('panelBody').querySelectorAll('.mcol').forEach(el=>el.onclick=()=>{sel={a:+el.dataset.a,b:+el.dataset.b};render()});
}
function viewEntityYears(a,b){
  const k=focus.k;
  head(`Your history with ${fName()}`,"Level 01 · Lifetime","Hours per year. Click a year to zoom into it.");
  const yr=[];
  for(let y=2017;y<=2026;y++){let m=0,fa=-1,fb=-1;
    days.forEach(d=>{if(d.d.getFullYear()===y){m+=dMins(d);if(fa<0)fa=d.i;fb=d.i}});
    if(fa>=0)yr.push({y,m,fa,fb})}
  const mx=Math.max(...yr.map(o=>o.m),1),ranks=isTrack()?null:yearRanks(k);
  $('panelBody').innerHTML=`<div class="years">`+yr.map(o=>{
    const rk=ranks&&ranks.find(r=>r.y===o.y);
    return `<div class="ycol" data-a="${o.fa}" data-b="${o.fb}" title="${o.y} · ${hoursOf(o.m)}">
      <span class="yrank">${o.m>30?(rk?'#'+rk.rank:hoursOf(o.m,'h')):''}</span>
      <span class="ybar" style="height:${(o.m/mx*100).toFixed(1)}%;background:${fColor()}"></span>
      <span class="ylbl">’${String(o.y).slice(2)}</span></div>`}).join('')+`</div>`;
  $('panelBody').querySelectorAll('.ycol').forEach(el=>el.onclick=()=>{sel={a:+el.dataset.a,b:+el.dataset.b};render()});
}
function viewMonths(a,b){
  head(focus?`${fName()} · month by month`:"Month by month","Level 02 · Multi-month",focus?"Only this "+(isTrack()?"track":"artist")+" is counted. Click a month to open its calendar.":"Total minutes per month. Click a month to open its calendar.");
  const buckets=new Map();
  for(let i=a;i<=b;i++){const d=days[i].d,key=d.getFullYear()+'-'+d.getMonth();
    if(!buckets.has(key))buckets.set(key,{d,mins:0,art:ART.map(()=>0),a:i,b:i});
    const o=buckets.get(key);o.mins+=dMins(days[i]);o.b=i;days[i].share.forEach((s,k)=>o.art[k]+=s*days[i].mins)}
  const arr=[...buckets.values()],mx=Math.max(...arr.map(o=>o.mins),1),step=Math.ceil(arr.length/14);
  $('panelBody').innerHTML=`<div class="months">`+arr.map((o,j)=>`
    <div class="mcol" data-a="${o.a}" data-b="${o.b}" title="${MON[o.d.getMonth()]} ${o.d.getFullYear()} · ${hoursOf(o.mins)}">
      <div class="mstack" style="height:${(o.mins/mx*100).toFixed(1)}%"><div style="height:100%;background:${fColor()}"></div></div>
      <span class="mlbl">${j%step===0?MON[o.d.getMonth()]+(o.d.getMonth()===0||j===0?" ’"+String(o.d.getFullYear()).slice(2):""):""}</span>
    </div>`).join('')+`</div>`;
  $('panelBody').querySelectorAll('.mcol').forEach(el=>el.onclick=()=>{sel={a:+el.dataset.a,b:+el.dataset.b};render()});
}
function viewCalendar(a,b){
  head(focus?`${fName()} · daily rhythm`:"Daily rhythm","Level 03 · Calendar",focus?`Intensity is minutes of ${fName()} only. Click a day to open its sessions.`:"Intensity is minutes listened. Click a day to open its sessions.");
  const vals=[];for(let i=a;i<=b;i++)vals.push(dMins(days[i]));
  const mx=Math.max(...vals,1),cals=[];let cur=null;
  for(let i=a;i<=b;i++){const d=days[i].d,key=d.getFullYear()+'-'+d.getMonth();
    if(!cur||cur.key!==key){cur={key,d,cells:[]};cals.push(cur);
      for(let k=0;k<d.getDay();k++)cur.cells.push(null)}
    cur.cells.push({d:days[i],m:dMins(days[i])})}
  const col=fColor();
  $('panelBody').innerHTML=`<div class="cals">`+cals.map(c=>`<div class="cal">
      <div class="calhd">${MON[c.d.getMonth()]} ${c.d.getFullYear()}</div>
      <div class="calgrid">${c.cells.map(x=>x?`<div class="day" data-i="${x.d.i}" title="${fmtD(x.d.d)} · ${Math.round(x.m)} min" style="background:${x.m>=1?`color-mix(in oklab, ${col} ${Math.round(12+x.m/mx*88)}%, #16150F)`:'var(--line-soft)'}"></div>`:`<div class="day blank"></div>`).join('')}</div>
    </div>`).join('')+`</div>
    <div class="legend"><span>Less</span><i style="background:var(--line-soft)"></i><i style="background:color-mix(in oklab,${col} 30%,#16150F)"></i><i style="background:color-mix(in oklab,${col} 60%,#16150F)"></i><i style="background:${col}"></i><span>More</span></div>`;
  $('panelBody').querySelectorAll('.day[data-i]').forEach(el=>el.onclick=()=>{const i=+el.dataset.i;sel={a:i,b:i};render()});
}
function viewSessions(a,b){
  const d=days[a];
  head(fmtD(d.d),"Level 04 · Session",focus?`Every play in order — ${fName()} highlighted, everything else dimmed.`:"Every play, in order. Bar length is time played; hatched bars were skipped.");
  const r=rnd(d.seed+91),out=[];
  const nS=d.mins<40?1:d.mins<160?2:3;
  let clock=7+Math.floor(r()*4);
  for(let s=0;s<nS;s++){
    const mins=d.mins/nS,tracks=[];let used=0,guard=0;
    const shuffle=r()<.55;
    while(used<mins&&guard++<40){
      const pick=weighted(d.share,r()),art=ART[pick];
      const ti=Math.floor(r()*art.t.length);
      const full=2.8+r()*2.6,skipped=r()<(shuffle?.26:.08);
      const played=skipped?full*(.06+r()*.28):full;
      tracks.push({k:pick,ti,t:art.t[ti],art,played,skipped});used+=played;
    }
    if(!tracks.length)continue;
    const hit=!focus||tracks.some(t=>t.k===focus.k&&(!isTrack()||t.ti===focus.ti));
    if(!hit)continue;
    const mm=Math.round(used),h=Math.floor(clock),mi=Math.floor(r()*60);
    const eh=Math.floor(clock+used/60)%24;
    out.push(`<div class="session"><div class="shead">
        <span class="stime">${t12(h)}${String(mi).padStart(2,'0')}${ap(h)} – ${t12(eh)}${String((mi+mm)%60).padStart(2,'0')}${ap(eh)}</span>
        <span class="smeta">${tracks.length} tracks · ${mm} min · ${r()<.5?'iPhone':'macOS'}</span>
        <span class="tag">${shuffle?'shuffle grazing':'album straight through'}</span></div>
      <div class="tracks">${tracks.map(t=>{
        const on=!focus||(t.k===focus.k&&(!isTrack()||t.ti===focus.ti));
        return `<div class="trk${t.skipped?' skip':''}${on?'':' dim'}">
        <span class="tt">${t.played<1?'0:'+String(Math.round(t.played*60)).padStart(2,'0'):Math.floor(t.played)+':'+String(Math.round(t.played%1*60)).padStart(2,'0')}</span>
        <span class="trkin"><span class="tbar" data-art="${t.k}" data-tr="${t.ti}" style="width:${Math.min(100,t.played/6.2*100).toFixed(1)}%;background:${t.art.c}">${t.t} <span style="opacity:.6">— ${t.art.n}</span></span>${t.skipped?'<span class="sk">skipped</span>':''}</span></div>`}).join('')}</div></div>`);
    clock+=used/60+1.4+r()*3;if(clock>23)clock=23;
  }
  $('panelBody').innerHTML=`<div class="daynav" style="margin-bottom:14px"><button id="pd">‹</button><button id="nd">›</button></div>`+
    (out.join('')?`<div class="sessions">${out.join('')}</div>`:`<div class="empty">${focus?`No ${fName()} plays on this day.`:'No listening on this day.'}</div>`);
  $('pd').onclick=()=>{if(sel.a>0){sel={a:sel.a-1,b:sel.a-1};render()}};
  $('nd').onclick=()=>{if(sel.b<NDAYS-1){sel={a:sel.b+1,b:sel.b+1};render()}};
  $('panelBody').querySelectorAll('.tbar[data-art]').forEach(el=>el.onclick=()=>{
    const k=+el.dataset.art,ti=+el.dataset.tr;
    if(focus&&focus.k===k&&focus.ti===ti)setFocus({k});else setFocus({k,ti});
  });
}
const t12=h=>((h%12)||12)+':';
const ap=h=>h<12?'am':'pm';
function weighted(w,r){let s=w.reduce((x,y)=>x+y,0)*r,i=0;while(i<w.length&&(s-=w[i])>0)i++;return Math.min(i,w.length-1)}

/* ---------- URL state ---------- */
const iso=i=>dateOf(i).toISOString().slice(0,10);
function syncURL(){
  const p=new URLSearchParams();
  if(sel.a!==0||sel.b!==NDAYS-1){p.set('from',iso(sel.a));p.set('to',iso(sel.b))}
  if(focus){p.set('artist',ART[focus.k].n);if(isTrack())p.set('track',ART[focus.k].t[focus.ti])}
  const h='#'+p.toString();
  if(location.hash!==h){try{history.replaceState(null,'',h)}catch(e){}}
}
function readURL(){
  const p=new URLSearchParams(location.hash.slice(1));
  const di=s=>{const t=Date.parse(s+'T00:00:00');return isNaN(t)?null:Math.max(0,Math.min(NDAYS-1,Math.round((t-START.getTime())/DAY)))};
  const f=p.get('from')&&di(p.get('from')),t=p.get('to')&&di(p.get('to'));
  if(f!=null&&t!=null&&f<=t)sel={a:f,b:t};
  const an=p.get('artist');
  if(an){const k=ART.findIndex(x=>x.n.toLowerCase()===an.toLowerCase());
    if(k>=0){const tn=p.get('track');const ti=tn?ART[k].t.findIndex(x=>x.toLowerCase()===tn.toLowerCase()):-1;
      focus=ti>=0?{k,ti}:{k}}}
}
window.setRange=(a,b)=>{sel={a,b};render()};

sel={a:NDAYS-1-365*3,b:NDAYS-1};
readURL();
buildTimeline();
render();
