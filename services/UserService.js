const UserModel = require('../models/User');
const { isEmpty } = require('./helpers');
const bcrypt = require('bcryptjs');

const US = {
    async createUser(params) {
        await US.checkParams(params);
        await US.isUsernameAvailable(params);
        await US.checkEmailExists(params);

        params.hashedPass = await US.encryptPassword(params);
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
            name: params.name
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
        const user = await UserModel.find({ username }).limit(1);

        if (isEmpty(user)) { return Promise.reject('User does not exist.'); }
        return user[0];
    },
    async getFriends(params) {
        const user = await UserModel
                            .find({ username: params.user.username })
                            .limit(1)
                            .populate({
                                path: 'friends.friend',
                                select: ['username', 'name', 'email', 'profilePicURL']
                            });
        return user[0].friends;
    }
}

module.exports = US;
