/* Shell Heritage · Tu recarga — demo interactiva (proyecto académico) */
const $ = s => document.querySelector(s);
const area = $('#content');
const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

const START = 32;
const fresh = () => ({ stage: 0, level: '01', target: 80, battery: START, aligned: false, paused: false });

let tab = 'charge';
let state = fresh();
let position = -8;
let previousScreen = '';
let displayedBattery = START;
let ringFrame;

const LEVELS = {
  PB: { name: 'Planta baja', via: 'Acceso directo' },
  '01': { name: 'Primer piso', via: 'Por elevador' },
  '02': { name: 'Segundo piso', via: 'Por elevador' }
};
const STEP_LABELS = ['Inicio', 'Acceso', 'Alinear', 'Carga', 'Salida'];
const R = 104, C = 2 * Math.PI * R;

const icons = {
  clock: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>',
  go: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7 17 17 7M8 7h9v9"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="m5 12 5 5 9-10"/></svg>'
};

const car = `<svg viewBox="0 0 54 104" aria-hidden="true">
  <defs><linearGradient id="carBody" x1="0" x2="1"><stop offset="0" stop-color="#d9ded8"/><stop offset=".5" stop-color="#fbfaf3"/><stop offset="1" stop-color="#d9ded8"/></linearGradient></defs>
  <rect x="3" y="2" width="48" height="100" rx="17" fill="url(#carBody)"/>
  <path d="M10 30c4-5 30-5 34 0l-3 14H13z" fill="#1f3c43"/>
  <path d="M13 72h28l3 12c-5 5-29 5-34 0z" fill="#1f3c43"/>
  <rect x="13" y="46" width="28" height="24" rx="5" fill="#e9ece6"/>
  <rect x="8" y="5" width="10" height="4" rx="2" fill="#fff8c9"/><rect x="36" y="5" width="10" height="4" rx="2" fill="#fff8c9"/>
  <rect x="8" y="96" width="10" height="3" rx="1.5" fill="#e0484d"/><rect x="36" y="96" width="10" height="3" rx="1.5" fill="#e0484d"/>
  <rect x="0" y="32" width="4" height="7" rx="2" fill="#b9c3bf"/><rect x="50" y="32" width="4" height="7" rx="2" fill="#b9c3bf"/>
</svg>`;

/* ---------- Building blocks ---------- */
const btn = (label, action, kind = 'primary', arrow = false) =>
  `<button type="button" class="btn btn-${kind}" data-action="${action}">${label}${arrow ? ' <span class="arrow" aria-hidden="true">→</span>' : ''}</button>`;

function title(kicker, heading, lead, num) {
  return `<span class="kicker">${num ? `<span class="num">${num}</span>` : ''}${kicker}</span><h2>${heading}</h2><p class="lead">${lead}</p>`;
}

const details = rows => `<div class="card details">${rows.map(([k, v]) => `<div class="detail"><span>${k}</span><strong>${v}</strong></div>`).join('')}</div>`;
const note = (text, cls = '') => `<div class="note ${cls}">${text}</div>`;
const spotId = () => `${state.level} · 02`;

function stepper() {
  return `<ol class="stepper" aria-label="Progreso">${STEP_LABELS.map((l, i) => {
    const cls = i < state.stage || state.stage >= 5 ? 'done' : i === state.stage ? 'now' : '';
    return `<li class="${cls}"${i === state.stage ? ' aria-current="step"' : ''}>${l}</li>`;
  }).join('')}</ol>`;
}

