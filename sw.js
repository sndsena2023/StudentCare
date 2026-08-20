self.addEventListener('install', (e) => {
    console.log('[Service Worker] ติดตั้งสำเร็จ');
    self.skipWaiting();
});
self.addEventListener('activate', (e) => {
    console.log('[Service Worker] พร้อมใช้งาน');
});
self.addEventListener('fetch', (e) => {
    // ปล่อยผ่านเพื่อให้โหลดข้อมูลออนไลน์ได้ปกติ
});