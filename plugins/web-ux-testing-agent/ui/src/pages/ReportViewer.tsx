import { useEffect, useState } from "react";
import { getReport, listReports, type Report } from "../app/api";
import { StatusPill } from "../components/StatusPill";

export function ReportViewer({ run }: { run: string | null }) {
  const [runId, setRunId] = useState<string>(run || "");
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    if (run) {
      setRunId(run);
      getReport(run).then(setReport);
    } else {
      listReports().then((r) => {
        if (r[0]) {
          setRunId(r[0].run);
          getReport(r[0].run).then(setReport);
        }
      });
    }
  }, [run]);

  async function load() {
    if (runId) setReport(await getReport(runId));
  }

  const failed = report?.steps.filter((s) => s.status === "failed" || s.status === "timedout") ?? [];

  return (
    <div>
      <div className="row">
        <input value={runId} onChange={(e) => setRunId(e.target.value)} placeholder="run id" size={30} />
        <button className="primary" onClick={load}>
          Load report
        </button>
      </div>
      {!report && <p>No report loaded.</p>}
      {report && (
        <>
          <p>
            <StatusPill status={report.status} /> <strong>{report.plan_title || report.plan_id}</strong> ·{" "}
            {report.steps.length} steps · run {report.run_id}
          </p>
          <table>
            <thead>
              <tr>
                <th>#</th>
                <th>Step</th>
                <th>Status</th>
                <th>Duration</th>
              </tr>
            </thead>
            <tbody>
              {report.steps.map((s, i) => (
                <tr key={s.id}>
                  <td>{i + 1}</td>
                  <td>{s.title || s.id}</td>
                  <td>
                    <StatusPill status={s.status} />
                  </td>
                  <td>{s.duration_ms ?? 0}ms</td>
                </tr>
              ))}
            </tbody>
          </table>

          {failed.length > 0 && (
            <>
              <h3>Failed steps</h3>
              {failed.map((s) => (
                <div key={s.id}>
                  <strong>❌ {s.title || s.id}</strong>
                  <pre>{(s as { error?: { message?: string } }).error?.message ?? ""}</pre>
                </div>
              ))}
            </>
          )}

          {report.artifacts && (
            <>
              <h3>Artifacts</h3>
              <ul>
                {report.artifacts.trace && <li>Trace: {report.artifacts.trace}</li>}
                {report.artifacts.video && <li>Video: {report.artifacts.video}</li>}
                {(report.artifacts.screenshots ?? []).map((s) => (
                  <li key={s}>Screenshot: {s}</li>
                ))}
              </ul>
            </>
          )}

          {report.diagnosis && (
            <>
              <h3>Diagnosis</h3>
              <p>
                <strong>{report.diagnosis.category}</strong> ({report.diagnosis.confidence}) —{" "}
                {report.diagnosis.rationale}
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
