import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { supabase, hasSupabase } from "../../lib/supabaseClient";
import { DOC_TYPES, slugify } from "../../lib/compliance";

export default function UploadPage() {
  const router = useRouter();
  const { id } = router.query;
  const [name, setName] = useState("");
  const [docs, setDocs] = useState([]);
  const [busy, setBusy] = useState("");
  const [ready, setReady] = useState(false);

  const load = async () => {
    if (!hasSupabase || !id) return;
    const { data: cand } = await supabase.from("candidates").select("name").eq("id", id).maybeSingle();
    if (cand) setName(cand.name || "");
    const { data: d } = await supabase.from("compliance_docs").select("*").eq("candidate_id", id);
    setDocs(d || []);
    setReady(true);
  };
  useEffect(() => { if (id) load(); }, [id]);

  const received = (type) => docs.find((x) => x.doc_type === type);

  const upload = async (type, file) => {
    if (!file || !hasSupabase) return;
    setBusy(type);
    try {
      const path = `${id}/${slugify(type)}-${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("compliance").upload(path, file, { upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from("compliance").getPublicUrl(path);
      const existing = received(type);
      if (existing) await supabase.from("compliance_docs").delete().eq("id", existing.id);
      const { error: insErr } = await supabase.from("compliance_docs").insert({ candidate_id: id, doc_type: type, file_name: file.name, file_url: pub.publicUrl });
      if (insErr) throw insErr;
      await load();
    } catch (e) {
      alert("Upload failed: " + (e.message || e) + "\n\nMake sure a public storage bucket named 'compliance' exists.");
    }
    setBusy("");
  };

  const doneCount = DOC_TYPES.filter((t) => received(t)).length;

  return (
    <div style={{ minHeight: "100vh", background: "#F6F7F9", padding: "0 16px 60px", fontFamily: "Inter, Arial, sans-serif", color: "#1C2230" }}>
      <div style={{ maxWidth: 620, margin: "0 auto" }}>
        <div style={{ textAlign: "center", padding: "40px 0 8px" }}>
          <div style={{ fontSize: 30, fontWeight: 800 }}><span style={{ color: "#DA2A34" }}>r</span>Triibe</div>
          <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 2, color: "#7A8494", marginTop: 2 }}>COMPLIANCE DOCUMENTS</div>
        </div>
        <div style={{ background: "#fff", border: "1px solid #E8EAEF", borderRadius: 16, padding: 24, boxShadow: "0 8px 30px rgba(20,25,40,.05)" }}>
          <h1 style={{ fontSize: 20, margin: "0 0 6px", fontFamily: "Sora, Inter, sans-serif" }}>{name ? "Documents for " + name : "Upload your documents"}</h1>
          <p style={{ fontSize: 13, color: "#5B6472", margin: "0 0 4px", lineHeight: 1.6 }}>Please drop each file into the matching slot below. You can upload PDFs or photos. If a document isn't listed, use "Other".</p>
          {ready && <p style={{ fontSize: 12, fontWeight: 700, color: doneCount ? "#17915B" : "#7A8494", margin: "0 0 16px" }}>{doneCount} of {DOC_TYPES.length} uploaded</p>}

          {!hasSupabase && <div style={{ color: "#DA2A34", fontSize: 13 }}>This link isn't configured correctly. Please contact rTriibe.</div>}

          {DOC_TYPES.map((type) => {
            const r = received(type);
            return (
              <div key={type} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "14px 0", borderBottom: "1px solid #F1F2F5" }}>
                <div style={{ minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 600 }}>{type}</div>
                  {r ? <div style={{ fontSize: 12, color: "#17915B", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>Uploaded: {r.file_name}</div>
                     : <div style={{ fontSize: 12, color: "#A0A7B4" }}>Not uploaded yet</div>}
                </div>
                <label style={{ flexShrink: 0, cursor: "pointer", background: r ? "#EEF0F4" : "#DA2A34", color: r ? "#1C2230" : "#fff", fontSize: 13, fontWeight: 700, padding: "9px 16px", borderRadius: 9 }}>
                  {busy === type ? "Uploading…" : r ? "Replace" : "Upload"}
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx" style={{ display: "none" }} disabled={busy === type} onChange={(e) => { const f = e.target.files[0]; if (f) upload(type, f); e.target.value = ""; }} />
                </label>
              </div>
            );
          })}
          <p style={{ fontSize: 12, color: "#7A8494", marginTop: 18, lineHeight: 1.6 }}>Your files are sent securely to rTriibe. You can close this page once everything shows as uploaded.</p>
        </div>
      </div>
    </div>
  );
}
