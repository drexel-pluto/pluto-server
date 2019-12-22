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
    friends: {
        type: [Schema.Types.ObjectId]
    },
    friendRequests: {
        type: [Schema.Types.ObjectId]
    },
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

const User = mongoose.model('user', UserSchema);

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