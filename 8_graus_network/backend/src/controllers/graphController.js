const graphService = require('../services/graphService');

class GraphController {
    getActors(req, res) {
        try {
            const actors = graphService.getAllActors();
            res.status(200).json(actors);
        } catch (error) {
            res.status(500).json({ error: 'Erro ao buscar lista de atores.' });
        }
    }

    getShortestPath(req, res) {
        const { source, target } = req.query; // Mudado para query params para ser mais RESTful
        const maxDepth = parseInt(req.query.maxDepth) || 8;

        if (!source || !target) {
            return res.status(400).json({ error: 'Os parâmetros "source" e "target" são obrigatórios.' });
        }

        try {
            // Chama o método corrigido no serviço
            const result = graphService.findShortestPath(source, target, maxDepth);

            if (result.error) {
                return res.status(404).json(result);
            }

            // Se a distância for -1, significa que não há caminho
            if (result.distance === -1) {
                return res.status(404).json({ message: result.message || 'Relacionamento inexistente dentro do limite de profundidade.' });
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('Erro no controller ao buscar caminho:', error);
            res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }

    getFixedLengthPath(req, res) {
        const { source, target } = req.query;
        const exactDepth = 8; // Conforme solicitado, busca por 8 conexões exatas.

        if (!source || !target) {
            return res.status(400).json({ error: 'Os parâmetros "source" e "target" são obrigatórios.' });
        }

        try {
            const result = graphService.findFixedLengthPath(source, target, exactDepth);

            if (result.error) {
                return res.status(404).json(result);
            }

            if (result.distance === -1 || result.paths.length === 0) {
                return res.status(404).json({ message: result.message || 'Nenhum caminho com a profundidade exata foi encontrado.' });
            }

            res.status(200).json({ distance: result.distance, paths: result.paths });
        } catch (error) {
            console.error('Erro no controller ao buscar caminho de tamanho fixo:', error);
            res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }

    getAllShortestPaths(req, res) {
        const { source, target } = req.query;

        if (!source || !target) {
            return res.status(400).json({ error: 'Os parâmetros "source" e "target" são obrigatórios.' });
        }

        try {
            // A profundidade máxima (8) já é o padrão no método do serviço
            const result = graphService.findAllShortestPaths(source, target);

            if (result.error) {
                return res.status(404).json(result);
            }

            if (result.distance === -1 || result.paths.length === 0) {
                return res.status(404).json({ message: result.message || 'Nenhum caminho encontrado.' });
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('Erro no controller ao buscar todos os caminhos mais curtos:', error);
            res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }
}

module.exports = new GraphController();
