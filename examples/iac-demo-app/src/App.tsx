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

function App() {
  const [fixtures, setFixtures] = useState<Fixtures | null>(null);
  const [source, setSource] = useState("");
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
    setStageResult("Evaluating railway.ts…");
    await wait(300);
    setStageResult("Generated RailwayGraph v1…");
    await wait(300);
    setStageResult("Computed RailwayChangeSet v0…");
    await wait(300);
    setStageResult("Compiled EnvironmentConfig patch for existing Backboard substrate.");
    setSynced(true);
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

      <section className="workspace">
        <Panel title="1. railway.ts authoring" subtitle="Editable demo source; sync uses precomputed fixtures for now." wide>
          <textarea value={source} onChange={event => setSource(event.target.value)} spellCheck={false} />
        </Panel>

        <Panel title="2. Current graph" subtitle="Mocked Railway state: backend + Redis, no frontend.">
          <Code value={fixtures?.currentGraph} />
        </Panel>

        <Panel title="3. Desired RailwayGraph" subtitle="Pure deterministic project-state intermediate representation.">
          <Code value={fixtures?.graph} />
        </Panel>

        <Panel title="4. Diff preview" subtitle="Human-readable ChangeSet rendering.">
          <pre className="diff">{fixtures?.diff ?? "Loading…"}</pre>
        </Panel>

        <Panel title="5. RailwayChangeSet" subtitle="Intent-level operations and diagnostics.">
          <Code value={fixtures?.changeSet} />
        </Panel>

        <Panel title="6. EnvironmentConfig patch" subtitle="Current bridge to existing staged patch shape.">
          <Code value={fixtures?.patch} />
        </Panel>
      </section>
    </main>
  );
}

function Panel({ title, subtitle, wide, children }: { title: string; subtitle: string; wide?: boolean; children: React.ReactNode }) {
  return (
    <article className={wide ? "panel wide" : "panel"}>
      <div className="panelHeader">
        <h2>{title}</h2>
        <p>{subtitle}</p>
      </div>
      {children}
    </article>
  );
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return <div className="stat"><span>{label}</span><strong>{value}</strong></div>;
}

function Code({ value }: { value: unknown }) {
  return <pre>{value == null ? "Loading…" : JSON.stringify(value, null, 2)}</pre>;
}

function wait(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

createRoot(document.getElementById("root")!).render(<App />);
