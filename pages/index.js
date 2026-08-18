import { useState, useEffect } from "react";
import {
  LayoutDashboard, UploadCloud, GraduationCap, Heart, ListChecks, Building2,
  Wallet, Search, Plus, Bell, Download, ChevronRight, ChevronDown, X,
  Mail, Pencil, Check, Trash2, MapPin, Users, Briefcase, CreditCard,
  StickyNote, ArrowLeft, ShieldAlert, CheckCircle2, Sparkles, Star, Clock,
  Receipt, AlertTriangle, Calendar, FileText, MessageCircle,
} from "lucide-react";
import { supabase, hasSupabase } from "../lib/supabaseClient";
import { DOC_TYPES } from "../lib/compliance";

const C = { ink: "#1C2230", text: "#2C3446", muted: "#7A8494", faint: "#AEB6C2", red: "#DA2A34", green: "#17915B", amber: "#C98A16", blue: "#2F6FED" };
const STATUS_COLOR = { New: C.muted, "Needs review": C.amber, Sourcing: C.muted, Sourced: C.muted, Screened: C.blue, Submitted: C.blue, Shortlist: C.amber, Shortlisted: C.amber, Interview: C.amber, Offer: C.red, Placed: C.green, Rejected: C.red, "Not Suitable": C.red, "In Review": C.amber, Approved: C.green, Matching: C.amber, Available: C.green, Active: C.green, Paid: C.green, Open: C.green, Filled: C.blue, "On Hold": C.amber, Closed: C.muted };
const fmt = (n) => new Intl.NumberFormat("en-AE").format(Number(n) || 0);
const initialsOf = (name) => (name || "XX").split(" ").filter(Boolean).map((w) => w[0]).join("").slice(0, 2).toUpperCase();
const nextRef = (name, n) => "rTR" + initialsOf(name) + String(n).padStart(2, "0");
const daysSince = (ts) => (ts ? Math.max(0, Math.floor((Date.now() - new Date(ts)) / 86400000)) : 0);
const ymToDate = (s) => { if (!s) return null; if (/present|current|now/i.test(String(s))) return new Date(); const m = String(s).match(/(\d{4})(?:[-/.](\d{1,2}))?/); if (!m) return null; return new Date(Number(m[1]), m[2] ? Number(m[2]) - 1 : 0, 1); };
const computeYears = (roles) => {
  let u = 0, o = 0;
  (Array.isArray(roles) ? roles : []).forEach((r) => {
    if (!r) return;
    const a = ymToDate(r.start); const b = ymToDate(r.end) || new Date();
    if (!a) return; let yrs = (b - a) / (365.25 * 86400000); if (yrs < 0) yrs = 0;
    if (r.uae) u += yrs; else o += yrs;
  });
  return { uae: Math.round(u * 10) / 10, out: Math.round(o * 10) / 10 };
};

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

function suggestLsaSalary(cert = "", exp = "") {
  let s = 2500;
  const c = String(cert).toLowerCase();
  if (c.includes("abat")) s += 1200;
  else if (c.includes("sen")) s += 900;
  else if (c.includes("level 3") || c.includes("level3")) s += 500;
  else if (c.includes("level 2") || c.includes("level2")) s += 250;
  const m = String(exp).match(/(\d+)/);
  s += (m ? Math.min(Number(m[1]), 15) : 0) * 150;
  return Math.round(s / 50) * 50;
}

