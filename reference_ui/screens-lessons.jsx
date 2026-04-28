// screens-lessons.jsx — Daily lesson nuggets (random or sequential)

const { useState: uSL, useMemo: uML, useEffect: uEL } = React;

// ── Lesson library: 24 nuggets distilled from atomic-habit principles ──
const LESSONS = [
  { id: 1, chapter: 'Foundations', title: 'You do not rise to the level of your goals',
    quote: 'You do not rise to the level of your goals. You fall to the level of your systems.',
    body: 'Goals set the direction; systems get you there. A goal of "read more" without a system (a book on the desk, a fixed time, a 2-page minimum) leaves you guessing every day. The system removes the daily decision.',
    takeaway: 'Stop polishing the goal. Polish the system that produces it.',
    practice: 'Pick one habit you keep "trying" to do. Write down the system it would need.',
    minutes: 2 },
  { id: 2, chapter: 'Foundations', title: 'The 1% rule',
    quote: 'Habits are the compound interest of self-improvement.',
    body: '1% better every day for a year = 37× better. 1% worse = nearly zero. Most days the gain is invisible — the math only shows up months later. This is why habits feel pointless before they feel inevitable.',
    takeaway: 'Optimize for showing up, not for the result of any single day.',
    practice: 'Plot your check-ins for the past 30 days. The line is the proof.',
    minutes: 2 },
  { id: 3, chapter: 'Foundations', title: 'The plateau of latent potential',
    quote: 'Habits often appear to make no difference until you cross a critical threshold.',
    body: 'An ice cube doesn\'t melt at 31° or 30°. Then at 32° it transforms. Habits sit on a long flat plateau before the breakthrough. Quitting at month two is quitting one degree before the melt.',
    takeaway: 'When progress feels invisible, you are still inside the plateau, not outside the work.',
    practice: 'Write down the date you started a current habit. Commit to one more month.',
    minutes: 2 },
  { id: 4, chapter: 'Identity', title: 'Outcome vs. process vs. identity',
    quote: 'The most effective way to change your habits is to focus on who you wish to become.',
    body: 'Three layers: outcomes (what you get), processes (what you do), identity (what you believe). Most people start with outcomes. Lasting change starts at identity. "I am a runner" beats "I want to lose 10 lbs" every time.',
    takeaway: 'Don\'t pick a goal. Pick a person. Then act like them.',
    practice: 'Rewrite one of your habits as an identity statement: "I am someone who ___".',
    minutes: 3 },
  { id: 5, chapter: 'Identity', title: 'Every action is a vote',
    quote: 'Every action you take is a vote for the type of person you wish to become.',
    body: 'No single vote decides an election; no single check-in defines you. But majorities accumulate. Each repetition is a small piece of evidence you give yourself: "this is who I am."',
    takeaway: 'You don\'t have to be perfect. You just have to win the majority of votes.',
    practice: 'Open the Identity ledger and count the votes you\'ve cast this month.',
    minutes: 2 },
  { id: 6, chapter: 'Identity', title: 'Two-step identity change',
    quote: 'Decide the type of person you want to be. Prove it to yourself with small wins.',
    body: 'Identity emerges from habits, not the other way around. You believe you\'re a writer because you wrote 100 days in a row, not because you declared it. The proof comes first; the identity comes second.',
    takeaway: 'Belief without evidence collapses. Build the evidence pile.',
    practice: 'Name one identity you\'re building. List 3 actions that would be evidence.',
    minutes: 3 },
  { id: 7, chapter: '1st Law · Make it obvious', title: 'The Habits Scorecard',
    quote: 'The first step to changing bad habits is to be on the lookout for them.',
    body: 'Many habits are so automatic you stop noticing them. List everything you do in a typical day, then mark each + (helpful), − (harmful), or = (neutral). Awareness is the prerequisite for change.',
    takeaway: 'You can\'t change a habit you can\'t see.',
    practice: 'Score 10 things you did today. Notice anything?',
    minutes: 4 },
  { id: 8, chapter: '1st Law · Make it obvious', title: 'Implementation intentions',
    quote: 'When and where will I do this?',
    body: 'A study found people who wrote "I will exercise at [TIME] in [PLACE]" were 2–3× more likely to follow through. Vague plans collide with reality; specific ones survive it.',
    takeaway: 'Don\'t say "more". Say when and where.',
    practice: 'Rewrite a habit as: "I will [BEHAVIOR] at [TIME] in [LOCATION]".',
    minutes: 2 },
  { id: 9, chapter: '1st Law · Make it obvious', title: 'Habit stacking',
    quote: 'After [CURRENT HABIT], I will [NEW HABIT].',
    body: 'New habits ride the rails of old ones. Coffee → vitamins. Brush teeth → meditate. The existing habit is the cue you don\'t need to remember.',
    takeaway: 'Don\'t fight for new attention. Borrow attention you already pay.',
    practice: 'Pick a habit. What\'s the existing rail you can stack it onto?',
    minutes: 2 },
  { id: 10, chapter: '1st Law · Make it obvious', title: 'Environment > motivation',
    quote: 'Environment is the invisible hand that shapes human behavior.',
    body: 'You eat what\'s on the counter. You scroll what\'s on your home screen. The simplest behavior change isn\'t self-discipline — it\'s rearranging the room so the right thing is the obvious thing.',
    takeaway: 'Design the space. The space designs you back.',
    practice: 'Move one item this week to make a habit easier or harder.',
    minutes: 3 },
  { id: 11, chapter: '2nd Law · Make it attractive', title: 'Temptation bundling',
    quote: 'Pair an action you want to do with an action you need to do.',
    body: 'Only watch your favorite show while on the treadmill. Only listen to the podcast while walking. Bundling moves the craving onto the habit, so the habit becomes the gateway to the reward.',
    takeaway: 'Anchor a craving you already have to a habit you don\'t yet have.',
    practice: 'List one "want" + one "need". Bundle them this week.',
    minutes: 2 },
  { id: 12, chapter: '2nd Law · Make it attractive', title: 'Join the right tribe',
    quote: 'We imitate the close, the many, and the powerful.',
    body: 'Habits become attractive when we see others around us doing them. The fastest way to read more is to join people who read. Culture sets the gravity.',
    takeaway: 'Surround yourself with people whose default behaviors are your aspirational ones.',
    practice: 'Name one community (online or off) aligned with the identity you\'re building.',
    minutes: 2 },
  { id: 13, chapter: '2nd Law · Make it attractive', title: 'Reframe "have to" as "get to"',
    quote: 'Highlight the benefits of avoiding a bad habit to make it seem unattractive.',
    body: 'Mindset is a multiplier. "I have to exercise" becomes "I get to move my body in a way most of the world can\'t." The action is the same; the framing changes whether it pulls or pushes.',
    takeaway: 'Edit the sentence you say in your head about the habit.',
    practice: 'Take a habit you resist. Write it as a "get to" sentence.',
    minutes: 2 },
  { id: 14, chapter: '3rd Law · Make it easy', title: 'Reduce friction',
    quote: 'Behavior is shaped by the path of least resistance.',
    body: 'Want to floss? Put the floss on the sink, not in the drawer. Want to skip social media? Log out, delete the app, leave the phone in another room. Each unit of friction removed is a unit of willpower saved.',
    takeaway: 'Make the good behavior 20 seconds easier; make the bad one 20 seconds harder.',
    practice: 'Identify one piece of friction blocking a habit. Remove it today.',
    minutes: 2 },
  { id: 15, chapter: '3rd Law · Make it easy', title: 'The 2-minute rule',
    quote: 'When you start a new habit, it should take less than two minutes to do.',
    body: '"Read before bed" → "Read one page". "Run 5K" → "Put on running shoes". Master the act of showing up first; scale comes later. A 2-minute version is impossible to skip and just as identity-building.',
    takeaway: 'Optimize for ritual, not result, in the early days.',
    practice: 'Shrink your hardest habit to a 2-minute version. Try it for a week.',
    minutes: 3 },
  { id: 16, chapter: '3rd Law · Make it easy', title: 'Master the decisive moment',
    quote: 'Every day is made of dozens of decisive moments.',
    body: 'You don\'t skip the gym at 6pm; you skip it at 5:55pm when you sit on the couch. The fork in the road is small and quiet. Win the moment of choice, and the action takes care of itself.',
    takeaway: 'Don\'t fight the habit. Win the 30 seconds before it.',
    practice: 'Identify the decisive moment for one habit. What can stage it for success?',
    minutes: 2 },
  { id: 17, chapter: '4th Law · Make it satisfying', title: 'Immediate reward beats delayed reward',
    quote: 'What is rewarded is repeated. What is punished is avoided.',
    body: 'The brain prioritizes the present. Habits with delayed rewards (exercise, saving) need a small immediate one bolted on — checking a box, transferring the saved amount to a "fun" account, the visual streak.',
    takeaway: 'Add a small, instant satisfaction to a long-delayed habit.',
    practice: 'Pair one delayed-reward habit with a tiny immediate reward you control.',
    minutes: 3 },
  { id: 18, chapter: '4th Law · Make it satisfying', title: 'Don\'t break the chain',
    quote: 'Never miss twice.',
    body: 'Missing once is an accident. Missing twice is the start of a new habit. The rule isn\'t perfection; the rule is rapid recovery. Slip Tuesday → show up Wednesday, no matter how small.',
    takeaway: 'Lower the bar dramatically the day after a miss. Just show up.',
    practice: 'Pre-decide your "minimum recovery action" for each habit.',
    minutes: 2 },
  { id: 19, chapter: '4th Law · Make it satisfying', title: 'Habit tracking',
    quote: 'Don\'t break the chain — the act of tracking itself is satisfying.',
    body: 'A visible streak (X marks on a calendar, dots filling a wall) creates immediate proof of progress. The tracker becomes its own reward; the desire to extend it becomes its own motivation.',
    takeaway: 'A visible record turns the long arc into a daily game you want to win.',
    practice: 'Open the 26-week wall on any habit. The wall is the reward.',
    minutes: 2 },
  { id: 20, chapter: 'Advanced', title: 'Goldilocks rule',
    quote: 'Humans love challenges, but only those right at the edge of current ability.',
    body: 'Too easy → boredom. Too hard → discouragement. Adherence lives in the narrow band of "manageable difficulty" — about a 4% stretch above your current ability. When a habit gets boring, that\'s the signal to slightly raise it.',
    takeaway: 'When boredom hits, don\'t quit. Step the difficulty up by one notch.',
    practice: 'Pick your most automated habit. What\'s the next 5% upgrade?',
    minutes: 3 },
  { id: 21, chapter: 'Advanced', title: 'The downside of habits',
    quote: 'Habits + deliberate practice = mastery.',
    body: 'Habits make actions automatic, which is great — but automatic also means thoughtless. Mastery requires periodic friction: a coach\'s eye, a deliberate review, a slightly harder version. The habit is the floor, not the ceiling.',
    takeaway: 'Habits keep you in the game. Reflection makes you better at it.',
    practice: 'Schedule one weekly review of a habit. What needs upgrading?',
    minutes: 3 },
  { id: 22, chapter: 'Advanced', title: 'Reflect & review',
    quote: 'Reflection prevents drift.',
    body: 'Without review, habits decay or freeze. The pros embed two cycles: a weekly review (small course corrections) and an annual review (larger questions of identity). The review is what keeps your habits aligned with who you\'re becoming.',
    takeaway: 'Schedule the reflection. The unreflected habit drifts.',
    practice: 'Block 20 minutes on Sunday for a weekly review. Use the prompts in this app.',
    minutes: 3 },
  { id: 23, chapter: 'Advanced', title: 'Accountability contracts',
    quote: 'We are less likely to repeat a bad habit if it is painful or unsatisfying.',
    body: 'A contract with someone you respect — money on the line, public commitment — adds an immediate, social cost to skipping. The cost is what makes the long-term reward feel near.',
    takeaway: 'Make your future self answerable to someone, not just to themselves.',
    practice: 'Pick one habit. Tell one person. Add one consequence.',
    minutes: 3 },
  { id: 24, chapter: 'Advanced', title: 'Identity must stay flexible',
    quote: 'Hold your identity loosely.',
    body: 'Strong identity creates focus, but rigid identity creates fragility. "I am a vegan" breaks the day you eat dairy by accident. "I am someone who chooses food intentionally" survives. Build identities that bend.',
    takeaway: 'Pick an identity broad enough to survive a bad day.',
    practice: 'Audit your identity statement. Does it survive a slip? If not, broaden it.',
    minutes: 3 },
];

