import admin from "firebase-admin";
import prisma from "../prismaClient.js";
import path from "path";
import { fileURLToPath } from "url";
import { dirname } from "path";
import { createRequire } from "module";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const require = createRequire(import.meta.url);

// Initialize Firebase
if (!admin.apps.length) {
    try {
        const serviceAccountPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH
            ? path.isAbsolute(process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
                ? process.env.FIREBASE_SERVICE_ACCOUNT_PATH
                : path.join(__dirname, "../../", process.env.FIREBASE_SERVICE_ACCOUNT_PATH)
            : path.join(__dirname, "../../firebase-service-account.json");

        const serviceAccount = require(serviceAccountPath);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
        });
        console.log("Firebase Admin Initialized");
    } catch (error) {
        console.error("Firebase Initialization Error:", error.message);
    }
}

/** 
 * Helper to extract FCM token from hijacked fields 
 */
const getFcmTokenFromField = (fieldValue) => {
    if (!fieldValue) return null;
    try {
        // Attempt to parse as JSON first
        const parsed = JSON.parse(fieldValue);
        if (parsed && parsed.fcmToken) {
            return parsed.fcmToken;
        }
        // Backward compatibility: if it's just a raw token string (unlikely but safe)
        // or if the field was used for something else, we ignore it unless it has our specific structure.
        return null;
    } catch (e) {
        // Not JSON, so it's just the original string value (e.g. dietary preference)
        return null;
    }
};

export const sendPushNotification = async (userId, title, body, data = {}, userType = "USER") => {
    try {
        if (!admin.apps.length) return;

        let user;
        let token = null;

        if (userType === "CONSULTANT") {
            user = await prisma.consultant.findUnique({ where: { id: userId } });
            token = getFcmTokenFromField(user?.professionalAssociations);
        } else {
            user = await prisma.user.findUnique({ where: { id: userId } });
            token = getFcmTokenFromField(user?.preference);
        }

        if (!user || !token) {
            console.log(`No FCM token for ${userType} ${userId}`);
            return;
        }

        const stringData = {};
        for (const key in data) stringData[key] = String(data[key]);

        const message = {
            notification: {
                title,
                body
            },
            data: stringData,
            token: token,
            android: {
                priority: "high",
                notification: {
                    channelId: "goodbelly_high_importance",
                    sound: "default",
                    defaultSound: true,
                    priority: "high",
                    visibility: "public",
                    color: "#4CAF50"  // Green color for the app
                }
            },
            apns: {
                payload: {
                    aps: {
                        sound: 'default',
                        'mutable-content': 1
                    }
                }
            },
        };

        const response = await admin.messaging().send(message);
        console.log(`Notification sent to ${user.email} (${userType}):`, response);
        return response;

    } catch (error) {
        console.error(`Push Notification Failed for ${userId}:`, error.message);

        if (
            error.code === "messaging/registration-token-not-registered" ||
            error.code === "messaging/invalid-argument"
        ) {
            console.log(`Removing invalid FCM token for ${userType} ${userId}`);
            // Remove token but keep original data
            if (userType === "CONSULTANT") {
                const currentVal = user?.professionalAssociations;
                try {
                    const parsed = JSON.parse(currentVal);
                    delete parsed.fcmToken;
                    await prisma.consultant.update({
                        where: { id: userId },
                        data: { professionalAssociations: JSON.stringify(parsed) }
                    });
                } catch (e) { /* ignore */ }
            } else {
                const currentVal = user?.preference;
                try {
                    const parsed = JSON.parse(currentVal);
                    delete parsed.fcmToken;
                    await prisma.user.update({
                        where: { id: userId },
                        data: { preference: JSON.stringify(parsed) }
                    });
                } catch (e) { /* ignore */ }
            }
        }
    }
};
