// Express routes — thin layer, delegates to controllers

const express = require('express');
const router = express.Router();
const gitlabController = require('../controllers/gitlab');

router.post('/test-connection', gitlabController.testConnection);
router.post('/check-all', gitlabController.checkAll);
router.post('/list-projects', gitlabController.listProjects);
router.post('/project-merge-requests', gitlabController.getProjectMergeRequests);
router.post('/project-issues', gitlabController.getProjectIssues);

module.exports = router;