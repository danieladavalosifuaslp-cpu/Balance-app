/* =========================================
   0. INICIALIZACIÓN Y MEMORIA (AUTO-LOGIN)
========================================= */
window.onload = function() {
    const isLoggedIn = localStorage.getItem('balance_is_logged_in');
    const savedName = localStorage.getItem('balance_user_name');
    
    renderTaskLibrary();
    renderAgendaDays();

    // ✨ CARGAMOS LA FOTO DE LA AGENDA GUARDADA AQUÍ
    const savedAgenda = localStorage.getItem('balance_saved_agenda');
    if (savedAgenda) {
        document.getElementById('home-screen').innerHTML = savedAgenda;
    }

    if (isLoggedIn === 'true' && savedName) {
        document.getElementById('home-username').innerText = savedName.toUpperCase();
        goToScreen('home-screen');
    } else {
        goToScreen('welcome-screen');
    }
};

/* =========================================
   1. MOTOR DE NAVEGACIÓN
========================================= */
function goToScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    
    document.getElementById(screenId).classList.add('active');
    
    document.querySelectorAll('.nav-icon').forEach(icon => icon.classList.remove('active-icon'));
    const activeIcon = document.querySelector(`.nav-icon[onclick="goToScreen('${screenId}')"]`);
    if (activeIcon) activeIcon.classList.add('active-icon');

    const navBar = document.querySelector('.bottom-nav');
    if (screenId === 'welcome-screen' || screenId === 'login-screen' || screenId === 'register-screen') {
        navBar.style.display = 'none'; 
    } else {
        navBar.style.display = 'flex'; 
    }

    if(screenId === 'cycle-screen') loadCycleDashboard();
    if(screenId === 'tasks-screen') renderTaskLibrary();
    
    if(screenId === 'ai-screen') {
        document.getElementById('ia-profile-data').innerText = localStorage.getItem('balance_diagnosis') || 'Not registered';
        document.getElementById('ia-phase-data').innerText = localStorage.getItem('balance_current_phase') || 'Not set';
        document.getElementById('anova-results').style.display = 'none'; 
    }
}

/* =========================================
   2. SISTEMA DE USUARIAS (PERFIL)
========================================= */
function loginUser() {
    const inputName = document.getElementById('login-name').value.trim();
    if (inputName !== "") {
        localStorage.setItem('balance_is_logged_in', 'true');
        localStorage.setItem('balance_user_name', inputName); 
        document.getElementById('home-username').innerText = inputName.toUpperCase();
        goToScreen('home-screen');
    } else {
        alert("Please enter a username to log in.");
    }
}

function logoutUser() {
    localStorage.setItem('balance_is_logged_in', 'false');
    goToScreen('welcome-screen');
}

function setRegularity(isRegular) {
    document.getElementById('btn-reg-yes').classList.toggle('active', isRegular);
    document.getElementById('btn-reg-no').classList.toggle('active', !isRegular);
    document.getElementById('sop-question').style.display = isRegular ? 'none' : 'block';
}

function saveProfile() {
    const name = document.getElementById('reg-name').value.trim();
    if (name === "") return alert("Please enter your name.");
    
    const isRegular = document.getElementById('btn-reg-yes').classList.contains('active');
    const dxInput = document.getElementById('reg-dx').value;
    const diagnosis = isRegular ? 'Regular Cycle' : (dxInput || 'Irregular Cycle');

    localStorage.setItem('balance_user_name', name);
    localStorage.setItem('balance_is_regular', isRegular);
    localStorage.setItem('balance_diagnosis', diagnosis);
    localStorage.setItem('balance_is_logged_in', 'true');
    
    document.getElementById('home-username').innerText = name.toUpperCase();
    goToScreen('home-screen');
}

