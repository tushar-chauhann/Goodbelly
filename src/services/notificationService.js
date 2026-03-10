import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

import { navigationRef } from "../utils/navigationRef";
import { addNotification } from "../utils/notificationStorage";
import api, { updateFcmToken } from "./api";

// -------------------------------------------
//  NOTIFICATION CHANNEL SETUP (Android)
// -------------------------------------------
if (Platform.OS === "android") {
    Notifications.setNotificationChannelAsync("goodbelly_high_importance", {
        name: "GoodBelly Notifications",
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        sound: "default",
        lightColor: "#4CAF50",
    });
}

let listenersRegistered = false; // Prevents multiple listeners

// Navigation handler for all notification types
function handleNotificationNavigation(data) {
    if (!data || !data.type) {
        console.log("No notification data or type found");
        return;
    }

    const { type, orderId, subscriptionId } = data;
    console.log("Handling notification navigation:", { type, orderId, subscriptionId });

    try {
        // Order notifications
        if (type.startsWith('ORDER_') || type === 'VENDOR_NEW_ORDER') {
            if (orderId) {
                navigationRef.navigate('OrderDetails', { orderId });
            } else {
                navigationRef.navigate('Orders');
            }
        }
        // Subscription notifications
        else if (type.startsWith('SUBSCRIPTION_')) {
            navigationRef.navigate('Subscription');
        }
        // Booking notifications (Consultations)
        else if (type.startsWith('BOOKING_')) {
            navigationRef.navigate('Consultations');
        }
        // Newsletter notification
        else if (type === 'NEWSLETTER_SUBSCRIPTION') {
            navigationRef.navigate('AboutUs');
        }
        // Payment notifications
        else if (type.startsWith('PAYMENT_')) {
            if (orderId) {
                navigationRef.navigate('OrderDetails', { orderId });
            } else if (subscriptionId) {
                navigationRef.navigate('Subscription');
            } else if (data.bookingId || type.includes('BOOKING')) {
                navigationRef.navigate('Consultations');
            }
        }
    } catch (error) {
        console.error("Navigation error:", error);
    }
}

