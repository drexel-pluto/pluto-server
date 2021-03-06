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
            //     tags: req.body.tags,
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

router.post('/hide', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId
            }
            const user = await PlutoServices.US.hidePost(params);
            return res.status(200).send(user);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/hide', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/report', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId
            }
            console.log("REPORTING")
            const report = await PlutoServices.PS.reportPost(params);
            await PlutoServices.US.hidePost(params);
            
            return res.status(200).send(report);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', '/hide', err);
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

router.post('/comment', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId,
                text: req.body.text
            }
            const post = await PlutoServices.CS.sendCommentToPost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', req.originalUrl, err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/sub-comment', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId,
                text: req.body.text,
                replyTo: req.body.replyTo
            }
            const post = await PlutoServices.CS.sendCommentToComment(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', req.originalUrl, err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/:tag', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                tag: req.params.tag
            }
            const posts = await PlutoServices.PS.getPostsByTag(params);
            return res.status(200).send(posts);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', req.originalUrl, err);
            return res.status(500).send(error);
        }
    })();
});

router.delete('/comment', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                postId: req.body.postId,
                commentId: req.body.commentId
            }
            const post = await PlutoServices.CS.deleteCommentOnPost(params);
            return res.status(200).send(post);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'PostController', req.originalUrl, err);
            return res.status(500).send(error);
        }
    })();
});



module.exports = router;
