import { useEffect, useState } from "react";
import {
  getPlan,
  listPlans,
  savePlan,
  validatePlan,
  type PlanSummary
} from "../app/api";

export function PlanEditor() {
  const [plans, setPlans] = useState<PlanSummary[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [source, setSource] = useState<string>("");
  const [errors, setErrors] = useState<string[] | null>(null);
  const [notice, setNotice] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    listPlans().then((p) => {
      setPlans(p);
      if (p[0]) {
        setSelected(p[0].id);
        getPlan(p[0].id).then(setSource);
      }
    });
  }, []);

  async function load(id: string) {
    setSelected(id);
    setNotice(null);
    setErrors(null);
    setSource(await getPlan(id));
  }

  async function onValidate() {
    const res = await validatePlan(source);
    setErrors(res.errors);
    setNotice(res.valid ? { ok: true, text: "Plan is valid." } : null);
  }

  async function onSave() {
    const res = await validatePlan(source);
    setErrors(res.errors);
    if (!res.valid) {
      setNotice({ ok: false, text: "Fix validation errors before saving." });
      return;
    }
    const saved = await savePlan(selected || "untitled", source);
    setNotice({ ok: saved.ok, text: saved.message || (saved.ok ? "Plan saved." : "Save failed.") });
  }

  return (
    <div className="cols">
      <div>
        <h2>Plans</h2>
        <div className="list">
          {plans.map((p) => (
            <button key={p.id} className={p.id === selected ? "active" : ""} onClick={() => load(p.id)}>
              {p.title || p.id}
            </button>
          ))}
        </div>
      </div>
      <div>
        <div className="row">
          <input value={selected} onChange={(e) => setSelected(e.target.value)} placeholder="plan id" />
          <button className="primary" onClick={onValidate}>
            Validate
          </button>
          <button className="primary" onClick={onSave}>
            Save
          </button>
        </div>
        {notice && <div className={`notice ${notice.ok ? "ok" : "err"}`}>{notice.text}</div>}
        {errors && errors.length > 0 && (
          <div className="notice err">
            <strong>Validation errors</strong>
            <ul>
              {errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          </div>
        )}
        <textarea value={source} onChange={(e) => setSource(e.target.value)} spellCheck={false} />
      </div>
    </div>
  );
}
