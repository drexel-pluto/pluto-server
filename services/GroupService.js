const UserModel = require('../models/User');
const GroupModel = require('../models/Group');
const { contains, asyncForEach } = require('./helpers');


// Groups are unidirectional
// Groups serve as 'buckets' to put their friends into
// Since they're unique per user, we'll be attaching them to the user obj

module.exports = () => {
    var US, GS, FS;
    return {
        initialize(){
            US = this.parent.US;
            FS = this.parent.FS;
            GS = this;
        },
        async createNewGroup(params) {
            // Adding yourself to each group make it easier seeing your own posts within each feed
            const newGroup = await GroupModel.create({
                members: [params.user._id],
                memberIds: [params.user._id],
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
        async addUsersToGroup(params) {
            const user = await US.getUser(params.user.username);
            params.user = user;
            await Promise.all(params.friendsToAdd.map(async friend => {
                await FS.ensureFriends(user, friend);
            }));
            return await GS.pushManyUsersToGroup(params);
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
            const update = { $addToSet: {
                members : params.friendId,
                memberIds: params.friendId
            }}
            const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
            return group;
        },
        async pushManyUsersToGroup(params) {
            const filter = { _id: params.groupId }
            const update = { $addToSet: {
                members : params.friendsToAdd,
                memberIds: params.friendsToAdd
            }}
            const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
            return group;
        },
        async pullUserFromGroup(params) {
            const filter = { _id: params.groupId }
            const update = { $pull: {
                members : params.friendToRemove,
                memberIds: params.friendToRemove
            }}
            const group = await GroupModel.findOneAndUpdate(filter, update, { new: true });
            return group;
        },
        async pullManyUsersFromGroup(params) {
            const filter = { _id: params.groupId }
            const update = { $pull: {
                members : { $in: params.friendsToRemove },
                memberIds: { $in: params.friendsToRemove }
            }}
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
            const ownedGroups = new Set(params.user.groupIds);
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
        async getPopulatedGroup(params) {
            const filter = { _id: params.groupId }
            const population = {
                path: 'members',
                select: ['username', 'email', 'name', 'birthday', 'profilePicURL']
            }
            return await GroupModel
                            .findOne(filter)
                            .lean()
                            .populate(population);
        },
        async getRawGroup(params) {
            const filter = { _id: params.groupId }
            return await GroupModel
                            .findOne(filter)
                            .lean();
        },
        async pullUserFromAllGroups(friendId, params) {
            params.friendToRemove = friendId;
            const groups = await GS.getGroups(params);
            const newGroups = await Promise.all(groups.map(async group => {
                const isInGroup = await GS.isGroupMember(friendId, group);
                if (isInGroup) {
                    params.groupId = group._id;
                    await GS.pullUserFromGroup(params);
                }
            }));
            return newGroups;
        },
        async isGroupMember(id, groupObj) {
            if (contains.call(groupObj.memberIds, id.toString())) {
                return true;
            }
        }
    }
}
