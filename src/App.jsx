import { useState, useEffect, useRef, useCallback } from "react";
import { SCENES, EVIDENCE_CONNECTIONS, REQUIRED_CONNECTIONS, TOTAL_DURATION, getSceneAt, formatTime } from "./gameData";
import "./App.css";

/* ───── small components ───── */

function TagModal({ clue, onConfirm, onCancel }) {
  const [note, setNote] = useState("");
  return (
    <div>
      <div className="tag-modal-label">TAG THIS MOMENT</div>
      <div className="tag-modal-title">{clue.label}</div>
      <div className="tag-modal-category">Category: {clue.category}</div>
      <div className="tag-modal-desc">{clue.desc}</div>
      <input
        className="tag-modal-input"
        type="text"
        placeholder="Add a note (optional)..."
        value={note}
        onChange={e => setNote(e.target.value)}
        onKeyDown={e => e.key === "Enter" && onConfirm(note)}
      />
      <div className="tag-modal-actions">
        <button className="btn-confirm" onClick={() => onConfirm(note)}>Confirm tag</button>
        <button className="btn-cancel" onClick={onCancel}>Cancel</button>
      </div>
    </div>
  );
}

function DraggableNode({ node, isSelected, onSelect }) {
  const ref = useRef(null);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });

  function handlePointerDown(e) {
    dragging.current = true;
    offset.current = {
      x: e.clientX - node.x,
      y: e.clientY - node.y
    };
    ref.current.setPointerCapture(e.pointerId);
  }

  function handlePointerMove(e) {
    if (!dragging.current) return;
    const board = ref.current.parentElement;
    const rect = board.getBoundingClientRect();
    const newX = Math.max(0, Math.min(e.clientX - offset.current.x, rect.width - 160));
    const newY = Math.max(0, Math.min(e.clientY - offset.current.y, rect.height - 50));
    node.x = newX;
    node.y = newY;
    ref.current.style.left = newX + "px";
    ref.current.style.top = newY + "px";

    /* force SVG lines to update */
    ref.current.parentElement.dispatchEvent(new Event("nodedrag"));
  }

  function handlePointerUp(e) {
    if (!dragging.current) return;
    dragging.current = false;
    ref.current.releasePointerCapture(e.pointerId);
    onSelect(node.id);
  }

  return (
    <div
      ref={ref}
      className={`board-node ${isSelected ? "selected" : ""}`}
      style={{ left: node.x, top: node.y }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      <div className="board-node-title">{node.label}</div>
      <div className="board-node-cat">{node.category}</div>
    </div>
  );
}

/* ───── main app ───── */

