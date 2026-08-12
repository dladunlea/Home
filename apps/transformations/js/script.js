(() => {
  const canvas = document.getElementById('graph');
  const wrap = document.getElementById('canvasWrap');
  const ctx = canvas.getContext('2d');
  const statusEl = document.getElementById('status');
  const coordinateTable = document.getElementById('coordinateTable');
  const coordinatePanel = document.querySelector('.data-grid');
  const list = document.getElementById('transformList');
  const help = document.getElementById('canvasHelp');
  const parabolaPanel = document.getElementById('parabolaPanel');
  const coordinateRulePanel = document.getElementById('coordinateRulePanel');
  const coordinateRuleEl = document.getElementById('coordinateRule');

  let mode = 'shape';
  let points = [];
  let view = {cx:0, cy:0, scale:42};
  let draggingCanvas = false, lastPointer = null, suppressDraw = false;

  const transforms = [
    {id:'x', name:'Horizontal translation', type:'translationX', value:0},
    {id:'y', name:'Vertical translation', type:'translationY', value:0},
    {id:'d', name:'Dilation / contraction', type:'dilation', value:'1'},
    {id:'rx', name:'Reflection over X-axis', type:'reflectX', value:false},
    {id:'ry', name:'Reflection over Y-axis', type:'reflectY', value:false},
    {id:'r', name:'Rotation', type:'rotation', value:0}
  ];

  function resizeCanvas(){
    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth*dpr;
    canvas.height = wrap.clientHeight*dpr;
    canvas.style.width = wrap.clientWidth+'px';
    canvas.style.height = wrap.clientHeight+'px';
    ctx.setTransform(dpr,0,0,dpr,0,0);
    draw();
  }
  window.addEventListener('resize', resizeCanvas);

  function gcd(a,b){ a=Math.abs(a); b=Math.abs(b); while(b){[a,b]=[b,a%b]} return a||1; }
  function parseFraction(s){
    s=String(s).trim();
    if(!s) return 1;
    if(s.includes('/')){
      const [a,b]=s.split('/').map(Number);
      if(Number.isFinite(a)&&Number.isFinite(b)&&b!==0) return a/b;
    }
    const n=Number(s);
    return Number.isFinite(n) ? n : NaN;
  }
  function frac(n){
    if(!Number.isFinite(n)) return 'undefined';
    if(Math.abs(n)<1e-10) return '0';
    const rounded=Math.round(n*1000000)/1000000;
    if(Number.isInteger(rounded)) return String(rounded);
    let sign=rounded<0?-1:1, x=Math.abs(rounded);
    for(let den=1;den<=1000;den++){
      const num=Math.round(x*den);
      if(Math.abs(x-num/den)<1e-7){
        const g=gcd(num,den);
        return (sign*num/g)+'/'+(den/g);
      }
    }
    return String(rounded);
  }
  function signedTerm(v, variable){
    if(Math.abs(v)<1e-10) return '';
    const sign=v<0?'−':'+';
    const a=Math.abs(v);
    return ` ${sign} ${frac(a)}${variable}`;
  }
  function fmtPoint(p){ return `(${frac(p.x)}, ${frac(p.y)})`; }

  function applyPoint(p){
    let x=p.x,y=p.y;
    for(const t of transforms){
      if(t.type==='translationX') x += Number(t.value)||0;
      else if(t.type==='translationY') y += Number(t.value)||0;
      else if(t.type==='dilation'){ const k=parseFraction(t.value); if(Number.isFinite(k)){x*=k;y*=k;} }
      else if(t.type==='reflectX') { if(t.value) y=-y; }
      else if(t.type==='reflectY') { if(t.value) x=-x; }
      else if(t.type==='rotation'){
        const r=((Number(t.value)||0)%360+360)%360;
        if(r===90) [x,y]=[-y,x];
        else if(r===180) [x,y]=[-x,-y];
        else if(r===270) [x,y]=[y,-x];
      }
    }
    return {x,y};
  }

  // Affine matrix for the entire pipeline: [x';y'] = A[x;y] + b
  function pipeline(){
    let a=1,b=0,c=0,d=1,tx=0,ty=0;
    for(const t of transforms){
      let A=1,B=0,C=0,D=1,X=0,Y=0;
      if(t.type==='translationX') X=Number(t.value)||0;
      if(t.type==='translationY') Y=Number(t.value)||0;
      if(t.type==='dilation'){ const k=parseFraction(t.value); if(Number.isFinite(k)) A=D=k; }
      if(t.type==='reflectX') { if(t.value) D=-1; }
      if(t.type==='reflectY') { if(t.value) A=-1; }
      if(t.type==='rotation'){
        const r=((Number(t.value)||0)%360+360)%360;
        if(r===90){A=0;B=-1;C=1;D=0}
        if(r===180){A=-1;D=-1}
        if(r===270){A=0;B=1;C=-1;D=0}
      }
      // New transform composed after current: Anew=A*current
      const na=A*a+B*c, nb=A*b+B*d, nc=C*a+D*c, nd=C*b+D*d;
      const ntx=A*tx+B*ty+X, nty=C*tx+D*ty+Y;
      a=na;b=nb;c=nc;d=nd;tx=ntx;ty=nty;
    }
    return {a,b,c,d,tx,ty};
  }

  // Format every numeric coefficient with the app's fraction formatter.
  // This keeps dilation factors such as 1/2, 1/3, and 3/4 as fractions
  // in the coordinate rule instead of converting them to decimals.
  function formatRuleCoefficient(n){
    return frac(n);
  }

  function affineExpression(xCoeff, yCoeff, constant){
    const terms=[];
    const addTerm=(coeff, variable)=>{
      if(Math.abs(coeff)<1e-10) return;
      const negative=coeff<0;
      const abs=Math.abs(coeff);
      const coeffText=Math.abs(abs-1)<1e-10 && variable ? '' : formatRuleCoefficient(abs);
      const body=coeffText+variable;
      terms.push({negative, body});
    };
    addTerm(xCoeff,'x');
    addTerm(yCoeff,'y');
    if(Math.abs(constant)>=1e-10) terms.push({negative:constant<0, body:frac(Math.abs(constant))});
    if(!terms.length) return '0';
    return terms.map((t,i)=>{
      const sign=t.negative?'−':'+';
      return i===0 ? (t.negative?'−':'')+t.body : ` ${sign} ${t.body}`;
    }).join('');
  }

  function ruleString(){
    const p=pipeline();
    return `(x, y) → (${affineExpression(p.a,p.b,p.tx)}, ${affineExpression(p.c,p.d,p.ty)})`;
  }

  function coordinateTables(){
    if(mode==='parabola'){
      coordinatePanel.style.display='none';
      return;
    }
    coordinatePanel.style.display='block';
    if(points.length===0){
      coordinateTable.innerHTML='<div class="hint">No points yet.</div>';
      return;
    }
    const head='<table><thead><tr><th>#</th><th colspan="2">Original</th><th colspan="2">Transformed</th></tr><tr><th></th><th>x</th><th>y</th><th>x</th><th>y</th></tr></thead><tbody>';
    coordinateTable.innerHTML=head+points.map((p,i)=>{const q=applyPoint(p);return `<tr><td>${i+1}</td><td>${p.x.toFixed(3)}</td><td>${p.y.toFixed(3)}</td><td>${q.x.toFixed(3)}</td><td>${q.y.toFixed(3)}</td></tr>`}).join('')+'</tbody></table>';
  }

  function worldToScreen(p){
    return {x:canvas.clientWidth/2+(p.x-view.cx)*view.scale, y:canvas.clientHeight/2-(p.y-view.cy)*view.scale};
  }
  function screenToWorld(x,y){
    return {x:(x-canvas.clientWidth/2)/view.scale+view.cx, y:(canvas.clientHeight/2-y)/view.scale+view.cy};
  }

  function drawGrid(){
    const w=canvas.clientWidth,h=canvas.clientHeight;
    ctx.clearRect(0,0,w,h);
    ctx.fillStyle='#fff'; ctx.fillRect(0,0,w,h);
    const minor=view.scale>=25 ? 1 : (view.scale>=12?2:5);
    const left=screenToWorld(0,h).x, right=screenToWorld(w,0).x;
    const bottom=screenToWorld(0,h).y, top=screenToWorld(w,0).y;
    ctx.lineWidth=1; ctx.strokeStyle='#edf1f6';
    for(let x=Math.floor(left/minor)*minor;x<=right;x+=minor){
      const sx=worldToScreen({x,y:0}).x; ctx.beginPath();ctx.moveTo(sx,0);ctx.lineTo(sx,h);ctx.stroke();
    }
    for(let y=Math.floor(bottom/minor)*minor;y<=top;y+=minor){
      const sy=worldToScreen({x:0,y}).y; ctx.beginPath();ctx.moveTo(0,sy);ctx.lineTo(w,sy);ctx.stroke();
    }
    const x0=worldToScreen({x:0,y:0}).x, y0=worldToScreen({x:0,y:0}).y;
    ctx.strokeStyle='#64748b';ctx.lineWidth=1.5;
    if(x0>=0&&x0<=w){ctx.beginPath();ctx.moveTo(x0,0);ctx.lineTo(x0,h);ctx.stroke()}
    if(y0>=0&&y0<=h){ctx.beginPath();ctx.moveTo(0,y0);ctx.lineTo(w,y0);ctx.stroke()}
    ctx.fillStyle='#64748b';ctx.font='11px system-ui';
    const labelStep=view.scale>28?1:view.scale>14?2:5;
    for(let x=Math.ceil(left/labelStep)*labelStep;x<=right;x+=labelStep){
      if(Math.abs(x)<1e-9) continue;
      const sx=worldToScreen({x,y:0}).x;
      if(sx>20&&sx<w-20) ctx.fillText(x,sx+3,Math.min(h-5,Math.max(14,y0+15)));
    }
    for(let y=Math.ceil(bottom/labelStep)*labelStep;y<=top;y+=labelStep){
      if(Math.abs(y)<1e-9) continue;
      const sy=worldToScreen({x:0,y}).y;
      if(sy>15&&sy<h-10) ctx.fillText(y,Math.min(w-25,Math.max(3,x0+6)),sy-3);
    }
  }

  function drawPolyline(arr, stroke, fill, width=2.5){
    if(arr.length<2)return;
    ctx.beginPath();
    arr.forEach((p,i)=>{const s=worldToScreen(p); if(i===0)ctx.moveTo(s.x,s.y);else ctx.lineTo(s.x,s.y)});
    ctx.closePath();
    ctx.fillStyle=fill;ctx.fill();
    ctx.strokeStyle=stroke;ctx.lineWidth=width;ctx.stroke();
  }

  function draw(){
    drawGrid();
    if(mode==='parabola'){
      drawParabola();
    } else {
      if(points.length){
        drawPolyline(points,'#2563eb','rgba(37,99,235,.10)',3);
        points.forEach(p=>{const s=worldToScreen(p);ctx.fillStyle='#2563eb';ctx.beginPath();ctx.arc(s.x,s.y,5,0,Math.PI*2);ctx.fill();});
        if(points.length>=3){
          const transformed=points.map(applyPoint);
          drawPolyline(transformed,'#dc2626','rgba(220,38,38,.10)',3);
          transformed.forEach(p=>{const s=worldToScreen(p);ctx.fillStyle='#dc2626';ctx.beginPath();ctx.arc(s.x,s.y,4,0,Math.PI*2);ctx.fill()});
        }
      }
    }
  }

  function drawParabola(){
    const samples=[];
    for(let x=-12;x<=12;x+=.08) samples.push({x,y:x*x});
    const transformed=samples.map(applyPoint);
    ctx.strokeStyle='#2563eb';ctx.lineWidth=3;ctx.beginPath();
    samples.forEach((p,i)=>{const s=worldToScreen(p);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke();
    ctx.strokeStyle='#dc2626';ctx.lineWidth=3;ctx.beginPath();
    transformed.forEach((p,i)=>{const s=worldToScreen(p);i?ctx.lineTo(s.x,s.y):ctx.moveTo(s.x,s.y)});ctx.stroke();
  }

  function renderControls(){
    list.innerHTML='';
    transforms.forEach((t,index)=>{
      const el=document.createElement('div'); el.className='transform';el.draggable=true;el.dataset.id=t.id;
      let control='';
      if(t.type==='translationX'||t.type==='translationY'){
        control=`<div class="control"><button class="step minus">−</button><input type="number" step="1" value="${t.value}"><button class="step plus">+</button></div>`;
      } else if(t.type==='dilation'){
        control=`<div class="control"><button class="step minus">−</button><input title="Integer, decimal, or fraction" type="text" inputmode="decimal" value="${t.value}"><button class="step plus">+</button></div>`;
      } else if(t.type==='rotation'){
        control=`<div class="control">
          <button class="step rotation-minus" type="button">−</button>
          <span class="rotation-value" style="min-width:52px;text-align:center;font-weight:700">${t.value}°</span>
          <button class="step rotation-plus" type="button">+</button>
        </div>`;
      } else {
        control=`<div class="checkrow"><label><input type="checkbox" ${t.value?'checked':''}></label></div>`;
      }
      const clearButton = (t.type==='translationX'||t.type==='translationY'||t.type==='dilation'||t.type==='rotation')
        ? '<button class="clear">Clear</button>' : '';
      el.innerHTML = '<div class="transform-head"><span class="handle">☷</span><span class="transform-name">'
        + t.name + '</span>' + control + clearButton + '</div>';
      list.appendChild(el);

      const input=el.querySelector('input[type=number], input[type=text]');
      if(input){
        input.addEventListener('input',()=>{t.value=input.value; update();});
        el.querySelector('.minus').onclick=()=>stepTransform(t,-1);
        el.querySelector('.plus').onclick=()=>stepTransform(t,1);
      }
      const check=el.querySelector('input[type=checkbox]');
      if(check) check.onchange=()=>{t.value=check.checked;update()};
      const rotationMinus = el.querySelector('.rotation-minus');
      const rotationPlus = el.querySelector('.rotation-plus');
      if(rotationMinus){
        rotationMinus.onclick=()=>{
          const values=[0,90,180,270];
          let i=values.indexOf(Number(t.value));
          if(i<0)i=0;
          t.value=values[(i-1+values.length)%values.length];
          renderControls();
          update();
        };
      }
      if(rotationPlus){
        rotationPlus.onclick=()=>{
          const values=[0,90,180,270];
          let i=values.indexOf(Number(t.value));
          if(i<0)i=0;
          t.value=values[(i+1)%values.length];
          renderControls();
          update();
        };
      }
      const clearBtn = el.querySelector('.clear');
      if (clearBtn) {
        clearBtn.onclick=()=>{
          if(t.type==='translationX'||t.type==='translationY')t.value=0;
          if(t.type==='dilation')t.value='1';
          if(t.type==='rotation')t.value=0;
          renderControls();
          update();
        };
      }
      el.addEventListener('dragstart',()=>{el.classList.add('dragging');});
      el.addEventListener('dragend',()=>{el.classList.remove('dragging');});
    });
    list.querySelectorAll('.transform').forEach(el=>{
      el.addEventListener('dragover',e=>{e.preventDefault();const dragging=list.querySelector('.dragging');if(!dragging||dragging===el)return;const rect=el.getBoundingClientRect();list.insertBefore(dragging,e.clientY<rect.top+rect.height/2?el:el.nextSibling);});
      el.addEventListener('drop',()=>{const ids=[...list.children].map(x=>x.dataset.id);transforms.sort((a,b)=>ids.indexOf(a.id)-ids.indexOf(b.id));renderControls();update();});
    });
  }

  function stepTransform(t,dir){
    if(t.type==='translationX'||t.type==='translationY'){
      t.value=(Number(t.value)||0)+dir; renderControls();update(); return;
    }
    if(t.type==='dilation'){
      // Dilation steps are intentionally discrete:
      // ... 1/8, 1/7, 1/6, 1/5, 1/4, 1/3, 1/2, 1, 2, 3, 4, 5, 6, 7 ...
      // + moves toward larger scale factors; − moves toward smaller ones.
      let n=parseFraction(t.value);
      if(!Number.isFinite(n) || n<=0)n=1;

      if(dir>0){
        if(n < 1){
          const den=Math.round(1/n);
          t.value = den <= 2 ? '1' : `1/${den-1}`;
        } else {
          t.value = String(Math.floor(n)+1);
        }
      } else {
        if(n > 1){
          const whole=Math.floor(n);
          t.value = whole <= 2 ? '1/2' : String(whole-1);
        } else if(Math.abs(n-1)<1e-10) {
          t.value = '1/2';
        } else {
          const den=Math.round(1/n);
          t.value = `1/${den+1}`;
        }
      }
      renderControls();
      update();
    }
  }

  function update(){
    coordinateTables();
    updateParabolaEquations();
    draw();
    if(mode==='shape'){
      if(points.length===0) statusEl.textContent='Draw a shape by clicking points on the coordinate plane.';
      else if(points.length<3) statusEl.textContent=`${points.length} point${points.length===1?'':'s'} added. Add at least ${3-points.length} more.`;
      else statusEl.className='status success';
      if(points.length>=3) statusEl.textContent='Shape ready. Blue is original; red is transformed.';
    } else {
      statusEl.className='status success';
      statusEl.textContent='Parabola mode uses the same transformation pipeline as shape mode.';
    }
  }

  function updateParabolaEquations(){
    const p=pipeline();
    const rule=ruleString();
    coordinateRuleEl.textContent=rule;
    // Parametric transformed parent: X=a*t+b*t²+tx, Y=c*t+d*t²+ty.
    // Give a useful standard/vertex-form description for the common non-rotated case.
    const rot = ((transforms.find(t=>t.type==='rotation')?.value||0)%360+360)%360;
    const k=parseFraction(transforms.find(t=>t.type==='dilation')?.value||'1')||1;
    if(rot===0 && Math.abs(p.b)<1e-10 && Math.abs(p.c)<1e-10){
      const A=p.d/(p.a*p.a);
      const h=-p.tx/p.a;
      const v=p.ty;
      document.getElementById('paraVertex').textContent=`y = ${frac(A)}(x ${h>=0?'-':'+'} ${frac(Math.abs(h))})² ${signedTerm(v,'')}`.replace('+ 0','');
      document.getElementById('paraStandard').textContent=`y = ${frac(A)}x² ${signedTerm(-2*A*h,'x')} ${signedTerm(A*h*h+v,'')}`;
    } else if(rot===180){
      document.getElementById('paraVertex').textContent='y = a(x − h)² + k, with the 180° rotation represented in the pipeline.';
      document.getElementById('paraStandard').textContent=`Transformed relation: ${rule}`;
    } else {
      document.getElementById('paraVertex').textContent='Rotation changes the parabola orientation; use the coordinate rule above.';
      document.getElementById('paraStandard').textContent='Rotated parabola relation generated from the same pipeline.';
    }
  }

  function setMode(m){
    mode=m;
    document.getElementById('shapeMode').classList.toggle('active',m==='shape');
    document.getElementById('parabolaMode').classList.toggle('active',m==='parabola');
    parabolaPanel.classList.toggle('show',m==='parabola');
    coordinatePanel.style.display=m==='parabola'?'none':'block';
    coordinateRulePanel.style.display='block';
    help.textContent=m==='shape'?'Shape mode: click/tap to add points. Press and hold, then move to freeform draw.':'Parabola mode: blue is y = x²; red is the transformed parabola.';
    update();
  }

  document.getElementById('shapeMode').onclick=()=>setMode('shape');
  document.getElementById('parabolaMode').onclick=()=>setMode('parabola');

  document.getElementById('resetTransforms').onclick=()=>{
    transforms.forEach(t=>{
      if(t.type==='translationX'||t.type==='translationY')t.value=0;
      if(t.type==='dilation')t.value='1';
      if(t.type==='rotation')t.value=0;
      if(t.type==='reflectX'||t.type==='reflectY')t.value=false;
    });
    renderControls();update();
    statusEl.className='status';
    statusEl.textContent='Transformations reset. Your shape remains.';
  };
  document.getElementById('resetShape').onclick=()=>{
    points=[];view={cx:0,cy:0,scale:42};update();
    statusEl.className='status';
    statusEl.textContent='Shape deleted and grid restored.';
  };

  let holdTimer = null;
  let freeDrawing = false;
  let pointerMoved = false;
  let drawingPointerId = null;

  function addShapePointFromEvent(e){
    const r=canvas.getBoundingClientRect();
    const p=screenToWorld(e.clientX-r.left,e.clientY-r.top);
    // Snap points to the nearest half-unit for clean coordinate rules.
    p.x=Math.round(p.x*2)/2;
    p.y=Math.round(p.y*2)/2;
    points.push(p);
  }

  function addFreeformPointFromEvent(e){
    const r=canvas.getBoundingClientRect();
    const p=screenToWorld(e.clientX-r.left,e.clientY-r.top);
    // Freeform drawing keeps finer detail than click/tap mode.
    const last=points[points.length-1];
    if(!last || Math.hypot(p.x-last.x,p.y-last.y) >= 0.08){
      points.push(p);
      update();
    }
  }

  canvas.addEventListener('pointerdown',e=>{
    if(mode!=='shape') return;
    canvas.setPointerCapture(e.pointerId);
    drawingPointerId=e.pointerId;
    lastPointer={x:e.clientX,y:e.clientY};
    pointerMoved=false;
    freeDrawing=false;

    // A press-and-hold starts freeform drawing.
    holdTimer=setTimeout(()=>{
      freeDrawing=true;
      suppressDraw=true;
      points=[]; // Begin this stroke as a new freeform shape.
      addFreeformPointFromEvent(e);
      statusEl.className='status';
      statusEl.textContent='Freeform drawing — keep holding and move to draw.';
    },300);
  });

  canvas.addEventListener('pointermove',e=>{
    if(drawingPointerId!==e.pointerId) return;

    const dx=e.clientX-lastPointer.x,dy=e.clientY-lastPointer.y;
    if(Math.hypot(dx,dy)>3) pointerMoved=true;
    lastPointer={x:e.clientX,y:e.clientY};

    if(freeDrawing){
      addFreeformPointFromEvent(e);
      return;
    }

    // Before the hold threshold, allow graph panning when the pointer moves.
    if(pointerMoved){
      clearTimeout(holdTimer);
      view.cx-=dx/view.scale;
      view.cy+=dy/view.scale;
      draw();
    }
  });

  canvas.addEventListener('pointerup',e=>{
    if(drawingPointerId!==e.pointerId) return;
    clearTimeout(holdTimer);

    if(mode==='shape' && !freeDrawing && !pointerMoved){
      addShapePointFromEvent(e);
      update();
    } else if(freeDrawing){
      update();
      statusEl.className='status';
      statusEl.textContent=points.length>=3
        ? 'Freeform shape created. Blue is original; red is transformed.'
        : 'Freeform drawing needs at least 3 points.';
    }

    freeDrawing=false;
    drawingPointerId=null;
    pointerMoved=false;
  });

  canvas.addEventListener('pointercancel',e=>{
    clearTimeout(holdTimer);
    freeDrawing=false;
    drawingPointerId=null;
    pointerMoved=false;
  });

  canvas.addEventListener('wheel',e=>{
    e.preventDefault();
    const r=canvas.getBoundingClientRect();
    const before=screenToWorld(e.clientX-r.left,e.clientY-r.top);
    const factor=Math.exp(-e.deltaY*.001);
    view.scale=Math.max(8,Math.min(120,view.scale*factor));
    const after=screenToWorld(e.clientX-r.left,e.clientY-r.top);
    view.cx+=before.x-after.x;view.cy+=before.y-after.y;draw();
  },{passive:false});

  // Touch pinch zoom.
  let pinchStart=null;
  // Initialize the app.
  try {
    resizeCanvas();
    renderControls();
    update();
  } catch (err) {
    console.error(err);
    document.body.innerHTML = '<div style="font-family:system-ui;padding:40px;color:#172033"><h2>Transformation Visualizer</h2><p>The app encountered an initialization error.</p><pre style="white-space:pre-wrap;background:#f1f5f9;padding:15px;border-radius:8px">' + String(err && err.stack || err) + '</pre></div>';
  }
})();