const { useState, useRef, useEffect } = React;

/* =========================================================
   1. DATA — plain JS, not React-specific
   ========================================================= */
const SOUNDS = [
  { id:'rain', name:'Rain', category:['calm'], accent:'#8fb3d9',
    desc:'Gentle raindrops to soothe your mind. The steady pattern helps calm the nervous system.',
    icon:'M12 2c-3 4-6 8-6 12a6 6 0 0 0 12 0c0-4-3-8-6-12z', type:'rain' },
  { id:'ocean', name:'Ocean Waves', category:['calm'], accent:'#6bb3b8',
    desc:'Feel the rhythm of the sea. Wave patterns mirror natural breathing cycles.',
    icon:'M2 15q2.5-3 5-0t5-0 5-0 5-0M2 19q2.5-3 5-0t5-0 5-0 5-0', type:'ocean' },
  { id:'forest', name:'Forest', category:['calm'], accent:'#7fa88f',
    desc:'Rustling leaves and distant birdsong, reducing stress and lifting mood.',
    icon:'M12 2 6 12h3l-4 8h14l-4-8h3z', type:'forest' },
  { id:'peace', name:'Peace', category:['happy','calm'], accent:'#c9a7e8',
    desc:'A soft sustained chord to settle a busy mind and open the chest for deeper breaths.',
    icon:'M12 21c-5-3-9-6.5-9-11a5 5 0 0 1 9-3 5 5 0 0 1 9 3c0 4.5-4 8-9 11z', type:'peace' },
  { id:'piano', name:'Piano Melodies', category:['happy'], accent:'#e8b86d',
    desc:'Slow, generative piano phrases — every listen is a little different.',
    icon:'M4 9h16v10H4zM6 9v6M9 9v6M12 9v6M15 9v6M18 9v6', type:'piano' },
  { id:'waterfall', name:'Waterfall Flow', category:['calm','meditation'], accent:'#5fb0c9',
    desc:'A fuller rushing sound that masks distractions and encourages focus.',
    icon:'M6 3v6l-3 12h4l2-9 2 9h4l-3-12V3M14 3v6l3 12h4l-3-12V3', type:'waterfall' },
  { id:'fire', name:'Crackling Fire', category:['sad','calm'], accent:'#e2895a',
    desc:'The pop and crackle of a warm fire — a familiar comfort for heavy moments.',
    icon:'M12 2s5 5 5 10a5 5 0 0 1-10 0c0-2 1-3 1-3s1 2 2 2c-1-3 0-6 2-9z', type:'fire' },
  { id:'whitenoise', name:'White Noise', category:['meditation'], accent:'#9aa3b0',
    desc:'A flat, even hush that masks background sound and helps you settle.',
    icon:'M3 10v4h4l5 5V5L7 10H3z', type:'white' },
  { id:'meditation', name:'Meditation', category:['meditation'], accent:'#d4af37',
    desc:'Singing-bowl style tones, spaced slowly, to anchor a breathing practice.',
    icon:'M12 3v3M8 5l1.5 2.5M16 5 14.5 7.5M4 15a8 8 0 0 0 16 0z', type:'bowl' },
];

const CATEGORIES = [
  {id:'all', label:'All'},
  {id:'calm', label:'Calm'},
  {id:'happy', label:'Happy'},
  {id:'sad', label:'Sad'},
  {id:'meditation', label:'Meditation'},
];

/* 
   2. AUDIO ENGINE — plain JS (not React). React only manages
   *when* a sound plays (via state); the actual synthesis is
   ordinary Web Audio API, same as a vanilla-JS app would use.
    */
