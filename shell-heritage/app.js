/* Shell Heritage · Tu recarga — prototipo de app (proyecto académico) */
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const view = $('#view');
const screenEl = $('#screen');
const RM = matchMedia('(prefers-reduced-motion: reduce)');
const START = 32;
const RATE = 1.6;               // % de batería por minuto (estimado mostrado)
const R = 98, C = 2 * Math.PI * R;

const LEVELS = {
  PB: { name: 'Planta baja', via: 'Acceso directo', total: 2, busy: 1 },
  '01': { name: 'Nivel 01', via: 'Por elevador', total: 4, busy: 2 },
  '02': { name: 'Nivel 02', via: 'Por elevador', total: 4, busy: 1 }
};
const ROOMS = [
  { n: '01', name: 'Dejá tu huella', d: 6, info: 'Tu movimiento se transforma en luz' },
  { n: '02', name: 'Reacción', d: 5, info: 'Detectá el objetivo y tocá a tiempo' },
  { n: '03', name: 'Potencia', d: 8, info: 'Pedaleá y generá energía' },
  { n: '04', name: 'Pilotá la luz', d: 7, info: 'Encendé sectores de la ciudad' }
];
const MENU = [
  { id: 'cafe', name: 'Café con leche', t: 3 },
  { id: 'medialunas', name: 'Medialunas x2', t: 2 },
  { id: 'agua', name: 'Agua mineral', t: 1 }
];
const STEPS = ['Ingreso', 'Acceso', 'Alinear', 'Carga', 'Salida'];
const STEP_OF = { home: 0, queue: 0, access: 1, elevator: 1, align: 2, charging: 3, exitQueue: 4, elevatorDown: 4, exit: 4, summary: 5 };
const ORDER = ['home', 'queue', 'access', 'elevator', 'align', 'charging', 'exitQueue', 'elevatorDown', 'exit', 'summary'];

const fresh = () => ({
  stage: 'home', level: '01', target: 80, battery: START,
  queue: 2, queueMax: 2, qTimer: 0, position: -8, aligned: false,
  paused: false, event: null, reconnecting: false, notified: false,
  exitQ: 1, exitReady: false, rooms: [], orders: [], openFloor: '03', startedAt: null
});
let state = fresh();
let tab = 'charge';
let prevKey = '';
let shownBattery = START;
let ringRaf = 0;

const pb = () => state.level === 'PB';
const spot = () => `${state.level}·02`;
const eta = (from = state.battery) => Math.max(0, Math.ceil((state.target - from) / RATE));
const vibrate = p => { try { navigator.vibrate && navigator.vibrate(p); } catch (e) {} };

/* ---------- Icons ---------- */
const ic = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>',
  bolt: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg>'
};
const car = (w = 56, h = 108) => `<svg viewBox="0 0 54 104" width="${w}" height="${h}" aria-hidden="true">
  <defs><linearGradient id="cb" x1="0" x2="1"><stop offset="0" stop-color="#d6d9d5"/><stop offset=".5" stop-color="#fbfaf3"/><stop offset="1" stop-color="#d6d9d5"/></linearGradient></defs>
  <rect x="3" y="2" width="48" height="100" rx="17" fill="url(#cb)"/>
  <path d="M10 30c4-5 30-5 34 0l-3 14H13z" fill="#26313a"/><path d="M13 72h28l3 12c-5 5-29 5-34 0z" fill="#26313a"/>
  <rect x="13" y="46" width="28" height="24" rx="5" fill="#eceee8"/>
  <rect x="8" y="5" width="10" height="4" rx="2" fill="#fff6c4"/><rect x="36" y="5" width="10" height="4" rx="2" fill="#fff6c4"/>
  <rect x="8" y="96" width="10" height="3" rx="1.5" fill="#dd1d21"/><rect x="36" y="96" width="10" height="3" rx="1.5" fill="#dd1d21"/>
</svg>`;

/* ---------- Pieces ---------- */
const btn = (label, action, kind = 'primary', arrow = false, extra = '') =>
  `<button type="button" class="btn btn-${kind}" data-action="${action}" ${extra}>${label}${arrow ? ' <span class="arrow" aria-hidden="true">→</span>' : ''}</button>`;
const head = (pill, title, lead, n) =>
  `<div><span class="pill ${n ? '' : 'plain'}">${n ? `<span class="n">${n}</span>` : ''}${pill}</span><h2>${title}</h2>${lead ? `<p class="lead">${lead}</p>` : ''}</div>`;
const note = (t, cls = '', mark = 'i') => `<div class="note ${cls}"><span class="ic">${mark}</span><span>${t}</span></div>`;
const stepper = () => {
  const cur = STEP_OF[state.stage];
  return `<ol class="stepper" aria-label="Progreso">${STEPS.map((l, i) =>
    `<li class="${i < cur ? 'done' : i === cur ? 'now' : ''}"${i === cur ? ' aria-current="step"' : ''}>${l}</li>`).join('')}</ol>`;
};
const pass = (cls = '') => `<div class="pass-wrap"><div class="pass ${cls}" data-tilt>
  <div class="p-top"><span class="p-brand"><span class="mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M13 2 4 14h7l-1 8 9-12h-7z"/></svg></span>PASE DE CARGA</span><span class="chip" aria-hidden="true"></span></div>
  <div class="p-code">${state.level}<span>·</span>02</div>
  <div class="p-foot"><span>${LEVELS[state.level].name.toUpperCase()}</span><span>OBJ ${state.target}%</span><span>HERITAGE</span></div>
</div></div>`;

