"use strict";
/* ============================================================
   AETHERFALL DUELS — an original lane-duel card game.
   Player vs AI "Voidwarden Malachai". 3 lanes, 20 life,
   Aether (mana) grows +1 per turn. Creatures wake the turn
   after summoning and strike the lane opposite them.
   No network, no assets: all art is inline SVG/CSS, all sound
   is synthesized with WebAudio. Deterministic under ?seed=.
   ============================================================ */

// ---------- seeded RNG (mulberry32) ----------
function mulberry32(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
const params = new URLSearchParams(location.search);
const SEED = parseInt(params.get("seed") || "20261123", 10);
let rng = mulberry32(SEED);
const rnd = () => rng();
const ri = (n) => Math.floor(rnd() * n);
function shuffle(a){ for(let i=a.length-1;i>0;i--){ const j=ri(i+1); [a[i],a[j]]=[a[j],a[i]]; } return a; }

// ---------- card glyphs (inline SVG art) ----------
const G = {
  flame:'<svg viewBox="0 0 64 64"><path d="M32 4c3 12-10 16-10 28a10 10 0 0 0 20 0c0-5-3-7-4-11 6 3 10 9 10 16a16 16 0 1 1-32 0C16 22 30 16 32 4z" fill="#ff9d2e"/><path d="M32 30c2 6-4 8-4 13a6 6 0 0 0 12 0c0-5-6-7-8-13z" fill="#ffd76a"/></svg>',
  rock:'<svg viewBox="0 0 64 64"><polygon points="14,50 22,18 40,10 52,26 48,50" fill="#9fb0d8"/><polygon points="22,18 40,10 44,30 28,36" fill="#c7d4f5"/><circle cx="36" cy="26" r="3" fill="#3a4a7a"/></svg>',
  leaf:'<svg viewBox="0 0 64 64"><path d="M52 10C30 12 14 28 12 52c24-2 40-18 40-42z" fill="#4ade80"/><path d="M16 48C24 34 36 24 48 16" stroke="#166534" stroke-width="3" fill="none"/></svg>',
  bolt:'<svg viewBox="0 0 64 64"><polygon points="36,4 14,38 28,38 24,60 50,26 35,26" fill="#ffe14d"/><polygon points="36,4 14,38 28,38 24,60 50,26 35,26" fill="none" stroke="#b8860b" stroke-width="2"/></svg>',
  wave:'<svg viewBox="0 0 64 64"><path d="M4 40c8-10 16-10 24 0s16 10 24 0 8-8 8-8v18H4z" fill="#2ea6ff"/><path d="M4 30c8-10 16-10 24 0s16 10 24 0 8-8 8-8v8c0 0-8 10-16 10s-16-10-24-10-16 10-16 10z" fill="#7ee0ff"/></svg>',
  moon:'<svg viewBox="0 0 64 64"><path d="M44 6a26 26 0 1 0 14 36A21 21 0 0 1 44 6z" fill="#c7d4f5"/><circle cx="46" cy="16" r="3" fill="#ffd76a"/><circle cx="54" cy="28" r="2" fill="#ffd76a"/></svg>',
  shield:'<svg viewBox="0 0 64 64"><path d="M32 4l20 7v16c0 15-8 26-20 33C20 53 12 42 12 27V11z" fill="#b78bff"/><path d="M32 12l13 4v11c0 10-5 18-13 23-8-5-13-13-13-23V16z" fill="#8b5cf6"/><polygon points="32,22 36,31 45,32 38,38 40,47 32,42 24,47 26,38 19,32 28,31" fill="#ffd76a"/></svg>',
  snow:'<svg viewBox="0 0 64 64"><g stroke="#bdf3ff" stroke-width="4" stroke-linecap="round"><path d="M32 6v52M10 19l44 26M54 19L10 45"/></g><circle cx="32" cy="32" r="6" fill="#7ee0ff"/></svg>',
  sun:'<svg viewBox="0 0 64 64"><g stroke="#ffb52e" stroke-width="4" stroke-linecap="round"><path d="M32 4v10M32 50v10M4 32h10M50 32h10M12 12l7 7M45 45l7 7M52 12l-7 7M19 45l-7 7"/></g><circle cx="32" cy="32" r="13" fill="#ffd76a"/></svg>',
  void:'<svg viewBox="0 0 64 64"><path d="M32 8a24 24 0 1 1-17 41A19 19 0 1 0 32 14a14 14 0 1 1-10 24A9 9 0 1 0 32 22a5 5 0 1 1-3 8" fill="none" stroke="#c07bff" stroke-width="5" stroke-linecap="round"/><circle cx="32" cy="32" r="4" fill="#e9d5ff"/></svg>',
  heal:'<svg viewBox="0 0 64 64"><path d="M26 8h12v18h18v12H38v18H26V38H8V26h18z" fill="#4ade80"/><path d="M26 8h12v18h18v12H38v18H26V38H8V26h18z" fill="none" stroke="#166534" stroke-width="2"/></svg>',
  surge:'<svg viewBox="0 0 64 64"><polygon points="32,4 40,24 60,24 44,37 50,58 32,45 14,58 20,37 4,24 24,24" fill="#ffd76a"/><polygon points="32,14 37,27 50,27 40,35 43,48 32,40 21,48 24,35 14,27 27,27" fill="#ff9d2e"/></svg>',
  meteor:'<svg viewBox="0 0 64 64"><circle cx="42" cy="42" r="13" fill="#ff6b6b"/><path d="M34 32L8 8M40 28L20 6M28 38L6 22" stroke="#ffb52e" stroke-width="5" stroke-linecap="round"/><circle cx="38" cy="38" r="5" fill="#ffd76a"/></svg>',
};

// ---------- card pool (original) ----------
const POOL = [
  {id:"sprite",  name:"Ember Sprite",   kind:"creature", cost:1, atk:2, hp:1, rarity:"common",    glyph:"flame",  type:"Creature — Ember",    ability:"Strikes opposite for <b>2</b>, or the hero if empty. Wakes next turn.", text:"A spark with a grudge."},
  {id:"golem",   name:"Stone Golem",    kind:"creature", cost:2, atk:1, hp:4, rarity:"common",    glyph:"rock",   type:"Creature — Golem",    ability:"Strikes opposite for <b>1</b>, or the hero if empty. Wakes next turn.", text:"Slow. Immovable. Polite."},
  {id:"dryad",   name:"Thorn Dryad",    kind:"creature", cost:2, atk:2, hp:3, rarity:"common",    glyph:"leaf",   type:"Creature — Dryad",    ability:"Strikes opposite for <b>2</b>, or the hero if empty. Wakes next turn.", text:"The forest fights back."},
  {id:"hawk",    name:"Storm Hawk",     kind:"creature", cost:3, atk:3, hp:2, rarity:"rare",      glyph:"bolt",   type:"Creature — Hawk",     ability:"Strikes opposite for <b>3</b>, or the hero if empty. Wakes next turn.", text:"It arrives with the thunder."},
  {id:"serpent", name:"Tide Serpent",   kind:"creature", cost:4, atk:4, hp:4, rarity:"rare",      glyph:"wave",   type:"Creature — Serpent",  ability:"Strikes opposite for <b>4</b>, or the hero if empty. Wakes next turn.", text:"The deep keeps its promises."},
  {id:"stalker", name:"Night Stalker",  kind:"creature", cost:4, atk:5, hp:3, rarity:"rare",      glyph:"moon",   type:"Creature — Stalker",  ability:"Strikes opposite for <b>5</b>, or the hero if empty. Wakes next turn.", text:"You will hear it once."},
  {id:"knight",  name:"Rune Knight",    kind:"creature", cost:5, atk:4, hp:6, rarity:"epic",      glyph:"shield", type:"Creature — Knight",   ability:"Strikes opposite for <b>4</b>, or the hero if empty. Wakes next turn.", text:"Sworn to the falling light."},
  {id:"wyrm",    name:"Frost Wyrm",     kind:"creature", cost:6, atk:6, hp:5, rarity:"epic",      glyph:"snow",   type:"Creature — Wyrm",     ability:"Strikes opposite for <b>6</b>, or the hero if empty. Wakes next turn.", text:"Winter, given wings."},
  {id:"phoenix", name:"Solar Phoenix",  kind:"creature", cost:7, atk:7, hp:6, rarity:"legendary", glyph:"sun",    type:"Creature — Phoenix",  ability:"Strikes opposite for <b>7</b>, or the hero if empty. Wakes next turn.", text:"Dawn refuses to die."},
  {id:"colossus",name:"Void Colossus",  kind:"creature", cost:8, atk:9, hp:8, rarity:"legendary", glyph:"void",   type:"Creature — Colossus", ability:"Strikes opposite for <b>9</b>, or the hero if empty. Wakes next turn.", text:"The dark, standing up."},
  {id:"bolt",    name:"Arc Bolt",       kind:"spell",    cost:2, rarity:"common", glyph:"bolt",   type:"Spell — Lightning",   ability:"Deal <b>3</b> damage to any creature or hero.", text:"The sky keeps a ledger.", fx:"bolt"},
  {id:"mend",    name:"Mend",           kind:"spell",    cost:2, rarity:"common", glyph:"heal",   type:"Spell — Restoration", ability:"Restore <b>5</b> Life to your hero (max 20).", text:"Light, applied gently.", fx:"mend"},
  {id:"surge",   name:"Surge",          kind:"spell",    cost:1, rarity:"rare",   glyph:"surge",  type:"Spell — Blessing",    ability:"Give a friendly creature <b>+2/+2</b>.", text:"Strength arrives all at once.", fx:"surge"},
  {id:"meteor",  name:"Meteor",         kind:"spell",    cost:5, rarity:"epic",   glyph:"meteor", type:"Spell — Cataclysm",   ability:"Deal <b>4</b> damage to ALL enemy creatures.", text:"The heavens object.", fx:"meteor"},
];
const byId = Object.fromEntries(POOL.map(c => [c.id, c]));
function buildDeck(){
  const ids = ["sprite","sprite","golem","golem","dryad","dryad","hawk","hawk","serpent","serpent",
               "stalker","stalker","knight","knight","wyrm","phoenix","colossus","bolt","mend","surge","meteor"];
  return shuffle(ids.map(id => ({...byId[id]})));
}
let uid = 0;
function creature(card){ return {...card, uid:++uid, curHp:card.hp, sick:true, attacked:false}; }

// ---------- sound (synthesized, no files) ----------
let audioCtx = null, soundOn = true;
function beep(freq, dur, type="sine", gain=0.08){
  if(!soundOn) return;
  try{
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(gain, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.0001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  }catch(e){ /* sound is optional */ }
}
const sfx = {
  play: () => { beep(520,.12,"triangle"); setTimeout(()=>beep(780,.14,"triangle"),60); },
  hit:  () => beep(160,.18,"sawtooth",.12),
  face: () => { beep(110,.25,"sawtooth",.14); setTimeout(()=>beep(90,.3,"sawtooth",.12),90); },
  die:  () => beep(300,.3,"square",.07),
  heal: () => { beep(660,.15,"sine"); setTimeout(()=>beep(880,.2,"sine"),90); },
  win:  () => [523,659,784,1046].forEach((f,i)=>setTimeout(()=>beep(f,.3,"triangle",.1), i*130)),
  lose: () => [392,330,262,196].forEach((f,i)=>setTimeout(()=>beep(f,.35,"sine",.1), i*150)),
  turn: () => beep(440,.1,"sine",.06),
};

// ---------- game state ----------
const S = {
  turn:1, phase:"player", // player | enemy | over
  player:{life:20, aether:1, maxAether:1, deck:[], hand:[], board:[null,null,null]},
  enemy :{life:20, aether:1, maxAether:1, deck:[], hand:[], board:[null,null,null]},
  selected:-1, // index into player hand, or -1
  spellTarget:null, // card being targeted
  stats:{dealt:0, taken:0, played:0, kills:0},
  busy:false,
};
const $ = (id) => document.getElementById(id);
const els = {};
["screen-title","screen-game","screen-end","turn-pill","banner","log","toast",
 "enemy-life","player-life","enemy-deck","player-deck","enemy-hand","player-hand",
 "enemy-board","player-board","aether","btn-end","enemy-hero","player-hero",
 "end-title","end-text","end-stats","end-sigil"].forEach(id => els[id] = $(id));

function log(html){
  const d = document.createElement("div"); d.innerHTML = html;
  els["log"].prepend(d);
  while(els["log"].children.length > 7) els["log"].lastChild.remove();
}
let toastTimer = null;
function toast(msg){
  els["toast"].textContent = msg; els["toast"].classList.remove("hidden");
  clearTimeout(toastTimer); toastTimer = setTimeout(()=>els["toast"].classList.add("hidden"), 1800);
}
function banner(msg){ els["banner"].textContent = msg || ""; }
function floatText(anchorEl, text, cls=""){
  if(!anchorEl) return;
  const s = document.createElement("span");
  s.className = "dmg-float " + cls; s.textContent = text;
  const r = anchorEl.getBoundingClientRect(), pr = anchorEl.offsetParent ? anchorEl.offsetParent.getBoundingClientRect() : {left:0,top:0};
  s.style.left = (r.left - pr.left + r.width/2 - 14) + "px";
  s.style.top  = (r.top  - pr.top  + 6) + "px";
  (anchorEl.offsetParent || document.body).appendChild(s);
  setTimeout(()=>s.remove(), 1050);
}

// ---------- rendering ----------
const plain = (html) => html.replace(/<[^>]+>/g, "");
function cardHTML(c, opts={}){
  const hpNow = c.curHp ?? c.hp;
  const stats = c.kind === "creature"
    ? `<div class="stat-row"><div class="stat atk"><b>${c.atk}</b><small>ATK</small></div><div class="stat hp${hpNow < c.hp ? " hurt" : ""}"><b>${hpNow}</b><small>HP</small></div></div>` : `<div class="stat-row"></div>`;
  const zzz = opts.sick ? `<div class="zzz">💤</div>` : "";
  return `<div class="art">${G[c.glyph] || ""}</div>
    <div class="cname">${c.name}</div>
    <div class="ctype">${c.type}</div>
    <div class="cability">${c.ability}</div>
    <div class="cflavor">“${c.text}”</div>
    <div class="cost"><b>${c.cost}</b></div><div class="cost-tag">AETHER</div>
    <div class="rarity">${c.rarity.toUpperCase()}</div>${stats}${zzz}`;
}
function render(){
  els["player-life"].textContent = Math.max(0, S.player.life);
  els["enemy-life"].textContent  = Math.max(0, S.enemy.life);
  els["player-deck"].textContent = S.player.deck.length;
  els["enemy-deck"].textContent  = S.enemy.deck.length;
  els["turn-pill"].textContent = S.phase === "over" ? "Duel over"
    : `Turn ${S.turn} · ${S.phase === "player" ? "Your move" : "Voidwarden's move"}`;
  // aether gems
  els["aether"].innerHTML = "";
  for(let i=0;i<10;i++){
    const g = document.createElement("div");
    g.className = "gem" + (i < S.player.aether ? " on" : "") + (i < S.player.maxAether ? " max" : "");
    els["aether"].appendChild(g);
  }
  // enemy hand (backs)
  els["enemy-hand"].innerHTML = S.enemy.hand.map(()=>`<div class="card-back">☠</div>`).join("");
  // boards
  renderBoard("player", els["player-board"]);
  renderBoard("enemy",  els["enemy-board"]);
  // player hand
  els["player-hand"].innerHTML = "";
  S.player.hand.forEach((c, i) => {
    const d = document.createElement("div");
    d.className = `card ${c.kind} r-${c.rarity}` + (S.selected === i ? " selected" : "")
      + (c.cost > S.player.aether ? " unaffordable" : "");
    d.innerHTML = cardHTML(c);
    d.title = `${c.name} (${c.type}, ${c.rarity}) — ${plain(c.ability)} “${c.text}”`;
    d.addEventListener("click", () => onHandCard(i));
    els["player-hand"].appendChild(d);
  });
  els["btn-end"].disabled = S.phase !== "player" || S.busy;
}
function renderBoard(side, container){
  container.innerHTML = "";
  const selCard = S.selected >= 0 ? S.player.hand[S.selected] : null;
  const canPlace = side === "player" && selCard && selCard.kind === "creature" && S.phase === "player";
  S[side].board.forEach((c, lane) => {
    const d = document.createElement("div");
    d.className = "lane";
    d.innerHTML = `<span class="lane-label">LANE ${lane+1}</span>`;
    if(!c && canPlace) d.classList.add("targetable");
    if(c){
      const cd = document.createElement("div");
      const ready = side === "player" && !c.sick && !c.attacked && S.phase === "player" && !S.busy;
      const targetable = S.spellTarget && ((S.spellTarget.fx === "bolt") ||
        (S.spellTarget.fx === "surge" && side === "player"));
      cd.className = `card creature r-${c.rarity}` + (ready ? " ready" : "") + (c.sick ? " sick" : "")
        + (targetable ? " targetable" : "");
      cd.innerHTML = cardHTML(c, {sick: c.sick});
      cd.title = `${c.name} (${c.type}) — ${c.atk} ATK / ${c.curHp} HP. ${plain(c.ability)}`;
      if(side === "player") cd.addEventListener("click", () => onOwnCreature(lane));
      else cd.addEventListener("click", () => onEnemyCreature(lane));
      d.appendChild(cd);
    }
    if(side === "player") d.addEventListener("click", (e) => { if(e.target === d || e.target.classList.contains("lane-label")) onLane(lane); });
    container.appendChild(d);
  });
}

// ---------- core actions ----------
function draw(side){
  const p = S[side];
  if(p.deck.length === 0){ damageHero(side, 1, "fatigue"); return null; }
  const c = p.deck.pop();
  if(p.hand.length < 7) p.hand.push(c);
  return c;
}
function damageHero(side, n, src){
  S[side].life -= n;
  if(side === "enemy") S.stats.dealt += n; else S.stats.taken += n;
  floatText(side === "enemy" ? els["enemy-hero"] : els["player-hero"], "-" + n);
  sfx.face();
  checkEnd();
}
function damageCreature(side, lane, n){
  const c = S[side].board[lane];
  if(!c) return;
  c.curHp -= n;
  const el = (side === "player" ? els["player-board"] : els["enemy-board"]).children[lane];
  if(el){ const card = el.querySelector(".card"); if(card){ card.classList.add("flash"); floatText(card, "-" + n); } }
  sfx.hit();
  if(c.curHp <= 0){
    S[side].board[lane] = null;
    if(side === "enemy") S.stats.kills++;
    log(`<b>${c.name}</b> is destroyed.`);
    sfx.die();
  }
}
function summon(side, handIdx, lane){
  const p = S[side], card = p.hand[handIdx];
  p.aether -= card.cost;
  p.hand.splice(handIdx, 1);
  p.board[lane] = creature(card);
  if(side === "player") S.stats.played++;
  log(`${side === "player" ? "You summon" : "Voidwarden summons"} <b>${card.name}</b> (${card.atk}/${card.hp}) in lane ${lane+1}.`);
  sfx.play();
}
function attack(side, lane){
  const me = S[side], foe = S[side === "player" ? "enemy" : "player"];
  const c = me.board[lane];
  if(!c || c.sick || c.attacked) return;
  c.attacked = true;
  const foeName = side === "player" ? "enemy" : "player";
  if(foe.board[lane]){
    const d = foe.board[lane];
    log(`<b>${c.name}</b> strikes <b>${d.name}</b>.`);
    const myDmg = c.atk, theirDmg = d.atk;
    damageCreature(foeName, lane, myDmg);
    if(S[side].board[lane]) damageCreature(side, lane, theirDmg);
  } else {
    log(`<b>${c.name}</b> hits ${side === "player" ? "the Voidwarden" : "you"} for ${c.atk}.`);
    damageHero(foeName, c.atk, c.name);
  }
  render();
}
function castSpell(side, handIdx, target){
  const p = S[side], card = p.hand[handIdx];
  p.aether -= card.cost;
  p.hand.splice(handIdx, 1);
  if(side === "player") S.stats.played++;
  const who = side === "player" ? "You cast" : "Voidwarden casts";
  if(card.fx === "bolt"){
    if(target && target.hero){ log(`${who} <b>Arc Bolt</b> at ${target.hero === "enemy" ? "the Voidwarden" : "you"} for 3.`); damageHero(target.hero, 3, "Arc Bolt"); }
    else if(target){ log(`${who} <b>Arc Bolt</b> on <b>${S[target.side].board[target.lane].name}</b> for 3.`); damageCreature(target.side, target.lane, 3); }
  } else if(card.fx === "mend"){
    p.life = Math.min(20, p.life + 5);
    log(`${who} <b>Mend</b> (+5 Life).`);
    floatText(side === "player" ? els["player-hero"] : els["enemy-hero"], "+5", "heal");
    sfx.heal();
  } else if(card.fx === "surge" && target){
    const c = S[target.side].board[target.lane];
    c.atk += 2; c.hp += 2; c.curHp += 2;
    log(`${who} <b>Surge</b> on <b>${c.name}</b> (+2/+2).`);
    sfx.heal();
  } else if(card.fx === "meteor"){
    const foeName = side === "player" ? "enemy" : "player";
    log(`${who} <b>Meteor</b>! All ${side === "player" ? "enemy" : "your"} creatures take 4.`);
    for(let l=0;l<3;l++) if(S[foeName].board[l]) damageCreature(foeName, l, 4);
  }
  sfx.play();
  render();
}

// ---------- player interaction ----------
function onHandCard(i){
  if(S.phase !== "player" || S.busy) return;
  const c = S.player.hand[i];
  if(c.cost > S.player.aether){ toast("Not enough Aether"); return; }
  if(S.selected === i){ S.selected = -1; S.spellTarget = null; render(); return; }
  S.selected = i;
  if(c.kind === "spell" && (c.fx === "bolt" || c.fx === "surge")){ S.spellTarget = c; toast(c.fx === "bolt" ? "Choose a creature or hero to zap" : "Choose a friendly creature"); }
  else if(c.kind === "spell"){ castSpell("player", i, null); S.selected = -1; S.spellTarget = null; return; }
  else S.spellTarget = null;
  render();
}
function onLane(lane){
  if(S.phase !== "player" || S.busy || S.selected < 0) return;
  const c = S.player.hand[S.selected];
  if(c && c.kind === "creature" && !S.player.board[lane]){
    summon("player", S.selected, lane);
    S.selected = -1;
    render();
  }
}
function onOwnCreature(lane){
  if(S.phase !== "player" || S.busy) return;
  if(S.spellTarget && S.spellTarget.fx === "surge"){
    castSpell("player", S.selected, {side:"player", lane});
    S.selected = -1; S.spellTarget = null; return;
  }
  if(S.spellTarget && S.spellTarget.fx === "bolt"){
    castSpell("player", S.selected, {side:"player", lane});
    S.selected = -1; S.spellTarget = null; return;
  }
  attack("player", lane);
}
function onEnemyCreature(lane){
  if(S.phase !== "player" || S.busy) return;
  if(S.spellTarget && S.spellTarget.fx === "bolt"){
    castSpell("player", S.selected, {side:"enemy", lane});
    S.selected = -1; S.spellTarget = null;
  }
}
els["enemy-hero"].addEventListener("click", () => {
  if(S.spellTarget && S.spellTarget.fx === "bolt" && S.phase === "player" && !S.busy){
    castSpell("player", S.selected, {hero:"enemy"});
    S.selected = -1; S.spellTarget = null;
  }
});
els["player-hero"].addEventListener("click", () => {
  if(S.spellTarget && S.spellTarget.fx === "bolt" && S.phase === "player" && !S.busy){
    castSpell("player", S.selected, {hero:"player"});
    S.selected = -1; S.spellTarget = null;
  }
});
document.addEventListener("keydown", (e) => {
  if(els["screen-game"].classList.contains("hidden")) return;
  if(e.key >= "1" && e.key <= "7"){ const i = +e.key - 1; if(i < S.player.hand.length) onHandCard(i); }
  if(e.key === "Enter") endTurn();
});

// ---------- AI ----------
const wait = (ms) => new Promise(r => setTimeout(r, ms));
async function aiTurn(){
  S.busy = true; render();
  await wait(650);
  const E = S.enemy;
  // spells first if useful
  let guard = 0;
  while(guard++ < 8){
    const idx = E.hand.findIndex(c => c.kind === "spell" && c.cost <= E.aether);
    if(idx < 0) break;
    const c = E.hand[idx];
    if(c.fx === "meteor"){
      const targets = S.player.board.filter(Boolean);
      if(targets.length >= 2){ castSpell("enemy", idx, null); await wait(600); continue; }
      break;
    }
    if(c.fx === "mend"){
      if(E.life <= 13){ castSpell("enemy", idx, null); await wait(600); continue; }
      break;
    }
    if(c.fx === "bolt"){
      // kill the biggest threat it can, else go face when player is low
      let bestLane = -1, bestVal = -1;
      S.player.board.forEach((pc, l) => { if(pc && pc.curHp <= 3 && pc.atk > bestVal){ bestVal = pc.atk; bestLane = l; } });
      if(bestLane >= 0){ castSpell("enemy", idx, {side:"player", lane:bestLane}); await wait(600); continue; }
      if(S.player.life <= 6){ castSpell("enemy", idx, {hero:"player"}); await wait(600); continue; }
      break;
    }
    if(c.fx === "surge"){
      const lanes = E.board.map((cc,l)=>cc?l:-1).filter(l=>l>=0);
      if(lanes.length){ castSpell("enemy", idx, {side:"enemy", lane:lanes[0]}); await wait(600); continue; }
      break;
    }
    break;
  }
  // summon creatures: biggest first, into lanes facing threats or empty lanes
  guard = 0;
  while(guard++ < 8){
    const playable = E.hand.map((c,i)=>({c,i})).filter(x => x.c.kind === "creature" && x.c.cost <= E.aether)
      .sort((a,b) => (b.c.atk + b.c.hp) - (a.c.atk + a.c.hp));
    if(!playable.length) break;
    const emptyLanes = E.board.map((cc,l)=>cc?-1:l).filter(l=>l>=0);
    if(!emptyLanes.length) break;
    // prefer a lane where the player has a creature (to block), else first empty
    const lane = emptyLanes.find(l => S.player.board[l]) ?? emptyLanes[0];
    summon("enemy", playable[0].i, lane);
    render();
    await wait(600);
  }
  // attack with everything ready
  for(let l=0;l<3;l++){
    if(S.phase === "over") break;
    const c = E.board[l];
    if(c && !c.sick && !c.attacked){ attack("enemy", l); await wait(650); }
  }
  S.busy = false;
  if(S.phase !== "over") startPlayerTurn();
}

// ---------- turn flow ----------
function wake(side){
  S[side].board.forEach(c => { if(c){ c.sick = false; c.attacked = false; } });
}
function startPlayerTurn(){
  S.turn++;
  S.phase = "player";
  S.player.maxAether = Math.min(10, S.player.maxAether + 1);
  S.player.aether = S.player.maxAether;
  wake("player");
  draw("player");
  banner("YOUR TURN");
  sfx.turn();
  render();
  setTimeout(()=>banner(""), 1200);
}
function endTurn(){
  if(S.phase !== "player" || S.busy) return;
  S.selected = -1; S.spellTarget = null;
  S.phase = "enemy";
  S.enemy.maxAether = Math.min(10, S.enemy.maxAether + 1);
  S.enemy.aether = S.enemy.maxAether;
  wake("enemy");
  draw("enemy");
  banner("VOIDWARDEN'S TURN");
  render();
  setTimeout(()=>banner(""), 1200);
  aiTurn();
}
function checkEnd(){
  if(S.phase === "over") return;
  if(S.enemy.life <= 0) endGame(true);
  else if(S.player.life <= 0) endGame(false);
}
const CROWN_SVG = `<svg viewBox="0 0 120 92" width="112" height="86" role="img" aria-label="Golden crown">
  <defs>
    <linearGradient id="crownGold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#ffe98a"/>
      <stop offset=".55" stop-color="#ffd76a"/>
      <stop offset="1" stop-color="#e8a51c"/>
    </linearGradient>
  </defs>
  <path d="M12 74 L8 28 L36 50 L60 16 L84 50 L112 28 L108 74 Z" fill="url(#crownGold)" stroke="#b97e0e" stroke-width="2.5" stroke-linejoin="round"/>
  <circle cx="8" cy="23" r="6" fill="#ffd76a" stroke="#b97e0e" stroke-width="2"/>
  <circle cx="60" cy="11" r="7" fill="#ffd76a" stroke="#b97e0e" stroke-width="2"/>
  <circle cx="112" cy="23" r="6" fill="#ffd76a" stroke="#b97e0e" stroke-width="2"/>
  <rect x="12" y="74" width="96" height="12" rx="3" fill="#e8a51c" stroke="#b97e0e" stroke-width="2.5"/>
  <circle cx="60" cy="60" r="7" fill="#ff4d6d" stroke="#a1122e" stroke-width="1.5"/>
  <circle cx="33" cy="62" r="5" fill="#37c8e8" stroke="#0f6f8a" stroke-width="1.5"/>
  <circle cx="87" cy="62" r="5" fill="#37c8e8" stroke="#0f6f8a" stroke-width="1.5"/>
  <circle cx="36" cy="80" r="3" fill="#7ee0ff"/>
  <circle cx="60" cy="80" r="3" fill="#ff4d6d"/>
  <circle cx="84" cy="80" r="3" fill="#7ee0ff"/>
</svg>`;
function endGame(won){
  S.phase = "over";
  els["screen-end"].classList.toggle("lose", !won);
  if(won) els["end-sigil"].innerHTML = CROWN_SVG;
  else els["end-sigil"].textContent = "☠";
  els["end-title"].textContent = won ? "VICTORY" : "DEFEAT";
  els["end-text"].textContent = won
    ? "The Voidwarden falls. Dawn returns to the lanes."
    : "The dark takes the lanes… this time. Rise and duel again.";
  els["end-stats"].innerHTML =
    `<div class="stat"><b>${S.turn}</b><span>TURNS</span></div>
     <div class="stat"><b>${S.stats.dealt}</b><span>DAMAGE DEALT</span></div>
     <div class="stat"><b>${S.stats.kills}</b><span>CREATURES SLAIN</span></div>
     <div class="stat"><b>${S.stats.played}</b><span>CARDS PLAYED</span></div>`;
  if(won) sfx.win(); else sfx.lose();
  setTimeout(() => {
    els["screen-game"].classList.add("hidden");
    els["screen-end"].classList.remove("hidden");
  }, 900);
}

// ---------- setup / demo states ----------
function newGame(){
  rng = mulberry32(SEED);
  S.turn = 1; S.phase = "player"; S.selected = -1; S.spellTarget = null; S.busy = false;
  S.stats = {dealt:0, taken:0, played:0, kills:0};
  S.player = {life:20, aether:1, maxAether:1, deck:buildDeck(), hand:[], board:[null,null,null]};
  S.enemy  = {life:20, aether:1, maxAether:1, deck:buildDeck(), hand:[], board:[null,null,null]};
  for(let i=0;i<4;i++){ draw("player"); draw("enemy"); }
  els["log"].innerHTML = "";
  log("The duel begins. <b>Your move.</b>");
  render();
}
function showScreen(name){
  ["screen-title","screen-game","screen-end"].forEach(id => els[id].classList.add("hidden"));
  els[name].classList.remove("hidden");
}
function demoMid(){
  newGame();
  S.turn = 5;
  S.player.maxAether = 5; S.player.aether = 3;
  S.enemy.maxAether = 5;  S.enemy.aether = 2;
  S.player.life = 16; S.enemy.life = 13;
  S.player.board = [creature(byId.knight), creature(byId.hawk), null];
  S.player.board[0].sick = false; S.player.board[0].curHp = 4;
  S.player.board[1].sick = false;
  S.enemy.board = [creature(byId.serpent), null, creature(byId.stalker)];
  S.enemy.board[0].sick = false; S.enemy.board[0].curHp = 2;
  S.enemy.board[2].sick = false;
  S.player.hand = [{...byId.phoenix}, {...byId.bolt}, {...byId.dryad}, {...byId.surge}];
  S.enemy.hand = [{...byId.golem}, {...byId.meteor}, {...byId.sprite}];
  S.stats = {dealt:7, taken:4, played:5, kills:2};
  log("<b>Rune Knight</b> holds lane 1 against the <b>Tide Serpent</b>.");
  log("You drew <b>Solar Phoenix</b>.");
  showScreen("screen-game");
  render();
}
function demoEnd(won){
  demoMid();
  if(won){ S.enemy.life = 0; S.stats.dealt = 20; } else { S.player.life = 0; }
  S.turn = 9;
  endGame(won);
  els["screen-game"].classList.add("hidden");
  els["screen-end"].classList.remove("hidden");
}

// ---------- wiring ----------
$("btn-play").addEventListener("click", () => { newGame(); showScreen("screen-game"); sfx.turn(); });
$("btn-how").addEventListener("click", () => $("howto").classList.toggle("hidden"));
$("btn-how-close").addEventListener("click", () => $("howto").classList.add("hidden"));
$("btn-end").addEventListener("click", endTurn);
$("btn-restart").addEventListener("click", () => { newGame(); showScreen("screen-game"); });
$("btn-again").addEventListener("click", () => { newGame(); showScreen("screen-game"); });
$("btn-sound").addEventListener("click", (e) => { soundOn = !soundOn; e.target.textContent = soundOn ? "🔊" : "🔇"; });

const demo = params.get("demo");
if(demo === "mid") demoMid();
else if(demo === "win") demoEnd(true);
else if(demo === "lose") demoEnd(false);
else showScreen("screen-title");