/* =========================================
   3. LÓGICA BIOLÓGICA
========================================= */
function saveCycleData() {
    const startDateInput = document.getElementById('period-start-date').value;
    const endDateInput = document.getElementById('period-end-date').value; 
    const manualPhase = document.getElementById('manual-phase-select').value;
    const today = new Date();
    today.setHours(0, 0, 0, 0); 
    let finalPhase = "";

    if (manualPhase !== "") {
        finalPhase = manualPhase;
    } else if (startDateInput) {
        const startDate = new Date(startDateInput);
        startDate.setMinutes(startDate.getMinutes() + startDate.getTimezoneOffset());
        startDate.setHours(0, 0, 0, 0);

        let bleedingDays = 5; 
        if (endDateInput) {
            const endDate = new Date(endDateInput);
            endDate.setMinutes(endDate.getMinutes() + endDate.getTimezoneOffset());
            endDate.setHours(0, 0, 0, 0);
            bleedingDays = Math.floor((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;
            if (bleedingDays < 1) bleedingDays = 5; 
        }

        const diffInMs = today - startDate;
        const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24)) + 1;
        if (diffInDays < 1) return alert("The start date cannot be in the future!");

        let dayOfCycle = diffInDays % 28;
        if (dayOfCycle === 0) dayOfCycle = 28;

        if (dayOfCycle <= bleedingDays) finalPhase = "Menstrual phase";
        else if (dayOfCycle <= 13) finalPhase = "Follicular phase";
        else if (dayOfCycle === 14) finalPhase = "Ovulatory phase";
        else finalPhase = "Luteal phase";
        
    } else {
        return alert("Please select a start date or choose a manual phase.");
    }

    localStorage.setItem('balance_current_phase', finalPhase);
    document.getElementById('current-phase-display').innerText = finalPhase;
    loadCycleDashboard();
    closeModals(); 
}

function loadCycleDashboard() {
    document.getElementById('summary-diagnosis').innerText = localStorage.getItem('balance_diagnosis') || 'Not registered';
    document.getElementById('summary-phase').innerText = localStorage.getItem('balance_current_phase') || 'Not set';
    // ✨ Ahora también carga tu último humor guardado
    document.getElementById('summary-mood').innerText = localStorage.getItem('balance_current_mood') || 'Not registered';
}

function logMood(moodType, btnElement) {
    document.querySelectorAll('.mood-btn').forEach(b => b.classList.remove('active'));
    btnElement.classList.add('active');
    
    const moodStr = moodType.toUpperCase();
    document.getElementById('summary-mood').innerText = moodStr;
    // ✨ Guardamos el humor en la memoria local para que el motor ANOVA lo pueda leer
    localStorage.setItem('balance_current_mood', moodStr); 
}

/* =========================================
   4. B-IA ENGINE (MOTOR PREDICTIVO ANOVA)
   Fusión Definitiva: Nutrición Cognitiva (Macros + Menú Propuesto)
========================================= */

let currentAISuggestion = []; 

// --- FUNCIÓN AUXILIAR: Calcula tu Baseline real (VERSIÓN PRODUCCIÓN) ---
function getPersonalBaseline(history) {
    let baseline = { deep: 5, admin: 2, social: 1 }; // Default si eres nueva
    if (history.length < 5) return baseline; // Candado: Necesita 5 datos para promediar

    const normalDays = history.filter(log => log.energyLeft >= 2);
    if (normalDays.length > 0) {
        let totalDeep = 0, totalAdmin = 0, totalSocial = 0;
        normalDays.forEach(log => {
            const hrs = log.durationSeconds / 3600; // Matemáticas reales
            const name = log.taskName.toLowerCase();
            if (name.includes("deep") || name.includes("study") || name.includes("paper") || name.includes("mechanics")) totalDeep += hrs;
            else if (name.includes("admin") || name.includes("routine") || name.includes("meeting")) totalAdmin += hrs;
            else totalSocial += hrs;
        });
        const count = normalDays.length;
        baseline.deep = (totalDeep / count).toFixed(1);
        baseline.admin = (totalAdmin / count).toFixed(1);
        baseline.social = (totalSocial / count).toFixed(1);
    }
    return baseline;
}

