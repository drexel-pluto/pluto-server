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
            const params = {
                user: req.user,
                text: req.body.text,
                // media: req.body.media,
                durationDaysUntilArchive: req.body.daysUntilArchive,
                audienceIds: req.body.audienceIds,
                tag: req.body.tag
            }
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

module.exports = router;
