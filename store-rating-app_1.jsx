import { useState, useMemo } from "react";

// ─── Seed & Persistence ───────────────────────────────────────────────────────

const SEED = () => ({
  users: [
    { id:"u1", name:"System Administrator Root",     email:"admin@platform.com",      password:"Admin@123",  address:"123 Admin Lane, Control City, CA 90001",         role:"admin"  },
    { id:"u2", name:"Alice Johnson Marketplace",     email:"alice@example.com",        password:"Alice@123",  address:"456 Oak Street, Springfield, IL 62701",           role:"normal" },
    { id:"u3", name:"Bob Williams Trading Company",  email:"bob@example.com",          password:"Bob@1234!",  address:"789 Pine Avenue, Portland, OR 97201",             role:"normal" },
    { id:"u4", name:"Corner Fresh Grocery Store",    email:"corner@store.com",         password:"Store@123",  address:"10 Market Square, Austin, TX 78701",              role:"owner"  },
    { id:"u5", name:"Sunrise Electronics Emporium",  email:"sunrise@store.com",        password:"Store@456",  address:"22 Tech Boulevard, San Jose, CA 95101",           role:"owner"  },
    { id:"u6", name:"Green Leaf Organic Farmers",    email:"greenleaf@store.com",      password:"Store@789",  address:"55 Garden Road, Boulder, CO 80301",               role:"owner"  },
    { id:"u7", name:"Charlie Davis Sports Equipment",email:"charlie@example.com",      password:"Charlie@1!", address:"321 River Road, Denver, CO 80201",                role:"normal" },
  ],
  stores: [
    { id:"s1", ownerId:"u4", name:"Corner Fresh Grocery Store",   email:"corner@store.com",    address:"10 Market Square, Austin, TX 78701"    },
    { id:"s2", ownerId:"u5", name:"Sunrise Electronics Emporium", email:"sunrise@store.com",   address:"22 Tech Boulevard, San Jose, CA 95101" },
    { id:"s3", ownerId:"u6", name:"Green Leaf Organic Farmers",   email:"greenleaf@store.com", address:"55 Garden Road, Boulder, CO 80301"     },
  ],
  ratings: [
    { id:"r1", userId:"u2", storeId:"s1", value:4 },
    { id:"r2", userId:"u3", storeId:"s1", value:5 },
    { id:"r3", userId:"u2", storeId:"s2", value:3 },
    { id:"r4", userId:"u7", storeId:"s2", value:5 },
    { id:"r5", userId:"u3", storeId:"s3", value:4 },
  ],
});

const DB = (() => {
  const ld = (k,fb) => { try { const v=localStorage.getItem(k); return v?JSON.parse(v):fb; } catch { return fb; } };
  const sv = (k,v) => { try { localStorage.setItem(k,JSON.stringify(v)); } catch {} };
  let data = ld("srapp_v2",null);
  if (!data) { data = SEED(); sv("srapp_v2", data); }
  const save = () => sv("srapp_v2", data);
  return {
    users:       ()  => [...data.users],
    stores:      ()  => [...data.stores],
    ratings:     ()  => [...data.ratings],
    addUser:     (u) => { data.users.push(u); save(); },
    updateUser:  (id,patch) => { const i=data.users.findIndex(x=>x.id===id); if(i>=0){data.users[i]={...data.users[i],...patch}; save();} },
    addStore:    (s) => { data.stores.push(s); save(); },
    upsertRating:(r) => {
      const i=data.ratings.findIndex(x=>x.userId===r.userId&&x.storeId===r.storeId);
      if(i>=0) data.ratings[i]={...data.ratings[i],value:r.value}; else data.ratings.push(r);
      save();
    },
    avgRating:   (sid) => { const rs=data.ratings.filter(r=>r.storeId===sid); return rs.length?(rs.reduce((a,b)=>a+b.value,0)/rs.length).toFixed(1):null; },
    userRating:  (uid,sid) => { const r=data.ratings.find(x=>x.userId===uid&&x.storeId===sid); return r?r.value:null; },
    storeRaters: (sid) => data.ratings.filter(r=>r.storeId===sid).map(r=>({...data.users.find(u=>u.id===r.userId), ratingValue:r.value})),
  };
})();

// ─── Validation ───────────────────────────────────────────────────────────────

const V = {
  name:    v => !v?"Name is required.":v.length<20?"Name must be at least 20 characters.":v.length>60?"Name must be at most 60 characters.":undefined,
  email:   v => !v?"Email is required.":/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)?undefined:"Enter a valid email address.",
  address: v => !v?"Address is required.":v.length>400?"Address must be at most 400 characters.":undefined,
  password:v => !v?"Password is required.":v.length<8||v.length>16?"Password must be 8–16 characters.":/[A-Z]/.test(v)?/[!@#$%^&*()\-_=+\[\]{};':"\\|,.<>\/?]/.test(v)?undefined:"Must include at least one special character.":"Must include at least one uppercase letter.",
};

// ─── Global Toast ─────────────────────────────────────────────────────────────

let _toastFn = null;
const toast = (msg, type="success") => _toastFn?.(msg, type);
function uid() { return Math.random().toString(36).slice(2,10); }

// ─── CSS ──────────────────────────────────────────────────────────────────────

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600;9..40,700&family=Instrument+Serif&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
  --ink:#1a1a2e;--ink2:#4a4a6a;--ink3:#8888aa;
  --bg:#f7f6f3;--surface:#fff;--surface2:#f0eff8;
  --accent:#5b4fcf;--accent-l:#ebe9fa;--accent-d:#3d35a0;
  --gold:#f0a500;--gold-l:#fff8e7;
  --green:#1aaa6e;--red:#e0334c;--red-l:#fdeef1;
  --border:#e4e3ef;--r:10px;--rl:16px;
  --sh:0 1px 3px rgba(26,26,46,.08),0 4px 16px rgba(26,26,46,.06);
  --shl:0 4px 12px rgba(26,26,46,.1),0 12px 40px rgba(26,26,46,.1);
  --fd:'Instrument Serif',Georgia,serif;--fb:'DM Sans',system-ui,sans-serif;
}
html,body,#root{height:100%}
body{font-family:var(--fb);background:var(--bg);color:var(--ink);font-size:15px;line-height:1.6;-webkit-font-smoothing:antialiased}

