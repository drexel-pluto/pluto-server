const NCModel = require('../models/UserNotificationCollector');
const NotificationModel = require('../models/Notification');
const globals = require('../config/globals');
const { Expo } = require('expo-server-sdk');

// Create a new Expo SDK client for push notifications
let expo = new Expo();

module.exports = () => {
    var NS, US;
    return {
        initialize(){
            US = this.parent.US;
            NS = this;
        },
        async sendNotification(params) {
            // params.notificationFor | params.notificationText | params.notificationFrom
            params.showUser = (params.showUser) ? params.showUser : false;
            const notification = new NotificationModel({
                text: params.notificationText,
                from: params.notificationFrom,
                showUser: params.showUser
            });

            // send push notification if recipient != sender 
            if (params.notificationFrom !== params.notificationFor) {
                const user = await US.getUserById(params.notificationFor);
                const pushToken = user.expoPushToken;

                // make sure recipient has a pushtoken
                if (Expo.isExpoPushToken(pushToken)) {
                    let message = {
                        to: pushToken,
                        body: params.notificationText
                    }

                    await expo.sendPushNotificationsAsync([message]);
                }
            }

            const usersNotificationCollector = await NS.getNotifcationCollectorId(params.notificationFor);
            const query = usersNotificationCollector;
            const update = {
                $push : {
                    "notifications": {
                        $each: [ notification ],
                        $position: 0
                    }
                }
            }
            const opts = { new: true }
            const updatedNotifcations = await NCModel.findByIdAndUpdate(query, update, opts);
            return updatedNotifcations.notifications;
        },
        async getNotifcationCollectorId(userId) {
            const user = await US.getUserById(userId);
            return user.notificationCollector;
        },
        async fetchNotifications(params) {
            const notificationsCollectorId = params.user.notificationCollector;
            const notifications = await NCModel
                                    .findById(notificationsCollectorId)
                                    .limit(25);
            const populatedNotifications = await NotificationModel
                                            .populate(notifications.notifications, { path: 'from', select: ['profilePicURL', 'username', 'name']});
            const filteredNotifications = await NS.getFilteredNotifications(populatedNotifications);
            return filteredNotifications;
        },
        async getFilteredNotifications(populatedNotifs) {
            return populatedNotifs.map(notif => {
                if (!notif.showUser) {
                    delete notif.from;
                    notif.from = {}
                    notif.from.profilePicURL = globals.getRandomDefaultPic();
                    return notif;
                } else {
                    return notif;
                }
            });
        }
    }
}
