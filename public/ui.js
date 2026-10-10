// Solo capa visual: observa el texto de #status (que escribe el JS original)
// para mostrar la insignia "En vivo", sin tocar emisor.js ni receptor.js.
const estado = document.getElementById('status');
function actualizarUI() {
  document.body.classList.toggle('en-vivo', /Transmitiendo en vivo|Recibiendo transmisión/.test(estado.textContent));
}
new MutationObserver(actualizarUI).observe(estado, { childList: true, characterData: true, subtree: true });

// Botón Seguir: alterna entre seguido y no seguido (simulado)
const seguir = document.getElementById('seguirBtn');
if (seguir) seguir.addEventListener('click', () => {
  const on = seguir.getAttribute('aria-pressed') !== 'true';
  seguir.setAttribute('aria-pressed', on);
  seguir.querySelector('span').textContent = on ? 'Siguiendo' : 'Seguir';
});

// Canales recomendados: marca el canal elegido
document.querySelectorAll('.canal').forEach(c => c.addEventListener('click', e => {
  e.preventDefault();
  document.querySelectorAll('.canal').forEach(x => { x.classList.remove('sel'); x.removeAttribute('aria-current'); });
  c.classList.add('sel'); c.setAttribute('aria-current', 'true');
}));