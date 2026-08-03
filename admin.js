window.onload = async () => {
    try {
        const doc = await db.collection('Settings').doc('ActiveConfig').get();
        if(doc.exists) {
            document.getElementById('sysTerm').value = doc.data().term;
            document.getElementById('sysYear').value = doc.data().year;
        }

        // โหลดรายชื่อห้องเพื่อใส่ใน Dropdown ปลดล็อก
        const snapshot = await db.collection('Students').get();
        let classes = new Set();
        snapshot.forEach(d => {
            let data = d.data();
            let classKey = Object.keys(data).find(k => k.includes("ชั้น") || k.includes("ห้อง")) || "ชั้นเรียน";
            if(data[classKey]) classes.add(data[classKey]);
        });
        const classSelect = document.getElementById('unlockClassSelect');
        classSelect.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
        Array.from(classes).sort().forEach(c => {
            classSelect.innerHTML += `<option value="${c}">${c}</option>`;
        });

        loadUnlockedClasses();
    } catch(e) {}
};

async function saveSystemSettings() {
    const term = document.getElementById('sysTerm').value;
    const year = document.getElementById('sysYear').value;
    const statusEl = document.getElementById('status-sys');
    try {
        await db.collection('Settings').doc('ActiveConfig').set({ term: term, year: year });
        statusEl.style.color = "green"; statusEl.innerText = "✅ บันทึกการตั้งค่าระบบเรียบร้อย";
    } catch(e) { statusEl.style.color = "red"; statusEl.innerText = "❌ ผิดพลาด: " + e.message; }
}

// ฟังก์ชันควบคุมการปลดล็อก
async function loadUnlockedClasses() {
    const doc = await db.collection('Settings').doc('UnlockConfig').get();
    let unlocked = [];
    if(doc.exists && doc.data().classes) unlocked = doc.data().classes;
    document.getElementById('unlockedList').innerText = unlocked.length ? unlocked.join(', ') : "ไม่มี (ล็อกตามปกติทุกห้อง)";
}

async function toggleUnlock(isUnlock) {
    const cls = document.getElementById('unlockClassSelect').value;
    if(!cls) return alert("❌ กรุณาเลือกห้องเรียนก่อน");
    try {
        const docRef = db.collection('Settings').doc('UnlockConfig');
        const docSnap = await docRef.get();
        let unlocked = [];
        if(docSnap.exists && docSnap.data().classes) unlocked = docSnap.data().classes;
        
        if(isUnlock && !unlocked.includes(cls)) unlocked.push(cls);
        if(!isUnlock) unlocked = unlocked.filter(c => c !== cls);
        
        await docRef.set({ classes: unlocked });
        loadUnlockedClasses();
        alert(isUnlock ? `✅ ปลดล็อกห้อง ${cls} ให้แก้ข้อมูลย้อนหลังได้แล้ว!` : `🔒 ล็อกห้อง ${cls} กลับเป็นปกติแล้ว!`);
    } catch(e) { alert("❌ ผิดพลาด: " + e.message); }
}

function parseExcelPastedData(rawData) {
    const rows = rawData.trim().split(/\r?\n/);
    if (rows.length < 2) throw new Error("ต้องมีอย่างน้อย 1 บรรทัดหัวคอลัมน์ และ 1 บรรทัดข้อมูล");
    const headers = rows[0].split('\t').map(header => header.trim());
    const dataList = [];
    for (let i = 1; i < rows.length; i++) {
        if (rows[i].trim() === "") continue;
        const columns = rows[i].split('\t');
        let obj = {};
        for (let j = 0; j < headers.length; j++) { obj[headers[j]] = columns[j] ? columns[j].trim() : ""; }
        dataList.push(obj);
    }
    return dataList;
}

async function importData(type) {
    const textAreaId = type === 'teacher' ? 'teacherData' : 'studentData';
    const statusId = type === 'teacher' ? 'status-teacher' : 'status-student';
    const collectionName = type === 'teacher' ? 'Teachers' : 'Students';
    const rawText = document.getElementById(textAreaId).value;
    const statusEl = document.getElementById(statusId);
    
    const term = document.getElementById('sysTerm').value.trim();
    const year = document.getElementById('sysYear').value.trim();

    if (!term || !year) { alert("❌ กรุณากดบันทึกตั้งค่าระบบก่อนนำเข้าข้อมูล"); return; }
    if (!rawText.trim()) { statusEl.style.color = "red"; statusEl.innerText = "❌ กรุณาวางข้อมูลก่อนกดบันทึก"; return; }

    try {
        statusEl.style.color = "blue"; statusEl.innerText = "⏳ กำลังอัปโหลดขึ้นฐานข้อมูล...";
        const parsedData = parseExcelPastedData(rawText);
        const batch = db.batch();
        parsedData.forEach((data) => {
            data.term = term; data.academicYear = year;
            if (type === 'teacher') data.password = "0000"; 
            const docRef = db.collection(collectionName).doc(); 
            batch.set(docRef, data);
        });
        await batch.commit();
        statusEl.style.color = "green"; statusEl.innerText = `✅ สำเร็จ! นำเข้าข้อมูล ${parsedData.length} รายการ (เทอม ${term}/${year})`;
        document.getElementById(textAreaId).value = "";
    } catch (error) { statusEl.style.color = "red"; statusEl.innerText = `❌ ข้อผิดพลาด: ${error.message}`; }
}

async function saveHoliday() {
    const dateVal = document.getElementById('holidayDate').value;
    const nameVal = document.getElementById('holidayName').value.trim();
    const statusEl = document.getElementById('status-holiday');
    
    if (!dateVal || !nameVal) { statusEl.style.color = "red"; statusEl.innerText = "❌ กรุณาเลือกวันที่และตั้งชื่อวันหยุด"; return; }
    try {
        statusEl.style.color = "blue"; statusEl.innerText = "⏳ กำลังบันทึกวันหยุด...";
        await db.collection('Holidays').doc(dateVal).set({ date: dateVal, name: nameVal });
        statusEl.style.color = "green"; statusEl.innerText = `✅ บันทึกวันหยุดเรียบร้อย!`;
        document.getElementById('holidayName').value = "";
    } catch (error) { statusEl.style.color = "red"; statusEl.innerText = `❌ ข้อผิดพลาด: ${error.message}`; }
}
