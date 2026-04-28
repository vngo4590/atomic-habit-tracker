// screens-extras.jsx — Analytics, Journal, Weekly review, Identity, Settings, Onboarding

const { useState: uS3, useMemo: uM3 } = React;

// ── Analytics ──────────────────────────────────────
function AnalyticsScreen({ store }) {
  const { habits, streak, longestStreak, completionRate } = store;
  const [range, setRange] = uS3(30);
  const today = todayKey();

  // Daily completion line over range
  const series = uM3(() => {
    const arr = [];
    for (let i = range - 1; i >= 0; i--) {
      const k = dateAdd(today, -i);
      const done = habits.filter(h => h.history[k]).length;
      arr.push({ k, done, total: habits.length, pct: done / habits.length });
    }
    return arr;
  }, [habits, range, today]);

  const avg = series.reduce((s, d) => s + d.pct, 0) / series.length;

  // Day-of-week heatmap
  const dow = uM3(() => {
    const counts = [0,0,0,0,0,0,0];
    const totals = [0,0,0,0,0,0,0];
    habits.forEach(h => {
      for (let i = 0; i < 90; i++) {
        const k = dateAdd(today, -i);
        const d = new Date(k).getDay();
        totals[d]++;
        if (h.history[k]) counts[d]++;
      }
    });
    return counts.map((c, i) => ({ day: ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][i], rate: c / (totals[i] || 1) }));
  }, [habits, today]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Insights</div>
          <h1 className="h1"><em>Trends</em> in your behavior</h1>
        </div>
        <div className="tabs" style={{borderBottom:'none', margin:0}}>
          {[14, 30, 90].map(r => (
            <button key={r} className={`tab ${range===r?'active':''}`} onClick={() => setRange(r)}>{r} days</button>
          ))}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'repeat(4, 1fr)', gap:18, marginBottom:24}}>
        <BigStat label="Avg adherence" value={`${Math.round(avg*100)}%`} sub={`across ${habits.length} habits`} />
        <BigStat label="Total check-ins" value={habits.reduce((s,h) => s + Object.keys(h.history).length, 0)} sub="all time" />
        <BigStat label="Best streak ever" value={`${Math.max(...habits.map(longestStreak))}d`}
          sub={[...habits].sort((a,b) => longestStreak(b) - longestStreak(a))[0]?.name} />
        <BigStat label="Habits at risk" value={habits.filter(h => completionRate(h, 7) < 0.5).length}
          sub="below 50% this week" />
      </div>

      {/* Line chart */}
      <div className="card card-pad-lg" style={{marginBottom:18}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:18}}>
          <h3 className="h3">Daily completion</h3>
          <span className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em'}}>% of habits done</span>
        </div>
        <LineChart data={series} />
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:18}}>
        <div className="card card-pad-lg">
          <h3 className="h3" style={{marginBottom:14}}>By day of week</h3>
          <div style={{display:'flex', alignItems:'flex-end', gap:8, height:120}}>
            {dow.map(d => (
              <div key={d.day} style={{flex:1, display:'flex', flexDirection:'column', alignItems:'center', gap:6, height:'100%'}}>
                <div style={{flex:1, width:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                  <div style={{
                    height: `${Math.max(6, d.rate * 100)}%`,
                    background: 'var(--accent)',
                    borderRadius: '3px 3px 0 0',
                    opacity: 0.4 + d.rate * 0.6,
                  }}/>
                </div>
                <div className="muted mono" style={{fontSize:10, letterSpacing:'0.06em'}}>{d.day.toUpperCase()}</div>
                <div className="mono" style={{fontSize:11, fontWeight:500}}>{Math.round(d.rate*100)}%</div>
              </div>
            ))}
          </div>
        </div>
        <div className="card card-pad-lg">
          <h3 className="h3" style={{marginBottom:14}}>Habit leaderboard</h3>
          <div>
            {[...habits].sort((a,b) => completionRate(b) - completionRate(a)).map((h, i) => {
              const r = completionRate(h);
              return (
                <div key={h.id} style={{display:'grid', gridTemplateColumns:'14px 1fr 50px', gap:12, padding:'10px 0', borderBottom: i === habits.length-1 ? 'none' : '1px solid var(--rule)', alignItems:'center'}}>
                  <span className="mono muted" style={{fontSize:11}}>{String(i+1).padStart(2,'0')}</span>
                  <div style={{minWidth:0}}>
                    <div style={{fontSize:13.5, fontWeight:500}}>{h.name}</div>
                    <div style={{height:3, background:'var(--bg-sunk)', borderRadius:99, marginTop:4, overflow:'hidden'}}>
                      <div style={{width:`${r*100}%`, height:'100%', background:'var(--accent)'}}/>
                    </div>
                  </div>
                  <span className="mono" style={{fontSize:12, textAlign:'right'}}>{Math.round(r*100)}%</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function BigStat({ label, value, sub }) {
  return (
    <div className="card card-pad">
      <div className="eyebrow">{label}</div>
      <div style={{fontFamily:'var(--serif)', fontSize:36, lineHeight:1, marginTop:8}}>{value}</div>
      <div className="muted" style={{fontSize:11.5, marginTop:6, fontStyle:'italic', fontFamily:'var(--serif)'}}>{sub}</div>
    </div>
  );
}

function LineChart({ data }) {
  const W = 900, H = 180, P = 24;
  const xs = (i) => P + (i / (data.length - 1)) * (W - P*2);
  const ys = (v) => H - P - v * (H - P*2);
  const path = data.map((d, i) => `${i===0?'M':'L'}${xs(i)},${ys(d.pct)}`).join(' ');
  const area = path + ` L${xs(data.length-1)},${H-P} L${xs(0)},${H-P} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} style={{width:'100%', height:180, display:'block'}}>
      {[0, 0.25, 0.5, 0.75, 1].map(y => (
        <line key={y} x1={P} x2={W-P} y1={ys(y)} y2={ys(y)} stroke="var(--rule)" strokeDasharray={y === 0 || y === 1 ? '0' : '2 4'}/>
      ))}
      {[0, 0.5, 1].map(y => (
        <text key={y} x={P-6} y={ys(y)+3} textAnchor="end" fontFamily="var(--mono)" fontSize="9" fill="var(--ink-4)">{y*100}%</text>
      ))}
      <path d={area} fill="var(--accent)" fillOpacity="0.08"/>
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
      {data.map((d, i) => (
        <circle key={i} cx={xs(i)} cy={ys(d.pct)} r={i === data.length-1 ? 4 : 2}
          fill={i === data.length-1 ? 'var(--accent)' : 'var(--bg-elev)'}
          stroke="var(--accent)" strokeWidth="1.5"/>
      ))}
    </svg>
  );
}

// ── Journal ──────────────────────────────────────
function JournalScreen({ store }) {
  const { journal, addJournal } = store;
  const [composing, setComposing] = uS3(false);
  const [draft, setDraft] = uS3({ title: '', body: '', mood: 'good' });

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Reflection</div>
          <h1 className="h1"><em>Journal</em></h1>
          <p className="lede" style={{marginTop:14}}>
            What you measure, you manage. What you reflect on, you understand.
          </p>
        </div>
        {!composing && (
          <button className="btn btn-primary" onClick={() => setComposing(true)}>
            <ICONS.plus style={{width:13,height:13}}/> New entry
          </button>
        )}
      </div>

      {composing && (
        <div className="card card-pad-lg" style={{marginBottom:24}}>
          <input className="input large" placeholder="A title for today's reflection…"
            value={draft.title} onChange={e => setDraft({...draft, title: e.target.value})} autoFocus
            style={{border:'none', padding:'4px 0', background:'transparent', fontSize:28}}/>
          <textarea className="input" rows={6} placeholder="What worked? What didn't? What did you notice?"
            value={draft.body} onChange={e => setDraft({...draft, body: e.target.value})}
            style={{border:'none', padding:'8px 0', background:'transparent', fontSize:15, fontFamily:'var(--serif)', lineHeight:1.6, marginTop:8}}/>
          <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:18, paddingTop:18, borderTop:'1px solid var(--rule)'}}>
            <div style={{display:'flex', gap:8}}>
              {[['good','· Good day'], ['meh','· So-so'], ['bad','· Hard']].map(([m, lbl]) => (
                <button key={m} className={`btn btn-sm ${draft.mood === m ? 'btn-primary' : ''}`} onClick={() => setDraft({...draft, mood: m})}>
                  {lbl}
                </button>
              ))}
            </div>
            <div style={{display:'flex', gap:8}}>
              <button className="btn btn-sm" onClick={() => { setComposing(false); setDraft({title:'',body:'',mood:'good'}); }}>Cancel</button>
              <button className="btn btn-sm btn-primary" disabled={!draft.title.trim()}
                onClick={() => { addJournal(draft); setComposing(false); setDraft({title:'',body:'',mood:'good'}); }}>
                Save entry
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Prompts */}
      {!composing && (
        <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:12, marginBottom:32}}>
          {[
            'What habit felt automatic today?',
            'What cue is failing? Why?',
            'Who am I becoming this week?',
          ].map((p, i) => (
            <div key={i} className="card card-pad" style={{cursor:'pointer'}}
              onClick={() => { setComposing(true); setDraft({...draft, title: p}); }}>
              <div className="eyebrow">Prompt {i+1}</div>
              <div style={{fontFamily:'var(--serif)', fontSize:17, fontStyle:'italic', marginTop:6, color:'var(--ink-2)', lineHeight:1.4}}>
                {p}
              </div>
            </div>
          ))}
        </div>
      )}

      <div style={{display:'flex', flexDirection:'column', gap:14}}>
        {journal.map(e => (
          <article key={e.id} className="card card-pad-lg">
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
              <div className="muted mono" style={{fontSize:10.5, letterSpacing:'0.1em', textTransform:'uppercase'}}>
                {fmt.long(e.date)}
              </div>
              <span className={`chip ${e.mood === 'good' ? 'done' : e.mood === 'bad' ? 'accent' : ''}`}>
                {e.mood === 'good' ? 'Good day' : e.mood === 'meh' ? 'So-so' : 'Hard'}
              </span>
            </div>
            <h2 className="h2" style={{marginBottom:10}}>{e.title}</h2>
            <p style={{margin:0, fontFamily:'var(--serif)', fontSize:16, lineHeight:1.6, color:'var(--ink-2)'}}>
              {e.body}
            </p>
            {e.tags?.length > 0 && (
              <div style={{display:'flex', gap:6, marginTop:14}}>
                {e.tags.map(t => <span key={t} className="chip">#{t}</span>)}
              </div>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}

// ── Weekly review ──────────────────────────────────
function WeeklyReviewScreen({ store }) {
  const { habits, streak, completionRate } = store;
  const today = todayKey();

  const week = uM3(() => {
    const arr = [];
    for (let i = 6; i >= 0; i--) {
      const k = dateAdd(today, -i);
      arr.push({ k, done: habits.filter(h => h.history[k]).length, total: habits.length });
    }
    return arr;
  }, [habits, today]);

  const wins = habits.filter(h => completionRate(h, 7) >= 0.85);
  const slips = habits.filter(h => completionRate(h, 7) < 0.5);
  const totalDone = week.reduce((s, d) => s + d.done, 0);
  const totalSlots = week.reduce((s, d) => s + d.total, 0);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Week of {fmt.short(dateAdd(today, -6))} – {fmt.short(today)}</div>
          <h1 className="h1">Weekly <em>review</em></h1>
          <p className="lede" style={{marginTop:14}}>
            Step back, look at the week as a whole, and decide what to adjust before Monday.
          </p>
        </div>
      </div>

      {/* Week strip */}
      <div className="card card-pad-lg" style={{marginBottom:24}}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:18}}>
          <h3 className="h3">The week, at a glance</h3>
          <div className="mono" style={{fontSize:13}}>
            <strong>{totalDone}</strong> <span className="muted">/ {totalSlots} check-ins · {Math.round(totalDone/totalSlots*100)}%</span>
          </div>
        </div>
        <div style={{display:'grid', gridTemplateColumns:'repeat(7, 1fr)', gap:8}}>
          {week.map(d => (
            <div key={d.k} style={{textAlign:'center'}}>
              <div className="muted mono" style={{fontSize:10, letterSpacing:'0.06em', textTransform:'uppercase'}}>{fmt.weekday(d.k)}</div>
              <div style={{fontFamily:'var(--serif)', fontSize:18, marginTop:4}}>{new Date(d.k).getDate()}</div>
              <div style={{
                marginTop:8, height:60, borderRadius:6,
                background: `linear-gradient(to top, var(--accent) ${(d.done/d.total)*100}%, var(--bg-sunk) 0)`,
                position: 'relative',
              }}>
                <div className="mono" style={{
                  position: 'absolute', bottom: 6, left: 0, right: 0, textAlign: 'center',
                  fontSize: 11, fontWeight: 500,
                  color: (d.done/d.total) > 0.5 ? 'white' : 'var(--ink-3)',
                }}>{d.done}/{d.total}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:18, marginBottom:24}}>
        <div className="card card-pad-lg">
          <h3 className="h3" style={{marginBottom:14, color:'var(--done)'}}>Wins · stay the course</h3>
          {wins.length === 0 ? (
            <div className="muted" style={{fontStyle:'italic', fontFamily:'var(--serif)'}}>No habit was 85%+ this week. Pick one to focus on.</div>
          ) : wins.map(h => (
            <div key={h.id} style={{padding:'10px 0', borderBottom:'1px solid var(--rule)'}}>
              <div style={{fontSize:14, fontWeight:500}}>{h.name}</div>
              <div className="muted mono" style={{fontSize:10.5, marginTop:3, letterSpacing:'0.06em'}}>
                {Math.round(completionRate(h, 7)*100)}% · {streak(h)} day streak
              </div>
            </div>
          ))}
        </div>
        <div className="card card-pad-lg">
          <h3 className="h3" style={{marginBottom:14, color:'var(--warn)'}}>Slips · debug the loop</h3>
          {slips.length === 0 ? (
            <div className="muted" style={{fontStyle:'italic', fontFamily:'var(--serif)'}}>Every habit was at 50%+ this week. Quietly impressive.</div>
          ) : slips.map(h => (
            <div key={h.id} style={{padding:'10px 0', borderBottom:'1px solid var(--rule)'}}>
              <div style={{fontSize:14, fontWeight:500}}>{h.name}</div>
              <div className="muted" style={{fontSize:12.5, marginTop:4, fontStyle:'italic', fontFamily:'var(--serif)'}}>
                Cue: "{h.cue.slice(0, 60)}…" — is the cue actually firing?
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Reflection prompts */}
      <div className="card card-pad-lg">
        <h3 className="h3" style={{marginBottom:18}}>Three questions</h3>
        {[
          { q: 'What went well? Why?', placeholder: 'Reading is sticking. The coffee → book stack works because the trigger is unmissable.' },
          { q: 'What didn\'t? What\'s the smallest fix?', placeholder: 'Meditation slipped. Move the cushion next to the bathroom sink so brushing teeth → sitting is one motion.' },
          { q: 'Who did I vote to become this week?', placeholder: 'A reader, a walker, someone who finishes what they start.' },
        ].map((p, i) => (
          <div key={i} style={{marginBottom:18}}>
            <div className="field-label">{i+1}. {p.q}</div>
            <textarea className="input" rows={2} placeholder={p.placeholder}/>
          </div>
        ))}
        <button className="btn btn-primary">Save weekly review</button>
      </div>
    </div>
  );
}

// ── Identity ──────────────────────────────────────
function IdentityScreen({ store }) {
  const { habits, identity, setIdentity } = store;

  // Tally votes per identity
  const tally = uM3(() => {
    const t = {};
    habits.forEach(h => {
      const votes = Object.keys(h.history).length;
      t[h.identity] = (t[h.identity] || 0) + votes;
    });
    return Object.entries(t).sort((a, b) => b[1] - a[1]);
  }, [habits]);

  const max = Math.max(...tally.map(([,v]) => v), 1);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Who you are becoming</div>
          <h1 className="h1"><em>Identity</em> ledger</h1>
          <p className="lede" style={{marginTop:14}}>
            "Every action you take is a vote for the type of person you wish to become." — Each check-in, tallied below.
          </p>
        </div>
      </div>

      {/* Identity statement */}
      <div className="card card-pad-lg" style={{marginBottom:24, background:'var(--bg-sunk)'}}>
        <div className="eyebrow">My identity statement</div>
        <textarea className="input" value={identity.statement}
          onChange={e => setIdentity({...identity, statement: e.target.value})}
          style={{
            marginTop:12, border:'none', background:'transparent', padding:0,
            fontFamily:'var(--serif)', fontSize:30, lineHeight:1.3, fontStyle:'italic', color:'var(--ink)',
            resize:'none', minHeight:'auto',
          }} rows={2}/>
      </div>

      {/* Values */}
      <div className="card card-pad-lg" style={{marginBottom:24}}>
        <h3 className="h3" style={{marginBottom:14}}>Core values</h3>
        <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
          {identity.values.map(v => (
            <span key={v} className="chip accent" style={{fontSize:12, padding:'6px 12px'}}>{v}</span>
          ))}
          <button className="chip" style={{fontSize:12, padding:'6px 12px', cursor:'pointer', borderStyle:'dashed'}}>
            + Add value
          </button>
        </div>
      </div>

      {/* Vote ledger */}
      <div className="card card-pad-lg">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:18}}>
          <h3 className="h3">Votes cast</h3>
          <span className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em'}}>
            ALL TIME · {tally.reduce((s, [,v]) => s + v, 0)} TOTAL
          </span>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:14}}>
          {tally.map(([id, count]) => (
            <div key={id}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:6}}>
                <div style={{fontFamily:'var(--serif)', fontSize:20, fontStyle:'italic'}}>
                  I am <span style={{color:'var(--accent)'}}>{id}</span>
                </div>
                <div className="mono" style={{fontSize:13, fontWeight:500}}>
                  {count} <span className="muted">votes</span>
                </div>
              </div>
              <div className="vote-bar">
                <div className="vote-bar-fill" style={{width: `${(count/max)*100}%`}}/>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ── Settings ──────────────────────────────────────
function SettingsScreen({ store, tweakValues, setTweak }) {
  return (
    <div className="fade-up" style={{maxWidth:720}}>
      <div className="page-header">
        <div>
          <div className="eyebrow">Preferences</div>
          <h1 className="h1"><em>Settings</em></h1>
        </div>
      </div>

      <SettingGroup title="Account">
        <SettingRow label="Display name" value="Alex Rivera" />
        <SettingRow label="Email" value="alex@example.com" />
        <SettingRow label="Time zone" value="America / Los Angeles" />
      </SettingGroup>

      <SettingGroup title="Appearance">
        <SettingRow label="Theme" custom={
          <div style={{display:'flex', gap:8}}>
            <button className={`btn btn-sm ${!tweakValues.dark ? 'btn-primary' : ''}`} onClick={() => setTweak('dark', false)}>
              <ICONS.sun style={{width:13,height:13}}/> Light
            </button>
            <button className={`btn btn-sm ${tweakValues.dark ? 'btn-primary' : ''}`} onClick={() => setTweak('dark', true)}>
              <ICONS.moon style={{width:13,height:13}}/> Dark
            </button>
          </div>
        }/>
        <SettingRow label="Accent color" custom={
          <div style={{display:'flex', gap:8}}>
            {[
              ['Ochre', 60],
              ['Sage', 145],
              ['Slate', 240],
              ['Plum', 340],
            ].map(([name, hue]) => (
              <button key={name} onClick={() => setTweak('accentHue', hue)}
                className="btn btn-sm"
                style={{
                  background: tweakValues.accentHue === hue ? `oklch(62% 0.13 ${hue})` : undefined,
                  color: tweakValues.accentHue === hue ? 'var(--bg)' : undefined,
                  borderColor: tweakValues.accentHue === hue ? `oklch(62% 0.13 ${hue})` : undefined,
                }}>
                <span style={{width:10, height:10, borderRadius:99, background:`oklch(62% 0.13 ${hue})`, display:'inline-block'}}/>
                {name}
              </button>
            ))}
          </div>
        }/>
      </SettingGroup>

      <SettingGroup title="Notifications">
        <SettingRow label="Daily reminder" value="8:00 AM" toggle defaultOn/>
        <SettingRow label="Weekly review reminder" value="Sunday, 7:00 PM" toggle defaultOn/>
        <SettingRow label="Streak-at-risk alerts" value="When < 2h before bedtime" toggle/>
      </SettingGroup>

      <SettingGroup title="Data">
        <SettingRow label="Export all data" custom={<button className="btn btn-sm">Download JSON</button>}/>
        <SettingRow label="Reset history" custom={<button className="btn btn-sm" style={{color:'var(--warn)'}}>Reset…</button>}/>
      </SettingGroup>
    </div>
  );
}

function SettingGroup({ title, children }) {
  return (
    <div style={{marginBottom:32}}>
      <h3 className="h3" style={{marginBottom:12, paddingBottom:8, borderBottom:'1px solid var(--rule)'}}>{title}</h3>
      {children}
    </div>
  );
}

function SettingRow({ label, value, custom, toggle, defaultOn }) {
  const [on, setOn] = uS3(!!defaultOn);
  return (
    <div style={{display:'grid', gridTemplateColumns:'180px 1fr auto', alignItems:'center', gap:14, padding:'14px 0', borderBottom:'1px solid var(--rule)'}}>
      <div style={{fontSize:13.5, color:'var(--ink-2)'}}>{label}</div>
      <div className="muted" style={{fontSize:13}}>{value}</div>
      <div>
        {custom}
        {toggle && (
          <button onClick={() => setOn(!on)} style={{
            width:36, height:20, borderRadius:99, border:'none',
            background: on ? 'var(--accent)' : 'var(--rule-strong)',
            position:'relative', cursor:'pointer', padding:0,
          }}>
            <span style={{
              position:'absolute', top:2, left: on ? 18 : 2, width:16, height:16, borderRadius:'50%',
              background:'white', transition:'left .15s', boxShadow:'0 1px 2px rgba(0,0,0,.2)',
            }}/>
          </button>
        )}
      </div>
    </div>
  );
}

// ── Onboarding ──────────────────────────────────────
function OnboardingOverlay({ onDone }) {
  const [step, setStep] = uS3(0);
  const [name, setName] = uS3('');

  const slides = [
    {
      eyebrow: 'Welcome',
      title: <>Tiny habits, <em>compounded.</em></>,
      body: 'Atomic Habits aren\'t about big goals. They\'re about voting — every small action — for the kind of person you want to become. Let\'s set up the basics.',
      cta: 'Begin',
    },
    {
      eyebrow: 'Step 1',
      title: <>What's your <em>name?</em></>,
      body: 'Just so the welcomes feel like welcomes.',
      input: <input className="input large" placeholder="Alex" autoFocus value={name} onChange={e => setName(e.target.value)}/>,
      cta: 'Next',
      canNext: () => name.trim(),
    },
    {
      eyebrow: 'Step 2',
      title: <>How <em>identity</em> works here.</>,
      body: (
        <>
          <p style={{margin:'0 0 14px', fontFamily:'var(--serif)', fontSize:17, lineHeight:1.55, color:'var(--ink-2)'}}>
            Every habit you build will be tied to an <strong>identity statement</strong> — a short phrase like <em>"I am a reader"</em> or <em>"I am someone who shows up."</em>
          </p>
          <p style={{margin:'0 0 14px', fontFamily:'var(--serif)', fontSize:17, lineHeight:1.55, color:'var(--ink-2)'}}>
            Each check-in becomes <strong>a vote</strong> for that person. The goal isn't to read 100 pages — it's to become a reader. The behavior follows the belief.
          </p>
          <div className="card card-pad" style={{background:'var(--bg-sunk)', borderColor:'var(--rule)'}}>
            <div className="muted mono" style={{fontSize:10, letterSpacing:'0.08em', marginBottom:6}}>HOW TO USE IT</div>
            <ul style={{margin:0, paddingLeft:18, fontSize:14, lineHeight:1.6, color:'var(--ink-2)'}}>
              <li>You'll set an identity when you create each habit — there's no single "main" identity to commit to upfront.</li>
              <li>Reuse the same identity across multiple habits to compound votes faster.</li>
              <li>Edit any identity later from the habit's detail page or the <em>Identity</em> tab.</li>
            </ul>
          </div>
        </>
      ),
      cta: 'Got it',
    },
    {
      eyebrow: 'Ready',
      title: <>Welcome, <em>{name || 'friend'}.</em></>,
      body: <>We loaded a few starter habits as examples — feel free to delete and replace them with your own. Tap <em>New habit</em> in the sidebar whenever you're ready.</>,
      cta: 'Open my dashboard',
    },
  ];

  const s = slides[step];
  const canNext = !s.canNext || s.canNext();

  return (
    <div className="overlay">
      <div className="overlay-card fade-up" key={step} style={{maxHeight:'90vh', overflowY:'auto'}}>
        <div className="eyebrow">{s.eyebrow}</div>
        <h1 className="h1" style={{fontSize:38, marginTop:8, marginBottom:14}}>{s.title}</h1>
        <div style={{margin:0, fontFamily:'var(--serif)', fontSize:17, lineHeight:1.55, color:'var(--ink-2)'}}>{s.body}</div>
        {s.input && <div style={{marginTop:24}}>{s.input}</div>}
        <div style={{display:'flex', gap:6, marginTop:32, marginBottom:20}}>
          {slides.map((_, i) => (
            <div key={i} style={{width:24, height:3, borderRadius:99, background: i <= step ? 'var(--accent)' : 'var(--rule)'}}/>
          ))}
        </div>
        <div style={{display:'flex', justifyContent:'space-between'}}>
          <button className="btn btn-ghost" onClick={onDone}>Skip</button>
          <button className="btn btn-primary btn-lg" disabled={!canNext}
            onClick={() => step === slides.length - 1 ? onDone() : setStep(step+1)}>
            {s.cta} <ICONS.arrow style={{width:13,height:13}}/>
          </button>
        </div>
      </div>
    </div>
  );
}

Object.assign(window, {
  AnalyticsScreen, JournalScreen, WeeklyReviewScreen,
  IdentityScreen, SettingsScreen, OnboardingOverlay,
});
