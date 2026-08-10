import { useState, useEffect } from "react";
import {
  LayoutDashboard, UploadCloud, GraduationCap, Heart, ListChecks, Building2,
  Wallet, Search, Plus, Bell, Download, ChevronRight, ChevronDown, X,
  Mail, Pencil, Check, Trash2, MapPin, Users, Briefcase, FileText,
  CreditCard, StickyNote, ArrowLeft, ShieldAlert, CheckCircle2, Sparkles,
} from "lucide-react";
import { supabase, hasSupabase } from "../lib/supabaseClient";

const C = {
  ink: "#1C2230", text: "#2C3446", muted: "#7A8494", faint: "#AEB6C2",
  red: "#DA2A34", green: "#17915B", amber: "#C98A16", blue: "#2F6FED",
};
const STATUS_COLOR = {
  New: C.muted, Sourced: C.muted, Screened: C.blue, Submitted: C.blue,
  Shortlist: C.amber, Interview: C.amber, Offer: C.red, Placed: C.green,
  Matching: C.amber, Available: C.green, Active: C.green, Paid: C.green,
};
const fmt = (n) => new Intl.NumberFormat("en-AE").format(Number(n) || 0);

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

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard, kind: "leaf" },
  { id: "extract", label: "Bulk Extract", icon: UploadCloud, kind: "leaf", badge: "CV" },
  { id: "g-teachers", label: "Teachers", icon: GraduationCap, kind: "group", items: [
    { id: "t-database", label: "Database" }, { id: "t-vacancies", label: "Vacancies" }, { id: "t-pipeline", label: "Pipeline" },
  ] },
  { id: "g-lsas", label: "LSAs", icon: Heart, kind: "group", items: [
    { id: "lsa-dashboard", label: "LSA Dashboard" }, { id: "lsa-directory", label: "Directory" },
    { id: "lsa-bookings", label: "Bookings" }, { id: "lsa-attendance", label: "Attendance" }, { id: "lsa-add", label: "Add LSAs" },
  ] },
  { id: "g-tasks", label: "Tasks", icon: ListChecks, kind: "group", items: [
    { id: "tasks-todo", label: "To-do" }, { id: "tasks-log", label: "Daily log" },
  ] },
  { id: "g-schools", label: "Schools", icon: Building2, kind: "group", items: [
    { id: "schools-list", label: "School list" },
  ] },
  { id: "g-supply", label: "Supply & Pay", icon: Wallet, kind: "group", items: [
    { id: "supply-timesheets", label: "Timesheets" },
  ] },
];

