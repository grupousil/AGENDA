import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  onAuthStateChanged, 
  signOut 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  updateDoc, 
  deleteDoc, 
  orderBy, 
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyDxSn9WZWhqBAKRzCBzgA3vhL7QvnQaOpI",
  authDomain: "agenda-92a09.firebaseapp.com",
  projectId: "agenda-92a09",
  storageBucket: "agenda-92a09.firebasestorage.app",
  messagingSenderId: "595953890665",
  appId: "1:595953890665:web:1293dc773a32f1cff3f9f8",
  measurementId: "G-8BVJM739Y3"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Lista de mensajes románticos automáticos
const romanticMessages = [
  "Recuerda que cada día es una oportunidad para construir juntos nuestros sueños. ¡Que tengas un día hermoso! 💖",
  "No importa cuán ocupado sea hoy, mi lugar favorito en el mundo siempre es a tu lado. ¡Éxitos hoy! ✨",
  "Sonríe, recuerda que hay alguien que piensa en ti con mucho cariño a cada segundo. 💕",
  "Confía en ti y en todo lo que eres capaz de lograr hoy. ¡Estoy orgulloso/a de ti! 🌟",
  "Un día brillante empieza con una mente positiva y un corazón lleno de amor. ¡A romperla hoy! 🔥",
  "Que el día de hoy te regale mil razones para sonreír. ¡Te mando un abrazo enorme! 🥰"
];

// 1. RELOJ TIEMPO REAL (PERÚ)
function updatePeruClock() {
  const options = {
    timeZone: 'America/Lima',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true
  };
  const peruTime = new Intl.DateTimeFormat('es-PE', options).format(new Date());
  document.getElementById('peru-clock').textContent = peruTime;
}
setInterval(updatePeruClock, 1000);
updatePeruClock();

// 2. MENSAJE DEL DÍA ALEATORIO
function setDailyMessage() {
  const todayIndex = new Date().getDate() % romanticMessages.length;
  document.getElementById('daily-message').textContent = romanticMessages[todayIndex];
}
setDailyMessage();

// 3. CONTROL DE AUTENTICACIÓN (LOGIN)
const loginForm = document.getElementById('login-form');
const loginScreen = document.getElementById('login-screen');
const appScreen = document.getElementById('app-screen');
const authError = document.getElementById('auth-error');

loginForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    authError.textContent = "";
  } catch (error) {
    authError.textContent = "Usuario o contraseña incorrectos. Verifica tus datos.";
  }
});

// Detectar estado de sesión
let currentUser = null;
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    loginScreen.classList.add('hidden');
    appScreen.classList.remove('hidden');
    
    // Establecer fecha actual por defecto en el selector
    document.getElementById('event-date').value = new Date().toISOString().split('T')[0];
    loadUserEvents();
  } else {
    currentUser = null;
    loginScreen.classList.remove('hidden');
    appScreen.classList.add('hidden');
  }
});

// Cerrar sesión
document.getElementById('logout-btn').addEventListener('click', () => {
  signOut(auth);
});

// Referencias al modal de alerta
const alertModal = document.getElementById('alert-modal');
const alertModalMsg = document.getElementById('alert-modal-msg');
const closeAlertBtn = document.getElementById('close-alert-btn');

function showAlertModal(message) {
  alertModalMsg.textContent = message;
  alertModal.classList.remove('hidden');
}

closeAlertBtn.addEventListener('click', () => {
  alertModal.classList.add('hidden');
});

alertModal.addEventListener('click', (e) => {
  if (e.target === alertModal) {
    alertModal.classList.add('hidden');
  }
});

// 4. GUARDAR EVENTOS NUEVOS
const saveBtn = document.getElementById('save-event-btn');
const dateInput = document.getElementById('event-date');

saveBtn.addEventListener('click', async () => {
  const time = document.getElementById('event-time').value;
  const title = document.getElementById('event-title').value;
  const desc = document.getElementById('event-desc').value;
  const date = dateInput.value;

  if (!time || !title || !date) {
    showAlertModal("Por favor completa la hora, fecha y el título de la nota antes de guardar.");
    return;
  }

  try {
    await addDoc(collection(db, "events"), {
      userId: currentUser.uid,
      date: date,
      time: time,
      title: title,
      desc: desc,
      createdAt: new Date()
    });

    document.getElementById('event-time').value = "";
    document.getElementById('event-title').value = "";
    document.getElementById('event-desc').value = "";
  } catch (error) {
    console.error("Error al guardar: ", error);
    showAlertModal("Ocurrió un error al intentar guardar el evento en la agenda.");
  }
});

// 5. CARGAR Y MOSTRAR EVENTOS
dateInput.addEventListener('change', loadUserEvents);

