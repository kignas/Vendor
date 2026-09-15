importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyA0bqVE3RCmiJORcufx-v6Gew16GMCfFp0",
  authDomain: "eatswada.firebaseapp.com",
  projectId: "eatswada",
  storageBucket: "eatswada.firebasestorage.app",
  messagingSenderId: "644274579271",
  appId: "1:644274579271:web:ba72c4cd4f81c568fa0e62"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage(function(payload) {
  const d = payload.data || {};
  if (d.type !== 'new_order') return;

  self.registration.showNotification(d.title || 'New order!', {
    body: d.body || 'A new order is waiting for acceptance.',
    tag: d.orderId ? 'eatswada-vendor-order-' + d.orderId : 'eatswada-vendor-order',
    renotify: true,
    requireInteraction: true,
    vibrate: [400, 200, 400, 200, 400],
    data: d
  });
});

self.addEventListener('notificationclick', function(event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({type:'window', includeUncontrolled:true}).then(function(list) {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});

const CACHE = 'eatswada-vendor-shell-v1';
const SHELL = ['./', './index.html', './login.html', './manifest.json'];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.method !== 'GET') return;
  event.respondWith(fetch(event.request).catch(() => caches.match(event.request).then(r => r || caches.match('./index.html'))));
});
