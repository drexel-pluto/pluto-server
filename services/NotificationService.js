const NCModel = require('../models/UserNotificationCollector');
const NotificationModel = require('../models/Notification');

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
            const notifications = await NCModel.findById(notificationsCollectorId)
                                                .populate({
                                                    path: 'notifications.from',
                                                    select: ['username', 'name', 'profilePicURL']
                                                })
                                                .limit(25);
            return notifications.notifications;
        }
    }
}
