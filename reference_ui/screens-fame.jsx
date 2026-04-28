// screens-fame.jsx — Hall of Fame + Habit Formation Questionnaire + Contract sheet

const { useState: uSF, useMemo: uMF } = React;

// Average days a habit takes to form (Lally et al., 2010 — median ~66 days)
const FORMATION_DAYS = 66;

function HallOfFameScreen({ store, openHabit }) {
  const { habits, longestStreak, completionRate } = store;
  const [showQ, setShowQ] = uSF(null); // habit being questionnaire'd
  const [formed, setFormed] = uSF(() => {
    try { return JSON.parse(localStorage.getItem('atomicly:formed') || '[]'); } catch { return []; }
  });
  const persist = (next) => {
    setFormed(next);
    try { localStorage.setItem('atomicly:formed', JSON.stringify(next)); } catch {}
  };

  // A habit is "ready to be reviewed" when it crosses the formation threshold
  // and hasn't been decided yet.
  const today = todayKey();
  const candidates = habits.filter(h => {
    if (formed.find(f => f.habitId === h.id)) return false;
    const ageDays = Math.floor((new Date(today) - new Date(h.createdAt)) / 86400000);
    return ageDays >= FORMATION_DAYS;
  });

  const inducted = formed.filter(f => f.verdict === 'formed')
    .map(f => ({ ...f, habit: habits.find(h => h.id === f.habitId) }))
    .filter(f => f.habit);

  const inProgress = habits.filter(h => {
    const ageDays = Math.floor((new Date(today) - new Date(h.createdAt)) / 86400000);
    return ageDays < FORMATION_DAYS && !formed.find(f => f.habitId === h.id);
  });

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Hall of Fame</div>
          <h1 className="h1">Habits you've <em>formed</em>.</h1>
          <p className="lede" style={{marginTop:14}}>
            Research suggests it takes about <strong>66 days</strong> for a behavior to become automatic. When yours cross the line, you decide whether they're truly part of you.
          </p>
        </div>
      </div>

      {/* Awaiting review */}
      {candidates.length > 0 && (
        <div className="card card-pad-lg" style={{marginBottom:24, borderColor:'var(--accent)', borderStyle:'dashed', background:'var(--accent-soft)'}}>
          <div style={{display:'flex', alignItems:'center', gap:10, marginBottom:12}}>
            <ICONS.star style={{width:18, height:18, color:'var(--accent)'}}/>
            <h3 className="h3" style={{color:'oklch(35% 0.10 60)'}}>Ready for review</h3>
          </div>
          <p style={{margin:'0 0 16px', fontFamily:'var(--serif)', fontSize:16, fontStyle:'italic', color:'var(--ink-2)', lineHeight:1.5}}>
            These habits have crossed the 66-day mark. Take a moment to reflect: are they automatic yet?
          </p>
          {candidates.map(h => (
            <div key={h.id} style={{display:'flex', justifyContent:'space-between', alignItems:'center', padding:'12px 0', borderTop:'1px solid var(--rule)'}}>
              <div>
                <div style={{fontSize:15, fontWeight:500}}>{h.name}</div>
                <div className="muted mono" style={{fontSize:10.5, marginTop:3, letterSpacing:'0.06em', textTransform:'uppercase'}}>
                  {Math.floor((new Date(today) - new Date(h.createdAt)) / 86400000)} days · {Math.round(completionRate(h, 60)*100)}% adherence
                </div>
              </div>
              <button className="btn btn-primary btn-sm" onClick={() => setShowQ(h)}>
                Reflect & decide <ICONS.arrow style={{width:13, height:13}}/>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Inducted hall */}
      <h3 className="h3" style={{marginBottom:14}}>Inducted</h3>
      {inducted.length === 0 ? (
        <div className="card card-pad-lg" style={{textAlign:'center', marginBottom:24}}>
          <div style={{fontFamily:'var(--serif)', fontSize:20, fontStyle:'italic', color:'var(--ink-3)', marginBottom:8}}>
            Empty for now.
          </div>
          <div className="muted" style={{fontSize:13}}>
            Habits arrive here once you've affirmed they've become automatic.
          </div>
        </div>
      ) : (
        <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14, marginBottom:24}}>
          {inducted.map(({ habit, formedOn, score }) => (
            <article key={habit.id} className="card card-pad" style={{
              cursor:'pointer',
              background:'linear-gradient(180deg, var(--bg-elev) 0%, var(--accent-soft) 100%)',
            }} onClick={() => openHabit(habit.id)}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10}}>
                <ICONS.star style={{width:18, height:18, color:'var(--accent)'}}/>
                <span className="muted mono" style={{fontSize:9.5, letterSpacing:'0.08em'}}>
                  FORMED {fmt.short(formedOn).toUpperCase()}
                </span>
              </div>
              <h3 style={{margin:0, fontFamily:'var(--serif)', fontSize:24, fontWeight:400, lineHeight:1.2}}>
                {habit.name}
              </h3>
              <div style={{fontFamily:'var(--serif)', fontSize:14, fontStyle:'italic', color:'var(--ink-3)', marginTop:6}}>
                I am {habit.identity}.
              </div>
              <div style={{display:'flex', gap:14, marginTop:14, paddingTop:14, borderTop:'1px solid var(--rule)'}}>
                <Mini label="Self-rated" value={`${score}/5`} />
                <Mini label="Best streak" value={`${longestStreak(habit)}d`} />
                <Mini label="Adherence" value={`${Math.round(completionRate(habit, 90)*100)}%`} />
              </div>
            </article>
          ))}
        </div>
      )}

      {/* In progress */}
      {inProgress.length > 0 && (
        <>
          <h3 className="h3" style={{marginBottom:14}}>In progress · before day 66</h3>
          <div className="card">
            {inProgress.map(h => {
              const ageDays = Math.floor((new Date(today) - new Date(h.createdAt)) / 86400000);
              const pct = Math.min(100, (ageDays / FORMATION_DAYS) * 100);
              return (
                <div key={h.id} style={{padding:'18px 22px', borderBottom:'1px solid var(--rule)'}}>
                  <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
                    <div>
                      <div style={{fontSize:14.5, fontWeight:500}}>{h.name}</div>
                      <div className="muted mono" style={{fontSize:10.5, marginTop:2, letterSpacing:'0.04em'}}>
                        DAY {ageDays} OF {FORMATION_DAYS}
                      </div>
                    </div>
                    <div style={{display:'flex', gap:8, alignItems:'center'}}>
                      <span className="mono muted" style={{fontSize:11}}>{FORMATION_DAYS - ageDays} days to go</span>
                      <button className="btn btn-sm btn-ghost" onClick={() => setShowQ(h)}>I think it's formed</button>
                    </div>
                  </div>
                  <div style={{height:6, background:'var(--bg-sunk)', borderRadius:99, overflow:'hidden'}}>
                    <div style={{width:`${pct}%`, height:'100%', background:'var(--accent)', transition:'width .3s'}}/>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {showQ && (
        <FormationQuestionnaire habit={showQ} onClose={() => setShowQ(null)}
          onDecide={(verdict, score, reflection) => {
            persist([...formed.filter(f => f.habitId !== showQ.id), {
              habitId: showQ.id, verdict, score, reflection,
              formedOn: today,
            }]);
            setShowQ(null);
            if (verdict === 'formed') store.showToast('Inducted into Hall of Fame', `${showQ.name}`);
            else store.showToast('Keep going', 'Reflection saved');
          }}/>
      )}
    </div>
  );
}

function Mini({ label, value }) {
  return (
    <div style={{flex:1}}>
      <div className="muted mono" style={{fontSize:9.5, letterSpacing:'0.08em', textTransform:'uppercase'}}>{label}</div>
      <div className="mono" style={{fontSize:13, fontWeight:500, marginTop:2}}>{value}</div>
    </div>
  );
}

// ── Questionnaire ─────────────────────────────
const QUESTIONS = [
  'I do this without thinking about it.',
  'I would feel weird or off if I skipped a day.',
  'My environment naturally supports this — I rarely have to set it up.',
  'I no longer need willpower or motivation to start.',
  'This feels like part of who I am, not something I\'m doing.',
];

function FormationQuestionnaire({ habit, onClose, onDecide }) {
  const [answers, setAnswers] = uSF(QUESTIONS.map(() => 0));
  const [reflection, setReflection] = uSF('');
  const total = answers.reduce((s, a) => s + a, 0);
  const max = QUESTIONS.length * 5;
  const score = total / QUESTIONS.length;
  const allAnswered = answers.every(a => a > 0);

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card fade-up" style={{width:620, maxHeight:'90vh', overflowY:'auto'}}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{position:'absolute', top:18, right:18}}>
          <ICONS.close style={{width:13,height:13}}/>
        </button>
        <div className="eyebrow">Habit-formation check-in</div>
        <h1 className="h1" style={{fontSize:34, marginTop:8, marginBottom:6, lineHeight:1.1}}>
          Has <em>{habit.name}</em><br/>become part of you?
        </h1>
        <p style={{margin:'0 0 24px', fontFamily:'var(--serif)', fontSize:16, lineHeight:1.5, color:'var(--ink-2)'}}>
          Rate each statement honestly. There's no wrong answer — the act of reflecting is the point.
        </p>

        <div style={{display:'flex', flexDirection:'column', gap:18, marginBottom:20}}>
          {QUESTIONS.map((q, i) => (
            <div key={i}>
              <div style={{fontSize:14.5, color:'var(--ink-2)', marginBottom:8, lineHeight:1.4}}>
                {i+1}. {q}
              </div>
              <div style={{display:'flex', gap:6, alignItems:'center'}}>
                <span className="muted mono" style={{fontSize:9.5, width:60}}>NOT YET</span>
                {[1,2,3,4,5].map(n => (
                  <button key={n} onClick={() => setAnswers(a => a.map((v,j) => j === i ? n : v))}
                    style={{
                      flex:1, height:30, borderRadius:6, cursor:'pointer',
                      border:'1px solid var(--rule-strong)',
                      background: answers[i] >= n ? 'var(--accent)' : 'var(--bg-elev)',
                      color: answers[i] >= n ? 'var(--bg)' : 'var(--ink-3)',
                      fontFamily:'var(--mono)', fontSize:11, fontWeight:500,
                      transition: 'all .12s',
                    }}>{n}</button>
                ))}
                <span className="muted mono" style={{fontSize:9.5, width:60, textAlign:'right'}}>FULLY</span>
              </div>
            </div>
          ))}
        </div>

        <div style={{marginBottom:20}}>
          <div className="field-label">A note to your future self (optional)</div>
          <textarea className="input" rows={2} placeholder="What changed? What still needs work?"
            value={reflection} onChange={e => setReflection(e.target.value)}/>
        </div>

        {allAnswered && (
          <div className="card card-pad" style={{background:'var(--bg-sunk)', marginBottom:20}}>
            <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline'}}>
              <div className="eyebrow">Your answer</div>
              <div className="mono" style={{fontSize:13}}>{total}/{max}</div>
            </div>
            <div style={{fontFamily:'var(--serif)', fontSize:18, fontStyle:'italic', marginTop:6, lineHeight:1.4}}>
              {score >= 4
                ? 'This sounds like a habit that has truly formed. Welcome it home.'
                : score >= 3
                  ? 'You\'re close — there\'s still some friction or willpower involved. Worth more time.'
                  : 'Not quite automatic yet. Keep at it; you\'re still in the plateau of latent potential.'}
            </div>
          </div>
        )}

        <div style={{display:'flex', gap:8, justifyContent:'flex-end'}}>
          <button className="btn" onClick={onClose}>Save & decide later</button>
          <button className="btn" disabled={!allAnswered}
            onClick={() => onDecide('not-yet', score, reflection)}>
            Not yet — keep going
          </button>
          <button className="btn btn-primary" disabled={!allAnswered || score < 3}
            onClick={() => onDecide('formed', score, reflection)}>
            <ICONS.star style={{width:13,height:13}}/> Induct to Hall of Fame
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Accountability contract sheet (invite collaborators) ──────────
function ContractSheet({ habit, onClose, onSave }) {
  const [terms, setTerms] = uSF(habit.contract || '');
  const [invites, setInvites] = uSF(habit.contractPartners || []);
  const [email, setEmail] = uSF('');

  const addInvite = (channel, value) => {
    if (!value) return;
    setInvites([...invites, { id: Date.now(), channel, value, status: 'pending' }]);
    setEmail('');
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div className="overlay-card fade-up" style={{width:560, maxHeight:'90vh', overflowY:'auto'}}
        onClick={e => e.stopPropagation()}>
        <button onClick={onClose} className="btn btn-ghost btn-sm" style={{position:'absolute', top:18, right:18}}>
          <ICONS.close style={{width:13,height:13}}/>
        </button>
        <div className="eyebrow">Accountability contract</div>
        <h1 className="h1" style={{fontSize:32, marginTop:8, marginBottom:6, lineHeight:1.1}}>
          Make it <em>matter</em>.
        </h1>
        <p style={{margin:'0 0 20px', fontFamily:'var(--serif)', fontSize:15.5, lineHeight:1.5, color:'var(--ink-2)'}}>
          A contract adds a real cost to skipping. Stronger when someone you respect can see it.
        </p>

        <div style={{marginBottom:18}}>
          <div className="field-label">If I skip this habit, I will…</div>
          <textarea className="input" rows={2}
            placeholder="Send $20 to a charity I dislike, logged with my partner."
            value={terms} onChange={e => setTerms(e.target.value)}/>
        </div>

        <div style={{marginBottom:18}}>
          <div className="field-label">Invite witnesses</div>
          <div style={{display:'flex', gap:6, marginBottom:10}}>
            <input className="input" placeholder="friend@example.com" type="email"
              value={email} onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && addInvite('email', email)}/>
            <button className="btn btn-primary btn-sm" onClick={() => addInvite('email', email)}>Send</button>
          </div>
          <div style={{display:'flex', gap:8, flexWrap:'wrap'}}>
            <button className="btn btn-sm" onClick={() => addInvite('google', 'via Google')}>
              <span style={{width:12,height:12,borderRadius:'50%',background:'conic-gradient(#fbbc05,#34a853,#4285f4,#ea4335,#fbbc05)',display:'inline-block'}}/>
              Connect Google
            </button>
            <button className="btn btn-sm" onClick={() => addInvite('apple', 'via Apple')}>
              Connect Apple
            </button>
            <button className="btn btn-sm" onClick={() => addInvite('qr', 'shareable QR')}>
              Generate QR code
            </button>
          </div>

          {invites.length > 0 && (
            <div style={{marginTop:14, display:'flex', flexDirection:'column', gap:8}}>
              {invites.map(inv => (
                <div key={inv.id} style={{display:'flex', alignItems:'center', justifyContent:'space-between', padding:'10px 14px', background:'var(--bg-sunk)', borderRadius:8}}>
                  <div style={{display:'flex', alignItems:'center', gap:10, minWidth:0}}>
                    <span className="chip" style={{fontSize:9.5, padding:'2px 8px'}}>{inv.channel}</span>
                    <span style={{fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap'}}>{inv.value}</span>
                  </div>
                  <span className="muted mono" style={{fontSize:10}}>PENDING</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{display:'flex', justifyContent:'flex-end', gap:8, paddingTop:18, borderTop:'1px solid var(--rule)'}}>
          <button className="btn" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={() => { onSave({ contract: terms, contractPartners: invites }); onClose(); }}>
            Save contract
          </button>
        </div>
      </div>
    </div>
  );
}

window.HallOfFameScreen = HallOfFameScreen;
window.FormationQuestionnaire = FormationQuestionnaire;
window.ContractSheet = ContractSheet;
