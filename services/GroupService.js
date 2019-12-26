const US = require('./UserService');
const FS = require('./FriendService');
const UserModel = require('../models/User');
const GroupModel = require('../models/Group');
const { asyncForEach } = require('./helpers');


// Groups are unidirectional
// Groups serve as 'buckets' to put their friends into
// Since they're unique per user, we'll be attaching them to the user obj

const GS = {
    async createNewGroup(params) {
        // Adding yourself to each group make it easier seeing your own posts within each feed
        const newGroup = await GroupModel.create({
            members: [params.user._id],
            title: params.groupName,
            owner: params.user._id
        });

        const filter = { _id: params.user._id }
        const update = { $push: {
            groups : newGroup._id,
            groupIds: newGroup._id.toString()
        }}
        await UserModel.findOneAndUpdate(filter, update, { new: true });
        return newGroup;
    },
    async addUserToGroup(params) {
        const user = await US.getUser(params.user.username);
        params.user = user;

        await FS.isConfirmedFriend(params.user, params.friendToAdd);
        return await GS.pushUserToGroup(params);
    },
    async deleteGroup(params) {
        const filter = { _id: params.user._id }
        const update = { $pull: {
            groups : params.groupId,
            groupIds: params.groupId.toString()
        }}
        await UserModel.findOneAndUpdate(filter, update, { new: true });
        return await GroupModel.deleteOne({ _id: params.groupId });
    },
    async pushUserToGroup(params) {
        const filter = { _id: params.groupId }
        const update = { $addToSet: { members : params.friendToAdd }}
        const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
        return group;
    },
    async pullUserFromGroup(params) {
        const filter = { _id: params.groupId }
        const update = { $pull: { members : params.friendToRemove }}
        const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
        return group;
    },
    async updateGroupName(params) {
        const filter = { _id: params.groupId }
        const update = { title : params.newTitle }
        const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
        return group;
    },
    async editGroupName(params) {
        await GS.isGroupOwner(params);
        return await GS.updateGroupName(params);
    },
    async isGroupOwner(params) {
        const freshUser = await US.getUser(params.user.username);
        const ownedGroups = new Set(freshUser.groupIds);
        return ownedGroups.has(params.groupId.toString());
    },
    // Unused but example of async foreach
    async ensureAllFriends(params) {
        return await asyncForEach(params.friendsToAdd, async (friendId) => {
            const isFriend = await FS.isConfirmedFriend(params.user, friendId);
            if (!isFriend) {
                return Promise.reject(`User ${friendId} is not friends with you!`);
            }
        });
    },
    async getGroups(params) {
        const filter = { owner: params.user._id }
        const population = {
            path: 'members',
            select: ['username', 'email', 'name', 'birthday', 'profilePicURL']
         }
        return await GroupModel
                        .find(filter)
                        .lean()
                        .populate(population);
    },
    async getGroup(params) {
        const filter = { _id: params.groupId }
        const population = {
            path: 'members',
            select: ['username', 'email', 'name', 'birthday', 'profilePicURL']
         }
        return await GroupModel
                        .find(filter)
                        .lean()
                        .populate(population);
    }
}

module.exports = GS;
