const UserModel = require('../models/User');
const UserFeedModel = require('../models/UserFeed');
const NotificationCollectorModel = require('../models/UserNotificationCollector');
const { isEmpty, contains } = require('./helpers');
const bcrypt = require('bcryptjs');

module.exports = () => {
    var US, FS, GS, PS, IS, PuS;
    return {
        initialize(){
            FS = this.parent.FS;
            GS = this.parent.GS;
            PS = this.parent.PS;
            IS = this.parent.IS;
            PuS = this.parent.PuS;
            US = this;
        },
        async createUser(params) {
            await US.checkParams(params);
            await US.isUsernameAvailable(params);
            await US.checkEmailExists(params);
            await PuS.addToEmailList(params);
            await US.ensureNoMoreThanOneMedia(params);

            params.profilePicURL = await IS.uploadMedia(params.files);

            params.hashedPass = await US.encryptPassword(params);

            const feedAggregator = await US.createFeedAggregator(params);
            params.feedAggregator = feedAggregator._id;

            const notificationCollector = await US.createNotificationCollector(params);
            params.notificationCollector = notificationCollector._id;
            
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
            await PuS.checkValidEmail(params);
            return;
        },
        async isUsernameAvailable(params) {
            const isUsernameInUse = await US.isUsernameInUse(params);
            if (isUsernameInUse) { return Promise.reject('Username already taken.'); }
            return;
        },
        async isUsernameInUse(params) {
            return UserModel
                    .find({username: params.username.toLowerCase()})
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
                username: params.username.toLowerCase(),
                email: params.email,
                password: params.hashedPass,
                name: params.name,
                gender: params.gender,
                feedCollector: params.feedAggregator,
                profilePicURL: params.profilePicURL,
                notificationCollector: params.notificationCollector
            });
        },
        // returns user if valid, returns false if not
        async isValidUserCredentials(params) {
            return UserModel.find({username: params.username.toLowerCase()}).limit(1).then(user => {
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
            const user = await UserModel.findOne({ username: username.toLowerCase() }).lean();

            if (isEmpty(user)) { return Promise.reject('User does not exist.'); }
            return user;
        },
        async getUserById(id) {
            const user = await UserModel.findById( id ).lean();

            if (isEmpty(user)) { return Promise.reject('User does not exist.'); }
            return user;
        },
        async getPublicUser(id) {
            return await UserModel
                                .findById(id)
                                .lean()
                                .select(['username', 'name', 'profilePicURL']);
        },
        async getFriends(params) {
            const user = await UserModel
                                .findOne({ username: params.user.username.toLowerCase() })
                                .lean()
                                .populate({
                                    path: 'friends.friend',
                                    select: ['username', 'name', 'profilePicURL']
                                });
            return user.friends;
        },
        async getFriendRequestsIn(params) {
            const user = await UserModel.findById(params.user._id)
                                .lean()
                                .populate({
                                    path: 'friendRequestsReceived.from',
                                    select: ['username', 'name', 'profilePicURL']
                                });
            return user.friendRequestsReceived;
        },
        async getFriendRequestsOut(params) {
            const user = await UserModel.findById(params.user._id)
                                .lean()
                                .populate({
                                    path: 'friendRequestsSent.to',
                                    select: ['username']
                                });
            return user.friendRequestsSent;
        },
        async fetchAUser(params) {
            if (!isEmpty(params.userId)) {
                await FS.ensureFriends(params.user, params.userId);
                const user = await US.getUserById(params.userId);
                const bareUser = await US.getNonSensitiveUserInfo(user);
                const usersPostsForRequester = await PS.fetchUsersPosts(params);
                bareUser.posts = usersPostsForRequester;
                return bareUser;
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
            const acceptableFields = new Set(['birthday', 'bio', 'name', 'gender', 'profilePicURL']);
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
        async createNotificationCollector(_params) {
            return await NotificationCollectorModel.create({
                notifications: []
            });
        },
        async getFeedCollectorId(userId, _params) {
            const user = await US.getUserById(userId);
            return user.feedCollector;
        },
        async getFullOwnProfile(params) {
            const user = params.user;
            const friends = await US.getFriends(params);
            const groups = await GS.getGroups(params);
            const posts = await PS.getAllSelfPosts(params);
            user.friends = friends;
            user.groups = groups;
            user.posts = posts;
            return user;
        },
        async getUsersId(params) {
            const user = await UserModel.findOne({ username: params.username.toLowerCase() });
            if (isEmpty(user)) { return Promise.reject(`${params.username} is not a valid user.`) }
            return user._id.toString();
        },
        async ensureNoMoreThanOneMedia(params) {
            if (!params.files) { return; }
            const numFiles = params.files.length;

            if (numFiles > 1) {
                return Promise.reject(`Only one file can be accepted. Media objects detected: ${numFiles}`);
            }
            return;
        },
        async deleteProfilePicture(params) {
            // Refresh user object
            params.user = await US.getUser(params.user.username);
            await IS.deleteFile(params.user.profilePicURL);

            params.field = 'profilePicURL';
            params.newValue = '';

            return await US.updateUserProfile(params);
        },
        async updateProfilePicture(params) {
            // Refresh user object
            params.user = await US.getUser(params.user.username);

            await US.conditionalRemoveProfilePicture(params);
            await US.ensureNoMoreThanOneMedia(params);

            // Return user object if no needed update
            if ((params.user.profilePicURL === '') && (!params.files)) {
                return params.user;
            }

            // Get the URL if a file was sent
            const newValue = (params.files)
                ? await IS.uploadMedia(params.files)
                : '';

            params.field = 'profilePicURL';
            params.newValue = newValue;

            return await US.updateUserProfile(params);
        },
        async conditionalRemoveProfilePicture(params) {
            const profilePicURL = params.user.profilePicURL;
            if (!isEmpty(profilePicURL)) {
                return await US.deleteProfilePicture(params);
            }
            return;
        },
        async getPosterById(id, params) {
            return await UserModel
                .findById(id)
                .select(['username', 'name', 'email', 'profilePicURL'])
                .lean();
        }
    }
}