function runANOVAPrediction() {
    const phase = localStorage.getItem('balance_current_phase');
    const diagnosis = localStorage.getItem('balance_diagnosis');
    const mood = localStorage.getItem('balance_current_mood') || 'UNKNOWN';
    const historyDB = JSON.parse(localStorage.getItem('balance_history_db')) || [];
    
    const energyEl = document.getElementById('ia-energy-prediction');
    const focusEl = document.getElementById('ia-focus-prediction');
    
    if (!phase || phase === 'Not set') {
        alert("Missing biological data: Please log your cycle first.");
        return;
    }

    let energyText = "";
    let focusList = "";
    const diagLower = diagnosis ? diagnosis.toLowerCase() : "";

    // --- PARTE A: EL ANÁLISIS HISTÓRICO ---
    const tasksInCurrentPhase = historyDB.filter(log => log.phase === phase);
    const drainingTasks = tasksInCurrentPhase.filter(log => log.energyLeft === 1); 
    
    let historicalWarning = "";
    if (drainingTasks.length > 0) {
        const hardestTask = drainingTasks[drainingTasks.length - 1]; 
        const suggestedMinutes = Math.max(15, Math.floor(hardestTask.durationSeconds / 60) - 10); 
        historicalWarning = `
            <div style="background: rgba(192, 57, 43, 0.1); border-left: 3px solid #c0392b; padding: 10px; margin-top: 15px; font-size: 0.85rem;">
                <b>📊 ANOVA Insight:</b> Historical data shows that <i>"${hardestTask.taskName}"</i> severely drains your energy during the ${phase}. 
                <br><b>Strategy:</b> Maximum suggested limit: <b>${suggestedMinutes} minutes</b> today.
            </div>`;
    }

    const todayLogs = historyDB.filter(log => log.date === new Date().toLocaleDateString());
    let latestEnergyToday = null;
    if (todayLogs.length > 0) {
        latestEnergyToday = todayLogs[todayLogs.length - 1].energyLeft;
    }

    // --- PARTE B: SOP DYNAMIC OVERRIDE ---
    let isSopOverride = false;
    let menuType = "STANDARD"; // Puede ser HIGH_ENERGY, LOW_ENERGY o STANDARD

    if (diagLower.includes("sop") || diagLower.includes("pcos")) {
        if ((phase === "Menstrual phase" || phase === "Luteal phase") && mood === "HAPPY" && latestEnergyToday === 3) {
            isSopOverride = true;
            menuType = "HIGH_ENERGY";
            energyText = "<span style='color: #27ae60;'><b>🚀 HIGH ENERGY OVERRIDE [SOP Profile]:</b></span> Your calendar suggests rest, but your real-time metrics (Happy + High Energy) indicate a favorable hormonal peak.";
            focusList = `<li><b>Deep Work (🧠):</b> Capitalize on this spontaneous mental clarity. Advance your thesis or code.</li><li><b>Sports (🏃🏽‍♀️):</b> Green light for a hypertrophy workout.</li>`;
        }
        else if ((phase === "Follicular phase" || phase === "Ovulatory phase") && (mood === "SAD" || mood === "ANGRY" || latestEnergyToday === 1)) {
            isSopOverride = true;
            menuType = "LOW_ENERGY";
            energyText = "<span style='color: #c0392b;'><b>🛡️ PRESERVATION OVERRIDE [SOP Profile]:</b></span> Although in an active phase, your metrics indicate metabolic fatigue or stress.";
            focusList = `<li><b>Rest (☕):</b> Drop heavy work. Your nervous system needs to regulate cortisol and insulin NOW.</li><li><b>Admin (⚙️):</b> Only allow passive, mechanical tasks today.</li>`;
        }
    }

    // --- PARTE C: LÓGICA BIOLÓGICA TRADICIONAL ---
    if (!isSopOverride) {
        if (phase === "Menstrual phase") {
            menuType = "LOW_ENERGY";
            energyText = "Low to Moderate. Your body is clearing the endometrial lining. Expect lower cognitive stamina.";
            focusList = `<li><b>Admin / Routine (⚙️):</b> Focus on light tasks.</li><li><b>Rest (☕):</b> Increase sleep time.</li>`;
        } 
        else if (phase === "Follicular phase" || phase === "Ovulatory phase") {
            menuType = "HIGH_ENERGY";
            energyText = "Peak/High Energy. Your hormones are supporting maximum neuroplasticity.";
            focusList = `<li><b>Creative/Social (🎨/☕):</b> Perfect window for brainstorming or meetings.</li><li><b>Deep Work (🧠):</b> Tackle complex physics problems.</li>`;
        } 
        else if (phase === "Luteal phase") {
            menuType = "STANDARD";
            energyText = "Moderate to Low. Progesterone is bringing a calming effect. Energy drops near the end.";
            focusList = `<li><b>Deep Work (🧠):</b> Detail-oriented work (debugging, editing).</li><li><b>Admin (⚙️):</b> Tie up loose ends.</li>`;
        }
    }

    // --- ✨ PARTE D: MODELO DEL NUTRIÓLOGO (MACROS + MENÚ) ---
    const myBaseline = getPersonalBaseline(historyDB);
    let deepHrs = parseFloat(myBaseline.deep);
    let adminHrs = parseFloat(myBaseline.admin);
    let socialHrs = parseFloat(myBaseline.social);

    // Ajustamos los "Macros" matemáticamente
    if (menuType === "HIGH_ENERGY") {
        deepHrs += (adminHrs * 0.2); 
        adminHrs -= (adminHrs * 0.2);
    } else if (menuType === "LOW_ENERGY") {
        let reduction = isSopOverride ? (deepHrs * 0.5) : (deepHrs * 0.3);
        deepHrs -= reduction;
        adminHrs += reduction;
    }

    // Diseñamos el "Menú Propuesto" intercalando las horas
    if (menuType === "HIGH_ENERGY") {
        currentAISuggestion = [
            { time: "08:00", name: "Heavy Deep Work (Block 1)", icon: "🧠" },
            { time: "10:30", name: "Active Rest / Stretch", icon: "☕" },
            { time: "11:00", name: "Heavy Deep Work (Block 2)", icon: "🧠" },
            { time: "13:00", name: "Lunch / Social", icon: "☕" },
            { time: "14:00", name: "Complex Admin / Meetings", icon: "⚙️" },
            { time: "15:30", name: "Sports / High Intensity", icon: "🏃🏽‍♀️" }
        ];
    } else if (menuType === "LOW_ENERGY") {
        currentAISuggestion = [
            { time: "09:00", name: "Light Admin / Emails", icon: "⚙️" },
            { time: "10:30", name: "Walk / Regulate Cortisol", icon: "🏃🏽‍♀️" },
            { time: "11:00", name: "Short Deep Work Sprint", icon: "🧠" },
            { time: "12:30", name: "Lunch / Recovery", icon: "☕" },
            { time: "13:30", name: "Routine Admin Tasks", icon: "⚙️" },
            { time: "15:00", name: "Disconnect / Rest", icon: "☕" }
        ];
    } else {
        currentAISuggestion = [
            { time: "08:30", name: "Admin Setup", icon: "⚙️" },
            { time: "09:30", name: "Deep Work Sprint", icon: "🧠" },
            { time: "12:00", name: "Lunch Break", icon: "☕" },
            { time: "13:30", name: "Detail-Oriented Deep Work", icon: "🧠" },
            { time: "15:30", name: "Wrap-up Admin", icon: "⚙️" }
        ];
    }

    // Renderizamos el recuadro visual en la app
    const suggestedScheduleHTML = `
        <div style="background: rgba(74,74,74,0.03); border: 1px dashed rgba(74,74,74,0.3); border-radius: 12px; padding: 15px; margin-top: 25px; text-align: left;">
            <p style="font-size: 0.75rem; font-weight: bold; opacity: 0.5; margin: 0 0 5px 0; letter-spacing: 1px;">🤖 DAILY MACROS</p>
            <p style="font-size: 0.75rem; color: var(--color-grafito); margin-bottom: 15px;">
                <b>Deep Work:</b> ${deepHrs.toFixed(1)}h | <b>Admin:</b> ${adminHrs.toFixed(1)}h | <b>Rest:</b> ${socialHrs.toFixed(1)}h
            </p>
            
            <p style="font-size: 0.75rem; font-weight: bold; opacity: 0.5; margin: 0 0 10px 0; letter-spacing: 1px;">📅 SUGGESTED MENU</p>
            <ul style="list-style:none; padding:0; margin:0; font-size: 0.85rem; opacity: 0.8;">
                ${currentAISuggestion.map(item => `
                    <li style="margin-bottom: 8px;"><b>${item.time}</b> - ${item.name} ${item.icon}</li>
                `).join('')}
            </ul>
        </div>
    `;

    // Imprimir resultados
    energyEl.innerHTML = energyText + historicalWarning;
    focusEl.innerHTML = focusList + suggestedScheduleHTML; 
    document.getElementById('anova-results').style.display = 'block';
}
/* =========================================
   5. AGENDA DINÁMICA (CONFIGURACIÓN DE DÍAS)
========================================= */
const weekOrder = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];

