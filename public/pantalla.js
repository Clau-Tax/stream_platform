// Controles del emisor: compartir pantalla con tu cara en una esquina, y botones de micrófono y cámara.
// Usa localStream, peers y localVideo, definidos en emisor.js (que no se modifica).
const shareBtn = document.getElementById('shareBtn');
const micBtn = document.getElementById('micBtn');
const camBtn = document.getElementById('camBtn');
const W = 1280, H = 720; // tamaño del video que reciben los espectadores al compartir
let pistaCamara = null, pistaPantalla = null, pistaSalida = null;
let vPantalla = null, vCamara = null, lienzo = null, ctx = null, reloj = null;

if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) shareBtn.hidden = true;

// ---------- Micrófono y cámara ----------
function pintarMedio(btn, on, textoOn, textoOff, icOn, icOff) {
  btn.classList.toggle('off', !on);
  btn.setAttribute('aria-pressed', !on);
  btn.querySelector('span').textContent = on ? textoOn : textoOff;
  btn.querySelector('use').setAttribute('href', '/iconos.svg#' + (on ? icOn : icOff));
}
const pintarMic = (on) => pintarMedio(micBtn, on, 'Micrófono', 'Micrófono apagado', 'mic', 'micoff');
const pintarCam = (on) => pintarMedio(camBtn, on, 'Cámara', 'Cámara apagada', 'video', 'videooff');

micBtn.addEventListener('click', () => {
  const t = localStream && localStream.getAudioTracks()[0];
  if (!t) return;
  t.enabled = !t.enabled; // enabled=false envía silencio sin cortar la conexión
  pintarMic(t.enabled);
});

camBtn.addEventListener('click', () => {
  // Mientras compartes, la cámara real es pistaCamara; si no, es la pista de video del stream
  const t = pistaCamara || (localStream && localStream.getVideoTracks()[0]);
  if (!t) return;
  t.enabled = !t.enabled;
  pintarCam(t.enabled);
});

// ---------- Compartir pantalla ----------
function cambiarVideo(nueva) {
  localStream.removeTrack(localStream.getVideoTracks()[0]);
  localStream.addTrack(nueva); // los espectadores que entren después recibirán esta pista
  for (const { pc } of peers.values()) {
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (sender) sender.replaceTrack(nueva); // sin renegociar la conexión
  }
  localVideo.srcObject = localStream;
}

// Recorta el video para llenar el recuadro sin deformarlo
function cubrir(v, x, y, w, h) {
  const r = w / h, vr = v.videoWidth / v.videoHeight;
  let sw = v.videoWidth, sh = v.videoHeight, sx = 0, sy = 0;
  if (vr > r) { sw = sh * r; sx = (v.videoWidth - sw) / 2; } else { sh = sw / r; sy = (v.videoHeight - sh) / 2; }
  ctx.drawImage(v, sx, sy, sw, sh, x, y, w, h);
}

// Dibuja un cuadro: la pantalla completa y, arriba a la derecha, tu cara en un círculo
function dibujar() {
  if (!ctx || !pistaCamara) return;
  ctx.fillStyle = '#000'; ctx.fillRect(0, 0, W, H);
  if (vPantalla.videoWidth) {
    const k = Math.min(W / vPantalla.videoWidth, H / vPantalla.videoHeight);
    const w = vPantalla.videoWidth * k, h = vPantalla.videoHeight * k;
    ctx.drawImage(vPantalla, (W - w) / 2, (H - h) / 2, w, h);
  }
  if (pistaCamara.enabled && vCamara.videoWidth) { // si apagas la cámara, el círculo desaparece
    const d = 220, x = W - d - 24, y = 24;
    ctx.save(); ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2); ctx.clip();
    cubrir(vCamara, x, y, d, d);
    ctx.restore();
    ctx.beginPath(); ctx.arc(x + d / 2, y + d / 2, d / 2, 0, Math.PI * 2);
    ctx.lineWidth = 6; ctx.strokeStyle = '#3dd6f5'; ctx.stroke();
  }
}

// Un reloj dentro de un Worker: los temporizadores normales se frenan cuando la pestaña queda en segundo plano
function crearReloj(fn) {
  const w = new Worker(URL.createObjectURL(new Blob(['setInterval(()=>postMessage(0),33)'], { type: 'text/javascript' })));
  w.onmessage = fn;
  return w;
}

function crearVideo(flujo) {
  const v = document.createElement('video');
  v.muted = true; v.playsInline = true; v.srcObject = flujo;
  v.play().catch(() => {});
  return v;
}

function pintarBoton(compartiendo) {
  shareBtn.setAttribute('aria-pressed', compartiendo);
  shareBtn.querySelector('span').textContent = compartiendo ? 'Dejar de compartir' : 'Compartir pantalla';
  document.body.classList.toggle('compartiendo', compartiendo);
}

async function compartir() {
  let flujo;
  try { flujo = await navigator.mediaDevices.getDisplayMedia({ video: { frameRate: 30 } }); }
  catch (err) { return; } // la persona canceló el permiso
  pistaPantalla = flujo.getVideoTracks()[0];
  pistaCamara = localStream.getVideoTracks()[0];
  vPantalla = crearVideo(flujo);
  vCamara = crearVideo(new MediaStream([pistaCamara]));
  lienzo = document.createElement('canvas'); lienzo.width = W; lienzo.height = H;
  ctx = lienzo.getContext('2d');
  pistaSalida = lienzo.captureStream(30).getVideoTracks()[0]; // el lienzo se convierte en una pista de video
  reloj = crearReloj(dibujar);
  cambiarVideo(pistaSalida);
  pistaPantalla.onended = volverACamara; // botón "Dejar de compartir" del navegador
  pintarBoton(true);
}

function liberar() {
  if (reloj) reloj.terminate();
  [pistaPantalla, pistaSalida].forEach(t => t && t.stop());
  [vPantalla, vCamara].forEach(v => { if (v) v.srcObject = null; });
  reloj = pistaPantalla = pistaSalida = vPantalla = vCamara = lienzo = ctx = null;
}

function volverACamara() {
  if (!pistaPantalla) return;
  const cam = pistaCamara; pistaCamara = null;
  if (localStream) cambiarVideo(cam); else cam.stop();
  liberar();
  pintarBoton(false);
}

// Habilita los botones solo cuando se está transmitiendo; si se detiene, libera todo
new MutationObserver(() => {
  const vivo = document.body.classList.contains('en-vivo');
  [shareBtn, micBtn, camBtn].forEach(b => b.disabled = !vivo);
  if (!vivo) {
    if (pistaPantalla) { pistaCamara.stop(); pistaCamara = null; liberar(); pintarBoton(false); }
    pintarMic(true); pintarCam(true);
  }
}).observe(document.body, { attributes: true, attributeFilter: ['class'] });

shareBtn.addEventListener('click', () => pistaPantalla ? volverACamara() : compartir());