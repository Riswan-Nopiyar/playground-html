/* ── DEFAULT CODE ── */
const DEFAULT=`<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>My Page</title>
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);min-height:100vh;display:flex;align-items:center;justify-content:center}
    .card{background:#fff;border-radius:16px;padding:40px;max-width:420px;text-align:center;box-shadow:0 20px 60px rgba(0,0,0,.2)}
    h1{color:#333;margin-bottom:12px;font-size:1.8rem}
    p{color:#666;line-height:1.6;margin-bottom:24px}
    button{background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;border:none;padding:12px 28px;border-radius:8px;font-size:15px;cursor:pointer;transition:transform .2s,box-shadow .2s}
    button:hover{transform:translateY(-2px);box-shadow:0 8px 20px rgba(102,126,234,.5)}
    #n{font-size:2.5rem;font-weight:700;color:#667eea;margin:20px 0}
  </style>
</head>
<body>
  <div class="card">
    <h1>🎉 HTML Playground</h1>
    <p>Edit kode di kiri — preview muncul otomatis di kanan.</p>
    <div id="n">0</div>
    <button onclick="document.getElementById('n').textContent=+document.getElementById('n').textContent+1">Click Me!</button>
  </div>
</body>
</html>`;

/* ── FONT SIZE ── */
// Sizes array
const FSZ=[11,12,13,14,15,16,17,18,20];
let fsi=parseInt(localStorage.getItem('fsi')||'2'); // default index 2 = 13px

function setFS(i){
  fsi=Math.max(0,Math.min(FSZ.length-1,i));
  const sz=FSZ[fsi];
  localStorage.setItem('fsi',fsi);
  document.getElementById('fb').textContent=sz;
  // Apply font size to CodeMirror by updating its wrapper style
  // CodeMirror uses its own font-size on .CodeMirror element
  const cmEl=document.querySelector('#cmhost .CodeMirror');
  if(cmEl){
    cmEl.style.fontSize=sz+'px';
    // Refresh so line heights recompute
    if(window.cm) window.cm.refresh();
  }
  toast('Font: '+sz+'px');
}

document.getElementById('fi').onclick=()=>setFS(fsi+1);
document.getElementById('fd').onclick=()=>setFS(fsi-1);

/* ── THEME ── */
// All three themes are pure CSS variables — no external CDN needed.
// We switch by adding/removing a class on <html>.
function applyTheme(name){
  const root=document.documentElement;
  root.classList.remove('sublime','light');
  if(name==='sublime') root.classList.add('sublime');
  else if(name==='light') root.classList.add('light');
  // Keep CM theme as 'default' always — we override all colors via CSS vars
  if(window.cm) window.cm.setOption('theme','default');
  localStorage.setItem('th',name);
  // Force CM to repaint
  setTimeout(()=>{ if(window.cm) window.cm.refresh(); },10);
}

const savedTheme=localStorage.getItem('th')||'vscode';
document.getElementById('theme-sel').value=savedTheme;
document.getElementById('theme-sel').onchange=function(){applyTheme(this.value);};

/* ── INIT CODEMIRROR ── */
const VOID=new Set(['area','base','br','col','embed','hr','img','input','link','meta','param','source','track','wbr']);
const ETAGS=['div','span','p','a','img','ul','ol','li','h1','h2','h3','h4','h5','h6','section','article','header','footer','nav','main','aside','form','input','button','textarea','select','option','label','table','tr','td','th','thead','tbody','script','style','link','meta','figure','figcaption','details','summary','dialog','video','audio','canvas','svg','path','blockquote','pre','code','em','strong','br','hr','iframe'];