// Función: Lee la memoria y dibuja la agenda con los días elegidos
function renderAgendaDays() {
    const agendaList = document.getElementById('agenda-list');
    agendaList.innerHTML = ''; // Limpia la agenda anterior

    // Obtenemos los días elegidos (Por defecto de Lunes a Viernes)
    const activeDays = JSON.parse(localStorage.getItem('balance_active_days')) || ['MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY'];

    // Marcamos los checkboxes del modal para que coincidan con la memoria
    document.querySelectorAll('.day-cb').forEach(cb => {
        cb.checked = activeDays.includes(cb.value);
    });

    // Dibujamos los bloques HTML cronológicamente
    weekOrder.forEach(day => {
        if (activeDays.includes(day)) {
            const li = document.createElement('li');
            li.className = 'task-item';
            li.innerHTML = `
                <div class="task-day" onclick="toggleDay(this)">${day}</div>
                <div class="daily-tasks-container">
                    <button class="add-task-btn" onclick="openTaskSelector(this)">+ Add Activity</button>
                </div>
            `;
            agendaList.appendChild(li);
        }
    });
}

// Función: Cuando le das al botón "SAVE DAYS" en el Modal de configuración
function saveActiveDays() {
    const checkboxes = document.querySelectorAll('.day-cb:checked');
    const selectedDays = Array.from(checkboxes).map(cb => cb.value);
    
    if (selectedDays.length === 0) return alert("Please select at least one work day.");

    // Guarda en la memoria los nuevos días
    localStorage.setItem('balance_active_days', JSON.stringify(selectedDays));
    
    // Redibuja la agenda
    renderAgendaDays();
    closeModals();
}