/* ---------- Screens ---------- */
function placeScreen() {
  return title('Tu tiempo también recarga', 'Mientras tu auto <em>carga.</em>', 'Un café, una pausa o una nueva forma de mirar la energía.') +
    `<figure class="place-figure"><img src="assets/heritage.webp" alt="Fachada Shell Heritage"><figcaption>Av. Pueyrredón y Av. Santa Fe</figcaption></figure>
    <ol class="floors" reversed>
      <li class="floor top"><span class="lvl">03</span><div><b>Museo + Energy Lab</b><small>Tercer piso</small></div><span class="count">Experiencia</span></li>
      <li class="floor"><span class="lvl">02</span><div><b>Carga inductiva</b><small>Segundo piso · por elevador</small></div><span class="count">4 plazas</span></li>
      <li class="floor"><span class="lvl">01</span><div><b>Carga inductiva</b><small>Primer piso · por elevador</small></div><span class="count">4 plazas</span></li>
      <li class="floor ground"><span class="lvl">PB</span><div><b>Shell Select</b><small>Planta baja · acceso directo</small></div><span class="count">2 plazas</span></li>
    </ol>` +
    note('Acceso peatonal independiente. La escalera y el ascensor conectan los espacios.') +
    btn('Volver a mi recarga', 'back', 'dark', true);
}

function helpScreen() {
  const faq = [
    ['¿Mi vehículo es compatible?', 'La carga inductiva requiere un receptor compatible instalado en el vehículo. Esta demo representa una propuesta académica, no un servicio operativo.'],
    ['¿Qué muestran los anillos?', 'El anillo avanza desde el nivel inicial hasta el objetivo elegido. Un anillo completo indica que alcanzaste tu objetivo, no necesariamente el 100 % de batería.'],
    ['¿Cómo funciona la salida?', 'En los pisos superiores, finalizá la carga y pedí tu turno. Esperá en tu plaza hasta recibir autorización para ir al elevador. En planta baja, salís directamente desde la plaza una vez libre el recorrido.'],
    ['¿Qué pasa si la carga se interrumpe?', 'La app muestra un aviso. En esta demo podés probar la interrupción y reanudarla desde Mi recarga.']
  ];
  return title('Estamos para ayudarte', 'Todo bajo <em>control.</em>', 'Conocé cómo funciona esta propuesta.') +
    `<div class="faq">${faq.map(([q, a], i) => `<details${i === 0 ? ' open' : ''}><summary>${q}</summary><p>${a}</p></details>`).join('')}</div>` +
    note('No hay pagos, reservas reales ni conexión con equipos. Los estados se simulan para mostrar la experiencia.');
}

