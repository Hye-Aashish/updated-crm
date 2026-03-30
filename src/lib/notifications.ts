/**
 * Simple browser/system notification utility
 */

export const showSystemNotification = async (title: string, message: string) => {
    // Check if browser supports notifications
    if (!("Notification" in window)) {
        console.warn("This browser does not support desktop notification");
        return;
    }

    // Check permission
    if (Notification.permission === "granted") {
        new Notification(title, { body: message, icon: '/vite.svg' });
    } else if (Notification.permission !== "denied") {
        const permission = await Notification.requestPermission();
        if (permission === "granted") {
            new Notification(title, { body: message, icon: '/vite.svg' });
        }
    }
};