window.cm=CodeMirror(document.getElementById('cmhost'),{
  value:localStorage.getItem('code')||DEFAULT,
  mode:'htmlmixed',
  lineNumbers:true,
  indentUnit:2,tabSize:2,indentWithTabs:false,
  theme:'default',
  autoCloseTags:true,autoCloseBrackets:true,matchBrackets:true,
  styleActiveLine:true,lineWrapping:false,
  foldGutter:true,
  gutters:['CodeMirror-linenumbers','CodeMirror-foldgutter'],
  extraKeys:{
    'Ctrl-Enter':runCode,
    'Ctrl-Space':'autocomplete',
    'Shift-Alt-F':fmtCode,
    'Ctrl-/':'toggleComment',
    Tab(c){
      if(c.somethingSelected()){c.indentSelection('add');return;}
      const cur=c.getCursor(),ln=c.getLine(cur.line),before=ln.slice(0,cur.ch);
      const m=before.match(/(\S+)$/);
      if(m&&emmet(c,m[1]))return;
      c.replaceSelection('  ');
    }
  },
  hintOptions:{completeSingle:false}
});

// After CodeMirror is initialized, apply saved font size and theme
setTimeout(()=>{
  setFS(fsi);
  applyTheme(savedTheme);
},0);

/* ── EMMET ── */
function emmet(c,trigger){
  const m=trigger.match(/^([a-z][a-z0-9]*)(?:\.([a-z][a-z0-9-]*))?(?:#([a-z][a-z0-9-]*))?$/i);
  if(!m||!ETAGS.includes(m[1]))return false;
  const tag=m[1],cls=m[2]?` class="${m[2]}"`:'',id=m[3]?` id="${m[3]}"`:'';
  const exp=VOID.has(tag)?`<${tag}${id}${cls}/>`:`<${tag}${id}${cls}></${tag}>`;
  const cur=c.getCursor();
  c.replaceRange(exp,{line:cur.line,ch:cur.ch-trigger.length},cur);
  if(!VOID.has(tag)) c.setCursor({line:cur.line,ch:cur.ch-trigger.length+tag.length+id.length+cls.length+2});
  return true;
}

/* ── AUTOCOMPLETE ── */
let act;
cm.on('keyup',(c,e)=>{
  if([13,27,37,38,39,40,9,16,17,18,91].includes(e.keyCode))return;
  if(c.state.completionActive)return;
  clearTimeout(act);
  act=setTimeout(()=>{
    if(c.getTokenAt(c.getCursor()).string.length>=1)
      CodeMirror.commands.autocomplete(c,null,{completeSingle:false});
  },150);
});

/* ── CONSOLE ── */
let logs=[],errs=0;
function clrCons(){
  logs=[];errs=0;
  document.getElementById('cout').innerHTML='<div class="mty">No output yet.</div>';
  document.getElementById('ccount').textContent='0 messages';
  document.getElementById('ebadge').style.display='none';
  document.getElementById('sb').classList.remove('err');
}
document.getElementById('clr').onclick=clrCons;

window.addEventListener('message',e=>{
  if(!e.data||e.data.type!=='pg')return;
  const{level,msg,time}=e.data;
  logs.push({level,msg,time});
  const out=document.getElementById('cout');
  out.querySelector('.mty')?.remove();
  const d=document.createElement('div');
  d.className='log '+level;
  d.innerHTML=`<span class="lt">${time}</span><span class="lm">${esc(msg)}</span>`;
  out.appendChild(d);
  out.scrollTop=out.scrollHeight;
  document.getElementById('ccount').textContent=logs.length+' message'+(logs.length!==1?'s':'');
  if(level==='error'){
    errs++;
    const b=document.getElementById('ebadge');
    b.style.display='inline';b.textContent=errs;
    document.getElementById('sb').classList.add('err');
  }
});
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}

/* ── RUN CODE ── */
let liveOn=true,liveT;

function runCode(){
  clrCons();
  const code=cm.getValue();
  const frame=document.getElementById('pframe');
  // Console interceptor
  const ic=`<`+`script>(function(){
var ol=console.log,ow=console.warn,oe=console.error,oi=console.info;
function s(lv,a){try{var msg=Array.from(a).map(function(x){if(x===null)return'null';if(x===undefined)return'undefined';if(typeof x==='object'){try{return JSON.stringify(x,null,2)}catch(er){return String(x)}}return String(x);}).join(' ');window.parent.postMessage({type:'pg',level:lv,msg:msg,time:new Date().toLocaleTimeString()},'*');}catch(er){}}
console.log=function(){ol.apply(console,arguments);s('log',arguments);};
console.warn=function(){ow.apply(console,arguments);s('warn',arguments);};
console.error=function(){oe.apply(console,arguments);s('error',arguments);};
console.info=function(){oi.apply(console,arguments);s('info',arguments);};
window.onerror=function(msg,src,ln){s('error',[msg+' (ln '+ln+')']);return false;};
}());<`+`/script>`;
  let out=code;
  if(code.includes('</head>'))out=code.replace('</head>',ic+'</head>');
  else if(code.includes('<body>'))out=code.replace('<body>','<body>'+ic);
  else out=ic+code;
  const doc=frame.contentDocument||frame.contentWindow.document;
  doc.open();doc.write(out);doc.close();
  setTimeout(()=>{
    const w=frame.offsetWidth,h=frame.offsetHeight;
    document.getElementById('sbdim').textContent=`${w}×${h}`;
    document.getElementById('pinfo').textContent=`${w}×${h}px`;
  },120);
}

/* ── LIVE PREVIEW ── */
cm.on('change',()=>{
  document.querySelector('.tab.active')?.classList.add('mod');
  localStorage.setItem('code',cm.getValue());
  updSb();
  if(!liveOn)return;
  clearTimeout(liveT);
  liveT=setTimeout(runCode,700);
});

document.getElementById('sblive').onclick=()=>{
  liveOn=!liveOn;
  document.getElementById('sblive').textContent=liveOn?'● Live':'○ Manual';
  toast(liveOn?'Live on':'Manual mode');
};

/* ── STATUS BAR ── */
cm.on('cursorActivity',updSb);
function updSb(){
  const c=cm.getCursor();
  document.getElementById('sbpos').textContent=`Ln ${c.line+1}, Col ${c.ch+1}`;
  const b=new Blob([cm.getValue()]).size;
  document.getElementById('sbsz').textContent=b<1024?b+' B':(b/1024).toFixed(1)+' KB';
}

/* ── FORMAT ── */
function fmtCode(){
  try{
    let s=cm.getValue().replace(/>\s*</g,'>\n<').replace(/(<[^\/!][^>]*[^\/]>)([^\n])/g,'$1\n$2').replace(/([^\n])(<\/[^>]+>)/g,'$1\n$2');
    let ind=0;
    const r=s.split('\n').map(l=>{
      l=l.trim();if(!l)return'';
      if(l.match(/^<\/[^>]+>/))ind=Math.max(0,ind-1);
      const o='  '.repeat(ind)+l;
      if(l.match(/^<[^\/!][^>]*[^\/]>$/)&&!l.match(/^<(area|base|br|col|embed|hr|img|input|link|meta|param|source|track|wbr)/i))ind++;
      return o;
    }).filter((l,i,a)=>!(l===''&&a[i-1]==='')).join('\n');
    cm.setValue(r);toast('Formatted ✓','ok');
  }catch(e){toast('Format error','err');}
}
document.getElementById('fmt-btn').onclick=fmtCode;

/* ── WRAP ── */
let wrap=false;
document.getElementById('wrap-btn').onclick=()=>{
  wrap=!wrap;cm.setOption('lineWrapping',wrap);
  document.getElementById('wrap-btn').classList.toggle('on',wrap);
  toast(wrap?'Wrap on':'Wrap off');
};

/* ── FIND & REPLACE ── */
const fbar=document.getElementById('fb-bar');
let matches=[],mi=0;
document.getElementById('find-btn').onclick=toggleFind;
document.getElementById('fclose').onclick=closeFind;
function toggleFind(){fbar.classList.toggle('on');if(fbar.classList.contains('on')){const s=cm.getSelection();if(s)document.getElementById('fi-in').value=s;document.getElementById('fi-in').focus();doSearch();}}
function closeFind(){fbar.classList.remove('on');cm.focus();}
document.getElementById('fi-in').oninput=doSearch;
function doSearch(){
  const q=document.getElementById('fi-in').value;matches=[];
  if(!q){document.getElementById('fc').textContent='0/0';return;}
  const cur=cm.getSearchCursor(q,{line:0,ch:0},{caseFold:true});
  while(cur.findNext())matches.push({from:cur.from(),to:cur.to()});
  document.getElementById('fc').textContent=matches.length?`1/${matches.length}`:'0/0';
  if(matches.length)hlM(0);
}
function hlM(i){if(!matches.length)return;mi=((i%matches.length)+matches.length)%matches.length;cm.setSelection(matches[mi].from,matches[mi].to);cm.scrollIntoView({from:matches[mi].from,to:matches[mi].to},80);document.getElementById('fc').textContent=`${mi+1}/${matches.length}`;}
document.getElementById('fn').onclick=()=>hlM(mi+1);
document.getElementById('fp').onclick=()=>hlM(mi-1);
document.getElementById('fi-in').onkeydown=e=>{if(e.key==='Enter'){e.shiftKey?hlM(mi-1):hlM(mi+1);}if(e.key==='Escape')closeFind();};
document.getElementById('frepl').onclick=()=>{if(!matches.length)return;cm.replaceRange(document.getElementById('ri-in').value,matches[mi].from,matches[mi].to);doSearch();toast('Replaced','ok');};

/* ── PREVIEW TABS ── */
document.querySelectorAll('.ptab').forEach(b=>{
  b.onclick=()=>{
    document.querySelectorAll('.ptab').forEach(x=>x.classList.remove('active'));
    b.classList.add('active');
    const v=b.dataset.v;
    document.getElementById('pframe').style.display=v==='preview'?'block':'none';
    const cp=document.getElementById('cpanel');
    if(v==='console'){cp.classList.add('on');errs=0;document.getElementById('ebadge').style.display='none';document.getElementById('sb').classList.remove('err');}
    else cp.classList.remove('on');
  };
});

/* ── COPY ── */
document.getElementById('copy-btn').onclick=()=>navigator.clipboard.writeText(cm.getValue()).then(()=>toast('Copied ✓','ok')).catch(()=>toast('Copy failed','err'));

/* ── SNIPPETS ── */
const SNIPS=[
  {n:'Boilerplate',i:'📄',full:true,c:DEFAULT},
  {n:'Flexbox Center',i:'📦',c:`<div style="display:flex;align-items:center;justify-content:center;height:200px;background:#f0f0f0;">\n  <p>Centered Content</p>\n</div>`},
  {n:'CSS Card',i:'🃏',c:`<div style="background:#fff;border-radius:12px;padding:24px;box-shadow:0 4px 20px rgba(0,0,0,.1);max-width:320px;margin:20px auto;">\n  <h2>Card Title</h2>\n  <p style="color:#666;line-height:1.6">Description.</p>\n</div>`},
  {n:'Navbar',i:'🧭',c:`<nav style="display:flex;align-items:center;padding:0 24px;background:#1a1a2e;height:56px;gap:24px;">\n  <span style="font-weight:700;color:#fff;font-size:18px">Logo</span>\n  <a href="#" style="color:rgba(255,255,255,.7);text-decoration:none">Home</a>\n  <button style="margin-left:auto;background:#7c3aed;color:#fff;border:none;padding:8px 16px;border-radius:6px;cursor:pointer">Sign Up</button>\n</nav>`},
  {n:'Form',i:'📝',c:`<form style="max-width:400px;margin:40px auto;padding:32px;background:#fff;border-radius:12px;box-shadow:0 4px 20px rgba(0,0,0,.1);">\n  <h2 style="margin-bottom:20px">Contact</h2>\n  <input type="text" placeholder="Name" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:12px;display:block;font-size:14px"/>\n  <input type="email" placeholder="Email" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;margin-bottom:16px;display:block;font-size:14px"/>\n  <button style="width:100%;background:#3b82f6;color:#fff;border:none;padding:12px;border-radius:6px;font-size:15px;cursor:pointer">Send</button>\n</form>`},
  {n:'CSS Grid',i:'🔲',c:`<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px;padding:20px;">\n  <div style="background:#6366f1;color:#fff;padding:32px;border-radius:8px;text-align:center">1</div>\n  <div style="background:#8b5cf6;color:#fff;padding:32px;border-radius:8px;text-align:center">2</div>\n  <div style="background:#a78bfa;color:#fff;padding:32px;border-radius:8px;text-align:center">3</div>\n</div>`},
  {n:'Animated Button',i:'✨',c:`<style>.ba{background:linear-gradient(135deg,#6366f1,#a855f7);color:#fff;border:none;padding:14px 32px;border-radius:50px;font-size:16px;cursor:pointer;transition:transform .2s,box-shadow .2s}.ba:hover{transform:translateY(-3px);box-shadow:0 12px 32px rgba(99,102,241,.5)}</style>\n<div style="display:flex;justify-content:center;padding:60px"><button class="ba">Hover Me!</button></div>`},
  {n:'Console Demo',i:'🖥️',c:`<`+`script>console.log('Hello!');console.warn('Warning');console.error('Error');console.info({name:'Playground',v:2});<`+`/script>\n<p style="font-family:sans-serif;padding:20px">→ Lihat tab Console</p>`},
];

let sel=null;
document.getElementById('snip-btn').onclick=()=>{
  const mb=document.getElementById('mbody');mb.innerHTML='';sel=null;
  SNIPS.forEach((s,i)=>{
    const b=document.createElement('button');
    b.style.cssText='display:flex;align-items:center;gap:9px;width:100%;padding:9px 11px;background:transparent;border:1px solid var(--border);border-radius:5px;color:var(--text);font-family:Inter,sans-serif;font-size:13px;cursor:pointer;margin-bottom:5px;transition:all .15s';
    b.innerHTML=`<span style="font-size:17px">${s.i}</span>${s.n}`;
    b.onclick=()=>{sel=i;mb.querySelectorAll('button').forEach(x=>{x.style.borderColor='var(--border)';x.style.background='transparent'});b.style.borderColor='var(--accent)';b.style.background='rgba(88,166,255,.1)';};
    mb.appendChild(b);
  });
  document.getElementById('ov').classList.add('on');
};
document.getElementById('mcancel').onclick=()=>document.getElementById('ov').classList.remove('on');
document.getElementById('mok').onclick=()=>{
  if(sel===null){toast('Pilih snippet dulu','err');return;}
  const s=SNIPS[sel];
  if(s.full)cm.setValue(s.c);else cm.replaceRange('\n'+s.c,cm.getCursor());
  document.getElementById('ov').classList.remove('on');
  toast('Inserted: '+s.n,'ok');runCode();
};

/* ── RESIZE ── */
const rh=document.getElementById('rh'),ep=document.getElementById('ep'),mn=document.getElementById('main'),sh=document.getElementById('shield');
let drag=false,rx,rw;
rh.addEventListener('mousedown',e=>{drag=true;rx=e.clientX;rw=ep.offsetWidth;rh.classList.add('drag');sh.classList.add('on');e.preventDefault();});
document.addEventListener('mousemove',e=>{if(!drag)return;ep.style.width=Math.max(150,Math.min(mn.offsetWidth-150,rw+e.clientX-rx))+'px';});
document.addEventListener('mouseup',()=>{if(!drag)return;drag=false;rh.classList.remove('drag');sh.classList.remove('on');cm.refresh();const f=document.getElementById('pframe');document.getElementById('sbdim').textContent=`${f.offsetWidth}×${f.offsetHeight}`;document.getElementById('pinfo').textContent=`${f.offsetWidth}×${f.offsetHeight}px`;});

/* ── KEYBOARD ── */
document.addEventListener('keydown',e=>{
  if(e.ctrlKey&&e.key==='f'){e.preventDefault();toggleFind();}
  if(e.ctrlKey&&e.key==='Enter'){e.preventDefault();runCode();}
  if(e.key==='Escape'){closeFind();document.getElementById('ov').classList.remove('on');}
});

/* ── WINDOW RESIZE ── */
window.addEventListener('resize',()=>{cm.refresh();const f=document.getElementById('pframe');document.getElementById('sbdim').textContent=`${f.offsetWidth}×${f.offsetHeight}`;});

/* ── TOAST ── */
let tt;
function toast(msg,type=''){const t=document.getElementById('toast');t.textContent=msg;t.className='on'+(type?' '+type:'');clearTimeout(tt);tt=setTimeout(()=>t.className='',2000);}

/* ── START ── */
runCode();
updSb();