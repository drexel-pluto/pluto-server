const UserModel = require('../models/User');
const friendCap = require('../config/globals').maxNumberOfFriendsAllowed;

module.exports = () => {
    var GS, NS, US, FS, PS;
    return {
        initialize(){
            GS = this.parent.GS;
            NS = this.parent.NS;
            US = this.parent.US;
            PS = this.parent.PS;
            FS = this;
        },
        async sendRequest(params) {
            if (params.username == params.user.username) { return Promise.reject('That\'s you, silly goose!'); }
            // Refreshing user param bc token will contain stale user object
            params.user = await US.getUser(params.user.username);
            params.requestedUser = await US.getUser(params.username);

            await FS.ensureArentAlreadyFriends(params);
            await FS.hasFriendCapBeenReached(params);
            await FS.ensureRequestIsntPending(params);
            await FS.ensureRequestIsntWaitingResponse(params);
            await FS.sendRequestNotification(params);
            await FS.ensureNotBlocked(params);

            await FS.addReceivedRequestToUser(params);
            await FS.addSentRequestToUser(params);
            return await US.getFriendRequestsOut(params);
        },
        async confirmFriendRequest(params) {
            
            params.receiver = await US.getUser(params.user.username);
            params.sender = await US.getUser(params.username);

            await FS.ensureRequestExists(params);
            
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
        async ensureRequestIsntPending(params) {
            const user = await US.getUserById(params.user._id);
            const requests = user.friendRequestsSent;

            return await Promise.all(requests.map(async request => {
                return new Promise((resolve, reject) => {
                    if (request.to.toString() == params.requestedUser._id.toString()) {
                        reject('Friend request already sent. Waiting on their response.');
                    } else {
                        resolve();
                    }
                });
            }));
        },
        async ensureRequestIsntWaitingResponse(params) {
            const user = await US.getUserById(params.user._id);
            const requests = user.friendRequestsReceived;

            return await Promise.all(requests.map(async request => {
                return new Promise((resolve, reject) => {
                    if (request.from.toString() == params.requestedUser._id.toString()) {
                        reject('You already have a friend request from this person.');
                    } else {
                        resolve();
                    }
                });
            }));
        },
        async ensureRequestExists(params) {
            const requests = params.receiver.friendRequestsReceived;

            return new Promise((resolve, reject) => {
                if (requests.some(request => request.from.toString() === params.sender._id.toString())) {
                    resolve();
                } else {
                    reject('You don\'t have a friend request from this person.');
                }
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
        async ensureArentAlreadyFriends(params) {
            const friends = params.user.friendIds;
            const friendSet = new Set(friends);
            if (friendSet.has(params.requestedUser._id.toString())) {
                return Promise.reject('You are already friends with this person.');
            }
            return;
        },
        async ensureNotBlocked(params) {
            if (params.user.blockedUsers) {
                const requestedUserBlocked = params.user.blockedUsers.some(blockedUser =>
                    blockedUser.toString() == params.requestedUser._id.toString());

                    if (requestedUserBlocked) {
                    return Promise.reject('You have blocked this user.');
                }
            }

            if (params.requestedUser.blockedUsers) {
                const blockedByRequestedUser = params.requestedUser.blockedUsers.some(blockedUser =>
                    blockedUser.toString() == params.user._id.toString());

                    if (blockedByRequestedUser) {
                    return Promise.reject('User has blocked you.');
                }
            }

            return;
        },
        async isConfirmedFriend(userObj, possibleFriendID, _params) {
            const friends = userObj.friendIds;
            friends.push(userObj._id.toString());
            const friendSet = new Set(friends);
            return friendSet.has(possibleFriendID.toString());
        },
        async ensureFriends(userObj, possibleFriendID, _params) {
            // Pass if user is self
            if (userObj._id.toString() == possibleFriendID.toString()) { return }
            const friends = userObj.friendIds;
            const friendSet = new Set(friends);
            if (friendSet.has(possibleFriendID.toString())){
                return;
            } else {
                return Promise.reject(`You are not friends with this user: ${possibleFriendID}`);
            }
        },
        async handleFriendRemoval(params) {
            await FS.ensureFriends(params.user, params.friendId, params);

            // Remove unfriended person's posts from collector
            await PS.removeAllPostsFromUser(params.friendId, params);

            // Remove from groups
            await GS.pullUserFromAllGroups(params.friendId, params);

            await FS.removeFriend(params.friendId, params.user._id);
            return await FS.removeFriend(params.user._id, params.friendId);
        },
        async removeFriend(partyA, partyB, _params) {
            const filter = { _id: partyA }
            const update = { 
                $pull: { 
                    friends : { friend: partyB },
                    friendIds : partyB.toString()
                }
            }
            return await UserModel.findOneAndUpdate(filter, update, { new: true });
        },
        async sendRequestNotification(params) {
            const notificationObj = {
                notificationFor: params.requestedUser._id,
                notificationFrom: params.user._id,
                notificationText: `${params.user.name} added you as a friend!`,
                notificationType: "recieveFriendReq",
                showUser: true
            }
            await NS.sendNotification(notificationObj);
        },
        async confirmRequestNotification(params) {
            const notificationObj = {
                notificationFor: params.sender._id,
                notificationFrom: params.receiver._id,
                notificationText: `${params.receiver.name} confirmed your friend request.`,
                notificationType: "confirmFriendReq",
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
