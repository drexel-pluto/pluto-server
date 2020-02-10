const express = require('express');
const router = express.Router();
const ErrorService = require('../services/ErrorService');
const PlutoServices = require('../services/PlutoServices');

// Make sure the services havent been initialized
if (typeof PlutoServices.init === "function") { 
    PlutoServices.init();
}

router.post('/create', (req, res) => {
    ( async () => {
        try {
            // const params = {
            //     user: req.user,
            //     text: req.body.text,
            //     files: req.files,
            //     durationDaysUntilArchive: req.body.daysUntilArchive,
            //     audienceIds: req.body.audienceIds,
            //     tag: req.body.tag,
            // }
            const params = JSON.parse(req.body.postParams);
            params.user = req.user;
            params.files = req.files;
            params.durationDaysUntilArchive = params.daysUntilArchive;
            delete params.daysUntilArchive;

            const post = await PlutoServices.PS.createPost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/create', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/all', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
            }
            const posts = await PlutoServices.PS.fetchAllPosts(params);
            return res.status(200).send(posts);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/all', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/delete', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId
            }
            const post = await PlutoServices.PS.deletePost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/delete', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/one', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId
            }
            const post = await PlutoServices.PS.fetchPost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/one', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/from-group', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId
            }
            const posts = await PlutoServices.PS.fetchPostsByGroup(params);
            return res.status(200).send(posts);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/from-group', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/image', (req, res) => {
    ( async () => {
        try {
            const url = await PlutoServices.IS.uploadMedia(req.files);
            return res.status(200).send(url);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/image', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/user/:user', (req, res) => {
    ( async () => {
        try {
            const params = {
                username: req.params.user,
                user: req.user
            }
            const posts = await PlutoServices.PS.fetchUsersPosts(params);
            return res.status(200).send(posts);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/user/:user', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/react', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId,
                amount: req.body.amountToAdd
            }
            const post = await PlutoServices.PS.increaseReactionCount(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', req.originalUrl, err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
