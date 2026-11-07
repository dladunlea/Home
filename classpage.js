/* Shared engine for every class page. Each page sets window.CLASS_CONFIG before loading this file. */
const CLASSES = [
  { file:'math.html',     icon:'➗', name:'Math' },
  { file:'physics.html',  icon:'🔬', name:'Physics' },
  { file:'advisory.html', icon:'🧑‍🏫', name:'Advisory' },
  { file:'music.html',    icon:'🎵', name:'Music' },
];
const CONFIG = Object.assign({
  KEY:'class', TITLE:'Class', SUBTITLE:'Mrs. Dunlea · C119',
  CSV_URL:'', SHEET_ID:'', SHEET_TAB:'Student View', FALL_YEAR:2026,
  WARMUP_APP:'', CHECKIN_FORM:'', APPS:[],
}, window.CLASS_CONFIG||{});

/*LOGIC-START*/
function parseCSV(text){
  const rows=[]; let row=[], f='', q=false;
  for(let i=0;i<text.length;i++){
    const c=text[i];
    if(q){ if(c==='"'){ if(text[i+1]==='"'){f+='"';i++;} else q=false; } else f+=c; }
    else if(c==='"') q=true;
    else if(c===','){ row.push(f); f=''; }
    else if(c==='\n'||c==='\r'){ if(c==='\r'&&text[i+1]==='\n') i++; row.push(f); rows.push(row); row=[]; f=''; }
    else f+=c;
  }
  if(f!==''||row.length){ row.push(f); rows.push(row); }
  return rows.map(r=>r.map(s=>s.trim()));
}

