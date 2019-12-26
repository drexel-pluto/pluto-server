const express = require('express');
const router = express.Router();
const UserService = require('../services/UserService');
const PostService = require('../services/PostService');
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

module.exports = router;