function createAudioEngine(){
  let ctx = null;
  let noiseBuffer = null;

  function getCtx(){
    if(!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if(ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function getNoiseBuffer(){
    if(noiseBuffer) return noiseBuffer;
    const c = getCtx();
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const data = buf.getChannelData(0);
    for(let i=0;i<len;i++) data[i] = Math.random()*2-1;
    noiseBuffer = buf;
    return buf;
  }
  function noiseSource(){
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = getNoiseBuffer();
    src.loop = true;
    return src;
  }
  function buildFilteredNoise(freq, q, gainVal, lfoRate, lfoDepth){
    const c = getCtx();
    const src = noiseSource();
    const filter = c.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = freq; filter.Q.value = q||0.7;
    const gain = c.createGain(); gain.gain.value = gainVal;
    src.connect(filter).connect(gain).connect(c.destination);
    src.start();
    let lfo, lfoGain;
    if(lfoRate){
      lfo = c.createOscillator(); lfo.frequency.value = lfoRate;
      lfoGain = c.createGain(); lfoGain.gain.value = lfoDepth;
      lfo.connect(lfoGain).connect(gain.gain);
      lfo.start();
    }
    return { stop(){ src.stop(); if(lfo) lfo.stop(); } };
  }
  function buildForest(){
    const base = buildFilteredNoise(900, 1.2, 0.08);
    const c = getCtx();
    let timer;
    const chirp = () => {
      const o = c.createOscillator(); o.type='sine';
      const g = c.createGain(); g.gain.value = 0;
      o.frequency.value = 1800 + Math.random()*1200;
      o.connect(g).connect(c.destination);
      const t = c.currentTime;
      g.gain.linearRampToValueAtTime(0.05, t+0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, t+0.25);
      o.start(t); o.stop(t+0.3);
      timer = setTimeout(chirp, 2500 + Math.random()*4000);
    };
    timer = setTimeout(chirp, 1500);
    return { stop(){ base.stop(); clearTimeout(timer); } };
  }
  function buildFire(){
    const c = getCtx();
    let running = true;
    const pop = () => {
      if(!running) return;
      const src = noiseSource();
      const filter = c.createBiquadFilter();
      filter.type='highpass'; filter.frequency.value = 800;
      const g = c.createGain(); g.gain.value = 0;
      src.connect(filter).connect(g).connect(c.destination);
      const t = c.currentTime;
      const len = 0.03 + Math.random()*0.05;
      g.gain.linearRampToValueAtTime(0.08+Math.random()*0.1, t+0.005);
      g.gain.exponentialRampToValueAtTime(0.0001, t+len);
      src.start(t); src.stop(t+len+0.02);
      setTimeout(pop, 90 + Math.random()*300);
    };
    pop();
    return { stop(){ running = false; } };
  }
  function buildPeace(){
    const c = getCtx();
    const notes = [130.8, 164.8, 196];
    const master = c.createGain(); master.gain.value = 0.06;
    master.connect(c.destination);
    const oscs = notes.map(f=>{
      const o = c.createOscillator(); o.type='sine'; o.frequency.value = f;
      o.connect(master); o.start(); return o;
    });
    const lfo = c.createOscillator(); lfo.frequency.value = 0.08;
    const lfoGain = c.createGain(); lfoGain.gain.value = 0.03;
    lfo.connect(lfoGain).connect(master.gain);
    lfo.start();
    return { stop(){ oscs.forEach(o=>o.stop()); lfo.stop(); } };
  }
  function buildPiano(){
    const c = getCtx();
    const scale = [261.6, 293.7, 329.6, 392.0, 440.0, 523.3];
    let running = true;
    const master = c.createGain(); master.gain.value = 0.5;
    master.connect(c.destination);
    const note = () => {
      if(!running) return;
      const f = scale[Math.floor(Math.random()*scale.length)];
      const o = c.createOscillator(); o.type='triangle'; o.frequency.value = f;
      const g = c.createGain(); g.gain.value = 0;
      o.connect(g).connect(master);
      const t = c.currentTime;
      g.gain.linearRampToValueAtTime(0.14, t+0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t+1.6);
      o.start(t); o.stop(t+1.7);
      setTimeout(note, 1400 + Math.random()*1800);
    };
    note();
    return { stop(){ running = false; } };
  }
  function buildBowl(){
    const c = getCtx();
    let running = true;
    const master = c.createGain(); master.gain.value = 0.5;
    master.connect(c.destination);
    const strike = () => {
      if(!running) return;
      const t = c.currentTime;
      [220, 220*2.76].forEach((f, i)=>{
        const o = c.createOscillator(); o.type='sine'; o.frequency.value = f;
        const g = c.createGain(); g.gain.value = 0;
        o.connect(g).connect(master);
        const vol = i===0 ? 0.16 : 0.05;
        g.gain.linearRampToValueAtTime(vol, t+1.2);
        g.gain.exponentialRampToValueAtTime(0.0001, t+7);
        o.start(t); o.stop(t+7.2);
      });
      setTimeout(strike, 9000);
    };
    strike();
    return { stop(){ running = false; } };
  }

  const BUILDERS = {
    rain:()=>buildFilteredNoise(1200,0.6,0.14),
    ocean:()=>buildFilteredNoise(500,0.8,0.18,0.09,0.12),
    forest:buildForest,
    waterfall:()=>buildFilteredNoise(2200,0.7,0.20,0.4,0.06),
    white:()=>buildFilteredNoise(20000,0.3,0.12),
    fire:buildFire, peace:buildPeace, piano:buildPiano, bowl:buildBowl
  };

  return { build: (type) => BUILDERS[type]() };
}

/* 
   3. SIGN UP PAGE
   A controlled form: every input's value lives in React state
   (useState), and we validate on submit before "creating" the
   account. The account is stored in localStorage just so a
   returning visitor skips the form — a real app would call a
   backend API here instead.
    */
function SignUp({ onSuccess }){
  const [form, setForm] = useState({ name:'', email:'', password:'', confirm:'' });
  const [errors, setErrors] = useState({});

  const handleChange = (field) => (e) => {
    setForm({ ...form, [field]: e.target.value });
  };

  const validate = () => {
    const errs = {};
    if(!form.name.trim()) errs.name = 'Please enter your name';
    if(!/^\S+@\S+\.\S+$/.test(form.email)) errs.email = 'Enter a valid email';
    if(form.password.length < 6) errs.password = 'Password must be at least 6 characters';
    if(form.confirm !== form.password) errs.confirm = 'Passwords do not match';
    return errs;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const errs = validate();
    setErrors(errs);
    if(Object.keys(errs).length === 0){
      const user = { name: form.name.trim(), email: form.email.trim() };
      localStorage.setItem('wellness_user', JSON.stringify(user));
      onSuccess(user);
    }
  };

  return (
    <div className="auth-wrap">
      <div className="auth-card">
        <div className="breath small"><span>breathe</span></div>
        <h1 className="auth-title">Create your account</h1>
        <p className="tagline">Sign up to start mixing your calm.</p>

        <form onSubmit={handleSubmit} noValidate>
          <label className="field">
            <span>Name</span>
            <input type="text" value={form.name} onChange={handleChange('name')} placeholder="Your name" />
            {errors.name && <small className="error">{errors.name}</small>}
          </label>

          <label className="field">
            <span>Email</span>
            <input type="email" value={form.email} onChange={handleChange('email')} placeholder="you@example.com" />
            {errors.email && <small className="error">{errors.email}</small>}
          </label>

          <label className="field">
            <span>Password</span>
            <input type="password" value={form.password} onChange={handleChange('password')} placeholder="At least 6 characters" />
            {errors.password && <small className="error">{errors.password}</small>}
          </label>

          <label className="field">
            <span>Confirm password</span>
            <input type="password" value={form.confirm} onChange={handleChange('confirm')} placeholder="Re-enter password" />
            {errors.confirm && <small className="error">{errors.confirm}</small>}
          </label>

          <button type="submit" className="auth-submit">Sign up</button>
        </form>
      </div>
    </div>
  );
}

/* =========================================================
   4. SOUNDBOARD COMPONENTS
   ========================================================= */
const ICON_PLAY = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>;
const ICON_PAUSE = <svg viewBox="0 0 24 24" fill="currentColor"><path d="M6 5h4v14H6zM14 5h4v14h-4z"/></svg>;

function Hero({ userName, onLogout }){
  return (
    <div className="hero">
      {userName && (
        <div className="welcome-bar">
          Welcome, {userName} · <button className="link-btn" onClick={onLogout}>Log out</button>
        </div>
      )}
      <div className="breath"><span>breathe</span></div>
      <h1>Mental Wellness Soundboard</h1>
      <p className="tagline">Mix ambient sounds to find your own calm — built with React, sounds generated live via the Web Audio API.</p>
    </div>
  );
}

function Filters({ current, onChange }){
  return (
    <div className="filters">
      {CATEGORIES.map(cat => (
        <button
          key={cat.id}
          className={`filter-btn ${cat.id===current ? 'active' : ''}`}
          onClick={() => onChange(cat.id)}
        >
          {cat.label}
        </button>
      ))}
    </div>
  );
}

function SoundCard({ sound, isPlaying, onToggle }){
  return (
    <div className={`card ${isPlaying ? 'playing' : ''}`} style={{ '--card-accent': sound.accent }}>
      <svg className="card-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round">
        <path d={sound.icon} />
      </svg>
      <h3>{sound.name}</h3>
      <p>{sound.desc}</p>
      <div className="card-foot">
        <button className="play-btn" onClick={() => onToggle(sound)} aria-label={`Play ${sound.name}`}>
          {isPlaying ? ICON_PAUSE : ICON_PLAY}
        </button>
        <div className="bars"><span></span><span></span><span></span><span></span></div>
      </div>
    </div>
  );
}

function Soundboard({ userName, onLogout }){
  const [category, setCategory] = useState('all');
  const [playingIds, setPlayingIds] = useState(new Set());

  // Audio engine + active node references live in refs — they're not
  // UI state, so they shouldn't trigger re-renders on their own.
  const engineRef = useRef(null);
  const activeRef = useRef({});

  if(!engineRef.current) engineRef.current = createAudioEngine();

  const handleToggle = (sound) => {
    const active = activeRef.current;

    
    if(active[sound.id]){
      active[sound.id].stop();
      delete active[sound.id];
      setPlayingIds(new Set());
      return;
    }

    
    Object.keys(active).forEach(id => {
      active[id].stop();
      delete active[id];
    });

    
    active[sound.id] = engineRef.current.build(sound.type);
    setPlayingIds(new Set([sound.id]));
  };

  const visibleSounds = category === 'all'
    ? SOUNDS
    : SOUNDS.filter(s => s.category.includes(category));

  return (
    <div className="wrap">
      <Hero userName={userName} onLogout={onLogout} />
      <Filters current={category} onChange={setCategory} />
      <div className="grid">
        {visibleSounds.map(sound => (
          <SoundCard
            key={sound.id}
            sound={sound}
            isPlaying={playingIds.has(sound.id)}
            onToggle={handleToggle}
          />
        ))}
      </div>
      <p className="hint">Tap a sound to play it — mix as many together as you like.</p>
    </div>
  );
}

/*
   5. APP — decides whether to show the sign-up page or the
   soundboard. useEffect checks localStorage once, on mount,
   for a returning user so they don't have to sign up again.
    */
function App(){
  const [user, setUser] = useState(undefined); // undefined = still checking

  useEffect(() => {
    const saved = localStorage.getItem('wellness_user');
    setUser(saved ? JSON.parse(saved) : null);
  }, []);

  const handleLogout = () => {
    localStorage.removeItem('wellness_user');
    setUser(null);
  };

  if(user === undefined) return null; 

  if(!user){
    return <SignUp onSuccess={(u) => setUser(u)} />;
  }

  return <Soundboard userName={user.name} onLogout={handleLogout} />;
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);