export async function initNotifications() {
    console.log("INIT NOTIFICATIONS STARTED");

    try {
        // If listeners already registered → skip to prevent duplicates
        if (listenersRegistered) {
            console.log("SKIPPED — Notification listeners already attached");
            return;
        }
        listenersRegistered = true;

        // -------------------------------------------
        //  CONFIGURE NOTIFICATION HANDLER (Expo)
        // -------------------------------------------
        Notifications.setNotificationHandler({
            handleNotification: async () => ({
                shouldShowAlert: true,
                shouldPlaySound: true,
                shouldSetBadge: true,
                priority: Notifications.AndroidNotificationPriority.MAX,
            }),
        });

        // -------------------------------------------
        //  REQUEST PERMISSIONS
        // -------------------------------------------
        if (Device.isDevice) {
            const { status: existingStatus } = await Notifications.getPermissionsAsync();
            let finalStatus = existingStatus;

            if (existingStatus !== "granted") {
                const { status } = await Notifications.requestPermissionsAsync();
                finalStatus = status;
            }

            if (finalStatus !== "granted") {
                console.log("NOTIFICATION PERMISSION DENIED");
                return;
            }

            console.log("NOTIFICATION PERMISSION GRANTED");

            // -------------------------------------------
            //  GET FCM TOKEN WITH RETRY
            // -------------------------------------------
            const authStatus = await messaging().requestPermission();
            const enabled =
                authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
                authStatus === messaging.AuthorizationStatus.PROVISIONAL;

            if (enabled) {
                let fcmToken = null;
                let retries = 3;

                while (!fcmToken && retries > 0) {
                    try {
                        fcmToken = await messaging().getToken();
                        if (fcmToken) {
                            console.log("FCM TOKEN:", fcmToken);
                            break;
                        }
                    } catch (tokenError) {
                        retries--;
                        console.log(`⚠️ FCM token failed (${retries} retries left):`, tokenError.message);
                        if (retries > 0) {
                            await new Promise(resolve => setTimeout(resolve, 2000));
                        }
                    }
                }

                // Send token to backend using the proper function
                if (fcmToken) {
                    try {
                        await updateFcmToken(fcmToken);
                        console.log("FCM token sent to backend successfully");
                    } catch (error) {
                        console.error("Error sending FCM token to backend:", error);
                    }
                } else {
                    console.log("⚠️ Could not retrieve FCM token after retries");
                }
            }
        }

        // -------------------------------------------
        //         FOREGROUND MESSAGE HANDLER
        // -------------------------------------------
        messaging().onMessage(async (remoteMessage) => {
            console.log("FOREGROUND FCM MESSAGE:", remoteMessage);

            const title = remoteMessage.notification?.title || "Notification";
            const body = remoteMessage.notification?.body || "";
            const data = remoteMessage.data || {};

            // Save to FileSystem
            try {
                await addNotification({
                    title,
                    body,
                    documentId: data.documentId || data.articleId || data.id,
                    type: data.type,
                });
                console.log("Saved notification to FileSystem (foreground).");
            } catch (e) {
                console.log("Error saving notification (foreground):", e);
            }

            // IMPORTANT: React Native Firebase does NOT auto-display notifications in foreground
            // We must manually schedule them to show
            try {
                await Notifications.scheduleNotificationAsync({
                    content: {
                        title,
                        body,
                        data,
                        sound: 'default',
                        priority: Notifications.AndroidNotificationPriority.MAX,
                        color: '#4CAF50',
                        ...(Platform.OS === 'android' && {
                            icon: require('../../assets/notification-icon.png'),
                        }),
                    },
                    trigger: null,
                });
                console.log("FOREGROUND: Scheduled local notification");
            } catch (e) {
                console.log("Error scheduling foreground notification:", e);
            }
        });

        // -------------------------------------------
        //         BACKGROUND MESSAGE HANDLER
        // -------------------------------------------
        messaging().setBackgroundMessageHandler(async (remoteMessage) => {
            console.log("BACKGROUND FCM MESSAGE:", remoteMessage);

            const title = remoteMessage.notification?.title || "Notification";
            const body = remoteMessage.notification?.body || "";
            const data = remoteMessage.data || {};

            // Save to FileSystem
            try {
                await addNotification({
                    title,
                    body,
                    documentId: data.documentId || data.articleId || data.id,
                    type: data.type,
                });
                console.log("Saved notification to FileSystem (background).");
            } catch (e) {
                console.log("Error saving notification (background):", e);
            }

            // NOTE: Firebase handles background notifications automatically
            // Only schedule local notification if it's a data-only message (no notification payload)
            if (!remoteMessage.notification) {
                try {
                    await Notifications.scheduleNotificationAsync({
                        content: {
                            title,
                            body,
                            data,
                            sound: 'default',
                            priority: Notifications.AndroidNotificationPriority.MAX,
                            color: '#4CAF50',
                            ...(Platform.OS === 'android' && {
                                icon: require('../../assets/notification-icon.png'),
                            }),
                        },
                        trigger: null,
                    });
                    console.log("BACKGROUND: Scheduled local notification for data-only message");
                } catch (e) {
                    console.log("Error scheduling local notification (background):", e);
                }
            }
        });

        // -------------------------------------------
        //         When user taps notification (app in background)
        // -------------------------------------------
        messaging().onNotificationOpenedApp((remoteMessage) => {
            console.log("onNotificationOpenedApp:", remoteMessage);
            const data = remoteMessage?.data;

            if (data && navigationRef.isReady()) {
                handleNotificationNavigation(data);
            }
        });

        // -------------------------------------------
        //         When app opened from QUIT state
        // -------------------------------------------
        const initialMsg = await messaging().getInitialNotification();
        if (initialMsg) {
            console.log("getInitialNotification (cold start):", initialMsg);
            // Delay to ensure navigation is ready after cold start
            setTimeout(() => {
                if (navigationRef.isReady()) {
                    handleNotificationNavigation(initialMsg.data);
                }
            }, 1000);
        }

        // -------------------------------------------
        //         Local notification tap listener (Expo)
        // -------------------------------------------
        Notifications.addNotificationResponseReceivedListener((response) => {
            const data = response.notification.request.content.data || {};
            console.log("Notification tapped (Expo local):", data);

            if (navigationRef.isReady()) {
                handleNotificationNavigation(data);
            }
        });

        // -------------------------------------------
        console.log("  ALL NOTIFICATION LISTENERS REGISTERED");
    } catch (error) {
        console.error("❌ Error initializing notifications:", error);
    }
}
