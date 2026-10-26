"use client";

export interface CustomField { id: string; label: string; type: "text" | "textarea" | "select" | "number" | "checkbox"; required: boolean; placeholder: string; options: string[] }

const TYPES: [CustomField["type"], string][] = [["text", "Short text"], ["textarea", "Long text"], ["select", "Drop-down choice"], ["number", "Number"], ["checkbox", "Tick box"]];
const MAX = 12;

/** Lets the shop owner add their own boxes to the checkout form (shown after the address). Each box: label, type, required or not, hint text, and the choices for a drop-down.
 *  The answers are saved with the order and shown on the order page. */
export function CustomFieldsEditor({ value, onChange, input, label }: { value: CustomField[]; onChange: (v: CustomField[]) => void; input: string; label: string }) {
  const set = (i: number, patch: Partial<CustomField>) => onChange(value.map((f, k) => (k === i ? { ...f, ...patch } : f)));
  const move = (i: number, d: -1 | 1) => { const j = i + d; if (j < 0 || j >= value.length) return; const next = [...value]; [next[i], next[j]] = [next[j], next[i]]; onChange(next); };
  const add = () => {
    const used = new Set(value.map((f) => f.id));
    let n = value.length + 1;
    while (used.has(`box${n}`)) n++;
    onChange([...value, { id: `box${n}`, label: "", type: "text", required: false, placeholder: "", options: [] }]);
  };

  return (
    <div className="space-y-3 border-t border-line pt-4">
      <div>
        <p className="text-sm font-semibold">Your own boxes</p>
        <p className="text-xs text-muted">Add extra boxes to the checkout form, for example &ldquo;Alternate phone&rdquo; or &ldquo;Preferred delivery time&rdquo;. They show after the address, and the answers are saved on the order (you see them on the order page). Up to {MAX}. Press Save at the bottom of the page.</p>
      </div>
      {value.length === 0 && <p className="text-xs text-muted">No extra boxes yet.</p>}
      {value.map((f, i) => (
        <div key={f.id} className="grid gap-3 border border-line p-3 sm:grid-cols-2">
          <label className={label}>Box name (what the customer sees)
            <input className={input} value={f.label} maxLength={60} placeholder="e.g. Alternate phone" onChange={(e) => set(i, { label: e.target.value })} />
          </label>
          <label className={label}>Kind of box
            <select className={input} value={f.type} onChange={(e) => set(i, { type: e.target.value as CustomField["type"] })}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className={label}>Must the customer fill it in?
            <select className={input} value={f.required ? "yes" : "no"} onChange={(e) => set(i, { required: e.target.value === "yes" })}>
              <option value="yes">Yes, mandatory</option><option value="no">No, optional</option>
            </select>
          </label>
          {f.type !== "checkbox" && (
            <label className={label}>Hint inside the box (optional)
              <input className={input} value={f.placeholder} maxLength={80} placeholder="e.g. 03XX XXXXXXX" onChange={(e) => set(i, { placeholder: e.target.value })} />
            </label>
          )}
          {f.type === "select" && (
            <label className={`${label} sm:col-span-2`}>Choices (one per line, up to 20)
              <textarea className={input} rows={4} value={f.options.join("\n")} placeholder={"Morning\nAfternoon\nEvening"}
                onChange={(e) => set(i, { options: e.target.value.split("\n").map((o) => o.trim()).filter(Boolean).slice(0, 20) })} />
            </label>
          )}
          <div className="flex gap-2 sm:col-span-2">
            <button type="button" className="rounded border border-line px-3 py-1.5 text-xs disabled:opacity-40" disabled={i === 0} onClick={() => move(i, -1)}>Move up</button>
            <button type="button" className="rounded border border-line px-3 py-1.5 text-xs disabled:opacity-40" disabled={i === value.length - 1} onClick={() => move(i, 1)}>Move down</button>
            <button type="button" className="ml-auto rounded border border-red-400 px-3 py-1.5 text-xs text-red-400" onClick={() => { if (confirm(`Remove the box "${f.label || "(no name)"}"? Orders already placed keep their answers.`)) onChange(value.filter((_, k) => k !== i)); }}>Remove this box</button>
          </div>
        </div>
      ))}
      <button type="button" className="rounded border border-line px-4 py-2 text-sm disabled:opacity-40" disabled={value.length >= MAX} onClick={add}>+ Add a box</button>
    </div>
  );
}
