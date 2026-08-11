import { useState, useEffect } from "react";
import {
  LayoutDashboard, UploadCloud, GraduationCap, Heart, ListChecks, Building2,
  Wallet, Search, Plus, Bell, Download, ChevronRight, ChevronDown, X,
  Mail, Pencil, Check, Trash2, MapPin, Users, Briefcase, CreditCard,
  StickyNote, ArrowLeft, ShieldAlert, CheckCircle2, Sparkles, Star, Clock,
} from "lucide-react";
import { supabase, hasSupabase } from "../lib/supabaseClient";

const C = { ink: "#1C2230", text: "#2C3446", muted: "#7A8494", faint: "#AEB6C2", red: "#DA2A34", green: "#17915B", amber: "#C98A16", blue: "#2F6FED" };
const STATUS_COLOR = { New: C.muted, Sourcing: C.muted, Sourced: C.muted, Screened: C.blue, Submitted: C.blue, Shortlist: C.amber, Interview: C.amber, Offer: C.red, Placed: C.green, Rejected: C.red, "Not Suitable": C.red, "In Review": C.amber, Approved: C.green, Matching: C.amber, Available: C.green, Active: C.green, Paid: C.green, Open: C.green, Filled: C.blue, "On Hold": C.amber, Closed: C.muted };
const fmt = (n) => new Intl.NumberFormat("en-AE").format(Number(n) || 0);
const initialsOf = (name) => (name || "XX").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const nextRef = (name, n) => "rTR" + initialsOf(name) + String(n).padStart(2, "0");
const daysSince = (ts) => (ts ? Math.max(0, Math.floor((Date.now() - new Date(ts)) / 86400000)) : 0);

function calcRate(c = {}) {
  let b = 1800;
  b += (Number(c.hours) || 20) * 45;
  b += ({ Junior: 0, Mid: 300, Experienced: 700 }[c.level] || 0);
  b += ({ "Level 3": 150, ABAT: 400, "SEN diploma": 450 }[c.qual] || 0);
  b += (Number(c.langs) > 1 ? (Number(c.langs) - 1) * 150 : 0);
  b += ({ Standard: 0, Specialist: 400 }[c.tier] || 0);
  b += ({ Mild: 0, Moderate: 250, Complex: 550 }[c.needs] || 0);
  b += (c.urgency === "Urgent" ? 300 : 0);
  return Math.round(b / 50) * 50;
}
const DEFAULT_CALC = { hours: 20, level: "Mid", qual: "Level 3", langs: 1, tier: "Standard", loc: "Dubai", needs: "Mild", contract: "3 months", urgency: "Standard" };

