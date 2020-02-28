const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const NotificationSchema = new Schema({
    createdAt: {
        type: Date,
        default: Date.now
    },
    text: String,
    from: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    showUser: {
        type: Boolean,
        default: false
    }
});

const Notification = mongoose.model('Notification', NotificationSchema);

module.exports = Notification;
