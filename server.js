const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = Number(process.env.PORT || 3000);
const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const PUBLIC_DIR = path.join(__dirname, 'public');
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'ChangeMe-Immediately-2026!';
const SESSION_SECRET = process.env.SESSION_SECRET || crypto.randomBytes(32).toString('hex');
const sessions = new Map();
fs.mkdirSync(DATA_DIR, {recursive:true});
if (!fs.existsSync(DB_FILE)) fs.writeFileSync(DB_FILE, JSON.stringify({enquiries:[], tickets:[], products:[], users:[]}, null, 2));

function readDB(){ try { return JSON.parse(fs.readFileSync(DB_FILE,'utf8')); } catch { return {enquiries:[],tickets:[],products:[],users:[]}; } }
function writeDB(db){ fs.writeFileSync(DB_FILE, JSON.stringify(db,null,2)); }
function send(res, code, data, type='application/json; charset=utf-8'){
  res.writeHead(code, {'Content-Type':type,'X-Content-Type-Options':'nosniff','X-Frame-Options':'DENY','Referrer-Policy':'strict-origin-when-cross-origin','Cache-Control':'no-store'});
  res.end(type.startsWith('application/json') ? JSON.stringify(data) : data);
}
function getBody(req){ return new Promise((resolve,reject)=>{let raw=''; req.on('data',c=>{raw+=c; if(raw.length>1e6){reject(new Error('Request too large'));req.destroy();}}); req.on('end',()=>{try{resolve(raw?JSON.parse(raw):{});}catch{reject(new Error('Invalid JSON'));}});});}
function cookie(req,key){ const s=req.headers.cookie||''; const m=s.match(new RegExp('(?:^|; )'+key+'=([^;]*)')); return m?decodeURIComponent(m[1]):''; }
function isAdmin(req){ const token=cookie(req,'si_session'); const s=sessions.get(token); return !!(s && s.expires>Date.now()); }
function clean(v,max=500){ return String(v??'').trim().replace(/[<>]/g,'').slice(0,max); }
function id(prefix){ return prefix+'-'+Date.now().toString(36).toUpperCase()+'-'+crypto.randomBytes(3).toString('hex').toUpperCase(); }
function route(req,res){
  const u=new URL(req.url, 'http://localhost');
  if(req.method==='GET' && u.pathname==='/api/health') return send(res,200,{ok:true,service:'Sastha Infinite Enterprise Portal'});
  if(req.method==='GET' && u.pathname==='/api/products'){
    const db=readDB(); return send(res,200,db.products.filter(p=>p.active!==false));
  }
  if(req.method==='POST' && u.pathname==='/api/enquiries') return getBody(req).then(body=>{
    const name=clean(body.name,120), email=clean(body.email,180), phone=clean(body.phone,50), service=clean(body.service,120), message=clean(body.message,3000);
    if(!name||(!email&&!phone)||!service||!message) return send(res,400,{error:'Please provide your name, email or phone, service, and message.'});
    const db=readDB(), item={id:id('ENQ'),name,email,phone,service,message,status:'New',createdAt:new Date().toISOString()};
    db.enquiries.unshift(item); writeDB(db); return send(res,201,{ok:true,reference:item.id,message:'Your enquiry has been received. Save your reference number.'});
  }).catch(e=>send(res,400,{error:e.message}));
  if(req.method==='POST' && u.pathname==='/api/tickets') return getBody(req).then(body=>{
    const name=clean(body.name,120), email=clean(body.email,180), phone=clean(body.phone,50), category=clean(body.category,100), subject=clean(body.subject,180), description=clean(body.description,3000);
    if(!name||(!email&&!phone)||!category||!subject||!description) return send(res,400,{error:'Please complete all required fields and provide email or phone.'});
    const db=readDB(), item={id:id('SUP'),name,email,phone,category,subject,description,status:'Open',priority:'Normal',updates:[],createdAt:new Date().toISOString(),updatedAt:new Date().toISOString()};
    db.tickets.unshift(item); writeDB(db); return send(res,201,{ok:true,reference:item.id,message:'Your support ticket has been created.'});
  }).catch(e=>send(res,400,{error:e.message}));
  if(req.method==='GET' && u.pathname==='/api/tickets/status'){
    const ref=clean(u.searchParams.get('ref'),100).toUpperCase(); const db=readDB(); const t=db.tickets.find(x=>x.id.toUpperCase()===ref);
    if(!t) return send(res,404,{error:'Ticket not found. Check the reference number and try again.'});
    return send(res,200,{id:t.id,subject:t.subject,category:t.category,status:t.status,priority:t.priority,createdAt:t.createdAt,updatedAt:t.updatedAt,updates:t.updates||[]});
  }
  if(req.method==='POST' && u.pathname==='/api/admin/login') return getBody(req).then(body=>{
    const username=clean(body.username,100), password=String(body.password||'');
    if(username!==ADMIN_USER || password!==ADMIN_PASSWORD) return send(res,401,{error:'Invalid username or password.'});
    const token=crypto.randomBytes(32).toString('hex'); sessions.set(token,{expires:Date.now()+8*60*60*1000});
    res.writeHead(200,{'Content-Type':'application/json; charset=utf-8','Set-Cookie':`si_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=28800`,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
    return res.end(JSON.stringify({ok:true}));
  }).catch(e=>send(res,400,{error:e.message}));
  if(u.pathname.startsWith('/api/admin/')){
    if(!isAdmin(req)) return send(res,401,{error:'Please sign in as an administrator.'});
    const db=readDB();
    if(req.method==='POST' && u.pathname==='/api/admin/logout'){ const token=cookie(req,'si_session'); sessions.delete(token); res.writeHead(200,{'Content-Type':'application/json','Set-Cookie':'si_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0'}); return res.end('{"ok":true}');}
    if(req.method==='GET' && u.pathname==='/api/admin/data') return send(res,200,{enquiries:db.enquiries,tickets:db.tickets,products:db.products});
    if(req.method==='PATCH' && u.pathname==='/api/admin/enquiry') return getBody(req).then(b=>{
      const item=db.enquiries.find(x=>x.id===clean(b.id,100)); if(!item)return send(res,404,{error:'Enquiry not found'});
      item.status=clean(b.status,50); writeDB(db); return send(res,200,{ok:true});
    }).catch(e=>send(res,400,{error:e.message}));
    if(req.method==='PATCH' && u.pathname==='/api/admin/ticket') return getBody(req).then(b=>{
      const item=db.tickets.find(x=>x.id===clean(b.id,100)); if(!item)return send(res,404,{error:'Ticket not found'});
      if(b.status)item.status=clean(b.status,50); if(b.priority)item.priority=clean(b.priority,50);
      if(b.note){item.updates=item.updates||[];item.updates.unshift({note:clean(b.note,1000),at:new Date().toISOString()});}
      item.updatedAt=new Date().toISOString(); writeDB(db); return send(res,200,{ok:true});
    }).catch(e=>send(res,400,{error:e.message}));
    if(req.method==='POST' && u.pathname==='/api/admin/product') return getBody(req).then(b=>{
      const product={id:b.id?clean(b.id,100):id('PRD'),name:clean(b.name,160),category:clean(b.category,100),description:clean(b.description,1000),price:clean(b.price,80),active:b.active!==false};
      if(!product.name)return send(res,400,{error:'Product name is required'});
      const i=db.products.findIndex(p=>p.id===product.id); if(i>=0)db.products[i]=product;else db.products.unshift(product);
      writeDB(db); return send(res,200,{ok:true,product});
    }).catch(e=>send(res,400,{error:e.message}));
    if(req.method==='DELETE' && u.pathname==='/api/admin/product') {
      const pid=clean(u.searchParams.get('id'),100); db.products=db.products.filter(p=>p.id!==pid); writeDB(db); return send(res,200,{ok:true});
    }
    return send(res,404,{error:'Admin endpoint not found'});
  }
  let file= u.pathname==='/' ? 'index.html' : decodeURIComponent(u.pathname).replace(/^\/+/, '');
  const full=path.resolve(PUBLIC_DIR,file);
  if(!full.startsWith(path.resolve(PUBLIC_DIR)+path.sep) && full!==path.resolve(PUBLIC_DIR,'index.html')) return send(res,403,'Forbidden','text/plain');
  fs.readFile(full,(err,data)=>{if(err)return send(res,404,'Not found','text/plain; charset=utf-8'); const ext=path.extname(full); const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'application/javascript; charset=utf-8','.png':'image/png','.svg':'image/svg+xml'}; send(res,200,data.toString(ext==='.png'?'base64':'utf8'),types[ext]||'application/octet-stream'); if(ext==='.png'){ /* handled below by dedicated raw server path in normal deployments */ }});
}
const server=http.createServer((req,res)=>{
  // Static binary handling for logo
  const u=new URL(req.url,'http://localhost');
  if(req.method==='GET' && u.pathname==='/logo.png'){
    const p=path.join(PUBLIC_DIR,'logo.png');
    return fs.readFile(p,(err,data)=>{if(err)return send(res,404,'Logo not found','text/plain');res.writeHead(200,{'Content-Type':'image/png','Cache-Control':'public, max-age=3600','X-Content-Type-Options':'nosniff'});res.end(data);});
  }
  route(req,res);
});
server.listen(PORT,()=>console.log(`Sastha Infinite portal running at http://localhost:${PORT}`));