function downloadCsv(filename, columns, rows) {
  const esc = (x) => `"${String(x ?? "").replace(/\r?\n/g, " / ").replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(",");
  const body = rows.map((r) => columns.map((c) => esc(typeof c.get === "function" ? c.get(r) : r[c.key])).join(",")).join("\n");
  const csv = "\uFEFF" + head + "\n" + body;
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  a.download = filename; a.click();
}

function parseCsv(text) {
  const rows = []; let row = [], field = "", inQ = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) { if (c === '"') { if (text[i + 1] === '"') { field += '"'; i++; } else inQ = false; } else field += c; }
    else if (c === '"') inQ = true;
    else if (c === ",") { row.push(field); field = ""; }
    else if (c === "\n") { row.push(field); rows.push(row); row = []; field = ""; }
    else if (c !== "\r") field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  return rows;
}
const VAC_MAP = { school: "school", contact: "contact", level: "level", role: "role", qualification: "qualification", budget: "budget", status: "status", dateadded: "date_added", notes: "notes" };
const PIPE_MAP = { school: "school", group: "grp", role: "role", candidate: "candidate_name", type: "type", stage: "stage", interviewdate: "interview_date", startdate: "start_date", interviewrating: "interview_rating", outcome: "outcome", nextaction: "next_action", nextactiondate: "next_action_date", followups: "follow_ups", priority: "priority", notes: "notes" };
function importCsv(file, map, cb) {
  const reader = new FileReader();
  reader.onload = () => {
    const rows = parseCsv(String(reader.result || ""));
    if (rows.length < 2) return cb([]);
    const headers = rows[0].map((h) => (h || "").trim().toLowerCase());
    const out = [];
    for (let i = 1; i < rows.length; i++) {
      const r = rows[i]; if (!r || r.every((x) => (x || "").trim() === "")) continue;
      const obj = {};
      headers.forEach((h, j) => { const key = map[h]; if (key) obj[key] = r[j]; });
      if (obj.follow_ups !== undefined) obj.follow_ups = Number(obj.follow_ups) || 0;
      if (obj.shortlist !== undefined) obj.shortlist = Number(obj.shortlist) || 0;
      if (obj.priority !== undefined) obj.priority = String(obj.priority).toLowerCase() === "true";
      out.push(obj);
    }
    cb(out);
  };
  reader.readAsText(file);
}

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, kind: "leaf" },
  { id: "extract", label: "Bulk Extract", icon: UploadCloud, kind: "leaf", badge: "CV" },
  { id: "g-teachers", label: "Teachers", icon: GraduationCap, kind: "group", items: [{ id: "t-database", label: "Database" }, { id: "t-vacancies", label: "Vacancies" }, { id: "t-pipeline", label: "Pipeline" }] },
  { id: "g-lsas", label: "LSAs", icon: Heart, kind: "group", items: [{ id: "lsa-dashboard", label: "LSA Dashboard" }, { id: "lsa-directory", label: "Directory" }, { id: "lsa-bookings", label: "Bookings" }, { id: "lsa-attendance", label: "Attendance" }, { id: "lsa-add", label: "Add LSAs" }] },
  { id: "g-tasks", label: "Tasks", icon: ListChecks, kind: "group", items: [{ id: "tasks-todo", label: "To-do" }, { id: "tasks-log", label: "Daily log" }] },
  { id: "g-schools", label: "Schools", icon: Building2, kind: "group", items: [{ id: "schools-list", label: "School list" }] },
  { id: "g-supply", label: "Supply & Pay", icon: Wallet, kind: "group", items: [{ id: "supply-timesheets", label: "Timesheets" }] },
];

/* ============================ GATE ============================ */
function Gate({ onOk }) {
  const [v, setV] = useState(""); const [err, setErr] = useState(false);
  const submit = () => {
    const pw = process.env.NEXT_PUBLIC_APP_PASSWORD || "rtriibe2025";
    if (v === pw) { try { localStorage.setItem("rt_auth", "1"); } catch {} onOk(); } else setErr(true);
  };
  return (
    <div className="x-gate"><div className="x-gatecard">
      <div className="x-gateword"><span style={{ color: C.red }}>r</span>Triibe OS</div>
      <div className="x-gatesub">Enter the team password to continue</div>
      <input className="x-gateinput" type="password" value={v} autoFocus onChange={(e) => { setV(e.target.value); setErr(false); }} onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" />
      {err && <div className="x-gateerr">That password didn't match. Try again.</div>}
      <button className="x-primary lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={submit}>Open</button>
    </div></div>
  );
}

/* ============================ FORM MODAL ============================ */
function FormModal({ title, fields, initial, onClose, onSave }) {
  const [d, setD] = useState(initial || {});
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  return (
    <>
      <div className="x-scrim" onClick={onClose} />
      <div className="x-modal lg">
        <div className="x-modalhead"><h2 className="x-h2">{title}</h2><button className="x-ic" onClick={onClose}><X size={16} /></button></div>
        <div className="x-formgrid">
          {fields.map((f) => f.type === "checkbox" ? (
            <label key={f.key} className="x-cbrow"><input type="checkbox" checked={!!d[f.key]} onChange={(e) => set(f.key, e.target.checked)} /> {f.label}</label>
          ) : (
            <div key={f.key} className={"x-formfield" + (f.full ? " full" : "")}>
              <span className="x-formlabel">{f.label}</span>
              {f.type === "textarea" ? <textarea className="x-input" rows={2} value={d[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
                : f.type === "select" ? <select className="x-input" value={d[f.key] ?? f.opts[0]} onChange={(e) => set(f.key, e.target.value)}>{f.opts.map((o) => <option key={o}>{o}</option>)}</select>
                : <input className="x-input" type={f.type || "text"} value={d[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />}
            </div>
          ))}
        </div>
        <div className="x-modalactions"><button className="x-ghost" onClick={onClose}>Cancel</button><button className="x-primary" onClick={() => onSave(d)}>Save</button></div>
      </div>
    </>
  );
}

/* ============================ APP ============================ */
export default function Page() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("dashboard");
  const [open, setOpen] = useState({ "g-teachers": true, "g-lsas": true });
  const [gq, setGq] = useState("");
  const [selT, setSelT] = useState(null);
  const [selL, setSelL] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [lsas, setLsas] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [schools, setSchools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => { try { if (localStorage.getItem("rt_auth") === "1") setAuthed(true); } catch {} setReady(true); }, []);

  const setters = { candidates: setTeachers, lsas: setLsas, vacancies: setVacancies, pipeline: setPipeline, schools: setSchools, tasks: setTasks, bookings: setBookings, attendance: setAttendance };
  const reloadTable = async (t) => { if (!supabase) return; const { data } = await supabase.from(t).select("*").order("created_at", { ascending: false }); setters[t](data || []); };
  const loadAll = async () => { if (!supabase) return; await Promise.all(Object.keys(setters).map(reloadTable)); };
  useEffect(() => { if (authed) loadAll(); }, [authed]);

  const updateRow = async (table, id, patch) => { if (!supabase) return; const { error } = await supabase.from(table).update(patch).eq("id", id); if (error) alert("Save failed: " + error.message); reloadTable(table); };
  const insertRow = async (table, row) => { if (!supabase) return; const { error } = await supabase.from(table).insert(row); if (error) alert("Add failed: " + error.message); reloadTable(table); };
  const deleteRow = async (table, id) => { if (!supabase) return; const { error } = await supabase.from(table).delete().eq("id", id); if (error) alert("Delete failed: " + error.message); reloadTable(table); };
  const importRows = async (table, rows) => { if (!supabase) return; if (!rows.length) { alert("No rows found in that file."); return; } const { error } = await supabase.from(table).insert(rows); if (error) { alert("Import failed: " + error.message); return; } reloadTable(table); alert("Imported " + rows.length + " rows."); };

  const openLeaf = (id) => { setSelT(null); setSelL(null); setBellOpen(false); setView(id); };

  // notification data
  const pendingTasks = tasks.filter((t) => !t.done);
  const agingVac = vacancies.filter((v) => daysSince(v.created_at) > 7 && (v.status || "Open") === "Open");
  const today = new Date().toISOString().slice(0, 10);
  const dueActions = pipeline.filter((p) => p.next_action && p.next_action_date && p.next_action_date <= today);
  const notifCount = pendingTasks.length + agingVac.length + dueActions.length;

  const ql = gq.trim().toLowerCase();
  const searchResults = ql ? [
    ...teachers.filter((t) => ((t.name || "") + (t.ref || "") + (t.spec || "")).toLowerCase().includes(ql)).slice(0, 6).map((t) => ({ type: "Candidate", label: t.name, sub: (t.ref || "") + " · " + (t.spec || ""), tone: C.blue, go: () => { setSelL(null); setSelT(t.id); setView("t-database"); } })),
    ...lsas.filter((l) => ((l.name || "") + (l.cert || "") + (l.langs || "")).toLowerCase().includes(ql)).slice(0, 6).map((l) => ({ type: "LSA", label: l.name, sub: l.cert || "", tone: C.green, go: () => { setSelT(null); setSelL(l.id); setView("lsa-directory"); } })),
    ...vacancies.filter((v) => ((v.role || "") + (v.school || "") + (v.contact || "")).toLowerCase().includes(ql)).slice(0, 6).map((v) => ({ type: "Vacancy", label: v.role, sub: v.school || "", tone: C.red, go: () => setView("t-vacancies") })),
    ...pipeline.filter((p) => ((p.candidate_name || "") + (p.school || "") + (p.role || "")).toLowerCase().includes(ql)).slice(0, 6).map((p) => ({ type: "Pipeline", label: p.candidate_name, sub: (p.school || "") + " · " + (p.stage || ""), tone: C.amber, go: () => setView("t-pipeline") })),
    ...schools.filter((s) => ((s.name || "") + (s.grp || "")).toLowerCase().includes(ql)).slice(0, 4).map((s) => ({ type: "School", label: s.name, sub: s.grp || "", tone: C.muted, go: () => setView("schools-list") })),
  ] : [];
  const pickResult = (r) => { r.go(); setGq(""); };

  if (!ready) return null;
  if (!authed) return <Gate onOk={() => setAuthed(true)} />;

  return (
    <div className="x-app">
      <aside className="x-side">
        <div className="x-brand"><span className="x-r">r</span><span>Triibe</span><span className="x-os">OS</span></div>
        <nav className="x-nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            if (n.kind === "leaf") return <button key={n.id} className={"x-leaf" + (view === n.id ? " on" : "")} onClick={() => openLeaf(n.id)}><Icon size={17} /> <span>{n.label}</span>{n.badge && <span className="x-badge">{n.badge}</span>}</button>;
            const isOpen = open[n.id]; const active = n.items.some((i) => i.id === view);
            return (
              <div key={n.id}>
                <button className={"x-grouphead" + (active ? " active" : "")} onClick={() => setOpen((o) => ({ ...o, [n.id]: !o[n.id] }))}><Icon size={17} /> <span>{n.label}</span> <ChevronDown size={15} className={"x-chev" + (isOpen ? " open" : "")} /></button>
                {isOpen && <div className="x-subwrap">{n.items.map((i) => <button key={i.id} className={"x-subitem" + (view === i.id ? " on" : "")} onClick={() => openLeaf(i.id)}>{i.label}</button>)}</div>}
              </div>
            );
          })}
        </nav>
        <div className="x-sidefoot"><div className="x-av">O</div><div><div className="x-avn">Othman</div><div className="x-avr">School Partnerships</div></div></div>
      </aside>

      <div className="x-main">
        <header className="x-top">
          <div className="x-searchbox">
            <div className="x-searchwrap"><Search size={16} color={C.muted} /><input className="x-search" placeholder="Search candidates, schools, vacancies, LSAs…" value={gq} onChange={(e) => setGq(e.target.value)} />{gq && <button className="x-searchclear" onClick={() => setGq("")}><X size={14} /></button>}</div>
            {gq && (
              <>
                <div className="x-scrim" style={{ background: "transparent" }} onClick={() => setGq("")} />
                <div className="x-searchdrop">
                  {searchResults.length === 0 && <div className="x-bellempty">No matches for “{gq}”.</div>}
                  {searchResults.map((r, i) => (
                    <button key={i} className="x-bellitem" onClick={() => pickResult(r)}>
                      <span className="x-searchrow"><span className="x-searchtype" style={{ color: r.tone, background: r.tone + "16" }}>{r.type}</span><span className="x-bellt">{r.label}</span></span>
                      <span className="x-bellm">{r.sub}</span>
                    </button>
                  ))}
                </div>
              </>
            )}
          </div>
          <div className="x-topr">
            <button className="x-bell" onClick={() => setBellOpen((b) => !b)}><Bell size={17} />{notifCount > 0 && <span className="x-belldot">{notifCount}</span>}</button>
            {bellOpen && (
              <>
                <div className="x-scrim" style={{ background: "transparent" }} onClick={() => setBellOpen(false)} />
                <div className="x-belldrop">
                  {notifCount === 0 && <div className="x-bellempty">You're all caught up.</div>}
                  {pendingTasks.length > 0 && <div className="x-belltitle">To do ({pendingTasks.length})</div>}
                  {pendingTasks.slice(0, 6).map((t) => <button key={t.id} className="x-bellitem" onClick={() => openLeaf("tasks-todo")}><span className="x-bellt">{t.text}</span><span className="x-bellm">Due {t.due || "—"}</span></button>)}
                  {agingVac.length > 0 && <div className="x-belltitle">Aging vacancies ({agingVac.length})</div>}
                  {agingVac.slice(0, 6).map((v) => <button key={v.id} className="x-bellitem" onClick={() => openLeaf("t-vacancies")}><span className="x-bellt">{v.role} — {v.school}</span><span className="x-bellm">Open {daysSince(v.created_at)} days</span></button>)}
                  {dueActions.length > 0 && <div className="x-belltitle">Pipeline actions due ({dueActions.length})</div>}
                  {dueActions.slice(0, 6).map((p) => <button key={p.id} className="x-bellitem" onClick={() => openLeaf("t-pipeline")}><span className="x-bellt">{p.candidate_name}: {p.next_action}</span><span className="x-bellm">By {p.next_action_date}</span></button>)}
                </div>
              </>
            )}
          </div>
        </header>

        <main className="x-canvas">
          {!hasSupabase && <div className="x-page"><div className="x-notice">Database not connected. Add <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> in Vercel, then redeploy.</div></div>}

          {view === "dashboard" && <Dashboard go={openLeaf} teachers={teachers} lsas={lsas} vacancies={vacancies} tasks={tasks} pipeline={pipeline} />}
          {view === "extract" && <Extract teachersCount={teachers.length} existing={[...teachers.map((t) => t.name), ...lsas.map((l) => l.name)]} onSaved={loadAll} />}
          {view === "lsa-add" && <Extract lsaMode teachersCount={teachers.length} existing={[...teachers.map((t) => t.name), ...lsas.map((l) => l.name)]} onSaved={loadAll} />}

          {view === "t-database" && !selT && <TeacherDB teachers={teachers} onSelect={setSelT} onAdd={(r) => insertRow("candidates", r)} />}
          {view === "t-database" && selT && <TeacherProfile t={teachers.find((x) => x.id === selT)} onBack={() => setSelT(null)} onSave={(p) => updateRow("candidates", selT, p)} />}
          {view === "t-vacancies" && <Vacancies rows={vacancies} onAdd={(r) => insertRow("vacancies", r)} onUpdate={(id, p) => updateRow("vacancies", id, p)} onDel={(id) => deleteRow("vacancies", id)} onImport={(rows) => importRows("vacancies", rows)} />}
          {view === "t-pipeline" && <PipelineView rows={pipeline} onAdd={(r) => insertRow("pipeline", r)} onUpdate={(id, p) => updateRow("pipeline", id, p)} onDel={(id) => deleteRow("pipeline", id)} onImport={(rows) => importRows("pipeline", rows)} />}

          {view === "lsa-dashboard" && <LsaDashboard lsas={lsas} go={openLeaf} />}
          {view === "lsa-directory" && !selL && <LsaDirectory lsas={lsas} onSelect={setSelL} onAdd={(r) => insertRow("lsas", r)} />}
          {view === "lsa-directory" && selL && <LsaProfile lsa={lsas.find((x) => x.id === selL)} onBack={() => setSelL(null)} onSave={(p) => updateRow("lsas", selL, p)} />}
          {view === "lsa-bookings" && <Bookings rows={bookings} lsas={lsas} onAdd={(r) => insertRow("bookings", r)} onDel={(id) => deleteRow("bookings", id)} />}
          {view === "lsa-attendance" && <Attendance rows={attendance} lsas={lsas} onAdd={(r) => insertRow("attendance", r)} onDel={(id) => deleteRow("attendance", id)} />}

          {view === "tasks-todo" && <Tasks rows={tasks} onAdd={(r) => insertRow("tasks", r)} onToggle={(t) => updateRow("tasks", t.id, { done: !t.done })} onUpdate={(id, p) => updateRow("tasks", id, p)} onDel={(id) => deleteRow("tasks", id)} />}
          {view === "tasks-log" && <DailyLog teachers={teachers} lsas={lsas} />}
          {view === "schools-list" && <Schools rows={schools} onAdd={(r) => insertRow("schools", r)} onDel={(id) => deleteRow("schools", id)} />}
          {view === "supply-timesheets" && <Simple title="Timesheets" sub="rTriibe FZCO format · TRN 100452871500003." />}
        </main>
      </div>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ go, teachers, lsas, vacancies, tasks, pipeline }) {
  const stats = [
    { label: "Open vacancies", v: vacancies.filter((v) => (v.status || "Open") === "Open").length, tone: C.red },
    { label: "Teachers", v: teachers.length, tone: C.blue },
    { label: "LSAs", v: lsas.length, tone: C.green },
    { label: "Tasks to do", v: tasks.filter((t) => !t.done).length, tone: C.amber },
  ];
  const aging = vacancies.filter((v) => daysSince(v.created_at) > 7 && (v.status || "Open") === "Open");
  return (
    <div className="x-page">
      <div className="x-eyebrow">Command centre</div><h1 className="x-h1">Good morning, Othman</h1><p className="x-sub">Everything on the desk in one place.</p>
      <div className="x-stats">{stats.map((s) => <div key={s.label} className="x-stat"><span className="x-statbar" style={{ background: s.tone }} /><div className="x-statv">{s.v}</div><div className="x-statl">{s.label}</div></div>)}</div>
      <div className="x-2col">
        <section className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Needs attention</h2><span className="x-pmeta">Open 7+ days</span></div>
          {aging.length === 0 && <div className="x-empty">Nothing aging right now.</div>}
          {aging.map((v) => <button key={v.id} className="x-att" onClick={() => go("t-vacancies")}><span className="x-attbar" style={{ background: C.red }} /><span className="x-attbody"><span className="x-attt">{v.role} — {v.school}</span><span className="x-attr">Open {daysSince(v.created_at)} days</span></span><ChevronRight size={16} color={C.faint} /></button>)}
        </section>
        <section className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Recent</h2></div>
          {teachers.slice(0, 4).map((t) => <div key={t.id} className="x-logrow"><span className="x-logdot" /> {t.name} added to database</div>)}
          {teachers.length === 0 && <div className="x-empty">Extract some CVs to see activity.</div>}
          <div className="x-win"><Sparkles size={14} color={C.amber} /> Tip: Bulk Extract reads CVs and files them for you.</div>
        </section>
      </div>
    </div>
  );
}

/* ============================ EXTRACT ============================ */
function Extract({ lsaMode, teachersCount, existing, onSaved }) {
  const [route, setRoute] = useState(lsaMode ? "lsa" : "auto");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [res, setRes] = useState({ teacher: 0, lsa: 0, dupe: 0, failed: 0, done: 0, total: 0 });
  const [checkRes, setCheckRes] = useState(null);
  const checkFiles = (files) => {
    const names = (existing || []).map((n) => (n || "").toLowerCase()).filter(Boolean);
    const out = Array.from(files).map((f) => {
      const clean = f.name.replace(/\.pdf$/i, "").replace(/[_\-]+/g, " ").toLowerCase();
      const hit = names.find((nm) => clean.includes(nm) || nm.split(" ").filter((w) => w.length > 2).every((w) => clean.includes(w)));
      return { file: f.name, matched: !!hit };
    });
    setCheckRes(out);
  };
  const toB64 = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.onerror = reject; r.readAsDataURL(file); });
  const fileToBody = async (file) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.type === "application/pdf" || ext === "pdf") return { pdfBase64: await toB64(file) };
    if ((file.type || "").startsWith("image/") || ["jpg", "jpeg", "png", "webp", "gif"].includes(ext)) return { imageBase64: await toB64(file), mediaType: file.type || "image/jpeg" };
    if (ext === "docx") { const ab = await file.arrayBuffer(); const m = await import("mammoth/mammoth.browser"); const mammoth = m.default || m; const { value } = await mammoth.extractRawText({ arrayBuffer: ab }); return { text: value }; }
    if (ext === "doc") throw new Error("Old .doc format — save it as PDF or .docx first");
    return { text: await file.text() };
  };

  const isDupe = async (table, name, email) => {
    const nm = (name || "").trim(); if (!nm || !supabase) return false;
    const { data } = await supabase.from(table).select("email").ilike("name", nm);
    if (!data || !data.length) return false;
    if (email) return data.some((r) => (r.email || "").toLowerCase() === email.toLowerCase());
    return true;
  };
  const uploadCv = async (file) => {
    if (!file || !supabase) return "";
    try {
      const path = Date.now() + "-" + (file.name || "cv.pdf").replace(/[^a-zA-Z0-9.\-_]/g, "_");
      const { error } = await supabase.storage.from("cvs").upload(path, file, { contentType: "application/pdf", upsert: false });
      if (error) return "";
      return supabase.storage.from("cvs").getPublicUrl(path).data.publicUrl || "";
    } catch { return ""; }
  };
  const saveResult = async (parsed, n, file) => {
    if (!supabase) return "failed";
    const type = route === "auto" ? (parsed.type === "lsa" ? "lsa" : "teacher") : route;
    const table = type === "lsa" ? "lsas" : "candidates";
    if (await isDupe(table, parsed.name, parsed.email)) return "dupe";
    const cv_url = await uploadCv(file);
    if (type === "lsa") {
      await supabase.from("lsas").insert({ name: parsed.name || "Unnamed", cert: parsed.cert || "", langs: parsed.langs || "", location: parsed.location || "", status: "Available", email: parsed.email || "", phone: parsed.phone || "", placement_fee: 1000, calc: DEFAULT_CALC, notes: [], payments: [], verbatim_experience: parsed.verbatim_experience || "", verbatim_qualifications: parsed.verbatim_qualifications || "", cv_url });
      return "lsa";
    }
    await supabase.from("candidates").insert({ ref: nextRef(parsed.name, n), name: parsed.name || "Unnamed", spec: parsed.spec || "", curriculum: parsed.curriculum || "", qual: parsed.qual || "", uae_years: Number(parsed.uae_years) || 0, out_years: Number(parsed.out_years) || 0, status: parsed.status || "New", email: parsed.email || "", phone: parsed.phone || "", location: parsed.location || "", verbatim_experience: parsed.verbatim_experience || "", verbatim_qualifications: parsed.verbatim_qualifications || "", cv_url });
    return "teacher";
  };
  const runOne = async (body) => {
    let lastErr;
    for (let a = 0; a < 3; a++) {
      try {
        const r = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
        const d = await r.json().catch(() => ({}));
        if (r.ok && d.result) return d.result;
        lastErr = new Error(d.error || ("HTTP " + r.status));
        if (r.status && r.status !== 429 && r.status < 500) break;
      } catch (e) { lastErr = e; }
      await new Promise((res) => setTimeout(res, 800 * (a + 1)));
    }
    throw lastErr || new Error("extract failed");
  };

  const extractText = async () => {
    if (!text.trim()) return; setBusy(true); setMsg("Reading CV…"); setRes({ teacher: 0, lsa: 0, dupe: 0, failed: 0, done: 0, total: 1 });
    try { const parsed = await runOne({ text }); const kind = await saveResult(parsed, teachersCount + 1); setRes((x) => ({ ...x, [kind]: 1, done: 1 })); setMsg("Saved."); setText(""); onSaved && onSaved(); }
    catch (e) { setRes((x) => ({ ...x, failed: 1, done: 1 })); setMsg("Could not read that one."); }
    setBusy(false);
  };
  const extractFiles = async (files) => {
    const arr = Array.from(files).slice(0, 2000); setBusy(true); setRes({ teacher: 0, lsa: 0, dupe: 0, failed: 0, done: 0, total: arr.length });
    let n = teachersCount + 1;
    for (let i = 0; i < arr.length; i++) {
      setMsg(`Processing ${i + 1} of ${arr.length}…`);
      try { const body = await fileToBody(arr[i]); const parsed = await runOne(body); const kind = await saveResult(parsed, n, arr[i]); if (kind === "teacher") n++; setRes((x) => ({ ...x, [kind]: x[kind] + 1, done: x.done + 1 })); }
      catch (e) { setRes((x) => ({ ...x, failed: x.failed + 1, done: x.done + 1 })); }
      await new Promise((r) => setTimeout(r, 600));
    }
    setMsg("Done."); setBusy(false); onSaved && onSaved();
  };
  const pct = res.total ? Math.round((res.done / res.total) * 100) : 0;
  return (
    <div className="x-page">
      <h1 className="x-h1">{lsaMode ? "Add LSAs" : "Bulk Extract"}</h1>
      <p className="x-sub">Paste one CV, or drop up to 2,000 files (PDF, Word or image). Each is read and {lsaMode ? "added to the LSA directory" : "filed as a teacher or LSA"}. Duplicates are skipped.</p>
      {!lsaMode && <div className="x-routewrap"><span className="x-routelabel">Route each CV to</span>{[["auto", "Auto-detect"], ["teacher", "All teachers"], ["lsa", "All LSAs"]].map(([id, l]) => <button key={id} className={"x-route" + (route === id ? " on" : "")} onClick={() => setRoute(id)}>{l}</button>)}</div>}
      <div className="x-drop"><UploadCloud size={30} color={C.muted} /><div className="x-dropt">Drop CVs or choose files</div><div className="x-dropsub">PDF, Word (.docx) or image · up to 2,000 files</div>
        <input id="cvfiles" type="file" accept=".pdf,.docx,.doc,image/*" multiple style={{ display: "none" }} onChange={(e) => extractFiles(e.target.files)} disabled={busy} />
        <button className="x-primary lg" onClick={() => document.getElementById("cvfiles").click()} disabled={busy}>Choose files</button></div>
      <textarea className="x-ta" placeholder="…or paste a single CV's text here" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      <button className="x-primary" style={{ marginTop: 10 }} onClick={extractText} disabled={busy || !text.trim()}>Extract & save</button>
      {(busy || res.done > 0) && <div className="x-panel" style={{ marginTop: 18 }}>
        <div className="x-panelhead"><h2 className="x-h2">{msg || "Working…"}</h2><span className="x-pmeta">{res.done} / {res.total}</span></div>
        <div className="x-bar"><span className="x-barfill" style={{ width: pct + "%" }} /></div>
        <div className="x-resgrid">
          <div className="x-res"><div className="x-resn" style={{ color: C.blue }}>{res.teacher}</div><div className="x-resl">Teachers</div></div>
          <div className="x-res"><div className="x-resn" style={{ color: C.green }}>{res.lsa}</div><div className="x-resl">LSAs</div></div>
          <div className="x-res"><div className="x-resn" style={{ color: C.amber }}>{res.dupe}</div><div className="x-resl">Duplicates</div></div>
          <div className="x-res"><div className="x-resn" style={{ color: C.ink }}>{res.done}</div><div className="x-resl">Processed</div></div>
        </div>
        {!busy && res.done > 0 && <div className="x-doneline"><CheckCircle2 size={15} color={C.green} /> Saved. {res.failed > 0 ? res.failed + " need review. " : ""}Open Teachers → Database or LSAs → Directory.</div>}
      </div>}
      <div className="x-panel" style={{ marginTop: 18 }}>
        <div className="x-panelhead"><h2 className="x-h2">Check which CVs are already in the system</h2><span className="x-pmeta">Free · no API used</span></div>
        <p className="x-sub" style={{ marginTop: 0, marginBottom: 12 }}>Select CV files and it matches their filenames against everyone already saved, so you can see what's new before extracting.</p>
        <input id="checkfiles" type="file" accept="application/pdf" multiple style={{ display: "none" }} onChange={(e) => checkFiles(e.target.files)} />
        <button className="x-ghost" onClick={() => document.getElementById("checkfiles").click()}><UploadCloud size={14} /> Choose CVs to check</button>
        {checkRes && <div style={{ marginTop: 14 }}>
          <div className="x-doneline" style={{ marginBottom: 10 }}>{checkRes.filter((r) => r.matched).length} already in system · {checkRes.filter((r) => !r.matched).length} new</div>
          {checkRes.map((r, i) => <div key={i} className="x-noterow"><div className="x-notet">{r.file}</div>{r.matched ? <span className="x-pill" style={{ color: C.green, background: C.green + "16", borderColor: C.green + "30" }}>In system</span> : <span className="x-pill" style={{ color: C.blue, background: C.blue + "16", borderColor: C.blue + "30" }}>New</span>}</div>)}
        </div>}
      </div>
    </div>
  );
}

/* ============================ TEACHERS ============================ */
const CAND_FIELDS = [
  { key: "name", label: "Name" }, { key: "spec", label: "Role" },
  { key: "location", label: "Location" }, { key: "contact", label: "Contact" },
  { key: "salary", label: "Salary" }, { key: "visa", label: "Visa" },
  { key: "availability", label: "Availability" },
  { key: "status", label: "Status", type: "select", opts: ["New", "Approved", "In Review", "Placed", "Not Suitable"] },
  { key: "notes", label: "Notes", type: "textarea", full: true },
  { key: "degree_verified", label: "Degree verified", type: "checkbox" }, { key: "visa_clear", label: "Visa clear", type: "checkbox" },
  { key: "qts_pgce", label: "QTS/PGCE equivalency", type: "checkbox" }, { key: "refs_checked", label: "References", type: "checkbox" },
];
const TEACHER_CSV = [
  { label: "Ref", key: "ref" }, { label: "Name", key: "name" }, { label: "Role/Specialization", key: "spec" }, { label: "Curriculum", key: "curriculum" }, { label: "Qualification", key: "qual" },
  { label: "UAE years", key: "uae_years" }, { label: "Outside UAE years", key: "out_years" }, { label: "Total years", get: (r) => (Number(r.uae_years || 0) + Number(r.out_years || 0)).toFixed(1) },
  { label: "Status", key: "status" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" }, { label: "Contact", key: "contact" }, { label: "Location", key: "location" },
  { label: "Salary", key: "salary" }, { label: "Visa", key: "visa" }, { label: "Availability", key: "availability" },
  { label: "Degree verified", get: (r) => (r.degree_verified ? "Yes" : "No") }, { label: "Visa clear", get: (r) => (r.visa_clear ? "Yes" : "No") }, { label: "QTS/PGCE", get: (r) => (r.qts_pgce ? "Yes" : "No") }, { label: "References", get: (r) => (r.refs_checked ? "Yes" : "No") },
  { label: "Experience (verbatim)", key: "verbatim_experience" }, { label: "Qualifications (verbatim)", key: "verbatim_qualifications" }, { label: "Notes", key: "notes" },
];
function TeacherDB({ teachers, onSelect, onAdd }) {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const list = teachers.filter((t) => ((t.name || "") + (t.ref || "") + (t.spec || "") + (t.status || "")).toLowerCase().includes(q.toLowerCase()));
  const save = (d) => { onAdd({ ...d, ref: nextRef(d.name, teachers.length + 1) }); setModal(false); };
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Teacher database</h1><p className="x-sub">{teachers.length} teachers · UAE and outside-UAE years computed at extraction.</p></div>
        <div style={{ display: "flex", gap: 8 }}><button className="x-ghost" onClick={() => downloadCsv("teachers.csv", TEACHER_CSV, teachers)}><Download size={14} /> Download Excel</button><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New candidate</button></div>
      </div>
      <div className="x-searchwrap" style={{ maxWidth: 380, marginBottom: 14 }}><Search size={15} color={C.muted} /><input className="x-search" placeholder="Search this database…" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button className="x-searchclear" onClick={() => setQ("")}><X size={13} /></button>}</div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No teachers yet. Use Bulk Extract or New candidate.</div></div> : (
        <div className="x-tablewrap"><table className="x-table">
          <thead><tr><th>Ref</th><th>Name</th><th>Role</th><th className="r">UAE</th><th className="r">Outside</th><th>Qual</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((t) => <tr key={t.id} onClick={() => onSelect(t.id)}><td><span className="x-ref">{t.ref || "—"}</span></td><td className="b">{t.name}</td><td>{t.spec}</td><td className="r nums">{Number(t.uae_years || 0).toFixed(1)}y</td><td className="r nums">{Number(t.out_years || 0).toFixed(1)}y</td><td className="mut">{t.qual}</td><td><Pill s={t.status} /></td><td className="rowact"><ChevronRight size={15} color={C.faint} /></td></tr>)}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New candidate" fields={CAND_FIELDS} initial={{ status: "New" }} onClose={() => setModal(false)} onSave={save} />}
    </div>
  );
}

function TeacherProfile({ t, onBack, onSave }) {
  const [edit, setEdit] = useState(false); const [d, setD] = useState(t);
  useEffect(() => setD(t), [t]); if (!d) return null;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const save = () => { onSave({ spec: d.spec, curriculum: d.curriculum, qual: d.qual, email: d.email, phone: d.phone, status: d.status, location: d.location, salary: d.salary, visa: d.visa, availability: d.availability, notes: d.notes }); setEdit(false); };
  return (
    <div className="x-page">
      <button className="x-back" onClick={onBack}><ArrowLeft size={15} /> Back to database</button>
      <div className="x-profhead"><div><div className="x-ref lg">{d.ref || "—"}</div><h1 className="x-h1" style={{ marginTop: 6 }}>{d.name}</h1><div className="x-sub">{d.spec} · {d.curriculum} · {d.qual}</div></div>{edit ? <button className="x-primary" onClick={save}><Check size={15} /> Save</button> : <button className="x-ghost" onClick={() => setEdit(true)}><Pencil size={14} /> Edit</button>}</div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Experience — computed from role dates</h2></div><div className="x-exp3">
        <div className="x-metric"><div className="x-metricn nums">{Number(d.uae_years || 0).toFixed(1)}</div><div className="x-metricl">Years in UAE</div></div>
        <div className="x-metric"><div className="x-metricn nums">{Number(d.out_years || 0).toFixed(1)}</div><div className="x-metricl">Years outside UAE</div></div>
        <div className="x-metric"><div className="x-metricn nums" style={{ color: C.red }}>{(Number(d.uae_years || 0) + Number(d.out_years || 0)).toFixed(1)}</div><div className="x-metricl">Total</div></div>
      </div></div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Details</h2></div>
        <Field label="Role / Specialization" value={d.spec} edit={edit} onChange={(v) => set("spec", v)} />
        <Field label="Curriculum" value={d.curriculum} edit={edit} onChange={(v) => set("curriculum", v)} />
        <Field label="Qualification" value={d.qual} edit={edit} onChange={(v) => set("qual", v)} />
        <Field label="Status" value={d.status} edit={edit} onChange={(v) => set("status", v)} />
        <Field label="Location" value={d.location} edit={edit} onChange={(v) => set("location", v)} />
        <Field label="Salary" value={d.salary} edit={edit} onChange={(v) => set("salary", v)} />
        <Field label="Visa" value={d.visa} edit={edit} onChange={(v) => set("visa", v)} />
        <Field label="Availability" value={d.availability} edit={edit} onChange={(v) => set("availability", v)} />
        <Field label="Email" value={d.email} edit={edit} onChange={(v) => set("email", v)} />
        <Field label="Phone" value={d.phone} edit={edit} onChange={(v) => set("phone", v)} />
        <Field label="Notes" value={d.notes} edit={edit} onChange={(v) => set("notes", v)} area />
      </div>
      {d.verbatim_experience && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Experience — exactly as written on the CV</h2></div><div className="x-verbatim">{d.verbatim_experience}</div></div>}
      {d.verbatim_qualifications && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Qualifications — exactly as written</h2></div><div className="x-verbatim">{d.verbatim_qualifications}</div></div>}
      <div className="x-profactions"><button className="x-ghost" onClick={() => d.cv_url ? window.open(d.cv_url, "_blank") : alert("No file stored for this candidate. Re-extract the CV through the system to enable download.")}><Download size={15} /> Download CV</button><button className="x-ghost"><Briefcase size={15} /> Match to vacancy</button><button className="x-primary"><Mail size={15} /> Send offer</button></div>
    </div>
  );
}

/* ============================ LSAs ============================ */
const LSA_FIELDS = [
  { key: "name", label: "Full name" }, { key: "cert", label: "Certification" }, { key: "exp", label: "Experience" }, { key: "langs", label: "Languages" },
  { key: "background", label: "Background" }, { key: "location", label: "Location" },
  { key: "status", label: "Status", type: "select", opts: ["Available", "Matching", "Placed"] }, { key: "family", label: "Placed with" },
  { key: "email", label: "Email" }, { key: "phone", label: "Phone" }, { key: "placement_fee", label: "Placement fee", type: "number" },
];
const LSA_CSV = [
  { label: "Name", key: "name" }, { label: "Certification", key: "cert" }, { label: "Experience", key: "exp" }, { label: "Languages", key: "langs" }, { label: "Background", key: "background" }, { label: "Location", key: "location" },
  { label: "Status", key: "status" }, { label: "Placed with", key: "family" }, { label: "Email", key: "email" }, { label: "Phone", key: "phone" },
  { label: "LSA rate/mo", get: (r) => calcRate(r.calc) }, { label: "Placement fee", key: "placement_fee" }, { label: "Family package", get: (r) => calcRate(r.calc) + Number(r.placement_fee || 0) },
  { label: "Experience (verbatim)", key: "verbatim_experience" }, { label: "Qualifications (verbatim)", key: "verbatim_qualifications" },
];
function LsaDashboard({ lsas, go }) {
  const placed = lsas.filter((l) => l.status === "Placed").length;
  const revenue = lsas.reduce((s, l) => s + (Array.isArray(l.payments) ? l.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0) : 0), 0);
  return (
    <div className="x-page"><h1 className="x-h1">LSA desk</h1><p className="x-sub">Family placements — directory, bookings, attendance, payments.</p>
      <div className="x-stats">
        <div className="x-stat"><span className="x-statbar" style={{ background: C.green }} /><div className="x-statv">{lsas.length}</div><div className="x-statl">LSAs on desk</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.blue }} /><div className="x-statv">{placed}</div><div className="x-statl">Placed</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.red }} /><div className="x-statv">AED {fmt(revenue)}</div><div className="x-statl">Collected</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.amber }} /><div className="x-statv">{lsas.filter((l) => l.status === "Matching").length}</div><div className="x-statl">Matching</div></div>
      </div>
      <div className="x-quick">{[["lsa-directory", "Directory"], ["lsa-add", "Add LSAs"], ["lsa-bookings", "Bookings"], ["lsa-attendance", "Attendance"]].map(([to, l]) => <button key={to} className="x-quickbtn" onClick={() => go(to)}>{l} <ChevronRight size={15} /></button>)}</div>
    </div>
  );
}
function LsaDirectory({ lsas, onSelect, onAdd }) {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const list = lsas.filter((l) => ((l.name || "") + (l.cert || "") + (l.langs || "") + (l.location || "")).toLowerCase().includes(q.toLowerCase()));
  const save = (d) => { onAdd({ ...d, calc: DEFAULT_CALC, notes: [], payments: [] }); setModal(false); };
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">LSA directory</h1><p className="x-sub">Click any LSA to view and edit their profile, notes and payments.</p></div>
        <div style={{ display: "flex", gap: 8 }}><button className="x-ghost" onClick={() => downloadCsv("lsas.csv", LSA_CSV, lsas)}><Download size={14} /> Download Excel</button><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New LSA</button></div>
      </div>
      <div className="x-searchwrap" style={{ maxWidth: 380, marginBottom: 14 }}><Search size={15} color={C.muted} /><input className="x-search" placeholder="Search LSAs…" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button className="x-searchclear" onClick={() => setQ("")}><X size={13} /></button>}</div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No LSAs yet. Add one, or use Add LSAs to extract from CVs.</div></div> : (
        <div className="x-cards">{list.map((l) => <button key={l.id} className="x-lcard" onClick={() => onSelect(l.id)}><div className="x-lctop"><span className="x-lname">{l.name}</span><Pill s={l.status} /></div><div className="x-lrow"><Heart size={13} color={C.red} /> {l.cert || "—"}</div><div className="x-lrow"><Users size={13} color={C.muted} /> {l.langs || "—"}</div><div className="x-lrow"><MapPin size={13} color={C.muted} /> {l.location || "—"}</div><div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(calcRate(l.calc))}<span className="x-lper">/mo</span></span><ChevronRight size={15} color={C.faint} /></div></button>)}</div>
      )}
      {modal && <FormModal title="New LSA" fields={LSA_FIELDS} initial={{ status: "Available", placement_fee: 1000 }} onClose={() => setModal(false)} onSave={save} />}
    </div>
  );
}
function LsaProfile({ lsa, onBack, onSave }) {
  const [edit, setEdit] = useState(false); const [d, setD] = useState(lsa);
  const [noteText, setNoteText] = useState(""); const [pay, setPay] = useState({ amount: "", method: "Bank transfer" });
  useEffect(() => setD(lsa), [lsa]); if (!d) return null;
  const notes = Array.isArray(d.notes) ? d.notes : []; const payments = Array.isArray(d.payments) ? d.payments : []; const calc = d.calc || DEFAULT_CALC;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v })); const setCalc = (k, v) => setD((x) => ({ ...x, calc: { ...(x.calc || DEFAULT_CALC), [k]: v } }));
  const rate = calcRate(calc); const pkg = rate + Number(d.placement_fee || 0);
  const saveProfile = () => { onSave({ name: d.name, cert: d.cert, exp: d.exp, langs: d.langs, background: d.background, location: d.location, status: d.status, family: d.family, email: d.email, phone: d.phone }); setEdit(false); };
  const saveRate = () => onSave({ calc, placement_fee: Number(d.placement_fee || 0) });
  const addNote = () => { if (!noteText.trim()) return; const next = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), text: noteText.trim() }, ...notes]; set("notes", next); onSave({ notes: next }); setNoteText(""); };
  const delNote = (id) => { const next = notes.filter((n) => n.id !== id); set("notes", next); onSave({ notes: next }); };
  const addPay = () => { if (!pay.amount) return; const next = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), amount: Number(pay.amount), method: pay.method, status: "Paid" }, ...payments]; set("payments", next); onSave({ payments: next }); setPay({ amount: "", method: "Bank transfer" }); };
  const delPay = (id) => { const next = payments.filter((p) => p.id !== id); set("payments", next); onSave({ payments: next }); };
  return (
    <div className="x-page">
      <button className="x-back" onClick={onBack}><ArrowLeft size={15} /> Back to directory</button>
      <div className="x-profhead"><div><h1 className="x-h1">{d.name}</h1><div className="x-sub">{d.cert} · {d.location}</div></div><div style={{ display: "flex", gap: 8 }}>{d.cv_url && <button className="x-ghost" onClick={() => window.open(d.cv_url, "_blank")}><Download size={14} /> CV</button>}{edit ? <button className="x-primary" onClick={saveProfile}><Check size={15} /> Save changes</button> : <button className="x-ghost" onClick={() => setEdit(true)}><Pencil size={14} /> Edit profile</button>}</div></div>
      <div className="x-2col">
        <div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Profile</h2></div>
            <Field label="Full name" value={d.name} edit={edit} onChange={(v) => set("name", v)} /><Field label="Certification" value={d.cert} edit={edit} onChange={(v) => set("cert", v)} /><Field label="Experience" value={d.exp} edit={edit} onChange={(v) => set("exp", v)} /><Field label="Languages" value={d.langs} edit={edit} onChange={(v) => set("langs", v)} /><Field label="Background" value={d.background} edit={edit} onChange={(v) => set("background", v)} /><Field label="Location" value={d.location} edit={edit} onChange={(v) => set("location", v)} /><Field label="Status" value={d.status} edit={edit} onChange={(v) => set("status", v)} /><Field label="Email" value={d.email} edit={edit} onChange={(v) => set("email", v)} /><Field label="Phone" value={d.phone} edit={edit} onChange={(v) => set("phone", v)} /><Field label="Placed with" value={d.family} edit={edit} onChange={(v) => set("family", v)} />
          </div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2"><StickyNote size={15} style={{ verticalAlign: -2 }} /> Notes</h2></div>
            <div className="x-noteadd"><input className="x-input" placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} /><button className="x-primary sm" onClick={addNote}><Plus size={14} /></button></div>
            {notes.length === 0 && <div className="x-empty">No notes yet.</div>}{notes.map((n) => <div key={n.id} className="x-noterow"><div><div className="x-notet">{n.text}</div><div className="x-notedate nums">{n.date}</div></div><button className="x-ic" onClick={() => delNote(n.id)}><Trash2 size={13} /></button></div>)}
          </div>
        </div>
        <div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Rate calculator</h2></div>
            <div className="x-calcbig"><div><div className="x-calclabel">LSA rate</div><div className="x-calcv nums">AED {fmt(rate)}</div></div><div className="x-calcplus">+</div><div><div className="x-calclabel">Placement fee</div><input className="x-feeinput nums" type="number" value={d.placement_fee || 0} onChange={(e) => set("placement_fee", e.target.value)} /></div><div className="x-calceq">=</div><div><div className="x-calclabel">Family package</div><div className="x-calcv nums red">AED {fmt(pkg)}</div></div></div>
            <div className="x-calcgrid"><Select label="Hours/week" value={calc.hours} opts={[10, 15, 20, 25, 30, 40]} onChange={(v) => setCalc("hours", Number(v))} /><Select label="Level" value={calc.level} opts={["Junior", "Mid", "Experienced"]} onChange={(v) => setCalc("level", v)} /><Select label="Qualification" value={calc.qual} opts={["Level 3", "ABAT", "SEN diploma"]} onChange={(v) => setCalc("qual", v)} /><Select label="Languages" value={calc.langs} opts={[1, 2, 3]} onChange={(v) => setCalc("langs", Number(v))} /><Select label="Tier" value={calc.tier} opts={["Standard", "Specialist"]} onChange={(v) => setCalc("tier", v)} /><Select label="Child needs" value={calc.needs} opts={["Mild", "Moderate", "Complex"]} onChange={(v) => setCalc("needs", v)} /><Select label="Urgency" value={calc.urgency} opts={["Standard", "Urgent"]} onChange={(v) => setCalc("urgency", v)} /></div>
            <button className="x-primary" style={{ marginTop: 12 }} onClick={saveRate}><Check size={15} /> Save rate</button>
          </div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2"><CreditCard size={15} style={{ verticalAlign: -2 }} /> Payments</h2></div>
            <div className="x-payadd"><input className="x-input" type="number" placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /><select className="x-input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option>Bank transfer</option><option>Cash</option><option>Card</option></select><button className="x-primary sm" onClick={addPay}><Plus size={14} /></button></div>
            {payments.length === 0 && <div className="x-empty">No payments logged.</div>}{payments.map((p) => <div key={p.id} className="x-payrow"><div><div className="x-payamt nums">AED {fmt(p.amount)}</div><div className="x-paymeta nums">{p.date} · {p.method}</div></div><div className="x-payright"><Pill s={p.status} /><button className="x-ic" onClick={() => delPay(p.id)}><Trash2 size={13} /></button></div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ BOOKINGS ============================ */
const BOOKING_FIELDS = [
  { key: "lsa_name", label: "LSA name" }, { key: "family", label: "Family" }, { key: "location", label: "Location" },
  { key: "rate", label: "Rate / month", type: "number" }, { key: "fee", label: "Placement fee", type: "number" },
  { key: "status", label: "Status", type: "select", opts: ["Active", "Ended"] },
];
function Bookings({ rows, lsas, onAdd, onDel }) {
  const [modal, setModal] = useState(false); const [openC, setOpenC] = useState(null);
  const lsaNames = (lsas || []).map((l) => l.name).filter(Boolean);
  const fields = [lsaNames.length ? { key: "lsa_name", label: "LSA", type: "select", opts: lsaNames } : { key: "lsa_name", label: "LSA name" }, { key: "family", label: "Family" }, { key: "location", label: "Location" }, { key: "rate", label: "Rate / month", type: "number" }, { key: "fee", label: "Placement fee", type: "number" }, { key: "status", label: "Status", type: "select", opts: ["Active", "Ended"] }];
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Bookings</h1><p className="x-sub">Active family placements. Click a card for details.</p></div><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New booking</button></div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No bookings yet. Press New booking.</div></div> : (
        <div className="x-cards">{rows.map((b) => <button key={b.id} className="x-lcard" onClick={() => setOpenC(b)}><div className="x-lctop"><span className="x-lname">{b.lsa_name}</span><Pill s={b.status} /></div><div className="x-lrow"><Users size={13} color={C.muted} /> {b.family || "—"}</div><div className="x-lrow"><MapPin size={13} color={C.muted} /> {b.location || "—"}</div><div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(Number(b.rate || 0) + Number(b.fee || 0))}<span className="x-lper">/mo</span></span><ChevronRight size={15} color={C.faint} /></div></button>)}</div>
      )}
      {modal && <FormModal title="New booking" fields={fields} initial={{ status: "Active", lsa_name: lsaNames[0] || "" }} onClose={() => setModal(false)} onSave={(d) => { onAdd(d); setModal(false); }} />}
      {openC && <><div className="x-scrim" onClick={() => setOpenC(null)} /><div className="x-modal"><div className="x-modalhead"><h2 className="x-h2">{openC.lsa_name}</h2><button className="x-ic" onClick={() => setOpenC(null)}><X size={16} /></button></div><Row k="Family" v={openC.family || "—"} /><Row k="Location" v={openC.location || "—"} /><Row k="Rate/mo" v={"AED " + fmt(openC.rate || 0)} /><Row k="Placement fee" v={"AED " + fmt(openC.fee || 0)} /><Row k="Total" v={"AED " + fmt(Number(openC.rate || 0) + Number(openC.fee || 0))} /><div style={{ marginTop: 14, textAlign: "right" }}><button className="x-ghost" onClick={() => { onDel(openC.id); setOpenC(null); }}><Trash2 size={14} /> Delete</button></div></div></>}
    </div>
  );
}

/* ============================ ATTENDANCE ============================ */
const ATT_FIELDS = [
  { key: "lsa_name", label: "LSA" }, { key: "date", label: "Date", type: "date" },
  { key: "start_time", label: "Start", type: "time" }, { key: "end_time", label: "End", type: "time" }, { key: "hours", label: "Hours", type: "number" },
];
function Attendance({ rows, lsas, onAdd, onDel }) {
  const [modal, setModal] = useState(false);
  const lsaNames = (lsas || []).map((l) => l.name).filter(Boolean);
  const fields = [lsaNames.length ? { key: "lsa_name", label: "LSA", type: "select", opts: lsaNames } : { key: "lsa_name", label: "LSA" }, { key: "date", label: "Date", type: "date" }, { key: "start_time", label: "Start", type: "time" }, { key: "end_time", label: "End", type: "time" }, { key: "hours", label: "Hours", type: "number" }];
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Attendance</h1><p className="x-sub">Log sessions per LSA.</p></div><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New session</button></div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No sessions yet. Press New session.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>LSA</th><th>Date</th><th>Start</th><th>End</th><th className="r">Hours</th><th></th></tr></thead>
          <tbody>{rows.map((a) => <tr key={a.id}><td className="b">{a.lsa_name}</td><td className="nums">{a.date}</td><td className="nums">{a.start_time}</td><td className="nums">{a.end_time}</td><td className="r nums">{a.hours}</td><td className="rowact"><button className="x-ic" onClick={() => onDel(a.id)}><Trash2 size={13} /></button></td></tr>)}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New session" fields={fields} initial={{ lsa_name: lsaNames[0] || "" }} onClose={() => setModal(false)} onSave={(d) => { onAdd(d); setModal(false); }} />}
    </div>
  );
}

/* ============================ VACANCIES ============================ */
const VAC_STATUSES = ["Open", "Filled", "On Hold", "Closed"];
const VAC_FIELDS = [
  { key: "school", label: "School" }, { key: "contact", label: "Contact" }, { key: "level", label: "Level" }, { key: "role", label: "Role" },
  { key: "qualification", label: "Qualification" }, { key: "budget", label: "Budget" },
  { key: "status", label: "Status", type: "select", opts: VAC_STATUSES }, { key: "date_added", label: "Date added", type: "date" },
  { key: "notes", label: "Notes", type: "textarea", full: true },
];
const VAC_CSV = [{ label: "Role", key: "role" }, { label: "School", key: "school" }, { label: "Contact", key: "contact" }, { label: "Level", key: "level" }, { label: "Qualification", key: "qualification" }, { label: "Budget", key: "budget" }, { label: "Status", key: "status" }, { label: "Days open", get: (r) => daysSince(r.created_at) }, { label: "Shortlist", key: "shortlist" }, { label: "Notes", key: "notes" }];
function Vacancies({ rows, onAdd, onUpdate, onDel, onImport }) {
  const [filter, setFilter] = useState("All"); const [modal, setModal] = useState(false);
  const tone = (d) => (d > 7 ? C.red : d > 4 ? C.amber : C.muted);
  const cycle = (r) => { const i = VAC_STATUSES.indexOf(r.status || "Open"); onUpdate(r.id, { status: VAC_STATUSES[(i + 1) % VAC_STATUSES.length] }); };
  const shown = rows.filter((r) => filter === "All" || (r.status || "Open") === filter);
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Vacancies</h1><p className="x-sub">Every role. Change status right in the row. Aging shows days open.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="vac-import" type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) importCsv(f, VAC_MAP, onImport); e.target.value = ""; }} />
          <button className="x-ghost" onClick={() => document.getElementById("vac-import").click()}><UploadCloud size={14} /> Import CSV</button>
          <button className="x-ghost" onClick={() => downloadCsv("vacancies.csv", VAC_CSV, rows)}><Download size={14} /> Export CSV</button>
          <button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New vacancy</button>
        </div>
      </div>
      <div className="x-filters" style={{ marginBottom: 16 }}>{["All", ...VAC_STATUSES].map((s) => <button key={s} className={"x-chip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>{s}</button>)}</div>
      {shown.length === 0 ? <div className="x-panel"><div className="x-empty">No vacancies here. Press New vacancy, or import your CSV in Supabase.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Role</th><th>School</th><th>Contact</th><th>Status</th><th className="r">Days</th><th className="r">Shortlist</th><th></th></tr></thead>
          <tbody>{shown.map((v) => { const d = daysSince(v.created_at); const sc = STATUS_COLOR[v.status || "Open"]; return (
            <tr key={v.id}>
              <td><input className="x-cellinput b" defaultValue={v.role || ""} onBlur={(e) => onUpdate(v.id, { role: e.target.value })} /></td>
              <td><input className="x-cellinput" defaultValue={v.school || ""} onBlur={(e) => onUpdate(v.id, { school: e.target.value })} /></td>
              <td><input className="x-cellinput" defaultValue={v.contact || ""} onBlur={(e) => onUpdate(v.id, { contact: e.target.value })} /></td>
              <td><select className="x-cellsel" value={v.status || "Open"} onChange={(e) => onUpdate(v.id, { status: e.target.value })} style={{ color: sc, fontWeight: 700 }}>{VAC_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td className="r nums" style={{ color: tone(d), fontWeight: 600 }}>{d}d</td>
              <td className="r"><input className="x-cellinput nums" style={{ textAlign: "right", width: 46 }} defaultValue={v.shortlist || 0} onBlur={(e) => onUpdate(v.id, { shortlist: Number(e.target.value) || 0 })} /></td>
              <td className="rowact"><button className="x-ic" onClick={() => onDel(v.id)}><Trash2 size={13} /></button></td>
            </tr>
          ); })}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New vacancy" fields={VAC_FIELDS} initial={{ status: "Open" }} onClose={() => setModal(false)} onSave={(d) => { onAdd({ ...d, shortlist: 0, kind: "teacher" }); setModal(false); }} />}
    </div>
  );
}

/* ============================ PIPELINE ============================ */
const PIPE_STAGES = ["Sourcing", "Submitted", "Interview", "Offer", "Placed", "Rejected"];
const PIPE_FIELDS = [
  { key: "school", label: "School" }, { key: "grp", label: "Group" }, { key: "role", label: "Role" }, { key: "candidate_name", label: "Candidate" },
  { key: "type", label: "Type", type: "select", opts: ["Permanent", "Supply"] }, { key: "stage", label: "Stage", type: "select", opts: PIPE_STAGES },
  { key: "interview_date", label: "Interview date", type: "date" }, { key: "start_date", label: "Start date", type: "date" },
  { key: "interview_rating", label: "Interview rating" }, { key: "outcome", label: "Outcome (if closed)" },
  { key: "next_action", label: "Next action" }, { key: "next_action_date", label: "Next action date", type: "date" },
  { key: "follow_ups", label: "Follow-ups (count)", type: "number" }, { key: "priority", label: "Priority", type: "checkbox" },
  { key: "notes", label: "Notes", type: "textarea", full: true },
];
function PipelineView({ rows, onAdd, onUpdate, onDel, onImport }) {
  const [modal, setModal] = useState(false); const [filter, setFilter] = useState("All");
  const shown = rows.filter((r) => filter === "All" || (r.stage || "Sourcing") === filter);
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Pipeline</h1><p className="x-sub">Every deal. Change stage right in the row.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="pipe-import" type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) importCsv(f, PIPE_MAP, onImport); e.target.value = ""; }} />
          <button className="x-ghost" onClick={() => document.getElementById("pipe-import").click()}><UploadCloud size={14} /> Import CSV</button>
          <button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New deal</button>
        </div>
      </div>
      <div className="x-filters" style={{ marginBottom: 16 }}>{["All", ...PIPE_STAGES].map((s) => <button key={s} className={"x-chip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>{s}</button>)}</div>
      {shown.length === 0 ? <div className="x-panel"><div className="x-empty">Pipeline is empty. Press New deal, or import your CSV in Supabase.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>School</th><th>Candidate</th><th>Role</th><th>Stage</th><th>Next action</th><th className="r">Follow-ups</th><th></th></tr></thead>
          <tbody>{shown.map((p) => <tr key={p.id}>
            <td className="b">{p.priority && <Star size={12} color={C.amber} fill={C.amber} style={{ verticalAlign: -1, marginRight: 4 }} />}{p.school || "—"}</td>
            <td>{p.candidate_name}</td><td>{p.role || "—"}</td>
            <td><select className="x-cellsel" value={p.stage || "Sourcing"} onChange={(e) => onUpdate(p.id, { stage: e.target.value })} style={{ color: STATUS_COLOR[p.stage || "Sourcing"] }}>{PIPE_STAGES.map((s) => <option key={s}>{s}</option>)}</select></td>
            <td className="mut">{p.next_action || "—"}{p.next_action_date ? " · " + p.next_action_date : ""}</td>
            <td className="r nums">{p.follow_ups || 0}</td>
            <td className="rowact"><button className="x-ic" onClick={() => onDel(p.id)}><Trash2 size={13} /></button></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New deal" fields={PIPE_FIELDS} initial={{ type: "Permanent", stage: "Sourcing", follow_ups: 0 }} onClose={() => setModal(false)} onSave={(d) => { onAdd(d); setModal(false); }} />}
    </div>
  );
}

/* ============================ SCHOOLS / TASKS / LOG ============================ */
function Schools({ rows, onAdd, onDel }) {
  const [f, setF] = useState({ name: "", grp: "", curriculum: "" });
  return (
    <div className="x-page"><div className="x-headrow"><div><h1 className="x-h1">Schools</h1><p className="x-sub">Client schools and their compliance flags.</p></div></div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Add a school</h2></div><div className="x-payadd" style={{ flexWrap: "wrap" }}><input className="x-input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /><input className="x-input" placeholder="Group" value={f.grp} onChange={(e) => setF({ ...f, grp: e.target.value })} /><input className="x-input" placeholder="Curriculum" value={f.curriculum} onChange={(e) => setF({ ...f, curriculum: e.target.value })} /><button className="x-primary sm" onClick={() => { if (f.name) { onAdd({ ...f, flags: [] }); setF({ name: "", grp: "", curriculum: "" }); } }}><Plus size={14} /></button></div></div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No schools yet.</div></div> : (
        <div className="x-cards">{rows.map((s) => <div key={s.id} className="x-scard"><div className="x-lctop"><span className="x-ref">{s.grp || "—"}</span><button className="x-ic" onClick={() => onDel(s.id)}><Trash2 size={13} /></button></div><div className="x-lname" style={{ margin: "8px 0 10px" }}>{s.name}</div>{(Array.isArray(s.flags) ? s.flags : []).map((flg, i) => { const warn = /block|required/i.test(flg); return <span key={i} className={"x-flag" + (warn ? " warn" : "")}>{warn ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />} {flg}</span>; })}</div>)}</div>
      )}
    </div>
  );
}
function Tasks({ rows, onAdd, onToggle, onUpdate, onDel }) {
  const [text, setText] = useState("");
  const [modal, setModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const CATS = ["General", "Teachers", "LSAs", "Schools", "Follow-up", "Admin"];
  const fields = [{ key: "text", label: "Task", full: true }, { key: "due", label: "Due date", type: "date" }, { key: "tag", label: "Category", type: "select", opts: CATS }];
  const quickAdd = () => { if (text.trim()) { onAdd({ text: text.trim(), done: false, due: "", tag: "General" }); setText(""); } };
  const sorted = [...rows].sort((a, b) => (a.done ? 1 : 0) - (b.done ? 1 : 0));
  const overdue = (t) => t.due && !t.done && t.due < new Date().toISOString().slice(0, 10);
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">To-do</h1><p className="x-sub">Quick-add below, or a detailed task with a due date and category.</p></div><button className="x-primary" onClick={() => { setEditing(null); setModal(true); }}><Plus size={15} /> New task</button></div>
      <div className="x-noteadd" style={{ maxWidth: 560 }}><input className="x-input" placeholder="Quick add a task…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && quickAdd()} /><button className="x-primary sm" onClick={quickAdd}><Plus size={14} /></button></div>
      <div className="x-panel" style={{ marginTop: 16 }}>
        {sorted.length === 0 && <div className="x-empty">No tasks yet.</div>}
        {sorted.map((t) => (
          <div key={t.id} className={"x-task" + (t.done ? " done" : "")}>
            <button className={"x-check" + (t.done ? " on" : "")} onClick={() => onToggle(t)}>{t.done && <Check size={12} />}</button>
            <span className="x-taskt">{t.text}</span>
            {t.tag && <span className="x-tasktag">{t.tag}</span>}
            <span className="x-taskdue" style={overdue(t) ? { color: C.red, fontWeight: 700 } : {}}>{t.due || "—"}</span>
            <button className="x-ic" onClick={() => { setEditing(t); setModal(true); }}><Pencil size={13} /></button>
            <button className="x-ic" onClick={() => onDel(t.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
      {modal && <FormModal title={editing ? "Edit task" : "New task"} fields={fields} initial={editing || { tag: "General" }} onClose={() => setModal(false)} onSave={(d) => { if (editing) onUpdate(editing.id, { text: d.text, due: d.due, tag: d.tag }); else onAdd({ text: d.text || "Untitled", due: d.due || "", tag: d.tag || "General", done: false }); setModal(false); }} />}
    </div>
  );
}
function DailyLog({ teachers, lsas }) {
  const items = [...teachers.slice(0, 5).map((t) => t.name + " added to teacher database"), ...lsas.slice(0, 3).map((l) => l.name + " added to LSA directory")];
  return <div className="x-page"><h1 className="x-h1">Daily log</h1><p className="x-sub">Recent activity across the desk.</p><div className="x-panel">{items.length === 0 ? <div className="x-empty">Nothing logged yet.</div> : items.map((t, i) => <div key={i} className="x-logrow"><span className="x-logdot" /> {t}</div>)}</div></div>;
}
function Simple({ title, sub }) { return <div className="x-page"><h1 className="x-h1">{title}</h1><p className="x-sub">{sub}</p><div className="x-panel"><div className="x-empty">This section is ready — it fills in as you use the desk.</div></div></div>; }

/* ---------- shared ---------- */
function Pill({ s }) { const c = STATUS_COLOR[s] || C.muted; return <span className="x-pill" style={{ color: c, background: c + "16", borderColor: c + "30" }}>{s || "—"}</span>; }
function Row({ k, v }) { return <div className="x-detrow"><span className="x-detk">{k}</span><span className="x-detv">{v}</span></div>; }
function Field({ label, value, edit, onChange, area }) { return (<div className="x-field"><span className="x-fieldk">{label}</span>{edit ? (area ? <textarea className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} rows={2} /> : <input className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />) : <span className="x-fieldv">{value || "—"}</span>}</div>); }
function Select({ label, value, opts, onChange }) { return (<label className="x-sel"><span className="x-selk">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>); }
