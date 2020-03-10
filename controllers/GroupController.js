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
                groupName: req.body.groupName
            }
            const group = await PlutoServices.GS.createNewGroup(params);
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
                friendsToAdd: req.body.friendsToAdd
            }
            const group = await PlutoServices.GS.addUsersToGroup(params);
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
                friendsToRemove: req.body.friendsToRemove
            }
            const group = await PlutoServices.GS.pullManyUsersFromGroup(params);
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
            const group = await PlutoServices.GS.editGroupName(params);
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
            const group = await PlutoServices.GS.deleteGroup(params);
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
            const groups = await PlutoServices.GS.getGroups(params);
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
            const group = await PlutoServices.GS.getPopulatedGroup(params);
            return res.status(200).send(group);
        }
        catch (err) {
            const error = await ErrorService.buildError(500, 'GroupController', '/', err);
            return res.status(500).send(error);
        }
    })();
});

module.exports = router;