/* ---------- Charge screens ---------- */
function sHome() {
  const fill = (state.target - 50) / 50 * 100;
  return `
  <div class="hero-card"><img src="assets/heritage.webp" alt="Fachada de Shell Heritage">
    <div class="hc"><div><b>Una pausa. <em>Más energía.</em></b><small>Av. Pueyrredón y Av. Santa Fe</small></div><span class="live"><i class="dot"></i>${Object.values(LEVELS).reduce((a, l) => a + l.total - l.busy, 0)} plazas libres</span></div>
  </div>
  ${head('Tu próxima recarga', 'Sin cables, <em>sin apuro.</em>', '')}
  <div class="card">
    <div class="row between" style="margin-bottom:10px"><span class="label" id="lvLabel">Dónde querés cargar</span><span class="sub">En vivo</span></div>
    <div class="levels" role="radiogroup" aria-labelledby="lvLabel">
      ${Object.entries(LEVELS).map(([code, l]) => `
      <div class="level"><input type="radio" name="level" id="lv-${code}" value="${code}" ${state.level === code ? 'checked' : ''}>
        <label for="lv-${code}"><span class="code">${code}</span><span class="via">${l.via}</span>
          <span class="spots" aria-hidden="true">${Array.from({ length: l.total }, (_, i) => `<i class="${i < l.busy ? 'busy' : ''}"></i>`).join('')}</span>
          <span class="free">${l.total - l.busy} libre${l.total - l.busy === 1 ? '' : 's'}</span></label></div>`).join('')}
    </div>
  </div>
  <div class="card">
    <label class="label" for="goal">Objetivo de batería</label>
    <div class="goal"><div class="goal-value"><span id="goalText">${state.target}</span><small>%</small></div>
      <div class="eta"><span class="sub">Tiempo estimado</span><b id="etaText">≈ ${eta(START)} min</b></div></div>
    <input class="range" id="goal" type="range" min="50" max="100" step="5" value="${state.target}" style="--fill:${fill}%">
    <div class="ticks"><span>50</span><span>75</span><span>100</span></div>
  </div>
  ${note('Para esta demo usamos un vehículo compatible con carga inductiva. Partís de 32 % de batería.')}
  ${btn('Solicitar ingreso', 'request', 'primary', true)}`;
}

function sQueue() {
  const ready = state.queue === 0;
  const p = (1 - state.queue / Math.max(1, state.queueMax)) * 100;
  return `${stepper()}
  ${head(ready ? 'Turno habilitado' : 'Espera de ingreso',
    ready ? (pb() ? 'Tu plaza <em>te espera.</em>' : 'Es tu <em>turno.</em>') : 'Esperá en la <em>calle.</em>',
    ready ? (pb() ? 'Avanzá a la plaza indicada en planta baja.' : 'El elevador está libre. Avanzá hacia el acceso.') : 'Detenete en la zona de espera de ingreso con balizas encendidas. Te avisamos cuando puedas entrar.', '01')}
  ${pass('flip-in')}
  <div class="card dark queue-viz">
    <div class="row between"><span class="label">${ready ? 'Acceso' : 'Tu lugar en la fila'}</span>${ready ? '' : '<span class="hazard" aria-label="Balizas encendidas"><i></i><i></i></span>'}</div>
    <div class="q-num">${ready ? 'Ya' : `${state.queue}<small>º</small>`}</div>
    <div class="sub">${ready ? 'Un movimiento autorizado a la vez' : `≈ ${state.queue * 40} s · un movimiento autorizado a la vez`}</div>
    <div class="q-lane" aria-hidden="true">${Array.from({ length: state.queueMax + 1 }, (_, i) => `<span class="q-car ${i === state.queueMax ? 'me' : ''}" style="opacity:${i < state.queueMax - state.queue ? 0 : 1};transform:translateX(${(state.queueMax - state.queue) * 48}px)"></span>`).join('')}<span class="q-door">${pb() ? 'PLAZA' : 'ELEVADOR'}</span></div>
    <div class="q-bar"><i style="--p:${p}%"></i></div>
  </div>
  ${state.event === 'busy' ? note('Recorrido ocupado: otro vehículo está maniobrando. Esperá la autorización.', 'warn', '!') : ''}
  ${ready ? btn(pb() ? 'Ya estoy en mi plaza' : 'Avanzar al acceso', pb() ? 'toAlign' : 'toAccess', 'primary', true) : btn('Adelantar turno', 'skipQueue', 'soft')}`;
}

function sAccess() {
  return `${stepper()}
  ${head('Acceso por turnos', 'Girá 90° a la <em>derecha.</em>', 'Con el turno habilitado, girá y entrá al elevador vehicular. Detené el auto dentro de la cabina.', '02')}
  <div class="turn" aria-hidden="true">
    <svg class="map" viewBox="0 0 340 230" preserveAspectRatio="xMidYMid slice">
      <rect width="340" height="230" fill="#2a251d"/>
      <rect x="40" y="0" width="60" height="230" fill="#38322a"/><rect x="40" y="56" width="300" height="56" fill="#38322a"/>
      <path d="M70 230 L70 120 Q70 84 106 84 L300 84" stroke="#fbce07" stroke-width="3" stroke-dasharray="8 8" fill="none"/>
      <rect x="262" y="58" width="62" height="52" rx="8" fill="none" stroke="#34d6c6" stroke-width="2.5"/>
      <text x="293" y="126" fill="#7ff5e6" font-family="IBM Plex Mono" font-size="9" text-anchor="middle">ELEVADOR</text>
      <text x="70" y="222" fill="rgba(255,248,234,.5)" font-family="IBM Plex Mono" font-size="9" text-anchor="middle">INGRESO</text>
    </svg>
    <span class="tcar">${car(22, 38)}</span>
    <span class="tlabel pill ghost">Ingreso → elevador</span>
    <span class="tdeg">90°</span>
  </div>
  ${note('El elevador funciona por turnos: un solo movimiento autorizado a la vez.', 'yel')}
  ${btn('Ya estoy en el elevador', 'toElevator', 'primary', true)}`;
}

function sElevator(down) {
  const from = down ? state.level : 'PB';
  return `${stepper()}
  ${head(down ? 'Salida por elevador' : 'Elevador vehicular', down ? 'Bajando a <em>planta baja.</em>' : `Subiendo al <em>${LEVELS[state.level].name.toLowerCase()}.</em>`, 'Permanecé dentro del vehículo hasta que se abran las puertas.', down ? '05' : '02')}
  <div class="elev ${down ? 'down' : ''} closing" id="elev" aria-live="polite">
    <span class="shaft"></span><span class="rings"></span>
    <div class="floor"><div class="arr">▲</div><div class="fl" id="floorNum">${from}</div><div class="label" style="color:rgba(255,248,234,.6)">${down ? 'Destino PB' : `Destino ${state.level}`}</div></div>
    <div class="doors"><i></i><i></i></div>
  </div>
  <p class="hint" id="elevHint">Puertas cerradas · en movimiento</p>`;
}

