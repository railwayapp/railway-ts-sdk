import { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

const demoServerUrl = "http://localhost:8787";

type ConnectionSettings = {
  graphqlUrl: string;
  token: string;
  projectId: string;
  environmentId: string;
  railwayFile: string;
};

type Fixtures = {
  source: string;
  graph: unknown;
  currentGraph: unknown;
  changeSet: { changes?: Array<{ summary?: string; severity?: string; deployEffect?: string }> };
  currentConfig?: unknown;
  graphTypes?: string;
  mode?: "real" | "mock";
  diff: string;
};

type VisiblePane = "currentGraph" | "graph" | "diff" | "changeSet" | "patch";

function App() {
  const [fixtures, setFixtures] = useState<Fixtures | null>(null);
  const [visiblePanes, setVisiblePanes] = useState<Set<VisiblePane>>(new Set());
  const [synced, setSynced] = useState(false);
  const [stageResult, setStageResult] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settings, setSettings] = useState<ConnectionSettings>(() => loadSettings());

  useEffect(() => {
    fetch(`${demoServerUrl}/api/source`)
      .then(response => response.json())
      .then((payload: { source: string }) => {
        setFixtures({ source: payload.source, graph: null, currentGraph: null, changeSet: {}, diff: "" });
      })
      .catch(error => {
        setStageResult(`Failed to load railway.ts from demo server: ${String(error)}`);
      });
  }, []);

  async function sync() {
    setSynced(false);
    setVisiblePanes(new Set());
    setStageResult("Server evaluating railway.ts and querying Backboard current state…");
    try {
      const payload = await postJson<Fixtures>(`${demoServerUrl}/api/sync`, { settings });
      setFixtures(payload);
      setStageResult(payload.mode === "real" ? "Loaded real Backboard current graph." : "Loaded mocked current graph. Add Backboard settings for real state.");
      await reveal("currentGraph");
      setStageResult("Evaluated desired RailwayGraph v1.");
      await reveal("graph");
      setStageResult("Rendered human-readable diff.");
      await reveal("diff");
      setStageResult("Computed RailwayChangeSet v0.");
      await reveal("changeSet");
      setStageResult("Ready to submit ChangeSet to Backboard for server-side patch staging.");
      setSynced(true);
    } catch (error) {
      setStageResult(`Sync failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function clearAll() {
    setVisiblePanes(new Set());
    setSynced(false);
    setStageResult("Cleared generated panes.");
  }

  async function reveal(pane: VisiblePane) {
    await wait(350);
    setVisiblePanes(previous => new Set([...previous, pane]));
  }

  async function stageChangeSet() {
    if (!fixtures) return;
    if (!settings.graphqlUrl || !settings.token || !settings.environmentId) {
      setSettingsOpen(true);
      setStageResult("Add Backboard URL, token, and environment ID before staging.");
      return;
    }

    setStageResult("Submitting RailwayChangeSet to Backboard…");
    try {
      const result = await postJson<{ id: string; patch: unknown }>(`${demoServerUrl}/api/stage`, { settings, changeSet: fixtures.changeSet });
      setStageResult(`Staged real Backboard patch: ${result.id}`);
    } catch (error) {
      setStageResult(`Backboard staging failed: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  function saveSettings(next: ConnectionSettings) {
    setSettings(next);
    localStorage.setItem("railway-iac-demo-settings", JSON.stringify(next));
    setSettingsOpen(false);
    setStageResult("Saved Backboard connection settings.");
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Railway Project State Prototype</p>
          <h1>IaC sync flow, server-backed</h1>
          <p className="lede">Server reads railway.ts, evaluates a deterministic graph, optionally queries Backboard for real current state, computes a ChangeSet, then submits it to Backboard for staging.</p>
        </div>
        <div className="actions">
          <div className="primaryActions">
            <button onClick={sync} disabled={!fixtures}>Sync</button>
            <button className="secondary" onClick={clearAll} disabled={!fixtures}>Clear</button>
            <button className="secondary" onClick={stageChangeSet} disabled={!synced}>Stage</button>
            <button onClick={stageChangeSet} disabled={!synced}>Submit</button>
          </div>
          <button className="ghost" onClick={() => setSettingsOpen(true)}>Settings</button>
        </div>
      </header>

      {stageResult && <div className="status">{stageResult}</div>}
      {settingsOpen && <SettingsModal settings={settings} onCancel={() => setSettingsOpen(false)} onSave={saveSettings} />}

      <section className="workspace">
        <div className="outputs">
          <TimelinePanel step={1} active={visiblePanes.has("currentGraph")} title="Current graph">
            <Code value={visiblePanes.has("currentGraph") ? fixtures?.currentGraph : null} />
          </TimelinePanel>

          <TimelinePanel step={2} active={visiblePanes.has("graph")} title="Desired RailwayGraph">
            <Code value={visiblePanes.has("graph") ? fixtures?.graph : null} />
          </TimelinePanel>

          <TimelinePanel step={3} active={visiblePanes.has("diff")} title="Diff preview">
            <HighlightedDiff value={visiblePanes.has("diff") ? fixtures?.diff : "Waiting for sync…"} />
          </TimelinePanel>

          <TimelinePanel step={4} active={visiblePanes.has("changeSet")} title="RailwayChangeSet">
            <Code value={visiblePanes.has("changeSet") ? fixtures?.changeSet : null} />
          </TimelinePanel>

          <TimelinePanel step={5} active={synced} title="Backboard staging">
            <Code value={synced ? { endpoint: "environmentStageChangeSet", mode: fixtures?.mode ?? "mock", note: "Click Stage real ChangeSet to submit." } : null} />
          </TimelinePanel>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <article className="panel">
      <div className="panelHeader">
        <h2>{title}</h2>
      </div>
      {children}
    </article>
  );
}

function TimelinePanel({ step, active, title, children }: { step: number; active: boolean; title: string; children: React.ReactNode }) {
  return (
    <div className={active ? "timelineItem active" : "timelineItem"}>
      <div className="timelineMarker">{step}</div>
      <Panel title={title}>{children}</Panel>
    </div>
  );
}

function SettingsModal({ settings, onCancel, onSave }: { settings: ConnectionSettings; onCancel: () => void; onSave: (settings: ConnectionSettings) => void }) {
  const [draft, setDraft] = useState(settings);
  return (
    <div className="modalBackdrop">
      <form className="modal" onSubmit={event => { event.preventDefault(); onSave(draft); }}>
        <h2>Backboard connection</h2>
        <p>Use localdev/develop GraphQL. Token stays in this browser localStorage.</p>
        <label>GraphQL URL<input value={draft.graphqlUrl} onChange={event => setDraft({ ...draft, graphqlUrl: event.target.value })} placeholder="http://localhost:3000/graphql/v2" /></label>
        <label>Token<input value={draft.token} onChange={event => setDraft({ ...draft, token: event.target.value })} placeholder="railway token" type="password" /></label>
        <label>Project ID<input value={draft.projectId} onChange={event => setDraft({ ...draft, projectId: event.target.value })} placeholder="project id" /></label>
        <label>Environment ID<input value={draft.environmentId} onChange={event => setDraft({ ...draft, environmentId: event.target.value })} placeholder="environment id" /></label>
        <label>Railway file<input value={draft.railwayFile} onChange={event => setDraft({ ...draft, railwayFile: event.target.value })} placeholder="optional absolute path" /></label>
        <div className="modalActions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit">Save</button></div>
      </form>
    </div>
  );
}

function Code({ value }: { value: unknown }) {
  return <pre className="code" dangerouslySetInnerHTML={{ __html: highlightJson(value == null ? "Loading…" : JSON.stringify(value, null, 2)) }} />;
}

function HighlightedDiff({ value }: { value: string | undefined }) {
  const lines = (value ?? "Waiting for sync…").split("\n");
  return (
    <pre className="diff">
      {lines.map((line, index) => (
        <span key={index} className={line.startsWith("+") ? "plus" : line.startsWith("-") ? "minus" : line.startsWith("~") ? "change" : undefined}>
          {line}{"\n"}
        </span>
      ))}
    </pre>
  );
}

function highlightJson(value: string) {
  return escapeHtml(value)
    .replace(/(&quot;[^&]*?&quot;)(\s*:)/g, '<span class="tok-key">$1</span>$2')
    .replace(/(:\s*)(&quot;[^&]*?&quot;)/g, '$1<span class="tok-string">$2</span>')
    .replace(/\b(true|false|null)\b/g, '<span class="tok-literal">$1</span>')
    .replace(/\b(-?\d+(?:\.\d+)?)\b/g, '<span class="tok-number">$1</span>');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) throw new Error(payload.error ?? response.statusText);
  return payload as T;
}

function loadSettings(): ConnectionSettings {
  try {
    const raw = localStorage.getItem("railway-iac-demo-settings");
    if (raw) return JSON.parse(raw) as ConnectionSettings;
  } catch {
    // Ignore corrupt local demo settings.
  }
  return {
    graphqlUrl: "http://localhost:3000/graphql/v2",
    token: "",
    projectId: "",
    environmentId: "",
    railwayFile: "",
  };
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createRoot(document.getElementById("root")!).render(<App />);
