const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserNotificationCollectorSchema = new Schema({
    notifications: [Object]
});

const UserNotificationCollector = mongoose.model('UserNotificationCollector', UserNotificationCollectorSchema);

module.exports = UserNotificationCollector;