/* ============================ GATE ============================ */
function Gate({ onOk }) {
  const [v, setV] = useState("");
  const [err, setErr] = useState(false);
  const submit = () => {
    const pw = process.env.NEXT_PUBLIC_APP_PASSWORD || "rtriibe2025";
    if (v === pw) { try { localStorage.setItem("rt_auth", "1"); } catch {} onOk(); }
    else setErr(true);
  };
  return (
    <div className="x-gate">
      <div className="x-gatecard">
        <div className="x-gateword"><span style={{ color: C.red }}>r</span>Triibe OS</div>
        <div className="x-gatesub">Enter the team password to continue</div>
        <input className="x-gateinput" type="password" value={v} autoFocus
          onChange={(e) => { setV(e.target.value); setErr(false); }}
          onKeyDown={(e) => e.key === "Enter" && submit()} placeholder="Password" />
        {err && <div className="x-gateerr">That password didn't match. Try again.</div>}
        <button className="x-primary lg" style={{ width: "100%", justifyContent: "center", marginTop: 4 }} onClick={submit}>Open</button>
      </div>
    </div>
  );
}

/* ============================ APP ============================ */
export default function Page() {
  const [authed, setAuthed] = useState(false);
  const [ready, setReady] = useState(false);
  const [view, setView] = useState("dashboard");
  const [open, setOpen] = useState({ "g-teachers": true, "g-lsas": true });
  const [q, setQ] = useState("");
  const [selT, setSelT] = useState(null);
  const [selL, setSelL] = useState(null);

  const [teachers, setTeachers] = useState([]);
  const [lsas, setLsas] = useState([]);
  const [vacancies, setVacancies] = useState([]);
  const [pipeline, setPipeline] = useState([]);
  const [schools, setSchools] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [attendance, setAttendance] = useState([]);

  useEffect(() => {
    try { if (localStorage.getItem("rt_auth") === "1") setAuthed(true); } catch {}
    setReady(true);
  }, []);

  const loadAll = async () => {
    if (!supabase) return;
    const grab = async (t, s) => { const { data } = await supabase.from(t).select("*").order("created_at", { ascending: false }); s(data || []); };
    await Promise.all([
      grab("candidates", setTeachers), grab("lsas", setLsas), grab("vacancies", setVacancies),
      grab("pipeline", setPipeline), grab("schools", setSchools), grab("tasks", setTasks),
      grab("bookings", setBookings), grab("attendance", setAttendance),
    ]);
  };
  useEffect(() => { if (authed) loadAll(); }, [authed]);

  const reload = { candidates: () => supabase && supabase.from("candidates").select("*").order("created_at", { ascending: false }).then(({ data }) => setTeachers(data || [])),
                   lsas: () => supabase && supabase.from("lsas").select("*").order("created_at", { ascending: false }).then(({ data }) => setLsas(data || [])),
                   vacancies: () => supabase && supabase.from("vacancies").select("*").order("created_at", { ascending: false }).then(({ data }) => setVacancies(data || [])),
                   pipeline: () => supabase && supabase.from("pipeline").select("*").order("created_at", { ascending: false }).then(({ data }) => setPipeline(data || [])),
                   schools: () => supabase && supabase.from("schools").select("*").order("created_at", { ascending: false }).then(({ data }) => setSchools(data || [])),
                   tasks: () => supabase && supabase.from("tasks").select("*").order("created_at", { ascending: false }).then(({ data }) => setTasks(data || [])) };

  const updateRow = async (table, id, patch) => { if (supabase) { await supabase.from(table).update(patch).eq("id", id); reload[table] && reload[table](); } };
  const insertRow = async (table, row) => { if (supabase) { await supabase.from(table).insert(row); reload[table] && reload[table](); } };
  const deleteRow = async (table, id) => { if (supabase) { await supabase.from(table).delete().eq("id", id); reload[table] && reload[table](); } };

  const openLeaf = (id) => { setSelT(null); setSelL(null); setView(id); };

  if (!ready) return null;
  if (!authed) return <Gate onOk={() => setAuthed(true)} />;

  return (
    <div className="x-app">
      <aside className="x-side">
        <div className="x-brand"><span className="x-r">r</span><span>Triibe</span><span className="x-os">OS</span></div>
        <nav className="x-nav">
          {NAV.map((n) => {
            const Icon = n.icon;
            if (n.kind === "leaf") return (
              <button key={n.id} className={"x-leaf" + (view === n.id ? " on" : "")} onClick={() => openLeaf(n.id)}>
                <Icon size={17} /> <span>{n.label}</span>{n.badge && <span className="x-badge">{n.badge}</span>}
              </button>
            );
            const isOpen = open[n.id]; const active = n.items.some((i) => i.id === view);
            return (
              <div key={n.id}>
                <button className={"x-grouphead" + (active ? " active" : "")} onClick={() => setOpen((o) => ({ ...o, [n.id]: !o[n.id] }))}>
                  <Icon size={17} /> <span>{n.label}</span> <ChevronDown size={15} className={"x-chev" + (isOpen ? " open" : "")} />
                </button>
                {isOpen && <div className="x-subwrap">{n.items.map((i) => (
                  <button key={i.id} className={"x-subitem" + (view === i.id ? " on" : "")} onClick={() => openLeaf(i.id)}>{i.label}</button>
                ))}</div>}
              </div>
            );
          })}
        </nav>
        <div className="x-sidefoot"><div className="x-av">O</div><div><div className="x-avn">Othman</div><div className="x-avr">School Partnerships</div></div></div>
      </aside>

      <div className="x-main">
        <header className="x-top">
          <div className="x-searchwrap"><Search size={16} color={C.muted} /><input className="x-search" placeholder="Search everything…" value={q} onChange={(e) => setQ(e.target.value)} /></div>
          <div className="x-topr"><button className="x-primary"><Plus size={16} /> Add</button><button className="x-bell"><Bell size={17} /><span className="x-bdot" /></button></div>
        </header>

        <main className="x-canvas">
          {!hasSupabase && <div className="x-page"><div className="x-notice">Database not connected yet. Add your <b>NEXT_PUBLIC_SUPABASE_URL</b> and <b>NEXT_PUBLIC_SUPABASE_ANON_KEY</b> in Vercel, then redeploy. The app runs, but nothing will save until then.</div></div>}

          {view === "dashboard" && <Dashboard go={openLeaf} teachers={teachers} lsas={lsas} vacancies={vacancies} tasks={tasks} />}
          {view === "extract" && <Extract onSaved={loadAll} />}
          {view === "lsa-add" && <Extract lsaMode onSaved={loadAll} />}

          {view === "t-database" && !selT && <TeacherDB teachers={teachers} q={q} onSelect={setSelT} />}
          {view === "t-database" && selT && <TeacherProfile t={teachers.find((x) => x.id === selT)} onBack={() => setSelT(null)} onSave={(p) => updateRow("candidates", selT, p)} />}
          {view === "t-vacancies" && <Vacancies rows={vacancies} onAdd={(r) => insertRow("vacancies", r)} onDel={(id) => deleteRow("vacancies", id)} />}
          {view === "t-pipeline" && <PipelineBoard rows={pipeline} />}

          {view === "lsa-dashboard" && <LsaDashboard lsas={lsas} go={openLeaf} />}
          {view === "lsa-directory" && !selL && <LsaDirectory lsas={lsas} q={q} onSelect={setSelL} onAdd={() => insertRow("lsas", { name: "New LSA", status: "Available", placement_fee: 1000, calc: DEFAULT_CALC, notes: [], payments: [] })} />}
          {view === "lsa-directory" && selL && <LsaProfile lsa={lsas.find((x) => x.id === selL)} onBack={() => setSelL(null)} onSave={(p) => updateRow("lsas", selL, p)} />}
          {view === "lsa-bookings" && <Bookings lsas={lsas} />}
          {view === "lsa-attendance" && <Attendance lsas={lsas} rows={attendance} />}

          {view === "tasks-todo" && <Tasks rows={tasks} onAdd={(r) => insertRow("tasks", r)} onToggle={(t) => updateRow("tasks", t.id, { done: !t.done })} onDel={(id) => deleteRow("tasks", id)} />}
          {view === "tasks-log" && <DailyLog teachers={teachers} lsas={lsas} />}
          {view === "schools-list" && <Schools rows={schools} onAdd={(r) => insertRow("schools", r)} onDel={(id) => deleteRow("schools", id)} />}
          {view === "supply-timesheets" && <Simple title="Timesheets" sub="rTriibe FZCO format · TRN 100452871500003. Supply timesheets land here." />}
        </main>
      </div>
    </div>
  );
}

/* ============================ DASHBOARD ============================ */
function Dashboard({ go, teachers, lsas, vacancies, tasks }) {
  const stats = [
    { label: "Open vacancies", v: vacancies.length, tone: C.red },
    { label: "Teachers in DB", v: teachers.length, tone: C.blue },
    { label: "LSAs on desk", v: lsas.length, tone: C.green },
    { label: "Tasks to do", v: tasks.filter((t) => !t.done).length, tone: C.amber },
  ];
  const aging = vacancies.filter((v) => (v.days_open || 0) > 7);
  return (
    <div className="x-page">
      <div className="x-eyebrow">Command centre</div>
      <h1 className="x-h1">Good morning, Othman</h1>
      <p className="x-sub">Everything on the desk in one place.</p>
      <div className="x-stats">{stats.map((s) => <div key={s.label} className="x-stat"><span className="x-statbar" style={{ background: s.tone }} /><div className="x-statv">{s.v}</div><div className="x-statl">{s.label}</div></div>)}</div>
      <div className="x-2col">
        <section className="x-panel">
          <div className="x-panelhead"><h2 className="x-h2">Needs attention</h2><span className="x-pmeta">Vacancies open 7+ days</span></div>
          {aging.length === 0 && <div className="x-empty">Nothing aging right now.</div>}
          {aging.map((v) => (
            <button key={v.id} className="x-att" onClick={() => go("t-vacancies")}>
              <span className="x-attbar" style={{ background: C.red }} />
              <span className="x-attbody"><span className="x-attt">{v.role} — {v.school}</span><span className="x-attr">Open {v.days_open} days</span></span>
              <ChevronRight size={16} color={C.faint} />
            </button>
          ))}
        </section>
        <section className="x-panel">
          <div className="x-panelhead"><h2 className="x-h2">Recent</h2></div>
          {teachers.slice(0, 4).map((t) => <div key={t.id} className="x-logrow"><span className="x-logdot" /> {t.name} added to database</div>)}
          {teachers.length === 0 && <div className="x-empty">Extract some CVs to see activity here.</div>}
          <div className="x-win"><Sparkles size={14} color={C.amber} /> Tip: the Bulk Extract tab reads CVs and files them for you.</div>
        </section>
      </div>
    </div>
  );
}

/* ============================ EXTRACT ============================ */
function Extract({ lsaMode, onSaved }) {
  const [route, setRoute] = useState(lsaMode ? "lsa" : "auto");
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");
  const [res, setRes] = useState({ teacher: 0, lsa: 0, failed: 0, done: 0, total: 0 });

  const toB64 = (file) => new Promise((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result).split(",")[1]); r.onerror = reject; r.readAsDataURL(file); });

  const saveResult = async (parsed) => {
    if (!supabase) return "failed";
    const type = route === "auto" ? (parsed.type === "lsa" ? "lsa" : "teacher") : route;
    if (type === "lsa") {
      await supabase.from("lsas").insert({
        name: parsed.name || "Unnamed", cert: parsed.cert || "", exp: "", langs: parsed.langs || "",
        background: "", location: parsed.location || "", status: "Available", email: parsed.email || "",
        phone: parsed.phone || "", placement_fee: 1000, calc: DEFAULT_CALC, notes: [], payments: [],
      });
      return "lsa";
    }
    const initials = (parsed.name || "XX").split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase();
    await supabase.from("candidates").insert({
      ref: "rTR" + initials + "01", name: parsed.name || "Unnamed", spec: parsed.spec || "", curriculum: parsed.curriculum || "",
      qual: parsed.qual || "", uae_years: Number(parsed.uae_years) || 0, out_years: Number(parsed.out_years) || 0,
      status: parsed.status || "New", email: parsed.email || "", phone: parsed.phone || "",
      verbatim_experience: parsed.verbatim_experience || "", verbatim_qualifications: parsed.verbatim_qualifications || "",
    });
    return "teacher";
  };

  const runOne = async (body) => {
    const r = await fetch("/api/extract", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    const d = await r.json();
    if (!r.ok || !d.result) throw new Error(d.error || "extract failed");
    return d.result;
  };

  const extractText = async () => {
    if (!text.trim()) return;
    setBusy(true); setMsg("Reading CV…"); setRes({ teacher: 0, lsa: 0, failed: 0, done: 0, total: 1 });
    try { const parsed = await runOne({ text }); const kind = await saveResult(parsed);
      setRes((x) => ({ ...x, [kind]: 1, done: 1 })); setMsg("Saved."); setText(""); onSaved && onSaved();
    } catch (e) { setRes((x) => ({ ...x, failed: 1, done: 1 })); setMsg("Could not read that one."); }
    setBusy(false);
  };

  const extractFiles = async (files) => {
    const arr = Array.from(files).slice(0, 2000);
    setBusy(true); setRes({ teacher: 0, lsa: 0, failed: 0, done: 0, total: arr.length });
    for (let i = 0; i < arr.length; i++) {
      setMsg(`Processing ${i + 1} of ${arr.length}…`);
      try { const b64 = await toB64(arr[i]); const parsed = await runOne({ pdfBase64: b64 }); const kind = await saveResult(parsed);
        setRes((x) => ({ ...x, [kind]: x[kind] + 1, done: x.done + 1 }));
      } catch (e) { setRes((x) => ({ ...x, failed: x.failed + 1, done: x.done + 1 })); }
      await new Promise((r) => setTimeout(r, 400));
    }
    setMsg("Done."); setBusy(false); onSaved && onSaved();
  };

  const pct = res.total ? Math.round((res.done / res.total) * 100) : 0;
  return (
    <div className="x-page">
      <h1 className="x-h1">{lsaMode ? "Add LSAs" : "Bulk Extract"}</h1>
      <p className="x-sub">Paste one CV, or drop up to 2,000 PDFs. Each is read and {lsaMode ? "added to the LSA directory" : "filed as a teacher or LSA"} automatically.</p>

      {!lsaMode && (
        <div className="x-routewrap"><span className="x-routelabel">Route each CV to</span>
          {[["auto", "Auto-detect"], ["teacher", "All teachers"], ["lsa", "All LSAs"]].map(([id, l]) => <button key={id} className={"x-route" + (route === id ? " on" : "")} onClick={() => setRoute(id)}>{l}</button>)}
        </div>
      )}

      <div className="x-drop">
        <UploadCloud size={30} color={C.muted} />
        <div className="x-dropt">Drop CVs or choose files</div>
        <div className="x-dropsub">PDF · up to 2,000 files</div>
        <input id="cvfiles" type="file" accept="application/pdf" multiple style={{ display: "none" }} onChange={(e) => extractFiles(e.target.files)} disabled={busy} />
        <button className="x-primary lg" onClick={() => document.getElementById("cvfiles").click()} disabled={busy}>Choose PDFs</button>
      </div>

      <textarea className="x-ta" placeholder="…or paste a single CV's text here" value={text} onChange={(e) => setText(e.target.value)} disabled={busy} />
      <button className="x-primary" style={{ marginTop: 10 }} onClick={extractText} disabled={busy || !text.trim()}>Extract & save</button>

      {(busy || res.done > 0) && (
        <div className="x-panel" style={{ marginTop: 18 }}>
          <div className="x-panelhead"><h2 className="x-h2">{msg || "Working…"}</h2><span className="x-pmeta">{res.done} / {res.total}</span></div>
          <div className="x-bar"><span className="x-barfill" style={{ width: pct + "%" }} /></div>
          <div className="x-resgrid">
            <div className="x-res"><div className="x-resn" style={{ color: C.blue }}>{res.teacher}</div><div className="x-resl">Teachers</div></div>
            <div className="x-res"><div className="x-resn" style={{ color: C.green }}>{res.lsa}</div><div className="x-resl">LSAs</div></div>
            <div className="x-res"><div className="x-resn" style={{ color: C.red }}>{res.failed}</div><div className="x-resl">Need review</div></div>
            <div className="x-res"><div className="x-resn" style={{ color: C.ink }}>{res.done}</div><div className="x-resl">Processed</div></div>
          </div>
          {!busy && res.done > 0 && <div className="x-doneline"><CheckCircle2 size={15} color={C.green} /> Saved to the database. Open Teachers → Database or LSAs → Directory.</div>}
        </div>
      )}
    </div>
  );
}