function sAlign() {
  const ev = state.event === 'misalign';
  return `${stepper()}
  ${ev ? `<div class="event"><div class="e-ic">⌖</div><h3>Tu vehículo se movió</h3><p>El sensor perdió la posición. Reubicá el auto sobre la placa para continuar la carga.</p></div>` :
    head('Preparar la carga', 'Alineá tu <em>vehículo.</em>', 'Seguí la guía luminosa hasta ubicar el receptor sobre la placa.', '03')}
  <div class="bay-card" id="bayCard">
    <div class="row between"><span class="label">Vista superior</span><span class="label">Plaza ${spot()}</span></div>
    <div class="bay" id="bay"><span class="ring-top"></span><div class="pad"></div><div class="vehicle" id="vehicle" role="presentation">${car()}</div><span class="chev">︿︿</span></div>
    <label class="label" for="position" style="display:block;margin-bottom:4px">Arrastrá el auto o usá el control</label>
    <input class="range" type="range" id="position" min="-10" max="10" step="1" value="${state.position}">
    <output id="sensor" for="position"></output>
  </div>
  <button type="button" class="btn btn-primary" data-action="start" disabled>${state.startedAt ? 'Reanudar carga' : 'Iniciar carga'} <span class="arrow" aria-hidden="true">→</span></button>
  <p class="hint">Confirmá con el vehículo detenido y el freno de mano puesto.</p>`;
}

function sCharging() {
  const s = state, done = s.battery >= s.target;
  const left = eta();
  const status = s.reconnecting ? 'Reconectando…' : s.paused ? 'Interrumpida' : done ? 'Objetivo alcanzado' : 'Cargando';
  const evCard = s.event === 'interrupt' && !s.reconnecting
    ? `<div class="event"><div class="e-ic">ϟ</div><h3>Carga interrumpida</h3><p>Detectamos un corte en la transferencia. Tu plaza sigue asignada: podés reintentar ahora.</p>${btn('Reintentar carga', 'retry', 'red')}</div>` : '';
  return `${stepper()}
  ${head('Mi recarga', s.paused ? 'Carga en <em>pausa.</em>' : done ? 'Listo para <em>seguir.</em>' : 'Tu auto está <em>cargando.</em>',
    done ? 'Alcanzaste tu objetivo. Pedí tu turno de salida cuando quieras.' : 'Podés alejarte del auto: te avisamos cuando esté listo.', '04')}
  ${evCard}
  <div class="charge">
    <canvas class="energy" id="energy" aria-hidden="true"></canvas>
    <div class="ring">
      <svg viewBox="0 0 228 228" aria-hidden="true">
        <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbce07"/><stop offset=".55" stop-color="#34d6c6"/><stop offset="1" stop-color="#7ff5e6"/></linearGradient></defs>
        <circle class="tk" cx="114" cy="114" r="${R + 14}" fill="none" stroke-width="1.5" stroke-dasharray="1.5 8.2"/>
        <circle class="track" cx="114" cy="114" r="${R}" fill="none" stroke-width="13"/>
        <circle class="bar" id="bar" cx="114" cy="114" r="${R}" fill="none" stroke-width="13" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
      </svg>
      <div class="ring-inner"><span class="label">Batería</span><strong><b id="pct">${Math.round(shownBattery)}</b><span>%</span></strong><span class="target">Objetivo ${s.target} %</span></div>
    </div>
    <span class="cstate ${s.paused ? 'paused' : done ? 'done' : ''}"><i class="dot"></i>${status}</span>
  </div>
  <div class="stats">
    <div class="stat"><span>Plaza</span><strong>${spot()}</strong></div>
    <div class="stat"><span>Restante</span><strong>${done ? '—' : `${left} min`}</strong></div>
    <div class="stat"><span>Cargado</span><strong>+${s.battery - START}%</strong></div>
  </div>
  ${done ? '' : whileYouWait(left)}
  ${done ? '' : `<div class="btn-row">${btn(s.paused ? 'Reanudar' : 'Adelantar +12 %', s.paused ? 'resume' : 'advance', 'soft')}${btn('Ver el edificio', 'toBuilding', 'soft')}</div>`}
  ${btn(done ? 'Pedir turno de salida' : 'Finalizar y pedir salida', 'finish', done ? 'primary' : 'dark', true)}`;
}

function whileYouWait(left) {
  const acts = [
    { ic: '☕', b: 'Un café', s: 'Shell Select · PB', d: 5, go: 'PB' },
    ...ROOMS.slice(0, 2).map(r => ({ ic: '◐', b: r.name, s: `Museo · ${r.d} min`, d: r.d, go: '03', room: r.n })),
    { ic: 'ϟ', b: 'Energy Lab', s: 'Potencia · Pilotá la luz', d: 15, go: '03' }
  ];
  return `<section class="while"><div class="while-head"><h3>Mientras esperás</h3><span class="sub">Te quedan ≈ ${left} min</span></div>
    <div class="hscroll">${acts.map(a => `<button type="button" class="act ${a.room && state.rooms.includes(a.room) ? 'done-act' : ''}" data-action="goFloor" data-floor="${a.go}">
      <span class="a-ic" aria-hidden="true">${a.ic}</span><b>${a.b}</b><small>${a.s}</small>
      <span class="fits ${a.d > left ? 'no' : ''}">${a.d > left ? 'NO LLEGÁS' : 'TE ALCANZA'}</span></button>`).join('')}</div></section>`;
}