/* =========================================
   6. GESTOR DE TAREAS Y MODALS UI
========================================= */
function closeModals() {
    document.querySelectorAll('.modal-overlay').forEach(modal => modal.classList.remove('active'));
}

function toggleDay(element) {
    const tasksContainer = element.nextElementSibling; 
    element.classList.toggle('active'); 
    tasksContainer.classList.toggle('expanded'); 
}

let taskDatabase = JSON.parse(localStorage.getItem('balance_task_db')) || []; // Corchetes vacíos = banco limpio

let tempSelectedIcon = '🧠';
let tempSelectedCat = 'Deep Work';
let targetDayContainer = null; 

function renderTaskLibrary() {
    const dbList = document.getElementById('database-list'); 
    const selectorList = document.getElementById('selector-list'); 
    dbList.innerHTML = '';
    selectorList.innerHTML = '';

    taskDatabase.forEach((task, index) => {
        const dbItem = document.createElement('div');
        dbItem.className = 'library-item';
        dbItem.innerHTML = `
            <div class="library-icon">${task.icon}</div>
            <div class="library-details"><span class="library-name">${task.name}</span><span class="library-cat" style="font-size:0.7rem; opacity:0.5;">${task.category}</span></div>
            <button class="delete-task-btn" style="margin-left: auto; font-size: 1.2rem; opacity:1;" onclick="deleteTaskFromDB(${index})">✖</button>
        `;
        dbList.appendChild(dbItem);

        const selItem = document.createElement('div');
        selItem.className = 'library-item';
        selItem.onclick = () => addTaskToDay(task.icon, task.name);
        selItem.innerHTML = `<div class="library-icon">${task.icon}</div><div class="library-details"><span class="library-name">${task.name}</span><span class="library-cat" style="font-size:0.7rem; opacity:0.5;">${task.category}</span></div>`;
        selectorList.appendChild(selItem);
    });
}

