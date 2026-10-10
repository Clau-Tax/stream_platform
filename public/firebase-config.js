// Configuración de Firebase (Realtime Database se usa como servidor de señalización WebRTC)
const firebaseConfig = {
  apiKey: "AIzaSyDfsuLEM6Pn9ugrYaqUYesTC4ZMS3olvFw",
  authDomain: "webrtctest-64b55.firebaseapp.com",
  databaseURL: "https://webrtctest-64b55-default-rtdb.firebaseio.com",
  projectId: "webrtctest-64b55",
  storageBucket: "webrtctest-64b55.firebasestorage.app",
  messagingSenderId: "126997881528",
  appId: "1:126997881528:web:8e523fce76eba4f2144a4d"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// Ruta principal de señalización (soporta 1 emisor y múltiples espectadores)
const ROOM_PATH = 'rooms/main';

const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' }
  ]
};
