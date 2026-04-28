// screens-habits.jsx — Habits list + single habit detail + create flow

const { useState: uS2, useMemo: uM2, useEffect: uE2 } = React;

function HabitsListScreen({ store, goToHabit, goToCreate }) {
  const { habits, streak, longestStreak, completionRate } = store;
  const [filter, setFilter] = uS2('all');
  const [sort, setSort] = uS2('streak');

  const filtered = uM2(() => {
    let list = habits;
    if (filter === 'morning') list = list.filter(h => h.time === 'Morning');
    if (filter === 'afternoon') list = list.filter(h => h.time === 'Afternoon');
    if (filter === 'evening') list = list.filter(h => h.time === 'Evening');
    return [...list].sort((a, b) => {
      if (sort === 'streak') return streak(b) - streak(a);
      if (sort === 'rate') return completionRate(b) - completionRate(a);
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
      return a.name.localeCompare(b.name);
    });
  }, [habits, filter, sort, streak, completionRate]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Library</div>
          <h1 className="h1">All <em>habits</em></h1>
        </div>
        <button className="btn btn-primary" onClick={goToCreate}>
          <ICONS.plus style={{width:13,height:13}}/> New habit
        </button>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18}}>
        <div className="tabs" style={{borderBottom:'none', margin:0}}>
          {['all','morning','afternoon','evening'].map(f => (
            <button key={f} className={`tab ${filter===f?'active':''}`} onClick={() => setFilter(f)}>
              {f[0].toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
        <select className="input" style={{width:'auto', height:32, padding:'0 28px 0 12px', fontSize:12.5}}
          value={sort} onChange={e => setSort(e.target.value)}>
          <option value="streak">Sort: Active streak</option>
          <option value="rate">Sort: 30-day rate</option>
          <option value="newest">Sort: Newest</option>
          <option value="name">Sort: Name</option>
        </select>
      </div>

      <div className="card">
        <div style={{display:'grid', gridTemplateColumns:'2fr 1.4fr 90px 90px 100px', padding:'12px 22px', borderBottom:'1px solid var(--rule)', background:'var(--bg-sunk)'}}>
          {['Habit','Cue → response','Streak','Best','30-day'].map(h => (
            <div key={h} className="mono" style={{fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase', color:'var(--ink-3)'}}>{h}</div>
          ))}
        </div>
        {filtered.map(h => {
          const s = streak(h), b = longestStreak(h), r = Math.round(completionRate(h) * 100);
          return (
            <div key={h.id} className="click-row"
              style={{display:'grid', gridTemplateColumns:'2fr 1.4fr 90px 90px 100px', padding:'18px 22px', borderBottom:'1px solid var(--rule)', alignItems:'center'}}
              onClick={() => goToHabit(h.id)}>
              <div>
                <div className="habit-name">{h.name}</div>
                <div className="muted mono" style={{fontSize:10.5, marginTop:3, letterSpacing:'0.04em', textTransform:'uppercase'}}>
                  {h.identity} · {h.schedule}
                </div>
              </div>
              <div className="muted" style={{fontSize:12, fontStyle:'italic', fontFamily:'var(--serif)', lineHeight:1.35}}>
                "{h.cue.slice(0, 38)}{h.cue.length > 38 ? '…' : ''}"
              </div>
              <div className="mono" style={{fontSize:13, fontWeight:500}}>{s}d</div>
              <div className="mono muted" style={{fontSize:13}}>{b}d</div>
              <div style={{display:'flex', alignItems:'center', gap:8}}>
                <div style={{flex:1, height:4, background:'var(--bg-sunk)', borderRadius:99, overflow:'hidden'}}>
                  <div style={{width:`${r}%`, height:'100%', background:'var(--accent)'}}/>
                </div>
                <span className="mono" style={{fontSize:11, color:'var(--ink-3)', minWidth:24, textAlign:'right'}}>{r}%</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Single habit detail ───────────────────────────
function HabitDetailScreen({ store, habitId, goBack }) {
  const { habits, toggleHabit, logCheckIn, streak, longestStreak, completionRate, updateHabit } = store;
  const habit = habits.find(h => h.id === habitId);
  const [tab, setTab] = uS2('overview');
  const [showContract, setShowContract] = uS2(false);
  const [showMood, setShowMood] = uS2(false);
  if (!habit) return <div>Not found</div>;

  const today = todayKey();
  const isDone = !!habit.history[today];
  const s = streak(habit), b = longestStreak(habit), r = Math.round(completionRate(habit) * 100);
  const totalCheckins = Object.keys(habit.history).length;

  const handleMarkDone = () => {
    if (isDone) {
      // Allow editing the mood/journal even if already done
      setShowMood(true);
    } else {
      toggleHabit(habit.id);
      setShowMood(true);
    }
  };

  return (
    <div className="fade-up">
      <button className="btn btn-ghost btn-sm" onClick={goBack} style={{marginBottom:18}}>
        <ICONS.back /> All habits
      </button>

      <div className="page-header" style={{alignItems:'flex-start', flexDirection:'column', gap:18}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', width:'100%'}}>
          <div>
            <div className="eyebrow">{habit.schedule} · {habit.time}</div>
            <h1 className="h1" style={{fontSize:52}}>{habit.name}</h1>
            <p className="lede" style={{marginTop:14, fontStyle:'italic'}}>
              I am <em style={{color:'var(--accent)', fontStyle:'normal'}}>{habit.identity}</em>.
              Each check-in is a vote for that.
            </p>
          </div>
          <button className={`btn btn-lg ${isDone ? 'btn-accent' : 'btn-primary'}`}
            onClick={handleMarkDone}>
            {isDone ? <><ICONS.check style={{width:14,height:14}}/> Done today · edit</> : 'Mark done'}
          </button>
        </div>

        <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:0, width:'100%', borderTop:'1px solid var(--rule)', paddingTop:18}}>
          <Stat label="Active streak" value={`${s}d`} />
          <Stat label="Best streak" value={`${b}d`} />
          <Stat label="30-day rate" value={`${r}%`} />
          <Stat label="Total check-ins" value={totalCheckins} />
        </div>
      </div>

      <div className="tabs">
        {['overview','loop','journal','history','notes'].map(t => (
          <button key={t} className={`tab ${tab===t?'active':''}`} onClick={() => setTab(t)}>
            {t[0].toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {tab === 'overview' && (
        <div style={{display:'grid', gridTemplateColumns:'1.3fr 1fr', gap:20}}>
          <div className="card card-pad">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14}}>
              <h3 className="h3" style={{margin:0}}>The 4 laws</h3>
              <span className="muted mono" style={{fontSize:10, letterSpacing:'0.08em'}}>EDIT ANY FIELD INLINE</span>
            </div>
            <EditableLaw label="1. Make it obvious" hint="Cue + stack"
              value={habit.cue} placeholder="When 7am, after I pour coffee…"
              onSave={v => updateHabit(habit.id, { cue: v })}/>
            <EditableLaw label="2. Make it attractive" hint="Craving (optional)"
              value={habit.craving} placeholder="Add what you actually want from this — e.g. to feel curious, calm, strong"
              onSave={v => updateHabit(habit.id, { craving: v })}/>
            <EditableLaw label="3. Make it easy" hint="2-minute version"
              value={habit.twoMin} placeholder="Just open the book. Just put on the shoes."
              onSave={v => updateHabit(habit.id, { twoMin: v })}/>
            <EditableLaw label="4. Make it satisfying" hint="Reward (optional)"
              value={habit.reward} placeholder="Add a small visible win — e.g. one highlighted line, a check on the calendar"
              onSave={v => updateHabit(habit.id, { reward: v })} last/>
          </div>
          <div style={{display:'flex', flexDirection:'column', gap:20}}>
            <div className="card card-pad">
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:6}}>
                <h3 className="h3" style={{margin:0}}>Environment</h3>
                <span className="muted mono" style={{fontSize:9.5, letterSpacing:'0.08em'}}>OPTIONAL</span>
              </div>
              <EditableLine value={habit.environment}
                placeholder="Stage your space — book on the desk, phone in another room…"
                onSave={v => updateHabit(habit.id, { environment: v })}/>
            </div>

            <div className="card card-pad" style={habit.contract ? {borderColor:'var(--accent)', borderStyle:'dashed'} : {}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:8}}>
                <h3 className="h3" style={{margin:0, color: habit.contract ? 'var(--accent)' : 'inherit'}}>Accountability contract</h3>
                <button className="btn btn-sm btn-ghost" onClick={() => setShowContract(true)}>
                  {habit.contract ? 'Edit' : '+ Add'}
                </button>
              </div>
              {habit.contract ? (
                <>
                  <p style={{margin:'0 0 10px', fontSize:13.5, color:'var(--ink-2)', lineHeight:1.5}}>{habit.contract}</p>
                  {habit.contractPartners?.length > 0 && (
                    <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
                      {habit.contractPartners.map(p => (
                        <span key={p.id} className="chip" style={{fontSize:10}}>
                          ◌ {p.value}
                        </span>
                      ))}
                    </div>
                  )}
                </>
              ) : (
                <p style={{margin:0, fontFamily:'var(--serif)', fontSize:14, fontStyle:'italic', color:'var(--ink-3)', lineHeight:1.5}}>
                  Add a real cost to skipping. Invite a witness via email, Google, or QR.
                </p>
              )}
            </div>

            <div className="card card-pad" style={{padding:0, overflow:'hidden'}}>
              <div style={{padding:'18px 20px 0'}}>
                <MoodChart habit={habit} days={30} />
              </div>
            </div>
          </div>
        </div>
      )}

      {showContract && (
        <ContractSheet habit={habit} onClose={() => setShowContract(false)}
          onSave={(patch) => updateHabit(habit.id, patch)}/>
      )}

      {showMood && (
        <MoodCheckSheet habit={habit} dateKey={today}
          onClose={() => setShowMood(false)}
          onSave={(payload) => logCheckIn(habit.id, payload)}/>
      )}

      {tab === 'loop' && <LoopDiagram habit={habit} />}

      {tab === 'journal' && <HabitJournalStream habit={habit} store={store} />}

      {tab === 'history' && <HistoryWall habit={habit} onToggle={(d) => toggleHabit(habit.id, d)} />}

      {tab === 'notes' && <NotesManager habit={habit} store={store} />}
    </div>
  );
}

function Stat({ label, value }) {
  return (
    <div>
      <div className="muted mono" style={{fontSize:10, letterSpacing:'0.1em', textTransform:'uppercase'}}>{label}</div>
      <div style={{fontFamily:'var(--serif)', fontSize:30, lineHeight:1.1, marginTop:4}}>{value}</div>
    </div>
  );
}

function Law({ label, hint, body, last }) {
  return (
    <div style={{padding:'14px 0', borderBottom: last ? 'none' : '1px solid var(--rule)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:4}}>
        <div className="h3" style={{fontSize:11.5}}>{label}</div>
        <div className="muted mono" style={{fontSize:9.5, letterSpacing:'0.1em', textTransform:'uppercase'}}>{hint}</div>
      </div>
      <div style={{fontSize:14.5, color:'var(--ink-2)', lineHeight:1.5, fontFamily:'var(--serif)'}}>{body}</div>
    </div>
  );
}

function EditableLaw({ label, hint, value, placeholder, onSave, last }) {
  const [editing, setEditing] = uS2(false);
  const [draft, setDraft] = uS2(value || '');
  uE2(() => { setDraft(value || ''); }, [value]);
  const empty = !value || !value.trim();
  return (
    <div style={{padding:'14px 0', borderBottom: last ? 'none' : '1px solid var(--rule)'}}>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
        <div className="h3" style={{fontSize:11.5}}>{label}</div>
        <div className="muted mono" style={{fontSize:9.5, letterSpacing:'0.1em', textTransform:'uppercase'}}>{hint}</div>
      </div>
      {editing ? (
        <div>
          <textarea className="input" rows={2} autoFocus value={draft}
            onChange={e => setDraft(e.target.value)} placeholder={placeholder}/>
          <div style={{display:'flex', gap:6, marginTop:6, justifyContent:'flex-end'}}>
            <button className="btn btn-sm" onClick={() => { setDraft(value || ''); setEditing(false); }}>Cancel</button>
            <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
          </div>
        </div>
      ) : (
        <button onClick={() => setEditing(true)}
          style={{
            display:'block', width:'100%', textAlign:'left', cursor:'pointer',
            background:'transparent', border:'none', padding:'4px 0',
            fontSize: empty ? 13.5 : 14.5,
            color: empty ? 'var(--ink-3)' : 'var(--ink-2)',
            lineHeight:1.5, fontFamily:'var(--serif)',
            fontStyle: empty ? 'italic' : 'normal',
          }}>
          {value || placeholder}
        </button>
      )}
    </div>
  );
}

function EditableLine({ value, placeholder, onSave }) {
  const [editing, setEditing] = uS2(false);
  const [draft, setDraft] = uS2(value || '');
  uE2(() => { setDraft(value || ''); }, [value]);
  const empty = !value || !value.trim();
  if (editing) {
    return (
      <div>
        <textarea className="input" rows={2} autoFocus value={draft}
          onChange={e => setDraft(e.target.value)} placeholder={placeholder}/>
        <div style={{display:'flex', gap:6, marginTop:6, justifyContent:'flex-end'}}>
          <button className="btn btn-sm" onClick={() => { setDraft(value || ''); setEditing(false); }}>Cancel</button>
          <button className="btn btn-sm btn-primary" onClick={() => { onSave(draft); setEditing(false); }}>Save</button>
        </div>
      </div>
    );
  }
  return (
    <button onClick={() => setEditing(true)}
      style={{
        display:'block', width:'100%', textAlign:'left', cursor:'pointer',
        background:'transparent', border:'none', padding:'4px 0',
        margin:0, fontFamily:'var(--serif)', fontStyle:'italic',
        fontSize: empty ? 14 : 16,
        color: empty ? 'var(--ink-3)' : 'var(--ink-2)',
        lineHeight:1.45,
      }}>
      {value || placeholder}
    </button>
  );
}

function LoopDiagram({ habit }) {
  return (
    <div>
      <p className="lede" style={{marginBottom:24, fontStyle:'italic'}}>
        Every habit follows the same four steps. Here's yours, laid out as a sentence diagram.
      </p>
      <div className="loop">
        {[
          ['01','Cue','When',habit.cue],
          ['02','Craving','I want',habit.craving],
          ['03','Response','So I',habit.response],
          ['04','Reward','And I get',habit.reward],
        ].map(([n, step, lead, val]) => (
          <div key={n} className="loop-cell">
            <div className="loop-step">{n} · {step}</div>
            <div className="loop-label">{lead}…</div>
            <div className="loop-value">{val}</div>
            <div className="loop-arrow"/>
          </div>
        ))}
      </div>
      <div className="card card-pad" style={{marginTop:24, background:'var(--bg-sunk)'}}>
        <h3 className="h3" style={{marginBottom:8}}>The loop in a sentence</h3>
        <p style={{margin:0, fontFamily:'var(--serif)', fontSize:20, fontStyle:'italic', color:'var(--ink-2)', lineHeight:1.4}}>
          When <span style={{color:'var(--ink)'}}>{habit.cue.toLowerCase()}</span>,
          I crave <span style={{color:'var(--ink)'}}>{habit.craving.toLowerCase()}</span>,
          so I <span style={{color:'var(--ink)'}}>{habit.response.toLowerCase()}</span> —
          and the reward is <span style={{color:'var(--accent)'}}>{habit.reward.toLowerCase()}</span>.
        </p>
      </div>
    </div>
  );
}

function HistoryWall({ habit, onToggle }) {
  // 26 weeks × 7 days = ~6 months
  const weeks = 26;
  const days = [];
  const today = todayKey();
  for (let w = weeks - 1; w >= 0; w--) {
    for (let d = 6; d >= 0; d--) {
      const offset = w * 7 + d;
      const k = dateAdd(today, -offset);
      days.push({ k, done: !!habit.history[k], isToday: k === today });
    }
  }
  // Reorder into week-columns (top = Sun)
  const cols = [];
  for (let w = 0; w < weeks; w++) {
    cols.push(days.slice(w * 7, w * 7 + 7).reverse());
  }

  return (
    <div>
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-end', marginBottom:14}}>
        <div>
          <h3 className="h3">26-week wall</h3>
          <div className="muted" style={{fontSize:12.5, marginTop:4}}>
            Each square is a day. Click to toggle. Don't break the chain.
          </div>
        </div>
        <div style={{display:'flex', gap:14, alignItems:'center'}}>
          <span className="muted mono" style={{fontSize:10}}>LESS</span>
          <div style={{display:'flex', gap:3}}>
            <span className="dot"/>
            <span className="dot l1"/>
            <span className="dot l2"/>
            <span className="dot l3"/>
          </div>
          <span className="muted mono" style={{fontSize:10}}>MORE</span>
        </div>
      </div>
      <div className="card card-pad">
        <div style={{display:'flex', gap:3}}>
          {cols.reverse().map((col, i) => (
            <div key={i} style={{display:'flex', flexDirection:'column', gap:3}}>
              {col.map((d) => (
                <button key={d.k} title={`${fmt.short(d.k)} · ${d.done ? 'done' : 'missed'}`}
                  onClick={() => onToggle(d.k)}
                  className={`dot ${d.done ? 'l3' : ''} ${d.isToday ? 'today' : ''}`}
                  style={{border:0, padding:0, cursor:'pointer'}}/>
              ))}
            </div>
          ))}
        </div>
        <div className="muted mono" style={{fontSize:10, letterSpacing:'0.06em', marginTop:14, display:'flex', justifyContent:'space-between'}}>
          <span>26 WEEKS AGO</span><span>TODAY</span>
        </div>
      </div>
    </div>
  );
}

// ── Create habit flow — Mad-Libs single screen ──────────────────────────────
const TIME_PRESETS = ['Morning', 'Afternoon', 'Evening', 'Anytime'];
const SCHEDULE_PRESETS = [
  { id: 'daily', label: 'Every day', days: [0,1,2,3,4,5,6] },
  { id: 'weekdays', label: 'Weekdays', days: [1,2,3,4,5] },
  { id: 'weekends', label: 'Weekends', days: [0,6] },
  { id: '3x', label: '3× a week', days: [1,3,5] },
];
const DOW = ['S','M','T','W','T','F','S'];

function CreateHabitScreen({ store, onDone }) {
  const existingIdentities = uM2(() => {
    const set = new Set();
    store.habits.forEach(h => h.identity && set.add(h.identity));
    return [...set];
  }, [store.habits]);

  const [draft, setDraft] = uS2({
    name: '', identity: '', time: 'Morning', customTime: '',
    location: '',
    scheduleId: 'daily', customDays: [0,1,2,3,4,5,6],
    stack: '', craving: '', reward: '', twoMin: '', environment: '',
    contract: '', response: '', cue: '',
    schedule: 'Daily',
  });
  const [showOptional, setShowOptional] = uS2(false);
  const set = (k, v) => setDraft(d => ({...d, [k]: v}));

  // Build the descriptive cue + schedule string from the simple inputs
  const finalize = () => {
    const sched = SCHEDULE_PRESETS.find(s => s.id === draft.scheduleId);
    let scheduleLabel = sched ? sched.label : 'Custom';
    let days = sched ? sched.days : draft.customDays;
    if (draft.scheduleId === 'custom') {
      const names = draft.customDays.map(d => ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][d]).join(', ');
      scheduleLabel = names || 'Custom';
    }
    const timeLabel = draft.customTime || draft.time;
    const cue = [
      timeLabel && `${timeLabel.toLowerCase()}`,
      draft.location && `at ${draft.location.toLowerCase()}`,
      draft.stack && `after I ${draft.stack.toLowerCase()}`,
    ].filter(Boolean).join(', ') || 'every day';
    return {
      ...draft,
      schedule: scheduleLabel,
      cue: draft.cue || cue.charAt(0).toUpperCase() + cue.slice(1),
      response: draft.response || draft.name,
      twoMin: draft.twoMin || `Just start: ${draft.name.toLowerCase()} for 2 minutes`,
    };
  };

  const canCreate = draft.name.trim() && draft.identity.trim();
  const hasDays = draft.scheduleId !== 'custom' || draft.customDays.length > 0;

  return (
    <div className="fade-up" style={{maxWidth:780}}>
      <button className="btn btn-ghost btn-sm" onClick={onDone} style={{marginBottom:18}}>
        <ICONS.back /> Cancel
      </button>
      <div className="eyebrow">New habit</div>
      <h1 className="h1" style={{marginTop:8, marginBottom:8}}>Build it in a <em>sentence</em>.</h1>
      <p className="lede" style={{marginBottom:32}}>
        Just the essentials. The rest — craving, reward, contract — you can refine as you go.
      </p>

      {/* Mad-Libs sentence */}
      <div className="card card-pad-lg" style={{marginBottom:24, background:'var(--bg-elev)'}}>
        <div className="eyebrow" style={{marginBottom:18}}>The sentence</div>
        <div style={{
          fontFamily:'var(--serif)', fontSize:24, lineHeight:1.7, color:'var(--ink-2)',
          letterSpacing:'-0.005em',
        }}>
          <span>I will </span>
          <MLInput value={draft.name} placeholder="read 10 pages" width={220}
            onChange={v => set('name', v)} autoFocus/>
          <span>, </span>
          <MLChip>{draft.customTime || draft.time.toLowerCase()}</MLChip>
          <span> </span>
          <MLInput value={draft.location} placeholder="at the kitchen table" width={220}
            onChange={v => set('location', v)}/>
          <span>, so I can become </span>
          <MLInput value={draft.identity} placeholder="a reader" width={170}
            onChange={v => set('identity', v)} accent/>
          <span>.</span>
        </div>

        {/* Reuse existing identities */}
        {existingIdentities.length > 0 && (
          <div style={{marginTop:18, paddingTop:16, borderTop:'1px solid var(--rule)'}}>
            <div className="muted mono" style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase', marginBottom:8}}>
              Reuse an identity you've already started building
            </div>
            <div style={{display:'flex', gap:6, flexWrap:'wrap'}}>
              {existingIdentities.map(id => {
                const active = draft.identity.trim().toLowerCase() === id.toLowerCase();
                return (
                  <button key={id} onClick={() => set('identity', id)}
                    style={{
                      padding:'6px 14px', borderRadius:99,
                      border:'1px solid ' + (active ? 'var(--accent)' : 'var(--rule-strong)'),
                      background: active ? 'var(--accent-soft)' : 'var(--bg-elev)',
                      color: active ? 'oklch(35% 0.10 60)' : 'var(--ink-2)',
                      fontFamily:'var(--serif)', fontStyle:'italic', fontSize:14,
                      cursor:'pointer', transition:'all .12s',
                    }}>
                    {active ? '✓ ' : ''}{id}
                  </button>
                );
              })}
              <button onClick={() => set('identity', '')}
                style={{
                  padding:'6px 14px', borderRadius:99,
                  border:'1px dashed var(--rule-strong)',
                  background:'transparent', color:'var(--ink-3)',
                  fontFamily:'var(--sans)', fontSize:12,
                  cursor:'pointer',
                }}>+ Or define a new one</button>
            </div>
          </div>
        )}
      </div>

      {/* Schedule + time pickers */}
      <div style={{display:'grid', gridTemplateColumns:'1.4fr 1fr', gap:18, marginBottom:18}}>
        <div className="card card-pad">
          <div className="field-label">When · pick the days</div>
          <div style={{display:'flex', gap:6, marginBottom:12, flexWrap:'wrap'}}>
            {SCHEDULE_PRESETS.map(p => (
              <button key={p.id} className="btn btn-sm"
                onClick={() => set('scheduleId', p.id)}
                style={{
                  background: draft.scheduleId === p.id ? 'var(--ink)' : 'var(--bg-elev)',
                  color: draft.scheduleId === p.id ? 'var(--bg)' : 'inherit',
                  borderColor: draft.scheduleId === p.id ? 'var(--ink)' : 'var(--rule-strong)',
                }}>{p.label}</button>
            ))}
            <button className="btn btn-sm"
              onClick={() => set('scheduleId', 'custom')}
              style={{
                background: draft.scheduleId === 'custom' ? 'var(--ink)' : 'var(--bg-elev)',
                color: draft.scheduleId === 'custom' ? 'var(--bg)' : 'inherit',
                borderColor: draft.scheduleId === 'custom' ? 'var(--ink)' : 'var(--rule-strong)',
              }}>Custom</button>
          </div>
          <div style={{display:'flex', gap:6}}>
            {DOW.map((label, i) => {
              const active = draft.scheduleId === 'custom'
                ? draft.customDays.includes(i)
                : (SCHEDULE_PRESETS.find(s => s.id === draft.scheduleId)?.days || []).includes(i);
              const editable = draft.scheduleId === 'custom';
              return (
                <button key={i}
                  onClick={() => {
                    if (!editable) set('scheduleId', 'custom');
                    const days = editable ? draft.customDays : (SCHEDULE_PRESETS.find(s => s.id === draft.scheduleId)?.days || []);
                    const next = days.includes(i) ? days.filter(d => d !== i) : [...days, i];
                    setDraft(d => ({...d, scheduleId: 'custom', customDays: next}));
                  }}
                  style={{
                    flex:1, height:36, borderRadius:8, border:'1px solid var(--rule-strong)',
                    background: active ? 'var(--accent)' : 'var(--bg-elev)',
                    color: active ? 'var(--bg)' : 'var(--ink-3)',
                    fontFamily:'var(--mono)', fontSize:11, fontWeight:500, letterSpacing:'0.05em',
                    cursor:'pointer', transition:'all .12s',
                  }}>{label}</button>
              );
            })}
          </div>
        </div>
        <div className="card card-pad">
          <div className="field-label">Time of day</div>
          <div style={{display:'flex', gap:6, marginBottom:10, flexWrap:'wrap'}}>
            {TIME_PRESETS.map(t => (
              <button key={t} className="btn btn-sm"
                onClick={() => { set('time', t); set('customTime', ''); }}
                style={{
                  background: draft.time === t && !draft.customTime ? 'var(--ink)' : 'var(--bg-elev)',
                  color: draft.time === t && !draft.customTime ? 'var(--bg)' : 'inherit',
                  borderColor: draft.time === t && !draft.customTime ? 'var(--ink)' : 'var(--rule-strong)',
                }}>{t}</button>
            ))}
          </div>
          <input type="time" className="input" value={draft.customTime}
            onChange={e => set('customTime', e.target.value)}
            style={{height:34, fontSize:13}}/>
          <div className="muted" style={{fontSize:11, marginTop:6, fontStyle:'italic', fontFamily:'var(--serif)'}}>
            Or pick an exact time.
          </div>
        </div>
      </div>

      {/* Optional habit stack — collapsed by default */}
      <div className="card card-pad" style={{marginBottom:18}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom: draft.stack || showOptional ? 12 : 0}}>
          <div>
            <div className="field-label" style={{marginBottom:0}}>Stack onto an existing habit</div>
            <div className="muted" style={{fontSize:11.5, marginTop:4, fontStyle:'italic', fontFamily:'var(--serif)'}}>
              Optional — link this to something you already do.
            </div>
          </div>
          {!draft.stack && !showOptional && (
            <button className="btn btn-sm btn-ghost" onClick={() => setShowOptional(true)}>+ Add</button>
          )}
        </div>
        {(draft.stack || showOptional) && (
          <div style={{display:'flex', alignItems:'center', gap:10}}>
            <span style={{fontFamily:'var(--serif)', fontSize:16, fontStyle:'italic', color:'var(--ink-3)', whiteSpace:'nowrap'}}>After I</span>
            <input className="input" placeholder="pour my morning coffee"
              value={draft.stack} onChange={e => set('stack', e.target.value)} style={{flex:1}}/>
            {/* Quick stack from existing habits */}
            {store.habits.length > 0 && (
              <select className="input" style={{width:'auto', maxWidth:200}}
                value=""
                onChange={e => e.target.value && set('stack', e.target.value)}>
                <option value="">↳ from existing…</option>
                {store.habits.map(h => (
                  <option key={h.id} value={h.name.toLowerCase()}>{h.name}</option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:24, paddingTop:24, borderTop:'1px solid var(--rule)'}}>
        <div className="muted" style={{fontSize:12.5, fontStyle:'italic', fontFamily:'var(--serif)'}}>
          You can fill in <em>craving, reward, environment & contract</em> later — they're on the habit's detail page.
        </div>
        <button className="btn btn-primary btn-lg" disabled={!canCreate || !hasDays}
          onClick={() => { store.addHabit(finalize()); onDone(); }}>
          Create habit <ICONS.arrow style={{width:13,height:13}}/>
        </button>
      </div>
    </div>
  );
}

// Mad-Libs inline input: looks like underlined text, grows with content
function MLInput({ value, placeholder, onChange, autoFocus, width = 200, accent }) {
  return (
    <input
      value={value}
      placeholder={placeholder}
      onChange={e => onChange(e.target.value)}
      autoFocus={autoFocus}
      style={{
        display: 'inline-block',
        width: width,
        padding: '2px 4px',
        margin: '0 2px',
        border: 'none',
        borderBottom: '2px dashed var(--rule-strong)',
        background: 'transparent',
        fontFamily: 'var(--serif)',
        fontSize: 'inherit',
        fontStyle: value ? 'normal' : 'italic',
        color: accent ? 'var(--accent)' : 'var(--ink)',
        outline: 'none',
        transition: 'border-color .12s',
        verticalAlign: 'baseline',
      }}
      onFocus={e => e.target.style.borderBottomColor = 'var(--accent)'}
      onBlur={e => e.target.style.borderBottomColor = 'var(--rule-strong)'}
    />
  );
}
function MLChip({ children }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 10px', margin: '0 2px',
      background: 'var(--bg-sunk)', borderRadius: 99,
      fontFamily: 'var(--sans)', fontSize: 14, color: 'var(--ink-2)',
      verticalAlign: 'middle',
    }}>{children}</span>
  );
}

window.HabitsListScreen = HabitsListScreen;
window.HabitDetailScreen = HabitDetailScreen;
window.CreateHabitScreen = CreateHabitScreen;