function selectNewTaskCategory(btn, icon, name) {
    document.querySelectorAll('.cat-select-btn').forEach(b => b.style.opacity = "0.5"); 
    btn.style.opacity = "1"; 
    tempSelectedIcon = icon; 
    tempSelectedCat = name;  
}

function saveNewTask() {
    const taskNameInput = document.getElementById('new-db-task-name');
    const taskName = taskNameInput.value.trim();
    if (taskName === "") return alert("Please enter a task name.");
    taskDatabase.push({ icon: tempSelectedIcon, name: taskName, category: tempSelectedCat });
    localStorage.setItem('balance_task_db', JSON.stringify(taskDatabase));
    taskNameInput.value = ""; 
    renderTaskLibrary(); 
    closeModals(); 
}

function deleteTaskFromDB(index) {
    taskDatabase.splice(index, 1); 
    localStorage.setItem('balance_task_db', JSON.stringify(taskDatabase)); 
    renderTaskLibrary(); 
}

function openTaskSelector(btn) {
    targetDayContainer = btn.parentElement; 
    renderTaskLibrary(); 
    document.getElementById('selector-modal').classList.add('active'); 
}

function addTaskToDay(icon, name) {
    if (!targetDayContainer) return; 
    const newTaskHTML = `
        <div class="sub-task-item">
            <div class="task-details"><span class="task-icon">${icon}</span><span class="task-time" contenteditable="true">00:00</span><span class="task-name" contenteditable="true">${name}</span></div>
            <div class="timer-container-right"><span class="timer-display">00:00:00</span><button class="timer-play-btn" onclick="toggleTimer(this)">▶</button><button class="delete-task-btn" onclick="deleteTask(this)">✖</button></div>
        </div>
    `;
    const addBtn = targetDayContainer.querySelector('.add-task-btn');
    addBtn.insertAdjacentHTML('beforebegin', newTaskHTML);
    closeModals(); 
    
    saveAgendaState(); // ✨ Toma foto al agregar tarea
}

function deleteTask(btn) {
    btn.parentElement.parentElement.remove();
    saveAgendaState(); // <--- AGREGA ESTO AQUÍ
}

/* =========================================
   7. MOTOR DE CRONÓMETRO Y RECOLECCIÓN DE DATOS (EL SENSOR)
   Este bloque mide el tiempo real y activa la captura de energía.
   Es el puente entre la actividad física/mental y el historial.
========================================= */

// 7.1 Memoria RAM temporal
let activeTimers = {}; 
let lastStoppedTask = { name: "", duration: 0 }; 

// 7.2 Función: Control del tiempo (Play/Pause) con Reloj Absoluto y Respaldo
function toggleTimer(btn) {
    const timerDisplay = btn.previousElementSibling; 
    
    if (!btn.dataset.timerId) btn.dataset.timerId = 'timer_' + Math.random().toString(36).substr(2, 9);
    const timerId = btn.dataset.timerId;

    // ✨ EL PARCHE: Si Android vació la memoria RAM, recuperamos el tiempo leyendo la pantalla
    if (!activeTimers[timerId]) {
        const parts = timerDisplay.innerText.split(':').map(Number);
        const screenSeconds = (parts[0] * 3600) + (parts[1] * 60) + (parts[2] || 0);
        activeTimers[timerId] = {
            accumulated: screenSeconds * 1000, // Recupera el tiempo en milisegundos
            isRunning: false,
            startTime: Date.now()
        };
    }

    if (btn.innerText === "⏸") {
        // --- ESTADO: PAUSA ---
        btn.innerText = "▶";
        btn.style.backgroundColor = "var(--color-grafito)";
        btn.style.color = "var(--color-lienzo)";
        btn.style.border = "none";
        
        // Detenemos el refresco de forma segura
        if (activeTimers[timerId].interval) clearInterval(activeTimers[timerId].interval);
        activeTimers[timerId].isRunning = false;

        const now = Date.now();
        activeTimers[timerId].accumulated += (now - activeTimers[timerId].startTime);

        const totalSeconds = Math.floor(activeTimers[timerId].accumulated / 1000);
        const taskItem = btn.closest('.sub-task-item');
        lastStoppedTask.name = taskItem.querySelector('.task-name').innerText;
        lastStoppedTask.duration = totalSeconds;
        
        // Lanzamos el modal de energía
        document.getElementById('energy-modal').classList.add('active');
    } else {
        // --- ESTADO: PLAY ---
        btn.innerText = "⏸";
        btn.style.backgroundColor = "var(--color-lienzo)";
        btn.style.color = "var(--color-grafito)";
        btn.style.border = "2px solid var(--color-grafito)";

        activeTimers[timerId].isRunning = true;
        activeTimers[timerId].startTime = Date.now();

        activeTimers[timerId].interval = setInterval(() => {
            const now = Date.now();
            const totalMs = activeTimers[timerId].accumulated + (now - activeTimers[timerId].startTime);
            const totalSecs = Math.floor(totalMs / 1000);
            
            const hrs = Math.floor(totalSecs / 3600);
            const mins = Math.floor((totalSecs % 3600) / 60);
            const secs = totalSecs % 60;
            
            timerDisplay.innerText = 
                String(hrs).padStart(2, '0') + ':' + 
                String(mins).padStart(2, '0') + ':' + 
                String(secs).padStart(2, '0');
        }, 1000);
    }
    
    // ✨ Toma foto de la pantalla para guardar si el botón se quedó en Play o Pause
    saveAgendaState(); 
}