function isoOf(d){ return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
const DAY_RE=/^(Mon|Tue|Wed|Thu|Fri|Sat|Sun)\s+(\d{1,2})\/(\d{1,2})$/;

function buildModel(rows, fallYear){
  const sections=[], days=[]; let sec=null, week='';
  for(const r of rows){
    const a=r[0]||'', b=r[1]||'';
    if(a==='Week' && b==='Date') continue;           // header row
    const m=b.match(DAY_RE);
    if(m){
      const startsWeek=!!a; if(a) week=a;
      const mo=+m[2], dd=+m[3], yr = mo>=7 ? fallYear : fallYear+1;
      const date=new Date(yr,mo-1,dd), topic=r[2]||'';
      const day={label:b, week, startsWeek, date, iso:isoOf(date), topic,
        wu:r[3]||'', cp:r[4]||'', wuLink:r[5]||'', etLink:r[6]||'', practice:r[7]||'', et:r[8]||'',
        noSchool: !topic || /no school/i.test(topic), section:sec};
      days.push(day); if(sec) sec.days.push(day);
    } else if(a){
      sec={name:a, question:r[2]||'', what:r[9]||'', why:r[10]||'', how:r[11]||'', days:[]};
      sections.push(sec);
    }
  }
  // Which unit's What/Why/How goes with each section
  sections.forEach((s,i)=>{
    if(s.what){ s.unit=s; return; }
    const prev=sections.slice(0,i).reverse().find(x=>x.what);
    const next=sections.slice(i+1).find(x=>x.what);
    s.unit = /start|first/i.test(s.name) ? (next||prev) : (prev||next);
  });
  days.forEach(d=>{ d.unit = d.section ? d.section.unit : null; });
  return {sections, days};
}

function shortName(n){ return (n||'').replace(/\s*\(\d+\s*days?\)\s*$/i,''); }
function appFor(unit){ return unit ? (CONFIG.APPS.find(a=>a.match.test(unit.name))||null) : null; }
function classDays(days){ return days.filter(d=>!d.noSchool); }
function pickDay(days, todayIso){ const c=classDays(days); return c.find(d=>d.iso>=todayIso) || c[c.length-1]; }

function tasksFor(day){
  const t=[]; if(!day) return t;
  if(day.cp) t.push({id:'cp', icon:'📝', title:day.cp, sub:'Quiz on what we learned recently. It replaces the warm-up today.', url:CONFIG.WARMUP_APP||day.wuLink, btn:'Start'});
  else if(day.wu) t.push({id:'wu', icon:'🔥', title:'Warm-up', sub:day.wu, url:CONFIG.WARMUP_APP||day.wuLink, btn:'Start'});
  let main='', ext='';
  if(day.practice){ [main, ext=''] = day.practice.split(/\s*·\s*⭐\s*Extension\s*[—–-]\s*/); }
  if(main) t.push({id:'pr', icon:'📘', title:'Practice problems', sub:'Textbook: '+main});
  const app=appFor(day.unit);
  if(app && /^(practice|flex|check-in)/i.test(day.topic))
    t.push({id:'app', icon:'💻', title:'Study app: '+app.name, sub:'Work through the sections you need for the performance task.', url:app.url, btn:'Open'});
  if(ext) t.push({id:'ext', icon:'⭐', title:'Extension', sub:ext, optional:true});
  if(day.et) t.push({id:'et', icon:'🎟️', title:'Exit ticket', sub:day.et, url:CONFIG.CHECKIN_FORM||day.etLink, btn:'Answer'});
  return t;
}

const PT_RE=/^PT #\d+(?:\s+Part \d)?/;
function ptGroups(days){
  const groups=[], byKey={}; let lastUnit=null;
  for(const d of days){
    if(d.unit && !/final/i.test(d.unit.name)) lastUnit=d.unit;   // a PT given during finals review belongs to the unit before it
    const m=d.topic.match(PT_RE); if(!m) continue;
    const unit=lastUnit||d.unit;
    const key=(unit?unit.name:'')+'|'+m[0];
    if(!byKey[key]){ byKey[key]={label:m[0], unit, days:[]}; groups.push(byKey[key]); }
    byKey[key].days.push(d);
  }
  groups.forEach(g=>{ g.first=g.days[0]; g.last=g.days[g.days.length-1]; g.app=appFor(g.unit); });
  return groups;
}
/*LOGIC-END*/

/* ---------- Loading (always live from the sheet; last good copy saved as a backup) ---------- */
const CACHE_KEY='classpage-'+CONFIG.KEY+'-csv';
function store(k,v){ try{ localStorage.setItem(k,v); }catch(e){} }
function recall(k){ try{ return localStorage.getItem(k); }catch(e){ return null; } }

async function fetchText(url){
  const ctl=new AbortController(); const timer=setTimeout(()=>ctl.abort(),8000);
  try{
    const res=await fetch(url+(url.includes('?')?'&':'?')+'t='+Date.now(), {cache:'no-store', signal:ctl.signal});
    if(!res.ok) throw new Error('HTTP '+res.status);
    return await res.text();
  } finally { clearTimeout(timer); }
}
function looksRight(text){
  if(!text || /<html/i.test(text.slice(0,500))) return false;
  return buildModel(parseCSV(text), CONFIG.FALL_YEAR).days.length > 20;
}
async function loadData(){
  const urls=[];
  if(CONFIG.CSV_URL) urls.push(CONFIG.CSV_URL);
  if(CONFIG.SHEET_ID) urls.push('https://docs.google.com/spreadsheets/d/'+CONFIG.SHEET_ID+'/gviz/tq?tqx=out:csv&headers=0&sheet='+encodeURIComponent(CONFIG.SHEET_TAB));
  for(const u of urls){
    try{ const t=await fetchText(u); if(looksRight(t)){ store(CACHE_KEY,t); store(CACHE_KEY+'-at',new Date().toISOString()); return {text:t, live:true}; } }
    catch(e){ console.warn('Could not load', u, e); }
  }
  const cached=recall(CACHE_KEY);
  if(cached) return {text:cached, live:false, at:recall(CACHE_KEY+'-at')};
  return null;
}

/* ---------- Rendering ---------- */
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const el=(html)=>{ const t=document.createElement('template'); t.innerHTML=html.trim(); return t.content.firstElementChild; };
const longDate=d=>d.toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric'});

function unitCard(unit){
  if(!unit) return '';
  return `<section class="card" aria-label="This unit">
    <p class="unit-name">${esc(shortName(unit.name))}</p>
    <p class="unit-q">${esc(unit.question)}</p>
    <div class="wwh">
      <div><b>WHAT</b>${esc(unit.what.replace(/^WHAT:\s*/i,''))}</div>
      <div><b>WHY</b>${esc(unit.why.replace(/^WHY:\s*/i,''))}</div>
      <div><b>HOW</b>${esc(unit.how.replace(/^HOW:\s*/i,''))}</div>
    </div></section>`;
}

function taskCard(day, todayIso){
  if(!day) return '';
  const isToday = day.iso===todayIso;
  const heading = isToday ? "Today's Tasks" : 'Next Class: '+day.date.toLocaleDateString('en-US',{weekday:'long'});
  const tasks=tasksFor(day);
  const pt=day.topic.match(PT_RE);
  const items = tasks.map(t=>`
    <li class="task" data-id="${t.id}">
      <label class="t-hit"><input type="checkbox" aria-label="Mark ${esc(t.title)} done">
      <div class="t-body"><div class="t-title">${t.icon} ${esc(t.title)}${t.optional?'<span class="opt">OPTIONAL</span>':''}</div>
      ${t.sub?`<div class="t-sub">${esc(t.sub)}</div>`:''}</div></label>
      ${t.url?`<a class="btn" href="${esc(t.url)}" target="_blank" rel="noopener">${t.btn||'Open'}</a>`:''}
    </li>`).join('');
  return `<section class="card" id="today" aria-label="${esc(heading)}">
    <div class="day-head"><h2>${esc(heading)}</h2><span class="progress" id="prog"></span></div>
    <p class="day-topic">${esc(longDate(day.date))} · ${esc(day.topic)}</p>
    ${pt?`<div class="banner">📝 ${esc(pt[0])} is today. Show your work and do your best!</div>`:''}
    ${tasks.length?`<div class="bar"><span id="barfill"></span></div><ul class="tasks">${items}</ul><p class="yay" id="yay" hidden>🎉 All done. Nice work!</p>`:'<p class="t-sub">No checklist items for this day.</p>'}
  </section>`;
}

function wireTasks(day){
  const box=document.getElementById('today'); if(!box||!day) return;
  const key='classpage-'+CONFIG.KEY+'-done-'+day.iso;
  let done={}; try{ done=JSON.parse(recall(key)||'{}'); }catch(e){}
  const items=[...box.querySelectorAll('.task')];
  const update=()=>{
    const req=items.filter(li=>!li.querySelector('.opt'));
    const n=req.filter(li=>done[li.dataset.id]).length;
    const prog=document.getElementById('prog'), fill=document.getElementById('barfill'), yay=document.getElementById('yay');
    if(prog) prog.textContent=`${n} of ${req.length} done`;
    if(fill) fill.style.width=(req.length?100*n/req.length:0)+'%';
    const complete = !!(req.length && n===req.length);
    if(yay) yay.hidden = !complete;
    return complete;
  };
  items.forEach(li=>{
    const cb=li.querySelector('input'); cb.checked=!!done[li.dataset.id]; li.classList.toggle('done',cb.checked);
    cb.addEventListener('change',()=>{ const was=update(); done[li.dataset.id]=cb.checked; li.classList.toggle('done',cb.checked); store(key,JSON.stringify(done)); if(update() && !was) confetti(); });
  });
  update();
}

/* ---------- Confetti when every required task is checked ---------- */
function confetti(){
  const c=document.createElement('canvas');
  c.style.cssText='position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:9999';
  document.body.appendChild(c);
  const ctx=c.getContext('2d'), dpr=window.devicePixelRatio||1;
  const W=c.width=innerWidth*dpr, H=c.height=innerHeight*dpr;
  const colors=['#4c8c8c','#a0e7e5','#e39b4f','#7a9fd6','#f6c445','#3f9a6b','#ff7f9e'];
  const bursts=[[W*.5,H*.55],[W*.2,H*.7],[W*.8,H*.7]];
  const parts=[];
  bursts.forEach(([x,y])=>{ for(let i=0;i<70;i++){
    const a=-Math.PI/2+(Math.random()-.5)*Math.PI*1.1, v=(8+Math.random()*12)*dpr;
    parts.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,w:(6+Math.random()*6)*dpr,h:(3+Math.random()*4)*dpr,
      r:Math.random()*6,vr:(Math.random()-.5)*.4,col:colors[i%colors.length]});
  }});
  const start=performance.now();
  (function frame(t){
    const age=t-start; ctx.clearRect(0,0,W,H);
    for(const p of parts){
      p.vy+=0.35*dpr; p.vx*=0.99; p.vy*=0.99; p.x+=p.vx; p.y+=p.vy; p.r+=p.vr;
      ctx.save(); ctx.translate(p.x,p.y); ctx.rotate(p.r); ctx.globalAlpha=Math.max(0,1-age/3200);
      ctx.fillStyle=p.col; ctx.fillRect(-p.w/2,-p.h/2,p.w,p.h); ctx.restore();
    }
    if(age<3200) requestAnimationFrame(frame); else c.remove();
  })(start);
}

