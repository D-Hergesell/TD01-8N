const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

router.get('/actors', graphController.getActors);
router.get('/path', graphController.getShortestPath);
router.get('/paths/all-shortest', graphController.getAllShortestPaths);
router.get('/path/exact', graphController.getFixedLengthPath);
router.get('/graph-visual', graphController.getGraphData);

module.exports = router;