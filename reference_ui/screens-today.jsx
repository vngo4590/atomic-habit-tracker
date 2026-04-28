// screens-today.jsx — Today dashboard

const { useState: uS1, useMemo: uM1 } = React;

function TodayScreen({ store, goToHabit }) {
  const { habits, toggleHabit, logCheckIn, streak } = store;
  const today = todayKey();
  const [moodHabit, setMoodHabit] = React.useState(null);
  const doneToday = habits.filter(h => h.history[today]).length;
  const pct = Math.round((doneToday / habits.length) * 100);
  const hour = new Date().getHours();
  const greet = hour < 5 ? 'Late night' : hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  // Group by time-of-day
  const groups = uM1(() => {
    const g = { Morning: [], Afternoon: [], Evening: [] };
    habits.forEach(h => { (g[h.time] || g.Morning).push(h); });
    return g;
  }, [habits]);

  // Last 14 days completion sparkline
  const last14 = uM1(() => {
    const arr = [];
    for (let i = 13; i >= 0; i--) {
      const k = dateAdd(today, -i);
      const done = habits.filter(h => h.history[k]).length;
      arr.push({ k, done, total: habits.length });
    }
    return arr;
  }, [habits, today]);

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">{greet} · {fmt.long(today)}</div>
          <h1 className="h1">
            {doneToday === habits.length
              ? <>A clean sweep. <em>Vote cast.</em></>
              : doneToday === 0
                ? <>Start with <em>one small thing.</em></>
                : <>You're <em>{pct}%</em> through today.</>}
          </h1>
        </div>
        <div style={{display:'flex',gap:8}}>
          <button className="btn btn-sm">
            <ICONS.search style={{width:13,height:13}}/>
            Search
          </button>
          <button className="btn btn-sm btn-primary">
            <ICONS.plus style={{width:13,height:13}}/>
            New habit
          </button>
        </div>
      </div>

      {/* Top stats row */}
      <div style={{display:'grid', gridTemplateColumns:'1.1fr 1fr 1fr', gap:18, marginBottom:32}}>
        {/* Today completion ring */}
        <div className="card card-pad" style={{display:'flex', gap:20, alignItems:'center'}}>
          <CompletionRing pct={pct} />
          <div>
            <div className="eyebrow">Today</div>
            <div style={{fontFamily:'var(--serif)', fontSize:32, lineHeight:1, marginTop:4}}>
              {doneToday}<span style={{color:'var(--ink-3)'}}>/{habits.length}</span>
            </div>
            <div className="muted" style={{fontSize:12, marginTop:6}}>
              {doneToday === 0 ? 'Nothing checked yet' :
               doneToday === habits.length ? 'All done — well done.' :
               `${habits.length - doneToday} habits remaining`}
            </div>
          </div>
        </div>

        {/* Active streak */}
        <div className="card card-pad">
          <div className="eyebrow">Longest active streak</div>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginTop:6}}>
            <div style={{fontFamily:'var(--serif)', fontSize:32, lineHeight:1}}>
              {Math.max(0, ...habits.map(streak))}
            </div>
            <div className="muted mono" style={{fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase'}}>days</div>
          </div>
          <div className="muted" style={{fontSize:12, marginTop:6}}>
            {(() => {
              const top = [...habits].sort((a,b) => streak(b) - streak(a))[0];
              return top ? `${top.name} — keep it warm.` : '—';
            })()}
          </div>
        </div>

        {/* 14-day sparkline */}
        <div className="card card-pad">
          <div className="eyebrow">Last 14 days</div>
          <div style={{display:'flex', alignItems:'flex-end', gap:3, height:48, marginTop:10}}>
            {last14.map((d,i) => {
              const h = (d.done / d.total) * 100;
              const isToday = i === last14.length - 1;
              return (
                <div key={d.k} style={{flex:1, height:'100%', display:'flex', flexDirection:'column', justifyContent:'flex-end'}}>
                  <div style={{
                    height: `${Math.max(4, h)}%`,
                    background: isToday ? 'var(--accent)' : (h > 50 ? 'var(--ink-2)' : 'var(--rule-strong)'),
                    borderRadius: 2,
                  }} />
                </div>
              );
            })}
          </div>
          <div className="muted mono" style={{fontSize:10, letterSpacing:'0.06em', marginTop:8, display:'flex', justifyContent:'space-between'}}>
            <span>2 WEEKS AGO</span><span>TODAY</span>
          </div>
        </div>
      </div>

      {/* Identity reminder + live vote tally */}
      <div className="card card-pad" style={{marginBottom:32, background:'var(--bg-sunk)', borderStyle:'dashed'}}>
        <div style={{display:'grid', gridTemplateColumns:'1.2fr 1fr', gap:32, alignItems:'center'}}>
          <div>
            <div className="eyebrow">Today, you're voting for</div>
            <div style={{fontFamily:'var(--serif)', fontSize:22, fontStyle:'italic', marginTop:6, color:'var(--ink-2)', lineHeight:1.4}}>
              {store.identity.statement}
            </div>
          </div>
          <div>
            <div className="eyebrow" style={{marginBottom:10}}>Today's votes by identity</div>
            {(() => {
              const votes = {};
              habits.forEach(h => {
                if (h.history[today]) votes[h.identity] = (votes[h.identity] || 0) + 1;
              });
              const list = Object.entries(votes);
              if (list.length === 0) return (
                <div className="muted" style={{fontStyle:'italic', fontFamily:'var(--serif)', fontSize:14}}>
                  No votes cast yet — check off a habit below.
                </div>
              );
              return (
                <div style={{display:'flex', flexDirection:'column', gap:6}}>
                  {list.map(([id, n]) => (
                    <div key={id} style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', fontSize:13}}>
                      <span style={{fontFamily:'var(--serif)', fontStyle:'italic'}}>I am <span style={{color:'var(--accent)'}}>{id}</span></span>
                      <span className="mono" style={{fontSize:11.5}}>+{n}</span>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>

      {/* Habit groups */}
      {Object.entries(groups).map(([label, list]) => list.length > 0 && (
        <section key={label} style={{marginBottom:24}}>
          <div style={{display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12}}>
            <h2 className="h3">{label}</h2>
            <span className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em', textTransform:'uppercase'}}>
              {list.filter(h => h.history[today]).length} / {list.length}
            </span>
          </div>
          <div className="card">
            {list.map(h => (
              <HabitRow key={h.id} habit={h} done={!!h.history[today]}
                streak={streak(h)} onCheck={() => {
                  const wasDone = !!h.history[today];
                  toggleHabit(h.id);
                  if (!wasDone) setMoodHabit(h);
                }}
                onOpen={() => goToHabit(h.id)} />
            ))}
          </div>
        </section>
      ))}

      {moodHabit && (
        <MoodCheckSheet habit={moodHabit} dateKey={today}
          onClose={() => setMoodHabit(null)}
          onSave={(payload) => logCheckIn(moodHabit.id, payload)}/>
      )}
    </div>
  );
}

function CompletionRing({ pct }) {
  const r = 26;
  const c = 2 * Math.PI * r;
  return (
    <svg width="64" height="64" viewBox="0 0 64 64" style={{flexShrink:0}}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--rule)" strokeWidth="4" />
      <circle cx="32" cy="32" r={r} fill="none" stroke="var(--accent)" strokeWidth="4"
        strokeDasharray={c} strokeDashoffset={c * (1 - pct/100)}
        strokeLinecap="round" transform="rotate(-90 32 32)"
        style={{transition: 'stroke-dashoffset .5s cubic-bezier(.3,.7,.4,1)'}}/>
      <text x="32" y="36" textAnchor="middle" fontFamily="var(--serif)" fontSize="16" fill="var(--ink)">{pct}%</text>
    </svg>
  );
}

function HabitRow({ habit, done, streak, onCheck, onOpen }) {
  return (
    <div className={`habit-row ${done ? 'done' : ''}`} onClick={onOpen}>
      <button className={`check ${done ? 'done' : ''}`}
        onClick={(e) => { e.stopPropagation(); onCheck(); }}
        aria-label={done ? 'Uncheck' : 'Check'}>
        <ICONS.check />
      </button>
      <div>
        <div className="habit-name">{habit.name}</div>
        <div className="habit-meta">
          <span>{habit.stack ? `→ ${habit.stack}` : habit.cue.slice(0, 40)}</span>
          <span className="dot">·</span>
          <span>{habit.identity}</span>
        </div>
      </div>
      <div style={{display:'flex', alignItems:'center', gap:10}}>
        <span className="chip" style={{
          background: done ? 'var(--accent-soft)' : 'transparent',
          borderColor: done ? 'transparent' : 'var(--rule)',
          color: done ? 'oklch(35% 0.10 60)' : 'var(--ink-3)',
          fontStyle:'normal',
          fontSize:10,
        }}>
          {done ? '+1' : '·'} <span style={{fontStyle:'italic', fontFamily:'var(--serif)', textTransform:'none', letterSpacing:0, fontSize:12}}>{habit.identity}</span>
        </span>
        {streak > 0 && (
          <div className="streak-pill">
            <ICONS.flame /> {streak}
          </div>
        )}
        <ICONS.arrow style={{width:14, height:14, color:'var(--ink-4)'}}/>
      </div>
    </div>
  );
}

window.TodayScreen = TodayScreen;
window.HabitRow = HabitRow;
