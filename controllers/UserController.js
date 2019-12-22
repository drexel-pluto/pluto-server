const express = require('express');
const router = express.Router();
const UserService = require('../services/UserService');
const ErrorService = require('../services/ErrorService');

const JwtStrategy = require('passport-jwt').Strategy;
const ExtractJwt = require('passport-jwt').ExtractJwt;

router.post('/login', (req, res) => {
    ( async () => {
        try {
            const params = {
                username: req.body.username,
                email: req.body.email,
                password: req.body.password
            }
            const user = await UserService.loginUser(params);
            return res.status(200).send(user);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'UserController', '/create', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/create', (req, res) => {
    ( async () => {
        try {
            const params = {
                username: req.body.username,
                name: req.body.name,
                email: req.body.email,
                password: req.body.password
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
