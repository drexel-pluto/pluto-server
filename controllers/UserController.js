const express = require('express');
const router = express.Router();
const UserService = require('../services/UserService');
const FriendService = require('../services/FriendService');
const ErrorService = require('../services/ErrorService');
const passport = require('passport');
const authorizeUser = passport.authenticate('jwt', { session: false, failWithError: true });

router.post('/create', (req, res) => {
    ( async () => {
        try {
            const params = {
                username: req.body.username,
                name: req.body.name,
                email: req.body.email,
                password: req.body.password,
                gender: req.body.gender
            }
            const user = await UserService.createUser(params);
            return res.status(200).send(user);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/create', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/friends/request', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                username: req.body.username,
            }
            const friendRequest = await FriendService.sendRequest(params);
            return res.status(200).send(friendRequest);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/request', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/friends/request/reject', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                username: req.body.username
            }
            const friendRequestRejection = await FriendService.rejectFriendRequest(params);
            return res.status(200).send(friendRequestRejection);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/request/reject', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/friends/request/confirm', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                username: req.body.username
            }
            const friendRequestConfirmation = await FriendService.confirmFriendRequest(params);
            return res.status(200).send(friendRequestConfirmation);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/request/confirm', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/friends/request/cancel', authorizeUser, (req, res) => {
    ( async () => {
        try {
            // Going to exploit some logic and flip the params
            // This will allow us to reuse the same functionality as rejecting
            const params = {
                user: req.body,
                username: req.user.username
            }
            const friendRequestRejection = await FriendService.rejectFriendRequest(params);
            return res.status(200).send(friendRequestRejection);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/request/cancel', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/friends/remove', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                username: req.body.username
            }
            const friendRequestRemoval = await FriendService.handleFriendRemoval(params);
            return res.status(200).send(friendRequestRemoval);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/remove', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/friends/requests-in', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = { user: req.user }
            const friendRequestsIn = await UserService.getFriendRequestsIn(params);
            return res.status(200).send(friendRequestsIn);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/requests-in', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/friends/requests-out', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = { user: req.user }
            const friendRequestsOut = await UserService.getFriendRequestsOut(params);
            return res.status(200).send(friendRequestsOut);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends/requests-out', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/friends', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = { user: req.user}
            const friends = await UserService.getFriends(params);
            return res.status(200).send(friends);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/friends', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                userId: req.body.userId
            }
            const user = await UserService.fetchAUser(params);
            return res.status(200).send(user);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/update', authorizeUser, (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                field: req.body.field,
                newValue: req.body.newValue
            }
            const user = await UserService.updateUserProfile(params);
            return res.status(200).send(user);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/update', err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
