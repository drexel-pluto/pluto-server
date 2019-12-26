const express = require('express');
const router = express.Router();
const ErrorService = require('../services/ErrorService');
const GroupService = require('../services/GroupService');

router.post('/create', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupName: req.body.groupName
            }
            const group = await GroupService.createNewGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/create', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/members/add', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId,
                friendToAdd: req.body.friendToAdd
            }
            const group = await GroupService.addUserToGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/members/add', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/members/remove', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId,
                friendToRemove: req.body.friendToRemove
            }
            const group = await GroupService.pullUserFromGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/members/remove', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/edit-name', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId,
                newTitle: req.body.newTitle
            }
            const group = await GroupService.editGroupName(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/edit-name', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/delete', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId
            }
            const group = await GroupService.deleteGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/delete', err);
            return res.status(500).send(error);
        }
    })();
});

router.get('/all', (req, res) => {
    ( async () => {
        try {
            const params = { user: req.user }
            const groups = await GroupService.getGroups(params);
            return res.status(200).send(groups);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/', err);
            return res.status(500).send(error);
        }
    })();
});

router.post('/one', (req, res) => {
    ( async () => {
        try {
            const params = {
                user: req.user,
                groupId: req.body.groupId
            }
            const group = await GroupService.getGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/', err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