function sExitQueue() {
  const ready = state.exitReady;
  return `${stepper()}
  ${head('Turno de salida', ready ? 'Salida <em>habilitada.</em>' : pb() ? 'Verificando el <em>recorrido.</em>' : 'Esperá en tu <em>plaza.</em>',
    ready ? (pb() ? 'El recorrido está libre. Podés salir directamente desde tu plaza.' : 'El elevador te espera. Avanzá con cuidado.') :
      pb() ? 'No avances hasta que se habilite la salida.' : 'Permanecé en tu plaza para mantener libre el pasillo de maniobra.', '05')}
  <div class="card status-card"><div class="status-icon ${ready ? 'go' : 'spin'}">${ready ? ic.go : ic.clock}</div>
    <h3>${ready ? (pb() ? 'Salida directa' : 'Dirigite al elevador') : pb() ? 'Verificando' : `Sos el ${state.exitQ}º para bajar`}</h3><p>Plaza ${spot()} · batería ${state.battery} %</p></div>
  ${state.event === 'busy' && !ready ? note('Recorrido ocupado: hay un vehículo en el pasillo. Esperá la autorización.', 'warn', '!') : ''}
  ${ready ? btn(pb() ? 'Salir' : 'Entrar al elevador', pb() ? 'toExit' : 'toElevatorDown', 'primary', true) : btn('Adelantar autorización', 'authorize', 'soft')}`;
}

function sExit() {
  return `${stepper()}
  ${head('Continuar', 'Buen <em>viaje.</em>', 'Recorré el pasillo hacia la calle. Tu plaza queda liberada al retirarte.', '05')}
  <div class="corridor" aria-hidden="true"><span class="ccar"></span><span class="exitlight"></span></div>
  ${note('Respetá la velocidad del pasillo y cedé el paso a peatones en la vereda.', 'yel')}
  ${btn('Ya salí · terminar visita', 'complete', 'dark', true)}`;
}

function sSummary() {
  const mins = Math.round((state.battery - START) / RATE) + 4;
  const did = [...state.orders.map(o => MENU.find(m => m.id === o).name), ...state.rooms.map(n => ROOMS.find(r => r.n === n).name)];
  return `
  ${head('Visita finalizada', 'Nos vemos en tu <em>próxima pausa.</em>', '')}
  <div class="summary-hero"><div class="confetti" id="confetti"></div><span class="label">Energía cargada</span><div class="big">+${state.battery - START}<small>%</small></div><div class="sub">${START} % → ${state.battery} % · ≈ ${mins} min de visita</div></div>
  <ul class="card list">
    <li><span>Plaza</span><strong>${spot()}</strong></li>
    <li><span>Mientras cargaba</span><strong>${did.length ? did.join(', ') : 'Una pausa'}</strong></li>
    <li><span>Ubicación</span><strong>Shell Heritage</strong></li>
  </ul>
  ${note('<b>Una razón para volver:</b> este mes, nuevo desafío en <b>Reacción</b>. Superá tu tiempo en la próxima visita.', 'yel', '★')}
  ${btn('Comenzar otra visita', 'reset', 'primary', true)}`;
}

/* ---------- Building tab ---------- */
function sBuilding() {
  const atCar = state.stage !== 'home' && state.stage !== 'queue' && state.stage !== 'summary';
  const floors = [
    { id: '03', cls: 'f3', b: 'Museo + Energy Lab', s: 'Historia y desafíos interactivos', tags: [`<span class="tag glow">4 SALAS</span>`] },
    { id: '02', b: 'Carga · 4 plazas', s: 'Por elevador vehicular', tags: [`<span class="tag">${LEVELS['02'].total - LEVELS['02'].busy} LIBRES</span>`] },
    { id: '01', b: 'Carga · 4 plazas', s: 'Por elevador vehicular', tags: [`<span class="tag">${LEVELS['01'].total - LEVELS['01'].busy} LIBRES</span>`] },
    { id: 'PB', cls: 'fpb', b: 'Shell Select + 2 plazas', s: 'Café, encuentro y espera', tags: [`<span class="tag">CAFÉ</span>`] }
  ];
  return `
  ${head('El edificio', 'Mientras tu auto <em>carga.</em>', 'Cuatro niveles conectados por escalera y ascensor. Elegí qué hacer: descubrir, participar o descansar.')}
  ${state.stage === 'charging' && state.battery < state.target ? note(`Tu auto sigue cargando · te quedan ≈ ${eta()} min. Te avisamos cuando esté listo.`, 'yel', 'ϟ') : ''}
  <ul class="stack">${floors.map(f => {
    const tags = [...f.tags];
    if (atCar && f.id === state.level) tags.unshift('<span class="tag car">TU AUTO</span>');
    const open = state.openFloor === f.id;
    let detail = '';
    if (f.id === '03') detail = `<div class="rooms">${ROOMS.map(r => `<button type="button" class="room ${state.rooms.includes(r.n) ? 'visited' : ''}" data-action="visit" data-room="${r.n}"><span class="r-n">SALA ${r.n}</span><b>${r.name}</b><small>${r.info} · ${r.d} min</small></button>`).join('')}</div>`;
    if (f.id === 'PB') detail = `<div class="menu">${MENU.map(m => `<div class="menu-item"><div><b>${m.name}</b><small>Retirás en el mostrador · ${m.t} min</small></div><button type="button" class="mini" data-action="order" data-item="${m.id}" ${state.orders.includes(m.id) ? 'disabled' : ''}>${state.orders.includes(m.id) ? 'Pedido' : 'Pedir'}</button></div>`).join('')}</div>`;
    if (f.id === '01' || f.id === '02') detail = `<div class="menu"><div class="menu-item"><div><b>Plazas ${f.id}·01 a ${f.id}·04</b><small>Carga inductiva · anillo de luz sobre cada plaza</small></div></div></div>`;
    return `<li><button type="button" class="floor ${f.cls || ''} ${open ? 'open' : ''}" data-action="toggleFloor" data-floor="${f.id}" aria-expanded="${open}"><span class="lvl">${f.id}</span><span><b>${f.b}</b><small>${f.s}</small></span><span class="tags">${tags.join('')}</span></button>
      <div class="floor-detail ${open ? 'open' : ''}"><div>${detail}</div></div></li>`;
  }).join('')}</ul>
  ${note('Acceso peatonal independiente desde la vereda. Hall con escalera y ascensor en todos los niveles.')}
  ${state.stage === 'home' ? '' : btn('Volver a mi recarga', 'toCharge', 'dark', true)}`;
}