function ptBox(groups, todayIso, today){
  const up=groups.find(g=>g.last.iso>=todayIso);
  const past=groups.filter(g=>g.last.iso<todayIso).reverse();
  const daysAway=g=>Math.round((g.first.date - today)/864e5);
  const appBtn=g=> g.app ? `<a class="btn" href="${esc(g.app.url)}" target="_blank" rel="noopener">Open ${esc(g.app.name)}</a>`
                         : `<div class="soon">Study app coming soon.</div>`;
  let html='<section class="card" aria-label="Study"><h2>📚 Study</h2>';
  if(up){
    const n=daysAway(up), when = n<=0 ? 'Today!' : n===1 ? 'Tomorrow' : `${up.first.label} · ${n} days away`;
    html+=`<div class="pt"><div class="lbl">Upcoming performance task</div>
      <div class="name">${esc(up.label)}: ${esc(shortName(up.unit?up.unit.name:'').replace(/^CP\d Unit \d+(?: \([^)]*\))?:\s*/,''))}</div>
      <div class="when">${esc(when)}</div>${appBtn(up)}</div>`;
  }
  if(past.length){
    const p=past[0];
    html+=`<div class="pt"><div class="lbl">Past performance task (retakes)</div>
      <div class="name">${esc(p.label)}: ${esc(shortName(p.unit?p.unit.name:'').replace(/^CP\d Unit \d+(?: \([^)]*\))?:\s*/,''))}</div>
      <div class="when">Taken ${esc(p.last.label)}</div>${appBtn(p)}`;
    const older=past.slice(1).filter(g=>g.app);
    if(older.length) html+=`<div class="lbl" style="margin-top:12px">Earlier tests</div><ul class="more">${
      older.map(g=>`<li><a href="${esc(g.app.url)}" target="_blank" rel="noopener">${esc(g.label)}: ${esc(g.app.name)}</a></li>`).join('')}</ul>`;
    html+='</div>';
  }
  return html+'</section>';
}

