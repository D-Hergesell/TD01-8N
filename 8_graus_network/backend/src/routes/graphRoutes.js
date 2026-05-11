const express = require('express');
const router = express.Router();
const graphController = require('../controllers/graphController');

// Rota para obter a lista de todos os atores
router.get('/actors', graphController.getActors);

// Rota para encontrar o caminho mais curto entre dois atores (usando BFS)
router.get('/path', graphController.getShortestPath);

// Rota para encontrar caminhos de comprimento fixo (8 arestas) entre dois atores (usando DFS)
router.get('/path/exact', graphController.getFixedLengthPath);

module.exports = router;