/* ---------- Help tab ---------- */
function sHelp() {
  const faq = [
    ['¿Mi vehículo es compatible?', 'La carga inductiva requiere un receptor compatible instalado en el vehículo. Esta demo representa una propuesta académica, no un servicio operativo.'],
    ['¿Cómo funciona el ingreso?', 'Esperás en la calle con balizas en la zona de espera y pedís ingreso desde la app. Con el turno habilitado, girás 90° y entrás al elevador. Un movimiento autorizado a la vez.'],
    ['¿Qué muestra el anillo?', 'Avanza desde el nivel inicial hasta el objetivo que elegiste. Completo significa que alcanzaste tu objetivo, no necesariamente el 100 %.'],
    ['¿Cómo es la salida?', 'En los niveles superiores pedís turno y esperás en tu plaza hasta que se habilite el elevador. En planta baja salís directamente desde la plaza.']
  ];
  return `
  ${head('Ayuda', 'Todo bajo <em>control.</em>', 'Cómo funciona Shell Heritage y qué pasa si algo cambia.')}
  ${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}
  <h3 class="section-t">Si algo cambia · simulá un imprevisto</h3>
  <div class="sim">
    <button type="button" data-event="misalign"><i>⌖</i>Desalineación</button>
    <button type="button" data-event="interrupt"><i>ϟ</i>Interrupción</button>
    <button type="button" data-event="busy"><i>◷</i>Recorrido ocupado</button>
  </div>
  ${note('No hay pagos, reservas reales ni conexión con equipos. Los estados se simulan para mostrar la experiencia.')}
  ${btn('Reiniciar demo', 'reset', 'soft')}`;
}

/* ---------- Render ---------- */
function screenHTML() {
  if (tab === 'building') return sBuilding();
  if (tab === 'help') return sHelp();
  switch (state.stage) {
    case 'home': return sHome();
    case 'queue': return sQueue();
    case 'access': return sAccess();
    case 'elevator': return sElevator(false);
    case 'elevatorDown': return sElevator(true);
    case 'align': return sAlign();
    case 'charging': return sCharging();
    case 'exitQueue': return sExitQueue();
    case 'exit': return sExit();
    case 'summary': return sSummary();
  }
}

function render() {
  cancelAnimationFrame(ringRaf);
  const key = tab === 'charge' ? 'c:' + state.stage : 't:' + tab;
  const changed = key !== prevKey;
  const focusAct = document.activeElement?.dataset?.action;
  const scroll = screenEl.scrollTop;

  view.innerHTML = screenHTML();
  view.classList.toggle('stg', changed);

  if (changed) {
    screenEl.scrollTop = 0;
    if (!RM.matches && prevKey) {
      const a = ORDER.indexOf(prevKey.slice(2)), b = ORDER.indexOf(state.stage);
      const dir = tab === 'charge' && prevKey.startsWith('c:') && a > -1 && b > -1 ? (b >= a ? 1 : -1) : 0;
      view.animate([{ opacity: 0, transform: `translateX(${dir * 28}px) scale(${dir ? 1 : .985})` }, { opacity: 1, transform: 'none' }], { duration: 460, easing: 'cubic-bezier(.22,1,.36,1)' });
    }
  } else {
    screenEl.scrollTop = scroll;
    if (focusAct) view.querySelector(`[data-action="${focusAct}"]`)?.focus({ preventScroll: true });
  }
  prevKey = key;

  $$('.tabbar [data-tab]').forEach((b, i) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('on', on); b.setAttribute('aria-current', on ? 'page' : 'false');
    if (on) $('.tabbar').style.setProperty('--i', i);
  });

  if (tab === 'charge') {
    if (state.stage === 'align') initAlign();
    if (state.stage === 'charging') { animateRing(); startEnergy(); } else stopEnergy();
    if ((state.stage === 'elevator' || state.stage === 'elevatorDown') && changed) runElevator(state.stage === 'elevatorDown');
    if (state.stage === 'summary' && changed) confetti();
  } else stopEnergy();
  initTilt();
}

/* ---------- Dynamic island notifications ---------- */
let islandTimer;
function notify(title, text, kind = '', icon = 'ϟ') {
  const isl = $('#island');
  $('#islandContent').innerHTML = `<span class="isl-ic ${kind}">${icon}</span><span class="isl-t"><b>${title}</b><span>${text}</span></span><span class="isl-time">ahora</span>`;
  isl.classList.add('open');
  vibrate(kind === 'warn' ? [60, 40, 60] : 30);
  clearTimeout(islandTimer);
  islandTimer = setTimeout(() => isl.classList.remove('open'), 3600);
}
$('#island').addEventListener('click', () => $('#island').classList.remove('open'));

/* ---------- Align (drag + slider) ---------- */
function initAlign() {
  const range = $('#position'), veh = $('#vehicle'), bay = $('#bay');
  const update = () => {
    const was = state.aligned;
    state.aligned = Math.abs(state.position) <= 1;
    bay.style.setProperty('--offset', state.position * 6 + 'px');
    range.value = state.position;
    $('#bayCard').classList.toggle('locked', state.aligned);
    const sensor = $('#sensor');
    sensor.classList.toggle('ok', state.aligned);
    sensor.innerHTML = state.aligned ? `<span style="width:16px;height:16px;display:inline-flex">${ic.check}</span>Posición correcta · listo para cargar`
      : state.position < 0 ? 'Desplazá el auto hacia la derecha →' : '← Desplazá el auto hacia la izquierda';
    $('[data-action="start"]').disabled = !state.aligned;
    if (state.aligned && !was) { vibrate([20, 30, 20]); }
  };
  range.addEventListener('input', () => { state.position = +range.value; update(); });
  let dragX = null, startPos = 0;
  veh.addEventListener('pointerdown', e => { dragX = e.clientX; startPos = state.position; veh.classList.add('dragging'); veh.setPointerCapture(e.pointerId); });
  veh.addEventListener('pointermove', e => {
    if (dragX === null) return;
    state.position = Math.max(-10, Math.min(10, Math.round(startPos + (e.clientX - dragX) / 6)));
    update();
  });
  const end = () => { dragX = null; veh.classList.remove('dragging'); };
  veh.addEventListener('pointerup', end); veh.addEventListener('pointercancel', end);
  update();
}