/* ── Auth ── */
.auth-wrap{min-height:100vh;display:flex;align-items:center;justify-content:center;background:var(--ink)}
.auth-card{background:var(--surface);border-radius:var(--rl);padding:48px 44px;width:100%;max-width:460px;box-shadow:var(--shl)}
.auth-logo{font-family:var(--fd);font-size:28px;color:var(--ink);margin-bottom:4px}
.auth-tagline{color:var(--ink3);font-size:14px;margin-bottom:32px}
.tab-row{display:flex;border:1.5px solid var(--border);border-radius:var(--r);overflow:hidden;margin-bottom:28px}
.tab-btn{flex:1;padding:10px;font-family:var(--fb);font-size:14px;font-weight:500;cursor:pointer;border:none;background:transparent;color:var(--ink2);transition:all .15s}
.tab-btn.on{background:var(--accent);color:#fff}

/* ── Shell ── */
.shell{display:flex;height:100vh;overflow:hidden}
.sidebar{width:244px;background:var(--ink);display:flex;flex-direction:column;flex-shrink:0;overflow-y:auto}
.sb-brand{padding:24px 20px 20px;border-bottom:1px solid rgba(255,255,255,.08)}
.sb-name{font-family:var(--fd);font-size:20px;color:#fff;line-height:1.2}
.sb-role{font-size:11px;color:rgba(255,255,255,.4);text-transform:uppercase;letter-spacing:.09em;margin-top:3px}
.sb-nav{padding:14px 10px;flex:1}
.nav-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:8px;background:transparent;border:none;color:rgba(255,255,255,.6);font-family:var(--fb);font-size:14px;font-weight:500;cursor:pointer;transition:all .15s;text-align:left;margin-bottom:2px}
.nav-btn:hover{background:rgba(255,255,255,.07);color:#fff}
.nav-btn.on{background:var(--accent);color:#fff}
.nav-icon{font-size:15px;width:20px;text-align:center;flex-shrink:0}
.sb-foot{padding:14px 10px;border-top:1px solid rgba(255,255,255,.08)}
.logout-btn{display:flex;align-items:center;gap:10px;width:100%;padding:10px 12px;border-radius:8px;background:transparent;border:none;color:rgba(255,255,255,.5);font-family:var(--fb);font-size:14px;cursor:pointer;transition:all .15s}
.logout-btn:hover{color:var(--red);background:rgba(224,51,76,.1)}
.main{flex:1;overflow-y:auto;display:flex;flex-direction:column}
.topbar{background:var(--surface);border-bottom:1px solid var(--border);padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between;flex-shrink:0}
.topbar-title{font-family:var(--fd);font-size:20px;color:var(--ink)}
.topbar-user{display:flex;align-items:center;gap:10px}
.avatar{width:34px;height:34px;border-radius:50%;background:var(--accent-l);color:var(--accent);font-weight:700;font-size:13px;display:flex;align-items:center;justify-content:center}
.content{padding:32px 28px;max-width:1140px;width:100%}

/* ── Stats ── */
.stat-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-bottom:32px}
.stat-card{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:24px}
.stat-label{font-size:12px;color:var(--ink3);font-weight:600;text-transform:uppercase;letter-spacing:.07em}
.stat-val{font-family:var(--fd);font-size:44px;color:var(--ink);line-height:1.1;margin-top:4px}
.stat-sub{font-size:12px;color:var(--ink3);margin-top:4px}

/* ── Table ── */
.tcard{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);overflow:hidden}
.thead-bar{display:flex;align-items:center;justify-content:space-between;padding:16px 22px;border-bottom:1px solid var(--border);gap:10px;flex-wrap:wrap}
.thead-title{font-weight:600;font-size:15px;color:var(--ink)}
.filters{display:flex;gap:8px;flex-wrap:wrap;flex:1;justify-content:flex-end}
.fbox{display:flex;align-items:center;gap:6px;background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:7px 11px;min-width:160px}
.fbox input{border:none;background:transparent;font-family:var(--fb);font-size:13px;color:var(--ink);outline:none;flex:1;min-width:80px}
.fbox select{border:none;background:transparent;font-family:var(--fb);font-size:13px;color:var(--ink);outline:none;cursor:pointer}
table{width:100%;border-collapse:collapse}
th{padding:11px 18px;text-align:left;font-size:12px;font-weight:600;color:var(--ink3);text-transform:uppercase;letter-spacing:.07em;background:var(--bg);border-bottom:1px solid var(--border);cursor:pointer;user-select:none;white-space:nowrap}
th:hover{color:var(--accent)}
th.sorted{color:var(--accent)}
td{padding:13px 18px;font-size:14px;color:var(--ink2);border-bottom:1px solid var(--border);vertical-align:middle}
tr:last-child td{border-bottom:none}
tr:hover td{background:var(--surface2)}

/* ── Badges ── */
.badge{display:inline-flex;align-items:center;padding:3px 9px;border-radius:20px;font-size:12px;font-weight:600}
.b-admin{background:var(--accent-l);color:var(--accent)}
.b-normal{background:var(--surface2);color:var(--ink2)}
.b-owner{background:var(--gold-l);color:#9a6700}

/* ── Stars ── */
.stars{display:flex;gap:1px}
.star{cursor:pointer;transition:transform .1s;line-height:1}
.star:hover{transform:scale(1.2)}
.star.on{color:var(--gold)}
.star.off{color:#ddd}

/* ── Forms ── */
.fg{display:grid;grid-template-columns:1fr 1fr;gap:14px}
.fg1{grid-template-columns:1fr}
.ff{display:flex;flex-direction:column;gap:5px}
.ff.span2{grid-column:1/-1}
label{font-size:13px;font-weight:600;color:var(--ink2)}
input[type=text],input[type=email],input[type=password],select,textarea{font-family:var(--fb);font-size:14px;color:var(--ink);background:var(--bg);border:1.5px solid var(--border);border-radius:8px;padding:10px 13px;transition:border .15s,box-shadow .15s;outline:none;width:100%}
input:focus,select:focus,textarea:focus{border-color:var(--accent);box-shadow:0 0 0 3px rgba(91,79,207,.12);background:#fff}
input.err,select.err,textarea.err{border-color:var(--red)}
textarea{resize:vertical;min-height:80px}
.err-msg{font-size:12px;color:var(--red)}
.hint{font-size:12px;color:var(--ink3)}

/* ── Buttons ── */
.btn{display:inline-flex;align-items:center;gap:6px;padding:10px 18px;border-radius:8px;font-family:var(--fb);font-size:14px;font-weight:600;cursor:pointer;border:none;transition:all .15s}
.btn-p{background:var(--accent);color:#fff}
.btn-p:hover{background:var(--accent-d)}
.btn-g{background:transparent;color:var(--ink2);border:1.5px solid var(--border)}
.btn-g:hover{background:var(--surface2);border-color:var(--accent);color:var(--accent)}
.btn-sm{padding:5px 11px;font-size:13px}
.btn:disabled{opacity:.4;cursor:not-allowed}

/* ── Modal ── */
.backdrop{position:fixed;inset:0;background:rgba(26,26,46,.5);backdrop-filter:blur(4px);z-index:100;display:flex;align-items:center;justify-content:center;padding:20px}
.modal{background:var(--surface);border-radius:var(--rl);padding:32px;max-width:560px;width:100%;box-shadow:var(--shl);max-height:90vh;overflow-y:auto}
.modal-title{font-family:var(--fd);font-size:22px;margin-bottom:22px;color:var(--ink)}
.modal-foot{display:flex;gap:10px;justify-content:flex-end;margin-top:26px}

/* ── Toast ── */
.toast-wrap{position:fixed;top:18px;right:18px;z-index:200;display:flex;flex-direction:column;gap:8px}
.toast{padding:12px 16px;border-radius:10px;font-size:14px;font-weight:500;box-shadow:var(--shl);animation:tIn .22s ease;display:flex;align-items:center;gap:8px;max-width:340px}
.t-ok{background:var(--green);color:#fff}
.t-err{background:var(--red);color:#fff}
.t-info{background:var(--accent);color:#fff}
@keyframes tIn{from{transform:translateX(36px);opacity:0}to{transform:none;opacity:1}}

/* ── Detail rows ── */
.drow{display:flex;gap:8px;padding:11px 0;border-bottom:1px solid var(--border)}
.drow:last-child{border-bottom:none}
.dlabel{width:130px;font-size:12px;text-transform:uppercase;letter-spacing:.07em;color:var(--ink3);font-weight:600;flex-shrink:0;padding-top:2px}
.dval{font-size:14px;color:var(--ink);flex:1}

/* ── Page header ── */
.ph{margin-bottom:28px}
.ph h1{font-family:var(--fd);font-size:28px;color:var(--ink);margin-bottom:4px}
.ph p{font-size:14px;color:var(--ink3)}

/* ── Section card ── */
.scard{background:var(--surface);border:1px solid var(--border);border-radius:var(--rl);padding:28px;margin-bottom:20px}

/* ── Empty ── */
.empty{text-align:center;padding:52px 20px;color:var(--ink3)}
.empty-ico{font-size:38px;margin-bottom:10px}

/* ── Misc ── */
.chip{display:inline-flex;align-items:center;padding:2px 9px;border-radius:20px;font-size:12px;font-weight:600;background:var(--accent-l);color:var(--accent)}
.divider{height:1px;background:var(--border);margin:20px 0}
`;

// ─── Primitives ───────────────────────────────────────────────────────────────

function Toasts({ list }) {
  return (
    <div className="toast-wrap">
      {list.map(t => (
        <div key={t.id} className={`toast ${t.type==="error"?"t-err":t.type==="info"?"t-info":"t-ok"}`}>
          <span>{t.type==="error"?"✕":t.type==="info"?"ℹ":"✓"}</span>{t.msg}
        </div>
      ))}
    </div>
  );
}

function Stars({ value, size=14 }) {
  const v = parseFloat(value)||0;
  return (
    <span className="stars">
      {[1,2,3,4,5].map(i=>(
        <span key={i} className={`star ${i<=Math.round(v)?"on":"off"}`} style={{fontSize:size}}>★</span>
      ))}
    </span>
  );
}

function StarPick({ value, onChange }) {
  const [hov,setHov] = useState(0);
  return (
    <span className="stars">
      {[1,2,3,4,5].map(i=>(
        <span key={i} className={`star ${i<=(hov||value)?"on":"off"}`} style={{fontSize:26}}
          onMouseEnter={()=>setHov(i)} onMouseLeave={()=>setHov(0)} onClick={()=>onChange(i)}>★</span>
      ))}
    </span>
  );
}

function Badge({ role }) {
  const map={admin:["b-admin","Admin"],normal:["b-normal","User"],owner:["b-owner","Owner"]};
  const [cls,lbl]=map[role]||["b-normal",role];
  return <span className={`badge ${cls}`}>{lbl}</span>;
}

function Fld({ label, name, type="text", value, onChange, error, hint, full, ...rest }) {
  const cls = `ff${full?" span2":""}`;
  return (
    <div className={cls}>
      <label htmlFor={name}>{label}</label>
      {type==="textarea"
        ? <textarea id={name} value={value} onChange={e=>onChange(e.target.value)} className={error?"err":""} {...rest}/>
        : <input id={name} type={type} value={value} onChange={e=>onChange(e.target.value)} className={error?"err":""} {...rest}/>
      }
      {hint && <span className="hint">{hint}</span>}
      {error && <span className="err-msg">{error}</span>}
    </div>
  );
}

function Modal({ title, onClose, children, footer }) {
  return (
    <div className="backdrop" onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="modal">
        <h2 className="modal-title">{title}</h2>
        {children}
        {footer && <div className="modal-foot">{footer}</div>}
      </div>
    </div>
  );
}

// ─── Sorting ──────────────────────────────────────────────────────────────────

function useSort(data, init="name") {
  const [s,setS] = useState({f:init,d:"asc"});
  const onSort = f => setS(p=>({f,d:p.f===f&&p.d==="asc"?"desc":"asc"}));
  const sorted = useMemo(()=>[...data].sort((a,b)=>{
    const av=a[s.f]??""  , bv=b[s.f]??"";
    const cmp=typeof av==="number"?av-bv:String(av).localeCompare(String(bv));
    return s.d==="asc"?cmp:-cmp;
  }),[data,s]);
  return [sorted,s,onSort];
}

function Th({ field, sort, onSort, children }) {
  const active = sort.f===field;
  return (
    <th className={active?"sorted":""} onClick={()=>onSort(field)}>
      {children} <span style={{opacity:active?1:.35}}>{active?(sort.d==="asc"?"▲":"▼"):"⇅"}</span>
    </th>
  );
}

// ─── Shared filter box ────────────────────────────────────────────────────────

function FBox({ icon, placeholder, value, onChange }) {
  return (
    <div className="fbox">
      <span style={{color:"var(--ink3)",fontSize:13}}>{icon}</span>
      <input placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)}/>
    </div>
  );
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

function AuthScreen({ onLogin }) {
  const [tab,setTab] = useState("login");
  const [f,setF] = useState({name:"",email:"",address:"",password:""});
  const [errs,setErrs] = useState({});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const doLogin = () => {
    const e={};
    if(!f.email) e.email="Email is required.";
    if(!f.password) e.password="Password is required.";
    setErrs(e); if(Object.keys(e).length) return;
    const u=DB.users().find(u=>u.email===f.email&&u.password===f.password);
    if(!u){setErrs({password:"Invalid email or password."}); return;}
    onLogin(u);
  };

  const doSignup = () => {
    const e={};
    const nv=V.name(f.name); if(nv) e.name=nv;
    const ev=V.email(f.email); if(ev) e.email=ev;
    const av=V.address(f.address); if(av) e.address=av;
    const pv=V.password(f.password); if(pv) e.password=pv;
    if(DB.users().find(u=>u.email===f.email)) e.email="Email already registered.";
    setErrs(e); if(Object.keys(e).length) return;
    DB.addUser({id:uid(),...f,role:"normal"});
    toast("Account created! Please sign in.");
    setTab("login"); setF(p=>({...p,password:""}));
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="auth-logo">RateMyStore</div>
        <div className="auth-tagline">Every rating builds a better marketplace.</div>
        <div className="tab-row">
          <button className={`tab-btn ${tab==="login"?"on":""}`} onClick={()=>setTab("login")}>Sign In</button>
          <button className={`tab-btn ${tab==="signup"?"on":""}`} onClick={()=>setTab("signup")}>Create Account</button>
        </div>
        {tab==="login" ? (
          <div className="fg fg1">
            <Fld label="Email" name="login-email" type="email" value={f.email} onChange={v=>set("email",v)} error={errs.email} full/>
            <Fld label="Password" name="login-pass" type="password" value={f.password} onChange={v=>set("password",v)} error={errs.password} full/>
            <div className="ff span2"><button className="btn btn-p" style={{width:"100%",justifyContent:"center"}} onClick={doLogin}>Sign In →</button></div>
          </div>
        ):(
          <div className="fg fg1">
            <Fld label="Full Name" name="su-name" value={f.name} onChange={v=>set("name",v)} error={errs.name} hint="20–60 characters" full/>
            <Fld label="Email" name="su-email" type="email" value={f.email} onChange={v=>set("email",v)} error={errs.email} full/>
            <Fld label="Address" name="su-addr" type="textarea" value={f.address} onChange={v=>set("address",v)} error={errs.address} hint="Max 400 characters" full/>
            <Fld label="Password" name="su-pass" type="password" value={f.password} onChange={v=>set("password",v)} error={errs.password} hint="8–16 chars · 1 uppercase · 1 special character" full/>
            <div className="ff span2"><button className="btn btn-p" style={{width:"100%",justifyContent:"center"}} onClick={doSignup}>Create Account →</button></div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── App Shell ────────────────────────────────────────────────────────────────

const NAVS = {
  admin:  [{k:"dashboard",icon:"⊞",l:"Dashboard"},{k:"users",icon:"👥",l:"Users"},{k:"stores",icon:"🏪",l:"Stores"},{k:"add-user",icon:"＋",l:"Add User"},{k:"add-store",icon:"＋",l:"Add Store"},{k:"password",icon:"🔑",l:"Change Password"}],
  normal: [{k:"stores",icon:"🏪",l:"Browse Stores"},{k:"password",icon:"🔑",l:"Change Password"}],
  owner:  [{k:"dashboard",icon:"⊞",l:"My Dashboard"},{k:"password",icon:"🔑",l:"Change Password"}],
};
const TITLES = {dashboard:"Dashboard",users:"Users",stores:"Stores","add-user":"Add User","add-store":"Add Store",password:"Change Password"};

function Shell({ user, page, setPage, onLogout, children }) {
  const initials = user.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
  const roleLabel = user.role==="admin"?"System Administrator":user.role==="owner"?"Store Owner":"Customer";
  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="sb-brand">
          <div className="sb-name">RateMyStore</div>
          <div className="sb-role">{roleLabel}</div>
        </div>
        <nav className="sb-nav">
          {(NAVS[user.role]||[]).map(n=>(
            <button key={n.k} className={`nav-btn ${page===n.k?"on":""}`} onClick={()=>setPage(n.k)}>
              <span className="nav-icon">{n.icon}</span>{n.l}
            </button>
          ))}
        </nav>
        <div className="sb-foot">
          <button className="logout-btn" onClick={onLogout}><span>⎋</span>Log Out</button>
        </div>
      </aside>
      <div className="main">
        <div className="topbar">
          <span className="topbar-title">{TITLES[page]||page}</span>
          <div className="topbar-user">
            <div className="avatar">{initials}</div>
            <span style={{fontSize:14,fontWeight:500,color:"var(--ink2)"}}>{user.name.split(" ")[0]}</span>
          </div>
        </div>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}

// ─── Admin Dashboard ──────────────────────────────────────────────────────────

function AdminDashboard() {
  const uCount = DB.users().length;
  const sCount = DB.stores().length;
  const rCount = DB.ratings().length;
  return (
    <>
      <div className="ph"><h1>Platform Overview</h1><p>Live snapshot of activity across the platform.</p></div>
      <div className="stat-grid">
        <div className="stat-card">
          <div className="stat-label">Total Users</div>
          <div className="stat-val">{uCount}</div>
          <div className="stat-sub">Admins, owners &amp; customers</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Stores</div>
          <div className="stat-val">{sCount}</div>
          <div className="stat-sub">Registered on platform</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Ratings Submitted</div>
          <div className="stat-val">{rCount}</div>
          <div className="stat-sub">Across all stores</div>
        </div>
      </div>
    </>
  );
}

// ─── Admin Users ──────────────────────────────────────────────────────────────

function AdminUsers() {
  const [fi,setFi] = useState({name:"",email:"",address:"",role:"all"});
  const sf = (k,v) => setFi(p=>({...p,[k]:v}));
  const [detail,setDetail] = useState(null);

  const rows = DB.users().filter(u=>
    u.name.toLowerCase().includes(fi.name.toLowerCase()) &&
    u.email.toLowerCase().includes(fi.email.toLowerCase()) &&
    u.address.toLowerCase().includes(fi.address.toLowerCase()) &&
    (fi.role==="all"||u.role===fi.role)
  );
  const [sorted,sort,onSort] = useSort(rows);

  const ownerAvg = (uid) => {
    const s=DB.stores().find(s=>s.ownerId===uid);
    return s?DB.avgRating(s.id):null;
  };

  const anyFilter = fi.name||fi.email||fi.address||fi.role!=="all";

  return (
    <>
      <div className="ph"><h1>Users</h1><p>All registered users. Filter by any field, click a row to view details.</p></div>
      <div className="tcard">
        <div className="thead-bar">
          <span className="thead-title">{rows.length} users</span>
          <div className="filters">
            <FBox icon="🔍" placeholder="Filter by name…"    value={fi.name}    onChange={v=>sf("name",v)}/>
            <FBox icon="@"  placeholder="Filter by email…"   value={fi.email}   onChange={v=>sf("email",v)}/>
            <FBox icon="📍" placeholder="Filter by address…" value={fi.address} onChange={v=>sf("address",v)}/>
            <div className="fbox">
              <span style={{color:"var(--ink3)",fontSize:13}}>👤</span>
              <select value={fi.role} onChange={e=>sf("role",e.target.value)}>
                <option value="all">All Roles</option>
                <option value="admin">Admin</option>
                <option value="normal">User</option>
                <option value="owner">Owner</option>
              </select>
            </div>
            {anyFilter && <button className="btn btn-g btn-sm" onClick={()=>setFi({name:"",email:"",address:"",role:"all"})}>Clear</button>}
          </div>
        </div>
        <table>
          <thead><tr>
            <Th field="name"    sort={sort} onSort={onSort}>Name</Th>
            <Th field="email"   sort={sort} onSort={onSort}>Email</Th>
            <Th field="address" sort={sort} onSort={onSort}>Address</Th>
            <Th field="role"    sort={sort} onSort={onSort}>Role</Th>
            <th>Details</th>
          </tr></thead>
          <tbody>
            {sorted.length===0 && <tr><td colSpan={5}><div className="empty"><div className="empty-ico">🔍</div>No users match your filters.</div></td></tr>}
            {sorted.map(u=>(
              <tr key={u.id}>
                <td style={{fontWeight:600,color:"var(--ink)"}}>{u.name}</td>
                <td>{u.email}</td>
                <td style={{maxWidth:200,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{u.address}</td>
                <td><Badge role={u.role}/></td>
                <td><button className="btn btn-g btn-sm" onClick={()=>setDetail(u)}>View</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {detail && (
        <Modal title="User Details" onClose={()=>setDetail(null)}
          footer={<button className="btn btn-g" onClick={()=>setDetail(null)}>Close</button>}>
          <div className="drow"><span className="dlabel">Name</span>    <span className="dval">{detail.name}</span></div>
          <div className="drow"><span className="dlabel">Email</span>   <span className="dval">{detail.email}</span></div>
          <div className="drow"><span className="dlabel">Address</span> <span className="dval">{detail.address}</span></div>
          <div className="drow"><span className="dlabel">Role</span>    <span className="dval"><Badge role={detail.role}/></span></div>
          {detail.role==="owner" && (
            <div className="drow">
              <span className="dlabel">Store Rating</span>
              <span className="dval">
                {ownerAvg(detail.id)
                  ? <span style={{display:"flex",alignItems:"center",gap:6}}><Stars value={ownerAvg(detail.id)} size={16}/><strong>{ownerAvg(detail.id)}</strong></span>
                  : <span style={{color:"var(--ink3)"}}>No ratings yet</span>}
              </span>
            </div>
          )}
        </Modal>
      )}
    </>
  );
}

// ─── Admin Stores ─────────────────────────────────────────────────────────────

function AdminStores() {
  const [fi,setFi] = useState({name:"",email:"",address:""});
  const sf = (k,v) => setFi(p=>({...p,[k]:v}));

  const rows = DB.stores().map(s=>({...s, rating:parseFloat(DB.avgRating(s.id))||0 }))
    .filter(s=>
      s.name.toLowerCase().includes(fi.name.toLowerCase()) &&
      s.email.toLowerCase().includes(fi.email.toLowerCase()) &&
      s.address.toLowerCase().includes(fi.address.toLowerCase())
    );
  const [sorted,sort,onSort] = useSort(rows);
  const anyFilter = fi.name||fi.email||fi.address;

  return (
    <>
      <div className="ph"><h1>Stores</h1><p>All registered stores. Filter by name, email or address.</p></div>
      <div className="tcard">
        <div className="thead-bar">
          <span className="thead-title">{rows.length} stores</span>
          <div className="filters">
            <FBox icon="🔍" placeholder="Filter by name…"    value={fi.name}    onChange={v=>sf("name",v)}/>
            <FBox icon="@"  placeholder="Filter by email…"   value={fi.email}   onChange={v=>sf("email",v)}/>
            <FBox icon="📍" placeholder="Filter by address…" value={fi.address} onChange={v=>sf("address",v)}/>
            {anyFilter && <button className="btn btn-g btn-sm" onClick={()=>setFi({name:"",email:"",address:""})}>Clear</button>}
          </div>
        </div>
        <table>
          <thead><tr>
            <Th field="name"    sort={sort} onSort={onSort}>Store Name</Th>
            <Th field="email"   sort={sort} onSort={onSort}>Email</Th>
            <Th field="address" sort={sort} onSort={onSort}>Address</Th>
            <Th field="rating"  sort={sort} onSort={onSort}>Rating</Th>
          </tr></thead>
          <tbody>
            {sorted.length===0 && <tr><td colSpan={4}><div className="empty"><div className="empty-ico">🏪</div>No stores match your filters.</div></td></tr>}
            {sorted.map(s=>(
              <tr key={s.id}>
                <td style={{fontWeight:600,color:"var(--ink)"}}>{s.name}</td>
                <td>{s.email}</td>
                <td style={{maxWidth:220,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.address}</td>
                <td>
                  {s.rating>0
                    ? <span style={{display:"flex",alignItems:"center",gap:6}}><Stars value={s.rating} size={14}/><strong>{s.rating.toFixed(1)}</strong></span>
                    : <span style={{color:"var(--ink3)",fontSize:13}}>No ratings yet</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Admin Add User ───────────────────────────────────────────────────────────

function AddUser() {
  const [f,setF] = useState({name:"",email:"",address:"",password:"",role:"normal"});
  const [errs,setErrs] = useState({});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = () => {
    const e={};
    const nv=V.name(f.name); if(nv) e.name=nv;
    const ev=V.email(f.email); if(ev) e.email=ev;
    const av=V.address(f.address); if(av) e.address=av;
    const pv=V.password(f.password); if(pv) e.password=pv;
    if(DB.users().find(u=>u.email===f.email)) e.email="Email already registered.";
    setErrs(e); if(Object.keys(e).length) return;
    const user={id:uid(),...f};
    DB.addUser(user);
    if(f.role==="owner") DB.addStore({id:uid(),ownerId:user.id,name:f.name,email:f.email,address:f.address});
    toast(`User "${f.name.split(" ")[0]}" created!`);
    setF({name:"",email:"",address:"",password:"",role:"normal"}); setErrs({});
  };

  return (
    <>
      <div className="ph"><h1>Add User</h1><p>Create an admin, normal user, or store owner account.</p></div>
      <div className="scard" style={{maxWidth:620}}>
        <div className="fg">
          <Fld label="Full Name" name="au-name" value={f.name} onChange={v=>set("name",v)} error={errs.name} hint="20–60 characters" full/>
          <Fld label="Email" name="au-email" type="email" value={f.email} onChange={v=>set("email",v)} error={errs.email}/>
          <div className="ff">
            <label htmlFor="au-role">Role</label>
            <select id="au-role" value={f.role} onChange={e=>set("role",e.target.value)}>
              <option value="normal">Normal User</option>
              <option value="admin">Admin</option>
              <option value="owner">Store Owner</option>
            </select>
          </div>
          <Fld label="Address" name="au-addr" type="textarea" value={f.address} onChange={v=>set("address",v)} error={errs.address} hint="Max 400 characters" full/>
          <Fld label="Password" name="au-pass" type="password" value={f.password} onChange={v=>set("password",v)} error={errs.password} hint="8–16 chars · 1 uppercase · 1 special character" full/>
        </div>
        <div style={{marginTop:20}}><button className="btn btn-p" onClick={submit}>Create User →</button></div>
      </div>
    </>
  );
}

// ─── Admin Add Store ──────────────────────────────────────────────────────────

function AddStore() {
  const owners = DB.users().filter(u=>u.role==="owner");
  const [f,setF] = useState({name:"",email:"",address:"",ownerId:owners[0]?.id||""});
  const [errs,setErrs] = useState({});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = () => {
    const e={};
    const nv=V.name(f.name); if(nv) e.name=nv;
    const ev=V.email(f.email); if(ev) e.email=ev;
    const av=V.address(f.address); if(av) e.address=av;
    if(!f.ownerId) e.ownerId="Please select a store owner.";
    setErrs(e); if(Object.keys(e).length) return;
    DB.addStore({id:uid(),...f});
    toast("Store added!");
    setF({name:"",email:"",address:"",ownerId:owners[0]?.id||""}); setErrs({});
  };

  return (
    <>
      <div className="ph"><h1>Add Store</h1><p>Register a new store and link it to an owner.</p></div>
      <div className="scard" style={{maxWidth:620}}>
        {owners.length===0 && <div style={{color:"var(--red)",marginBottom:14,fontSize:14}}>⚠ No store owners yet. Add a Store Owner user first.</div>}
        <div className="fg">
          <Fld label="Store Name" name="as-name" value={f.name} onChange={v=>set("name",v)} error={errs.name} hint="20–60 characters" full/>
          <Fld label="Store Email" name="as-email" type="email" value={f.email} onChange={v=>set("email",v)} error={errs.email}/>
          <div className="ff">
            <label htmlFor="as-owner">Owner</label>
            <select id="as-owner" value={f.ownerId} onChange={e=>set("ownerId",e.target.value)} className={errs.ownerId?"err":""}>
              <option value="">— Select Owner —</option>
              {owners.map(o=><option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            {errs.ownerId && <span className="err-msg">{errs.ownerId}</span>}
          </div>
          <Fld label="Address" name="as-addr" type="textarea" value={f.address} onChange={v=>set("address",v)} error={errs.address} hint="Max 400 characters" full/>
        </div>
        <div style={{marginTop:20}}><button className="btn btn-p" onClick={submit} disabled={owners.length===0}>Add Store →</button></div>
      </div>
    </>
  );
}

// ─── Change Password (all roles) ──────────────────────────────────────────────

function ChangePassword({ user }) {
  const [f,setF] = useState({cur:"",nw:"",cf:""});
  const [errs,setErrs] = useState({});
  const set = (k,v) => setF(p=>({...p,[k]:v}));

  const submit = () => {
    const e={};
    if(f.cur!==user.password) e.cur="Current password is incorrect.";
    const pv=V.password(f.nw); if(pv) e.nw=pv;
    if(f.nw!==f.cf) e.cf="Passwords do not match.";
    setErrs(e); if(Object.keys(e).length) return;
    DB.updateUser(user.id,{password:f.nw});
    user.password=f.nw;
    toast("Password updated successfully!");
    setF({cur:"",nw:"",cf:""});
  };

  return (
    <>
      <div className="ph"><h1>Change Password</h1><p>Update your account password.</p></div>
      <div className="scard" style={{maxWidth:440}}>
        <div className="fg fg1">
          <Fld label="Current Password"     name="cp-cur" type="password" value={f.cur} onChange={v=>set("cur",v)} error={errs.cur} full/>
          <Fld label="New Password"         name="cp-nw"  type="password" value={f.nw}  onChange={v=>set("nw",v)}  error={errs.nw}  hint="8–16 chars · 1 uppercase · 1 special character" full/>
          <Fld label="Confirm New Password" name="cp-cf"  type="password" value={f.cf}  onChange={v=>set("cf",v)}  error={errs.cf}  full/>
          <div className="ff span2"><button className="btn btn-p" style={{alignSelf:"flex-start"}} onClick={submit}>Update Password →</button></div>
        </div>
      </div>
    </>
  );
}

// ─── Normal User: Browse & Rate Stores ───────────────────────────────────────

function UserStores({ user }) {
  const [fi,setFi] = useState({name:"",address:""});
  const sf = (k,v) => setFi(p=>({...p,[k]:v}));
  const [modal,setModal] = useState(null);   // {store, currentVal}
  const [starVal,setStarVal] = useState(0);
  const [tick,setTick] = useState(0);        // force re-read DB

  const rows = DB.stores().map(s=>({
    ...s,
    avgRating: parseFloat(DB.avgRating(s.id))||0,
    myRating:  DB.userRating(user.id,s.id),
  })).filter(s=>
    s.name.toLowerCase().includes(fi.name.toLowerCase()) &&
    s.address.toLowerCase().includes(fi.address.toLowerCase())
  );
  const [sorted,sort,onSort] = useSort(rows,"name");

  const openModal = (store) => { setModal(store); setStarVal(store.myRating||0); };

  const submitRating = () => {
    if(!starVal){ toast("Please select a star rating (1–5).","error"); return; }
    DB.upsertRating({id:uid(),userId:user.id,storeId:modal.id,value:starVal});
    toast(modal.myRating?"Rating updated!":"Rating submitted!");
    setModal(null); setTick(t=>t+1);
  };

  return (
    <>
      <div className="ph"><h1>Browse Stores</h1><p>Find stores, see ratings, and share your experience.</p></div>
      <div className="tcard">
        <div className="thead-bar">
          <span className="thead-title">{rows.length} stores</span>
          <div className="filters">
            <FBox icon="🔍" placeholder="Search by name…"    value={fi.name}    onChange={v=>sf("name",v)}/>
            <FBox icon="📍" placeholder="Search by address…" value={fi.address} onChange={v=>sf("address",v)}/>
            {(fi.name||fi.address) && <button className="btn btn-g btn-sm" onClick={()=>setFi({name:"",address:""})}>Clear</button>}
          </div>
        </div>
        <table>
          <thead><tr>
            <Th field="name"      sort={sort} onSort={onSort}>Store Name</Th>
            <Th field="address"   sort={sort} onSort={onSort}>Address</Th>
            <Th field="avgRating" sort={sort} onSort={onSort}>Overall Rating</Th>
            <Th field="myRating"  sort={sort} onSort={onSort}>Your Rating</Th>
            <th>Action</th>
          </tr></thead>
          <tbody>
            {sorted.length===0 && <tr><td colSpan={5}><div className="empty"><div className="empty-ico">🏪</div>No stores found.</div></td></tr>}
            {sorted.map(s=>(
              <tr key={s.id+tick}>
                <td style={{fontWeight:600,color:"var(--ink)"}}>{s.name}</td>
                <td style={{maxWidth:200,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{s.address}</td>
                <td>
                  {s.avgRating>0
                    ? <span style={{display:"flex",alignItems:"center",gap:6}}><Stars value={s.avgRating} size={14}/><strong>{s.avgRating.toFixed(1)}</strong></span>
                    : <span style={{color:"var(--ink3)",fontSize:13}}>No ratings yet</span>}
                </td>
                <td>
                  {s.myRating
                    ? <span style={{display:"flex",alignItems:"center",gap:6}}><Stars value={s.myRating} size={14}/><strong>{s.myRating}</strong></span>
                    : <span style={{color:"var(--ink3)",fontSize:13}}>Not rated</span>}
                </td>
                <td>
                  <button className="btn btn-p btn-sm" onClick={()=>openModal(s)}>
                    {s.myRating?"✎ Modify":"★ Rate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {modal && (
        <Modal title={modal.myRating?"Modify Your Rating":"Rate This Store"} onClose={()=>setModal(null)}
          footer={<>
            <button className="btn btn-g" onClick={()=>setModal(null)}>Cancel</button>
            <button className="btn btn-p" onClick={submitRating}>Submit Rating</button>
          </>}>
          <p style={{fontSize:15,color:"var(--ink2)",marginBottom:6}}><strong>{modal.name}</strong></p>
          <p style={{fontSize:13,color:"var(--ink3)",marginBottom:20}}>📍 {modal.address}</p>
          <p style={{fontSize:13,fontWeight:600,color:"var(--ink2)",marginBottom:12}}>Select your rating:</p>
          <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:8}}>
            <StarPick value={starVal} onChange={setStarVal}/>
            {starVal>0 && <span style={{fontSize:18,fontWeight:700,color:"var(--accent)"}}>{starVal} / 5</span>}
          </div>
          {starVal===0 && <span className="hint">Tap a star to rate</span>}
        </Modal>
      )}
    </>
  );
}

// ─── Store Owner Dashboard ────────────────────────────────────────────────────

function OwnerDashboard({ user }) {
  const store = DB.stores().find(s=>s.ownerId===user.id);
  const avg   = store ? DB.avgRating(store.id) : null;
  const raters = store ? DB.storeRaters(store.id) : [];
  const [sorted,sort,onSort] = useSort(raters,"name");

  if(!store) return (
    <div className="empty" style={{marginTop:60}}>
      <div className="empty-ico">🏪</div>
      <p>No store is linked to your account yet.<br/>Contact an administrator.</p>
    </div>
  );

  return (
    <>
      <div className="ph"><h1>My Store Dashboard</h1><p>{store.name}</p></div>
      <div className="stat-grid" style={{gridTemplateColumns:"repeat(2,1fr)"}}>
        <div className="stat-card">
          <div className="stat-label">Average Rating</div>
          <div className="stat-val">{avg??"—"}</div>
          {avg ? <Stars value={avg} size={18}/> : <div className="stat-sub">No ratings yet</div>}
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Ratings</div>
          <div className="stat-val">{raters.length}</div>
          <div className="stat-sub">Customers who rated your store</div>
        </div>
      </div>
      <div className="tcard">
        <div className="thead-bar"><span className="thead-title">Customers Who Rated</span></div>
        <table>
          <thead><tr>
            <Th field="name"        sort={sort} onSort={onSort}>Customer Name</Th>
            <Th field="email"       sort={sort} onSort={onSort}>Email</Th>
            <Th field="ratingValue" sort={sort} onSort={onSort}>Rating Given</Th>
          </tr></thead>
          <tbody>
            {sorted.length===0 && <tr><td colSpan={3}><div className="empty"><div className="empty-ico">⭐</div>No ratings yet.</div></td></tr>}
            {sorted.map(r=>(
              <tr key={r.id}>
                <td style={{fontWeight:600,color:"var(--ink)"}}>{r.name}</td>
                <td>{r.email}</td>
                <td><span style={{display:"flex",alignItems:"center",gap:6}}><Stars value={r.ratingValue} size={14}/><strong>{r.ratingValue}</strong></span></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function App() {
  const [user,setUser]   = useState(null);
  const [page,setPage]   = useState(null);
  const [toasts,setToasts] = useState([]);

  _toastFn = (msg,type) => {
    const id=uid();
    setToasts(ts=>[...ts,{id,msg,type}]);
    setTimeout(()=>setToasts(ts=>ts.filter(t=>t.id!==id)),3000);
  };

  const login  = u => { setUser(u); setPage(u.role==="admin"?"dashboard":u.role==="owner"?"dashboard":"stores"); };
  const logout = () => { setUser(null); setPage(null); };

  const renderPage = () => {
    if(!user) return null;
    const r=user.role;
    if(page==="dashboard" && r==="admin")  return <AdminDashboard/>;
    if(page==="users"     && r==="admin")  return <AdminUsers/>;
    if(page==="stores"    && r==="admin")  return <AdminStores/>;
    if(page==="add-user"  && r==="admin")  return <AddUser/>;
    if(page==="add-store" && r==="admin")  return <AddStore/>;
    if(page==="password")                  return <ChangePassword user={user}/>;
    if(page==="stores"    && r==="normal") return <UserStores user={user}/>;
    if(page==="dashboard" && r==="owner")  return <OwnerDashboard user={user}/>;
    return null;
  };

  return (
    <>
      <style>{CSS}</style>
      <Toasts list={toasts}/>
      {!user
        ? <AuthScreen onLogin={login}/>
        : <Shell user={user} page={page} setPage={setPage} onLogout={logout}>{renderPage()}</Shell>
      }
    </>
  );
}
