const UserModel = require('../models/User');
const friendCap = require('../config/globals').maxNumberOfFriendsAllowed;

module.exports = () => {
    var NS, US, FS;
    return {
        initialize(){
            NS = this.parent.NS;
            US = this.parent.US;
            FS = this;
        },
        async sendRequest(params) {
            if (params.username == params.user.username) { return Promise.reject('That\'s you, silly goose!'); }
            // Refreshing user param bc token will contain stale user object
            params.user = await US.getUser(params.user.username);
            params.requestedUser = await US.getUser(params.username);

            await FS.makeSureArentAlreadyFriends(params);
            await FS.hasFriendCapBeenReached(params);
            await FS.makeSureRequestIsntPending(params);
            await FS.sendRequestNotification(params);

            await FS.addReceivedRequestToUser(params);
            await FS.addSentRequestToUser(params);
            return await US.getFriendRequestsOut(params);
        },
        async confirmFriendRequest(params) {
            params.receiver = await US.getUser(params.user.username);
            params.sender = await US.getUser(params.username);

            await FS.removeRequestSent(params);
            await FS.removeRequestReceived(params);

            await FS.addFriend(params.sender._id, params.receiver._id, params);
            await FS.addFriend(params.receiver._id, params.sender._id, params);

            await FS.confirmRequestNotification(params);

            return await US.getPublicUser(params.sender._id);
        },
        async rejectFriendRequest(params) {
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
        // SLOW
        async makeSureRequestIsntPending(params) {
            const user = await US.getUserById(params.user._id);
            const requests = user.friendRequestsSent;
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
            const update = {
                $push: {
                    friends : friendObj,
                    friendIds: partyB.toString()
                }
            }
            return await UserModel.findOneAndUpdate(filter, update, { new: true });
        },
        async makeSureArentAlreadyFriends(params) {
            const friends = params.user.friendIds;
            const friendSet = new Set(friends);
            if (friendSet.has(params.requestedUser._id.toString())) {
                return Promise.reject('You are already friends with this person.');
            }
            return;
        },
        async isConfirmedFriend(userObj, possibleFriendID, _params) {
            const friends = userObj.friendIds;
            friends.push(userObj._id);
            const friendSet = new Set(friends);
            return friendSet.has(possibleFriendID.toString());
        },
        async ensureFriends(userObj, possibleFriendID, _params) {
            console.log(_params);
            // Pass if user is self
            if (userObj._id == possibleFriendID) { return }
            const friends = userObj.friendIds;
            const friendSet = new Set(friends);
            if (friendSet.has(possibleFriendID.toString())){
                return;
            } else {
                return Promise.reject(`You are not friends with this user: ${possibleFriendID}`);
            }
        },
        async handleFriendRemoval(params) {
            // TO DO -- remove unfriended person's posts from collector
            params.friendToRemove = await US.getUser(params.username);
            await FS.removeFriend(params.friendToRemove._id, params.user._id);
            return await FS.removeFriend(params.user._id, params.friendToRemove._id);
        },
        async removeFriend(partyA, partyB, _params) {
            const filter = { _id: partyA }
            const update = { $pull: { friends : { friend: partyB }}}
            return await UserModel.findOneAndUpdate(filter, update, { new: true });
        },
        async sendRequestNotification(params) {
            const notificationObj = {
                notificationFor: params.requestedUser._id,
                notificationFrom: params.user._id,
                notificationText: `${params.user.name} added you as a friend!`,
                showUser: true
            }
            await NS.sendNotification(notificationObj);
        },
        async confirmRequestNotification(params) {
            const notificationObj = {
                notificationFor: params.sender._id,
                notificationFrom: params.receiver._id,
                notificationText: `${params.receiver.name} confirmed your friend request.`,
                showUser: true
            }
            await NS.sendNotification(notificationObj);
        },
        async getRawMutualFriends(username, params) {
            const requester = await US.getUserById(params.user._id);
            const otherPerson = await US.getUser(username);

            const requesterFriends = requester.friendIds;
            const otherPersonFriends = otherPerson.friendIds;
            const otherPersonFriendSet = new Set(otherPersonFriends);

            const mutualFriends = requesterFriends.filter(friendId => otherPersonFriendSet.has(friendId.toString()));
            return mutualFriends;
        },
        async getNumberOfMutualFriends(username, params) {
            const mutualFriends = await FS.getRawMutualFriends(username, params);
            return mutualFriends.length;
        },
        async getPopulatedMutualFriends(username, params) {
            const mutualFriends = await FS.getRawMutualFriends(username, params);
            const populatedMutualFriends = await Promise.all(mutualFriends.map(async friendId => {
                return await US.getPublicUser(friendId);
            }));
            const mutualFriendsObj = {
                count: mutualFriends.length,
                friends: populatedMutualFriends
            }
            return mutualFriendsObj;
        }
    }
}