function chargeScreen() {
  const s = state, pb = s.level === 'PB';

  if (s.stage === 0) {
    const fill = (s.target - 50) / 50 * 100;
    return title('Bienvenido a Heritage', 'Tu próxima recarga, <em>sin cables.</em>', 'Elegí dónde estacionar y comenzá el recorrido.') +
      `<div class="card">
        <div class="location">
          <div><h3>Shell Heritage</h3><p>Av. Pueyrredón y Av. Santa Fe · Buenos Aires</p></div>
          <span class="badge"><i class="dot"></i>10 plazas</span>
        </div>
        <div class="divider"></div>
        <div class="field-label" id="levelLabel">Dónde querés cargar</div>
        <div class="levels" role="radiogroup" aria-labelledby="levelLabel">
          ${Object.entries(LEVELS).map(([code, l]) => `
            <div class="level">
              <input type="radio" name="level" id="lv-${code}" value="${code}" ${s.level === code ? 'checked' : ''}>
              <label for="lv-${code}"><span class="code">${code}</span><span class="name">${l.name}</span><span class="via">${l.via}</span></label>
            </div>`).join('')}
        </div>
        <div class="divider"></div>
        <div class="field-label"><label for="goal">Objetivo de batería</label></div>
        <div class="goal">
          <div class="goal-value"><span id="goaltext">${s.target}</span><small>%</small></div>
          <div class="goal-hint">Desde ${START} %<br>de carga inicial</div>
        </div>
        <input class="range" id="goal" type="range" min="50" max="100" step="5" value="${s.target}" style="--fill:${fill}%">
        <div class="ticks"><span>50</span><span>75</span><span>100</span></div>
      </div>` +
      note('Para esta demostración, usamos un vehículo compatible con carga inductiva.') +
      btn('Solicitar acceso', 'request', 'primary', true);
  }

  if (s.stage === 1) {
    return title('Acceso asignado', pb ? 'Tu plaza te <em>espera.</em>' : 'Tu ingreso está <em>habilitado.</em>',
      pb ? 'Dirigite a la plaza indicada en planta baja.' : 'Ingresá al elevador cuando la señal del acceso lo permita.', '01') +
      `<div class="card spot"><div><span class="label">Tu plaza</span><strong>${s.level}<span> · </span>02</strong></div><span class="badge"><i class="dot"></i>Asignada</span></div>` +
      details([['Acceso', pb ? 'Directo desde PB' : 'Elevador vehicular'], ['Nivel', LEVELS[s.level].name], ['Objetivo', s.target + ' %']]) +
      note(pb ? 'Mantené libre el paso peatonal y seguí las señales del acceso.' : 'El elevador funciona por turnos. Un solo movimiento autorizado a la vez.') +
      btn('Ya estoy en mi plaza', 'arrive', 'primary', true);
  }

  if (s.stage === 2) {
    return title('Preparar la carga', 'Alineá tu <em>vehículo.</em>', 'Seguí la guía luminosa y detené el vehículo sobre la placa.', '02') +
      `<div class="bay-card">
        <div class="bay-label"><span>Vista superior</span><span>Plaza ${spotId()}</span></div>
        <div class="bay" aria-hidden="true"><div class="pad"></div><div class="vehicle">${car}</div></div>
        <label for="position">Mové el auto hasta centrarlo en la placa</label>
        <input class="range" type="range" id="position" min="-10" max="10" step="1" value="${position}">
        <output id="sensor" for="position"></output>
      </div>
      <button type="button" class="btn btn-primary" data-action="start" disabled>Iniciar carga <span class="arrow" aria-hidden="true">→</span></button>
      <p class="hint">Confirmá con el vehículo detenido.</p>`;
  }

  if (s.stage === 3) {
    const done = s.battery >= s.target;
    const status = s.paused ? 'Interrumpida' : done ? 'Finalizada' : 'Cargando';
    return title('Mi recarga',
      s.paused ? 'Carga <em>interrumpida.</em>' : done ? 'Objetivo <em>alcanzado.</em>' : 'Tu auto está <em>recargando.</em>',
      s.paused ? 'La sesión está pausada. Revisá el estado antes de continuar.' : done ? 'Tu vehículo está listo para el próximo recorrido.' : 'La simulación avanza sola. El anillo se cierra al alcanzar tu objetivo.', '03') +
      `<div class="charge ${!s.paused && !done ? 'is-charging' : ''}">
        <div class="ring">
          <svg viewBox="0 0 236 236" aria-hidden="true">
            <defs><linearGradient id="ringGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#00a39c"/><stop offset="1" stop-color="#7ff5dd"/></linearGradient></defs>
            <circle class="ticks-c" cx="118" cy="118" r="${R + 15}" fill="none" stroke-width="1.5" stroke-dasharray="1.5 8.6"/>
            <circle class="track" cx="118" cy="118" r="${R}" fill="none" stroke-width="14"/>
            <circle class="bar" cx="118" cy="118" r="${R}" fill="none" stroke-width="14" stroke-dasharray="${C}" stroke-dashoffset="${C}"/>
          </svg>
          <div class="ring-inner"><small>Batería actual</small><strong><b class="pct">${Math.round(displayedBattery)}</b><span>%</span></strong><small class="target">Objetivo ${s.target} %</small></div>
        </div>
        <span class="charge-state ${s.paused ? 'paused' : ''}"><i class="dot"></i>${status}</span>
      </div>
      <div class="stats">
        <div class="stat"><span>Plaza</span><strong>${spotId()}</strong></div>
        <div class="stat"><span>Desde el inicio</span><strong>+${s.battery - START} pts</strong></div>
        <div class="stat"><span>Restante</span><strong>${Math.max(0, s.target - s.battery)} pts</strong></div>
      </div>` +
      (!done ? `<div class="btn-row">${btn(s.paused ? 'Reanudar demo' : 'Adelantar 12 puntos', s.paused ? 'resume' : 'advance', 'soft')}${!s.paused ? btn('Probar interrupción', 'pause', 'soft') : ''}</div>` : '') +
      btn(done ? 'Solicitar salida' : 'Finalizar carga y pedir salida', 'finish', done ? 'primary' : 'dark', true) +
      btn('Qué hacer mientras espero', 'place', 'link');
  }

  if (s.stage === 4) {
    return title('Turno de salida', pb ? 'Prepará tu <em>salida.</em>' : 'Esperá en tu <em>plaza.</em>',
      pb ? 'La carga finalizó. Verificá que el recorrido esté libre antes de salir.' : 'La carga finalizó. Te avisamos cuando puedas avanzar hacia el elevador.', '04') +
      `<div class="card status-card"><div class="status-icon spin">${icons.clock}</div><h3>${pb ? 'Verificando el recorrido' : 'Turno solicitado'}</h3><p>Plaza ${spotId()}</p></div>` +
      note(pb ? 'No avances hasta que se habilite la salida.' : 'Permanecé en tu plaza para mantener libre el pasillo de maniobra.', 'alert') +
      btn('Simular autorización de salida', 'authorize', 'primary', true);
  }

  if (s.stage === 5) {
    return title('Salida habilitada', 'Buen <em>viaje.</em>', 'Tu turno está habilitado. Seguí las indicaciones del lugar.', '05') +
      `<div class="card status-card"><div class="status-icon go">${icons.go}</div><h3>${pb ? 'Salida directa desde tu plaza' : 'Podés dirigirte al elevador'}</h3><p>Recorrido habilitado en esta demostración.</p></div>` +
      details([['Batería al salir', s.battery + ' %'], ['Plaza liberada al retirarte', spotId()]]) +
      btn('Ya salí · terminar visita', 'complete', 'dark', true);
  }

  // stage 6
  return title('Visita finalizada', 'Nos vemos en tu <em>próxima pausa.</em>', 'Tu sesión de demostración terminó.') +
    `<div class="finale"><div><span>Inicial</span><strong>${START}%</strong></div><div class="arrow-big" aria-hidden="true">→</div><div><span>Final</span><strong class="to">${s.battery}%</strong></div></div>` +
    details([['Energía cargada', '+' + (s.battery - START) + ' puntos'], ['Ubicación', 'Shell Heritage']]) +
    btn('Comenzar otra visita', 'reset', 'primary', true);
}

