// ไฟล์: sw.js
// ไฟล์นี้จำเป็นต้องมีเพื่อให้เบราว์เซอร์อนุญาตให้ติดตั้งแอปพลิเคชัน (PWA) ได้

self.addEventListener('install', (e) => {
    console.log('[Service Worker] ติดตั้งสำเร็จ');
    self.skipWaiting();
});

self.addEventListener('activate', (e) => {
    console.log('[Service Worker] พร้อมใช้งาน');
});

self.addEventListener('fetch', (e) => {
    // ปล่อยผ่านการโหลดข้อมูลจากอินเทอร์เน็ตตามปกติ
    // จำเป็นต้องมี Event นี้ เบราว์เซอร์ถึงจะยอมขึ้นปุ่ม "Install App" ให้
});
