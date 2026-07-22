// กำหนดค่า Firebase ของคุณ
const firebaseConfig = {
    apiKey: "AIzaSyAkFXyHA4AyvZTZQd0CquCl-zRdUpUo66I",
    authDomain: "student-care-app-ccf58.firebaseapp.com",
    projectId: "student-care-app-ccf58",
    storageBucket: "student-care-app-ccf58.firebasestorage.app",
    messagingSenderId: "104140224696",
    appId: "1:104140224696:web:f31be03111fbc889c5dc4d"
};

// เริ่มต้นระบบ Firebase ทันทีที่โหลดไฟล์นี้
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}

// สร้างตัวแปร db ไว้เรียกใช้ในไฟล์อื่นๆ
const db = firebase.firestore();
console.log("🔥 เชื่อมต่อฐานข้อมูล Firebase สำเร็จ!");