/* ---------- Render ---------- */
function drawScreen() {
  const tabs = [...document.querySelectorAll('[data-tab]')];
  tabs.forEach((b, i) => {
    const on = b.dataset.tab === tab;
    b.classList.toggle('active', on);
    b.setAttribute('aria-pressed', on);
    if (on) $('.tabs').style.setProperty('--i', i);
  });
  if (tab === 'place') area.innerHTML = placeScreen();
  else if (tab === 'help') area.innerHTML = helpScreen();
  else area.innerHTML = stepper() + chargeScreen();
}

function updatePosition() {
  state.aligned = Math.abs(position) <= 1;
  const bay = $('.bay-card');
  bay.querySelector('.bay').style.setProperty('--offset', position * 3.6 + '%');
  bay.classList.toggle('locked', state.aligned);
  const sensor = $('#sensor');
  sensor.classList.toggle('ok', state.aligned);
  sensor.innerHTML = state.aligned ? `<span style="width:16px;height:16px;display:inline-flex">${icons.check}</span> Sensor alineado · listo para cargar`
    : position < 0 ? 'Desplazá el auto hacia la derecha →' : '← Desplazá el auto hacia la izquierda';
  $('[data-action="start"]').disabled = !state.aligned;
  $('h2').innerHTML = state.aligned ? 'Posición <em>correcta.</em>' : 'Alineá tu <em>vehículo.</em>';
  $('h2 + .lead').textContent = state.aligned ? 'El receptor está centrado sobre la placa. Podés iniciar la carga.' : 'Seguí la guía luminosa para ubicar el receptor sobre la placa.';
}

