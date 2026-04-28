// screens-mood.jsx — Mood-on-checkin sheet + per-day journal + mood chart + notes mgmt

const { useState: uSM, useMemo: uMM, useEffect: uEM } = React;

// 5-point mood scale, sad → happy
const MOODS = [
  { value: 1, face: '😢', label: 'Awful',   color: 'oklch(60% 0.12 30)' },
  { value: 2, face: '😕', label: 'Meh',     color: 'oklch(65% 0.10 60)' },
  { value: 3, face: '😐', label: 'Okay',    color: 'oklch(70% 0.04 90)' },
  { value: 4, face: '🙂', label: 'Good',    color: 'oklch(70% 0.10 145)' },
  { value: 5, face: '😄', label: 'Great',   color: 'oklch(68% 0.13 145)' },
];

// ── Sheet that opens after checking a habit done ──
function MoodCheckSheet({ habit, onClose, onSave, dateKey }) {
  const existing = (typeof habit.history[dateKey] === 'object' && habit.history[dateKey]) || {};
  const [mood, setMood] = uSM(existing.mood || 0);
  const [journal, setJournal] = uSM(existing.journal || '');

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card fade-up" style={{width:560}} onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{position:'absolute', top:18, right:18}}>
          <ICONS.close style={{width:13,height:13}}/>
        </button>
        <div className="eyebrow">Check-in · {fmt.short(dateKey)}</div>
        <h1 className="h1" style={{fontSize:30, marginTop:8, marginBottom:8, lineHeight:1.15}}>
          How did <em>{habit.name.toLowerCase()}</em> feel?
        </h1>
        <p style={{margin:'0 0 24px', fontFamily:'var(--serif)', fontSize:15, fontStyle:'italic', color:'var(--ink-3)', lineHeight:1.5}}>
          Optional — but tracking how habits make you <em>feel</em> reveals which ones are actually working.
        </p>

        {/* Mood scale */}
        <div style={{display:'flex', justifyContent:'space-between', gap:8, marginBottom:24}}>
          {MOODS.map(m => {
            const active = mood === m.value;
            return (
              <button key={m.value} onClick={() => setMood(m.value)}
                style={{
                  flex:1, padding:'18px 8px 12px', borderRadius:12,
                  border:'1px solid ' + (active ? m.color : 'var(--rule-strong)'),
                  background: active ? 'color-mix(in oklch, ' + m.color + ' 12%, var(--bg-elev))' : 'var(--bg-elev)',
                  cursor:'pointer', transition:'all .14s',
                  display:'flex', flexDirection:'column', alignItems:'center', gap:6,
                  transform: active ? 'translateY(-2px)' : 'none',
                }}>
                <span style={{fontSize:32, lineHeight:1, filter: active ? 'none' : 'saturate(0.4) opacity(0.65)'}}>{m.face}</span>
                <span className="mono" style={{fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase', color: active ? m.color : 'var(--ink-3)', fontWeight: active ? 600 : 400}}>
                  {m.label}
                </span>
              </button>
            );
          })}
        </div>

        {/* Journal */}
        <div style={{marginBottom:20}}>
          <div className="field-label">A line for your future self <span style={{color:'var(--ink-3)', textTransform:'none', letterSpacing:0, fontFamily:'var(--serif)', fontStyle:'italic', fontSize:11, fontWeight:400}}>· optional</span></div>
          <textarea className="input" rows={3} autoFocus
            placeholder={mood >= 4
              ? "What made today work? Capture it."
              : mood && mood <= 2
                ? "What got in the way? Be honest."
                : "How was it? Anything to remember?"}
            value={journal} onChange={e => setJournal(e.target.value)}/>
        </div>

        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:18, borderTop:'1px solid var(--rule)'}}>
          <button className="btn btn-ghost btn-sm" onClick={onClose}>Skip — just mark it done</button>
          <button className="btn btn-primary" onClick={() => { onSave({ mood: mood || undefined, journal: journal.trim() || undefined }); onClose(); }}>
            Save check-in
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Mood line chart for habit detail ──
function MoodChart({ habit, days = 30 }) {
  const data = uMM(() => {
    const arr = [];
    for (let i = days - 1; i >= 0; i--) {
      const k = dateAdd(todayKey(), -i);
      const entry = habit.history[k];
      const mood = (typeof entry === 'object' && entry && entry.mood) || null;
      arr.push({ k, mood });
    }
    return arr;
  }, [habit.history, days]);

  const moodPoints = data.filter(d => d.mood !== null);
  const avg = moodPoints.length ? moodPoints.reduce((s, d) => s + d.mood, 0) / moodPoints.length : 0;

  const W = 600, H = 140, P = 28;
  const chartW = W - P * 2, chartH = H - P * 2;
  const xStep = chartW / Math.max(1, days - 1);
  const yFor = (v) => P + chartH - ((v - 1) / 4) * chartH;

  // Build smooth path through valid points
  const path = [];
  data.forEach((d, i) => {
    if (d.mood === null) return;
    const x = P + i * xStep;
    const y = yFor(d.mood);
    path.push((path.length === 0 ? 'M' : 'L') + x.toFixed(1) + ',' + y.toFixed(1));
  });

  if (moodPoints.length === 0) {
    return (
      <div className="card card-pad" style={{textAlign:'center', padding:'28px 20px'}}>
        <div style={{fontFamily:'var(--serif)', fontSize:18, fontStyle:'italic', color:'var(--ink-3)', marginBottom:6}}>
          No mood data yet.
        </div>
        <div className="muted" style={{fontSize:12.5, lineHeight:1.5}}>
          Rate how you feel when you check in. The pattern over time shows which habits actually energize you.
        </div>
      </div>
    );
  }

  return (
    <div className="card card-pad">
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14}}>
        <div>
          <h3 className="h3" style={{margin:0}}>How it makes you feel</h3>
          <div className="muted" style={{fontSize:11.5, marginTop:3}}>Last {days} days · {moodPoints.length} check-ins rated</div>
        </div>
        <div style={{textAlign:'right'}}>
          <div className="mono" style={{fontSize:22, fontWeight:500}}>{MOODS[Math.round(avg) - 1]?.face} {avg.toFixed(1)}</div>
          <div className="muted mono" style={{fontSize:9.5, letterSpacing:'0.08em'}}>AVG</div>
        </div>
      </div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:'auto', display:'block'}}>
        {/* gridlines for 1..5 */}
        {[1,2,3,4,5].map(v => (
          <g key={v}>
            <line x1={P} x2={W-P} y1={yFor(v)} y2={yFor(v)}
              stroke="var(--rule)" strokeDasharray={v === 3 ? '0' : '2 4'}/>
            <text x={4} y={yFor(v) + 3} fontSize="10" fontFamily="var(--mono)" fill="var(--ink-3)">{v}</text>
          </g>
        ))}
        {/* path */}
        <path d={path.join(' ')} stroke="var(--accent)" strokeWidth="1.6" fill="none"
          strokeLinecap="round" strokeLinejoin="round"/>
        {/* dots */}
        {data.map((d, i) => {
          if (d.mood === null) return null;
          const x = P + i * xStep, y = yFor(d.mood);
          const m = MOODS[d.mood - 1];
          return <circle key={i} cx={x} cy={y} r="3" fill={m.color} stroke="var(--bg-elev)" strokeWidth="1.5"/>;
        })}
        {/* x labels */}
        <text x={P} y={H-6} fontSize="9" fontFamily="var(--mono)" fill="var(--ink-3)">{days}D AGO</text>
        <text x={W-P} y={H-6} fontSize="9" fontFamily="var(--mono)" fill="var(--ink-3)" textAnchor="end">TODAY</text>
      </svg>
    </div>
  );
}

