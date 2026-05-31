import { useState } from "react";
import { PlanEditor } from "../pages/PlanEditor";
import { ReportViewer } from "../pages/ReportViewer";
import { TestRunHistory } from "../pages/TestRunHistory";

type Tab = "plan" | "report" | "history";

export function App() {
  const [tab, setTab] = useState<Tab>("plan");
  const [activeRun, setActiveRun] = useState<string | null>(null);

  function openReport(run: string) {
    setActiveRun(run);
    setTab("report");
  }

  return (
    <div className="app">
      <header className="app__header">
        <h1>Web UX Testing Agent</h1>
        <nav className="app__nav">
          <button className={tab === "plan" ? "active" : ""} onClick={() => setTab("plan")}>
            Plan Editor
          </button>
          <button className={tab === "report" ? "active" : ""} onClick={() => setTab("report")}>
            Report Viewer
          </button>
          <button className={tab === "history" ? "active" : ""} onClick={() => setTab("history")}>
            Run History
          </button>
        </nav>
      </header>
      <main className="app__main">
        {tab === "plan" && <PlanEditor />}
        {tab === "report" && <ReportViewer run={activeRun} />}
        {tab === "history" && <TestRunHistory onOpen={openReport} />}
      </main>
      <footer className="app__footer">
        Local fallback UI · primary experience is the MCP App. See docs/mcp-app.md.
      </footer>
    </div>
  );
}