/* ---------- Ring + energy canvas ---------- */
function setRing(v) {
  const bar = $('#bar'); if (!bar) return;
  const f = Math.max(0, Math.min(1, (v - START) / (state.target - START)));
  bar.style.strokeDashoffset = C * (1 - f);
  $('#pct').textContent = Math.round(v);
}
function animateRing() {
  const from = shownBattery, to = state.battery, t0 = performance.now();
  const step = now => {
    const t = RM.matches ? 1 : Math.min(1, (now - t0) / 700);
    shownBattery = from + (to - from) * (1 - (1 - t) ** 3);
    setRing(shownBattery);
    if (t < 1) ringRaf = requestAnimationFrame(step);
  };
  step(t0);
}

let energyRaf = 0;
function startEnergy() {
  const cv = $('#energy'); if (!cv) return;
  cancelAnimationFrame(energyRaf);
  const ctx = cv.getContext('2d');
  const dpr = Math.min(2, devicePixelRatio || 1);
  const w = cv.clientWidth, h = cv.clientHeight;
  cv.width = w * dpr; cv.height = h * dpr; ctx.scale(dpr, dpr);
  const cell = 7, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
  const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  const draw = now => {
    ctx.clearRect(0, 0, w, h);
    const active = !state.paused && state.battery < state.target;
    const t = now / 1000;
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      const cx = x * cell - w / 2, cy = y * cell - h * .48;
      const d = Math.hypot(cx, cy);
      let v = Math.sin(d / 18 - t * (active ? 2.4 : .6)) * .5 + .5;
      v *= Math.max(0, 1 - d / (w * .62));
      const th = (bayer[(y % 4) * 4 + (x % 4)] + .5) / 16;
      if (v > th) {
        ctx.fillStyle = state.paused ? 'rgba(221,29,33,.55)' : v > .72 ? 'rgba(251,206,7,.8)' : 'rgba(52,214,198,.55)';
        ctx.fillRect(x * cell + 1.5, y * cell + 1.5, cell - 3.5, cell - 3.5);
      }
    }
    if (!RM.matches) energyRaf = requestAnimationFrame(draw);
  };
  energyRaf = requestAnimationFrame(draw);
}
function stopEnergy() { cancelAnimationFrame(energyRaf); }

/* ---------- Elevator ---------- */
let elevTimers = [];
function runElevator(down) {
  elevTimers.forEach(clearTimeout); elevTimers = [];
  const seq = down ? (state.level === '02' ? ['02', '01', 'PB'] : ['01', 'PB']) : (state.level === '02' ? ['PB', '01', '02'] : ['PB', '01']);
  const fast = RM.matches ? 300 : 1100;
  seq.forEach((f, i) => elevTimers.push(setTimeout(() => {
    const el = $('#floorNum'); if (!el) return;
    el.textContent = f;
    el.animate?.([{ transform: `translateY(${down ? -24 : 24}px)`, opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: 360, easing: 'cubic-bezier(.34,1.56,.64,1)' });
  }, 500 + i * fast)));
  elevTimers.push(setTimeout(() => {
    const e = $('#elev'); if (!e) return;
    e.classList.remove('closing'); e.classList.add('stop');
    $('#elevHint').textContent = 'Puertas abiertas';
    vibrate(40);
    notify(down ? 'Llegaste a planta baja' : `Llegaste al ${LEVELS[state.level].name.toLowerCase()}`, down ? 'Seguí por el pasillo hacia la calle' : `Seguí la guía hasta tu plaza ${spot()}`, 'glow', down ? '↓' : '↑');
  }, 500 + seq.length * fast));
  elevTimers.push(setTimeout(() => { if (state.stage === (down ? 'elevatorDown' : 'elevator')) go(down ? 'exit' : 'align'); }, 1500 + seq.length * fast));
}

/* ---------- Tilt (chrome pass) ---------- */
function initTilt() {
  $$('[data-tilt]').forEach(el => {
    if (el._tilt) return; el._tilt = true;
    el.addEventListener('pointermove', e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width, py = (e.clientY - r.top) / r.height;
      el.classList.add('live-tilt');
      el.style.setProperty('--ry', (px - .5) * 18 + 'deg');
      el.style.setProperty('--rx', (.5 - py) * 14 + 'deg');
      el.style.setProperty('--mx', px * 100 + '%'); el.style.setProperty('--my', py * 100 + '%');
    });
    el.addEventListener('pointerleave', () => { el.classList.remove('live-tilt'); el.style.setProperty('--rx', '0deg'); el.style.setProperty('--ry', '0deg'); });
  });
}

/* ---------- Confetti ---------- */
function confetti() {
  const box = $('#confetti'); if (!box || RM.matches) return;
  const colors = ['#fbce07', '#dd1d21', '#34d6c6', '#fff8ea'];
  box.innerHTML = Array.from({ length: 36 }, (_, i) => `<i style="left:${Math.random() * 100}%;background:${colors[i % 4]};animation-delay:${Math.random() * .5}s;animation-duration:${2 + Math.random() * 1.4}s"></i>`).join('');
}

/* ---------- Actions ---------- */
function go(stage) { state.stage = stage; tab = 'charge'; render(); }

