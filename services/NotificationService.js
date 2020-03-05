const NCModel = require('../models/UserNotificationCollector');
const NotificationModel = require('../models/Notification');
const globals = require('../config/globals');

module.exports = () => {
    var NS;
    return {
        initialize(){
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
