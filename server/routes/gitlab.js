// Express routes — thin layer, delegates to controllers

const express = require('express');
const router = express.Router();
const gitlabController = require('../controllers/gitlab');

router.post('/test-connection', gitlabController.testConnection);
router.post('/check-all', gitlabController.checkAll);
router.post('/list-projects', gitlabController.listProjects);
router.post('/project-merge-requests', gitlabController.getProjectMergeRequests);
router.post('/project-issues', gitlabController.getProjectIssues);
router.post('/project-branches', gitlabController.getProjectBranches);
router.post('/project-commits', gitlabController.getProjectCommits);
router.post('/commit-details', gitlabController.getCommitDetails);
router.post('/project-tags', gitlabController.getProjectTags);
router.post('/branch-status', gitlabController.getBranchStatus);
router.post('/project-members', gitlabController.getProjectMembers);
router.post('/mr-details', gitlabController.getMergeRequestDetails);
router.post('/mr-changes', gitlabController.getMergeRequestChanges);
router.post('/mr-create', gitlabController.createProjectMergeRequest);
router.post('/mr-merge', gitlabController.mergeProjectMergeRequest);
router.post('/tag-create', gitlabController.createProjectTag);
router.post('/tag-delete', gitlabController.deleteProjectTag);

module.exports = router;