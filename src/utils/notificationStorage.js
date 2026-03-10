import * as FileSystem from 'expo-file-system/legacy';

const FILE_PATH = FileSystem.documentDirectory + "notifications.json";

// Read notifications
export const getNotifications = async () => {
    try {
        const info = await FileSystem.getInfoAsync(FILE_PATH);
        if (!info.exists) return [];
        const data = await FileSystem.readAsStringAsync(FILE_PATH);
        return JSON.parse(data);
    } catch (err) {
        console.log("Error reading notifications:", err);
        return [];
    }
};

// Save list back to file
const saveNotifications = async (list) => {
    try {
        await FileSystem.writeAsStringAsync(FILE_PATH, JSON.stringify(list));
    } catch (err) {
        console.log("Error saving notifications:", err);
    }
};

// Add new notification
export const addNotification = async (notif) => {
    try {
        const existing = await getNotifications();

        const updated = [
            {
                id: Date.now().toString(),
                title: notif.title,
                body: notif.body,
                documentId: notif.documentId,
                type: notif.type,
                timestamp: Date.now(),
                read: false
            },
            ...existing
        ];

        await saveNotifications(updated);
    } catch (err) {
        console.log("Error adding notification:", err);
    }
};

// Mark as read
export const markAsRead = async (id) => {
    const list = await getNotifications();
    const updated = list.map((n) =>
        n.id === id ? { ...n, read: true } : n
    );
    await saveNotifications(updated);
};
