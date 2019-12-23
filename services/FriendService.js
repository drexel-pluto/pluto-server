const UserModel = require('../models/User');
const US = require('./UserService');
const { isEmpty } = require('./helpers');
const friendCap = require('../config/globals').maxNumberOfFriendsAllowed;

const FS = {
    async sendRequest(params) {
        if (params.username == params.user.username) { return Promise.reject('That\'s you, silly goose!'); }
        
        // Refreshing user param bc token will contain stale user object
        params.user = await US.getUser(params.user.username);
        params.requestedUser = await US.getUser(params.username);

        await FS.makeSureArentAlreadyFriends(params);
        await FS.hasFriendCapBeenReached(params);
        await FS.makeSureRequestIsntPending(params);

        await FS.addReceivedRequestToUser(params);
        return await FS.addSentRequestToUser(params);
    },
    async confirmFriendRequest(params) {
        // Refreshing user param bc token will contain stale user object
        params.receiver = await US.getUser(params.user.username);
        params.sender = await US.getUser(params.username);

        await FS.removeRequestSent(params);
        await FS.removeRequestReceived(params);

        await FS.addFriend(params.sender._id, params.receiver._id, params);
        await FS.addFriend(params.receiver._id, params.sender._id, params);
        return 'Friend successfully added!'
    },
    async rejectFriendRequest(params) {
        // Refreshing user param bc token will contain stale user object
        params.receiver = await US.getUser(params.user.username);
        params.sender = await US.getUser(params.username);

        await FS.removeRequestSent(params);
        await FS.removeRequestReceived(params);

        return 'Request successfully rejected.'
    },
    async addSentRequestToUser(params) {
        const request = { to: params.requestedUser._id }
        const filter = { _id: params.user._id }
        const update = { $push: { friendRequestsSent : request }}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    },
    async addReceivedRequestToUser(params) {
        const request = { from: params.user._id }
        const filter = { _id: params.requestedUser._id }
        const update = { $push: { friendRequestsReceived : request }}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    },
    async removeRequestReceived(params) {
        const filter = { _id: params.receiver }
        const update = { $pull: { friendRequestsReceived : { from: params.sender} }}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    },
    async removeRequestSent(params) {
        const filter = { _id: params.sender }
        const update = { $pull: { friendRequestsSent : { to: params.receiver} }}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    },
    async hasFriendCapBeenReached (params) {
        const senderFriendCount = await US.getNumberOfFriends(params.user);
        if (senderFriendCount > friendCap) { return Promise.reject('Maximum number of friends reached.'); }
        return;
    },
    async makeSureRequestIsntPending(params) {
        const requests = params.user.friendRequestsSent;
        return new Promise((resolve, reject) => {
            requests.forEach(request => {
                if (request.to.toString() == params.requestedUser._id.toString()) {
                    reject('Friend request already sent. Waiting on their response.');
                }
            });
            resolve();
        });
    },
    async addFriend(partyA, partyB, _params) {
        const friendObj = { friend: partyB }
        const filter = { _id: partyA }
        const update = { $push: { friends : friendObj }}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    },
    async makeSureArentAlreadyFriends(params) {
        const friends = params.user.friends;
        return new Promise((resolve, reject) => {
            friends.forEach(friend => {
                if (friend.friend.toString() == params.requestedUser._id.toString()) {
                    reject('You are already friends with this person.');
                }
            });
            resolve();
        });
    },
    async handleFriendRemoval(params) {
        params.friendToRemove = await US.getUser(params.username);
        await FS.removeFriend(params.friendToRemove._id, params.user._id);
        return await FS.removeFriend(params.user._id, params.friendToRemove._id);
    },
    async removeFriend(partyA, partyB, _params) {
        const filter = { _id: partyA }
        const update = { $pull: { friends : { friend: partyB }}}
        return await UserModel.findOneAndUpdate(filter, update, { new: true });
    }
}

module.exports = FS;
