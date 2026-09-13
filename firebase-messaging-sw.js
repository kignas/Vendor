/* Eatswada Vendor — Firebase Cloud Messaging background handler.
   Receives order pushes when the app tab is closed or the screen is locked,
   and renders the notification itself (the server sends data-only messages,
   so there are never duplicate alerts). Registered under the ./fcm/ scope so
   it never collides with the PWA cache worker (sw.js) at the root scope. */

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

messaging.onBackgroundMessage(function (payload) {
  const d = payload.data || {};
  const title = d.title || 'New order';
  self.registration.showNotification(title, {
    body: d.body || '',
    icon: './icon-192.png',
    badge: './icon-192.png',
    tag: d.orderId ? 'order-' + d.orderId : 'order',
    renotify: true,             // re-alert on each repeat push (ring-until-accept)
    requireInteraction: true,   // stays on screen until tapped
    vibrate: [400, 200, 400, 200, 400],
    data: d
  });
});

self.addEventListener('notificationclick', function (event) {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then(function (list) {
      for (const c of list) {
        if ('focus' in c) return c.focus();
      }
      if (clients.openWindow) return clients.openWindow('./');
    })
  );
});
