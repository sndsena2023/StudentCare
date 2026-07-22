// ไฟล์: app.js

let currentTeacherDocId = null; 
let currentTeacherData = null;  

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => console.log('PWA Ready'));
}

document.addEventListener("DOMContentLoaded", () => {
    const loggedInUser = sessionStorage.getItem('loggedInTeacher');
    if (loggedInUser) {
        showDashboard(JSON.parse(loggedInUser));
    }
});

async function login() {
    const usernameInput = document.getElementById('usernameInput').value.trim();
    const passwordInput = document.getElementById('passwordInput').value.trim();
    const errorMsg = document.getElementById('login-error');
    
    // แปลงให้เป็นตัวพิมพ์ใหญ่ทั้งหมด (T001) ป้องกันปัญหาพิมพ์เล็ก-ใหญ่ผิด
    const cleanUser = usernameInput.toUpperCase(); 

    if (!cleanUser || !passwordInput) {
        errorMsg.innerText = "❌ กรุณากรอกรหัสประจำตัวและรหัสผ่านให้ครบ";
        errorMsg.style.display = "block"; return;
    }

    try {
        errorMsg.style.display = "block"; errorMsg.style.color = "blue";
        errorMsg.innerText = "⏳ กำลังตรวจสอบข้อมูล...";

        const snapshot = await db.collection('Teachers').get();
        let foundDoc = null;

        snapshot.forEach(doc => {
            const teacher = doc.data();
            // ค้นหาคอลัมน์ที่มีคำว่า "รหัส"
            const idKey = Object.keys(teacher).find(k => k.includes("รหัส"));
            const dbId = idKey && teacher[idKey] ? String(teacher[idKey]).trim().toUpperCase() : "";

            // ตรวจสอบว่าตรงกับที่พิมพ์มาหรือไม่
            if (dbId === cleanUser) {
                foundDoc = { id: doc.id, data: teacher };
            }
        });

        if (foundDoc) {
            const teacher = foundDoc.data;
            const dbPassword = teacher.password || "0000"; 

            if (passwordInput === dbPassword) {
                const classKey = Object.keys(teacher).find(k => k.includes("ชั้น") || k.includes("ห้อง") || k.includes("ประจำชั้น"));
                const nameKey = Object.keys(teacher).find(k => k.includes("ชื่อ"));
                
                currentTeacherData = {
                    name: teacher[nameKey] || "ไม่ระบุชื่อ",
                    className: teacher[classKey] || ""
                };
                currentTeacherDocId = foundDoc.id; 

                if (!currentTeacherData.className) {
                    errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ ไม่พบข้อมูลชั้นเรียน โปรดติดต่อแอดมิน"; return;
                }

                if (passwordInput === "0000") {
                    document.getElementById('login-section').style.display = 'none';
                    document.getElementById('change-pwd-section').style.display = 'block';
                } else {
                    proceedToDashboard();
                }

            } else {
                errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ รหัสผ่านไม่ถูกต้อง";
            }
        } else {
            errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ ไม่พบรหัสประจำตัวนี้ในระบบ";
        }
    } catch (error) {
        errorMsg.style.color = "#E53935"; errorMsg.innerText = "❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
        console.error(error);
    }
}

async function saveNewPassword() {
    const newPwd = document.getElementById('newPassword').value;
    const confirmPwd = document.getElementById('confirmPassword').value;
    const pwdError = document.getElementById('pwd-error');

    if (newPwd.length < 4) { pwdError.innerText = "❌ รหัสผ่านต้องมีอย่างน้อย 4 ตัวอักษร"; pwdError.style.display = "block"; return; }
    if (newPwd !== confirmPwd) { pwdError.innerText = "❌ รหัสผ่านทั้ง 2 ช่องไม่ตรงกัน"; pwdError.style.display = "block"; return; }

    try {
        pwdError.style.color = "blue"; pwdError.innerText = "⏳ กำลังบันทึกรหัสผ่านใหม่..."; pwdError.style.display = "block";

        await db.collection('Teachers').doc(currentTeacherDocId).update({ password: newPwd });
        proceedToDashboard();
        
    } catch (error) {
        pwdError.style.color = "#E53935"; pwdError.innerText = "❌ เกิดข้อผิดพลาดในการเชื่อมต่อฐานข้อมูล";
        console.error(error);
    }
}

function proceedToDashboard() {
    sessionStorage.setItem('loggedInTeacher', JSON.stringify(currentTeacherData));
    sessionStorage.setItem('currentClass', currentTeacherData.className);
    document.getElementById('change-pwd-section').style.display = 'none';
    document.getElementById('login-section').style.display = 'none';
    showDashboard(currentTeacherData);
}

function showDashboard(teacher) {
    document.getElementById('dashboard-section').style.display = 'block';
    const hour = new Date().getHours();
    let greetingText = "✨ สวัสดี";
    if (hour >= 5 && hour < 12) greetingText = "🌅 สวัสดีตอนเช้าครับ";
    else if (hour >= 12 && hour < 17) greetingText = "☀️ สวัสดีตอนบ่ายครับ";
    else if (hour >= 17 && hour < 22) greetingText = "🌙 สวัสดีตอนเย็นครับ";
    else greetingText = "🦉 ดึกแล้ว อย่าลืมพักผ่อนนะครับ";
    
    document.getElementById("greeting").innerText = greetingText;
    document.getElementById('displayTeacherName').innerText = teacher.name;
    document.getElementById('displayTeacherClass').innerText = teacher.className;
}

function goTo(page) {
    if (page === 'milk') window.location.href = "milk.html";
    if (page === 'health') window.location.href = "health.html";
}

function logout() {
    sessionStorage.removeItem('loggedInTeacher');
    sessionStorage.removeItem('currentClass');
    window.location.reload(); 
}