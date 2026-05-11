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

    /**
     * Manipula a requisição para encontrar todos os caminhos mais curtos (BFS).
     */
    getShortestPath(req, res) {
        const { source, target } = req.query;

        if (!source || !target) {
            return res.status(400).json({ error: 'Os parâmetros "source" e "target" são obrigatórios.' });
        }

        try {
            const result = graphService.findAllShortestPaths(source, target);

            if (result.distance === -1 || result.paths.length === 0) {
                return res.status(404).json({ message: 'Nenhum caminho encontrado.' });
            }

            res.status(200).json(result);
        } catch (error) {
            console.error('Erro no controller ao buscar caminho mais curto:', error);
            res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }

    /**
     * Manipula a requisição para encontrar caminhos com até 8 arestas (Busca A*).
     */
    getFixedLengthPath(req, res) {
        const { source, target } = req.query;
        const maxLength = 8;

        if (!source || !target) {
            return res.status(400).json({ error: 'Os parâmetros "source" e "target" são obrigatórios.' });
        }

        try {
            const result = graphService.findAllPathsUpToLength(source, target, maxLength);

            if (result.paths.length === 0) {
                return res.status(404).json({ message: `Nenhum caminho com até ${maxLength} arestas foi encontrado.` });
            }
            
            // Para consistência, podemos adicionar a distância do primeiro caminho encontrado, se necessário.
            const distance = result.paths.length > 0 ? result.paths[0].length - 1 : -1;

            res.status(200).json({
                distance: distance, // A "distância" aqui pode variar, então usamos a do primeiro resultado.
                paths: result.paths
            });
        } catch (error) {
            console.error('Erro no controller ao buscar caminhos de tamanho fixo:', error);
            res.status(500).json({ error: 'Ocorreu um erro inesperado no servidor.' });
        }
    }
}

module.exports = new GraphController();