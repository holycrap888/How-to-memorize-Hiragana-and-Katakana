let state = {
  xp: 0, level: 1, streak: 0, lastDate: null,
  learnedHira: [], learnedKata: [],
  hardHira: [], hardKata: [],
  settings: { audio: true, romaji: true, particles: true, sr: true },
  achievements: {},
  quizBest: 0,
  memBest: 999,
};

function loadState() {
  const s = localStorage.getItem('harunaState');
  if (s) { try { state = {...state, ...JSON.parse(s)}; } catch(e){} }
  checkStreak();
}
function saveState() {
  localStorage.setItem('harunaState', JSON.stringify(state));
}
function checkStreak() {
  const today = new Date().toDateString();
  if (state.lastDate !== today) {
    const yesterday = new Date(Date.now()-86400000).toDateString();
    if (state.lastDate === yesterday) { state.streak++; }
    else if (state.lastDate !== today) { state.streak = 1; }
    state.lastDate = today;
    saveState();
  }
}
function addXP(amount) {
  state.xp += amount;
  const xpNeeded = state.level * 100;
  if (state.xp >= xpNeeded) {
    state.xp -= xpNeeded;
    state.level++;
    setTimeout(() => showLevelup(state.level), 300);
  }
  saveState();
  updateUI();
  showXPPopup('+' + amount + ' XP');
  checkAchievements();
}
function updateUI() {
  const el = (id) => document.getElementById(id);
  if(el('navXP')) el('navXP').textContent = state.xp;
  if(el('streakCount')) el('streakCount').textContent = state.streak;
  if(el('statXP')) el('statXP').textContent = state.xp;
  if(el('statStreak')) el('statStreak').textContent = state.streak;
  const learned = state.learnedHira.length + state.learnedKata.length;
  if(el('statLearned')) el('statLearned').textContent = learned;
  if(el('userLevel')) el('userLevel').textContent = state.level;
  const xpNeed = state.level * 100;
  const pct = Math.min((state.xp/xpNeed)*100,100);
  if(el('xpFill')) el('xpFill').style.width = pct + '%';
  if(el('xpProgress')) el('xpProgress').textContent = state.xp + ' / ' + xpNeed + ' XP';
  // Progress bars
  const hp = Math.round(state.learnedHira.length/46*100);
  const kp = Math.round(state.learnedKata.length/46*100);
  if(el('hiraProgFill')) el('hiraProgFill').style.width = hp + '%';
  if(el('kataProgFill')) el('kataProgFill').style.width = kp + '%';
  if(el('progHira')) el('progHira').textContent = state.learnedHira.length + '/46';
  if(el('progKata')) el('progKata').textContent = state.learnedKata.length + '/46';
  const weakCount = state.hardHira.length + state.hardKata.length;
  if(el('progWeak')) el('progWeak').textContent = weakCount;
  // Progress ring
  const overall = Math.round(learned/(HIRAGANA.length+KATAKANA.length)*100);
  if(el('progPct')) el('progPct').textContent = overall + '%';
  const circle = el('progCircle');
  if(circle) { const offset = 201 - (201 * overall / 100); circle.style.strokeDashoffset = offset; }
}

// =====================================================
// NAVIGATION
// =====================================================
function showPage(name) {
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.querySelectorAll('.tab-btn').forEach(b=>b.classList.remove('active'));
  const pg = document.getElementById('page-'+name);
  if(pg) pg.classList.add('active');
  const tb = document.querySelector(`.tab-btn[data-page="${name}"]`);
  if(tb) tb.classList.add('active');
  // Page init
  if(name==='hiragana') renderKanaGrid('hira','all');
  if(name==='katakana') renderKanaGrid('kata','all');
  if(name==='flashcards') initFC();
  if(name==='writing') initWriting();
  if(name==='memory') { document.getElementById('memoryMenu').style.display=''; document.getElementById('memoryGame').style.display='none'; }
  if(name==='quiz') { document.getElementById('quizMenu').style.display=''; document.getElementById('quizGame').style.display='none'; document.getElementById('quizResult').style.display='none'; }
  if(name==='song') { renderSongs('all'); stopAllSongs(); }
  if(name==='conversation') initConversation();
  if(name==='progress') { renderAchievements(); renderMissions(); updateUI(); }
  window.scrollTo(0,0);
}

// =====================================================
// PARTICLES
// =====================================================
function initParticles() {
  if(!state.settings.particles) return;
  const container = document.getElementById('particles');
  const chars = ['あ','い','う','え','お','か','き','く','ア','イ','ウ','さ','な','は'];
  for(let i=0;i<20;i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    const size = Math.random()*20+10;
    p.style.cssText = `width:${size}px;height:${size}px;left:${Math.random()*100}%;
      animation-duration:${Math.random()*20+15}s;animation-delay:${Math.random()*20}s;
      background:hsl(${Math.random()*60+300},80%,70%);opacity:0.1;font-size:${size}px;
      border-radius:50%;color:rgba(255,255,255,0.3);`;
    if(Math.random()>0.5) {
      p.textContent = chars[Math.floor(Math.random()*chars.length)];
      p.style.background = 'transparent';
      p.style.opacity = '0.15';
      p.style.fontFamily = "'Noto Sans JP',sans-serif";
    }
    container.appendChild(p);
  }
}

// =====================================================
// KANA GRID RENDERING
// =====================================================
function renderKanaGrid(type, filter) {
  const data = type==='hira' ? HIRAGANA : KATAKANA;
  const learned = type==='hira' ? state.learnedHira : state.learnedKata;
  const hard = type==='hira' ? state.hardHira : state.hardKata;
  const gridEl = document.getElementById(type==='hira'?'hiraGrid':'kataGrid');
  const filtered = filter==='all' ? data : data.filter(c=>c.type===filter);
  gridEl.innerHTML = filtered.map(c=>`
    <div class="kana-cell ${learned.includes(c.char)?'learned':''} ${hard.includes(c.char)?'hard':''}" onclick="openKanaModal('${c.char}','${type}')">
      <span class="kc">${c.char}</span>
      ${state.settings.romaji?`<span class="kr">${c.romaji}</span>`:''}
    </div>
  `).join('');
}

