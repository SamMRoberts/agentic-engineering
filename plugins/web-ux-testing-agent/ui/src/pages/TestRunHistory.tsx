import { useEffect, useState } from "react";
import { listReports, type ReportSummary } from "../app/api";
import { StatusPill } from "../components/StatusPill";

export function TestRunHistory({ onOpen }: { onOpen: (run: string) => void }) {
  const [reports, setReports] = useState<ReportSummary[]>([]);

  useEffect(() => {
    listReports().then(setReports);
  }, []);

  return (
    <div>
      <h2>Run history</h2>
      {reports.length === 0 && <p>No runs recorded yet.</p>}
      <table>
        <thead>
          <tr>
            <th>Run</th>
            <th>Plan</th>
            <th>Status</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          {reports.map((r) => (
            <tr key={r.run}>
              <td>{r.run}</td>
              <td>{r.plan_id}</td>
              <td>
                <StatusPill status={r.status} />
              </td>
              <td>
                <button className="primary" onClick={() => onOpen(r.run)}>
                  View
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