/* ============================ TEACHERS ============================ */
function TeacherDB({ teachers, q, onSelect }) {
  const list = teachers.filter((t) => ((t.name || "") + (t.ref || "") + (t.spec || "")).toLowerCase().includes((q || "").toLowerCase()));
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">Teacher database</h1><p className="x-sub">{teachers.length} teachers · UAE and outside-UAE years computed at extraction.</p></div></div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No teachers yet. Use Bulk Extract to add them.</div></div> : (
        <div className="x-tablewrap"><table className="x-table">
          <thead><tr><th>Ref</th><th>Name</th><th>Specialization</th><th className="r">UAE</th><th className="r">Outside</th><th>Qual</th><th>Status</th><th></th></tr></thead>
          <tbody>{list.map((t) => (
            <tr key={t.id} onClick={() => onSelect(t.id)}>
              <td><span className="x-ref">{t.ref || "—"}</span></td><td className="b">{t.name}</td><td>{t.spec}</td>
              <td className="r nums">{Number(t.uae_years || 0).toFixed(1)}y</td><td className="r nums">{Number(t.out_years || 0).toFixed(1)}y</td>
              <td className="mut">{t.qual}</td><td><Pill s={t.status} /></td>
              <td className="rowact"><ChevronRight size={15} color={C.faint} /></td>
            </tr>
          ))}</tbody>
        </table></div>
      )}
    </div>
  );
}

