const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true,
        unique: true
    },
    username: {
        type: String,
        required: true,
        minlength: 3,
        maxlength: 25,
        unique: true
    },
    gender: {
        type: String
    },
    name: {
        type: String,
        required: true,
        maxlength: 50
    },
    isVerified: {
        default: false
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String,
        maxlength: 150
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    posts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    archivedPosts: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Post'
        }
    ],
    feedCollector: {
        type: Schema.Types.ObjectId,
        ref: 'UserFeed'
    },
    friendIds: [String],
    friends: [
        {
            friendSince: {
                type: Date,
                default: Date.now
            },
            friend: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    ],
    friendRequestsSent: [
        {
            timeRequestSent: {
                type: Date,
                default: Date.now
            },
            to: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    ],
    friendRequestsReceived: [
        {
            timeRequestReceived: {
                type: Date,
                default: Date.now
            },
            from: {
                type: Schema.Types.ObjectId,
                ref: 'User'
            }
        }
    ],
    groups: [
        {
            type: Schema.Types.ObjectId,
            ref: 'Group'
        }
    ],
    groupIds: [String],
    birthday: {
        type: Date
    },
    profilePicURL: {
        type: String,
        default: ''
    }
});

const User = mongoose.model('User', UserSchema);

module.exports = User;

/*

    Posts
    Friends
    Groups
    Feed
    Name
    Profile pic
    Bio
    username
    connected email
    birthday

*/