// ── Per-day journal stream extracted from check-in objects ──
function HabitJournalStream({ habit, store }) {
  const entries = uMM(() => {
    return Object.entries(habit.history)
      .filter(([_, v]) => typeof v === 'object' && v && (v.journal || v.mood))
      .map(([date, v]) => ({ date, mood: v.mood, journal: v.journal }))
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [habit.history]);

  if (entries.length === 0) {
    return (
      <div className="card card-pad" style={{textAlign:'center', padding:'40px 20px'}}>
        <div style={{fontFamily:'var(--serif)', fontSize:18, fontStyle:'italic', color:'var(--ink-3)', marginBottom:8}}>
          No journal entries for this habit yet.
        </div>
        <div className="muted" style={{fontSize:12.5}}>
          When you check it done, you can capture a mood and a quick note. Those entries will live here.
        </div>
      </div>
    );
  }

  return (
    <div style={{display:'flex', flexDirection:'column', gap:12}}>
      {entries.map(e => {
        const m = e.mood ? MOODS[e.mood - 1] : null;
        return (
          <div key={e.date} className="card card-pad" style={{borderLeft: m ? `3px solid ${m.color}` : '1px solid var(--rule)'}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:e.journal ? 8 : 0}}>
              <div style={{display:'flex', alignItems:'center', gap:10}}>
                <span style={{fontSize:22, lineHeight:1}}>{m ? m.face : '·'}</span>
                <div>
                  <div className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em', textTransform:'uppercase'}}>
                    {fmt.short(e.date)}
                  </div>
                  {m && <div style={{fontSize:12.5, color:'var(--ink-2)', marginTop:1}}>{m.label}</div>}
                </div>
              </div>
              <button className="btn btn-sm btn-ghost" onClick={() => {
                store.logCheckIn(habit.id, { mood: undefined, journal: undefined }, e.date);
              }}>
                <ICONS.trash style={{width:12, height:12}}/>
              </button>
            </div>
            {e.journal && (
              <p style={{margin:0, fontFamily:'var(--serif)', fontSize:15, lineHeight:1.5, color:'var(--ink-2)'}}>
                {e.journal}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── Notes manager: add, remove, multi-select ──
function NotesManager({ habit, store }) {
  const [draft, setDraft] = uSM('');
  const [selected, setSelected] = uSM(new Set());
  const [bulkMode, setBulkMode] = uSM(false);

  const toggleSel = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };
  const addNote = () => {
    if (!draft.trim()) return;
    store.updateHabit(habit.id, {
      notes: [{ id: Date.now(), date: todayKey(), body: draft.trim() }, ...habit.notes],
    });
    setDraft('');
  };
  const deleteSelected = () => {
    store.updateHabit(habit.id, {
      notes: habit.notes.filter(n => !selected.has(n.id)),
    });
    setSelected(new Set());
    setBulkMode(false);
  };
  const deleteOne = (id) => {
    store.updateHabit(habit.id, {
      notes: habit.notes.filter(n => n.id !== id),
    });
  };

  return (
    <div>
      {/* Composer */}
      <div className="card card-pad" style={{marginBottom:16}}>
        <textarea className="input" rows={2} placeholder="Add a note for this habit…"
          value={draft} onChange={e => setDraft(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) addNote(); }}/>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:8}}>
          <span className="muted mono" style={{fontSize:10, letterSpacing:'0.06em'}}>⌘ + ENTER TO SAVE</span>
          <button className="btn btn-sm btn-primary" onClick={addNote} disabled={!draft.trim()}>Add note</button>
        </div>
      </div>

      {/* Toolbar */}
      {habit.notes.length > 0 && (
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12, padding:'0 4px'}}>
          <div className="muted mono" style={{fontSize:11, letterSpacing:'0.06em'}}>
            {bulkMode && selected.size > 0
              ? `${selected.size} OF ${habit.notes.length} SELECTED`
              : `${habit.notes.length} NOTE${habit.notes.length === 1 ? '' : 'S'}`}
          </div>
          <div style={{display:'flex', gap:6}}>
            {bulkMode ? (
              <>
                {selected.size > 0 && (
                  <>
                    <button className="btn btn-sm" onClick={() => setSelected(new Set(habit.notes.map(n => n.id)))}>
                      Select all
                    </button>
                    <button className="btn btn-sm" onClick={deleteSelected}
                      style={{borderColor:'oklch(60% 0.18 30)', color:'oklch(50% 0.18 30)'}}>
                      <ICONS.trash style={{width:12,height:12}}/> Delete {selected.size}
                    </button>
                  </>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => { setBulkMode(false); setSelected(new Set()); }}>
                  Done
                </button>
              </>
            ) : (
              <button className="btn btn-sm btn-ghost" onClick={() => setBulkMode(true)}>Select…</button>
            )}
          </div>
        </div>
      )}

      {/* Notes list */}
      {habit.notes.length === 0 ? (
        <div className="card card-pad" style={{textAlign:'center', color:'var(--ink-3)', fontStyle:'italic', fontFamily:'var(--serif)', fontSize:16, padding:'40px 20px'}}>
          No standalone notes yet. Add one above, or capture them inline when you check in.
        </div>
      ) : (
        <div style={{display:'flex', flexDirection:'column', gap:10}}>
          {habit.notes.map(n => {
            const isSel = selected.has(n.id);
            return (
              <div key={n.id} className="card card-pad"
                onClick={() => bulkMode && toggleSel(n.id)}
                style={{
                  cursor: bulkMode ? 'pointer' : 'default',
                  background: isSel ? 'var(--accent-soft)' : 'var(--bg-elev)',
                  borderColor: isSel ? 'var(--accent)' : 'var(--rule)',
                  display:'flex', alignItems:'flex-start', gap:14,
                }}>
                {bulkMode && (
                  <div style={{
                    width:18, height:18, borderRadius:4, flexShrink:0, marginTop:2,
                    border: '1.5px solid ' + (isSel ? 'var(--accent)' : 'var(--rule-strong)'),
                    background: isSel ? 'var(--accent)' : 'transparent',
                    display:'flex', alignItems:'center', justifyContent:'center',
                    color:'var(--bg)',
                  }}>
                    {isSel && <ICONS.check style={{width:12, height:12}}/>}
                  </div>
                )}
                <div style={{flex:1, minWidth:0}}>
                  <div className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:6}}>
                    {fmt.short(n.date)}
                  </div>
                  <p style={{margin:0, fontSize:14, lineHeight:1.5}}>{n.body}</p>
                </div>
                {!bulkMode && (
                  <button className="btn btn-sm btn-ghost" onClick={(e) => { e.stopPropagation(); deleteOne(n.id); }}
                    style={{flexShrink:0, opacity:0.6}}
                    onMouseEnter={(e) => e.currentTarget.style.opacity = 1}
                    onMouseLeave={(e) => e.currentTarget.style.opacity = 0.6}>
                    <ICONS.trash style={{width:12, height:12}}/>
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

window.MoodCheckSheet = MoodCheckSheet;
window.MoodChart = MoodChart;
window.HabitJournalStream = HabitJournalStream;
window.NotesManager = NotesManager;
window.MOODS = MOODS;
