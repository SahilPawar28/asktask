importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js");

// These values are replaced at runtime via the service worker registration
// They are injected from the environment when the SW is registered
self.addEventListener("message", (event) => {
  if (event.data?.type === "FIREBASE_CONFIG") {
    firebase.initializeApp(event.data.config);
    const messaging = firebase.messaging();

    messaging.onBackgroundMessage((payload) => {
      const { title, body } = payload.notification || {};
      self.registration.showNotification(title || "AskTask", {
        body: body || "",
        icon: "/favicon.ico",
        badge: "/favicon.ico",
        data: payload.data,
      });
    });
  }
});