function calendar(model, focus, todayIso){
  let html=`<section class="card cal-card" aria-label="Calendar">
    <div class="cal-head"><h2>🗓️ Calendar</h2><button class="btn light" id="jump" type="button">Jump to today</button></div>
    <div class="cal" id="cal">`;
  for(const s of model.sections){
    html+=`<div class="secwrap"><div class="sec">${esc(shortName(s.name))}${s.question?`<small>${esc(s.question)}</small>`:''}</div>`;
    for(const d of s.days){
      if(d.startsWeek) html+=`<div class="wk">${esc(d.week)}</div>`;
      const cls=['row', d.iso<todayIso?'past':'', d===focus?'today':''].join(' ');
      if(d.noSchool){ html+=`<div class="${cls} off" data-iso="${d.iso}"><span class="d">${esc(d.label)}</span><span>${esc(d.topic||'No class')}</span></div>`; continue; }
      const isPT=PT_RE.test(d.topic);
      const topic = isPT ? `<span class="chip pt">${esc(d.topic)}</span>` : esc(d.topic);
      const cp = d.cp ? ` <span class="chip cp">📝 ${esc(d.cp)}</span>` : '';
      html+=`<div class="${cls}" data-iso="${d.iso}"><span class="d">${esc(d.label)}</span><span>${topic}${cp}</span></div>`;
    }
    html+='</div>';
  }
  return html+'</div></section>';
}