function TeacherProfile({ t, onBack, onSave }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState(t);
  useEffect(() => setD(t), [t]);
  if (!d) return null;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const save = () => { onSave({ spec: d.spec, curriculum: d.curriculum, qual: d.qual, email: d.email, phone: d.phone, status: d.status, notes: d.notes }); setEdit(false); };
  return (
    <div className="x-page">
      <button className="x-back" onClick={onBack}><ArrowLeft size={15} /> Back to database</button>
      <div className="x-profhead">
        <div><div className="x-ref lg">{d.ref || "—"}</div><h1 className="x-h1" style={{ marginTop: 6 }}>{d.name}</h1><div className="x-sub">{d.spec} · {d.curriculum} · {d.qual}</div></div>
        {edit ? <button className="x-primary" onClick={save}><Check size={15} /> Save</button> : <button className="x-ghost" onClick={() => setEdit(true)}><Pencil size={14} /> Edit</button>}
      </div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Experience — computed from role dates</h2></div>
        <div className="x-exp3">
          <div className="x-metric"><div className="x-metricn nums">{Number(d.uae_years || 0).toFixed(1)}</div><div className="x-metricl">Years in UAE</div></div>
          <div className="x-metric"><div className="x-metricn nums">{Number(d.out_years || 0).toFixed(1)}</div><div className="x-metricl">Years outside UAE</div></div>
          <div className="x-metric"><div className="x-metricn nums" style={{ color: C.red }}>{(Number(d.uae_years || 0) + Number(d.out_years || 0)).toFixed(1)}</div><div className="x-metricl">Total</div></div>
        </div>
      </div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Details</h2></div>
        <Field label="Specialization" value={d.spec} edit={edit} onChange={(v) => set("spec", v)} />
        <Field label="Curriculum" value={d.curriculum} edit={edit} onChange={(v) => set("curriculum", v)} />
        <Field label="Qualification" value={d.qual} edit={edit} onChange={(v) => set("qual", v)} />
        <Field label="Status" value={d.status} edit={edit} onChange={(v) => set("status", v)} />
        <Field label="Email" value={d.email} edit={edit} onChange={(v) => set("email", v)} />
        <Field label="Phone" value={d.phone} edit={edit} onChange={(v) => set("phone", v)} />
        <Field label="Notes" value={d.notes} edit={edit} onChange={(v) => set("notes", v)} area />
      </div>
      {d.verbatim_experience && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Experience — exactly as written on the CV</h2></div><div className="x-verbatim">{d.verbatim_experience}</div></div>}
      {d.verbatim_qualifications && <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Qualifications — exactly as written</h2></div><div className="x-verbatim">{d.verbatim_qualifications}</div></div>}
      <div className="x-profactions">
        <button className="x-ghost"><Download size={15} /> Download CV</button>
        <button className="x-ghost"><Briefcase size={15} /> Match to vacancy</button>
        <button className="x-primary"><Mail size={15} /> Send offer</button>
      </div>
    </div>
  );
}

