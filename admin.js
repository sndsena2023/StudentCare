// ไฟล์: admin.js

window.onload = async () => {
    try {
        const doc = await db.collection('Settings').doc('ActiveConfig').get();
        if(doc.exists) {
            document.getElementById('sysTerm').value = doc.data().term;
            document.getElementById('sysYear').value = doc.data().year;
        }
    } catch(e) {}
};

async function saveSystemSettings() {
    const term = document.getElementById('sysTerm').value;
    const year = document.getElementById('sysYear').value;
    const statusEl = document.getElementById('status-sys');
    
    try {
        await db.collection('Settings').doc('ActiveConfig').set({ term: term, year: year });
        statusEl.style.color = "green"; statusEl.innerText = "✅ บันทึกการตั้งค่าระบบเรียบร้อย";
    } catch(e) {
        statusEl.style.color = "red"; statusEl.innerText = "❌ ผิดพลาด: " + e.message;
    }
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
        for (let j = 0; j < headers.length; j++) {
            obj[headers[j]] = columns[j] ? columns[j].trim() : "";
        }
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

    if (!term || !year) { alert("❌ กรุณากดบันทึกตั้งค่าระบบ (ข้อ 1) ก่อนนำเข้าข้อมูล"); return; }
    if (!rawText.trim()) { statusEl.style.color = "red"; statusEl.innerText = "❌ กรุณาวางข้อมูลก่อนกดบันทึก"; return; }

    try {
        statusEl.style.color = "blue"; statusEl.innerText = "⏳ กำลังอัปโหลดขึ้นฐานข้อมูล Firebase...";
        const parsedData = parseExcelPastedData(rawText);
        const batch = db.batch();
        
        parsedData.forEach((data) => {
            // ประทับตราเทอมและปีการศึกษา
            data.term = term;
            data.academicYear = year;
            if (type === 'teacher') data.password = "0000"; 
            const docRef = db.collection(collectionName).doc(); 
            batch.set(docRef, data);
        });
        
        await batch.commit();
        statusEl.style.color = "green"; statusEl.innerText = `✅ สำเร็จ! นำเข้าข้อมูล ${parsedData.length} รายการ (เทอม ${term}/${year})`;
        document.getElementById(textAreaId).value = "";
    } catch (error) { statusEl.style.color = "red"; statusEl.innerText = `❌ เกิดข้อผิดพลาด: ${error.message}`; }
}

async function saveHoliday() {
    const dateVal = document.getElementById('holidayDate').value;
    const nameVal = document.getElementById('holidayName').value.trim();
    const statusEl = document.getElementById('status-holiday');
    
    if (!dateVal || !nameVal) { statusEl.style.color = "red"; statusEl.innerText = "❌ กรุณาเลือกวันที่และตั้งชื่อวันหยุด"; return; }
    try {
        statusEl.style.color = "blue"; statusEl.innerText = "⏳ กำลังบันทึกวันหยุด...";
        await db.collection('Holidays').doc(dateVal).set({ date: dateVal, name: nameVal });
        statusEl.style.color = "green"; statusEl.innerText = `✅ บันทึกวันหยุด "${nameVal}" เรียบร้อย!`;
        document.getElementById('holidayName').value = "";
    } catch (error) { statusEl.style.color = "red"; statusEl.innerText = `❌ เกิดข้อผิดพลาด: ${error.message}`; }
}
