let currentTeacherDocId = null; 
let currentTeacherData = null;  

// เริ่มต้น Service Worker เพื่อให้แอปติดตั้งลงมือถือได้
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js')
      .then(() => console.log('✅ Service Worker ลงทะเบียนสำเร็จ'))
      .catch((err) => console.log('❌ Service Worker ลงทะเบียนล้มเหลว', err));
}

document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = sessionStorage.getItem('loggedInTeacher');
    if (loggedInUser) { showDashboard(JSON.parse(loggedInUser)); } 
    else {
        document.getElementById('login-section').style.display = 'block';
        document.getElementById('change-pwd-section').style.display = 'none';
        document.getElementById('dashboard-section').style.display = 'none';
    }
});

async function login() {
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const passwordInput = document.getElementById('passwordInput').value.trim();
    const errorMsg = document.getElementById('login-error');
    const cleanUser = usernameInput.toUpperCase(); 

    if (!cleanUser || !passwordInput) {
        errorMsg.innerText = "❌ กรุณากรอกรหัสประจำตัวและรหัสผ่านให้ครบ";
        errorMsg.style.display = "block"; return;
    }

    try {
        errorMsg.style.display = "block"; errorMsg.style.color = "blue";
        errorMsg.innerText = "⏳ กำลังตรวจสอบข้อมูล...";

        let activeTerm = "1", activeYear = "2569";
        const configDoc = await db.collection('Settings').doc('ActiveConfig').get();
        if (configDoc.exists) { activeTerm = configDoc.data().term; activeYear = configDoc.data().year; }

        const snapshot = await db.collection('Teachers').get();
        let foundDoc = null;

        snapshot.forEach(doc => {
            const teacher = doc.data();
            const idKey = Object.keys(teacher).find(k => k.includes("รหัส"));
            const dbId = idKey && teacher[idKey] ? String(teacher[idKey]).trim().toUpperCase() : "";
            
            if (dbId === cleanUser) {
                if (!teacher.term || (teacher.term === activeTerm && teacher.academicYear === activeYear)) {
                    foundDoc = { id: doc.id, data: teacher };
                }
            }
        });

        if (foundDoc) {
            const teacher = foundDoc.data;
            const dbPassword = teacher.password || "0000"; 

            if (passwordInput === dbPassword) {
                const classKey = Object.keys(teacher).find(k => k.includes("ชั้น") || k.includes("ห้อง") || k.includes("ประจำชั้น"));
                const nameKey = Object.keys(teacher).find(k => k.includes("ชื่อ"));
                
                currentTeacherData = { name: teacher[nameKey] || "ไม่ระบุชื่อ", className: teacher[classKey] || "" };
                currentTeacherDocId = foundDoc.id; 

                if (!currentTeacherData.className) { errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ ไม่พบข้อมูลชั้นเรียน"; return; }

                sessionStorage.setItem('activeTerm', activeTerm);
                sessionStorage.setItem('activeYear', activeYear);

                if (passwordInput === "0000") {
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('dashboard-section').style.display = 'none';
                    document.getElementById('change-pwd-section').style.display = 'block';
                } else { proceedToDashboard(); }
            } else { errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ รหัสผ่านไม่ถูกต้อง"; }
        } else { errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ ไม่พบรหัสผู้ใช้งาน หรือคุณไม่มีตารางในเทอมนี้"; }
    } catch (error) { errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ เกิดข้อผิดพลาดฐานข้อมูล"; console.error(error); }
}

async function saveNewPassword() {
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    const pwdError = document.getElementById('pwd-error');
    if (newPwd.length < 4) { pwdError.innerText = "❌ รหัสผ่านต้องมี 4 ตัวอักษรขึ้นไป"; pwdError.style.display = "block"; return; }
    if (newPwd !== confirmPwd) { pwdError.innerText = "❌ รหัสผ่านไม่ตรงกัน"; pwdError.style.display = "block"; return; }

    try {
        pwdError.style.color = "blue"; pwdError.innerText = "⏳ กำลังบันทึกรหัสผ่านใหม่..."; pwdError.style.display = "block";
        await db.collection('Teachers').doc(currentTeacherDocId).update({ password: newPwd });
        proceedToDashboard();
    } catch (error) { pwdError.style.color = "#E53935"; pwdError.innerText = "❌ ข้อผิดพลาดฐานข้อมูล"; }
}

function proceedToDashboard() {
    sessionStorage.setItem('loggedInTeacher', JSON.stringify(currentTeacherData));
    sessionStorage.setItem('currentClass', currentTeacherData.className);
    showDashboard(currentTeacherData);
}

function showDashboard(teacher) {
    document.getElementById('login-section').style.display = 'none';
    document.getElementById('change-pwd-section').style.display = 'none';
    document.getElementById('dashboard-section').style.display = 'block';

    const hour = new Date().getHours();
    let greetingText = (hour >= 5 && hour < 12) ? "🌅 สวัสดีตอนเช้าครับ" : (hour >= 12 && hour < 17) ? "☀️ สวัสดีตอนบ่ายครับ" : (hour >= 17 && hour < 22) ? "🌙 สวัสดีตอนเย็นครับ" : "🦉 ดึกแล้ว อย่าลืมพักผ่อนนะครับ";
    
    document.getElementById("greeting").innerText = greetingText;
    document.getElementById('displayTeacherName').innerText = teacher.name;
    document.getElementById('displayTeacherClass').innerText = teacher.className;
}

function goTo(page) {
    if (page === 'milk') window.location.href = "milk.html";
    if (page === 'health') window.location.href = "health.html";
}

function logout() { sessionStorage.clear(); window.location.reload(); }