function action(a, el) {
  const s = state;
  switch (a) {
    case 'request':
      s.queue = s.queueMax = pb() ? 1 : 2; s.event = null; go('queue');
      notify('Solicitud enviada', `Sos el ${s.queue}º en la fila de ingreso`, '', '⏵'); break;
    case 'skipQueue': s.queue = 0; s.event = null; render(); notify('Turno habilitado', pb() ? 'Avanzá a tu plaza' : 'Avanzá hacia el elevador', '', '✓'); break;
    case 'toAccess': go('access'); break;
    case 'toElevator': go('elevator'); break;
    case 'toAlign': go('align'); break;
    case 'start':
      if (!s.aligned) return;
      if (s.event === 'misalign') { s.event = null; s.paused = false; notify('Carga reanudada', 'El receptor volvió a estar alineado', 'glow', '✓'); }
      else { s.startedAt = Date.now(); notify('Carga iniciada', `Te avisamos cuando llegues a ${s.target} %`, 'glow', 'ϟ'); }
      go('charging'); break;
    case 'advance': if (!s.paused) { s.battery = Math.min(s.target, s.battery + 12); checkDone(); render(); } break;
    case 'resume': s.paused = false; s.event = null; render(); break;
    case 'retry':
      s.reconnecting = true; render();
      setTimeout(() => { s.reconnecting = false; s.paused = false; s.event = null; if (s.stage === 'charging') render(); notify('Carga reanudada', 'La transferencia volvió a la normalidad', 'glow', '✓'); }, 1600); break;
    case 'finish':
      s.paused = false; s.event = null; s.exitReady = false; s.exitQ = pb() ? 0 : 1; go('exitQueue');
      notify('Turno de salida solicitado', pb() ? 'Verificando el recorrido' : `Sos el ${s.exitQ}º para bajar`, '', '◷');
      scheduleExit(); break;
    case 'authorize': s.event = null; s.exitReady = true; render(); notify('Salida habilitada', pb() ? 'Podés salir desde tu plaza' : 'Avanzá hacia el elevador', '', '✓'); break;
    case 'toElevatorDown': go('elevatorDown'); break;
    case 'toExit': go('exit'); break;
    case 'complete': go('summary'); break;
    case 'reset': elevTimers.forEach(clearTimeout); state = fresh(); shownBattery = START; tab = 'charge'; render(); break;
    case 'toBuilding': tab = 'building'; render(); break;
    case 'toCharge': tab = 'charge'; render(); break;
    case 'goFloor': state.openFloor = el.dataset.floor; tab = 'building'; render(); break;
    case 'toggleFloor': state.openFloor = state.openFloor === el.dataset.floor ? null : el.dataset.floor; render(); break;
    case 'visit': {
      const n = el.dataset.room;
      if (!s.rooms.includes(n)) { s.rooms.push(n); const r = ROOMS.find(x => x.n === n); notify(`Sala ${n} · ${r.name}`, `${r.d} min · te avisamos si tu auto termina antes`, 'glow', '◐'); }
      render(); break;
    }
    case 'order': {
      const m = MENU.find(x => x.id === el.dataset.item);
      if (!s.orders.includes(m.id)) {
        s.orders.push(m.id); render();
        notify('Pedido confirmado', `${m.name} · listo en ${m.t} min en el mostrador`, '', '☕');
        setTimeout(() => notify('Tu pedido está listo', `Retirá ${m.name.toLowerCase()} en Shell Select`, '', '☕'), 6000);
      }
      break;
    }
  }
}

function checkDone() {
  if (state.battery >= state.target && !state.notified) {
    state.notified = true;
    notify('Objetivo alcanzado', `Tu auto llegó a ${state.target} % · pedí tu salida`, '', '✓');
    vibrate([40, 60, 40]);
  }
}

let exitTimer;
function scheduleExit() {
  clearTimeout(exitTimer);
  exitTimer = setTimeout(() => {
    if (state.stage !== 'exitQueue' || state.exitReady) return;
    if (state.event === 'busy') { state.event = null; scheduleExit(); render(); return; }
    state.exitReady = true; render();
    notify('Salida habilitada', pb() ? 'Podés salir desde tu plaza' : 'Avanzá hacia el elevador', '', '✓');
  }, 5200);
}

/* ---------- "Si algo cambia" ---------- */
function simulate(ev) {
  const s = state;
  if (ev === 'misalign') {
    if (s.stage !== 'charging' && s.stage !== 'align') { s.startedAt = s.startedAt || Date.now(); s.battery = Math.max(s.battery, 46); }
    s.event = 'misalign'; s.paused = true; s.position = 6; s.aligned = false; go('align');
    notify('Desalineación detectada', 'Reubicá el vehículo sobre la placa', 'warn', '⌖');
  } else if (ev === 'interrupt') {
    if (s.stage !== 'charging') { s.startedAt = s.startedAt || Date.now(); s.battery = Math.max(s.battery, 46); s.position = 0; s.aligned = true; }
    s.event = 'interrupt'; s.paused = true; go('charging');
    notify('Carga interrumpida', 'Tu plaza sigue asignada · reintentá desde la app', 'warn', 'ϟ');
  } else if (ev === 'busy') {
    if (s.stage === 'queue') { s.queue = Math.max(s.queue, 1) + 1; s.queueMax = Math.max(s.queueMax, s.queue); }
    else { s.exitReady = false; s.exitQ = Math.max(1, s.exitQ); if (s.stage !== 'exitQueue') { s.battery = Math.max(s.battery, s.target); } go('exitQueue'); scheduleExit(); }
    s.event = 'busy'; tab = 'charge'; render();
    notify('Recorrido ocupado', 'Esperá la autorización para avanzar', 'warn', '◷');
  }
}

function jump(st) {
  const s = state;
  if (st === 'home') { action('reset'); return; }
  s.event = null; s.paused = false;
  if (st === 'align') { s.position = -8; s.aligned = false; }
  if (st === 'charging') { s.position = 0; s.aligned = true; s.startedAt = s.startedAt || Date.now(); }
  if (st === 'exitQueue') { s.battery = Math.max(s.battery, s.target); s.exitReady = false; s.exitQ = pb() ? 0 : 1; scheduleExit(); }
  go(st);
}

