/* Shared engine for every class page. You shouldn't need to edit this file:
   class settings live in classes.js. A class page just calls startClassPage('math2'). */

const CLASS_DEFAULTS = {
  KEY:'class', TITLE:'Class', SUBTITLE:'Mrs. Dunlea · C119',
  CSV_URL:'', SHEET_ID:'', SHEET_TAB:'Student View', FALL_YEAR:2026,
  WARMUP_APP:'', CHECKIN_FORM:'', APPS:[],
};
// One class's full settings (its classes.js entry on top of the defaults). key can be 'math2' or 'math2.html'.
function classConfig(key){
  const c=(window.CLASSES||[]).find(x=>x.key===key || x.file===key);
  return c ? Object.assign({}, CLASS_DEFAULTS, {KEY:c.key}, c) : null;
}

/* The calendar logic (reading the sheet, picking the day, building the checklist).
   The teacher dashboard uses this too, so it always matches what students see. */
function ClassLogic(CONFIG){
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
  // Dates like "Mon 8/24", "Monday 8/24", "8/24" or "8/24/2026"
  const DAY_RE=/^(?:(Sun|Mon|Tue|Wed|Thu|Fri|Sat)[a-z]*,?\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/i;
  const WEEKDAYS=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

  // Columns are found by their header name, so they can be in any order in the sheet.
  const COLUMN_NAMES={
    week:['week'], date:['date'], topic:['topic'],
    wu:['warm up','warm-up','warmup'], cp:['checkpoint','quiz'],
    wuLink:['wu link','warm up link','warm-up link'], etLink:['et link','exit ticket link'],
    practice:['practice','practice problems'], et:['exit ticket','check in','check-in'],
    what:['what'], why:['why'], how:['how'],
    sub:['substitute task','sub task'], app:['web app','web apps','app','apps'],
    task:['essential task',"today's task",'task','daily task'], taskLink:['essential task link','task link'],
    honors:['honors'], honorsLink:['honors link'],
    announce:['announcement','announcements'], announceLink:['announcement link','announcements link'],
    shift:['shift'],
  };
  const OLD_POSITIONS={week:0,date:1,topic:2,wu:3,cp:4,wuLink:5,etLink:6,practice:7,et:8,what:9,why:10,how:11,sub:12};
  function columnMap(rows){
    const header=rows.find(r=>(r[0]||'').trim().toLowerCase()==='week' && (r[1]||'').trim().toLowerCase()==='date');
    if(!header) return Object.assign({}, OLD_POSITIONS);
    const norm=header.map(h=>(h||'').trim().toLowerCase());
    const map={};
    for(const [key,names] of Object.entries(COLUMN_NAMES)){
      const i=norm.findIndex(h=>names.includes(h)); if(i>=0) map[key]=i;
    }
    return map;
  }

  function buildModel(rows, fallYear){
    const C=columnMap(rows);
    const get=(r,k)=>{ const v=(C[k]==null ? '' : (r[C[k]]||'')).trim(); return /^(none\b.*|—|-)$/i.test(v) ? '' : v; };
    const sections=[], days=[]; let sec=null, week='';
    for(const r of rows){
      const a=get(r,'week'), b=get(r,'date');
      if(a.toLowerCase()==='week' && b.toLowerCase()==='date') continue;   // header row
      const m=b.match(DAY_RE);
      if(m){
        const startsWeek=!!a; if(a) week=a;
        const mo=+m[2], dd=+m[3];
        let yr = m[4] ? +m[4] : (mo>=7 ? fallYear : fallYear+1); if(yr<100) yr+=2000;
        const date=new Date(yr,mo-1,dd), topic=get(r,'topic');
        const day={label:WEEKDAYS[date.getDay()]+' '+mo+'/'+dd, week, startsWeek, date, iso:isoOf(date), topic,
          wu:get(r,'wu'), cp:get(r,'cp'), wuLink:get(r,'wuLink'), etLink:get(r,'etLink'),
          practice:get(r,'practice'), et:get(r,'et'), sub:get(r,'sub'), app:get(r,'app'),
          task:get(r,'task'), taskLink:get(r,'taskLink'), honors:get(r,'honors'), honorsLink:get(r,'honorsLink'),
          announce:get(r,'announce'), announceLink:get(r,'announceLink'), section:sec};
        // "Name | https://link" in the Essential Task or Honors cell becomes the name plus a button
        [['task','taskLink'],['honors','honorsLink']].forEach(([k,lk])=>{ const m=day[k].match(/\s*\|?\s*(https?:\/\/\S+)\s*$/);
          if(m){ day[k]=day[k].slice(0,m.index).trim(); if(!day[lk]) day[lk]=m[1]; } });
        day.testDay = C.wu!=null && /\((?:test|exam|assessment) day\)/i.test(r[C.wu]||'');
        day.noSchool = /no school/i.test(topic) || !(topic||day.wu||day.cp||day.task||day.practice||day.et||day.announce);
        days.push(day); if(sec) sec.days.push(day);
      } else if(a){
        sec={name:a, question:get(r,'topic'), what:get(r,'what'), why:get(r,'why'), how:get(r,'how'), days:[]};
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
    // SHIFT: a whole number under the "Shift" header (e.g. -1 = one class day behind, 2 = two ahead, 0 = on the plan)
    let shift=0;
    if(C.shift!=null){ for(const r of rows){ const v=(r[C.shift]||'').trim(); if(/^[+-]?\d+$/.test(v)){ shift=parseInt(v,10); break; } } }
    // CARRY_TASK: a class day with no Essential Task keeps working on the last one (not on test days, never a performance task)
    if(CONFIG.CARRY_TASK){ let last=null;
      days.forEach(d=>{ if(d.noSchool) return;
        if(d.task){ last = PT_RE.test(d.task) ? null : d; return; }
        if(last && !d.testDay){ d.task=last.task; d.taskLink=last.taskLink; d.taskCarried=true; } }); }
    return {sections, days, shift};
  }

  function shortName(n){ return (n||'').replace(/\s*\(\d+\s*days?\)\s*$/i,''); }
  function appFor(unit){ return unit ? (CONFIG.APPS.find(a=>a.match.test(unit.name))||null) : null; }
  function classDays(days){ return days.filter(d=>!d.noSchool); }
  function pickDay(days, todayIso){ const c=classDays(days); return c.find(d=>d.iso>=todayIso) || c[c.length-1]; }

  /* SHIFT: when class is ahead or behind, today's checklist shows the lesson that many class days away.
     It counts straight through test and performance task days, so a pushed-back test moves with the shift.
     The warm-up/checkpoint, substitute task, honors and announcement stay with the real date; the calendar and side box never change. */
  function lessonDay(days, focus, shift){
    if(!focus || !shift) return focus;
    const c=classDays(days), i=c.indexOf(focus); if(i<0) return focus;
    return c[Math.max(0, Math.min(c.length-1, i+shift))] || focus;
  }
  function showDay(days, focus, shift){
    const lesson=lessonDay(days, focus, shift);
    if(!lesson || lesson===focus) return focus;
    return Object.assign({}, lesson, {
      date:focus.date, iso:focus.iso, label:focus.label, week:focus.week,
      wu:focus.wu, cp:focus.cp, wuLink:focus.wuLink, sub:focus.sub,
      honors:focus.honors, honorsLink:focus.honorsLink, announce:focus.announce, announceLink:focus.announceLink,
      testDay:false, lessonFrom:lesson });
  }

  function labels(){ return Object.assign({warmup:'Warm-up', practice:'Practice problems', practicePrefix:'',
    task:'Essential Task', honors:'Honors', exit:'Exit ticket', sub:"Today's task"}, CONFIG.LABELS||{}); }
  // Warm-up / checkpoint button: the class's warm-up page opens that exact one with ?wu=<name> (otherwise the day's WU Link)
  function warmupUrl(day, title){
    const u=CONFIG.WARMUP_APP; if(!u) return day.wuLink;
    return title ? u+(u.includes('?')?'&':'?')+'wu='+encodeURIComponent(title) : u;
  }
  function tasksFor(day){
    const t=[], L=labels(); if(!day) return t;
    if(day.cp) t.push({id:'cp', icon:'📝', title:day.cp, sub:'Quiz on what we learned recently. It takes the place of the warm-up.', url:warmupUrl(day, day.cp), btn:'Start'});
    else if(day.wu) t.push({id:'wu', icon:'🔥', title:L.warmup, sub:day.wu, url:warmupUrl(day, day.wu), btn:'Start'});
    if(day.task){
      const isPT=PT_RE.test(day.task);
      t.push({id:'task', icon:isPT?'📝':'📌', title:isPT?day.task:L.task, sub:isPT?'Performance task':(day.taskCarried?'Keep working on: ':'')+day.task, url:day.taskLink, btn:'Open'});
    }
    let main='', ext='';
    if(day.practice){ [main, ext=''] = day.practice.split(/\s*·\s*⭐\s*Extension\s*[—–-]\s*/); }
    // Sub day: the Substitute Task replaces the practice problems (and extension)
    if(day.sub){
      const m=day.sub.match(/https?:\/\/\S+/);
      const url=m?m[0].replace(/[).,;]+$/,''):'';
      const label=day.sub.replace(m?m[0]:'','').replace(/^[\s|:·–—-]+|[\s|:·–—-]+$/g,'');
      t.push({id:'sub', icon:'📋', title:L.sub, sub:label||(url?'Open it to see what to do today.':day.sub), url, btn:'Open'});
      main=''; ext='';
    }
    if(main) t.push({id:'pr', icon:'📘', title:L.practice, sub:L.practicePrefix+main+(ext?' · ⭐ Extension (optional): '+ext:'')});
    let linkedApps=0;
    if(day.app){
      day.app.split(/\n|;|\s·\s/).map(x=>x.trim()).filter(Boolean).forEach((seg,i)=>{
        const m=seg.match(/https?:\/\/\S+/); const url=m?m[0].replace(/[).,;]+$/,''):'';
        const label=seg.replace(m?m[0]:'','').replace(/^[\s|:–—-]+|[\s|:–—-]+$/g,'')||'Web app';
        const vid=/^▶?\s*Video:\s*/i.test(label);   // "▶ Video: name | link" from the Video column
        const name=vid?label.replace(/^▶?\s*Video:\s*/i,''):label;
        if(url){ linkedApps++; t.push({id:'app'+i, icon:vid?'🎬':'💻', title:name, sub:vid?'Video':'Web app', url:vid?videoLink(day,name,url):url, btn:vid?'Watch':'Open'}); }   // apps without a link stay off the checklist
      });
    }
    const app=appFor(day.unit);
    if(!linkedApps && app && /^(practice|flex|check-in)/i.test(day.topic))
      t.push({id:'app', icon:'💻', title:'Study app: '+app.name, sub:'Work through the sections you need for the performance task.', url:app.url, btn:'Open'});
    if(day.honors && CONFIG.SIDE!=='honors') t.push({id:'hon', icon:'⭐', title:L.honors, sub:day.honors, url:day.honorsLink, btn:'Open', optional:true});
    if(day.et) t.push({id:'et', icon:'🎟️', title:L.exit, sub:day.et, url:exitLink(day), btn:'Answer'});
    return t;
  }

  // Watch button: opens video.html, which plays a YouTube video inside the class site (other video links open as they are)
  // Single videos (watch?v=, youtu.be, embed, shorts) send v=<id>; playlist links send l=<list id>;
  // a channel link (youtube.com/channel/UC…) sends that channel's uploads list (UU…), which opens on its newest video.
  function videoLink(day, name, url){
    const page=(typeof location!=='undefined' && location.pathname.split('/').pop())||'';
    if(!/^[\w-]+\.html$/.test(page) || !/youtu\.?be/i.test(url)) return url;
    const p={c:page, t:name, d:day.iso};
    const v=url.match(/(?:youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/);
    const l=url.match(/[?&]list=([\w-]+)/), ch=url.match(/youtube\.com\/channel\/UC([\w-]{22})/);
    if(v && !/\/embed\/videoseries/.test(url)) p.v=v[1];
    else if(l) p.l=l[1];
    else if(ch) p.l='UU'+ch[1];
    else return url;
    return 'video.html?'+new URLSearchParams(p).toString();
  }

  // Exit ticket button: opens exit.html, which shows the question of the day above the embedded form
  function exitLink(day){
    const form=CONFIG.CHECKIN_FORM||day.etLink; if(!form) return '';
    const page=(typeof location!=='undefined' && location.pathname.split('/').pop())||'';
    if(!/^[\w-]+\.html$/.test(page)) return form;
    const p=new URLSearchParams({c:page, q:day.et.replace(/\s*\|?\s*https?:\/\/\S+\s*$/,'')});
    p.set('d', day.iso);
    if(!CONFIG.CHECKIN_FORM) p.set('f', form);
    return 'exit.html?'+p.toString();
  }

  const PT_RE=/^(?:PT #\d+(?:\s+Part \d)?|Performance Task \d+)/i;
  function ptGroups(days){
    const groups=[], byKey={}; let lastUnit=null;
    for(const d of days){
      if(d.unit && !/final/i.test(d.unit.name)) lastUnit=d.unit;   // a PT given during finals review belongs to the unit before it
      const fromTask=!PT_RE.test(d.topic) && PT_RE.test(d.task||'');
      const m=(fromTask?d.task:d.topic).match(PT_RE); if(!m) continue;
      const unit=lastUnit||d.unit;
      const term=d.date.getFullYear()+(d.date.getMonth()<6?'-spring':'-fall');   // a semester class repeats its units
      const key=term+'|'+(unit?unit.name:'')+'|'+m[0];
      if(!byKey[key]){ byKey[key]={label:m[0], unit, days:[]}; groups.push(byKey[key]); }
      byKey[key].days.push(d); if(fromTask && d.taskLink) byKey[key].link=d.taskLink;
    }
    groups.forEach(g=>{ g.first=g.days[0]; g.last=g.days[g.days.length-1]; g.app=appFor(g.unit); });
    return groups;
  }

  /* ---------- Advisory layout: one row per calendar date, weekends included ---------- */
  // Dates like "8/18/2026", "8/18", "Tue 8/18" or "2026-08-18"
  function parseDateCell(s, fallYear){
    s=(s||'').trim(); let m=s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if(m) return new Date(+m[1], m[2]-1, +m[3]);
    m=s.match(/^(?:[A-Za-z]+,?\s+)?(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?$/); if(!m) return null;
    const mo=+m[1], dd=+m[2]; let yr=m[3] ? +m[3] : (mo>=7 ? fallYear : fallYear+1); if(yr<100) yr+=2000;
    const d=new Date(yr, mo-1, dd); return isNaN(d) ? null : d;
  }
  // Finds the header row (the first row holding every name in `must`) and reads cells by header name
  function headerMap(rows, must){
    const at=rows.findIndex(r=>must.every(h=>r.some(c=>(c||'').trim().toLowerCase()===h)));
    if(at<0) return null;
    const map={}; rows[at].forEach((h,j)=>{ const k=(h||'').trim().toLowerCase(); if(k && !(k in map)) map[k]=j; });
    return {at, col:(r,...names)=>{ for(const n of names){ if(map[n]!=null) return (r[map[n]]||'').trim(); } return ''; }};
  }
  const linkIn=s=>{ const m=(s||'').match(/https?:\/\/\S+/); return m ? m[0].replace(/[).,;]+$/,'') : ''; };
  function buildAdvisory(rows, fallYear){
    const H=headerMap(rows, ['date','day type']); if(!H) return {days:[]};
    const days=[];
    for(const r of rows.slice(H.at+1)){
      const date=parseDateCell(H.col(r,'date'), fallYear); if(!date) continue;
      const type=H.col(r,'day type')||'School Day', video=H.col(r,'video'), url=linkIn(video);
      days.push({date, iso:isoOf(date), label:WEEKDAYS[date.getDay()]+' '+(date.getMonth()+1)+'/'+date.getDate(), type,
        weekend:/weekend/i.test(type), school:!/no school|weekend|holiday|break/i.test(type),
        topic:H.col(r,'topic of the week','topic'), event:H.col(r,'school event','event'), deadline:H.col(r,'deadline'),
        ice:H.col(r,'icebreaker'), videoUrl:url,
        videoName:video.replace(url,'').replace(/^▶?\s*Video:\s*/i,'').replace(/[\s|:–—-]+$/,'').trim()||'DLA TV',
        notes:H.col(r,'lesson notes')});
    }
    // Topic of the Week: typed on a Monday, it carries through that week
    let topic='';
    days.forEach(d=>{ if(d.topic) topic=d.topic; else if(d.date.getDay()===1) topic=''; else d.topic=topic; });
    return {days};
  }
  // Announcements tab: shown from Show Starting (or a week before the Event Date) through Hide After (or the Event Date)
  function activeAnnouncements(rows, today, fallYear){
    const H=headerMap(rows, ['title']); if(!H) return [];
    const t=today.getTime(), out=[];
    for(const r of rows.slice(H.at+1)){
      const title=H.col(r,'title'), details=H.col(r,'details'); if(!title && !details) continue;
      const ev=parseDateCell(H.col(r,'event date'), fallYear), from=parseDateCell(H.col(r,'show starting'), fallYear), to=parseDateCell(H.col(r,'hide after'), fallYear);
      const start=from || (ev ? new Date(ev.getFullYear(), ev.getMonth(), ev.getDate()-7) : null);
      const end=to || ev;
      if(start && t<start.getTime()) continue;
      if(end && t>end.getTime()) continue;
      out.push({title, details, ev, link:H.col(r,'link')||linkIn(details)});
    }
    return out.sort((a,b)=>(a.ev?a.ev.getTime():Infinity)-(b.ev?b.ev.getTime():Infinity) || 0);
  }
  // X-Block tab: the sign-up button shows only while a window is open (Opens through Closes)
  function openXBlock(rows, today, fallYear){
    const H=headerMap(rows, ['opens','closes']); if(!H) return null;
    for(const r of rows.slice(H.at+1)){
      const o=parseDateCell(H.col(r,'opens'), fallYear), c=parseDateCell(H.col(r,'closes'), fallYear);
      const link=H.col(r,'sign-up link','signup link','link')||linkIn(r.join(' '));
      if(o && c && link && today>=o && today<=c) return {cycle:H.col(r,'cycle','cycle #'), closes:c, link};
    }
    return null;
  }
  // The next few school events and deadlines; a run of days with the same event (a break) counts once
  function upcomingEvents(days, todayIso, n){
    const out=[];
    for(let i=0;i<days.length;i++){ const d=days[i]; if(d.iso<=todayIso) continue;
      if(d.event){ const p=[...out].reverse().find(x=>x.kind==='event');
        if(p && p.text===d.event && p.endIdx===i-1){ p.end=d; p.endIdx=i; }
        else { if(out.length>=n) break; out.push({kind:'event', text:d.event, start:d, end:d, endIdx:i}); } }
      if(d.deadline){ if(out.length>=n) break; out.push({kind:'deadline', text:d.deadline, start:d, end:d, endIdx:i}); }
    }
    return out;
  }

  return {parseCSV, isoOf, DAY_RE, buildModel, shortName, appFor, classDays, pickDay, lessonDay, showDay,
          labels, tasksFor, warmupUrl, videoLink, exitLink, PT_RE, ptGroups,
          parseDateCell, buildAdvisory, activeAnnouncements, openXBlock, upcomingEvents, CONFIG};
}

/* The class page itself */
function startClassPage(key){
  const CONFIG=classConfig(key)||Object.assign({}, CLASS_DEFAULTS);
  const CLASSES=window.CLASSES||[];
  const {parseCSV, isoOf, buildModel, shortName, pickDay, showDay, tasksFor, PT_RE, ptGroups, videoLink,
         buildAdvisory, activeAnnouncements, openXBlock, upcomingEvents}=ClassLogic(CONFIG);
  const ADVISORY=CONFIG.LAYOUT==='advisory';

  /* ---------- Loading: show the saved copy right away, then swap in the live sheet if it changed ---------- */
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
  // A real calendar, not an error page or a half-loaded sheet
  function looksRight(text){
    if(!text || /<html/i.test(text.slice(0,500))) return false;
    const rows=parseCSV(text);
    return (ADVISORY ? buildAdvisory(rows, CONFIG.FALL_YEAR) : buildModel(rows, CONFIG.FALL_YEAR)).days.length > 20;
  }
  async function loadLive(){
    const urls=[];
    if(CONFIG.CSV_URL) urls.push(CONFIG.CSV_URL);
    if(CONFIG.SHEET_ID) urls.push('https://docs.google.com/spreadsheets/d/'+CONFIG.SHEET_ID+'/gviz/tq?tqx=out:csv&headers=0&sheet='+encodeURIComponent(CONFIG.SHEET_TAB));
    for(const u of urls){
      try{ const t=await fetchText(u); if(looksRight(t)) return t; }
      catch(e){ console.warn('Could not load', u, e); }
    }
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

  function taskCard(day, todayIso, picked){
    if(!day) return '';
    const isToday = day.iso===todayIso;
    const wk=day.date.toLocaleDateString('en-US',{weekday:'long'}), md=(day.date.getMonth()+1)+'/'+day.date.getDate();
    const heading = isToday ? "Today's Tasks" : picked ? (day.iso<todayIso?'Tasks from ':'Tasks for ')+wk+' '+md : 'Next Class: '+wk;
    const tasks=tasksFor(day);
    const pt=day.topic.match(PT_RE)||(day.task||'').match(PT_RE);
    const items = tasks.map(t=>`
      <li class="task" data-id="${t.id}">
        <label class="t-hit"><input type="checkbox" aria-label="Mark ${esc(t.title)} done">
        <div class="t-body"><div class="t-title">${t.icon} ${esc(t.title)}${t.optional?'<span class="opt">OPTIONAL</span>':''}</div>
        ${t.sub?`<div class="t-sub">${esc(t.sub)}</div>`:''}</div></label>
        ${t.url?`<a class="btn" href="${esc(t.url)}"${/^(exit|video)\.html/.test(t.url)?'':' target="_blank" rel="noopener"'}>${t.btn||'Open'}</a>`:''}
      </li>`).join('');
    return `<section class="card" id="today" aria-label="${esc(heading)}">
      <div class="day-head"><h2>${esc(heading)}</h2><span class="progress" id="prog"></span></div>
      <p class="day-topic">${esc(longDate(day.date))} · ${esc(day.topic)}${day.lessonFrom?` <span class="t-sub">(planned for ${esc(day.lessonFrom.label)})</span>`:''}</p>
      ${day.announce?`<div class="banner">📣 ${esc(day.announce.replace(/https?:\/\/\S+/,'').trim())}${(day.announceLink||(day.announce.match(/https?:\/\/\S+/)||[''])[0])?` <a class="btn" style="margin-left:8px" href="${esc(day.announceLink||day.announce.match(/https?:\/\/\S+/)[0])}" target="_blank" rel="noopener">Open</a>`:''}</div>`:''}
      ${pt?`<div class="banner">📝 ${esc(pt[0])} ${isToday?'is today. Show your work and do your best!':day.iso<todayIso?'was on this day.':'is on this day. Show your work and do your best!'}</div>`:''}
      ${tasks.length?`<div class="bar"><span id="barfill"></span></div><ul class="tasks">${items}</ul><p class="yay" id="yay" hidden>🎉 All done. Nice work!</p>`:'<p class="t-sub">No checklist items for this day.</p>'}
    </section>`;
  }

  function wireTasks(day){
    const box=document.getElementById('today'); if(!box||!day) return;
    const key='classpage-'+CONFIG.KEY+'-done-'+day.iso+(day.lessonFrom?'-'+day.lessonFrom.iso:'');
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
                   : g.link ? `<a class="btn" href="${esc(g.link)}" target="_blank" rel="noopener">Open assignment</a>`
                   : `<div class="soon">Study app coming soon.</div>`;
    const unitTitle=g=>shortName(g.unit?g.unit.name:'').replace(/^(?:CP\d Unit \d+(?: \([^)]*\))?|Topic \d+):\s*/i,'');
    let html='<section class="card" aria-label="Study"><h2>📚 Study</h2>';
    if(up){
      const n=daysAway(up), when = n<=0 ? 'Today!' : n===1 ? 'Tomorrow' : `${up.first.label} · ${n} days away`;
      html+=`<div class="pt"><div class="lbl">Upcoming performance task</div>
        <div class="name">${esc(up.label)}: ${esc(unitTitle(up))}</div>
        <div class="when">${esc(when)}</div>${appBtn(up)}</div>`;
    }
    if(past.length){
      const p=past[0];
      html+=`<div class="pt"><div class="lbl">Past performance task (retakes)</div>
        <div class="name">${esc(p.label)}: ${esc(unitTitle(p))}</div>
        <div class="when">Taken ${esc(p.last.label)}</div>${appBtn(p)}`;
      const older=past.slice(1).filter(g=>g.app);
      if(older.length) html+=`<div class="lbl" style="margin-top:12px">Earlier tests</div><ul class="more">${
        older.map(g=>`<li><a href="${esc(g.app.url)}" target="_blank" rel="noopener">${esc(g.label)}: ${esc(g.app.name)}</a></li>`).join('')}</ul>`;
      html+='</div>';
    }
    return html+'</section>';
  }

  /* Honors box: the Honors column says "1H: Kinesiology" on the day it's assigned and "1H: Kinesiology due" on its due date.
     Add " | https://link" after the name on the assigned row to give it a button. */
  function honorsGroups(days){
    const groups=[], open={};
    for(const d of days){
      if(!d.honors) continue;
      const m=d.honors.match(/https?:\/\/\S+/), url=d.honorsLink||(m?m[0]:'');
      const text=d.honors.replace(url,'').replace(/[\s|]+$/,'').trim();
      const due=/\bdue\s*$/i.test(text), name=text.replace(/\s*\bdue\s*$/i,'').trim();
      const key=name.toLowerCase();
      if(!due){ open[key]={name, url, assigned:d, due:null}; groups.push(open[key]); }
      else { const g=open[key]||(open[key]={name, url, assigned:null, due:null}, groups.push(open[key]), open[key]); g.due=d; if(url) g.url=url; delete open[key]; }
    }
    return groups.filter(g=>g.due).sort((x,y)=>x.due.date-y.due.date);
  }
  function honorsBox(days, todayIso, today){
    const gs=honorsGroups(days);
    const term=d=>d.getFullYear()+(d.getMonth()<6?'-spring':'-fall');   // a semester class repeats its honors tasks
    const up=gs.find(g=>g.due.iso>=todayIso && (!g.assigned || g.assigned.iso<=todayIso));
    const pastAll=gs.filter(g=>g.due.iso<todayIso && term(g.due.date)===term(today)).reverse(), past=pastAll[0];
    const btn=g=>g.url?`<a class="btn" href="${esc(g.url)}" target="_blank" rel="noopener">Open</a>`:'';
    const away=g=>{const n=Math.round((g.due.date-today)/864e5); return n<=0?'Due today!':n===1?'Due tomorrow':`Due ${g.due.label} · ${n} days away`;};
    let html='<section class="card" aria-label="Honors"><h2>⭐ Honors</h2>';
    if(up) html+=`<div class="pt"><div class="lbl">Upcoming honors task</div><div class="name">${esc(up.name)}</div><div class="when">${esc(away(up))}</div>${btn(up)}</div>`;
    if(past){
      html+=`<div class="pt"><div class="lbl">Past honors task</div><div class="name">${esc(past.name)}</div><div class="when">Was due ${esc(past.due.label)}</div>${btn(past)}`;
      const older=pastAll.slice(1);
      if(older.length) html+=`<div class="lbl" style="margin-top:12px">Earlier honors tasks</div><ul class="more">${
        older.map(g=>`<li>${g.url?`<a href="${esc(g.url)}" target="_blank" rel="noopener">${esc(g.name)}</a>`:esc(g.name)}</li>`).join('')}</ul>`;
      html+='</div>';
    }
    if(!up && !past) html+='<p class="t-sub">No honors tasks right now.</p>';
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
        const cp = (d.cp ? ` <span class="chip cp">📝 ${esc(d.cp)}</span>` : '') + (!isPT && PT_RE.test(d.task||'') ? ` <span class="chip pt">${esc(d.task)}</span>` : '');
        html+=`<div class="${cls}" data-iso="${d.iso}" tabindex="0" role="button" aria-label="Show ${esc(d.label)}"><span class="d">${esc(d.label)}</span><span>${topic}${cp}</span></div>`;
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

  /* ---------- Page setup (once) ---------- */
  const params=new URLSearchParams(location.search);
  const view=params.get('view');                           // unit | scroll | today | study | (blank = full page)
  let today=/^\d{4}-\d{2}-\d{2}$/.test(params.get('date')||'') ? new Date(params.get('date')+'T12:00') : new Date();   // ?date=2026-11-09 to preview a day
  if(isNaN(today)) today=new Date();
  today.setHours(0,0,0,0);
  const todayIso=isoOf(today);
  const app=document.getElementById('app');
  const hdr=document.getElementById('hdr');
  hdr.innerHTML=`<h1>${esc(CONFIG.TITLE)}</h1><p>${esc(CONFIG.SUBTITLE)}</p>`;
  document.title=CONFIG.TITLE;
  const here=location.pathname.split('/').pop()||'index.html';
  hdr.insertAdjacentElement('afterend', el(`<nav class="top-nav" aria-label="Classes"><a href="index.html">🏫 Home</a>${
    CLASSES.filter(c=>!c.HIDDEN || c.file===here).map(c=>c.file===here
      ? `<a href="${c.file}" class="on" aria-current="page">${c.icon} <span class="short">${esc(c.name)}</span><span class="welcome">Welcome to ${esc(CONFIG.TITLE)} with ${esc(CONFIG.SUBTITLE)}</span></a>`
      : `<a href="${c.file}">${c.icon} ${esc(c.name)}</a>`).join('')}</nav>`));
  document.body.classList.add('has-nav');
  const navEl=document.querySelector('nav.top-nav');
  requestAnimationFrame(()=>requestAnimationFrame(()=>{ navEl.classList.add('open'); const sh=navEl.querySelector('.on .short'); if(sh) sh.style.display='none'; }));
  if(view){ document.body.classList.add('embed'); hdr.remove(); navEl.remove(); }

  // Everything below the menu lives in #content, so it can be redrawn when the live sheet arrives
  const content=document.createElement('div'); content.id='content'; app.append(content);
  const loading=()=>{ const l=document.getElementById('loading'); if(l) l.remove(); };

  /* ---------- Draw the page from a copy of the sheet ---------- */
  function render(text){
    const p=new URLSearchParams(location.search);            // re-read: a picked ?day= survives a redraw
    const model=buildModel(parseCSV(text), CONFIG.FALL_YEAR);
    const focus=pickDay(model.days, todayIso);
    const shift=p.has('shift') ? (parseInt(p.get('shift'),10)||0) : model.shift;   // ?shift=-1 to preview
    const shown=showDay(model.days, focus, shift);
    const unit=shown?shown.unit:null;
    const groups=ptGroups(model.days);
    content.innerHTML='';

    if(view){
      if(view==='unit') content.append(el(unitCard(unit)||'<div></div>'));
      if(view==='today'){ content.append(el(taskCard(shown,todayIso))); wireTasks(shown); }
      if(view==='scroll') content.append(el(calendar(model,focus,todayIso)));
      if(view==='study') content.append(el(CONFIG.SIDE==='honors'?honorsBox(model.days,todayIso,today):ptBox(groups,todayIso,today)));
    } else {
      const layout=el(`<div class="layout"><div class="main"></div>
        <aside class="side">${CONFIG.SIDE==='honors'?honorsBox(model.days,todayIso,today):ptBox(groups,todayIso,today)}${calendar(model,focus,todayIso)}</aside></div>`);
      content.append(layout);
      /* Tap a day on the calendar to see that day's unit card and checklist (?day=2026-09-15 opens one directly).
         The Study box and calendar stay the same. A picked day shows the lesson written on that row (no Shift). */
      const mainEl=layout.querySelector('.main'), byIso={};
      model.days.forEach(d=>{ byIso[d.iso]=d; });
      const showPicked=(iso, scroll)=>{
        const d=iso?byIso[iso]:null, picked=(d && !d.noSchool && d!==focus) ? d : null, day=picked||shown;
        mainEl.innerHTML=(picked?`<div class="viewing"><span>📅 Viewing ${esc(longDate(picked.date))}</span><button class="btn light" type="button" id="backToday">Back to today</button></div>`:'')
          + unitCard(day?day.unit:null) + taskCard(day,todayIso,!!picked);
        wireTasks(day);
        layout.querySelectorAll('#cal .row.sel').forEach(r=>r.classList.remove('sel'));
        if(picked){ const r=layout.querySelector(`#cal .row[data-iso="${picked.iso}"]`); if(r) r.classList.add('sel'); }
        const b=document.getElementById('backToday');
        if(b) b.addEventListener('click',()=>{ showPicked(null,true); jumpToToday(true); });
        try{ const u=new URL(location.href); if(picked) u.searchParams.set('day',picked.iso); else u.searchParams.delete('day'); history.replaceState(null,'',u); }catch(e){}
        if(scroll){ const top=mainEl.getBoundingClientRect().top; if(top<0 || top>innerHeight*0.5) window.scrollTo({top:scrollY+top-10, behavior:'smooth'}); }
      };
      const cal=layout.querySelector('#cal');
      const rowOf=e=>{ const r=e.target.closest('.row[data-iso]'); return r && !r.classList.contains('off') ? r : null; };
      cal.addEventListener('click',e=>{ const r=rowOf(e); if(r) showPicked(r.dataset.iso,true); });
      cal.addEventListener('keydown',e=>{ if(e.key!=='Enter' && e.key!==' ') return; const r=rowOf(e); if(r){ e.preventDefault(); showPicked(r.dataset.iso,true); } });
      showPicked(p.get('day'), false);
    }
    const j=document.getElementById('jump'); if(j) j.addEventListener('click',()=>jumpToToday(true));
    jumpToToday(false);
  }

  /* ---------- Advisory page ---------- */
  const shortDate=d=>WEEKDAY_LONG[d.getDay()]+' '+(d.getMonth()+1)+'/'+d.getDate();
  const WEEKDAY_LONG=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const MONTHS=['January','February','March','April','May','June','July','August','September','October','November','December'];
  function dayKind(d){
    if(!d) return 'out';
    if(d.weekend) return 'wknd';
    if(!d.school) return 'off';
    if(/finals|psat|caaspp|testing|exam/i.test(d.type+' '+d.event)) return 'test';
    return 'sch';
  }
  function checklistItems(tasks){
    return tasks.map(t=>`
      <li class="task" data-id="${t.id}">
        <label class="t-hit"><input type="checkbox" aria-label="Mark ${esc(t.title)} done">
        <div class="t-body"><div class="t-title">${t.icon} ${esc(t.title)}</div>${t.sub?`<div class="t-sub">${esc(t.sub)}</div>`:''}</div></label>
        ${t.url?`<a class="btn" href="${esc(t.url)}"${t.app?` data-app="${esc(t.app)}"`:''}${/^video\.html/.test(t.url)?'':' target="_blank" rel="noopener"'}>${t.btn||'Open'}</a>`:''}
      </li>`).join('');
  }
  function advisoryMainHtml(focus, isToday, todayDay, xb, anns){
    let html='';
    if(!isToday) html+=`<div class="banner">🏖️ ${todayDay ? esc(todayDay.event||todayDay.type||'No school today') : 'No school today'}${focus?`. Here's what's coming on ${esc(shortDate(focus.date))}.`:''}</div>`;
    if(focus && focus.topic) html+=`<section class="card adv-topic" aria-label="Topic of the week"><p class="unit-name">Topic of the week</p><p class="adv-topic-text">${esc(focus.topic)}</p></section>`;
    if(focus && focus.ice) html+=`<section class="card adv-ice" aria-label="Icebreaker"><h2>💬 ${isToday?"Today's icebreaker":'Icebreaker for '+esc(shortDate(focus.date))}</h2><p class="adv-ice-text">${esc(focus.ice)}</p></section>`;
    const tasks=[];
    if(focus && focus.videoUrl) tasks.push({id:'tv', icon:'📺', title:'Watch '+focus.videoName, sub:"This week's episode", url:videoLink(focus, focus.videoName, focus.videoUrl), btn:'Watch'});
    if(CONFIG.OUTLOOK_WEB||CONFIG.OUTLOOK_APP) tasks.push({id:'mail', icon:'📧', title:'Check your email', sub:'Opens the Outlook app', url:CONFIG.OUTLOOK_WEB||CONFIG.OUTLOOK_APP, app:CONFIG.OUTLOOK_WEB?CONFIG.OUTLOOK_APP:'', btn:'Open'});
    if(xb){ const n=Math.round((xb.closes-today)/864e5);
      tasks.push({id:'xb'+(xb.cycle||''), icon:'✍️', title:'X-Block sign-up'+(xb.cycle?' (cycle '+xb.cycle+')':''), sub:n<=0?'Closes today!':n===1?'Closes tomorrow':'Closes '+shortDate(xb.closes), url:xb.link, btn:'Sign up'}); }
    const heading=isToday?"Today's Tasks":focus?'Next school day: '+shortDate(focus.date):"Today's Tasks";
    html+=`<section class="card" id="today" aria-label="${esc(heading)}">
      <div class="day-head"><h2>${esc(heading)}</h2><span class="progress" id="prog"></span></div>
      ${tasks.length?`<div class="bar"><span id="barfill"></span></div><ul class="tasks">${checklistItems(tasks)}</ul><p class="yay" id="yay" hidden>🎉 All done. Nice work!</p>`:''}
    </section>`;
    html+=`<section class="card adv-anns" aria-label="Announcements"><h2>📣 Announcements</h2>${anns.length ? anns.map(a=>`
      <div class="pt adv-ann"><div class="name">${esc(a.title||a.details)}</div>${a.ev?`<div class="when">${esc(shortDate(a.ev))}</div>`:''}
      ${a.title&&a.details?`<div>${esc(a.details.replace(a.link,'').trim())}</div>`:''}
      ${a.link?`<a class="btn" style="margin-top:8px" href="${esc(a.link)}" target="_blank" rel="noopener">Open</a>`:''}</div>`).join('')
      : '<p class="t-sub">No announcements right now.</p>'}</section>`;
    return html;
  }
  function comingUpHtml(days, todayIso){
    const items=upcomingEvents(days, todayIso, 4);
    const when=x=> x.start===x.end ? shortDate(x.start.date) : x.start.label+' to '+x.end.label;
    return `<section class="card" aria-label="Coming up"><h2>⏭️ Coming up</h2>${items.length ? items.map(x=>`
      <div class="pt"><div class="lbl">${x.kind==='deadline'?'Deadline':'School event'}</div><div class="name">${esc(x.text)}</div><div class="when">${esc(when(x))}</div></div>`).join('')
      : '<p class="t-sub">Nothing coming up on the calendar.</p>'}</section>`;
  }
  function monthHtml(days, y, mo, todayIso){
    const byIso={}; days.forEach(d=>{ byIso[d.iso]=d; });
    const first=new Date(y, mo, 1), n=new Date(y, mo+1, 0).getDate();
    let cells=['S','M','T','W','T','F','S'].map(w=>`<div class="mh">${w}</div>`).join('');
    for(let i=0;i<first.getDay();i++) cells+='<div class="mc empty"></div>';
    for(let dd=1; dd<=n; dd++){
      const date=new Date(y, mo, dd), iso=isoOf(date), d=byIso[iso];
      const tip=d ? [d.event, d.deadline && 'Due: '+d.deadline].filter(Boolean).join(' · ') : '';
      const ev=d ? (d.event||d.deadline).replace(/^No School:\s*/i,'') : '';
      cells+=`<button type="button" class="mc ${dayKind(d)}${iso===todayIso?' today':''}${d&&d.deadline?' dl':''}" data-iso="${iso}" aria-label="${esc(longDate(date)+(tip?': '+tip:''))}"><span class="n">${dd}</span>${ev?`<span class="ev">${esc(ev)}</span>`:''}</button>`;
    }
    return cells;
  }
  function calendarCard(){
    return `<section class="card cal-card adv-cal" aria-label="Calendar">
      <div class="cal-head"><button class="btn light" type="button" id="mPrev" aria-label="Previous month">‹</button><h2 id="mTitle"></h2><button class="btn light" type="button" id="mNext" aria-label="Next month">›</button></div>
      <div class="mgrid" id="mgrid"></div>
      <p class="mdetail" id="mdetail">Tap a day to see what's happening.</p>
      <div class="mlegend"><span class="sch">School day</span><span class="off">No school</span><span class="test">Testing / finals</span><span class="dl">Deadline</span></div>
    </section>`;
  }
  function wireCalendar(root, days, todayIso){
    if(!days.length) return;
    const lo=days[0].date, hi=days[days.length-1].date;
    let y=today.getFullYear(), mo=today.getMonth();
    if(today<lo){ y=lo.getFullYear(); mo=lo.getMonth(); } else if(today>hi){ y=hi.getFullYear(); mo=hi.getMonth(); }
    const byIso={}; days.forEach(d=>{ byIso[d.iso]=d; });
    const grid=root.querySelector('#mgrid'), title=root.querySelector('#mTitle'), prev=root.querySelector('#mPrev'), next=root.querySelector('#mNext'), detail=root.querySelector('#mdetail');
    const draw=()=>{
      grid.innerHTML=monthHtml(days, y, mo, todayIso); title.textContent=MONTHS[mo]+' '+y;
      prev.disabled = y*12+mo <= lo.getFullYear()*12+lo.getMonth();
      next.disabled = y*12+mo >= hi.getFullYear()*12+hi.getMonth();
    };
    prev.addEventListener('click',()=>{ mo--; if(mo<0){ mo=11; y--; } draw(); });
    next.addEventListener('click',()=>{ mo++; if(mo>11){ mo=0; y++; } draw(); });
    grid.addEventListener('click',e=>{
      const b=e.target.closest('.mc[data-iso]'); if(!b) return;
      grid.querySelectorAll('.mc.sel').forEach(x=>x.classList.remove('sel')); b.classList.add('sel');
      const d=byIso[b.dataset.iso], date=d?d.date:new Date(b.dataset.iso+'T12:00');
      const bits=d ? [d.weekend?'Weekend':!d.school?'No school':d.type, d.event, d.deadline&&'Deadline: '+d.deadline, d.school&&d.topic&&'Topic: '+d.topic].filter(Boolean) : ['Not on the calendar'];
      detail.textContent=longDate(date)+' · '+[...new Set(bits)].join(' · ');
    });
    draw();
  }
  // Check email: try the Outlook app first; if it doesn't open, use Outlook on the web
  function wireOutlook(root){
    root.querySelectorAll('a[data-app]').forEach(a=>a.addEventListener('click',e=>{
      const app=a.dataset.app; if(!app) return;
      e.preventDefault(); let left=false;
      const gone=()=>{ left=true; }; document.addEventListener('visibilitychange', gone, {once:true}); window.addEventListener('pagehide', gone, {once:true});
      location.href=app;
      setTimeout(()=>{ if(!left && !document.hidden) window.open(a.href, '_blank', 'noopener'); }, 1500);
    }));
  }
  function renderAdvisory(text, extra){
    const {days}=buildAdvisory(parseCSV(text), CONFIG.FALL_YEAR);
    const todayDay=days.find(d=>d.iso===todayIso);
    const isToday=!!(todayDay && todayDay.school);
    const focus=isToday ? todayDay : (days.find(d=>d.iso>todayIso && d.school)||null);
    const anns=extra.ann ? activeAnnouncements(parseCSV(extra.ann), today, CONFIG.FALL_YEAR) : [];
    const xb=extra.xb ? openXBlock(parseCSV(extra.xb), today, CONFIG.FALL_YEAR) : null;
    content.innerHTML='';
    if(view==='today'){ content.append(el(`<div>${advisoryMainHtml(focus, isToday, todayDay, xb, anns)}</div>`)); }
    else {
      content.append(el(`<div class="layout"><div class="main adv-main">${advisoryMainHtml(focus, isToday, todayDay, xb, anns)}</div>
        <aside class="side">${comingUpHtml(days, todayIso)}${calendarCard()}</aside></div>`));
      wireCalendar(content, days, todayIso);
    }
    wireTasks(focus ? {iso:focus.iso} : {iso:todayIso});
    wireOutlook(content);
  }

  async function main(){
    if(!CONFIG.CSV_URL && !CONFIG.SHEET_ID){
      loading();
      content.append(el(`<section class="card soon-card"><p class="big">🚧</p><h2>${esc(CONFIG.TITLE)} page coming soon</h2>
        <p>Check back soon for daily tasks and the calendar.</p></section>`));
      return;
    }
    const draw = ADVISORY ? renderAdvisory : render;
    // Advisory also reads its Announcements and X-Block tabs
    const EXTRA = ADVISORY ? {ann:CONFIG.ANNOUNCEMENTS_CSV, xb:CONFIG.XBLOCK_CSV} : {};
    const extraKeys=Object.keys(EXTRA).filter(k=>EXTRA[k]);
    const savedExtra=()=>{ const o={}; extraKeys.forEach(k=>{ o[k]=recall(CACHE_KEY+'-'+k)||''; }); return o; };
    // 1. Saved copy from last time: on screen instantly, even on slow Wi-Fi
    let onScreen=null;
    const saved=recall(CACHE_KEY);
    if(saved){ try{ const ex=savedExtra(); draw(saved, ex); onScreen=saved+'\u0000'+JSON.stringify(ex); loading(); }catch(e){ console.warn('Saved copy failed to draw', e); content.innerHTML=''; } }
    // 2. Live sheet: redraw only if something changed
    const [live, ...extras]=await Promise.all([loadLive(), ...extraKeys.map(k=>fetchText(EXTRA[k]).catch(e=>{ console.warn('Could not load', k, e); return null; }))]);
    loading();
    if(live){
      store(CACHE_KEY,live); store(CACHE_KEY+'-at',new Date().toISOString());
      const ex=savedExtra();
      extraKeys.forEach((k,i)=>{ const t=extras[i]; if(t!=null && !/<html/i.test(t.slice(0,500))){ ex[k]=t; store(CACHE_KEY+'-'+k, t); } });
      if(live+'\u0000'+JSON.stringify(ex)!==onScreen) draw(live, ex);
    } else if(onScreen){
      const at=recall(CACHE_KEY+'-at'), when=at?new Date(at).toLocaleString():'earlier';
      app.append(el(`<p class="status">Showing the copy saved ${esc(when)}. Refresh to check for updates.</p>`));
    } else {
      content.append(el(`<div class="err"><b>Couldn't load the calendar right now.</b> Try refreshing in a minute.</div>`));
    }
  }
  main();
}
