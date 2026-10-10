// Chat y reacciones en tiempo real con Firebase (rooms/main/chat y rooms/main/reactions).
// No modifica emisor.js ni receptor.js. Se activa cuando la sala está activa en Firebase.
const colores = ['var(--vivo)', 'var(--acento)', 'var(--ambar)', 'var(--texto)'];
const lista = document.getElementById('mensajes');
const formChat = document.getElementById('chatForm');
const capa = document.getElementById('capaReacciones');
const nombreForm = document.getElementById('nombreForm');   // solo existe en el receptor
const nombreEl = document.getElementById('nombre');
const cambiarBtn = document.getElementById('cambiarNombre');
let chatRef = null, reaccRef = null, activo = false, ultimoMsg = 0, ultimaReac = 0;

// Cada persona elige su nombre una vez (se recuerda en este navegador). El emisor empieza como "Streamer" y puede cambiarlo.
const esEmisor = !!document.getElementById('startBtn');
const CLAVE = esEmisor ? 'hdi-nombre-streamer' : 'hdi-nombre';
let nombre = localStorage.getItem(CLAVE) || (esEmisor ? 'Streamer' : '');

// Con nombre: se ve el campo de mensaje. Sin nombre: se pide el nombre primero.
function mostrarPaso() {
  if (!nombreForm) return;
  nombreForm.hidden = !!nombre;
  formChat.hidden = !nombre;
  cambiarBtn.hidden = !nombre;
  cambiarBtn.textContent = nombre + ' · cambiar';
}
mostrarPaso();

if (nombreForm) {
  nombreForm.addEventListener('submit', e => {
    e.preventDefault();
    const n = nombreEl.value.trim().slice(0, 20);
    if (!n) return;
    nombre = n;
    localStorage.setItem(CLAVE, n);
    mostrarPaso();
    formChat.elements.texto.focus();
  });
  cambiarBtn.addEventListener('click', () => {
    nombreEl.value = nombre; nombre = ''; mostrarPaso(); nombreEl.focus();
  });
}

// El color de cada persona sale de su nombre (borde de color en el chat)
function colorDe(n) { let h = 0; for (const c of n) h = (h * 31 + c.charCodeAt(0)) % 97; return colores[h % colores.length]; }

function pintarMensaje(m) {
  const p = document.createElement('p');
  p.style.setProperty('--c', colorDe(m.name));
  const b = document.createElement('b'); b.textContent = m.name; // textContent evita inyectar HTML
  p.append(b, ' ', m.text);
  lista.appendChild(p);
  while (lista.children.length > 60) lista.firstChild.remove();
  lista.scrollTop = lista.scrollHeight;
}

// Avisos dentro del chat: así los errores se ven en pantalla y no solo en la consola
function aviso(texto) {
  const p = document.createElement('p');
  p.className = 'vacio'; p.textContent = texto;
  lista.appendChild(p); lista.scrollTop = lista.scrollHeight;
}

function volar(emoji) {
  const s = document.createElement('span');
  s.className = 'volar'; s.textContent = emoji; s.style.left = (8 + Math.random() * 80) + '%';
  capa.appendChild(s);
  s.addEventListener('animationend', () => s.remove());
}

function setEnvio(on) { document.querySelectorAll('[data-envia]').forEach(e => e.disabled = !on); }

function activar() {
  if (activo) return; activo = true;
  const sala = db.ref(ROOM_PATH);
  chatRef = sala.child('chat'); reaccRef = sala.child('reactions');
  lista.replaceChildren();
  chatRef.limitToLast(30).on('child_added', s => pintarMensaje(s.val()));
  // Ignora las reacciones viejas: Firebase dispara child_added de lo existente antes que el once('value')
  let listo = false;
  reaccRef.on('child_added', s => { if (listo) volar(s.val().e); });
  reaccRef.once('value').then(() => { listo = true; });
  setEnvio(true);
}

function desactivar() {
  if (!activo) return; activo = false;
  chatRef.off(); reaccRef.off(); setEnvio(false);
}

// Escucha la sala con una consulta distinta a la de receptor.js: su active.off() no apaga esta
db.ref(ROOM_PATH).orderByKey().equalTo('active')
  .on('value', (s) => (s.child('active').val() ? activar() : desactivar()));

formChat.addEventListener('submit', e => {
  e.preventDefault();
  const texto = formChat.elements.texto.value.trim().slice(0, 200);
  if (!texto) return;
  if (!activo) return aviso('La transmisión aún no está al aire.');
  if (Date.now() - ultimoMsg < 800) return; // límite anti spam
  ultimoMsg = Date.now();
  chatRef.push({ name: nombre || 'Anónimo', text: texto, t: firebase.database.ServerValue.TIMESTAMP })
    .catch((err) => { console.error(err); aviso('No se pudo enviar el mensaje (' + (err.code || err.message) + ').'); });
  formChat.elements.texto.value = '';
});

document.querySelectorAll('[data-reaccion]').forEach(b => b.addEventListener('click', () => {
  if (!activo || Date.now() - ultimaReac < 250) return;
  ultimaReac = Date.now();
  reaccRef.push({ e: b.dataset.reaccion, t: firebase.database.ServerValue.TIMESTAMP })
    .catch((err) => { console.error(err); aviso('No se pudo enviar la reacción (' + (err.code || err.message) + ').'); });
  volar(b.dataset.reaccion);
}));

// ---------- Espectadores en tiempo real ----------
// Cuenta los nodos de rooms/main/viewers: cada receptor que se conecta crea uno y se borra al salir.
// Usa orderByKey() para que el viewersRef.off() de emisor.js no apague este oyente.
function textoEspectadores(n) {
  return n === 0 ? 'Sin espectadores' : n === 1 ? '1 persona viendo' : n + ' personas viendo';
}
db.ref(ROOM_PATH + '/viewers').orderByKey().on('value', (s) => {
  const t = textoEspectadores(s.numChildren());
  ['contadorInfo', 'contador'].forEach(id => { const e = document.getElementById(id); if (e) e.textContent = t; });
});