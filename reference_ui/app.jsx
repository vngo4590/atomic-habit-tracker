// app.jsx — Main shell, routing, tweaks panel

const { useState: uSA, useEffect: uEA, useMemo: uMA } = React;

const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
  "dark": false,
  "accentHue": 60,
  "showOnboarding": false,
  "density": "regular"
}/*EDITMODE-END*/;

const NAV = [
  { id: 'today',     label: 'Today',          icon: 'today',    key: 'T', group: 'Practice' },
  { id: 'habits',    label: 'All habits',     icon: 'list',     key: 'H', group: 'Practice' },
  { id: 'create',    label: 'New habit',      icon: 'plus',     key: 'N', group: 'Practice' },
  { id: 'analytics', label: 'Analytics',      icon: 'chart',    key: 'A', group: 'Reflect'  },
  { id: 'journal',   label: 'Journal',        icon: 'journal',  key: 'J', group: 'Reflect'  },
  { id: 'review',    label: 'Weekly review',  icon: 'review',   key: 'W', group: 'Reflect'  },
  { id: 'lessons',   label: 'Daily lessons',  icon: 'book',     key: 'L', group: 'Learn'    },
  { id: 'fame',      label: 'Hall of Fame',   icon: 'star',     key: 'F', group: 'Become'   },
  { id: 'identity',  label: 'Identity',       icon: 'identity', key: 'I', group: 'Become'   },
  { id: 'settings',  label: 'Settings',       icon: 'settings', key: ',', group: 'Become'   },
];

function App() {
  const store = useStore();
  const [tweaks, setTweak] = useTweaks(TWEAK_DEFAULTS);
  const [route, setRoute] = uSA({ name: 'today' });
  const [onboarding, setOnboarding] = uSA(tweaks.showOnboarding);

  // Apply theme + accent
  uEA(() => {
    document.documentElement.dataset.theme = tweaks.dark ? 'dark' : 'light';
    const hue = tweaks.accentHue;
    document.documentElement.style.setProperty('--accent', `oklch(62% 0.13 ${hue})`);
    document.documentElement.style.setProperty('--accent-2', `oklch(72% 0.10 ${hue})`);
    document.documentElement.style.setProperty('--accent-soft', `oklch(${tweaks.dark ? '28%' : '92%'} 0.04 ${hue})`);
  }, [tweaks.dark, tweaks.accentHue]);

  // Keyboard shortcuts
  uEA(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
      const item = NAV.find(n => n.key.toLowerCase() === e.key.toLowerCase());
      if (item) { e.preventDefault(); setRoute({ name: item.id }); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const goToHabit = (id) => setRoute({ name: 'habit', habitId: id });
  const goToCreate = () => setRoute({ name: 'create' });
  const goBack = () => setRoute({ name: route.from || 'habits' });

  let screen;
  switch (route.name) {
    case 'today':     screen = <TodayScreen store={store} goToHabit={goToHabit} />; break;
    case 'habits':    screen = <HabitsListScreen store={store} goToHabit={goToHabit} goToCreate={goToCreate} />; break;
    case 'habit':     screen = <HabitDetailScreen store={store} habitId={route.habitId} goBack={goBack} />; break;
    case 'create':    screen = <CreateHabitScreen store={store} onDone={() => setRoute({name:'habits'})} />; break;
    case 'analytics': screen = <AnalyticsScreen store={store} />; break;
    case 'journal':   screen = <JournalScreen store={store} />; break;
    case 'review':    screen = <WeeklyReviewScreen store={store} />; break;
    case 'lessons':   screen = <LessonsScreen store={store} />; break;
    case 'fame':      screen = <HallOfFameScreen store={store} openHabit={goToHabit} />; break;
    case 'identity':  screen = <IdentityScreen store={store} />; break;
    case 'settings':  screen = <SettingsScreen store={store} tweakValues={tweaks} setTweak={setTweak} />; break;
    default:          screen = <TodayScreen store={store} goToHabit={goToHabit} />;
  }

  // Group nav
  const groups = NAV.reduce((acc, n) => {
    (acc[n.group] = acc[n.group] || []).push(n);
    return acc;
  }, {});

  const totalVotes = store.habits.reduce((s, h) => s + Object.keys(h.history).length, 0);

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark"/>
          <div>
            <div className="brand-name">Atomicly</div>
            <div className="brand-sub">Habit Practice</div>
          </div>
        </div>

        {Object.entries(groups).map(([g, items]) => (
          <div key={g}>
            <div className="nav-group">{g}</div>
            {items.map(n => {
              const Icon = ICONS[n.icon];
              const active = route.name === n.id || (n.id === 'habits' && route.name === 'habit');
              return (
                <button key={n.id} className={`nav-item ${active ? 'active' : ''}`}
                  onClick={() => setRoute({ name: n.id })}>
                  <Icon className="nav-icon" />
                  <span>{n.label}</span>
                  <span className="ni-key">{n.key}</span>
                </button>
              );
            })}
          </div>
        ))}

        <div className="sidebar-foot">
          <div className="avatar">A</div>
          <div style={{minWidth:0, flex:1}}>
            <div className="who-name">Alex Rivera</div>
            <div className="who-id">{totalVotes} votes cast</div>
          </div>
        </div>
      </aside>

      <main className="main" data-screen-label={route.name}>
        <div className="main-inner">
          {screen}
        </div>
      </main>

      {/* Toast */}
      {store.toast && (
        <div className="toast fade-up" key={store.toast.id}>
          <span>{store.toast.msg}</span>
          {store.toast.sub && <em>{store.toast.sub}</em>}
        </div>
      )}

      {/* Onboarding */}
      {onboarding && <OnboardingOverlay onDone={() => setOnboarding(false)} />}

      {/* Tweaks */}
      <TweaksPanel title="Tweaks">
        <TweakSection label="Theme">
          <TweakToggle label="Dark mode" value={tweaks.dark} onChange={v => setTweak('dark', v)}/>
          <TweakRow label="Accent hue" value={tweaks.accentHue}>
            <input type="range" className="twk-slider" min={0} max={360} step={5}
              value={tweaks.accentHue} onChange={e => setTweak('accentHue', Number(e.target.value))}/>
          </TweakRow>
          <TweakRadio label="Quick palette" value={String(tweaks.accentHue)}
            options={[
              { value: '60', label: 'Ochre' },
              { value: '145', label: 'Sage' },
              { value: '240', label: 'Slate' },
              { value: '340', label: 'Plum' },
            ]}
            onChange={v => setTweak('accentHue', Number(v))}/>
        </TweakSection>
        <TweakSection label="Demo">
          <TweakButton label="Replay onboarding" onClick={() => setOnboarding(true)}/>
        </TweakSection>
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App/>);