function jumpToToday(smooth){
  const cal=document.getElementById('cal'); if(!cal) return;
  const row=cal.querySelector('.row.today'); if(!row) return;
  const sec=row.closest('.secwrap'); const secH=sec?sec.querySelector('.sec').offsetHeight:0;
  cal.scrollTo({top:row.offsetTop-secH-6, behavior:smooth?'smooth':'auto'});
}

async function main(){
  const params=new URLSearchParams(location.search);
  const view=params.get('view');                           // unit | scroll | today | (blank = full page)
  const today=params.get('date') ? new Date(params.get('date')+'T12:00') : new Date();   // ?date=2026-11-09 to preview a day
  today.setHours(0,0,0,0);
  const todayIso=isoOf(today);
  const app=document.getElementById('app');
  const hdr=document.getElementById('hdr');
  hdr.innerHTML=`<h1>${esc(CONFIG.TITLE)}</h1><p>${esc(CONFIG.SUBTITLE)}</p>`;
  document.title=CONFIG.TITLE;
  const here=location.pathname.split('/').pop()||'index.html';
  hdr.insertAdjacentElement('afterend', el(`<nav class="top-nav" aria-label="Classes"><a href="index.html">🏫 Home</a>${
    CLASSES.map(c=>`<a href="${c.file}" class="${c.file===here?'on':''}">${c.icon} ${esc(c.name)}</a>`).join('')}</nav>`));

  if(!CONFIG.CSV_URL && !CONFIG.SHEET_ID){
    document.getElementById('loading').remove();
    app.append(el(`<section class="card soon-card"><p class="big">🚧</p><h2>${esc(CONFIG.TITLE)} page coming soon</h2>
      <p>Check back soon for daily tasks and the calendar.</p></section>`));
    return;
  }

  const data=await loadData();
  document.getElementById('loading').remove();
  if(!data){ app.append(el(`<div class="err"><b>Couldn't load the calendar right now.</b> Try refreshing in a minute.</div>`)); return; }

  const model=buildModel(parseCSV(data.text), CONFIG.FALL_YEAR);
  const focus=pickDay(model.days, todayIso);
  const unit=focus?focus.unit:null;
  const groups=ptGroups(model.days);

  if(view){
    document.body.classList.add('embed');
    document.getElementById('hdr').remove(); const nv=document.querySelector('nav.top-nav'); if(nv) nv.remove();
    if(view==='unit') app.append(el(unitCard(unit)||'<div></div>'));
    if(view==='today'){ app.append(el(taskCard(focus,todayIso))); wireTasks(focus); }
    if(view==='scroll') app.append(el(calendar(model,focus,todayIso)));
    if(view==='study') app.append(el(ptBox(groups,todayIso,today)));
  } else {
    const layout=el(`<div class="layout"><div class="main">${unitCard(unit)}${taskCard(focus,todayIso)}</div>
      <aside class="side">${ptBox(groups,todayIso,today)}${calendar(model,focus,todayIso)}</aside></div>`);
    app.append(layout);
    wireTasks(focus);
  }
  const j=document.getElementById('jump'); if(j) j.addEventListener('click',()=>jumpToToday(true));
  jumpToToday(false);

  if(!data.live){
    const at=data.at?new Date(data.at).toLocaleString():'earlier';
    app.append(el(`<p class="status">Showing the copy saved ${esc(at)}. Refresh to check for updates.</p>`));
  }
}
main();
