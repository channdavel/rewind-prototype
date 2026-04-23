import { useState, useEffect, useRef, useCallback } from "react";
import {
  SCENES, TOTAL_DURATION, EVIDENCE_CONNECTIONS, REQUIRED_FOR_INTERROGATION,
  INTERROGATION_STEPS, TRUST, SUPERVISOR_LINES, getSceneAt, formatTime
} from "./gameData";
import "./App.css";

/* ═══════ small components ═══════ */

function TagModal({ clue, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="tag-modal-label">TAG THIS MOMENT</div>
      <div className="tag-modal-title">{clue.label}</div>
      <div className="tag-modal-category">Category: {clue.category}</div>
      <div className="tag-modal-desc">{clue.desc}</div>
      <input className="tag-modal-input" placeholder="Add a note (optional)..."
        value={note} onChange={e => setNote(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onConfirm(note)} />
      <div className="tag-modal-actions">
        <button className="btn-confirm" onClick={() => onConfirm(note)}>Confirm tag</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DraggableNode({ node, isSelected, onSelect, onDrag }) {
  const ref = useRef(null);
  const drag = useRef(false);
  const off = useRef({ x: 0, y: 0 });
  const moved = useRef(false);

  function down(e) {
    drag.current = true;
    moved.current = false;
    off.current = { x: e.clientX - node.x, y: e.clientY - node.y };
    ref.current.setPointerCapture(e.pointerId);
  }
  function move(e) {
    if (!drag.current) return;
    moved.current = true;
    const r = ref.current.parentElement.getBoundingClientRect();
    node.x = Math.max(0, Math.min(e.clientX - off.current.x, r.width - 160));
    node.y = Math.max(0, Math.min(e.clientY - off.current.y, r.height - 50));
    ref.current.style.left = node.x + "px";
    ref.current.style.top = node.y + "px";
    onDrag();
  }
  function up(e) {
    if (!drag.current) return;
    drag.current = false;
    ref.current.releasePointerCapture(e.pointerId);
    /* only trigger select if it was a click, not a drag */
    if (!moved.current) onSelect(node.id);
  }

  return (
    <div ref={ref} className={`board-node${isSelected ? " selected" : ""}`}
      style={{ left: node.x, top: node.y }}
      onPointerDown={down} onPointerMove={move} onPointerUp={up}>
      <div className="board-node-title">{node.label}</div>
      <div className="board-node-cat">{node.category}</div>
    </div>
  );
}

function TrustMeter({ value, max }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const level = pct > 60 ? "high" : pct > 30 ? "mid" : "low";
  return (
    <div className="trust-bar">
      <div className="trust-label">
        <span>Supervisor Trust</span>
        <span>{Math.round(pct)}%</span>
      </div>
      <div className="trust-track">
        <div className={`trust-fill ${level}`} style={{ width: pct + "%" }} />
      </div>
    </div>
  );
}

/* ═══════ main app ═══════ */

export default function App() {
  /* ── core state ── */
  const [started, setStarted] = useState(false);
  const [screen, setScreen] = useState("vcr");
  const [playing, setPlaying] = useState(false);
  const [time, setTime] = useState(0);
  const [speed, setSpeed] = useState(1);
  const [tags, setTags] = useState([]);
  const [nodes, setNodes] = useState([]);
  const [connections, setConnections] = useState([]);
  const [selecting, setSelecting] = useState(null);
  const [tagFlash, setTagFlash] = useState(false);
  const [pendingClue, setPendingClue] = useState(null);
  const [tapeFinished, setTapeFinished] = useState(false);

  /* ── trust & supervisor ── */
  const [trust, setTrust] = useState(TRUST.startValue);
  const [supervisorMsg, setSupervisorMsg] = useState(SUPERVISOR_LINES.welcome);
  const [interrogationOpen, setInterrogationOpen] = useState(false);
  const [gameOver, setGameOver] = useState(null);

  /* ── interrogation ── */
  const [interrogationStep, setInterrogationStep] = useState("step1");
  const [interrogationLog, setInterrogationLog] = useState([]);
  const [showingChoices, setShowingChoices] = useState(true);
  const [strongAsked, setStrongAsked] = useState(false);

  const [, forceRender] = useState(0);
  const tickRef = useRef(null);

  const scene = getSceneAt(time);
  const clue = scene?.clue;
  const isTagged = clue && tags.some(t => t.id === clue.id);

  /* ── playback tick ── */
  const tick = useCallback(() => {
    setTime(prev => {
      const next = prev + speed;
      if (next >= TOTAL_DURATION) { setPlaying(false); setTapeFinished(true); return TOTAL_DURATION; }
      if (next < 0) { setPlaying(false); return 0; }
      return next;
    });
  }, [speed]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (playing) tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [playing, tick]);

  /* ── helpers ── */
  function changeTrust(delta) {
    setTrust(prev => {
      const next = Math.max(0, Math.min(TRUST.maxValue, prev + delta));
      if (next <= 0) { setGameOver("lose"); setSupervisorMsg(SUPERVISOR_LINES.gameOver); }
      else if (next < 30) setSupervisorMsg(SUPERVISOR_LINES.trustCritical);
      else if (delta < 0) setSupervisorMsg(SUPERVISOR_LINES.trustLow);
      return next;
    });
  }

  function getSolvedIds(conns) {
    return conns.map(c =>
      EVIDENCE_CONNECTIONS.find(ec => ec.needs.length === 2 && ec.needs.every(n => [c.from, c.to].includes(n)))
    ).filter(Boolean).map(m => m.id);
  }

  /* ── VCR controls ── */
  function play_tape() { setPlaying(true); setSpeed(1); setTapeFinished(false); }
  function pause_tape() { setPlaying(false); }

  function seek(e) {
    const r = e.currentTarget.getBoundingClientRect();
    setTime(Math.max(0, Math.min(((e.clientX - r.left) / r.width) * TOTAL_DURATION, TOTAL_DURATION)));
    setTapeFinished(false);
  }

  /* ── tagging ── */
  function startTag() {
    if (!clue || isTagged || playing) return;
    setPendingClue(clue); pause_tape();
  }

  function confirmTag(note) {
    if (!pendingClue) return;
    setTags(prev => [...prev, { ...pendingClue, note, time }]);
    setTagFlash(true);
    setTimeout(() => setTagFlash(false), 600);
    setPendingClue(null);
  }

  /* ── whiteboard ── */
  function addToBoard(tag) {
    if (nodes.some(n => n.id === tag.id)) return;
    const c = nodes.length;
    setNodes(prev => [...prev, {
      id: tag.id, label: tag.label, category: tag.category,
      x: 30 + (c % 3) * 180, y: 30 + Math.floor(c / 3) * 90
    }]);
  }

  function handleNodeSelect(id) {
    if (selecting === null) {
      setSelecting(id);
    } else if (selecting !== id) {
      const key = [selecting, id].sort().join("-");

      /* prevent duplicate connections */
      if (connections.some(c => c.key === key)) {
        setSelecting(null);
        return;
      }

      const newConn = { key, from: selecting, to: id };
      const updated = [...connections, newConn];

      /* check if this is a valid connection */
      const match = EVIDENCE_CONNECTIONS.find(ec =>
        ec.needs.length === 2 && ec.needs.every(n => [newConn.from, newConn.to].includes(n))
      );

      if (!match) {
        /* bad connection — trust penalty */
        changeTrust(TRUST.badConnection);
        setSupervisorMsg(SUPERVISOR_LINES.badConnection);
      } else {
        changeTrust(TRUST.connectionBatch);
        setSupervisorMsg(SUPERVISOR_LINES.connectionProgress);
      }

      setConnections(updated);

      /* check if interrogation should unlock */
      const solved = getSolvedIds(updated);
      if (REQUIRED_FOR_INTERROGATION.every(id => solved.includes(id)) && !interrogationOpen) {
        setInterrogationOpen(true);
        setSupervisorMsg(SUPERVISOR_LINES.interrogationUnlocked);
      }

      setSelecting(null);
    } else {
      setSelecting(null);
    }
  }

  /* ── interrogation ── */
  const currentStep = INTERROGATION_STEPS.find(s => s.id === interrogationStep);

  function chooseOption(choice) {
    if (gameOver) return;

    /* apply trust change */
    if (choice.trustChange !== 0) changeTrust(choice.trustChange);
    if (choice.trustChange > 5) setStrongAsked(true);

    /* add to log */
    const newEntry = { question: choice.text, response: choice.response };
    setInterrogationLog(prev => [...prev, newEntry]);

    /* handle terminal steps */
    if (choice.next === "step_accuse_strong" || choice.next === "step_accuse_early") {
      const solved = getSolvedIds(connections);
      const hasEvidence = REQUIRED_FOR_INTERROGATION.every(id => solved.includes(id));

      if (hasEvidence && (strongAsked || choice.next === "step_accuse_strong")) {
        setGameOver("win");
        setSupervisorMsg(SUPERVISOR_LINES.correctAccusation);
        setInterrogationLog(prev => [...prev, { question: "You accused Neil.", response: SUPERVISOR_LINES.correctAccusation }]);
      } else {
        changeTrust(-35);
        setInterrogationLog(prev => [...prev, { question: "You accused Neil.", response: SUPERVISOR_LINES.wrongAccusation }]);
      }
      setShowingChoices(false);
      return;
    }

    if (choice.next === "step_end_nothing") {
      changeTrust(-10);
      setSupervisorMsg(SUPERVISOR_LINES.endNothing);
      setInterrogationLog(prev => [...prev, { question: "", response: SUPERVISOR_LINES.endNothing }]);
      setShowingChoices(false);
      return;
    }

    if (choice.next === "step_end_cautious") {
      changeTrust(-5);
      setSupervisorMsg(SUPERVISOR_LINES.endCautious);
      setInterrogationLog(prev => [...prev, { question: "", response: SUPERVISOR_LINES.endCautious }]);
      setShowingChoices(false);
      return;
    }

    /* advance to next step */
    setInterrogationStep(choice.next);
  }

  /* ── derived ── */
  let tagBtnClass = "tag-btn";
  if (tagFlash) tagBtnClass += " flash";
  else if (clue && !isTagged && !playing) tagBtnClass += " ready";

  /* ═══════ render ═══════ */
  if (!started) {
    return (
      <div className="app">
        <h1 className="app-title">REWIND</h1>
        <div className="intro-screen">
          <p className="intro-text">You are a property clerk in the evidence department of a small-town police station.</p>
          <p className="intro-text">This afternoon, you cracked open a dusty box in the back of the storage room. Inside: a stack of old videotapes. Mislabeled. Partially damaged. No reliable dates.</p>
          <p className="intro-text">One tape is marked "Town Council 09/04" — but the footage doesn't match. It's security camera footage from a hardware store. Two men arguing behind the counter. A young man asking for money. A document that disappears before you can read it.</p>
          <p className="intro-text">These tapes are connected to the murder of Ray Dalton — a case from twenty years ago that was never closed.</p>
          <p className="intro-text">No one asked you to look. No one knows you have them.</p>
          <p className="intro-text-dim">Watch the tape. Tag what you find. Connect the evidence. Find the truth.</p>
          <button className="btn-start" onClick={() => setStarted(true)}>Begin investigation</button>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <h1 className="app-title">REWIND</h1>
      <p className="app-subtitle">Property Evidence — Case #04-1187 — Dalton, Ray (Homicide)</p>

      <TrustMeter value={trust} max={TRUST.maxValue} />
      {supervisorMsg && <div className="supervisor-msg">{supervisorMsg}</div>}

      <div className="nav">
        <button className={`nav-btn${screen === "vcr" ? " active" : ""}`} onClick={() => setScreen("vcr")}>VCR Playback</button>
        <button className={`nav-btn${screen === "tags" ? " active" : ""}`} onClick={() => setScreen("tags")}>Tags ({tags.length})</button>
        <button className={`nav-btn${screen === "board" ? " active" : ""}`} onClick={() => setScreen("board")}>Whiteboard ({nodes.length})</button>
        <button className={`nav-btn${screen === "interrogation" ? " active" : ""}${!interrogationOpen ? " locked" : ""}`}
          onClick={() => interrogationOpen && setScreen("interrogation")}>
          Interrogation {interrogationOpen ? "" : "(locked)"}
        </button>
      </div>

      {/* game over banner */}
      {gameOver && (
        <div className={`case-result ${gameOver}`}>
          <div className="case-result-title">{gameOver === "win" ? "CASE CLOSED — SOLVED" : "CASE CLOSED — REMOVED FROM CASE"}</div>
          <div className="case-result-text">{gameOver === "win" ? SUPERVISOR_LINES.correctAccusation : SUPERVISOR_LINES.gameOver}</div>
          <button className="btn-restart" onClick={() => window.location.reload()}>
            {gameOver === "win" ? "Play again" : "Try again"}
          </button>
        </div>
      )}

      {/* ══ VCR ══ */}
      {screen === "vcr" && !gameOver && (
        <div>
          <div className="crt">
            <div className="crt-scanlines" />
            <div className="crt-content">
              {pendingClue ? (
                <TagModal clue={pendingClue} onConfirm={confirmTag} onCancel={() => setPendingClue(null)} />
              ) : (
                <>
                  <div className="crt-status">
                    {playing && speed > 0 ? `▶${speed > 1 ? ` ${speed}x` : ""}` : playing && speed < 0 ? `◀◀ ${Math.abs(speed)}x` : "■ PAUSED"}{" "}
                    {formatTime(time)} / {formatTime(TOTAL_DURATION)}
                  </div>
                  <div className="crt-text">
                    {scene.type === "dialogue" && <span className="audio-label">AUDIO</span>}
                    {scene.text}
                  </div>
                  {clue && !isTagged && !playing && <div className="clue-hint available">Something noteworthy is on screen. Press TAG to mark it.</div>}
                  {isTagged && !playing && <div className="clue-hint tagged">Already tagged this moment.</div>}
                </>
              )}
            </div>
          </div>

          <div className="timeline" onClick={seek}>
            <div className="timeline-track" />
            <div className="timeline-progress" style={{ width: `${(time / TOTAL_DURATION) * 100}%` }} />
            {SCENES.filter(s => s.clue).map(s => (
              <div key={s.clue.id}
                className={`timeline-marker ${tags.some(t => t.id === s.clue.id) ? "found" : "untagged"}`}
                style={{ left: `${(s.time / TOTAL_DURATION) * 100}%`, width: `${(s.duration / TOTAL_DURATION) * 100}%` }} />
            ))}
          </div>

          <div className="controls">
            <button className="vcr-btn" onClick={() => { setPlaying(true); setSpeed(-2); setTapeFinished(false); }}>{"⏪"}</button>
            <button className="vcr-btn" onClick={playing ? pause_tape : play_tape}>{playing ? "⏸" : "▶"}</button>
            <button className="vcr-btn" onClick={() => { setPlaying(true); setSpeed(2); setTapeFinished(false); }}>{"⏩"}</button>
            <div className="spacer" />
            <button className={tagBtnClass} onClick={startTag} disabled={!clue || isTagged || playing}>TAG</button>
          </div>

          {tapeFinished && (
            <div className="tape-end">
              Tape ended. You tagged {tags.length}/4 clues.{" "}
              {tags.length < 4 ? "Rewind to look for anything you missed." : "All clues found! Head to the whiteboard."}
            </div>
          )}
        </div>
      )}

      {/* ══ TAGS ══ */}
      {screen === "tags" && !gameOver && (
        <div>
          {tags.length === 0 ? (
            <div className="empty-state">No tags yet. Watch the tape and tag moments that seem important.</div>
          ) : (
            <div className="tags-list">
              {tags.map(tag => (
                <div key={tag.id} className="tag-card">
                  <div className="tag-card-header">
                    <span className="tag-card-title">{tag.label}</span>
                    <span className="tag-card-meta">{formatTime(tag.time)} · {tag.category}</span>
                  </div>
                  <div className="tag-card-desc">{tag.desc}</div>
                  {tag.note && <div className="tag-card-note">Note: {tag.note}</div>}
                  <button className="btn-small" onClick={() => { addToBoard(tag); setScreen("board"); }}>
                    {nodes.some(n => n.id === tag.id) ? "On whiteboard ✓" : "Add to whiteboard"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ══ WHITEBOARD ══ */}
      {screen === "board" && !gameOver && (
        <div>
          {nodes.length === 0 ? (
            <div className="empty-state">No nodes yet. Tag clues from the tape, then add them here.</div>
          ) : (
            <>
              <div className="board-hint">
                {selecting ? "Click another node to connect — or click it again to cancel." : "Drag to arrange. Click two nodes to connect them. Wrong connections cost trust."}
              </div>
              <div className="board">
                <svg>
                  {connections.map(c => {
                    const a = nodes.find(n => n.id === c.from);
                    const b = nodes.find(n => n.id === c.to);
                    if (!a || !b) return null;
                    const isValid = EVIDENCE_CONNECTIONS.some(ec => ec.needs.length === 2 && ec.needs.every(n => [c.from, c.to].includes(n)));
                    return <line key={c.key} x1={a.x+75} y1={a.y+22} x2={b.x+75} y2={b.y+22}
                      stroke={isValid ? "#4a4" : "#c44"} strokeWidth={1.5} opacity={0.7} />;
                  })}
                </svg>
                {nodes.map(n => (
                  <DraggableNode key={n.id} node={n} isSelected={selecting === n.id}
                    onSelect={handleNodeSelect} onDrag={() => forceRender(x => x+1)} />
                ))}
              </div>

              {connections.length > 0 && (
                <div className="connections-list">
                  <div className="connections-title">Connections:</div>
                  {connections.map(c => {
                    const a = nodes.find(n => n.id === c.from);
                    const b = nodes.find(n => n.id === c.to);
                    const m = EVIDENCE_CONNECTIONS.find(ec => ec.needs.length === 2 && ec.needs.every(n => [c.from, c.to].includes(n)));
                    return (
                      <div key={c.key} className="connection-item">
                        {a?.label} ↔ {b?.label}
                        {m ? <span className="connection-match">(✓ {m.desc})</span> : <span className="connection-match" style={{color:"#a44"}}>(✗ no match)</span>}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* ══ INTERROGATION ══ */}
      {screen === "interrogation" && interrogationOpen && !gameOver && (
        <div>
          <div className="interrogation-header">
            <div className="interrogation-suspect">Neil Farner</div>
            <div className="interrogation-role">Ray's business partner</div>
          </div>

          {/* scrollable conversation log */}
          <div className="interrogation-scene">
            {interrogationLog.length === 0 && currentStep ? (
              <div className="interrogation-response">{currentStep.prompt}</div>
            ) : (
              <div>
                {interrogationLog.map((entry, i) => (
                  <div key={i} style={{ marginBottom: 16 }}>
                    {entry.question && <div style={{ color: "#4a7ab5", fontSize: 12, marginBottom: 4 }}>{"▶"} {entry.question}</div>}
                    <div className="interrogation-response">{entry.response}</div>
                  </div>
                ))}
                {showingChoices && currentStep && (
                  <div style={{ marginTop: 12, color: "#888", fontSize: 13, fontStyle: "italic" }}>{currentStep.prompt}</div>
                )}
              </div>
            )}
          </div>

          {/* choices for current step */}
          {showingChoices && currentStep && (
            <div className="questions-list">
              {currentStep.choices.map(ch => {
                const locked = ch.requiresEvidence && !tags.some(t => t.id === ch.requiresEvidence);
                const cls = locked ? "question-btn disabled" : "question-btn";
                return (
                  <button key={ch.id} className={cls} onClick={() => !locked && chooseOption(ch)} disabled={locked}>
                    {ch.text}
                    {ch.requiresEvidence && !locked && <span className="evidence-tag">Evidence: {tags.find(t => t.id === ch.requiresEvidence)?.label}</span>}
                    {locked && <span className="weak-tag">Requires evidence you haven't tagged</span>}
                    {ch.trustChange < -5 && <span className="weak-tag">Risky \u2014 may cost trust</span>}
                  </button>
                );
              })}
            </div>
          )}

          {/* interrogation ended without accusation = game over */}
          {!showingChoices && !gameOver && (
            <div className="case-result lose">
              <div className="case-result-title">INTERROGATION FAILED</div>
              <div className="case-result-text">
                You didn't build a strong enough case during the interrogation. The supervisor has lost confidence in your investigation.
              </div>
              <button className="btn-restart" onClick={() => window.location.reload()}>Try again</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}