/* ---------- Events ---------- */
document.addEventListener('click', e => {
  const b = e.target.closest('button');
  if (b && b.classList.contains('btn') && !b.disabled && !RM.matches) {
    const r = b.getBoundingClientRect(), d = Math.max(r.width, r.height);
    const sp = document.createElement('span'); sp.className = 'ripple';
    sp.style.cssText = `width:${d}px;height:${d}px;left:${e.clientX - r.left - d / 2}px;top:${e.clientY - r.top - d / 2}px`;
    b.appendChild(sp); setTimeout(() => sp.remove(), 650);
  }
  const t = e.target.closest('[data-action],[data-event],[data-jump],[data-tab]');
  if (!t || t.disabled) return;
  if (t.dataset.tab) { tab = t.dataset.tab; render(); return; }
  if (t.dataset.event) { simulate(t.dataset.event); return; }
  if (t.dataset.jump) { jump(t.dataset.jump); return; }
  const a = t.dataset.action;
  if (b && b.classList.contains('btn')) setTimeout(() => action(a, t), RM.matches ? 0 : 120); else action(a, t);
});

view.addEventListener('input', e => {
  if (e.target.id === 'goal') {
    state.target = +e.target.value;
    $('#goalText').textContent = state.target;
    $('#etaText').textContent = `≈ ${eta(START)} min`;
    e.target.style.setProperty('--fill', (state.target - 50) / 50 * 100 + '%');
  }
});
view.addEventListener('change', e => { if (e.target.name === 'level') { state.level = e.target.value; vibrate(10); } });

// Ingreso: la fila avanza sola.
setInterval(() => {
  if (state.stage !== 'queue' || state.queue === 0 || state.event === 'busy' || document.hidden) {
    if (state.event === 'busy' && state.stage === 'queue') { state.qTimer++; if (state.qTimer > 2) { state.event = null; state.qTimer = 0; if (tab === 'charge') render(); } }
    return;
  }
  state.queue--; if (tab === 'charge') render();
  if (state.queue === 0) notify('Turno habilitado', pb() ? 'Avanzá a tu plaza' : 'Avanzá hacia el elevador', '', '✓');
}, 2600);

// Carga acelerada mientras recorrés el edificio.
setInterval(() => {
  if (state.stage !== 'charging' || state.paused || state.battery >= state.target || document.hidden) return;
  state.battery = Math.min(state.target, state.battery + 1);
  checkDone();
  if (tab === 'charge') { const bar = $('#bar'); if (bar && !view.querySelector('.event')) { animateRing(); const st = $$('.stat strong'); if (st[1]) { st[1].textContent = state.battery >= state.target ? '—' : `${eta()} min`; st[2].textContent = `+${state.battery - START}%`; } if (state.battery >= state.target) render(); } }
}, 1200);

// Reloj del status bar.
const clock = () => { const d = new Date(); $('#clock').textContent = `${d.getHours()}:${String(d.getMinutes()).padStart(2, '0')}`; };
clock(); setInterval(clock, 20000);

/* ---------- Dithered photo background (desktop) ---------- */
(function dither() {
  const cv = $('#dither');
  if (!cv || matchMedia('(max-width: 860px)').matches) return;
  const ctx = cv.getContext('2d');
  const img = new Image(); img.src = 'assets/heritage.webp';
  const bayer = [0, 32, 8, 40, 2, 34, 10, 42, 48, 16, 56, 24, 50, 18, 58, 26, 12, 44, 4, 36, 14, 46, 6, 38, 60, 28, 52, 20, 62, 30, 54, 22, 3, 35, 11, 43, 1, 33, 9, 41, 51, 19, 59, 27, 49, 17, 57, 25, 15, 47, 7, 39, 13, 45, 5, 37, 63, 31, 55, 23, 61, 29, 53, 21];
  let lum = null, cols = 0, rows = 0, cell = 6, mx = -1e4, my = -1e4, sx = -1e4, sy = -1e4, raf = 0;
  const setup = () => {
    const w = innerWidth, h = innerHeight, dpr = Math.min(2, devicePixelRatio || 1);
    cv.width = w * dpr; cv.height = h * dpr; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    cols = Math.ceil(w / cell); rows = Math.ceil(h / cell);
    const off = document.createElement('canvas'); off.width = cols; off.height = rows;
    const o = off.getContext('2d');
    const s = Math.max(cols / img.width, rows / img.height);
    o.drawImage(img, (cols - img.width * s) / 2, (rows - img.height * s) / 2, img.width * s, img.height * s);
    const d = o.getImageData(0, 0, cols, rows).data;
    lum = new Float32Array(cols * rows);
    for (let i = 0; i < cols * rows; i++) lum[i] = (d[i * 4] * .3 + d[i * 4 + 1] * .59 + d[i * 4 + 2] * .11) / 255;
    draw();
  };
  const draw = () => {
    raf = 0;
    sx += (mx - sx) * .18; sy += (my - sy) * .18;
    const w = innerWidth, h = innerHeight;
    ctx.fillStyle = '#17110a'; ctx.fillRect(0, 0, w, h);
    for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
      let v = lum[y * cols + x] * .78;
      const dx = x * cell - sx, dy = y * cell - sy, dist = Math.hypot(dx, dy);
      const spot = Math.max(0, 1 - dist / 260);
      v += spot * .45;
      const th = (bayer[(y % 8) * 8 + (x % 8)] + .5) / 64;
      if (v > th) {
        ctx.fillStyle = spot > .25 ? (v > .9 ? '#fff3c8' : '#fbce07') : v > .82 ? '#e8c46a' : v > .55 ? '#8a6a35' : '#4a3a22';
        ctx.fillRect(x * cell + 1, y * cell + 1, cell - 2, cell - 2);
      }
    }
    if (Math.abs(mx - sx) + Math.abs(my - sy) > 1 && !RM.matches) raf = requestAnimationFrame(draw);
  };
  img.onload = setup;
  addEventListener('resize', () => { if (img.complete) setup(); });
  addEventListener('pointermove', e => { mx = e.clientX; my = e.clientY; if (sx < -1e3) { sx = mx; sy = my; } if (!raf && lum) raf = requestAnimationFrame(draw); });
})();

render();