/* ============================ LSAs ============================ */
function LsaDashboard({ lsas, go }) {
  const placed = lsas.filter((l) => l.status === "Placed").length;
  const revenue = lsas.reduce((s, l) => s + (Array.isArray(l.payments) ? l.payments.reduce((a, p) => a + (Number(p.amount) || 0), 0) : 0), 0);
  return (
    <div className="x-page">
      <h1 className="x-h1">LSA desk</h1><p className="x-sub">Family placements — directory, bookings, attendance, payments.</p>
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

function LsaDirectory({ lsas, q, onSelect, onAdd }) {
  const list = lsas.filter((l) => ((l.name || "") + (l.cert || "") + (l.langs || "")).toLowerCase().includes((q || "").toLowerCase()));
  return (
    <div className="x-page">
      <div className="x-headrow"><div><h1 className="x-h1">LSA directory</h1><p className="x-sub">Click any LSA to view and edit their profile, notes and payments.</p></div><button className="x-ghost" onClick={onAdd}><Plus size={14} /> New LSA</button></div>
      {list.length === 0 ? <div className="x-panel"><div className="x-empty">No LSAs yet. Add one, or use Add LSAs to extract from CVs.</div></div> : (
        <div className="x-cards">{list.map((l) => (
          <button key={l.id} className="x-lcard" onClick={() => onSelect(l.id)}>
            <div className="x-lctop"><span className="x-lname">{l.name}</span><Pill s={l.status} /></div>
            <div className="x-lrow"><Heart size={13} color={C.red} /> {l.cert || "—"}</div>
            <div className="x-lrow"><Users size={13} color={C.muted} /> {l.langs || "—"}</div>
            <div className="x-lrow"><MapPin size={13} color={C.muted} /> {l.location || "—"}</div>
            <div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(calcRate(l.calc))}<span className="x-lper">/mo</span></span><ChevronRight size={15} color={C.faint} /></div>
          </button>
        ))}</div>
      )}
    </div>
  );
}

function LsaProfile({ lsa, onBack, onSave }) {
  const [edit, setEdit] = useState(false);
  const [d, setD] = useState(lsa);
  const [noteText, setNoteText] = useState("");
  const [pay, setPay] = useState({ amount: "", method: "Bank transfer" });
  useEffect(() => setD(lsa), [lsa]);
  if (!d) return null;
  const notes = Array.isArray(d.notes) ? d.notes : [];
  const payments = Array.isArray(d.payments) ? d.payments : [];
  const calc = d.calc || DEFAULT_CALC;
  const set = (k, v) => setD((x) => ({ ...x, [k]: v }));
  const setCalc = (k, v) => setD((x) => ({ ...x, calc: { ...(x.calc || DEFAULT_CALC), [k]: v } }));
  const rate = calcRate(calc);
  const pkg = rate + Number(d.placement_fee || 0);
  const saveProfile = () => { onSave({ name: d.name, cert: d.cert, exp: d.exp, langs: d.langs, background: d.background, location: d.location, status: d.status, family: d.family, email: d.email, phone: d.phone }); setEdit(false); };
  const saveRate = () => onSave({ calc, placement_fee: Number(d.placement_fee || 0) });
  const addNote = () => { if (!noteText.trim()) return; const next = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), text: noteText.trim() }, ...notes]; set("notes", next); onSave({ notes: next }); setNoteText(""); };
  const delNote = (id) => { const next = notes.filter((n) => n.id !== id); set("notes", next); onSave({ notes: next }); };
  const addPay = () => { if (!pay.amount) return; const next = [{ id: Date.now(), date: new Date().toISOString().slice(0, 10), amount: Number(pay.amount), method: pay.method, status: "Paid" }, ...payments]; set("payments", next); onSave({ payments: next }); setPay({ amount: "", method: "Bank transfer" }); };
  const delPay = (id) => { const next = payments.filter((p) => p.id !== id); set("payments", next); onSave({ payments: next }); };
  return (
    <div className="x-page">
      <button className="x-back" onClick={onBack}><ArrowLeft size={15} /> Back to directory</button>
      <div className="x-profhead"><div><h1 className="x-h1">{d.name}</h1><div className="x-sub">{d.cert} · {d.location}</div></div>
        {edit ? <button className="x-primary" onClick={saveProfile}><Check size={15} /> Save changes</button> : <button className="x-ghost" onClick={() => setEdit(true)}><Pencil size={14} /> Edit profile</button>}
      </div>
      <div className="x-2col">
        <div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Profile</h2></div>
            <Field label="Full name" value={d.name} edit={edit} onChange={(v) => set("name", v)} />
            <Field label="Certification" value={d.cert} edit={edit} onChange={(v) => set("cert", v)} />
            <Field label="Experience" value={d.exp} edit={edit} onChange={(v) => set("exp", v)} />
            <Field label="Languages" value={d.langs} edit={edit} onChange={(v) => set("langs", v)} />
            <Field label="Background" value={d.background} edit={edit} onChange={(v) => set("background", v)} />
            <Field label="Location" value={d.location} edit={edit} onChange={(v) => set("location", v)} />
            <Field label="Status" value={d.status} edit={edit} onChange={(v) => set("status", v)} />
            <Field label="Email" value={d.email} edit={edit} onChange={(v) => set("email", v)} />
            <Field label="Phone" value={d.phone} edit={edit} onChange={(v) => set("phone", v)} />
            <Field label="Placed with" value={d.family} edit={edit} onChange={(v) => set("family", v)} />
          </div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2"><StickyNote size={15} style={{ verticalAlign: -2 }} /> Notes</h2></div>
            <div className="x-noteadd"><input className="x-input" placeholder="Add a note…" value={noteText} onChange={(e) => setNoteText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addNote()} /><button className="x-primary sm" onClick={addNote}><Plus size={14} /></button></div>
            {notes.length === 0 && <div className="x-empty">No notes yet.</div>}
            {notes.map((n) => <div key={n.id} className="x-noterow"><div><div className="x-notet">{n.text}</div><div className="x-notedate nums">{n.date}</div></div><button className="x-ic" onClick={() => delNote(n.id)}><Trash2 size={13} /></button></div>)}
          </div>
        </div>
        <div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Rate calculator</h2></div>
            <div className="x-calcbig">
              <div><div className="x-calclabel">LSA rate</div><div className="x-calcv nums">AED {fmt(rate)}</div></div>
              <div className="x-calcplus">+</div>
              <div><div className="x-calclabel">Placement fee</div><input className="x-feeinput nums" type="number" value={d.placement_fee || 0} onChange={(e) => set("placement_fee", e.target.value)} /></div>
              <div className="x-calceq">=</div>
              <div><div className="x-calclabel">Family package</div><div className="x-calcv nums red">AED {fmt(pkg)}</div></div>
            </div>
            <div className="x-calcgrid">
              <Select label="Hours/week" value={calc.hours} opts={[10, 15, 20, 25, 30, 40]} onChange={(v) => setCalc("hours", Number(v))} />
              <Select label="Level" value={calc.level} opts={["Junior", "Mid", "Experienced"]} onChange={(v) => setCalc("level", v)} />
              <Select label="Qualification" value={calc.qual} opts={["Level 3", "ABAT", "SEN diploma"]} onChange={(v) => setCalc("qual", v)} />
              <Select label="Languages" value={calc.langs} opts={[1, 2, 3]} onChange={(v) => setCalc("langs", Number(v))} />
              <Select label="Tier" value={calc.tier} opts={["Standard", "Specialist"]} onChange={(v) => setCalc("tier", v)} />
              <Select label="Child needs" value={calc.needs} opts={["Mild", "Moderate", "Complex"]} onChange={(v) => setCalc("needs", v)} />
              <Select label="Urgency" value={calc.urgency} opts={["Standard", "Urgent"]} onChange={(v) => setCalc("urgency", v)} />
            </div>
            <button className="x-primary" style={{ marginTop: 12 }} onClick={saveRate}><Check size={15} /> Save rate</button>
          </div>
          <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2"><CreditCard size={15} style={{ verticalAlign: -2 }} /> Payments</h2></div>
            <div className="x-payadd"><input className="x-input" type="number" placeholder="Amount" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} /><select className="x-input" value={pay.method} onChange={(e) => setPay({ ...pay, method: e.target.value })}><option>Bank transfer</option><option>Cash</option><option>Card</option></select><button className="x-primary sm" onClick={addPay}><Plus size={14} /></button></div>
            {payments.length === 0 && <div className="x-empty">No payments logged.</div>}
            {payments.map((p) => <div key={p.id} className="x-payrow"><div><div className="x-payamt nums">AED {fmt(p.amount)}</div><div className="x-paymeta nums">{p.date} · {p.method}</div></div><div className="x-payright"><Pill s={p.status} /><button className="x-ic" onClick={() => delPay(p.id)}><Trash2 size={13} /></button></div></div>)}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================ SMALL VIEWS ============================ */
