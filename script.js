import { initializeApp } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, where, onSnapshot, doc, updateDoc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.19.0/firebase-firestore.js";

// Tu configuración de Firebase
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

// Función helper para mostrar el modal de alerta con un mensaje personalizado
function showAlertModal(message) {
  alertModalMsg.textContent = message;
  alertModal.classList.remove('hidden');
}

// Ocultar modal de alerta
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

  // Validación con el nuevo modal flotante
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

    // Eventos para botones
    document.querySelectorAll('.delete-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const targetBtn = e.target.closest('.delete-btn');
        const docId = targetBtn.dataset.id;
        deleteEvent(docId);
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

// Variable global para almacenar el ID del elemento a eliminar
let pendingDeleteDocId = null;

// Referencias a los elementos del modal de eliminación
const deleteModal = document.getElementById('delete-modal');
const cancelDeleteBtn = document.getElementById('cancel-delete-btn');
const confirmDeleteBtn = document.getElementById('confirm-delete-btn');

// Función que se ejecuta al presionar el botón del tacho de basura en la tarjeta
function deleteEvent(docId) {
  pendingDeleteDocId = docId;
  deleteModal.classList.remove('hidden'); // Muestra el modal
}

// Ocultar modal al presionar "Cancelar"
cancelDeleteBtn.addEventListener('click', () => {
  closeDeleteModal();
});

// Ocultar modal si hacen clic fuera del cuadro blanco
deleteModal.addEventListener('click', (e) => {
  if (e.target === deleteModal) {
    closeDeleteModal();
  }
});

// Confirmar la eliminación en Firebase
confirmDeleteBtn.addEventListener('click', async () => {
  if (pendingDeleteDocId) {
    try {
      // 1. Guardamos el ID a eliminar
      const idToDelete = pendingDeleteDocId;
      
      // 2. Cerramos e inicializamos inmediatamente el modal
      closeDeleteModal();

      // 3. Eliminamos el documento de Firestore
      await deleteDoc(doc(db, "events", idToDelete));
    } catch (error) {
      console.error("Error al eliminar: ", error);
      alert("No se pudo eliminar el evento. Revisa las reglas de seguridad de Firebase.");
    }
  }
});

// Función auxiliar para cerrar y limpiar la variable
function closeDeleteModal() {
  pendingDeleteDocId = null;
  deleteModal.classList.add('hidden');
}

// 7. EDITAR EVENTO (MODAL)
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
    alert("Por favor completa el título y la hora.");
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
    alert("No se pudo guardar la edición. Verifica las reglas en la consola de Firebase.");
  }
});