// 7.3 Función: Registro Final en Base de Datos (Log)
// Se activa cuando eliges una carita/pila en el modal de energía
function logEnergy(level) {
    const currentPhase = localStorage.getItem('balance_current_phase') || 'Unknown';
    
    // ✨ EL DATO MAESTRO: Aquí se une todo para el ANOVA
    const newLog = {
        taskName: lastStoppedTask.name,
        durationSeconds: lastStoppedTask.duration,
        energyLeft: level, // 1=Low, 2=Med, 3=High
        phase: currentPhase,
        date: new Date().toLocaleDateString()
    };

    // Leemos el historial viejo de localStorage y le "inyectamos" el nuevo registro
    let historyDB = JSON.parse(localStorage.getItem('balance_history_db')) || [];
    historyDB.push(newLog);
    localStorage.setItem('balance_history_db', JSON.stringify(historyDB));

    // Cerramos el modal para volver a la agenda
    closeModals(); 
}

/* =========================================
   8. APLICAR AGENDA SUGERIDA
========================================= */
function applySuggestedLayout() {
    const days = ['SUNDAY', 'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY'];
    const todayName = days[new Date().getDay()];

    const allDays = document.querySelectorAll('.task-day');
    let targetDay = null;
    allDays.forEach(div => {
        if (div.innerText === todayName) targetDay = div.parentElement;
    });

    if (!targetDay) return alert("Please set up " + todayName + " in your agenda first.");

    const container = targetDay.querySelector('.daily-tasks-container');
    const addBtn = container.querySelector('.add-task-btn');

    currentAISuggestion.forEach(task => {
        const newTaskHTML = `
            <div class="sub-task-item">
                <div class="task-details">
                    <span class="task-icon">${task.icon}</span>
                    <span class="task-time" contenteditable="true">${task.time}</span>
                    <span class="task-name" contenteditable="true">${task.name}</span>
                </div>
                <div class="timer-container-right">
                    <span class="timer-display">00:00:00</span>
                    <button class="timer-play-btn" onclick="toggleTimer(this)">▶</button>
                    <button class="delete-task-btn" onclick="deleteTask(this)">✖</button>
                </div>
            </div>
        `;
        addBtn.insertAdjacentHTML('beforebegin', newTaskHTML);
    });

    alert("Layout applied to " + todayName + "!");
    goToScreen('home-screen');
    
    const dayHeader = targetDay.querySelector('.task-day');
    if (!dayHeader.classList.contains('active')) toggleDay(dayHeader);

    saveAgendaState(); // ✨ Toma foto al inyectar la agenda de la IA
}

/* =========================================
   9. MEMORIA VISUAL DE LA AGENDA
========================================= */
// Toma la "foto" de la pantalla principal y la guarda
function saveAgendaState() {
    const homeHtml = document.getElementById('home-screen').innerHTML;
    localStorage.setItem('balance_saved_agenda', homeHtml);
}
