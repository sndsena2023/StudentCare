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

    if (!rawText.trim()) {
        statusEl.style.color = "red"; statusEl.innerText = "❌ กรุณาวางข้อมูลก่อนกดบันทึก"; return;
    }

    try {
        statusEl.style.color = "blue"; statusEl.innerText = "⏳ กำลังอัปโหลดขึ้นฐานข้อมูล Firebase...";
        const parsedData = parseExcelPastedData(rawText);
        
        if (type === 'student') {
            if (!Object.keys(parsedData[0]).some(k => k.includes("ชั้น") || k.includes("ห้อง"))) {
                throw new Error('ไม่พบคอลัมน์ "ชั้นเรียน" ในข้อมูลนักเรียน');
            }
        } else if (type === 'teacher') {
            if (!Object.keys(parsedData[0]).some(k => k.includes("ชั้น") || k.includes("ห้อง") || k.includes("ประจำชั้น"))) {
                throw new Error('ไม่พบคอลัมน์ "ชั้นเรียน" ของครู');
            }
        }

        const batch = db.batch();
        parsedData.forEach((data) => {
            if (type === 'teacher') {
                data.password = "0000"; // แจกรหัสผ่านเริ่มต้นให้ครูทุกคน
            }
            const docRef = db.collection(collectionName).doc(); 
            batch.set(docRef, data);
        });

        await batch.commit();

        statusEl.style.color = "green";
        statusEl.innerText = `✅ สำเร็จ! บันทึกข้อมูล ${parsedData.length} รายการลง Cloud เรียบร้อย`;
        document.getElementById(textAreaId).value = "";
    } catch (error) {
        statusEl.style.color = "red"; statusEl.innerText = `❌ เกิดข้อผิดพลาด: ${error.message}`;
        console.error(error);
    }
}