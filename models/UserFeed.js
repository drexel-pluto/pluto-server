const mongoose = require('mongoose');
const Schema = mongoose.Schema;

// Creating this will allow us to create an 'inbox' for each user
// Pulling off user object to keep it lighter
// One per user
const UserFeedSchema = new Schema({
    posts: [
        {
            poster: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            },
            tags: [String],
            post: {
                type: Schema.Types.ObjectId,
                ref: 'Post'
            }
        }
    ],
    postIds: [String]
});

const UserFeed = mongoose.model('UserFeed', UserFeedSchema);

module.exports = UserFeed;
