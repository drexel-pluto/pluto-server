const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserNotificationCollectorSchema = new Schema({
    notifications: [{
        type: Schema.Types.ObjectId,
        ref: 'Notification'
    }]
});

const UserNotificationCollector = mongoose.model('UserNotificationCollector', UserNotificationCollectorSchema);

module.exports = UserNotificationCollector;