function Bookings({ lsas }) {
  const [open, setOpen] = useState(null);
  const rows = lsas.filter((l) => l.status === "Placed");
  return (
    <div className="x-page"><h1 className="x-h1">Bookings</h1><p className="x-sub">Active family placements. Click for details.</p>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No active bookings. Set an LSA's status to Placed to see it here.</div></div> : (
        <div className="x-cards">{rows.map((b) => (
          <button key={b.id} className="x-lcard" onClick={() => setOpen(b)}>
            <div className="x-lctop"><span className="x-lname">{b.name}</span><Pill s="Placed" /></div>
            <div className="x-lrow"><Users size={13} color={C.muted} /> {b.family || "—"}</div>
            <div className="x-lcfoot"><span className="x-lfee nums">AED {fmt(calcRate(b.calc) + Number(b.placement_fee || 0))}<span className="x-lper">/mo</span></span><ChevronRight size={15} color={C.faint} /></div>
          </button>
        ))}</div>
      )}
      {open && (<><div className="x-scrim" onClick={() => setOpen(null)} /><div className="x-modal"><div className="x-modalhead"><h2 className="x-h2">{open.name}</h2><button className="x-ic" onClick={() => setOpen(null)}><X size={16} /></button></div>
        <Row k="Family" v={open.family || "—"} /><Row k="Location" v={open.location || "—"} /><Row k="LSA rate" v={"AED " + fmt(calcRate(open.calc))} /><Row k="Placement fee" v={"AED " + fmt(open.placement_fee || 0)} /><Row k="Package" v={"AED " + fmt(calcRate(open.calc) + Number(open.placement_fee || 0))} />
      </div></>)}
    </div>
  );
}