function filterHira(f, btn) {
  document.querySelectorAll('#hiraFilter .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderKanaGrid('hira', f);
}
function filterKata(f, btn) {
  document.querySelectorAll('#kataFilter .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  renderKanaGrid('kata', f);
}

// =====================================================
// KANA MODAL
// =====================================================
let currentModalChar = null;
let currentModalType = null;
function openKanaModal(char, type) {
  const data = type==='hira' ? HIRAGANA : KATAKANA;
  const c = data.find(x=>x.char===char);
  if(!c) return;
  currentModalChar = c;
  currentModalType = type;
  document.getElementById('modalChar').textContent = c.char;
  document.getElementById('modalRomaji').textContent = c.romaji;
  document.getElementById('modalThai').textContent = c.thai;
  document.getElementById('modalMnemonic').textContent = '💡 ' + c.mnemonic;
  document.getElementById('modalExample').textContent = '📝 ' + c.example;
  document.getElementById('kanaModal').classList.add('active');
  if(state.settings.audio) speakCharWithExample(c.char, c.example);
}
function closeModal() {
  document.getElementById('kanaModal').classList.remove('active');
}
function speakModal() {
  if(currentModalChar) speakCharWithExample(currentModalChar.char, currentModalChar.example);
}
function markModalLearned() {
  if(!currentModalChar) return;
  const arr = currentModalType==='hira' ? state.learnedHira : state.learnedKata;
  if(!arr.includes(currentModalChar.char)) { arr.push(currentModalChar.char); saveState(); addXP(5); }
  closeModal();
  const type = currentModalType;
  renderKanaGrid(type, 'all');
}
function goWriteChar() {
  closeModal();
  showPage('writing');
  if(currentModalChar) setWriteCharByChar(currentModalChar);
}

// =====================================================
// SPEECH SYNTHESIS
// =====================================================
// =====================================================
// SPEECH SYNTHESIS — ใช้ตัวอักษรญี่ปุ่นจริง ไม่ใช่ romaji
// =====================================================
let voices = [];
function loadVoices() {
  voices = window.speechSynthesis.getVoices();
}
if (window.speechSynthesis) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

function getJapaneseVoice() {
  // เลือก voice ภาษาญี่ปุ่นที่ดีที่สุดที่มี
  const jaVoices = voices.filter(v => v.lang && v.lang.startsWith('ja'));
  // ลำดับความสำคัญ: Google > Microsoft > native
  const preferred = jaVoices.find(v => /google/i.test(v.name)) ||
                    jaVoices.find(v => /microsoft/i.test(v.name)) ||
                    jaVoices.find(v => v.localService) ||
                    jaVoices[0] || null;
  return preferred;
}

function speakJapanese(japaneseChar) {
  if (!state.settings.audio) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const u = new SpeechSynthesisUtterance(japaneseChar);
  u.lang = 'ja-JP';
  u.rate = 0.7;   // ช้าลงเพื่อความชัดเจน
  u.pitch = 1.0;
  u.volume = 1.0;

  const voice = getJapaneseVoice();
  if (voice) u.voice = voice;

  window.speechSynthesis.speak(u);
}

// พูดตัวอักษรพร้อม example word เพื่อเสริมความเข้าใจ
function speakCharWithExample(char, exampleWord) {
  if (!state.settings.audio) return;
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();

  const voice = getJapaneseVoice();

  // พูดตัวอักษรก่อน
  const u1 = new SpeechSynthesisUtterance(char);
  u1.lang = 'ja-JP';
  u1.rate = 0.6;
  u1.pitch = 1.0;
  u1.volume = 1.0;
  if (voice) u1.voice = voice;

  window.speechSynthesis.speak(u1);

  // ถ้ามี example word พูดตามหลังจาก 800ms
  if (exampleWord) {
    // ดึงแค่ตัวอักษรญี่ปุ่นจาก example string เช่น "あめ (ame) = ฝน" → "あめ"
    const jpMatch = exampleWord.match(/^([^\s(（]+)/);
    if (jpMatch) {
      const u2 = new SpeechSynthesisUtterance(jpMatch[1]);
      u2.lang = 'ja-JP';
      u2.rate = 0.7;
      u2.pitch = 1.0;
      u2.volume = 1.0;
      if (voice) u2.voice = voice;
      setTimeout(() => window.speechSynthesis.speak(u2), 900);
    }
  }
}

// =====================================================
// FLASHCARD SYSTEM
// =====================================================
let fcDeck = [];
let fcIndex = 0;
let fcType = 'all';
let fcFlipped = false;

function setFCType(type, btn) {
  document.querySelectorAll('.type-selector .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  fcType = type;
  initFC();
}

function buildFCDeck() {
  let cards = [];
  if(fcType==='all'||fcType==='hiragana') cards = [...cards, ...HIRAGANA.map(c=>({...c,script:'ฮิรางานะ'}))];
  if(fcType==='all'||fcType==='katakana') cards = [...cards, ...KATAKANA.map(c=>({...c,script:'คาตาคานะ'}))];
  if(fcType==='weak') {
    const wh = HIRAGANA.filter(c=>state.hardHira.includes(c.char)).map(c=>({...c,script:'ฮิรางานะ'}));
    const wk = KATAKANA.filter(c=>state.hardKata.includes(c.char)).map(c=>({...c,script:'คาตาคานะ'}));
    cards = [...wh,...wk];
    if(cards.length===0) cards = [...HIRAGANA.slice(0,10).map(c=>({...c,script:'ฮิรางานะ'}))];
  }
  // Spaced repetition: put hard chars first
  if(state.settings.sr) {
    const hard = cards.filter(c=>state.hardHira.includes(c.char)||state.hardKata.includes(c.char));
    const rest = cards.filter(c=>!state.hardHira.includes(c.char)&&!state.hardKata.includes(c.char));
    cards = [...hard, ...hard, ...rest]; // hard chars appear 2x more
  }
  return shuffle(cards);
}

function shuffle(arr) {
  const a = [...arr];
  for(let i=a.length-1;i>0;i--) { const j=Math.floor(Math.random()*(i+1));[a[i],a[j]]=[a[j],a[i]]; }
  return a;
}

function initFC() {
  fcDeck = buildFCDeck();
  fcIndex = 0;
  fcFlipped = false;
  renderFC();
}

function renderFC() {
  if(fcDeck.length===0) return;
  const c = fcDeck[fcIndex];
  const card = document.getElementById('flashcard');
  card.classList.remove('flipped');
  fcFlipped = false;
  document.getElementById('fcChar').textContent = c.char;
  document.getElementById('fcTypeLabel').textContent = c.script || '';
  document.getElementById('fcRomaji').textContent = c.romaji;
  document.getElementById('fcThai').textContent = c.thai;
  document.getElementById('fcHint').textContent = '💡 ' + c.mnemonic;
  document.getElementById('fcExample').textContent = '📝 ' + c.example;
  document.getElementById('fcCurrent').textContent = fcIndex+1;
  document.getElementById('fcTotal').textContent = fcDeck.length;
  const pct = ((fcIndex+1)/fcDeck.length)*100;
  document.getElementById('fcProgFill').style.width = pct+'%';
  if(state.settings.audio) setTimeout(()=>speakCharWithExample(c.char, c.example),300);
}

function flipFC() {
  const card = document.getElementById('flashcard');
  fcFlipped = !fcFlipped;
  if(fcFlipped) {
    card.classList.add('flipped');
    // ออกเสียงตัวอักษรจริงเมื่อพลิกการ์ด
    if(fcDeck[fcIndex]) speakJapanese(fcDeck[fcIndex].char);
    addXP(1);
  } else {
    card.classList.remove('flipped');
  }
}

function nextFC() {
  fcIndex = (fcIndex+1) % fcDeck.length;
  renderFC();
}

function markFC(difficulty) {
  const c = fcDeck[fcIndex];
  if(!c) return;
  const isHira = HIRAGANA.some(x=>x.char===c.char);
  const learnedArr = isHira ? state.learnedHira : state.learnedKata;
  const hardArr = isHira ? state.hardHira : state.hardKata;
  if(difficulty==='easy') {
    if(!learnedArr.includes(c.char)) learnedArr.push(c.char);
    const hi = hardArr.indexOf(c.char);
    if(hi>-1) hardArr.splice(hi,1);
    addXP(10);
  } else {
    if(!hardArr.includes(c.char)) hardArr.push(c.char);
    const li = learnedArr.indexOf(c.char);
    if(li>-1) learnedArr.splice(li,1);
    addXP(2);
  }
  saveState();
  nextFC();
}

function speakCurrentFC() {
  if(fcDeck[fcIndex]) speakCharWithExample(fcDeck[fcIndex].char, fcDeck[fcIndex].example);
}

// =====================================================
// WRITING PRACTICE
// =====================================================
let drawCanvas, ctx, drawing = false, writeType = 'hiragana';
let currentWriteChar = HIRAGANA[0];
let guideOpacity = 0.15;

function initWriting() {
  drawCanvas = document.getElementById('drawCanvas');
  ctx = drawCanvas.getContext('2d');
  renderWriteSelectGrid();
  setWriteChar(currentWriteChar);
  setupCanvas();
}

function setupCanvas() {
  if(!drawCanvas) return;
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#ff6b9d';

  const getPos = (e) => {
    const rect = drawCanvas.getBoundingClientRect();
    const touch = e.touches ? e.touches[0] : e;
    return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
  };

  drawCanvas.addEventListener('mousedown', e => { drawing=true; ctx.beginPath(); const p=getPos(e); ctx.moveTo(p.x,p.y); });
  drawCanvas.addEventListener('mousemove', e => { if(!drawing)return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
  drawCanvas.addEventListener('mouseup', () => drawing=false);
  drawCanvas.addEventListener('mouseleave', () => drawing=false);
  drawCanvas.addEventListener('touchstart', e => { e.preventDefault(); drawing=true; ctx.beginPath(); const p=getPos(e); ctx.moveTo(p.x,p.y); });
  drawCanvas.addEventListener('touchmove', e => { e.preventDefault(); if(!drawing)return; const p=getPos(e); ctx.lineTo(p.x,p.y); ctx.stroke(); });
  drawCanvas.addEventListener('touchend', () => drawing=false);
}

function setWriteType(type, btn) {
  document.querySelectorAll('#page-writing .type-selector .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  writeType = type;
  currentWriteChar = (type==='hiragana' ? HIRAGANA : KATAKANA)[0];
  renderWriteSelectGrid();
  setWriteChar(currentWriteChar);
}

function renderWriteSelectGrid() {
  const data = writeType==='hiragana' ? HIRAGANA : KATAKANA;
  const gridEl = document.getElementById('writeSelectGrid');
  if(!gridEl) return;
  gridEl.innerHTML = data.slice(0,50).map(c=>`
    <div class="kana-cell" onclick="selectWriteChar('${c.char}')">
      <span class="kc">${c.char}</span>
      <span class="kr">${c.romaji}</span>
    </div>
  `).join('');
}

function selectWriteChar(char) {
  const data = writeType==='hiragana' ? HIRAGANA : KATAKANA;
  const c = data.find(x=>x.char===char);
  if(c) setWriteChar(c);
}

function setWriteCharByChar(c) {
  currentWriteChar = c;
  const wd = document.getElementById('writeChar');
  const wr = document.getElementById('writeRomaji');
  const wt = document.getElementById('writeThai');
  const wm = document.getElementById('writeMnemonic');
  if(wd) wd.textContent = c.char;
  if(wr) wr.textContent = c.romaji;
  if(wt) wt.textContent = c.thai;
  if(wm) wm.textContent = c.mnemonic;
  clearCanvas();
  drawGuide();
}

function setWriteChar(c) {
  currentWriteChar = c;
  setWriteCharByChar(c);
}

function drawGuide() {
  if(!ctx||!drawCanvas) return;
  ctx.save();
  ctx.globalAlpha = guideOpacity;
  ctx.font = '120px "Noto Sans JP"';
  ctx.fillStyle = '#b39ddb';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentWriteChar.char, drawCanvas.width/2, drawCanvas.height/2);
  ctx.restore();
}

function clearCanvas() {
  if(!ctx||!drawCanvas) return;
  ctx.clearRect(0,0,drawCanvas.width,drawCanvas.height);
  drawGuide();
}

function nextWriteChar() {
  const data = writeType==='hiragana' ? HIRAGANA : KATAKANA;
  const idx = data.findIndex(c=>c.char===currentWriteChar.char);
  const next = data[(idx+1)%data.length];
  setWriteChar(next);
  addXP(3);
}

function checkWriting() {
  clearCanvas();
  ctx.save();
  ctx.globalAlpha = 0.4;
  ctx.font = '120px "Noto Sans JP"';
  ctx.fillStyle = '#69f0ae';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(currentWriteChar.char, drawCanvas.width/2, drawCanvas.height/2);
  ctx.restore();
  addXP(5);
  showXPPopup('+5 XP ✍️');
}

// =====================================================
// QUIZ SYSTEM
// =====================================================
let quizType = 'char2romaji';
let quizScope = 'all';
let quizDeck = [];
let quizIndex = 0;
let quizScore = 0;
let quizCombo = 0;
let quizTimer = 30;
let quizTimerInterval = null;
let quizCorrect = 0;
let quizLastType = 'char2romaji';

function setQuizScope(s, btn) {
  document.querySelectorAll('#quizMenu .type-selector .type-btn').forEach(b=>b.classList.remove('active'));
  btn.classList.add('active');
  quizScope = s;
}

function buildQuizDeck() {
  let cards = [];
  if(quizScope==='all') cards = [...HIRAGANA.map(c=>({...c,script:'hira'})), ...KATAKANA.map(c=>({...c,script:'kata'}))];
  else if(quizScope==='hiragana') cards = HIRAGANA.map(c=>({...c,script:'hira'}));
  else if(quizScope==='katakana') cards = KATAKANA.map(c=>({...c,script:'kata'}));
  else if(quizScope==='weak') {
    const wh = HIRAGANA.filter(c=>state.hardHira.includes(c.char)).map(c=>({...c,script:'hira'}));
    const wk = KATAKANA.filter(c=>state.hardKata.includes(c.char)).map(c=>({...c,script:'kata'}));
    cards = [...wh,...wk];
    if(cards.length<4) cards = [...HIRAGANA.slice(0,20).map(c=>({...c,script:'hira'}))];
  }
  return shuffle(cards);
}

function getWrongOptions(correct, type, all, count=3) {
  const pool = all.filter(c=>c[type]!==correct[type]);
  const shuffled = shuffle(pool);
  return shuffled.slice(0,count).map(c=>c[type]);
}

function startQuiz(type) {
  quizLastType = type;
  quizType = type;
  quizDeck = buildQuizDeck();
  quizIndex = 0;
  quizScore = 0;
  quizCombo = 0;
  quizCorrect = 0;
  document.getElementById('quizMenu').style.display = 'none';
  document.getElementById('quizGame').style.display = '';
  document.getElementById('quizResult').style.display = 'none';
  if(type==='speed') { quizTimer=30; startQuizTimer(); }
  renderQuizQ();
}

function startQuizTimer() {
  clearInterval(quizTimerInterval);
  quizTimerInterval = setInterval(()=>{
    quizTimer--;
    document.getElementById('quizTimer').textContent = quizTimer;
    if(quizTimer<=0) { clearInterval(quizTimerInterval); endQuiz(); }
  },1000);
}

function renderQuizQ() {
  if(quizIndex>=quizDeck.length||(quizType!=='speed'&&quizIndex>=10)) { endQuiz(); return; }
  const c = quizDeck[quizIndex];
  const allCards = quizScope==='katakana' ? KATAKANA : (quizScope==='hiragana'?HIRAGANA:[...HIRAGANA,...KATAKANA]);

  document.getElementById('qNum').textContent = Math.min(quizIndex+1,10);
  document.getElementById('qTotal').textContent = quizType==='speed'?'∞':10;
  document.getElementById('quizScore').textContent = quizScore;
  document.getElementById('quizCombo').textContent = quizCombo;

  let qChar, qPrompt, options, correct;
  if(quizType==='char2romaji'||quizType==='speed'||quizType==='mixed') {
    qChar = c.char;
    qPrompt = 'เลือก romaji ที่ถูกต้อง';
    correct = c.romaji;
    const wrongs = getWrongOptions(c,'romaji',allCards,3);
    options = shuffle([correct, ...wrongs]);
  } else {
    qChar = c.romaji;
    qPrompt = 'เลือกตัวอักษรที่ถูกต้อง';
    correct = c.char;
    const wrongs = getWrongOptions(c,'char',allCards,3);
    options = shuffle([correct, ...wrongs]);
  }

  document.getElementById('qChar').textContent = qChar;
  document.getElementById('qChar').style.fontFamily = (quizType==='romaji2char'||quizType==='speed') ? 'inherit' : "'Noto Sans JP',sans-serif";
  document.getElementById('qPrompt').textContent = qPrompt;

  // ออกเสียงตัวอักษรญี่ปุ่นจริงๆ (เฉพาะ mode ที่แสดงตัวอักษร)
  if(state.settings.audio && quizType !== 'romaji2char') {
    setTimeout(() => speakJapanese(c.char), 200);
  }

  const optsEl = document.getElementById('quizOptions');
  optsEl.innerHTML = options.map(opt=>`
    <div class="quiz-opt" onclick="answerQuiz('${opt.replace(/'/g,"\\'")}','${correct.replace(/'/g,"\\'")}',this)">
      <span style="font-family:${quizType!=='char2romaji'&&quizType!=='speed'&&quizType!=='mixed'?"'Noto Sans JP',sans-serif":'inherit'}">${opt}</span>
    </div>
  `).join('');
}

function answerQuiz(answer, correct, btn) {
  document.querySelectorAll('.quiz-opt').forEach(b=>b.classList.add('disabled'));
  const isCorrect = answer===correct;
  btn.classList.add(isCorrect?'correct':'wrong');
  if(!isCorrect) {
    document.querySelectorAll('.quiz-opt').forEach(b=>{
      if(b.textContent.trim()===correct) b.classList.add('correct');
    });
  }
  if(isCorrect) {
    quizCombo++;
    quizCorrect++;
    const baseScore = 10;
    const comboBonus = Math.min(quizCombo*2,20);
    quizScore += baseScore + comboBonus;
    if(quizCombo>=3) showComboAnim(quizCombo);
    addXP(5);
  } else {
    quizCombo = 0;
  }
  document.getElementById('quizScore').textContent = quizScore;
  document.getElementById('quizCombo').textContent = quizCombo;
  setTimeout(()=>{ quizIndex++; renderQuizQ(); }, 800);
}

function endQuiz() {
  clearInterval(quizTimerInterval);
  document.getElementById('quizGame').style.display = 'none';
  document.getElementById('quizResult').style.display = '';
  document.getElementById('resultScore').textContent = quizScore + ' แต้ม';
  const msgs = [
    {min:0,msg:'ยังใหม่อยู่ ฝึกต่อไปนะคะ! 💪'},
    {min:50,msg:'ดีมากเลยค่ะ! เริ่มจำได้แล้ว 🌟'},
    {min:100,msg:'เก่งมากค่ะ! ทำได้ดีมาก! 🎉'},
    {min:200,msg:'สุดยอดเลยค่ะ! ฮารุนะภูมิใจมาก! 🏆'},
  ];
  let msg = msgs[0].msg;
  msgs.forEach(m=>{ if(quizScore>=m.min) msg = m.msg; });
  document.getElementById('resultMsg').textContent = msg;
  if(quizScore > state.quizBest) { state.quizBest = quizScore; saveState(); }
  addXP(Math.floor(quizScore/5));
}

function restartQuiz() {
  startQuiz(quizLastType);
}

// =====================================================
// MEMORY GAME
// =====================================================
let memCards = [];
let memRevealed = [];
let memMatches = 0;
let memFlips = 0;
let memLock = false;
let memDifficulty = 'easy';

function startMemory(difficulty) {
  memDifficulty = difficulty;
  const counts = {easy:6, medium:10, hard:15};
  const count = counts[difficulty];
  document.getElementById('memoryMenu').style.display = 'none';
  document.getElementById('memoryGame').style.display = '';
  
  const allKana = shuffle([...HIRAGANA.slice(0,30).map(c=>({...c,script:'hira'})), ...KATAKANA.slice(0,30).map(c=>({...c,script:'kata'}))]);
  const selected = allKana.slice(0,count);
  
  const pairs = [];
  selected.forEach(c => {
    pairs.push({id:c.char+'_kana',char:c.char,match:c.char+'_romaji',display:c.char,type:'kana'});
    pairs.push({id:c.char+'_romaji',char:c.char,match:c.char+'_kana',display:c.romaji,type:'romaji'});
  });
  
  memCards = shuffle(pairs);
  memMatches = 0;
  memFlips = 0;
  memRevealed = [];
  memLock = false;
  
  document.getElementById('memTotal').textContent = count;
  document.getElementById('memMatches').textContent = 0;
  document.getElementById('memFlips').textContent = 0;
  
  const cols = difficulty==='hard' ? 6 : (difficulty==='medium' ? 5 : 4);
  const grid = document.getElementById('memGrid');
  grid.style.gridTemplateColumns = `repeat(${cols},1fr)`;
  renderMemGrid();
}

function renderMemGrid() {
  const grid = document.getElementById('memGrid');
  grid.innerHTML = memCards.map((c,i)=>`
    <div class="memory-card" id="mc_${i}" onclick="flipMemCard(${i})">
      <div class="memory-card-inner memory-card-front"></div>
      <div class="memory-card-inner memory-card-back" style="font-family:${c.type==='kana'?"'Noto Sans JP',sans-serif":'inherit'};font-size:${c.type==='kana'?'1.4rem':'0.9rem'}">${c.display}</div>
    </div>
  `).join('');
}

function flipMemCard(i) {
  if(memLock) return;
  const card = document.getElementById('mc_'+i);
  if(!card||card.classList.contains('matched')||card.classList.contains('revealed')) return;
  card.classList.add('revealed');
  memFlips++;
  document.getElementById('memFlips').textContent = memFlips;
  memRevealed.push(i);
  if(memRevealed.length===2) {
    memLock = true;
    const [a,b] = memRevealed;
    const cardA = memCards[a], cardB = memCards[b];
    if(cardA.match===cardB.id || cardB.match===cardA.id) {
      setTimeout(()=>{
        document.getElementById('mc_'+a).classList.add('matched');
        document.getElementById('mc_'+b).classList.add('matched');
        memMatches++;
        document.getElementById('memMatches').textContent = memMatches;
        memRevealed = [];
        memLock = false;
        addXP(15);
        if(memMatches===memCards.length/2) {
          setTimeout(()=>alert('🎉 เยี่ยมมาก! จับคู่ครบหมดแล้วค่ะ!'), 300);
        }
      },300);
    } else {
      setTimeout(()=>{
        document.getElementById('mc_'+a).classList.remove('revealed');
        document.getElementById('mc_'+b).classList.remove('revealed');
        memRevealed = [];
        memLock = false;
      },800);
    }
  }
}

// =====================================================
// CONVERSATION SYSTEM
// =====================================================

function checkAchievements() {
  const learned = state.learnedHira.length + state.learnedKata.length;
  const unlock = (id) => {
    if(!state.achievements[id]) { state.achievements[id]=true; saveState(); showAchievementToast(id); }
  };
  if(learned>=1) unlock('first_kana');
  if(learned>=10) unlock('ten_kana');
  if(state.learnedHira.length>=46) unlock('all_hira');
  if(state.learnedKata.length>=46) unlock('all_kata');
  if(state.quizBest>=100) unlock('quiz_100');
  if(state.level>=5) unlock('level5');
  if(state.level>=10) unlock('level10');
  if(state.streak>=7) unlock('streak7');
  if(state.xp+learned*5>=100) unlock('total_100');
  if(learned>=HIRAGANA.length+KATAKANA.length) unlock('all_done');
}

function showAchievementToast(id) {
  const ach = ACHIEVEMENTS.find(a=>a.id===id);
  if(!ach) return;
  const toast = document.createElement('div');
  toast.style.cssText = `position:fixed;top:70px;right:16px;z-index:200;
    background:linear-gradient(135deg,rgba(255,215,64,0.9),rgba(255,171,64,0.9));
    color:#111;padding:10px 16px;border-radius:12px;font-size:0.85rem;
    animation:xpPop 3s ease forwards;font-weight:700;`;
  toast.textContent = ach.icon + ' ปลดล็อค: ' + ach.name;
  document.body.appendChild(toast);
  setTimeout(()=>toast.remove(),3000);
}

function renderAchievements() {
  ['allAchievements','homeAchievements'].forEach(id => {
    const el = document.getElementById(id);
    if(!el) return;
    const count = id==='homeAchievements' ? 6 : ACHIEVEMENTS.length;
    el.innerHTML = ACHIEVEMENTS.slice(0,count).map(a=>`
      <div class="achievement ${state.achievements[a.id]?'unlocked':''}">
        <span class="ach-icon">${a.icon}</span>
        <div class="ach-name">${a.name}</div>
      </div>
    `).join('');
  });
}

// =====================================================
// DAILY MISSIONS
// =====================================================

function renderMissions() {
  const el = document.getElementById('dailyMissions');
  if(!el) return;
  el.innerHTML = MISSIONS.map(m=>`
    <div class="card" style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px">
      <div>
        <div style="font-size:0.85rem;font-weight:600">${m.text}</div>
        <div style="font-size:0.75rem;color:var(--yellow)">+${m.xp} XP</div>
      </div>
      <div style="font-size:1.2rem">${state.achievements['mission_'+m.id]?'✅':'⬜'}</div>
    </div>
  `).join('');
}

// =====================================================
// UI HELPERS
// =====================================================
function showXPPopup(text) {
  const el = document.createElement('div');
  el.className = 'xp-popup';
  el.textContent = text;
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1500);
}

function showComboAnim(combo) {
  const colors = ['#ffd740','#ff6b9d','#69f0ae','#4fc3f7','#ff5252'];
  const el = document.createElement('div');
  el.className = 'combo-anim';
  el.textContent = `🔥 ${combo}x COMBO!`;
  el.style.color = colors[Math.min(combo-3,4)];
  document.body.appendChild(el);
  setTimeout(()=>el.remove(),1000);
}

function showLevelup(level) {
  document.getElementById('newLevel').textContent = level;
  document.getElementById('levelupOverlay').classList.add('active');
}
function closeLevelup() {
  document.getElementById('levelupOverlay').classList.remove('active');
}

// =====================================================
// THEME
// =====================================================
let isLight = false;
function toggleTheme() {
  isLight = !isLight;
  document.body.classList.toggle('light-mode', isLight);
  const btn = document.getElementById('lightToggle');
  if(btn) btn.classList.toggle('on', isLight);
  localStorage.setItem('lightMode', isLight);
}

function toggleSetting(key) {
  state.settings[key] = !state.settings[key];
  const toggleEl = document.getElementById(key+'Toggle');
  if(toggleEl) toggleEl.classList.toggle('on', state.settings[key]);
  saveState();
  if(key==='particles') {
    const pc = document.getElementById('particles');
    if(pc) pc.style.display = state.settings.particles ? '' : 'none';
  }
}

// =====================================================
// DAILY TIPS
// =====================================================

function initJPBg() {
  const el = document.getElementById('jpBg');
  const chars = HIRAGANA.concat(KATAKANA).map(c=>c.char).join('');
  el.textContent = chars.repeat(5);
}

// =====================================================
// 🎵 SONG MODE — ระบบเพลงช่วยจำ (Event-Timeline Architecture)
// =====================================================

// แต่ละ song มี `steps` — array ของ events ที่เกิดตามลำดับเวลา
// step: { type: 'note'|'speak'|'highlight'|'lyric', ... , delay: ms จาก step ก่อน }
// ทุกอย่างวิ่งบน timeline เดียว ไม่มีการ drift


let audioCtx = null;
let currentSongId = null;
let songTimeouts = [];
let songIsPlaying = false;
let beatInterval = null;
let speechQueue = [];
let speechBusy = false;

function getAudioCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playNote(freq, dur, time, vol = 0.25) {
  if (!freq || freq <= 0) return;
  try {
    const ctx = getAudioCtx();
    // melody
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain); gain.connect(ctx.destination);
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, time);
    gain.gain.linearRampToValueAtTime(vol, time + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur / 1000 - 0.01);
    osc.start(time); osc.stop(time + dur / 1000);
    // harmony (octave up, softer)
    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.connect(gain2); gain2.connect(ctx.destination);
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2;
    gain2.gain.setValueAtTime(0, time);
    gain2.gain.linearRampToValueAtTime(vol * 0.18, time + 0.01);
    gain2.gain.exponentialRampToValueAtTime(0.001, time + dur / 1000 - 0.01);
    osc2.start(time); osc2.stop(time + dur / 1000);
  } catch(e) {}
}

// Sequential speech queue — พูดทีละตัว รอให้จบแล้วค่อยพูดตัวต่อไป
function enqueueSpeech(char, atMs) {
  speechQueue.push({ char, atMs });
}

function processSpeechQueue(startWallMs) {
  if (!songIsPlaying || speechQueue.length === 0) return;
  const now = Date.now();
  const item = speechQueue[0];
  const fireAt = startWallMs + item.atMs;
  const wait = Math.max(0, fireAt - now);

  const t = setTimeout(() => {
    if (!songIsPlaying) return;
    speechQueue.shift();
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(item.char);
    u.lang = 'ja-JP';
    u.rate = 0.8;
    u.pitch = 1.0;
    u.volume = 1.0;
    const v = getJapaneseVoice();
    if (v) u.voice = v;
    u.onend = () => { if (songIsPlaying) processSpeechQueue(startWallMs); };
    u.onerror = () => { if (songIsPlaying) processSpeechQueue(startWallMs); };
    window.speechSynthesis.speak(u);
  }, wait);
  songTimeouts.push(t);
}

function playSong(songId) {
  const song = SONGS.find(s => s.id === songId);
  if (!song) return;

  if (songIsPlaying) { stopAllSongs(); if (currentSongId === songId) return; }

  currentSongId = songId;
  songIsPlaying = true;
  speechQueue = [];
  speechBusy = false;
  window.speechSynthesis.cancel();

  // อัปเดต UI
  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
  const card = document.getElementById('sc_' + songId);
  if (card) card.classList.add('playing');
  const playBtn = document.getElementById('spb_' + songId);
  if (playBtn) { playBtn.textContent = '⏹ หยุดเพลง'; playBtn.classList.add('stop'); }

  // รีเซ็ต lyric และ char UI
  document.querySelectorAll(`#lyr_${songId} .lyric-line`).forEach(el => el.classList.remove('active'));
  document.querySelectorAll(`#chars_${songId} .song-char-pill`).forEach(el => el.classList.remove('active'));

  const ctx = getAudioCtx();
  const audioStart = ctx.currentTime + 0.15;
  const wallStart = Date.now() + 150;

  // ===== ประมวล steps ทั้งหมดจาก song.steps =====
  song.steps.forEach(step => {
    if (step.type === 'note') {
      // schedule ด้วย Web Audio (precise)
      const t = audioStart + step.delay / 1000;
      playNote(step.freq, step.dur, t);

    } else if (step.type === 'highlight') {
      // setTimeout สำหรับ UI (ยอมรับ ~10ms jitter ของ setTimeout ได้)
      const t = setTimeout(() => {
        if (!songIsPlaying) return;
        document.querySelectorAll(`#chars_${songId} .song-char-pill`).forEach((el, j) => {
          el.classList.toggle('active', j === step.index);
        });
      }, step.delay);
      songTimeouts.push(t);

    } else if (step.type === 'speak') {
      // ใส่ queue พูด
      enqueueSpeech(step.char, step.delay);

    } else if (step.type === 'lyric') {
      const t = setTimeout(() => {
        if (!songIsPlaying) return;
        document.querySelectorAll(`#lyr_${songId} .lyric-line`).forEach((el, j) => {
          el.classList.toggle('active', j === step.index);
        });
      }, step.delay);
      songTimeouts.push(t);
    }
  });

  // เริ่ม speech queue หลังจาก steps ถูก enqueue ครบ
  processSpeechQueue(wallStart);

  // จบเพลง
  const endT = setTimeout(() => stopAllSongs(), song.totalMs);
  songTimeouts.push(endT);

  // visualizer
  startVisualizer(songId);
  addXP(5);
}

function animateLyrics(songId, song) {} // unused — handled in playSong steps
function animateChars(songId, song) {}   // unused — handled in playSong steps

function startVisualizer(songId) {
  const visEl = document.getElementById('vis_' + songId);
  if (!visEl) return;
  const bars = visEl.querySelectorAll('.vis-bar');
  beatInterval = setInterval(() => {
    bars.forEach(bar => {
      const h = Math.random() * 24 + 4;
      bar.style.height = h + 'px';
    });
  }, 100);
  songTimeouts.push(beatInterval);
}

function stopAllSongs() {
  songIsPlaying = false;
  songTimeouts.forEach(t => clearTimeout(t));
  if (beatInterval) clearInterval(beatInterval);
  songTimeouts = [];
  beatInterval = null;

  // หยุดเสียงพูดทันที
  try { window.speechSynthesis.cancel(); } catch(e) {}

  // reset visualizers
  document.querySelectorAll('.vis-bar').forEach(b => b.style.height = '4px');
  document.querySelectorAll('.lyric-line').forEach(l => l.classList.remove('active'));
  document.querySelectorAll('.song-char-pill').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.song-card').forEach(c => c.classList.remove('playing'));
  document.querySelectorAll('.song-play-btn').forEach(b => {
    b.classList.remove('stop');
    b.textContent = '▶ ฟังเพลง + ร้องตาม';
  });

  if (audioCtx) { try { audioCtx.close(); } catch(e){} audioCtx = null; }
  currentSongId = null;
}

// ===== RENDER SONGS =====
function renderSongs(filter = 'all') {
  const list = document.getElementById('songList');
  if (!list) return;
  const filtered = filter === 'all' ? SONGS : SONGS.filter(s => s.script === filter);
  list.innerHTML = filtered.map(song => `
    <div class="song-card" id="sc_${song.id}">
      <div class="song-mode-badge">🎵 Melody Memory</div>
      <div class="song-card-header">
        <div class="song-icon" style="background:linear-gradient(135deg,${song.color},${song.color}88)">${song.icon}</div>
        <div>
          <div class="song-title">${song.title}</div>
          <div class="song-desc">${song.desc}</div>
        </div>
      </div>

      <div class="song-chars" id="chars_${song.id}">
        ${song.chars.map(c => `
          <div class="song-char-pill">
            <span style="font-family:'Noto Sans JP',sans-serif;font-size:1rem">${c.char}</span>
            <span class="pill-romaji">${c.romaji}</span>
          </div>
        `).join('')}
      </div>

      <div class="visualizer" id="vis_${song.id}">
        ${Array(12).fill(0).map(() => `<div class="vis-bar" style="height:4px"></div>`).join('')}
      </div>

      <div class="song-lyrics" id="lyr_${song.id}">
        ${song.lyrics.map((l, i) => `<div class="lyric-line" id="ll_${song.id}_${i}">${l}</div>`).join('')}
      </div>

      <button class="song-play-btn" id="spb_${song.id}" onclick="playSong('${song.id}')">
        ▶ ฟังเพลง + ร้องตาม
      </button>
    </div>
  `).join('');
}

function filterSongs(filter, btn) {
  document.querySelectorAll('#songFilter .type-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  stopAllSongs();
  renderSongs(filter);
}


function resetProgress() {
  if(confirm('ต้องการรีเซ็ตความก้าวหน้าทั้งหมดใช่ไหม? (ไม่สามารถเรียกคืนได้)')) {
    localStorage.removeItem('harunaState');
    location.reload();
  }
}

// =====================================================
// INIT
// =====================================================
window.addEventListener('DOMContentLoaded', ()=>{
  loadState();
  initParticles();
  initJPBg();
  renderAchievements();
  renderMissions();
  updateUI();

  // Set daily tip
  const tip = TIPS[new Date().getDate() % TIPS.length];
  const tipEl = document.getElementById('dailyTip');
  if(tipEl) tipEl.textContent = tip;

  // Init light mode
  const savedLight = localStorage.getItem('lightMode');
  if(savedLight==='true') { isLight=true; document.body.classList.add('light-mode'); document.getElementById('lightToggle').classList.add('on'); }

  // Init settings toggles
  ['audio','romaji','particles','sr'].forEach(k=>{
    const el = document.getElementById(k+'Toggle');
    if(el) el.classList.toggle('on', state.settings[k]);
  });

  // Update progress
  updateUI();

  console.log('🌸 ฮารุนะ Japanese Learning App Loaded!');
});

// ===== STATE =====
let currentChar = null;
let currentScene = 'greeting';

function rand(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

function rollNewChar() {
  const c = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
  setCharacter(c);
  initConversation();
}

function setCharacter(char) {
  currentChar = char;
  const av = document.getElementById('charAvatar');
  if(av){ av.textContent = char.emoji; av.style.background = char.bg; }
  const nm = document.getElementById('charName');
  if(nm) nm.textContent = char.name + ' (' + char.nameJP + ')';
  const tg = document.getElementById('charTag');
  if(tg) tg.textContent = char.tag;
  const ds = document.getElementById('charDesc');
  if(ds) ds.textContent = 'อายุ ' + char.age + ' ปี • ' + char.job + ' (' + char.jobJP + ') • จาก' + char.origin + ' • ชอบ' + char.hobby;
  const ps = document.getElementById('charPersonality');
  if(ps) ps.textContent = '💬 ' + char.personality;
  const tip = document.getElementById('convTip');
  if(tip) tip.textContent = char.tips;
}

function getCharReply(pool) {
  if(!currentChar || !pool) return '...';
  const arr = pool[currentChar.style] || pool['friendly'] || [];
  return rand(arr) || '...';
}

function setConvScene(scene, btn) {
  document.querySelectorAll('#sceneSelector .type-btn').forEach(b => b.classList.remove('active'));
  if(btn) btn.classList.add('active');
  currentScene = scene;
  initConversation();
}

function initConversation() {
  const chatArea = document.getElementById('chatArea');
  const chatChoices = document.getElementById('chatChoices');
  if(!chatArea) return;
  chatArea.innerHTML = '';
  if(chatChoices) chatChoices.innerHTML = '';

  if(!currentChar) {
    const c = CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
    setCharacter(c);
  }

  const scene = SCENES[currentScene];
  if(!scene) return;

  const openerText = getCharReply(scene.opener);
  setTimeout(() => {
    addBotMsg(openerText, currentChar);
    setTimeout(() => renderConvChoices(scene.choices), 600);
  }, 300);
}

function renderConvChoices(choices) {
  const chatChoices = document.getElementById('chatChoices');
  if(!chatChoices) return;
  chatChoices.innerHTML = choices.map(c => `
    <button class="choice-btn" onclick="handleConvChoice('${c.replace(/'/g,"\\'")}')">${c}</button>
  `).join('');
}

function handleConvChoice(choice) {
  if(choice === '🔄 เริ่มใหม่กับตัวละครนี้') { initConversation(); return; }
  if(choice === '🎭 สุ่มตัวละครใหม่') { rollNewChar(); return; }
  if(choice === '🎲 คุยต่อ (ตัวเลือกใหม่)') {
    const scene = SCENES[currentScene];
    const shuffled = shuffle([...scene.choices]);
    renderConvChoices(shuffled);
    return;
  }

  addUserMsg(choice);
  const chatChoices = document.getElementById('chatChoices');
  if(chatChoices) chatChoices.innerHTML = '';
  addXP(8);

  const scene = SCENES[currentScene];
  if(!scene) return;
  const responsePool = scene.responses?.[choice];
  const replyText = responsePool ? getCharReply(responsePool) : getCharReply(scene.opener);

  setTimeout(() => {
    addBotMsg(replyText, currentChar);
    setTimeout(() => {
      const followupArr = scene.followups?.[currentChar?.style] || scene.followups?.['friendly'] || [];
      const followup = rand(followupArr);
      if(followup) addBotMsg(followup, currentChar);
      setTimeout(() => {
        renderConvChoices([...scene.choices.slice(0,2), '🎲 คุยต่อ (ตัวเลือกใหม่)', '🔄 เริ่มใหม่กับตัวละครนี้', '🎭 สุ่มตัวละครใหม่']);
      }, 700);
    }, 600);
  }, 500);
}

function addBotMsg(text, char) {
  const chatArea = document.getElementById('chatArea');
  if(!chatArea) return;
  const avatar = char ? char.emoji : '🌸';
  const bg = char ? char.bg : 'linear-gradient(135deg,var(--pink),var(--purple))';
  const div = document.createElement('div');
  div.className = 'chat-msg bot';
  div.innerHTML = `<div class="chat-avatar" style="background:${bg}">${avatar}</div><div class="chat-bubble">${text.replace(/\n/g,'<br>')}</div>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
  if(state.settings.audio) {
    const jpMatch = text.match(/[ぁ-んァ-ン一-龯ー]+/g);
    if(jpMatch) setTimeout(() => speakJapanese(jpMatch.join('')), 200);
  }
}

function addUserMsg(text) {
  const chatArea = document.getElementById('chatArea');
  if(!chatArea) return;
  const div = document.createElement('div');
  div.className = 'chat-msg user';
  div.innerHTML = `<div class="chat-avatar">🙋</div><div class="chat-bubble">${text}</div>`;
  chatArea.appendChild(div);
  chatArea.scrollTop = chatArea.scrollHeight;
}

function renderChoices(choices) { renderConvChoices(choices); }
function handleChoice(choice) { handleConvChoice(choice); }