function PersonField({ value, people, onPick }) {
  const [q, setQ] = useState(value || "");
  const [open, setOpen] = useState(false);
  useEffect(() => setQ(value || ""), [value]);
  const matches = q.trim() ? (people || []).filter((p) => ((p.name || "") + (p.ref || "") + (p.sub || "")).toLowerCase().includes(q.toLowerCase())).slice(0, 6) : [];
  return (
    <div className="x-typeahead">
      <input className="x-input" placeholder="Type a name…" value={q} onChange={(e) => { setQ(e.target.value); setOpen(true); onPick({ name: e.target.value }); }} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} />
      {open && matches.length > 0 && <div className="x-tadrop">{matches.map((p) => <button key={p.kind + p.id} className="x-taitem" onMouseDown={() => { onPick(p); setQ(p.name); setOpen(false); }}><span className="x-tan">{p.name}</span><span className="x-tam">{p.kind}{p.ref ? " · " + p.ref : ""}{p.sub ? " · " + p.sub : ""}</span></button>)}</div>}
    </div>
  );
}

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
  { id: "finance", label: "Finance", icon: Receipt, kind: "leaf" },
  { id: "g-teachers", label: "Teachers", icon: GraduationCap, kind: "group", items: [{ id: "t-database", label: "Database" }, { id: "t-attach", label: "Attach CVs" }, { id: "t-vacancies", label: "Vacancies" }, { id: "t-pipeline", label: "Pipeline" }, { id: "t-covers", label: "Covers" }] },
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
function FormModal({ title, fields, initial, onClose, onSave, people }) {
  const [d, setD] = useState(initial || {});
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const pickPerson = (f, p) => setD((x) => ({ ...x, [f.key]: p.name || "", ...(f.refKey ? { [f.refKey]: p.ref || "" } : {}), ...(f.idKey ? { [f.idKey]: p.id || null } : {}) }));
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
              {f.type === "person" ? <PersonField value={d[f.key]} people={people} onPick={(p) => pickPerson(f, p)} />
                : f.type === "textarea" ? <textarea className="x-input" rows={2} value={d[f.key] || ""} onChange={(e) => set(f.key, e.target.value)} />
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
  const [selV, setSelV] = useState(null);
  const [bellOpen, setBellOpen] = useState(false);

  const [teachers, setTeachers] = useState([]);
  const [lsas, setLsas] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [schools, setSchools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [attendance, setAttendance] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [covers, setCovers] = useState([]);
  const [invoices, setInvoices] = useState([]);
  const [compliance, setCompliance] = useState([]);

  useEffect(() => { try { if (localStorage.getItem("rt_auth") === "1") setAuthed(true); } catch {} setReady(true); }, []);

  const setters = { candidates: setTeachers, lsas: setLsas, vacancies: setVacancies, pipeline: setPipeline, schools: setSchools, tasks: setTasks, bookings: setBookings, attendance: setAttendance, submissions: setSubmissions, covers: setCovers, invoices: setInvoices, compliance_docs: setCompliance };
  const reloadTable = async (t) => { if (!supabase) return; const { data } = await supabase.from(t).select("*").order("created_at", { ascending: false }).range(0, 99999); setters[t](data || []); };
  const loadAll = async () => { if (!supabase) return; await Promise.all(Object.keys(setters).map(reloadTable)); };
  useEffect(() => { if (authed) loadAll(); }, [authed]);

  const updateRow = async (table, id, patch) => { if (!supabase) return; const { error } = await supabase.from(table).update(patch).eq("id", id); if (error) alert("Save failed: " + error.message); reloadTable(table); };
  const insertRow = async (table, row) => { if (!supabase) return; const { error } = await supabase.from(table).insert(row); if (error) alert("Add failed: " + error.message); reloadTable(table); };
  const deleteRow = async (table, id) => { if (!supabase) return; const { error } = await supabase.from(table).delete().eq("id", id); if (error) alert("Delete failed: " + error.message); reloadTable(table); };
  const importRows = async (table, rows) => { if (!supabase) return; if (!rows.length) { alert("No rows found in that file."); return; } const { error } = await supabase.from(table).insert(rows); if (error) { alert("Import failed: " + error.message); return; } reloadTable(table); alert("Imported " + rows.length + " rows."); };

  const SUB_TO_PIPE = { Submitted: "Submitted", Shortlisted: "Submitted", Interview: "Interview", Offer: "Offer", Rejected: "Rejected", Placed: "Placed" };
  const addSubmission = async (vacancy, c) => {
    if (!supabase || !vacancy) return;
    await supabase.from("submissions").insert({ vacancy_id: vacancy.id, candidate_id: c.id, candidate_name: c.name, candidate_ref: c.ref || "", stage: "Submitted", date: new Date().toISOString().slice(0, 10), notes: "" });
    await supabase.from("pipeline").insert({ candidate_name: c.name, candidate_ref: c.ref || "", school: vacancy.school || "", role: vacancy.role || "", stage: "Submitted", vacancy_id: vacancy.id, candidate_id: c.id, from_vacancy: true });
    reloadTable("submissions"); reloadTable("pipeline");
  };
  const updateSubmission = async (sub, patch) => {
    if (!supabase) return;
    await supabase.from("submissions").update(patch).eq("id", sub.id);
    if (patch.stage) await supabase.from("pipeline").update({ stage: SUB_TO_PIPE[patch.stage] || patch.stage }).eq("vacancy_id", sub.vacancy_id).eq("candidate_id", sub.candidate_id);
    reloadTable("submissions"); reloadTable("pipeline");
  };
  const delSubmission = async (sub) => {
    if (!supabase) return;
    await supabase.from("submissions").delete().eq("id", sub.id);
    await supabase.from("pipeline").delete().eq("vacancy_id", sub.vacancy_id).eq("candidate_id", sub.candidate_id).eq("from_vacancy", true);
    reloadTable("submissions"); reloadTable("pipeline");
  };
  const updatePipelineRow = async (row, patch) => {
    if (!supabase) return;
    await supabase.from("pipeline").update(patch).eq("id", row.id);
    if (patch.stage && row.from_vacancy && row.vacancy_id && row.candidate_id) await supabase.from("submissions").update({ stage: patch.stage }).eq("vacancy_id", row.vacancy_id).eq("candidate_id", row.candidate_id);
    reloadTable("pipeline"); reloadTable("submissions");
  };

  const teacherPeople = teachers.map((t) => ({ id: t.id, name: t.name, ref: t.ref, sub: t.spec, kind: "Teacher" }));
  const lsaPeople = lsas.map((l) => ({ id: l.id, name: l.name, ref: "", sub: l.cert, kind: "LSA" }));
  const allPeople = [...teacherPeople, ...lsaPeople];

  const createInvoice = async (inv) => {
    if (!supabase) return;
    const { error } = await supabase.from("invoices").insert({ kind: inv.kind || "Teacher", client: inv.client || "", candidate_name: inv.candidate_name || "", candidate_id: inv.candidate_id || null, description: inv.description || "", amount: Number(inv.amount) || 0, paid: false, status: "Unpaid" });
    if (error) { alert("Add failed: " + error.message); return; }
    if (inv.candidate_id) {
      if ((inv.kind || "Teacher") === "LSA") await supabase.from("lsas").update({ status: "Placed" }).eq("id", inv.candidate_id);
      else { await supabase.from("candidates").update({ status: "Placed" }).eq("id", inv.candidate_id); await supabase.from("pipeline").update({ stage: "Placed" }).eq("candidate_id", inv.candidate_id); }
    }
    reloadTable("invoices"); reloadTable("candidates"); reloadTable("lsas"); reloadTable("pipeline");
  };

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
          {view === "extract" && <Extract teachersCount={teachers.length} existing={[...teachers.map((t) => t.name), ...lsas.map((l) => l.name)]} existingRecords={[...teachers.map((t) => ({ name: t.name, email: t.email })), ...lsas.map((l) => ({ name: l.name, email: l.email }))]} onSaved={loadAll} />}
          {view === "lsa-add" && <Extract lsaMode teachersCount={teachers.length} existing={[...teachers.map((t) => t.name), ...lsas.map((l) => l.name)]} existingRecords={[...teachers.map((t) => ({ name: t.name, email: t.email })), ...lsas.map((l) => ({ name: l.name, email: l.email }))]} onSaved={loadAll} />}

          {view === "t-database" && !selT && <TeacherDB teachers={teachers} onSelect={setSelT} onAdd={(r) => insertRow("candidates", r)} onDel={(id) => deleteRow("candidates", id)} />}
          {view === "t-database" && selT && <TeacherProfile t={teachers.find((x) => x.id === selT)} docs={compliance.filter((x) => x.candidate_id === selT)} onBack={() => setSelT(null)} onSave={(p) => updateRow("candidates", selT, p)} onDelete={() => { if (confirm("Delete this candidate permanently?")) { deleteRow("candidates", selT); setSelT(null); } }} onRefreshDocs={() => reloadTable("compliance_docs")} />}
          {view === "finance" && <Finance invoices={invoices} people={allPeople} onCreate={createInvoice} onUpdate={(id, p) => updateRow("invoices", id, p)} onDel={(id) => deleteRow("invoices", id)} />}

          {view === "t-vacancies" && !selV && <Vacancies rows={vacancies} onOpen={setSelV} onAdd={(r) => insertRow("vacancies", r)} onUpdate={(id, p) => updateRow("vacancies", id, p)} onDel={(id) => deleteRow("vacancies", id)} onImport={(rows) => importRows("vacancies", rows)} />}
          {view === "t-vacancies" && selV && <VacancyDetail vacancy={vacancies.find((v) => v.id === selV)} candidates={teachers} subs={submissions.filter((s) => s.vacancy_id === selV)} onBack={() => setSelV(null)} onAddSub={addSubmission} onUpdateSub={updateSubmission} onDelSub={delSubmission} />}
          {view === "t-covers" && <Covers rows={covers} people={teacherPeople} onAdd={(r) => insertRow("covers", r)} onUpdate={(id, p) => updateRow("covers", id, p)} onDel={(id) => deleteRow("covers", id)} />}
          {view === "t-attach" && <AttachFiles candidates={teachers} people={teacherPeople} onDone={() => reloadTable("candidates")} />}
          {view === "t-pipeline" && <PipelineView rows={pipeline} vacancies={vacancies} people={allPeople} onAdd={(r) => insertRow("pipeline", r)} onUpdate={updatePipelineRow} onDel={(id) => deleteRow("pipeline", id)} onImport={(rows) => importRows("pipeline", rows)} />}

          {view === "lsa-dashboard" && <LsaDashboard lsas={lsas} go={openLeaf} />}
          {view === "lsa-directory" && !selL && <LsaDirectory lsas={lsas} onSelect={setSelL} onAdd={(r) => insertRow("lsas", r)} onDel={(id) => deleteRow("lsas", id)} />}
          {view === "lsa-directory" && selL && <LsaProfile lsa={lsas.find((x) => x.id === selL)} onBack={() => setSelL(null)} onSave={(p) => updateRow("lsas", selL, p)} onDelete={() => { if (confirm("Delete this LSA permanently?")) { deleteRow("lsas", selL); setSelL(null); } }} />}
          {view === "lsa-bookings" && <Bookings rows={bookings} lsas={lsas} people={lsaPeople} onAdd={(r) => insertRow("bookings", r)} onDel={(id) => deleteRow("bookings", id)} />}
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
function Extract({ lsaMode, teachersCount, existing, existingRecords, onSaved }) {
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
  const getPdfText = async (file) => {
    try {
      const pdfjs = await import("pdfjs-dist/build/pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const ab = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: ab }).promise;
      let out = "";
      for (let p = 1; p <= pdf.numPages; p++) { const page = await pdf.getPage(p); const c = await page.getTextContent(); out += c.items.map((it) => it.str).join(" ") + "\n"; }
      return out.trim();
    } catch { return ""; }
  };
  const fileToBody = async (file) => {
    const ext = (file.name.split(".").pop() || "").toLowerCase();
    if (file.type === "application/pdf" || ext === "pdf") {
      const t = await getPdfText(file);
      if (t && t.length > 120) return { text: t };          // real text PDF → cheap text path
      return { pdfBase64: await toB64(file) };               // scan / image PDF → vision fallback
    }
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
    const yr = computeYears(parsed.roles);
    const needsReview = !parsed.name || !String(parsed.name).trim() || !(parsed.roles && parsed.roles.length) || (!parsed.verbatim_experience && !parsed.verbatim_qualifications);
    if (type === "lsa") {
      await supabase.from("lsas").insert({ name: parsed.name || "Unnamed", cert: parsed.cert || "", langs: parsed.langs || "", location: parsed.location || "", status: needsReview ? "Needs review" : "Available", email: parsed.email || "", phone: parsed.phone || "", placement_fee: 1000, calc: DEFAULT_CALC, notes: [], payments: [], verbatim_experience: parsed.verbatim_experience || "", verbatim_qualifications: parsed.verbatim_qualifications || "", cv_url });
      return "lsa";
    }
    await supabase.from("candidates").insert({ ref: nextRef(parsed.name, n), name: parsed.name || "Unnamed", spec: parsed.spec || "", curriculum: parsed.curriculum || "", qual: parsed.qual || "", uae_years: yr.uae, out_years: yr.out, status: needsReview ? "Needs review" : "New", email: parsed.email || "", phone: parsed.phone || "", location: parsed.location || "", verbatim_experience: parsed.verbatim_experience || "", verbatim_qualifications: parsed.verbatim_qualifications || "", cv_url });
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
    try { const parsed = await runOne({ text, model: "sonnet" }); const kind = await saveResult(parsed, teachersCount + 1); setRes((x) => ({ ...x, [kind]: 1, done: 1 })); setMsg("Saved."); setText(""); onSaved && onSaved(); }
    catch (e) { setRes((x) => ({ ...x, failed: 1, done: 1 })); setMsg("Could not read that one."); }
    setBusy(false);
  };
  const extractFiles = async (files) => {
    const arr = Array.from(files).slice(0, 2000); setBusy(true); setRes({ teacher: 0, lsa: 0, dupe: 0, failed: 0, done: 0, total: arr.length });
    const known = (existing || []).map((s) => (s || "").toLowerCase()).filter(Boolean);
    let n = teachersCount + 1;
    for (let i = 0; i < arr.length; i++) {
      setMsg(`Processing ${i + 1} of ${arr.length}…`);
      const clean = arr[i].name.replace(/\.[^.]+$/, "").replace(/[_\-]+/g, " ").toLowerCase();
      if (known.some((nm) => clean.includes(nm) || nm.split(" ").filter((w) => w.length > 2).every((w) => clean.includes(w)))) { setRes((x) => ({ ...x, dupe: x.dupe + 1, done: x.done + 1 })); continue; }
      const ftext = await getPdfText(arr[i]);
      if (ftext) {
        const de = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
        const low = de(ftext);
        const emailsIn = low.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];
        const flat = " " + low.replace(/[^a-z0-9]+/g, " ") + " ";
        const dup = (existingRecords || []).some((r) => {
          if (r.email && emailsIn.includes(r.email.toLowerCase().trim())) return true;
          const t = de(r.name).replace(/[^a-z0-9]+/g, " ").split(" ").filter((w) => w.length >= 2);
          return t.length >= 2 && flat.includes(" " + t[0] + " ") && flat.includes(" " + t[t.length - 1] + " ");
        });
        if (dup) { setRes((x) => ({ ...x, dupe: x.dupe + 1, done: x.done + 1 })); continue; }
      }
      try { const body = await fileToBody(arr[i]); const parsed = await runOne({ ...body, model: "haiku" }); const kind = await saveResult(parsed, n, arr[i]); if (kind === "teacher") n++; setRes((x) => ({ ...x, [kind]: x[kind] + 1, done: x.done + 1 })); }
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
function TeacherDB({ teachers, onSelect, onAdd, onDel }) {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fCurr, setFCurr] = useState("All");
  const [fQual, setFQual] = useState("All");
  const list = teachers.filter((t) => {
    if (!((t.name || "") + (t.ref || "") + (t.spec || "") + (t.status || "")).toLowerCase().includes(q.toLowerCase())) return false;
    if (fStatus !== "All" && (t.status || "") !== fStatus) return false;
    if (fCurr !== "All" && !(t.curriculum || "").toLowerCase().includes(fCurr.toLowerCase())) return false;
    if (fQual === "QTS" && !(t.qual || "").toLowerCase().includes("qts")) return false;
    if (fQual === "PGCE" && !(t.qual || "").toLowerCase().includes("pgce")) return false;
    return true;
  });
  const save = (d) => { onAdd({ ...d, ref: nextRef(d.name, teachers.length + 1) }); setModal(false); };
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Teacher database</h1><p className="x-sub">{teachers.length} teachers · UAE and outside-UAE years computed at extraction.</p></div>
        <div style={{ display: "flex", gap: 8 }}><button className="x-ghost" onClick={() => downloadCsv("teachers.csv", TEACHER_CSV, teachers)}><Download size={14} /> Download Excel</button><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New candidate</button></div>
      </div>
      <div className="x-filterbar">
        <div className="x-searchwrap" style={{ maxWidth: 300 }}><Search size={15} color={C.muted} /><input className="x-search" placeholder="Search this database…" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button className="x-searchclear" onClick={() => setQ("")}><X size={13} /></button>}</div>
        <select className="x-input x-filtersel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{["All", "New", "Needs review", "Approved", "In Review", "Placed", "Not Suitable"].map((o) => <option key={o}>{o}</option>)}</select>
        <select className="x-input x-filtersel" value={fCurr} onChange={(e) => setFCurr(e.target.value)}>{["All", "British", "IB", "American", "Indian", "MOE"].map((o) => <option key={o}>{o}</option>)}</select>
        <select className="x-input x-filtersel" value={fQual} onChange={(e) => setFQual(e.target.value)}>{["All", "QTS", "PGCE"].map((o) => <option key={o}>{o}</option>)}</select>
        <span className="x-filtercount">{list.length} shown</span>
      </div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No teachers yet. Use Bulk Extract or New candidate.</div></div> : (
        <div className="x-tablewrap"><table className="x-table">
          <thead><tr><th>Ref</th><th>Name</th><th>Role</th><th className="r">UAE</th><th className="r">Outside</th><th>Qual</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((t) => <tr key={t.id} onClick={() => onSelect(t.id)}><td><span className="x-ref">{t.ref || "—"}</span></td><td className="b">{t.name}</td><td>{t.spec}</td><td className="r nums">{Number(t.uae_years || 0).toFixed(1)}y</td><td className="r nums">{Number(t.out_years || 0).toFixed(1)}y</td><td className="mut">{t.qual}</td><td><Pill s={t.status} /></td><td className="rowact"><button className="x-ic" onClick={(e) => { e.stopPropagation(); if (confirm("Delete " + (t.name || "this candidate") + "?")) onDel(t.id); }}><Trash2 size={13} /></button><ChevronRight size={15} color={C.faint} /></td></tr>)}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New candidate" fields={CAND_FIELDS} initial={{ status: "New" }} onClose={() => setModal(false)} onSave={save} />}
    </div>
  );
}

function TeacherProfile({ t, docs, onBack, onSave, onDelete, onRefreshDocs }) {
  const [edit, setEdit] = useState(false); const [d, setD] = useState(t);
  useEffect(() => setD(t), [t]); if (!d) return null;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const save = () => { onSave({ spec: d.spec, curriculum: d.curriculum, qual: d.qual, email: d.email, phone: d.phone, status: d.status, location: d.location, salary: d.salary, visa: d.visa, availability: d.availability, notes: d.notes }); setEdit(false); };
  const uploadLink = "https://rtriibe-os.vercel.app/upload/" + d.id;
  const gotDocs = Array.isArray(docs) ? docs : [];
  const requestDocs = () => {
    const subject = encodeURIComponent("rTriibe — please upload your compliance documents");
    const body = encodeURIComponent("Hi " + (d.name || "") + ",\n\nPlease upload your compliance documents using your secure link below:\n" + uploadLink + "\n\nYou'll see a labelled slot for each document (passport, degree certificate, teaching qualification, Emirates ID, references). Drop each file into the matching slot.\n\nThank you,\nOthman\nrTriibe");
    window.location.href = "mailto:" + (d.email || "") + "?subject=" + subject + "&body=" + body;
  };
  const copyLink = () => { navigator.clipboard.writeText(uploadLink).then(() => alert("Upload link copied.")); };
  const [cvOpen, setCvOpen] = useState(false);
  const seedCv = () => (d.cv_data && Object.keys(d.cv_data).length) ? d.cv_data : { title: d.spec || "", profile: "", expertise: "", education: d.verbatim_qualifications || "", development: "", experience: [] };
  const [cv, setCv] = useState(seedCv());
  useEffect(() => { setCv(seedCv()); }, [t]);
  const setCvK = (k, v) => setCv((x) => ({ ...x, [k]: v }));
  const setExp = (i, k, v) => setCv((x) => ({ ...x, experience: x.experience.map((e, j) => j === i ? { ...e, [k]: v } : e) }));
  const addExp = () => setCv((x) => ({ ...x, experience: [...(x.experience || []), { role: "", org: "", dates: "", bullets: "" }] }));
  const delExp = (i) => setCv((x) => ({ ...x, experience: x.experience.filter((e, j) => j !== i) }));
  const saveCv = () => onSave({ cv_data: cv });
  const genCv = () => generateRtriibeCv({ ...d, cv_data: cv });
  const [cvBusy, setCvBusy] = useState(false);
  const uploadOriginal = async (file) => {
    if (!file || !hasSupabase) return;
    setCvBusy(true);
    try {
      const path = d.id + "/" + Date.now() + "-" + file.name;
      const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("cvs").getPublicUrl(path);
      onSave({ cv_url: pub.publicUrl });
      setD((x) => ({ ...x, cv_url: pub.publicUrl }));
      alert("Original file stored. Download CV will now work.");
    } catch (e) { alert("Upload failed: " + (e.message || e) + "\n\nMake sure a public bucket named 'cvs' exists in Supabase Storage."); }
    setCvBusy(false);
  };
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
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">rTriibe CV</h2><span className="x-pmeta">Generate a formatted CV in the house design — free</span></div>
        <div className="x-docreq"><button className="x-primary" onClick={genCv}><FileText size={15} /> Generate rTriibe CV</button><button className="x-ghost" onClick={() => setCvOpen((o) => !o)}><Pencil size={14} /> {cvOpen ? "Hide editor" : "Edit CV content"}</button></div>
        {cvOpen && <div className="x-cvedit">
          <div className="x-formfield"><span className="x-formlabel">Title (defaults to specialization)</span><input className="x-input" value={cv.title || ""} onChange={(e) => setCvK("title", e.target.value)} /></div>
          <div className="x-formfield full"><span className="x-formlabel">Professional profile (paragraph)</span><textarea className="x-input" rows={4} value={cv.profile || ""} onChange={(e) => setCvK("profile", e.target.value)} /></div>
          <div className="x-formfield"><span className="x-formlabel">Expertise (one per line)</span><textarea className="x-input" rows={4} value={cv.expertise || ""} onChange={(e) => setCvK("expertise", e.target.value)} /></div>
          <div className="x-formfield"><span className="x-formlabel">Professional development (one per line)</span><textarea className="x-input" rows={4} value={cv.development || ""} onChange={(e) => setCvK("development", e.target.value)} /></div>
          <div className="x-formfield full"><span className="x-formlabel">Education (blank line between entries; first line is the title)</span><textarea className="x-input" rows={5} value={cv.education || ""} onChange={(e) => setCvK("education", e.target.value)} /></div>
          <div className="x-formfield full"><span className="x-formlabel">Teaching experience</span>
            {(cv.experience || []).map((e, i) => <div key={i} className="x-expedit">
              <div className="x-exprow"><input className="x-input" placeholder="Role" value={e.role || ""} onChange={(ev) => setExp(i, "role", ev.target.value)} /><input className="x-input" placeholder="School / employer" value={e.org || ""} onChange={(ev) => setExp(i, "org", ev.target.value)} /><input className="x-input" placeholder="Dates" value={e.dates || ""} onChange={(ev) => setExp(i, "dates", ev.target.value)} /><button className="x-ic" onClick={() => delExp(i)}><Trash2 size={13} /></button></div>
              <textarea className="x-input" rows={3} placeholder="Bullet points, one per line" value={e.bullets || ""} onChange={(ev) => setExp(i, "bullets", ev.target.value)} />
            </div>)}
            <button className="x-ghost" onClick={addExp}><Plus size={14} /> Add experience entry</button>
          </div>
          <button className="x-primary" onClick={saveCv}><Check size={15} /> Save CV content</button>
        </div>}
      </div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Compliance documents</h2><span className="x-pmeta">{gotDocs.length} of {DOC_TYPES.length} received</span></div>
        <div className="x-docreq"><button className="x-primary" onClick={requestDocs}><Mail size={15} /> Request documents</button><button className="x-ghost" onClick={copyLink}><StickyNote size={14} /> Copy upload link</button><button className="x-ghost" onClick={onRefreshDocs}>Refresh</button></div>
        <div className="x-doclist">{DOC_TYPES.map((type) => { const items = gotDocs.filter((x) => x.doc_type === type); return (
          <div key={type} className="x-docrow"><div className="x-docname">{items.length ? <CheckCircle2 size={15} color={C.green} /> : <ShieldAlert size={15} color={C.faint} />} {type}{items.length > 1 ? " (" + items.length + ")" : ""}</div>{items.length ? <div style={{ display: "flex", flexWrap: "wrap", gap: 6, justifyContent: "flex-end" }}>{items.map((r) => <button key={r.id} className="x-ghost sm" onClick={() => window.open(r.file_url, "_blank")}><Download size={13} /> {r.file_name}</button>)}</div> : <span className="x-docmiss">Missing</span>}</div>
        ); })}</div>
      </div>
      <div className="x-profactions"><button className="x-ghost" onClick={() => d.cv_url ? window.open(d.cv_url, "_blank") : alert("No file stored for this candidate yet. Use 'Upload original file' to store one.")}><Download size={15} /> Download CV</button><label className="x-ghost" style={{ cursor: "pointer" }} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.preventDefault(); const f = e.dataTransfer.files[0]; if (f) uploadOriginal(f); }}><UploadCloud size={15} /> {cvBusy ? "Uploading…" : "Upload / drop original file"}<input type="file" accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={cvBusy} onChange={(e) => { const f = e.target.files[0]; if (f) uploadOriginal(f); e.target.value = ""; }} /></label><button className="x-ghost" onClick={() => { const n = waNumber(d.phone); if (!n) { alert("No phone number saved for this candidate."); return; } window.open("https://wa.me/" + n, "_blank"); }}><MessageCircle size={15} /> WhatsApp</button><button className="x-ghost"><Briefcase size={15} /> Match to vacancy</button><button className="x-ghost" style={{ marginLeft: "auto", color: C.red }} onClick={onDelete}><Trash2 size={15} /> Delete candidate</button></div>
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
function LsaDirectory({ lsas, onSelect, onAdd, onDel }) {
  const [modal, setModal] = useState(false);
  const [q, setQ] = useState("");
  const [fStatus, setFStatus] = useState("All");
  const [fCert, setFCert] = useState("All");
  const list = lsas.filter((l) => {
    if (!((l.name || "") + (l.cert || "") + (l.langs || "") + (l.location || "")).toLowerCase().includes(q.toLowerCase())) return false;
    if (fStatus !== "All" && (l.status || "") !== fStatus) return false;
    if (fCert !== "All" && !(l.cert || "").toLowerCase().includes(fCert.toLowerCase())) return false;
    return true;
  });
  const save = (d) => { onAdd({ ...d, calc: DEFAULT_CALC, notes: [], payments: [] }); setModal(false); };
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">LSA directory</h1><p className="x-sub">Click any LSA to view and edit their profile, notes and payments.</p></div>
        <div style={{ display: "flex", gap: 8 }}><button className="x-ghost" onClick={() => downloadCsv("lsas.csv", LSA_CSV, lsas)}><Download size={14} /> Download Excel</button><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New LSA</button></div>
      </div>
      <div className="x-filterbar">
        <div className="x-searchwrap" style={{ maxWidth: 300 }}><Search size={15} color={C.muted} /><input className="x-search" placeholder="Search LSAs…" value={q} onChange={(e) => setQ(e.target.value)} />{q && <button className="x-searchclear" onClick={() => setQ("")}><X size={13} /></button>}</div>
        <select className="x-input x-filtersel" value={fStatus} onChange={(e) => setFStatus(e.target.value)}>{["All", "Available", "Matching", "Placed", "Needs review"].map((o) => <option key={o}>{o}</option>)}</select>
        <select className="x-input x-filtersel" value={fCert} onChange={(e) => setFCert(e.target.value)}>{["All", "ABAT", "SEN diploma", "Level 3"].map((o) => <option key={o}>{o}</option>)}</select>
        <span className="x-filtercount">{list.length} shown</span>
      </div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No LSAs yet. Add one, or use Add LSAs to extract from CVs.</div></div> : (
        <div className="x-cards">{list.map((l) => <div key={l.id} className="x-lcard" onClick={() => onSelect(l.id)}><div className="x-lctop"><span className="x-lname">{l.name}</span><span style={{ display: "flex", alignItems: "center", gap: 8 }}><Pill s={l.status} /><span className="x-ic" onClick={(e) => { e.stopPropagation(); if (confirm("Delete " + (l.name || "this LSA") + "?")) onDel(l.id); }}><Trash2 size={13} /></span></span></div><div className="x-lrow"><Heart size={13} color={C.red} /> {l.cert || "—"}</div><div className="x-lrow"><Users size={13} color={C.muted} /> {l.langs || "—"}</div><div className="x-lrow"><MapPin size={13} color={C.muted} /> {l.location || "—"}</div><div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(l.salary || suggestLsaSalary(l.cert, l.exp))}<span className="x-lper">/mo salary</span></span><ChevronRight size={15} color={C.faint} /></div></div>)}</div>
      )}
      {modal && <FormModal title="New LSA" fields={LSA_FIELDS} initial={{ status: "Available", placement_fee: 1000 }} onClose={() => setModal(false)} onSave={save} />}
    </div>
  );
}
function LsaProfile({ lsa, onBack, onSave, onDelete }) {
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
      <div className="x-profhead"><div><h1 className="x-h1">{d.name}</h1><div className="x-sub">{d.cert} · {d.location}</div></div><div style={{ display: "flex", gap: 8 }}>{d.cv_url && <button className="x-ghost" onClick={() => window.open(d.cv_url, "_blank")}><Download size={14} /> CV</button>}{edit ? <button className="x-primary" onClick={saveProfile}><Check size={15} /> Save changes</button> : <button className="x-ghost" onClick={() => setEdit(true)}><Pencil size={14} /> Edit profile</button>}<button className="x-ghost" style={{ color: C.red }} onClick={onDelete}><Trash2 size={14} /></button></div></div>
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
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Monthly salary</h2><span className="x-pmeta">Suggested from certificate & experience</span></div>
            <div className="x-calcbig"><div><div className="x-calclabel">Suggested</div><div className="x-calcv nums">AED {fmt(suggestLsaSalary(d.cert, d.exp))}</div></div><div className="x-calceq">→</div><div><div className="x-calclabel">Agreed salary</div><input className="x-feeinput nums" type="number" value={d.salary ?? suggestLsaSalary(d.cert, d.exp)} onChange={(e) => set("salary", e.target.value)} /></div></div>
            <button className="x-primary" style={{ marginTop: 12 }} onClick={() => onSave({ salary: Number(d.salary ?? suggestLsaSalary(d.cert, d.exp)) })}><Check size={15} /> Save salary</button>
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
function Bookings({ rows, lsas, people, onAdd, onDel }) {
  const [modal, setModal] = useState(false); const [openC, setOpenC] = useState(null);
  const lsaNames = (lsas || []).map((l) => l.name).filter(Boolean);
  const fields = [{ key: "lsa_name", label: "LSA", type: "person" }, { key: "family", label: "Family" }, { key: "location", label: "Location" }, { key: "rate", label: "Rate / month", type: "number" }, { key: "fee", label: "Placement fee", type: "number" }, { key: "status", label: "Status", type: "select", opts: ["Active", "Ended"] }];
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Bookings</h1><p className="x-sub">Active family placements. Click a card for details.</p></div><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New booking</button></div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No bookings yet. Press New booking.</div></div> : (
        <div className="x-cards">{rows.map((b) => <button key={b.id} className="x-lcard" onClick={() => setOpenC(b)}><div className="x-lctop"><span className="x-lname">{b.lsa_name}</span><Pill s={b.status} /></div><div className="x-lrow"><Users size={13} color={C.muted} /> {b.family || "—"}</div><div className="x-lrow"><MapPin size={13} color={C.muted} /> {b.location || "—"}</div><div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(Number(b.rate || 0) + Number(b.fee || 0))}<span className="x-lper">/mo</span></span><ChevronRight size={15} color={C.faint} /></div></button>)}</div>
      )}
      {modal && <FormModal title="New booking" fields={fields} people={people} initial={{ status: "Active" }} onClose={() => setModal(false)} onSave={(d) => { onAdd(d); setModal(false); }} />}
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
function Vacancies({ rows, onOpen, onAdd, onUpdate, onDel, onImport }) {
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
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th style={{ width: 22 }}></th><th>Role</th><th>School</th><th>Contact</th><th>Status</th><th className="r">Days</th><th className="r">Shortlist</th><th></th></tr></thead>
          <tbody>{shown.map((v) => { const d = daysSince(v.created_at); const sc = STATUS_COLOR[v.status || "Open"]; const err = !(v.role || "").trim() ? "Missing role" : !(v.school || "").trim() ? "Missing school" : ""; return (
            <tr key={v.id} className={err ? "x-rowerr" : ""}>
              <td>{err && <span title={err}><AlertTriangle size={15} color={C.red} /></span>}</td>
              <td><input className="x-cellinput b" defaultValue={v.role || ""} onBlur={(e) => onUpdate(v.id, { role: e.target.value })} /></td>
              <td><input className="x-cellinput" defaultValue={v.school || ""} onBlur={(e) => onUpdate(v.id, { school: e.target.value })} /></td>
              <td><input className="x-cellinput" defaultValue={v.contact || ""} onBlur={(e) => onUpdate(v.id, { contact: e.target.value })} /></td>
              <td><select className="x-cellsel" value={v.status || "Open"} onChange={(e) => onUpdate(v.id, { status: e.target.value })} style={{ color: sc, fontWeight: 700 }}>{VAC_STATUSES.map((s) => <option key={s}>{s}</option>)}</select></td>
              <td className="r nums" style={{ color: tone(d), fontWeight: 600 }}>{d}d</td>
              <td className="r"><input className="x-cellinput nums" style={{ textAlign: "right", width: 46 }} defaultValue={v.shortlist || 0} onBlur={(e) => onUpdate(v.id, { shortlist: Number(e.target.value) || 0 })} /></td>
              <td className="rowact"><button className="x-ghost" style={{ padding: "5px 9px" }} onClick={() => onOpen(v.id)}>Candidates <ChevronRight size={13} /></button><button className="x-ic" onClick={() => onDel(v.id)}><Trash2 size={13} /></button></td>
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
  { key: "school", label: "School" }, { key: "grp", label: "Group" }, { key: "role", label: "Role" }, { key: "candidate_name", label: "Candidate", type: "person", refKey: "candidate_ref", idKey: "candidate_id" },
  { key: "type", label: "Type", type: "select", opts: ["Permanent", "Supply"] }, { key: "stage", label: "Stage", type: "select", opts: PIPE_STAGES },
  { key: "interview_date", label: "Interview date", type: "date" }, { key: "start_date", label: "Start date", type: "date" },
  { key: "interview_rating", label: "Interview rating" }, { key: "outcome", label: "Outcome (if closed)" },
  { key: "next_action", label: "Next action" }, { key: "next_action_date", label: "Next action date", type: "date" },
  { key: "follow_ups", label: "Follow-ups (count)", type: "number" }, { key: "priority", label: "Priority", type: "checkbox" },
  { key: "notes", label: "Notes", type: "textarea", full: true },
];
const SUB_STAGES = ["Submitted", "Shortlisted", "Interview", "Offer", "Rejected", "Placed"];
function VacancyDetail({ vacancy, candidates, subs, onBack, onAddSub, onUpdateSub, onDelSub }) {
  const [pick, setPick] = useState("");
  if (!vacancy) return null;
  const already = new Set(subs.map((s) => s.candidate_id));
  const matches = pick.trim() ? candidates.filter((c) => !already.has(c.id) && ((c.name || "") + (c.ref || "") + (c.spec || "")).toLowerCase().includes(pick.toLowerCase())).slice(0, 6) : [];
  const add = (c) => { onAddSub(vacancy, c); setPick(""); };
  const count = (st) => subs.filter((s) => s.stage === st).length;
  return (
    <div className="x-page">
      <button className="x-back" onClick={onBack}><ArrowLeft size={15} /> Back to vacancies</button>
      <div className="x-profhead"><div><h1 className="x-h1">{vacancy.role || "Vacancy"}</h1><div className="x-sub">{vacancy.school || "—"}{vacancy.contact ? " · " + vacancy.contact : ""} · <Pill s={vacancy.status || "Open"} /></div></div></div>
      <div className="x-stats" style={{ gridTemplateColumns: "repeat(6,1fr)" }}>
        {SUB_STAGES.map((st) => <div key={st} className="x-stat"><span className="x-statbar" style={{ background: STATUS_COLOR[st] }} /><div className="x-statv">{count(st)}</div><div className="x-statl">{st}</div></div>)}
      </div>
      <div className="x-panel">
        <div className="x-panelhead"><h2 className="x-h2">Add a candidate to this vacancy</h2><span className="x-pmeta">Auto-syncs to the pipeline</span></div>
        <div className="x-searchwrap" style={{ maxWidth: 420 }}><Search size={15} color={C.muted} /><input className="x-search" placeholder="Search your database to attach a candidate…" value={pick} onChange={(e) => setPick(e.target.value)} />{pick && <button className="x-searchclear" onClick={() => setPick("")}><X size={13} /></button>}</div>
        {matches.length > 0 && <div className="x-picklist">{matches.map((c) => <button key={c.id} className="x-bellitem" onClick={() => add(c)}><span className="x-searchrow"><span className="x-ref">{c.ref || "—"}</span><span className="x-bellt">{c.name}</span></span><span className="x-bellm">{c.spec || ""}</span></button>)}</div>}
      </div>
      <div className="x-tablewrap">
        <table className="x-table"><thead><tr><th>Ref</th><th>Candidate</th><th>Stage</th><th>Notes</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {subs.length === 0 && <tr><td colSpan={6} className="x-empty">No candidates attached yet. Search above to add the ones you submitted.</td></tr>}
            {subs.map((s) => <tr key={s.id}>
              <td><span className="x-ref">{s.candidate_ref || "—"}</span></td>
              <td className="b">{s.candidate_name}</td>
              <td><select className="x-cellsel" value={s.stage || "Submitted"} onChange={(e) => onUpdateSub(s, { stage: e.target.value })} style={{ color: STATUS_COLOR[s.stage || "Submitted"] }}>{SUB_STAGES.map((x) => <option key={x}>{x}</option>)}</select></td>
              <td><input className="x-cellinput" defaultValue={s.notes || ""} onBlur={(e) => onUpdateSub(s, { notes: e.target.value })} /></td>
              <td className="nums">{s.date}</td>
              <td className="rowact"><button className="x-ic" onClick={() => onDelSub(s)}><Trash2 size={13} /></button></td>
            </tr>)}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function PipelineView({ rows, vacancies, people, onAdd, onUpdate, onDel, onImport }) {
  const [modal, setModal] = useState(false); const [filter, setFilter] = useState("All");
  const shown = rows.filter((r) => filter === "All" || (r.stage || "Sourcing") === filter);
  const vIds = new Set((vacancies || []).map((v) => v.id));
  const pErr = (p) => !(p.candidate_name || "").trim() ? "Missing candidate" : !(p.stage || "").trim() ? "Missing stage" : (p.from_vacancy && p.vacancy_id && !vIds.has(p.vacancy_id) ? "Linked vacancy removed" : "");
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Pipeline</h1><p className="x-sub">Every deal. Change stage right in the row. Deals from vacancies stay in sync.</p></div>
        <div style={{ display: "flex", gap: 8 }}>
          <input id="pipe-import" type="file" accept=".csv,text/csv" style={{ display: "none" }} onChange={(e) => { const f = e.target.files[0]; if (f) importCsv(f, PIPE_MAP, onImport); e.target.value = ""; }} />
          <button className="x-ghost" onClick={() => document.getElementById("pipe-import").click()}><UploadCloud size={14} /> Import CSV</button>
          <button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New deal</button>
        </div>
      </div>
      <div className="x-filters" style={{ marginBottom: 16 }}>{["All", ...PIPE_STAGES].map((s) => <button key={s} className={"x-chip" + (filter === s ? " on" : "")} onClick={() => setFilter(s)}>{s}</button>)}</div>
      {shown.length === 0 ? <div className="x-panel"><div className="x-empty">Pipeline is empty. Press New deal, or import your CSV.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th style={{ width: 22 }}></th><th>School</th><th>Candidate</th><th>Role</th><th>Stage</th><th>Next action</th><th className="r">Follow-ups</th><th></th></tr></thead>
          <tbody>{shown.map((p) => { const err = pErr(p); return (<tr key={p.id} className={err ? "x-rowerr" : ""}>
            <td>{err && <span title={err}><AlertTriangle size={15} color={C.red} /></span>}</td>
            <td className="b">{p.priority && <Star size={12} color={C.amber} fill={C.amber} style={{ verticalAlign: -1, marginRight: 4 }} />}{p.school || "—"}</td>
            <td>{p.candidate_name}</td><td>{p.role || "—"}</td>
            <td><select className="x-cellsel" value={p.stage || "Sourcing"} onChange={(e) => onUpdate(p, { stage: e.target.value })} style={{ color: STATUS_COLOR[p.stage || "Sourcing"] }}>{PIPE_STAGES.map((s) => <option key={s}>{s}</option>)}</select></td>
            <td className="mut">{p.next_action || "—"}{p.next_action_date ? " · " + p.next_action_date : ""}</td>
            <td className="r nums">{p.follow_ups || 0}</td>
            <td className="rowact"><button className="x-ic" onClick={() => onDel(p.id)}><Trash2 size={13} /></button></td>
          </tr>); })}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New deal" fields={PIPE_FIELDS} people={people} initial={{ type: "Permanent", stage: "Sourcing", follow_ups: 0 }} onClose={() => setModal(false)} onSave={(d) => { onAdd(d); setModal(false); }} />}
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

/* ============================ COVERS ============================ */
const COVER_BASE = [
  { key: "school", label: "School" }, { key: "start_date", label: "Start date", type: "date" }, { key: "end_date", label: "End date", type: "date" },
  { key: "day_rate", label: "Weekday rate (AED)", type: "number" }, { key: "friday_rate", label: "Friday rate (AED)", type: "number" },
  { key: "status", label: "Status", type: "select", opts: ["Active", "Ended"] },
];
function Covers({ rows, people, onAdd, onUpdate, onDel }) {
  const [modal, setModal] = useState(false);
  const [openC, setOpenC] = useState(null);
  const [day, setDay] = useState({ date: "", type: "Weekday" });
  const fields = [{ key: "teacher_name", label: "Teacher", type: "person" }, ...COVER_BASE];
  const payOf = (c) => (Array.isArray(c.days) ? c.days : []).reduce((p, d) => p + (d.type === "Friday" ? Number(c.friday_rate || 0) : Number(c.day_rate || 0)), 0);
  const cover = openC ? rows.find((r) => r.id === openC.id) : null;
  const days = cover && Array.isArray(cover.days) ? cover.days : [];
  const addDay = () => { if (!cover || !day.date) return; onUpdate(cover.id, { days: [...days, { id: Date.now(), date: day.date, type: day.type }] }); setDay({ date: "", type: "Weekday" }); };
  const delDay = (id) => onUpdate(cover.id, { days: days.filter((d) => d.id !== id) });
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Covers</h1><p className="x-sub">Teacher supply / cover bookings with attendance and pay.</p></div><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New cover</button></div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No covers yet. Press New cover.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Teacher</th><th>School</th><th>Dates</th><th className="r">Days</th><th className="r">Pay</th><th>Status</th><th></th></tr></thead>
          <tbody>{rows.map((c) => <tr key={c.id}>
            <td className="b">{c.teacher_name}</td><td>{c.school || "—"}</td>
            <td className="mut nums">{(c.start_date || "?") + " → " + (c.end_date || "?")}</td>
            <td className="r nums">{(Array.isArray(c.days) ? c.days : []).length}</td>
            <td className="r nums">AED {fmt(payOf(c))}</td>
            <td><Pill s={c.status} /></td>
            <td className="rowact"><button className="x-ghost" style={{ padding: "5px 9px" }} onClick={() => setOpenC(c)}><Calendar size={13} /> Attendance</button><button className="x-ic" onClick={() => onDel(c.id)}><Trash2 size={13} /></button></td>
          </tr>)}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New cover" fields={fields} people={people} initial={{ status: "Active" }} onClose={() => setModal(false)} onSave={(d) => { onAdd({ ...d, days: [] }); setModal(false); }} />}
      {cover && <><div className="x-scrim" onClick={() => setOpenC(null)} /><div className="x-modal lg">
        <div className="x-modalhead"><h2 className="x-h2">{cover.teacher_name} · {cover.school}</h2><button className="x-ic" onClick={() => setOpenC(null)}><X size={16} /></button></div>
        <div className="x-calcbig"><div><div className="x-calclabel">Days worked</div><div className="x-calcv nums">{days.length}</div></div><div className="x-calceq">=</div><div><div className="x-calclabel">Total pay</div><div className="x-calcv nums red">AED {fmt(payOf(cover))}</div></div></div>
        <div className="x-payadd"><input className="x-input" type="date" value={day.date} onChange={(e) => setDay({ ...day, date: e.target.value })} /><select className="x-input" value={day.type} onChange={(e) => setDay({ ...day, type: e.target.value })}><option>Weekday</option><option>Friday</option></select><button className="x-primary sm" onClick={addDay}><Plus size={14} /></button></div>
        {days.length === 0 && <div className="x-empty">No days logged.</div>}
        {days.map((d) => <div key={d.id} className="x-payrow"><div><div className="x-notet nums">{d.date}</div><div className="x-paymeta">{d.type} · AED {fmt(d.type === "Friday" ? cover.friday_rate : cover.day_rate)}</div></div><button className="x-ic" onClick={() => delDay(d.id)}><Trash2 size={13} /></button></div>)}
      </div></>}
    </div>
  );
}

/* ============================ FINANCE ============================ */
function generateRtriibeCv(c) {
  const cvd = c.cv_data || {};
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  const lines = (s) => String(s || "").split(/\r?\n/).map((x) => x.replace(/^[•▪\-\u2022]\s*/, "").trim()).filter(Boolean);
  const first = String(c.name || "").trim().split(/\s+/)[0] || "Candidate";
  const title = cvd.title || c.spec || "Teacher";
  const loc = c.location || "";
  const profile = cvd.profile || "";
  const expertise = lines(cvd.expertise);
  const development = lines(cvd.development);
  const eduSrc = cvd.education || c.verbatim_qualifications || "";
  const eduBlocks = String(eduSrc).split(/\n\s*\n/).map((b) => b.trim()).filter(Boolean);
  const education = (eduBlocks.length > 1 ? eduBlocks : lines(eduSrc).map((l) => l)).map((b) => { const ls = lines(b); return { t: ls[0] || b, s: ls.slice(1).join(" · ") }; });
  let experience = (Array.isArray(cvd.experience) && cvd.experience.length) ? cvd.experience.map((e) => ({ role: e.role || "", org: e.org || "", dates: e.dates || "", bullets: lines(e.bullets) })) : [];
  if (!experience.length && c.verbatim_experience) experience = [{ role: "", org: "", dates: "", bullets: lines(c.verbatim_experience) }];
  const tags = [c.curriculum, c.spec, c.uae_years ? c.uae_years + " yrs UAE" : "", loc].filter(Boolean);

  const sec = (label, inner) => inner ? `<div class="sec"><div class="sech">${esc(label)}</div>${inner}</div>` : "";
  const eduHtml = education.length ? education.map((e) => `<div class="edu"><div class="edut">${esc(e.t)}</div>${e.s ? `<div class="edus">${esc(e.s)}</div>` : ""}</div>`).join("") : "";
  const devHtml = development.length ? `<ul class="ul">${development.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const expertiseHtml = expertise.length ? `<ul class="ul">${expertise.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "";
  const expHtml = experience.length ? experience.map((e) => `<div class="job">${(e.role || e.org || e.dates) ? `<div class="jobt">${esc(e.role)}</div><div class="jobm">${[esc(e.org), esc(e.dates)].filter(Boolean).join(" · ")}</div>` : ""}${e.bullets.length ? `<ul class="ul">${e.bullets.map((b) => `<li>${esc(b)}</li>`).join("")}</ul>` : ""}</div>`).join("") : "";

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(first)} — ${esc(title)}</title><style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{font-family:'Segoe UI',Arial,Helvetica,sans-serif;color:#222b3a;background:#e9edf2}
    .bar{display:flex;gap:10px;padding:14px;max-width:820px;margin:0 auto}
    .btn{padding:11px 20px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .btn.red{background:#DA2A34;color:#fff}.btn.grey{background:#dfe3ea;color:#1C2230}
    .sheet{width:820px;min-height:1160px;margin:0 auto 30px;background:#fff;position:relative;padding:0 0 52px}
    .head{padding:34px 44px 0}
    .brandrow{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:14px;border-bottom:3px solid #DA2A34}
    .brand{font-size:27px;font-weight:800;letter-spacing:-.5px;color:#1C2230}.brand span{color:#DA2A34}
    .tagl{font-size:9px;font-weight:700;letter-spacing:2.5px;color:#95a0b0}
    .name{font-size:34px;font-weight:800;letter-spacing:-.5px;line-height:1;margin-top:22px}
    .role{font-size:13px;font-weight:700;letter-spacing:3px;color:#2F6FAF;text-transform:uppercase;margin-top:8px}
    .loc{font-size:11px;color:#6b7482;margin-top:7px}
    .pills{display:flex;flex-wrap:wrap;gap:7px;margin-top:14px}
    .pills span{font-size:9.5px;font-weight:700;color:#2F6FAF;background:#eaf1fb;border-radius:20px;padding:4px 11px}
    .body{display:flex;margin-top:24px}
    .left{width:34%;background:#f4f7fb;padding:26px 22px}
    .right{width:66%;padding:26px 30px 0 28px}
    .sec{margin-bottom:22px}
    .sech{font-size:11px;font-weight:800;letter-spacing:1.5px;color:#1C2230;text-transform:uppercase;margin-bottom:12px;padding-bottom:7px;position:relative}
    .sech:after{content:"";position:absolute;left:0;bottom:0;width:34px;height:2.5px;background:#DA2A34}
    .prof{font-size:11.5px;line-height:1.7;color:#3a4353}
    .edu{margin-bottom:13px}
    .edut{font-size:11px;font-weight:700;line-height:1.35;color:#1C2230}
    .edus{font-size:10px;color:#6b7482;margin-top:2px;line-height:1.4}
    .ul{list-style:none}
    .ul li{font-size:10.5px;line-height:1.55;padding-left:14px;position:relative;margin-bottom:6px;color:#3a4353}
    .ul li:before{content:"";position:absolute;left:0;top:6px;width:5px;height:5px;border-radius:1px;background:#DA2A34}
    .job{margin-bottom:16px;page-break-inside:avoid}
    .jobt{font-size:12.5px;font-weight:700;color:#1C2230}
    .jobm{font-size:10.5px;color:#2F6FAF;font-weight:600;margin:2px 0 7px}
    .foot{position:absolute;left:0;right:0;bottom:0;padding:12px 44px;border-top:1px solid #eceef2;text-align:center;font-size:8.5px;color:#95a0b0;letter-spacing:.4px}
    @media print{.bar{display:none}body{background:#fff}.sheet{margin:0;width:auto;min-height:auto;box-shadow:none}@page{size:A4;margin:0}}
  </style></head><body>
    <div class="bar"><button class="btn red" onclick="window.print()">Download / Print PDF</button><button class="btn grey" onclick="window.close()">&larr; Close</button></div>
    <div class="sheet">
      <div class="head">
        <div class="brandrow"><div class="brand"><span>r</span>Triibe</div><div class="tagl">EDUCATION RECRUITMENT &nbsp;|&nbsp; UK &amp; UAE</div></div>
        <div class="name">${esc(first)}</div>
        <div class="role">${esc(title)}</div>
        ${loc ? `<div class="loc">Based in ${esc(loc)}</div>` : ""}
        ${tags.length ? `<div class="pills">${tags.map((t) => `<span>${esc(t)}</span>`).join("")}</div>` : ""}
      </div>
      <div class="body">
        <div class="left">
          ${sec("Expertise", expertiseHtml)}
          ${sec("Education", eduHtml)}
          ${sec("Professional development", devHtml)}
        </div>
        <div class="right">
          ${profile ? sec("Professional profile", `<div class="prof">${esc(profile)}</div>`) : ""}
          ${sec("Professional experience", expHtml)}
          ${sec("References", `<div class="prof">Available on request via rTriibe.</div>`)}
        </div>
      </div>
      <div class="foot">rTriibe FZCO &nbsp;|&nbsp; TRN 100452871500003 &nbsp;·&nbsp; Candidate presented by rTriibe — contact details withheld</div>
    </div>
  </body></html>`;
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups so the CV can open, then try again."); return; }
  w.document.write(html); w.document.close();
}

function openInvoice(inv) {
  const fee = Number(inv.amount ?? inv.fee ?? 0);
  const vat = Math.round(fee * 0.05 * 100) / 100;
  const total = fee + vat;
  const client = inv.client || inv.school || "Client";
  const desc = inv.description || inv.role || "Placement";
  const contact = inv.candidate_name || inv.contact || "";
  const num = "INV-" + String(Date.now()).slice(-6);
  const date = new Date().toLocaleDateString("en-GB");
  const money = (n) => "AED " + new Intl.NumberFormat("en-AE", { minimumFractionDigits: 2 }).format(n);
  const esc = (s) => String(s || "").replace(/</g, "");
  const w = window.open("", "_blank");
  if (!w) { alert("Please allow pop-ups so the invoice can open, then try again."); return; }
  w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${num}</title><style>
    *{box-sizing:border-box;font-family:Arial,Helvetica,sans-serif}
    body{margin:0;padding:44px;color:#1C2230}
    .bar{display:flex;gap:10px;margin:0 0 22px}
    .top{display:flex;justify-content:space-between;align-items:flex-start;border-bottom:3px solid #DA2A34;padding-bottom:20px}
    .brand{font-size:30px;font-weight:800}.brand span{color:#DA2A34}
    .brand small{display:block;font-size:11px;font-weight:600;color:#7A8494;letter-spacing:2px;margin-top:3px}
    h1{font-size:26px;color:#DA2A34;margin:0 0 6px}
    .meta{font-size:12px;color:#555;text-align:right;line-height:1.7}
    .parties{display:flex;justify-content:space-between;margin:30px 0}
    .parties div{font-size:13px;line-height:1.7}
    .lbl{font-size:11px;text-transform:uppercase;letter-spacing:1px;color:#7A8494;margin-bottom:5px}
    table{width:100%;border-collapse:collapse;margin-top:12px}
    th{background:#1C2230;color:#fff;text-align:left;padding:12px;font-size:12px}
    th.r,td.r{text-align:right}
    td{padding:12px;border-bottom:1px solid #eee;font-size:13px}
    .totals{margin-top:20px;margin-left:auto;width:300px;font-size:13px}
    .totals div{display:flex;justify-content:space-between;padding:8px 0}
    .totals .grand{border-top:2px solid #1C2230;font-weight:800;font-size:17px;color:#DA2A34;margin-top:4px;padding-top:10px}
    .foot{margin-top:44px;font-size:12px;color:#555;border-top:1px solid #eee;padding-top:18px;line-height:1.8}
    .btn{padding:11px 20px;border:none;border-radius:8px;font-size:14px;font-weight:700;cursor:pointer}
    .btn.red{background:#DA2A34;color:#fff}.btn.grey{background:#EEF0F4;color:#1C2230}
    @media print{.bar{display:none}}
  </style></head><body>
    <div class="bar"><button class="btn red" onclick="window.print()">Download / Print PDF</button><button class="btn grey" onclick="window.close()">&larr; Close</button></div>
    <div class="top"><div class="brand"><span>r</span>Triibe<small>FZCO &middot; EDUCATION RECRUITMENT</small></div>
    <div><h1>INVOICE</h1><div class="meta">Invoice no: <b>${num}</b><br>Date: ${date}<br>TRN: 100452871500003</div></div></div>
    <div class="parties"><div><div class="lbl">From</div><b>rTriibe FZCO</b><br>Dubai, United Arab Emirates<br>TRN 100452871500003</div>
    <div style="text-align:right"><div class="lbl">Bill to</div><b>${esc(client)}</b><br>${esc(contact)}</div></div>
    <table><thead><tr><th>Description</th><th class="r">Amount</th></tr></thead>
    <tbody><tr><td>${esc(desc)}</td><td class="r">${money(fee)}</td></tr></tbody></table>
    <div class="totals"><div><span>Subtotal</span><span>${money(fee)}</span></div><div><span>VAT (5%)</span><span>${money(vat)}</span></div><div class="grand"><span>Total due</span><span>${money(total)}</span></div></div>
    <div class="foot">Payment terms: 30 days from invoice date. Please quote the invoice number as your payment reference.<br>Bank details: [add your rTriibe FZCO bank account here].<br>Thank you for working with rTriibe.</div>
  </body></html>`);
  w.document.close();
}
const INV_FIELDS = [
  { key: "kind", label: "Type", type: "select", opts: ["Teacher", "LSA"] },
  { key: "candidate_name", label: "Candidate", type: "person", idKey: "candidate_id" },
  { key: "client", label: "Bill to (school / family)" },
  { key: "description", label: "Description" },
  { key: "amount", label: "Amount (AED)", type: "number" },
];
function Finance({ invoices, people, onCreate, onUpdate, onDel }) {
  const [modal, setModal] = useState(false);
  const rows = invoices || [];
  const amt = (i) => Number(i.amount || 0);
  const vatOf = (i) => Math.round(amt(i) * 0.05 * 100) / 100;
  const totOf = (i) => amt(i) + vatOf(i);
  const totalFees = rows.reduce((s, i) => s + amt(i), 0);
  const totalVat = rows.reduce((s, i) => s + vatOf(i), 0);
  const outstanding = rows.filter((i) => !i.paid).reduce((s, i) => s + totOf(i), 0);
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Finance</h1><p className="x-sub">Invoices for teacher and LSA placements. Creating one marks the candidate Placed and syncs the pipeline.</p></div><button className="x-primary" onClick={() => setModal(true)}><Plus size={15} /> New invoice</button></div>
      <div className="x-stats">
        <div className="x-stat"><span className="x-statbar" style={{ background: C.blue }} /><div className="x-statv nums">AED {fmt(Math.round(totalFees))}</div><div className="x-statl">Total fees</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.amber }} /><div className="x-statv nums">AED {fmt(Math.round(totalVat))}</div><div className="x-statl">VAT (5%)</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.green }} /><div className="x-statv nums">AED {fmt(Math.round(totalFees + totalVat))}</div><div className="x-statl">Grand total</div></div>
        <div className="x-stat"><span className="x-statbar" style={{ background: C.red }} /><div className="x-statv nums">AED {fmt(Math.round(outstanding))}</div><div className="x-statl">Outstanding</div></div>
      </div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No invoices yet. Press New invoice.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>Bill to</th><th>Candidate</th><th>Description</th><th className="r">Amount</th><th className="r">VAT 5%</th><th className="r">Total</th><th>Paid</th><th></th></tr></thead>
          <tbody>{rows.map((i) => { const pc = i.paid ? C.green : C.red; return (<tr key={i.id}>
            <td className="b">{i.client || "—"}<span className="x-kindtag">{i.kind || "Teacher"}</span></td>
            <td>{i.candidate_name || "—"}</td><td className="mut">{i.description || "—"}</td>
            <td className="r nums">{fmt(amt(i))}</td><td className="r nums">{fmt(vatOf(i))}</td><td className="r nums b">{fmt(totOf(i))}</td>
            <td><button className="x-pill" style={{ cursor: "pointer", color: pc, background: pc + "16", borderColor: pc + "30" }} onClick={() => onUpdate(i.id, { paid: !i.paid, status: !i.paid ? "Paid" : "Unpaid" })}>{i.paid ? "Paid" : "Unpaid"}</button></td>
            <td className="rowact"><button className="x-ghost" style={{ padding: "5px 9px" }} onClick={() => openInvoice(i)}><Download size={13} /></button><button className="x-ic" onClick={() => { if (confirm("Delete this invoice?")) onDel(i.id); }}><Trash2 size={13} /></button></td>
          </tr>); })}</tbody>
        </table></div>
      )}
      {modal && <FormModal title="New invoice" fields={INV_FIELDS} people={people} initial={{ kind: "Teacher" }} onClose={() => setModal(false)} onSave={(d) => { onCreate(d); setModal(false); }} />}
    </div>
  );
}

/* ======================= ATTACH ORIGINAL FILES ======================= */
async function extractFileText(file) {
  const ext = (file.name.split(".").pop() || "").toLowerCase();
  try {
    if (ext === "pdf") {
      const pdfjs = await import("pdfjs-dist/build/pdf");
      pdfjs.GlobalWorkerOptions.workerSrc = "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
      const ab = await file.arrayBuffer();
      const pdf = await pdfjs.getDocument({ data: ab }).promise;
      let out = "";
      for (let p = 1; p <= pdf.numPages; p++) { const page = await pdf.getPage(p); const c = await page.getTextContent(); out += c.items.map((it) => it.str).join(" ") + "\n"; }
      return out;
    }
    if (ext === "docx") { const ab = await file.arrayBuffer(); const m = await import("mammoth/mammoth.browser"); const mammoth = m.default || m; const { value } = await mammoth.extractRawText({ arrayBuffer: ab }); return value || ""; }
  } catch { return ""; }
  return "";
}
const digits = (s) => String(s || "").replace(/\D/g, "");
const waNumber = (phone) => { let n = digits(phone); if (!n) return ""; if (n.startsWith("00")) n = n.slice(2); else if (n.startsWith("0")) n = "971" + n.slice(1); return n; };
function AttachFiles({ candidates, people, onDone }) {
  const [pending, setPending] = useState([]);
  const [done, setDone] = useState([]);
  const [dupes, setDupes] = useState([]);
  const [progress, setProgress] = useState({ i: 0, total: 0 });
  const [busy, setBusy] = useState(false);

  const norm = (s) => String(s || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\.[a-z0-9]+$/, "").replace(/[^a-z0-9]+/g, " ").replace(/\s+/g, " ").trim();
  const nameTokens = (name) => norm(name).split(" ").filter((t) => t.length >= 2);

  const matchByName = (fname) => {
    const f = " " + norm(fname) + " ";
    const byRef = candidates.filter((c) => c.ref && f.includes(" " + norm(c.ref) + " "));
    if (byRef.length === 1) return byRef[0];
    const byName = candidates.filter((c) => { const t = nameTokens(c.name); return t.length >= 2 && f.includes(" " + t[0] + " ") && f.includes(" " + t[t.length - 1] + " "); });
    if (byName.length === 1) return byName[0];
    return null;
  };

  const matchByContent = async (file) => {
    const text = await extractFileText(file);
    const hadText = !!text && text.replace(/\s/g, "").length > 30;
    if (!hadText) return { c: null, hadText: false };
    const low = text.toLowerCase();
    const emails = low.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/g) || [];
    const foundEmail = emails[0] || "";
    const firstLines = text.split(/\r?\n/).map((x) => x.trim()).filter(Boolean).slice(0, 6);
    const foundName = firstLines.find((l) => { const w = l.split(/\s+/); return w.length >= 2 && w.length <= 4 && /^[A-Za-z][A-Za-z.'-]+(\s+[A-Za-z][A-Za-z.'-]+){1,3}$/.test(l); }) || "";
    for (const em of emails) { const hit = candidates.find((c) => c.email && c.email.toLowerCase().trim() === em); if (hit) return { c: hit, how: "email", hadText: true }; }
    const dd = digits(text);
    if (dd.length >= 9) { const hit = candidates.find((c) => { const cd = digits(c.phone); return cd.length >= 9 && dd.includes(cd.slice(-9)); }); if (hit) return { c: hit, how: "phone", hadText: true }; }
    const flat = " " + norm(text) + " ";
    const byName = candidates.filter((c) => { const t = nameTokens(c.name); return t.length >= 2 && flat.includes(" " + t[0] + " ") && flat.includes(" " + t[t.length - 1] + " "); });
    if (byName.length === 1) return { c: byName[0], how: "name in file", hadText: true };
    return { c: null, hadText: true, foundName, foundEmail };
  };

  const store = async (candidate, file) => {
    const path = candidate.id + "/" + Date.now() + "-" + file.name;
    const { error: upErr } = await supabase.storage.from("cvs").upload(path, file, { upsert: true });
    if (upErr) throw upErr;
    const { data: pub } = supabase.storage.from("cvs").getPublicUrl(path);
    const { error: updErr } = await supabase.from("candidates").update({ cv_url: pub.publicUrl }).eq("id", candidate.id);
    if (updErr) throw updErr;
  };

  const onDrop = async (files) => {
    if (!files.length || !hasSupabase) return;
    const arr = Array.from(files);
    setBusy(true); setDone([]); setDupes([]); setPending([]); setProgress({ i: 0, total: arr.length });
    const doneL = []; const dupL = []; const pendL = [];
    const attachedIds = new Set(); const seenNames = new Set();
    for (let i = 0; i < arr.length; i++) {
      const file = arr[i];
      if (seenNames.has(file.name)) { dupL.push({ name: file.name, candidate: "", reason: "same file twice in this batch" }); }
      else {
        seenNames.add(file.name);
        let match = matchByName(file.name); let how = "filename"; let reason = ""; let found = null;
        if (!match) { const bc = await matchByContent(file); if (bc.c) { match = bc.c; how = bc.how; } else { reason = bc.hadText ? "text read, no matching record" : "no readable text (maybe scanned)"; found = (bc.foundName || bc.foundEmail) ? { name: bc.foundName, email: bc.foundEmail } : null; } }
        if (match) {
          if (match.cv_url || attachedIds.has(match.id)) { dupL.push({ name: file.name, candidate: match.name, reason: match.cv_url ? "candidate already has a CV" : "another file already matched this candidate" }); }
          else { try { await store(match, file); attachedIds.add(match.id); doneL.push({ name: file.name, candidate: match.name, how }); } catch (e) { pendL.push({ file, name: file.name, reason: "upload error — " + (e.message || e) }); } }
        } else pendL.push({ file, name: file.name, reason, found });
      }
      setProgress({ i: i + 1, total: arr.length });
      if (i % 8 === 0) { setDone([...doneL]); setDupes([...dupL]); setPending([...pendL]); await new Promise((r) => setTimeout(r, 0)); }
    }
    setDone(doneL); setDupes(dupL); setPending(pendL);
    setBusy(false); onDone();
  };

  const assign = async (item, candidateId) => {
    const candidate = candidates.find((c) => c.id === candidateId);
    if (!candidate) return;
    setBusy(true);
    try { await store(candidate, item.file); setDone((d) => [{ name: item.name, candidate: candidate.name, how: "manual" }, ...d]); setPending((p) => p.filter((x) => x !== item)); onDone(); }
    catch (e) { alert("Upload failed: " + (e.message || e) + "\n\nMake sure a public bucket named 'cvs' exists."); }
    setBusy(false);
  };

  const pct = progress.total ? Math.round(progress.i / progress.total * 100) : 0;
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Attach original CVs</h1><p className="x-sub">Drop your resume files. The app matches each to a candidate by filename, or by reading the email / phone / name inside the file — free, no AI. It skips anyone who already has a CV and flags duplicates.</p></div></div>
      <label className="x-drop">
        <UploadCloud size={26} color={C.muted} />
        <div className="x-dropt">{busy ? "Working — keep this tab open…" : "Drop resume files here or click to choose"}</div>
        <div className="x-dropm">Tip: for very large batches, do a few hundred at a time so your browser stays smooth</div>
        <input type="file" multiple accept=".pdf,.doc,.docx,.jpg,.jpeg,.png" style={{ display: "none" }} disabled={busy} onChange={(e) => { onDrop(e.target.files); e.target.value = ""; }} />
      </label>

      {(busy || progress.total > 0) && <div className="x-panel">
        <div className="x-progresstop"><span className="x-progresslbl">{busy ? "Processing " + progress.i + " of " + progress.total : "Done — " + progress.total + " files"}</span><span className="x-progresspct nums">{pct}%</span></div>
        <div className="x-progresswrap"><div className="x-progressbar" style={{ width: pct + "%" }} /></div>
        <div className="x-progressstats"><span><b className="nums">{done.length}</b> attached</span><span><b className="nums">{dupes.length}</b> duplicates</span><span><b className="nums">{pending.length}</b> to assign</span></div>
      </div>}

      {dupes.length > 0 && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Duplicates — skipped, nothing overwritten</h2><span className="x-pmeta">{dupes.length}</span></div>
        <div className="x-doclist">{dupes.slice(0, 100).map((r, i) => <div key={i} className="x-docrow"><div className="x-docname"><AlertTriangle size={15} color={C.amber} /> {r.name}</div><span className="mut">{r.candidate ? r.candidate + " · " : ""}{r.reason}</span></div>)}{dupes.length > 100 && <div className="x-empty">+ {dupes.length - 100} more</div>}</div>
      </div>}

      {pending.length > 0 && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Couldn't identify — assign manually</h2><span className="x-pmeta">{pending.length} left</span></div>
        {pending.slice(0, 80).map((item, i) => <div key={i} className="x-assignrow">
          <div className="x-assignname">{item.found && (item.found.name || item.found.email) ? <span>{item.found.name || item.found.email}<span className="mut" style={{ fontWeight: 400 }}> · from {item.name}{item.reason ? " · " + item.reason : ""}</span></span> : <span>{item.name}{item.reason ? <span className="mut" style={{ fontWeight: 400 }}> · {item.reason}</span> : ""}</span>}</div>
          <div className="x-assignpick"><PersonField value="" people={people} onPick={(p) => { if (p.id) assign(item, p.id); }} /></div>
        </div>)}
        {pending.length > 80 && <div className="x-empty">+ {pending.length - 80} more — assign these first, they clear as you go</div>}
      </div>}

      {done.length > 0 && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Attached</h2><span className="x-pmeta">{done.length} done</span></div>
        <div className="x-doclist">{done.slice(0, 100).map((r, i) => <div key={i} className="x-docrow"><div className="x-docname"><CheckCircle2 size={15} color={C.green} /> {r.name}</div><span className="mut">→ {r.candidate} · {r.how}</span></div>)}{done.length > 100 && <div className="x-empty">+ {done.length - 100} more</div>}</div>
      </div>}
    </div>
  );
}

/* ---------- shared ---------- */
function Pill({ s }) { const c = STATUS_COLOR[s] || C.muted; return <span className="x-pill" style={{ color: c, background: c + "16", borderColor: c + "30" }}>{s || "—"}</span>; }
function Row({ k, v }) { return <div className="x-detrow"><span className="x-detk">{k}</span><span className="x-detv">{v}</span></div>; }
function Field({ label, value, edit, onChange, area }) { return (<div className="x-field"><span className="x-fieldk">{label}</span>{edit ? (area ? <textarea className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} rows={2} /> : <input className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />) : <span className="x-fieldv">{value || "—"}</span>}</div>); }
function Select({ label, value, opts, onChange }) { return (<label className="x-sel"><span className="x-selk">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>); }