function Attendance({ lsas, rows }) {
  const placed = lsas.filter((l) => l.status === "Placed");
  return (
    <div className="x-page"><h1 className="x-h1">Attendance</h1><p className="x-sub">Sessions logged per LSA.</p>
      {placed.length === 0 ? <div className="x-panel"><div className="x-empty">No placed LSAs yet.</div></div> : (
        <div className="x-tablewrap"><table className="x-table"><thead><tr><th>LSA</th><th>Family</th><th>Rate/mo</th><th className="r">Fee</th></tr></thead>
          <tbody>{placed.map((l) => <tr key={l.id}><td className="b">{l.name}</td><td>{l.family || "—"}</td><td className="nums">AED {fmt(calcRate(l.calc))}</td><td className="r nums">AED {fmt(l.placement_fee || 0)}</td></tr>)}</tbody>
        </table></div>
      )}
    </div>
  );
}

function Vacancies({ rows, onAdd, onDel }) {
  const [f, setF] = useState({ role: "", school: "", contact: "", kind: "teacher" });
  const tone = (d) => (d > 7 ? C.red : d > 4 ? C.amber : C.blue);
  return (
    <div className="x-page"><div className="x-headrow"><div><h1 className="x-h1">Vacancies</h1><p className="x-sub">Live briefs. Aging roles flag automatically.</p></div></div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Add a vacancy</h2></div>
        <div className="x-payadd" style={{ flexWrap: "wrap" }}>
          <input className="x-input" placeholder="Role" value={f.role} onChange={(e) => setF({ ...f, role: e.target.value })} />
          <input className="x-input" placeholder="School" value={f.school} onChange={(e) => setF({ ...f, school: e.target.value })} />
          <input className="x-input" placeholder="Contact" value={f.contact} onChange={(e) => setF({ ...f, contact: e.target.value })} />
          <button className="x-primary sm" onClick={() => { if (f.role) { onAdd({ ...f, shortlist: 0, days_open: 0, status: "Open" }); setF({ role: "", school: "", contact: "", kind: "teacher" }); } }}><Plus size={14} /></button>
        </div>
      </div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No vacancies yet. Add one above, or import your CSV in Supabase.</div></div> : (
        <div className="x-cards">{rows.map((v) => (
          <div key={v.id} className="x-vcard"><span className="x-vbar" style={{ background: tone(v.days_open || 0) }} />
            <div className="x-vtop"><span className="x-vrole">{v.role}</span><span className="x-vdays nums" style={{ color: tone(v.days_open || 0) }}>{v.days_open || 0}d</span></div>
            <div className="x-lrow"><Building2 size={13} color={C.muted} /> {v.school || "—"}</div>
            <div className="x-vfoot" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><span className="x-lrow" style={{ margin: 0 }}><Users size={13} /> {v.shortlist || 0} shortlisted</span><button className="x-ic" onClick={() => onDel(v.id)}><Trash2 size={13} /></button></div>
          </div>
        ))}</div>
      )}
    </div>
  );
}

function PipelineBoard({ rows }) {
  const stages = ["Submitted", "Interview", "Offer", "Placed"];
  return (
    <div className="x-page"><h1 className="x-h1">Pipeline</h1><p className="x-sub">Candidates by stage. Import your existing pipeline CSV in Supabase to populate this.</p>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">Pipeline is empty. Import your CSV into the pipeline table.</div></div> : (
        <div className="x-board">{stages.map((s) => { const items = rows.filter((r) => r.stage === s); return (
          <div key={s} className="x-bcol"><div className="x-bhead"><span style={{ color: STATUS_COLOR[s] }}>●</span> {s} <span className="x-bn">{items.length}</span></div>
            {items.map((r) => <div key={r.id} className="x-pcard">{r.candidate_name}<div className="x-pcardmeta">{r.vacancy || ""}</div></div>)}
          </div>
        ); })}</div>
      )}
    </div>
  );
}