const CHAPTERS = [...new Set(LESSONS.map(l => l.chapter))];

// ── Pick today's lesson based on mode + a stable per-day seed ──────
function pickToday(mode, completed, all) {
  const remaining = all.filter(l => !completed.includes(l.id));
  if (remaining.length === 0) return all[0];
  if (mode === 'sequential') {
    return remaining[0];
  }
  // Random — but stable for the day so refreshing doesn't reroll
  const seed = todayKey().split('-').reduce((a, p) => a + Number(p), 0);
  return remaining[seed % remaining.length];
}

function LessonsScreen({ store }) {
  // Persisted state — completed lessons + mode + current view
  const [completed, setCompleted] = uSL([1, 2, 3, 4, 7]); // pre-seed a few as already-read
  const [mode, setMode] = uSL('sequential'); // 'sequential' | 'random'
  const [view, setView] = uSL('home'); // 'home' | 'reading' | 'library'
  const [activeId, setActiveId] = uSL(null);
  const [streak, setStreakCount] = uSL(5);

  const todaysLesson = uML(() => pickToday(mode, completed, LESSONS), [mode, completed]);
  const active = activeId ? LESSONS.find(l => l.id === activeId) : todaysLesson;

  const markComplete = (id) => {
    if (!completed.includes(id)) {
      setCompleted([...completed, id]);
      store.showToast('Lesson complete', `+1 to your streak`);
      setStreakCount(s => s + 1);
    }
  };

  const totalProgress = Math.round((completed.length / LESSONS.length) * 100);

  if (view === 'reading' && active) {
    return <LessonReader lesson={active} isComplete={completed.includes(active.id)}
      onComplete={() => markComplete(active.id)}
      onBack={() => { setView('home'); setActiveId(null); }} />;
  }

  if (view === 'library') {
    return <LessonLibrary lessons={LESSONS} completed={completed}
      onOpen={(id) => { setActiveId(id); setView('reading'); }}
      onBack={() => setView('home')} />;
  }

  // ── Home ──
  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="eyebrow">Daily nugget · {fmt.long(todayKey())}</div>
          <h1 className="h1">A small <em>lesson</em>, every day.</h1>
          <p className="lede" style={{marginTop:14}}>
            Two minutes a day, one principle at a time. Tiny lessons compound the same way habits do.
          </p>
        </div>
        <button className="btn" onClick={() => setView('library')}>
          Browse all <ICONS.arrow style={{width:13,height:13}}/>
        </button>
      </div>

      {/* Stats strip */}
      <div style={{display:'grid', gridTemplateColumns:'repeat(3, 1fr)', gap:18, marginBottom:24}}>
        <div className="card card-pad">
          <div className="eyebrow">Lesson streak</div>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginTop:6}}>
            <div style={{fontFamily:'var(--serif)', fontSize:34, lineHeight:1}}>{streak}</div>
            <div className="muted mono" style={{fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase'}}>days</div>
          </div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow">Progress</div>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginTop:6}}>
            <div style={{fontFamily:'var(--serif)', fontSize:34, lineHeight:1}}>{completed.length}</div>
            <div className="muted mono" style={{fontSize:11}}>/ {LESSONS.length} read</div>
          </div>
          <div style={{height:4, background:'var(--bg-sunk)', borderRadius:99, marginTop:10, overflow:'hidden'}}>
            <div style={{width:`${totalProgress}%`, height:'100%', background:'var(--accent)', transition:'width .4s'}}/>
          </div>
        </div>
        <div className="card card-pad">
          <div className="eyebrow">Time invested</div>
          <div style={{display:'flex', alignItems:'baseline', gap:8, marginTop:6}}>
            <div style={{fontFamily:'var(--serif)', fontSize:34, lineHeight:1}}>
              {completed.reduce((s, id) => s + (LESSONS.find(l => l.id === id)?.minutes || 0), 0)}
            </div>
            <div className="muted mono" style={{fontSize:11, letterSpacing:'0.06em', textTransform:'uppercase'}}>minutes</div>
          </div>
        </div>
      </div>

      {/* Mode toggle */}
      <div className="card card-pad" style={{marginBottom:24, display:'flex', justifyContent:'space-between', alignItems:'center'}}>
        <div>
          <div className="h3" style={{marginBottom:4}}>How should the daily lesson be picked?</div>
          <div className="muted" style={{fontSize:12.5, fontStyle:'italic', fontFamily:'var(--serif)'}}>
            {mode === 'sequential'
              ? 'Sequential — work through the curriculum in order, foundations first.'
              : 'Random — surprise yourself with a different principle each day.'}
          </div>
        </div>
        <div style={{display:'flex', gap:6, padding:3, background:'var(--bg-sunk)', borderRadius:10}}>
          <button onClick={() => setMode('sequential')}
            className="btn btn-sm"
            style={{
              background: mode === 'sequential' ? 'var(--bg-elev)' : 'transparent',
              borderColor: mode === 'sequential' ? 'var(--rule-strong)' : 'transparent',
              boxShadow: mode === 'sequential' ? '0 1px 2px rgba(0,0,0,.05)' : 'none',
            }}>Sequential</button>
          <button onClick={() => setMode('random')}
            className="btn btn-sm"
            style={{
              background: mode === 'random' ? 'var(--bg-elev)' : 'transparent',
              borderColor: mode === 'random' ? 'var(--rule-strong)' : 'transparent',
              boxShadow: mode === 'random' ? '0 1px 2px rgba(0,0,0,.05)' : 'none',
            }}>Random</button>
        </div>
      </div>

      {/* Today's nugget — hero card */}
      <article className="card card-pad-lg" style={{
        background: 'linear-gradient(180deg, var(--bg-elev) 0%, var(--bg-sunk) 100%)',
        marginBottom:24,
      }}>
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:18}}>
          <div>
            <div className="eyebrow" style={{color:'var(--accent)'}}>Today's nugget · {todaysLesson.chapter}</div>
            <h2 className="h2" style={{marginTop:8, fontSize:34}}>{todaysLesson.title}</h2>
          </div>
          <span className="chip"><ICONS.today style={{width:11,height:11}}/> {todaysLesson.minutes} min read</span>
        </div>
        <blockquote style={{
          margin:'18px 0', padding:'18px 22px', borderLeft:'2px solid var(--accent)',
          fontFamily:'var(--serif)', fontSize:22, fontStyle:'italic', lineHeight:1.4,
          color:'var(--ink-2)',
        }}>
          "{todaysLesson.quote}"
        </blockquote>
        <p style={{margin:0, fontFamily:'var(--serif)', fontSize:17, lineHeight:1.6, color:'var(--ink-2)'}}>
          {todaysLesson.body.slice(0, 180)}…
        </p>
        <div style={{display:'flex', gap:10, marginTop:24, paddingTop:18, borderTop:'1px solid var(--rule)'}}>
          <button className="btn btn-primary btn-lg"
            onClick={() => { setActiveId(todaysLesson.id); setView('reading'); }}>
            {completed.includes(todaysLesson.id) ? 'Re-read' : 'Start lesson'} <ICONS.arrow style={{width:13,height:13}}/>
          </button>
          {!completed.includes(todaysLesson.id) && (
            <button className="btn btn-lg" onClick={() => markComplete(todaysLesson.id)}>
              Mark as read
            </button>
          )}
        </div>
      </article>

      {/* Curriculum map */}
      <div className="card card-pad-lg">
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:14}}>
          <h3 className="h3">Curriculum map</h3>
          <span className="muted mono" style={{fontSize:10.5, letterSpacing:'0.08em'}}>
            {completed.length} OF {LESSONS.length} LESSONS
          </span>
        </div>
        <div style={{display:'flex', flexDirection:'column', gap:18}}>
          {CHAPTERS.map(ch => {
            const items = LESSONS.filter(l => l.chapter === ch);
            const doneInCh = items.filter(l => completed.includes(l.id)).length;
            return (
              <div key={ch}>
                <div style={{display:'flex', justifyContent:'space-between', alignItems:'baseline', marginBottom:8}}>
                  <div style={{fontFamily:'var(--serif)', fontSize:17, fontStyle:'italic'}}>{ch}</div>
                  <span className="muted mono" style={{fontSize:10.5}}>{doneInCh}/{items.length}</span>
                </div>
                <div style={{display:'flex', gap:4}}>
                  {items.map(l => {
                    const isDone = completed.includes(l.id);
                    const isToday = l.id === todaysLesson.id;
                    return (
                      <button key={l.id} title={l.title}
                        onClick={() => { setActiveId(l.id); setView('reading'); }}
                        style={{
                          flex:1, height:32, border:'none', cursor:'pointer',
                          borderRadius:4,
                          background: isDone ? 'var(--accent)' : 'var(--bg-sunk)',
                          opacity: isDone ? 1 : 0.7,
                          outline: isToday ? '2px solid var(--ink)' : 'none',
                          outlineOffset: isToday ? 2 : 0,
                          transition: 'transform .1s',
                        }}
                        onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
                        onMouseLeave={e => e.currentTarget.style.transform = 'none'}/>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Reader ─────────────────────────
function LessonReader({ lesson, isComplete, onComplete, onBack }) {
  return (
    <div className="fade-up" style={{maxWidth:680, margin:'0 auto'}}>
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:24}}>
        <ICONS.back /> Back to lessons
      </button>

      <div className="eyebrow" style={{color:'var(--accent)'}}>
        Lesson {String(lesson.id).padStart(2,'0')} · {lesson.chapter} · {lesson.minutes} min
      </div>
      <h1 className="h1" style={{fontSize:48, marginTop:10, lineHeight:1.05}}>{lesson.title}</h1>

      <blockquote style={{
        margin:'32px 0', padding:'24px 28px',
        borderLeft:'2px solid var(--accent)',
        background: 'var(--bg-sunk)', borderRadius:'0 8px 8px 0',
      }}>
        <div className="eyebrow" style={{marginBottom:10}}>Principle</div>
        <p style={{margin:0, fontFamily:'var(--serif)', fontSize:24, fontStyle:'italic', lineHeight:1.4, color:'var(--ink)'}}>
          "{lesson.quote}"
        </p>
      </blockquote>

      <div style={{fontFamily:'var(--serif)', fontSize:18.5, lineHeight:1.7, color:'var(--ink-2)', marginBottom:32}}>
        {lesson.body}
      </div>

      <div className="card card-pad" style={{background:'var(--accent-soft)', borderColor:'transparent', marginBottom:18}}>
        <div className="eyebrow" style={{color:'oklch(35% 0.10 60)'}}>Takeaway</div>
        <div style={{fontFamily:'var(--serif)', fontSize:20, fontStyle:'italic', marginTop:6, lineHeight:1.4, color:'var(--ink)'}}>
          {lesson.takeaway}
        </div>
      </div>

      <div className="card card-pad" style={{marginBottom:32}}>
        <div className="eyebrow">Try it today</div>
        <div style={{fontSize:15, marginTop:8, lineHeight:1.55, color:'var(--ink-2)'}}>
          {lesson.practice}
        </div>
      </div>

      <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', paddingTop:24, borderTop:'1px solid var(--rule)'}}>
        <div className="muted mono" style={{fontSize:11}}>
          {isComplete ? '✓ Marked as read' : 'When you\'re ready —'}
        </div>
        {isComplete ? (
          <button className="btn" onClick={onBack}>Done</button>
        ) : (
          <button className="btn btn-primary btn-lg" onClick={onComplete}>
            <ICONS.check style={{width:14,height:14}}/> I've read this
          </button>
        )}
      </div>
    </div>
  );
}

// ── Library ─────────────────────────
function LessonLibrary({ lessons, completed, onOpen, onBack }) {
  const [filter, setFilter] = uSL('all');
  const filtered = filter === 'all' ? lessons :
    filter === 'unread' ? lessons.filter(l => !completed.includes(l.id)) :
    lessons.filter(l => l.chapter === filter);

  return (
    <div className="fade-up">
      <button className="btn btn-ghost btn-sm" onClick={onBack} style={{marginBottom:18}}>
        <ICONS.back /> Today's lesson
      </button>

      <div className="page-header">
        <div>
          <div className="eyebrow">All lessons</div>
          <h1 className="h1">The full <em>curriculum</em></h1>
        </div>
        <span className="muted mono" style={{fontSize:11}}>{lessons.length} LESSONS · ~{lessons.reduce((s,l)=>s+l.minutes,0)} MIN</span>
      </div>

      <div className="tabs">
        <button className={`tab ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>All</button>
        <button className={`tab ${filter==='unread'?'active':''}`} onClick={() => setFilter('unread')}>Unread</button>
        {CHAPTERS.map(c => (
          <button key={c} className={`tab ${filter===c?'active':''}`} onClick={() => setFilter(c)}>{c}</button>
        ))}
      </div>

      <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:14}}>
        {filtered.map(l => {
          const isDone = completed.includes(l.id);
          return (
            <article key={l.id} className="card card-pad click-row" onClick={() => onOpen(l.id)}
              style={{cursor:'pointer', position:'relative'}}>
              <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:14}}>
                <div style={{flex:1, minWidth:0}}>
                  <div className="muted mono" style={{fontSize:10, letterSpacing:'0.08em', textTransform:'uppercase'}}>
                    {String(l.id).padStart(2,'0')} · {l.chapter}
                  </div>
                  <h3 style={{
                    margin:'8px 0 8px', fontFamily:'var(--serif)', fontSize:19, fontWeight:400,
                    lineHeight:1.25, letterSpacing:'-0.01em',
                    color: isDone ? 'var(--ink-3)' : 'var(--ink)',
                  }}>{l.title}</h3>
                  <p style={{margin:0, fontSize:13, color:'var(--ink-3)', fontStyle:'italic', fontFamily:'var(--serif)', lineHeight:1.45}}>
                    "{l.quote}"
                  </p>
                  <div style={{marginTop:12, display:'flex', gap:10, alignItems:'center'}}>
                    <span className="muted mono" style={{fontSize:10.5, letterSpacing:'0.06em'}}>{l.minutes} MIN</span>
                    {isDone && <span className="chip done" style={{fontSize:10, padding:'2px 8px'}}>✓ Read</span>}
                  </div>
                </div>
                <ICONS.arrow style={{width:14, height:14, color:'var(--ink-4)', flexShrink:0, marginTop:4}}/>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}

window.LessonsScreen = LessonsScreen;
