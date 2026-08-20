window.onload = async () => {
    try {
        const doc = await db.collection('Settings').doc('ActiveConfig').get();
        if(doc.exists) {
            document.getElementById('sysTerm').value = doc.data().term;
            document.getElementById('sysYear').value = doc.data().year;
        }

        const snapshot = await db.collection('Students').get();
        let classes = new Set();
        snapshot.forEach(d => {
            let data = d.data();
            let classKey = Object.keys(data).find(k => k.includes("ชั้น") || k.includes("ห้อง")) || "ชั้นเรียน";
            if(data[classKey]) classes.add(data[classKey]);
        });
        const classSelect = document.getElementById('unlockClassSelect');
        classSelect.innerHTML = '<option value="">-- เลือกห้องเรียน --</option>';
        Array.from(classes).sort().forEach(c => { classSelect.innerHTML += `<option value="${c}">${c}</option>`; });
        loadUnlockedClasses();
    } catch(e) {}
};

async function saveSystemSettings() {
    const term = document.getElementById('sysTerm').value;
    const year = document.getElementById('sysYear').value;
    const statusEl = document.getElementById('status-sys');
    try {
        await db.collection('Settings').doc('ActiveConfig').set({ term: term, year: year });
        statusEl.style.color = "var(--secondary)"; statusEl.innerText = "✅ บันทึกตั้งค่าระบบเรียบร้อย";
    } catch(e) { statusEl.style.color = "var(--danger)"; statusEl.innerText = "❌ ผิดพลาด: " + e.message; }
}

async function loadUnlockedClasses() {
    const doc = await db.collection('Settings').doc('UnlockConfig').get();
    let unlocked = [];
    if(doc.exists && doc.data().classes) unlocked = doc.data().classes;
    document.getElementById('unlockedList').innerText = unlocked.length ? unlocked.join(', ') : "ไม่มี (ล็อกตามปกติ)";
}

async function toggleUnlock(isUnlock) {
    const cls = document.getElementById('unlockClassSelect').value;
    if(!cls) return alert("❌ กรุณาเลือกห้องเรียน");
    try {
        const docRef = db.collection('Settings').doc('UnlockConfig');
        const docSnap = await docRef.get();
        let unlocked = [];
        if(docSnap.exists && docSnap.data().classes) unlocked = docSnap.data().classes;
        
        if(isUnlock && !unlocked.includes(cls)) unlocked.push(cls);
        if(!isUnlock) unlocked = unlocked.filter(c => c !== cls);
        
        await docRef.set({ classes: unlocked });
        loadUnlockedClasses();
        alert(isUnlock ? `✅ ปลดล็อกห้อง ${cls} แล้ว!` : `🔒 ล็อกห้อง ${cls} แล้ว!`);
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

    if (!term || !year) { alert("❌ กรุณาบันทึกตั้งค่าระบบก่อน"); return; }
    if (!rawText.trim()) { statusEl.style.color = "var(--danger)"; statusEl.innerText = "❌ กรุณาวางข้อมูลก่อน"; return; }

    try {
        statusEl.style.color = "var(--primary)"; statusEl.innerText = "⏳ กำลังตรวจสอบและนำเข้า...";
        const parsedData = parseExcelPastedData(rawText);
        
        // โหลด ID เดิมมาตรวจสอบ เพื่ออัปเดต (Upsert Logic)
        const existSnap = await db.collection(collectionName).get();
        const existingIds = new Set();
        existSnap.forEach(doc => existingIds.add(doc.id));

        const batch = db.batch();
        let added = 0, updated = 0;

        parsedData.forEach((data) => {
            data.term = term; data.academicYear = year;
            let idKey = Object.keys(data).find(k => k.includes("รหัส"));
            let docId = idKey && data[idKey] ? String(data[idKey]).trim().toUpperCase() : db.collection(collectionName).doc().id;
            let docRef = db.collection(collectionName).doc(docId);
            
            if (existingIds.has(docId)) {
                updated++;
                batch.set(docRef, data, { merge: true }); // เขียนทับส่วนที่เพิ่มมา ไม่ลบของเดิม
            } else {
                added++;
                if (type === 'teacher') data.password = "0000"; 
                batch.set(docRef, data);
            }
        });
        await batch.commit();
        statusEl.style.color = "var(--secondary)"; statusEl.innerText = `✅ สำเร็จ! เพิ่มใหม่ ${added} รายการ, อัปเดตข้อมูลเดิม ${updated} รายการ`;
        document.getElementById(textAreaId).value = "";
    } catch (error) { statusEl.style.color = "var(--danger)"; statusEl.innerText = `❌ ข้อผิดพลาด: ${error.message}`; }
}

async function saveHoliday() {
    const dateVal = document.getElementById('holidayDate').value;
    const nameVal = document.getElementById('holidayName').value.trim();
    const statusEl = document.getElementById('status-holiday');
    if (!dateVal || !nameVal) { statusEl.style.color = "var(--danger)"; statusEl.innerText = "❌ เลือกวันที่และตั้งชื่อ"; return; }
    try {
        statusEl.style.color = "var(--primary)"; statusEl.innerText = "⏳ กำลังบันทึก...";
        await db.collection('Holidays').doc(dateVal).set({ date: dateVal, name: nameVal });
        statusEl.style.color = "var(--secondary)"; statusEl.innerText = `✅ บันทึกวันหยุดเรียบร้อย!`;
        document.getElementById('holidayName').value = "";
    } catch (error) { statusEl.style.color = "var(--danger)"; statusEl.innerText = `❌ ข้อผิดพลาด: ${error.message}`; }
}

// ระบบล้างข้อมูลเก่า
async function clearYearData() {
    const targetYear = prompt("⚠️ โปรดระวัง! ฟังก์ชันนี้จะลบข้อมูลนักเรียน, การดื่มนม และสุขภาพ ของปีการศึกษาที่ระบุทิ้งทั้งหมด (ไม่สามารถกู้คืนได้)\n\nกรุณาพิมพ์ 'ปีการศึกษา' ที่ต้องการล้างข้อมูล (เช่น 2568):");
    if (!targetYear) return;
    
    if (confirm(`ยืนยันการลบข้อมูลทั้งหมดของปีการศึกษา ${targetYear} ใช่หรือไม่?`)) {
        const statusEl = document.getElementById('status-clear');
        statusEl.style.display = "block";
        statusEl.style.color = "var(--primary)"; 
        statusEl.innerText = "⏳ กำลังล้างข้อมูล กรุณารอสักครู่...";
        
        try {
            let totalDeleted = 0;
            const collections = ['Students', 'HealthRecords', 'MilkRecords'];
            
            for (let col of collections) {
                const snapshot = await db.collection(col).where('academicYear', '==', targetYear).get();
                let batches = [];
                let currentBatch = db.batch();
                let count = 0;
                
                snapshot.forEach(doc => {
                    currentBatch.delete(doc.ref);
                    count++;
                    totalDeleted++;
                    if (count === 490) { // Firebase Batch limit is 500
                        batches.push(currentBatch.commit());
                        currentBatch = db.batch();
                        count = 0;
                    }
                });
                if (count > 0) batches.push(currentBatch.commit());
                await Promise.all(batches);
            }
            
            statusEl.className = "alert alert-success";
            statusEl.innerText = `✅ ล้างข้อมูลปี ${targetYear} สำเร็จ (ลบไปทั้งหมด ${totalDeleted} รายการ)`;
        } catch(e) {
            statusEl.className = "alert alert-danger";
            statusEl.innerText = `❌ เกิดข้อผิดพลาด: ${e.message}`;
        }
    }
}