function Schools({ rows, onAdd, onDel }) {
  const [f, setF] = useState({ name: "", grp: "", curriculum: "" });
  return (
    <div className="x-page"><div className="x-headrow"><div><h1 className="x-h1">Schools</h1><p className="x-sub">Client schools and their compliance flags.</p></div></div>
      <div className="x-panel"><div className="x-panelhead"><h2 className="x-h2">Add a school</h2></div>
        <div className="x-payadd" style={{ flexWrap: "wrap" }}>
          <input className="x-input" placeholder="Name" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
          <input className="x-input" placeholder="Group" value={f.grp} onChange={(e) => setF({ ...f, grp: e.target.value })} />
          <input className="x-input" placeholder="Curriculum" value={f.curriculum} onChange={(e) => setF({ ...f, curriculum: e.target.value })} />
          <button className="x-primary sm" onClick={() => { if (f.name) { onAdd({ ...f, flags: [] }); setF({ name: "", grp: "", curriculum: "" }); } }}><Plus size={14} /></button>
        </div>
      </div>
      {rows.length === 0 ? <div className="x-panel"><div className="x-empty">No schools yet.</div></div> : (
        <div className="x-cards">{rows.map((s) => (
          <div key={s.id} className="x-scard">
            <div className="x-lctop"><span className="x-ref">{s.grp || "—"}</span><button className="x-ic" onClick={() => onDel(s.id)}><Trash2 size={13} /></button></div>
            <div className="x-lname" style={{ margin: "8px 0 10px" }}>{s.name}</div>
            {(Array.isArray(s.flags) ? s.flags : []).map((flg, i) => { const warn = /block|required/i.test(flg); return <span key={i} className={"x-flag" + (warn ? " warn" : "")}>{warn ? <ShieldAlert size={12} /> : <CheckCircle2 size={12} />} {flg}</span>; })}
          </div>
        ))}</div>
      )}
    </div>
  );
}

function Tasks({ rows, onAdd, onToggle, onDel }) {
  const [text, setText] = useState("");
  return (
    <div className="x-page"><h1 className="x-h1">To-do</h1><p className="x-sub">Your task list. Add, tick off, or remove anything.</p>
      <div className="x-noteadd" style={{ maxWidth: 560 }}><input className="x-input" placeholder="Add a task…" value={text} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === "Enter" && text.trim() && (onAdd({ text: text.trim(), done: false, due: "Today", tag: "General" }), setText(""))} /><button className="x-primary sm" onClick={() => { if (text.trim()) { onAdd({ text: text.trim(), done: false, due: "Today", tag: "General" }); setText(""); } }}><Plus size={14} /></button></div>
      <div className="x-panel" style={{ marginTop: 16 }}>
        {rows.length === 0 && <div className="x-empty">No tasks yet.</div>}
        {rows.map((t) => (
          <div key={t.id} className={"x-task" + (t.done ? " done" : "")}>
            <button className={"x-check" + (t.done ? " on" : "")} onClick={() => onToggle(t)}>{t.done && <Check size={12} />}</button>
            <span className="x-taskt">{t.text}</span><span className="x-tasktag">{t.tag}</span><span className="x-taskdue">{t.due}</span>
            <button className="x-ic" onClick={() => onDel(t.id)}><Trash2 size={13} /></button>
          </div>
        ))}
      </div>
    </div>
  );
}

function DailyLog({ teachers, lsas }) {
  const items = [...teachers.slice(0, 5).map((t) => t.name + " added to teacher database"), ...lsas.slice(0, 3).map((l) => l.name + " added to LSA directory")];
  return (
    <div className="x-page"><h1 className="x-h1">Daily log</h1><p className="x-sub">Recent activity across the desk.</p>
      <div className="x-panel">{items.length === 0 ? <div className="x-empty">Nothing logged yet.</div> : items.map((t, i) => <div key={i} className="x-logrow"><span className="x-logdot" /> {t}</div>)}</div>
    </div>
  );
}

function Simple({ title, sub }) { return <div className="x-page"><h1 className="x-h1">{title}</h1><p className="x-sub">{sub}</p><div className="x-panel"><div className="x-empty">This section is ready — it fills in as you use the desk.</div></div></div>; }

/* ---------- shared ---------- */
function Pill({ s }) { const c = STATUS_COLOR[s] || C.muted; return <span className="x-pill" style={{ color: c, background: c + "16", borderColor: c + "30" }}>{s || "—"}</span>; }
function Row({ k, v }) { return <div className="x-detrow"><span className="x-detk">{k}</span><span className="x-detv">{v}</span></div>; }
function Field({ label, value, edit, onChange, area }) {
  return (<div className="x-field"><span className="x-fieldk">{label}</span>
    {edit ? (area ? <textarea className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} rows={2} /> : <input className="x-input" value={value || ""} onChange={(e) => onChange(e.target.value)} />) : <span className="x-fieldv">{value || "—"}</span>}
  </div>);
}
function Select({ label, value, opts, onChange }) {
  return (<label className="x-sel"><span className="x-selk">{label}</span><select value={value} onChange={(e) => onChange(e.target.value)}>{opts.map((o) => <option key={o} value={o}>{o}</option>)}</select></label>);
}