function setRing(value) {
  const ring = $('.ring');
  if (!ring) return;
  const frac = Math.max(0, Math.min(1, (value - START) / (state.target - START)));
  ring.querySelector('.bar').style.strokeDashoffset = C * (1 - frac);
  ring.querySelector('.pct').textContent = Math.round(value);
}

function animateBattery() {
  if (!$('.ring')) return;
  const start = displayedBattery, end = state.battery, since = performance.now();
  const frame = now => {
    const t = reducedMotion.matches ? 1 : Math.min(1, (now - since) / 700);
    displayedBattery = start + (end - start) * (1 - (1 - t) ** 3);
    setRing(displayedBattery);
    if (t < 1) ringFrame = requestAnimationFrame(frame);
  };
  frame(since);
}

function render() {
  cancelAnimationFrame(ringFrame);
  const focusAction = document.activeElement?.dataset.action;
  drawScreen();
  const screen = tab + state.stage;
  if (screen !== previousScreen && !reducedMotion.matches) {
    area.animate([{ opacity: 0, transform: 'translateY(12px)' }, { opacity: 1, transform: 'none' }], { duration: 420, easing: 'cubic-bezier(.22,1,.36,1)' });
  }
  if (screen === previousScreen && focusAction) area.querySelector(`[data-action="${focusAction}"]`)?.focus({ preventScroll: true });
  previousScreen = screen;
  if (state.stage === 0) displayedBattery = START;
  if (tab === 'charge' && state.stage === 2) updatePosition();
  animateBattery();
}

/* ---------- Events ---------- */
area.addEventListener('input', e => {
  const t = e.target;
  if (t.id === 'position') { position = Number(t.value); updatePosition(); }
  if (t.id === 'goal') {
    state.target = Number(t.value);
    $('#goaltext').textContent = state.target;
    t.style.setProperty('--fill', (state.target - 50) / 50 * 100 + '%');
  }
});
area.addEventListener('change', e => { if (e.target.name === 'level') state.level = e.target.value; });

function action(a) {
  const s = state;
  switch (a) {
    case 'request': s.stage = 1; break;
    case 'arrive': s.stage = 2; break;
    case 'start': if (s.aligned) s.stage = 3; break;
    case 'advance': if (!s.paused) s.battery = Math.min(s.target, s.battery + 12); break;
    case 'pause': s.paused = true; break;
    case 'resume': s.paused = false; break;
    case 'finish': s.stage = 4; s.paused = false; break;
    case 'authorize': s.stage = 5; break;
    case 'complete': s.stage = 6; break;
    case 'place': tab = 'place'; break;
    case 'back': tab = 'charge'; break;
    case 'reset': position = -8; state = fresh(); tab = 'charge'; break;
  }
  render();
  if (['request', 'arrive', 'start', 'finish', 'authorize', 'complete', 'reset', 'place', 'back'].includes(a)) {
    window.scrollTo({ top: 0, behavior: reducedMotion.matches ? 'auto' : 'smooth' });
  }
}

area.addEventListener('click', e => {
  const b = e.target.closest('[data-action]');
  if (b && !b.disabled) action(b.dataset.action);
});
document.querySelectorAll('[data-tab]').forEach(b => b.addEventListener('click', () => { tab = b.dataset.tab; render(); }));
$('#reset').addEventListener('click', () => action('reset'));

// Advance the accelerated demo while the visitor explores the building.
setInterval(() => {
  if (state.stage !== 3 || state.paused || state.battery >= state.target || document.hidden) return;
  state.battery = Math.min(state.target, state.battery + 2);
  if (tab === 'charge') render();
}, 2400);

render();
