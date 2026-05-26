import { useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";

type Fixtures = {
  source: string;
  graph: unknown;
  currentGraph: unknown;
  changeSet: { changes?: Array<{ summary?: string; severity?: string; deployEffect?: string }> };
  patch: unknown;
  diff: string;
};

type VisiblePane = "currentGraph" | "graph" | "diff" | "changeSet" | "patch";

function App() {
  const [fixtures, setFixtures] = useState<Fixtures | null>(null);
  const [source, setSource] = useState("");
  const [visiblePanes, setVisiblePanes] = useState<Set<VisiblePane>>(new Set());
  const [synced, setSynced] = useState(false);
  const [stageResult, setStageResult] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch("/fixtures/railway.ts").then(response => response.text()),
      fetch("/fixtures/graph.json").then(response => response.json()),
      fetch("/fixtures/current-graph.json").then(response => response.json()),
      fetch("/fixtures/change-set.json").then(response => response.json()),
      fetch("/fixtures/patch.json").then(response => response.json()),
      fetch("/fixtures/diff.txt").then(response => response.text()),
    ]).then(([loadedSource, graph, currentGraph, changeSet, patch, diff]) => {
      setFixtures({ source: loadedSource, graph, currentGraph, changeSet, patch, diff });
      setSource(loadedSource);
    }).catch(error => {
      setStageResult(`Failed to load fixtures: ${String(error)}`);
    });
  }, []);

  const changeCount = fixtures?.changeSet.changes?.length ?? 0;
  const destructiveCount = useMemo(
    () => fixtures?.changeSet.changes?.filter(change => change.severity === "destructive").length ?? 0,
    [fixtures],
  );

  async function mockSync() {
    setSynced(false);
    setVisiblePanes(new Set());
    setStageResult("Loading mocked current Railway state…");
    await reveal("currentGraph");
    setStageResult("Evaluating railway.ts into RailwayGraph v1…");
    await reveal("graph");
    setStageResult("Rendering human-readable diff…");
    await reveal("diff");
    setStageResult("Computing RailwayChangeSet v0…");
    await reveal("changeSet");
    setStageResult("Compiling EnvironmentConfig patch for existing Backboard substrate…");
    await reveal("patch");
    setStageResult("Sync preview ready. Nothing was sent to Backboard.");
    setSynced(true);
  }

  function refreshSource() {
    if (!fixtures) return;
    setSource(fixtures.source);
    setStageResult("Reloaded railway.ts from fixture.");
  }

  function clearAll() {
    setVisiblePanes(new Set());
    setSynced(false);
    setStageResult("Cleared generated panes. railway.ts authoring remains loaded.");
  }

  async function reveal(pane: VisiblePane) {
    await wait(350);
    setVisiblePanes(previous => new Set([...previous, pane]));
  }

  async function mockStage() {
    setStageResult("Mock stage only: this demo does not call Backboard. In production this payload would go to environmentStageChanges, or future Backboard would accept RailwayChangeSet directly.");
  }

  return (
    <main>
      <header className="hero">
        <div>
          <p className="eyebrow">Railway Project State Prototype</p>
          <h1>IaC sync flow, mocked end-to-end</h1>
          <p className="lede">Author TypeScript, evaluate to a deterministic graph, compute an intent-level ChangeSet, then bridge to the current EnvironmentConfig patch substrate.</p>
        </div>
        <div className="actions">
          <button onClick={mockSync} disabled={!fixtures}>Sync</button>
          <button className="secondary" onClick={refreshSource} disabled={!fixtures}>Refresh railway.ts</button>
          <button className="secondary" onClick={clearAll} disabled={!fixtures}>Clear panes</button>
          <button className="secondary" onClick={mockStage} disabled={!synced}>Stage patch mock</button>
        </div>
      </header>

      <section className="stats">
        <Stat label="Changes" value={changeCount} />
        <Stat label="Destructive" value={destructiveCount} />
        <Stat label="Backboard" value="mocked" />
        <Stat label="Protocol" value="v0" />
      </section>

      {stageResult && <div className="status">{stageResult}</div>}

      <section className="workspace split">
        <Panel title="1. railway.ts authoring" subtitle="Editable demo source; sync uses precomputed fixtures for now." sticky>
          <CodeEditor value={source} onChange={setSource} />
        </Panel>

        <div className="outputs">
          <TimelinePanel step={2} active={visiblePanes.has("currentGraph")} title="Current graph" subtitle="Mocked Railway state: backend + Redis, no frontend.">
            <Code value={visiblePanes.has("currentGraph") ? fixtures?.currentGraph : null} />
          </TimelinePanel>

          <TimelinePanel step={3} active={visiblePanes.has("graph")} title="Desired RailwayGraph" subtitle="Pure deterministic project-state intermediate representation.">
            <Code value={visiblePanes.has("graph") ? fixtures?.graph : null} />
          </TimelinePanel>

          <TimelinePanel step={4} active={visiblePanes.has("diff")} title="Diff preview" subtitle="Human-readable ChangeSet rendering.">
            <HighlightedDiff value={visiblePanes.has("diff") ? fixtures?.diff : "Waiting for sync…"} />
          </TimelinePanel>

          <TimelinePanel step={5} active={visiblePanes.has("changeSet")} title="RailwayChangeSet" subtitle="Intent-level operations and diagnostics.">
            <Code value={visiblePanes.has("changeSet") ? fixtures?.changeSet : null} />
          </TimelinePanel>

          <TimelinePanel step={6} active={visiblePanes.has("patch")} title="EnvironmentConfig patch" subtitle="Current bridge to existing staged patch shape.">
            <Code value={visiblePanes.has("patch") ? fixtures?.patch : null} />
          </TimelinePanel>
        </div>
      </section>
    </main>
  );
}

function Panel({ title, subtitle, sticky, children }: { title: string; subtitle: string; sticky?: boolean; children: React.ReactNode }) {
  return (
    <article className={sticky ? "panel sticky" : "panel"}>
      <div className="panelHeader">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function TimelinePanel({ step, active, title, subtitle, children }: { step: number; active: boolean; title: string; subtitle: string; children: React.ReactNode }) {
  return (
    <div className={active ? "timelineItem active" : "timelineItem"}>
      <div className="timelineMarker">{step}</div>
      <Panel title={title} subtitle={subtitle}>{children}</Panel>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Code({ value }: { value: unknown }) {
  return <pre className="code" dangerouslySetInnerHTML={{ __html: highlightJson(value == null ? "Loading…" : JSON.stringify(value, null, 2)) }} />;
}

function CodeEditor({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  return (
    <div className="editor">
      <pre className="editorHighlight" aria-hidden dangerouslySetInnerHTML={{ __html: highlightTs(value) }} />
      <textarea
        value={value}
        onChange={event => onChange(event.target.value)}
        spellCheck={false}
        aria-label="railway.ts authoring"
      />
    </div>
  );
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

function highlightTs(value: string) {
  return escapeHtml(value)
    .replace(/(\/\/.*)$/gm, '<span class="tok-comment">$1</span>')
    .replace(/(&quot;[^&]*?&quot;|'[^']*?'|`[^`]*?`)/g, '<span class="tok-string">$1</span>')
    .replace(/\b(import|from|export|default|const|return|type|function)\b/g, '<span class="tok-keyword">$1</span>')
    .replace(/\b(defineRailway|project|service|github|redis|postgres|mysql|mongo|bucket|volume)\b/g, '<span class="tok-call">$1</span>');
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createRoot(document.getElementById("root")!).render(<App />);
