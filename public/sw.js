// Plans App — Service Worker
const CACHE_NAME = "plans-v1";
const PRECACHE_URLS = [
    "/",
    "/manifest.json",
];

// Install — cache app shell
self.addEventListener("install", (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME).then((cache) => {
            return cache.addAll(PRECACHE_URLS);
        })
    );
    self.skipWaiting();
});

// Activate — clean old caches
self.addEventListener("activate", (event) => {
    event.waitUntil(
        caches.keys().then((keys) => {
            return Promise.all(
                keys
                    .filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            );
        })
    );
    self.clients.claim();
});

// Fetch — network first, fallback to cache
self.addEventListener("fetch", (event) => {
    // Skip non-GET requests and API calls
    if (event.request.method !== "GET") return;
    if (event.request.url.includes("/api/")) return;

    event.respondWith(
        fetch(event.request)
            .then((response) => {
                // Cache successful responses
                if (response.status === 200) {
                    const responseClone = response.clone();
                    caches.open(CACHE_NAME).then((cache) => {
                        cache.put(event.request, responseClone);
                    });
                }
                return response;
            })
            .catch(() => {
                return caches.match(event.request);
            })
    );
});

// Push Notification Handler
self.addEventListener("push", (event) => {
    const defaultData = {
        title: "Plans",
        body: "You have a new update",
        icon: "/android-chrome-192x192.png",
        badge: "/android-chrome-192x192.png",
        url: "/",
    };

    let data = defaultData;
    try {
        if (event.data) {
            data = { ...defaultData, ...event.data.json() };
        }
    } catch (e) {
        // Use defaults
    }

    event.waitUntil(
        self.registration.showNotification(data.title, {
            body: data.body,
            icon: data.icon,
            badge: data.badge,
            data: { url: data.url },
            vibrate: [100, 50, 100],
            actions: [
                { action: "open", title: "Open" },
                { action: "dismiss", title: "Dismiss" },
            ],
        })
    );
});

// Notification click handler
self.addEventListener("notificationclick", (event) => {
    event.notification.close();

    if (event.action === "dismiss") return;

    const url = event.notification.data?.url || "/";
    event.waitUntil(
        self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
            // Focus existing window if available
            for (const client of clients) {
                if (client.url.includes(self.registration.scope) && "focus" in client) {
                    client.navigate(url);
                    return client.focus();
                }
            }
            // Open new window
            return self.clients.openWindow(url);
        })
    );
});