function loadUserEvents() {
  if (!currentUser) return;
  const selectedDate = dateInput.value;
  const eventsList = document.getElementById('events-list');

  const q = query(
    collection(db, "events"),
    where("userId", "==", currentUser.uid),
    where("date", "==", selectedDate)
  );

  onSnapshot(q, (snapshot) => {
    eventsList.innerHTML = "";
    if (snapshot.empty) {
      eventsList.innerHTML = '<p class="empty-msg">No hay notas ni eventos guardados para esta fecha.</p>';
      return;
    }

    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const docId = docSnap.id;
      const card = document.createElement('div');
      card.className = 'event-card';
      
      card.innerHTML = `
        <div class="event-info">
          <span class="event-time-badge">⏰ ${data.time}</span>
          <h5>${data.title}</h5>
          <p>${data.desc || ''}</p>
          <div class="event-actions">
            <button class="btn-icon edit-btn" data-id="${docId}" data-time="${data.time}" data-title="${data.title}" data-desc="${data.desc || ''}">✏️ Editar</button>
            <button class="btn-icon delete delete-btn" data-id="${docId}">🗑️ Eliminar</button>
          </div>
        </div>
      `;
      eventsList.appendChild(card);
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.delete-btn');
        deleteEvent(targetBtn.dataset.id);
      });
    });

    document.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.edit-btn');
        openEditModal(targetBtn.dataset);
      });
    });
  }, (error) => {
    console.error("Error en Snapshot: ", error);
  });
}

// 6. ELIMINAR EVENTO
let pendingDeleteDocId = null;
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

function deleteEvent(docId) {
  pendingDeleteDocId = docId;
  deleteModal.classList.remove('hidden');
}

cancelDeleteBtn.addEventListener('click', closeDeleteModal);

deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) closeDeleteModal();
});

confirmDeleteBtn.addEventListener('click', async () => {
  if (pendingDeleteDocId) {
    try {
      const idToDelete = pendingDeleteDocId;
      closeDeleteModal();
      await deleteDoc(doc(db, "events", idToDelete));
    } catch (error) {
      console.error("Error al eliminar: ", error);
      showAlertModal("No se pudo eliminar el evento. Revisa las reglas de seguridad de Firebase.");
    }
  }
});

function closeDeleteModal() {
  pendingDeleteDocId = null;
  deleteModal.classList.add('hidden');
}

// 7. EDITAR EVENTO
const editModal = document.getElementById('edit-modal');
const closeModalBtn = document.getElementById('close-modal-btn');
const updateEventBtn = document.getElementById('update-event-btn');

function openEditModal(data) {
  document.getElementById('edit-event-id').value = data.id;
  document.getElementById('edit-event-time').value = data.time;
  document.getElementById('edit-event-title').value = data.title;
  document.getElementById('edit-event-desc').value = data.desc;
  editModal.classList.remove('hidden');
}

closeModalBtn.addEventListener('click', () => {
  editModal.classList.add('hidden');
});

updateEventBtn.addEventListener('click', async () => {
  const docId = document.getElementById('edit-event-id').value;
  const newTime = document.getElementById('edit-event-time').value;
  const newTitle = document.getElementById('edit-event-title').value;
  const newDesc = document.getElementById('edit-event-desc').value;

  if (!newTime || !newTitle) {
    showAlertModal("Por favor completa el título y la hora.");
    return;
  }

  try {
    const docRef = doc(db, "events", docId);
    await updateDoc(docRef, {
      time: newTime,
      title: newTitle,
      desc: newDesc
    });
    editModal.classList.add('hidden');
  } catch (error) {
    console.error("Error al actualizar: ", error);
    showAlertModal("No se pudo guardar la edición. Verifica las reglas en la consola de Firebase.");
  }
});

// 8. CHAT EN TIEMPO REAL
const openChatBtn = document.getElementById('open-chat-btn');
const closeChatBtn = document.getElementById('close-chat-btn');
const chatModal = document.getElementById('chat-modal');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const chatMessages = document.getElementById('chat-messages');

let unsubscribeChat = null;

openChatBtn.addEventListener('click', () => {
  chatModal.classList.remove('hidden');
  listenChatMessages();
});

closeChatBtn.addEventListener('click', () => {
  chatModal.classList.add('hidden');
  if (unsubscribeChat) unsubscribeChat();
});

chatModal.addEventListener('click', (e) => {
  if (e.target === chatModal) {
    chatModal.classList.add('hidden');
    if (unsubscribeChat) unsubscribeChat();
  }
});

function listenChatMessages() {
  const q = query(
    collection(db, "chat_messages"),
    orderBy("createdAt", "asc")
  );

  unsubscribeChat = onSnapshot(q, (snapshot) => {
    chatMessages.innerHTML = "";
    snapshot.forEach((docSnap) => {
      const data = docSnap.data();
      const isMine = currentUser && data.userId === currentUser.uid;
      
      const bubble = document.createElement('div');
      bubble.className = `chat-bubble ${isMine ? 'mine' : 'other'}`;
      
      const dateObj = data.createdAt ? data.createdAt.toDate() : new Date();
      const timeStr = dateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      bubble.innerHTML = `
        <div>${data.text}</div>
        <span class="chat-time">${timeStr}</span>
      `;
      
      chatMessages.appendChild(bubble);
    });
    
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

chatForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text || !currentUser) return;

  chatInput.value = "";

  try {
    await addDoc(collection(db, "chat_messages"), {
      userId: currentUser.uid,
      userEmail: currentUser.email,
      text: text,
      createdAt: serverTimestamp()
    });
  } catch (error) {
    console.error("Error enviando mensaje: ", error);
  }
});