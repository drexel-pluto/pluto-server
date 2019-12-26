const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Creating this will allow us to create an 'inbox' for each user
// Pulling off user object to keep it lighter
// One per user
const UserFeedSchema = new Schema({
    owner: {
        type: Schema.Types.ObjectId,
        ref: 'User'
    },
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    archiveDate: {
        type: Date
    },
    text: {
        type: String
    },
    allowedAudienceIds: [String],
    allowedAudience: [
        {
            type: Schema.Types.ObjectId,
            ref: 'User'
        }
    ],
    mediaURLs: [String],
    tag: String,
});

const UserFeed = mongoose.model('UserFeed', UserFeedSchema);

module.exports = UserFeed;
