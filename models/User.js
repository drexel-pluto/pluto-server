const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const UserSchema = new Schema({
    email: {
        type: String,
        required: true
    },
    username: {
        type: String,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    isVerified: {
        default: false
    },
    password: {
        type: String,
        required: true
    },
    bio: {
        type: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    posts: {
        type: [Schema.Types.ObjectId]
    },
    feed: {
        type: [Schema.Types.ObjectId]
    },
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
    groups: {
        title: { type: String },
        members: [Schema.Types.ObjectId] 
    },
    birthday: {
        type: Date
    },
    profilePicURL: {
        type: String
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