export default function App() {
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
  const [, forceRender] = useState(0);
  const tickRef = useRef(null);

  const scene = getSceneAt(time);
  const clue = scene?.clue;
  const isTagged = clue && tags.some(t => t.id === clue.id);

  /* ── playback tick ── */
  const tick = useCallback(() => {
    setTime(prev => {
      const next = prev + speed;
      if (next >= TOTAL_DURATION) {
        setPlaying(false);
        setTapeFinished(true);
        return TOTAL_DURATION;
      }
      if (next < 0) {
        setPlaying(false);
        return 0;
      }
      return next;
    });
  }, [speed]);

  useEffect(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (playing) tickRef.current = setInterval(tick, 1000);
    return () => clearInterval(tickRef.current);
  }, [playing, tick]);

  /* ── controls ── */
  function play()  { setPlaying(true); setSpeed(1); setTapeFinished(false); }
  function pause() { setPlaying(false); }
  function rw()    { setPlaying(true); setSpeed(-2); setTapeFinished(false); }
  function ff()    { setPlaying(true); setSpeed(2); setTapeFinished(false); }

  function seek(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    setTime(Math.max(0, Math.min(pct * TOTAL_DURATION, TOTAL_DURATION)));
    setTapeFinished(false);
  }

  /* ── tagging ── */
  function startTag() {
    if (!clue || isTagged || playing) return;
    setPendingClue(clue);
    pause();
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
    const count = nodes.length;
    setNodes(prev => [...prev, {
      id: tag.id,
      label: tag.label,
      category: tag.category,
      x: 30 + (count % 3) * 180,
      y: 30 + Math.floor(count / 3) * 90
    }]);
  }

  function handleNodeSelect(id) {
    if (selecting === null) {
      setSelecting(id);
    } else if (selecting !== id) {
      const key = [selecting, id].sort().join("-");
      if (!connections.some(c => c.key === key)) {
        setConnections(prev => [...prev, { key, from: selecting, to: id }]);
      }
      setSelecting(null);
    } else {
      setSelecting(null);
    }
  }

  /* listen for drag events to re-render SVG lines */
  const boardRef = useRef(null);
  useEffect(() => {
    const el = boardRef.current;
    if (!el) return;
    const handler = () => forceRender(n => n + 1);
    el.addEventListener("nodedrag", handler);
    return () => el.removeEventListener("nodedrag", handler);
  });

  /* ── derived state ── */
  const matchedConnections = EVIDENCE_CONNECTIONS.filter(ec =>
    ec.needs.every(n => tags.some(t => t.id === n))
  );

  function getConnectionMatch(conn) {
    return EVIDENCE_CONNECTIONS.find(ec =>
      ec.needs.length === 2 && ec.needs.every(n => [conn.from, conn.to].includes(n))
    );
  }

  const solvedIds = connections
    .map(c => getConnectionMatch(c))
    .filter(Boolean)
    .map(m => m.id);

  const caseComplete = REQUIRED_CONNECTIONS.every(id => solvedIds.includes(id));

  /* ── tag button class ── */
  let tagBtnClass = "tag-btn";
  if (tagFlash) tagBtnClass += " flash";
  else if (clue && !isTagged && !playing) tagBtnClass += " ready";

  /* ── render ── */
  return (
    <div className="app">
      <h1 className="app-title">REWIND</h1>
      <p className="app-subtitle">Property Evidence — Case #04-1187 — Dalton, Ray (Homicide)</p>

      <div className="nav">
        <button className={`nav-btn ${screen === "vcr" ? "active" : ""}`} onClick={() => setScreen("vcr")}>VCR Playback</button>
        <button className={`nav-btn ${screen === "tags" ? "active" : ""}`} onClick={() => setScreen("tags")}>Tags ({tags.length})</button>
        <button className={`nav-btn ${screen === "board" ? "active" : ""}`} onClick={() => setScreen("board")}>Whiteboard ({nodes.length})</button>
      </div>

      {/* ══════ VCR ══════ */}
      {screen === "vcr" && (
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
              <div
                key={s.clue.id}
                className={`timeline-marker ${tags.some(t => t.id === s.clue.id) ? "found" : "untagged"}`}
                style={{ left: `${(s.time / TOTAL_DURATION) * 100}%`, width: `${(s.duration / TOTAL_DURATION) * 100}%` }}
              />
            ))}
          </div>

          <div className="controls">
            <button className="vcr-btn" onClick={rw}>⏪</button>
            <button className="vcr-btn" onClick={playing ? pause : play}>{playing ? "⏸" : "▶"}</button>
            <button className="vcr-btn" onClick={ff}>⏩</button>
            <div className="spacer" />
            <button className={tagBtnClass} onClick={startTag} disabled={!clue || isTagged || playing}>TAG</button>
          </div>

          {tapeFinished && (
            <div className="tape-end">
              Tape ended. You tagged {tags.length}/4 clues.{" "}
              {tags.length < 4
                ? "Rewind to look for anything you missed, or check your tags and whiteboard."
                : "All clues found! Head to the whiteboard to make connections."}
            </div>
          )}
        </div>
      )}

      {/* ══════ TAGS ══════ */}
      {screen === "tags" && (
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
          {tags.length > 0 && (
            <div className="tags-footer">
              Possible connections: {matchedConnections.length}/{EVIDENCE_CONNECTIONS.length}
            </div>
          )}
        </div>
      )}

      {/* ══════ WHITEBOARD ══════ */}
      {screen === "board" && (
        <div>
          {nodes.length === 0 ? (
            <div className="empty-state">No nodes yet. Tag clues on the tape, then add them here from the Tags screen.</div>
          ) : (
            <>
              <div className="board-hint">
                {selecting
                  ? `Click another node to connect to "${nodes.find(n => n.id === selecting)?.label}" — or click it again to cancel.`
                  : "Drag nodes to arrange them. Click one, then click another to draw a connection."}
              </div>
              <div className="board" ref={boardRef}>
                <svg>
                  {connections.map(c => {
                    const from = nodes.find(n => n.id === c.from);
                    const to = nodes.find(n => n.id === c.to);
                    if (!from || !to) return null;
                    return (
                      <line key={c.key}
                        x1={from.x + 75} y1={from.y + 22}
                        x2={to.x + 75} y2={to.y + 22}
                        stroke="#c44" strokeWidth={1.5} opacity={0.7}
                      />
                    );
                  })}
                </svg>
                {nodes.map(node => (
                  <DraggableNode
                    key={node.id}
                    node={node}
                    isSelected={selecting === node.id}
                    onSelect={handleNodeSelect}
                  />
                ))}
              </div>

              {connections.length > 0 && (
                <div className="connections-list">
                  <div className="connections-title">Connections made:</div>
                  {connections.map(c => {
                    const from = nodes.find(n => n.id === c.from);
                    const to = nodes.find(n => n.id === c.to);
                    const match = getConnectionMatch(c);
                    return (
                      <div key={c.key} className="connection-item">
                        {from?.label} ↔ {to?.label}
                        {match && <span className="connection-match">({match.desc})</span>}
                      </div>
                    );
                  })}
                </div>
              )}

              {caseComplete && (
                <div className="case-complete">
                  <div className="case-complete-title">CASE PROGRESS: READY TO REPORT</div>
                  <div className="case-complete-text">
                    You've established that Neil had an undisclosed insurance policy on Ray and that they were in a financial dispute. 
                    This is enough to bring to the supervisor. In the full game, this would unlock an interrogation with Neil 
                    and prompt you to review additional tapes for corroborating evidence.
                    <br /><br />
                    Demo complete. Thank you for playing.
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}