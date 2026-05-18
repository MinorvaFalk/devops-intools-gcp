import { useRef, useState } from "react";
import { Icon } from "./Icon";

export interface SAKey {
  source: "file" | "paste";
  fileName: string;
  size: number;
  clientEmail: string;
  projectId: string;
  privateKeyId: string;
}

interface SAFileInputProps {
  value: SAKey | null;
  onChange: (v: SAKey | null) => void;
}

function validate(parsed: Record<string, unknown>): string | null {
  if (!parsed || typeof parsed !== "object") return "Not a valid JSON object.";
  if (parsed["type"] !== "service_account") return 'Missing or wrong "type": expected service_account.';
  const email = parsed["client_email"] as string | undefined;
  if (!email || !/@[a-z0-9.-]+\.iam\.gserviceaccount\.com$/i.test(email))
    return "Missing or invalid client_email.";
  if (!parsed["project_id"]) return "Missing project_id.";
  const pk = parsed["private_key"] as string | undefined;
  if (!pk || !pk.includes("PRIVATE KEY")) return "Missing private_key.";
  return null;
}

export function SAFileInput({ value, onChange }: SAFileInputProps) {
  const [mode, setMode] = useState<"file" | "paste">("file");
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [pasted, setPasted] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const accept = (parsed: Record<string, unknown>, fileName: string, size: number, source: "file" | "paste") => {
    const err = validate(parsed);
    if (err) { setError(err); return; }
    onChange({
      source,
      fileName,
      size,
      clientEmail: parsed["client_email"] as string,
      projectId: parsed["project_id"] as string,
      privateKeyId: String(parsed["private_key_id"] ?? "(unknown)").slice(0, 8),
    });
    setError("");
  };

  const handleFile = (file: File | undefined) => {
    if (!file) return;
    setError("");
    if (!file.name.toLowerCase().endsWith(".json") && file.type !== "application/json") {
      setError("Must be a .json file."); return;
    }
    if (file.size > 20 * 1024) { setError("File too large (>20 KB)."); return; }
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result as string) as Record<string, unknown>;
        accept(parsed, file.name, file.size, "file");
      } catch { setError("Could not parse JSON."); }
    };
    reader.readAsText(file);
  };

  const handlePaste = () => {
    setError("");
    if (!pasted.trim()) { setError("Paste the service account JSON first."); return; }
    try {
      const parsed = JSON.parse(pasted) as Record<string, unknown>;
      accept(parsed, "pasted.json", pasted.length, "paste");
      setPasted("");
    } catch { setError("Could not parse JSON."); }
  };

  const clear = () => {
    onChange(null); setError(""); setPasted("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (value) {
    return (
      <div className="col" style={{ gap: 8 }}>
        <div className="file-chip valid">
          <Icon name="shield" size={18} className="ic" />
          <div className="meta">
            <div className="name">
              {value.fileName}
              <span className="tag" style={{ marginLeft: 8, fontSize: 10 }}>{value.source}</span>
            </div>
            <div className="sub">
              <span className="mono">{value.clientEmail}</span>
              {" · project "}<span className="mono">{value.projectId}</span>
            </div>
          </div>
          <button type="button" className="remove" onClick={clear}><Icon name="close" size={14} /></button>
        </div>
      </div>
    );
  }

  return (
    <div className="col" style={{ gap: 8 }}>
      <div className="sa-tabs">
        <button type="button" className={`sa-tab ${mode === "file" ? "active" : ""}`} onClick={() => { setMode("file"); setError(""); }}>
          <Icon name="disk" size={12} /> Upload file
        </button>
        <button type="button" className={`sa-tab ${mode === "paste" ? "active" : ""}`} onClick={() => { setMode("paste"); setError(""); }}>
          <Icon name="copy" size={12} /> Paste JSON
        </button>
      </div>
      {mode === "file" ? (
        <label
          className={`file-drop ${dragging ? "dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => { e.preventDefault(); setDragging(false); handleFile(e.dataTransfer.files?.[0]); }}
        >
          <input ref={inputRef} type="file" accept=".json,application/json" onChange={(e) => handleFile(e.target.files?.[0])} />
          <Icon name="shield" size={18} className="ic" style={{ alignSelf: "center" }} />
          <div className="pri">Drop service account JSON key here</div>
          <div className="sec">or click to choose · <span className="mono">.json</span> only</div>
        </label>
      ) : (
        <div className="col" style={{ gap: 6 }}>
          <textarea
            className="input"
            placeholder={'{\n  "type": "service_account",\n  ...\n}'}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            spellCheck={false}
            style={{ minHeight: 120, fontSize: 11.5 }}
          />
          <button type="button" className="btn sm primary" onClick={handlePaste}>
            <Icon name="check" size={12} /> Use this JSON
          </button>
        </div>
      )}
      {error && <div className="hint text-err">{error}</div>}
    </div>
  );
}
