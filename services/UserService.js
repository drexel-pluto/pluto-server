const UserModel = require('../models/User');
const UserFeedModel = require('../models/UserFeed');
const { isEmpty, contains } = require('./helpers');
const bcrypt = require('bcryptjs');

module.exports = () => {
    var US, FS;
    return {
        initialize(){
            FS = this.parent.FS;
            US = this;
        },
        async createUser(params) {
            await US.checkParams(params);
            await US.isUsernameAvailable(params);
            await US.checkEmailExists(params);

            params.hashedPass = await US.encryptPassword(params);

            const feedAggregator = await US.createFeedAggregator(params);

            params.feedAggregator = feedAggregator._id;
            
            return await US.saveUser(params);
        },
        async checkParams(params) {
            if (isEmpty(params.username)) { return Promise.reject('No username specified.'); }
            if (isEmpty(params.email)) { return Promise.reject('No email specified.'); }
            if (isEmpty(params.name)) { return Promise.reject('No name specified.'); }
            if (isEmpty(params.password)) { return Promise.reject('No password specified.'); }
            if (params.email.length > 60) { return Promise.reject('Too many characters in email.'); }
            if (params.name.length > 50) { return Promise.reject('Too many characters in name.'); }
            if (!params.email.slice().includes('@')) { return Promise.reject('Invalid email provided.'); }
            if (!params.email.slice().includes('.')) { return Promise.reject('Invalid email provided.'); }
            return;
        },
        async isUsernameAvailable(params) {
            const isUsernameInUse = await US.isUsernameInUse(params);
            if (isUsernameInUse) { return Promise.reject('Username already taken.'); }
            return;
        },
        async isUsernameInUse(params) {
            return UserModel
                    .find({username: params.username})
                    .lean()
                    .then(data => {
                        if (isEmpty(data)) {
                            return false;
                        } else {
                            return true;
                        }
                    });
        },
        async checkEmailExists(params) {
            return UserModel
                    .find({email: params.email})
                    .lean()
                    .then(data => {
                        if (isEmpty(data)) {
                            return;
                        } else {
                            return Promise.reject('Email already in use.');
                        }
                    });
        },
        async encryptPassword(params) {
            return await new Promise((resolve, reject) => {
                bcrypt.genSalt(10, function(err, salt) {
                    bcrypt.hash(params.password, salt, function(err, hash) {
                        if (err) { reject(err); }
                        resolve(hash);
                    });
                });
            });
        },
        async saveUser(params) {
            return UserModel.create({
                username: params.username,
                email: params.email,
                password: params.hashedPass,
                name: params.name,
                gender: params.gender,
                feedCollector: params.feedAggregator
            });
        },
        // returns user if valid, returns false if not
        async isValidUserCredentials(params) {
            return UserModel.find({username: params.username}).limit(1).then(user => {
                return bcrypt.compare(params.password, user[0].password).then((res) => {
                    if (res) {
                        return user;
                    } else {
                        return false;
                    }
                });
            });
        },
        async getNumberOfFriends(userObj) {
            return userObj.friends.length;
        },
        async getUser(username) {
            const user = await UserModel.find({ username }).limit(1).lean();

            if (isEmpty(user)) { return Promise.reject('User does not exist.'); }
            return user[0];
        },
        async getUserById(id) {
            const user = await UserModel.find({ _id: id }).limit(1).lean();

            if (isEmpty(user)) { return Promise.reject('User does not exist.'); }
            return user[0];
        },
        async getFriends(params) {
            const user = await UserModel
                                .find({ username: params.user.username })
                                .limit(1)
                                .lean()
                                .populate({
                                    path: 'friends.friend',
                                    select: ['username', 'name', 'email', 'profilePicURL']
                                });
            return user[0].friends;
        },
        async getFriendRequestsIn(params) {
            const user = await US.getUser(params.user.username);
            return user.friendRequestsReceived;
        },
        async getFriendRequestsOut(params) {
            const user = await US.getUser(params.user.username);
            return user.friendRequestsSent;
        },
        async fetchAUser(params) {
            if (!isEmpty(params.userId)) {
                await FS.ensureFriends(params.user, params.userId);
                const user = await US.getUserById(params.userId);
                return await US.getNonSensitiveUserInfo(user);
            } else {
                return await US.getUser(params.user.username);
            }
        },
        async getNonSensitiveUserInfo(user) {
            const sensitiveFields = [
                'password', 'email', 'groups',
                'friends', 'friendIds', 'feed', 'posts',
                'friendRequestsSent', 'friendRequestsReceived'
            ];
            for (let key in user) {
                if (contains.call(sensitiveFields, key)) {
                    delete user[key];
                }
            }
            return user;
        },
        async updateUserProfile(params) {
            await US.ensureEditableProfileField(params);

            const filter = { _id: params.user._id }
            const update = {}
            update[params.field] = params.newValue;
            return await UserModel.findOneAndUpdate(filter, update, { new: true });
        },
        async ensureEditableProfileField(params) {
            const acceptableFields = new Set(['birthday', 'bio', 'name', 'gender']);
            if (!acceptableFields.has(params.field)){
                return Promise.reject(`Requested field (${params.field}) is not editable through this endpoint.`);
            }
            return;
        },
        async createFeedAggregator(_params) {
            return await UserFeedModel.create({
                posts: [],
                postIds: []
            });
        },
        async getFeedCollectorId(userId, _params) {
            const user = await US.getUserById(userId);
            return user.feedCollector;
        }
    }
}
