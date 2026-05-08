const fs = require('fs');
const path = require('path');

class GraphService {
    constructor() {
        this.graph = new Map();
        this.actorsList = new Set();
        this.moviesData = [];
        this.buildGraph();
    }

    buildGraph() {
        const dataPath = path.join(__dirname, '../../data/latest_movies.json');
        
        try {
            this.moviesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
        } catch (error) {
            console.error("Erro ao carregar dados:", error);
            return;
        }

        this.moviesData.forEach(movie => {
            // Identificação única por ID para evitar colisões de títulos homônimos
            const movieNode = `Filme: ${movie.title.trim()} (ID: ${movie.id})`;
            
            if (!this.graph.has(movieNode)) {
                this.graph.set(movieNode, new Set());
            }

            // Limpeza de duplicatas no elenco dentro do mesmo filme
            const uniqueCast = [...new Set(movie.cast.map(a => a.trim()))];

            uniqueCast.forEach(actorName => {
                const actorNode = `Ator: ${actorName}`;
                this.actorsList.add(actorName);

                if (!this.graph.has(actorNode)) {
                    this.graph.set(actorNode, new Set());
                }

                // Conexões bidirecionais
                this.graph.get(movieNode).add(actorNode);
                this.graph.get(actorNode).add(movieNode);
            });
        });
    }

    getAllActors() {
        return Array.from(this.actorsList).sort();
    }

    /**
     * Encontra TODOS os caminhos mais curtos entre dois atores usando BFS + DFS Otimizado.
     */
    findAllShortestPaths(sourceActor, targetActor, maxDepth = 16) {
        const startNode = `Ator: ${sourceActor.trim()}`;
        const endNode = `Ator: ${targetActor.trim()}`;

        if (!this.graph.has(startNode) || !this.graph.has(endNode)) {
            return { error: 'Ator não encontrado no sistema.' };
        }

        // Passo 1: BFS para mapear distâncias
        const distances = new Map();
        const queue = [startNode];
        distances.set(startNode, 0);

        let head = 0; 
        while (head < queue.length) {
            const u = queue[head++];
            const distU = distances.get(u);

            if (distU >= maxDepth) continue;

            const neighbors = this.graph.get(u) || new Set();
            for (const v of neighbors) {
                if (!distances.has(v)) {
                    distances.set(v, distU + 1);
                    queue.push(v);
                }
            }
        }

        if (!distances.has(endNode)) {
            return { distance: -1, paths: [], message: "Sem conexão no limite de profundidade." };
        }

        const shortestDist = distances.get(endNode);
        const allPaths = [];

        // Passo 2: DFS para reconstruir todos os caminhos mínimos
        const findPathsDfs = (currentNode, currentPath) => {
            currentPath.unshift(currentNode);

            if (currentNode === startNode) {
                allPaths.push([...currentPath]);
            } else {
                const currentDist = distances.get(currentNode);
                const neighbors = this.graph.get(currentNode) || new Set();
                for (const neighbor of neighbors) {
                    if (distances.get(neighbor) === currentDist - 1) {
                        findPathsDfs(neighbor, currentPath);
                    }
                }
            }
            currentPath.shift(); 
        };

        findPathsDfs(endNode, []);

        return { distance: shortestDist, paths: allPaths };
    }

    /**
     * Encontra TODOS os caminhos de uma profundidade exata usando Busca em Profundidade (DFS).
     * (Método reinserido e atualizado com normalização trim)
     */
    findFixedLengthPath(sourceActor, targetActor, exactDepth = 8) {
        const startNode = `Ator: ${sourceActor.trim()}`;
        const endNode = `Ator: ${targetActor.trim()}`;

        if (!this.graph.has(startNode) || !this.graph.has(endNode)) {
            return { error: 'Um ou ambos os atores não foram encontrados no grafo.', paths: [] };
        }

        const allPaths = [];

        const findPathsDfs = (currentNode, depth, path) => {
            path.push(currentNode);

            if (depth === 0) {
                if (currentNode === endNode) {
                    allPaths.push([...path]);
                }
                path.pop(); // Backtrack
                return;
            }

            const neighbors = this.graph.get(currentNode) || new Set();
            for (const neighbor of neighbors) {
                // Evita ciclos no caminho atual para não haver redundâncias
                if (!path.includes(neighbor)) {
                    findPathsDfs(neighbor, depth - 1, path);
                }
            }

            // Retrocede se nenhum caminho foi encontrado a partir deste nó.
            path.pop();
        };

        findPathsDfs(startNode, exactDepth, []);

        return {
            distance: allPaths.length > 0 ? exactDepth : -1,
            paths: allPaths,
            message: allPaths.length === 0 ? `Nenhum relacionamento com exatamente ${exactDepth} conexões encontrado.` : undefined
        };
    }

    /**
     * Gera os dados para visualização do Grafo no Frontend.
     */
    getFullGraphData() {
        const nodes = Array.from(this.actorsList).map(actor => ({ 
            data: { id: actor, label: actor } 
        }));
        const edgesMap = new Map();

        this.moviesData.forEach(movie => {
            // Garante a mesma limpeza usada na criação do grafo
            const cast = [...new Set(movie.cast.map(a => a.trim()))];
            for (let i = 0; i < cast.length; i++) {
                for (let j = i + 1; j < cast.length; j++) {
                    const pair = [cast[i], cast[j]].sort().join('---');
                    edgesMap.set(pair, (edgesMap.get(pair) || 0) + 1);
                }
            }
        });

        const edges = Array.from(edgesMap.entries()).map(([pair, weight]) => {
            const [source, target] = pair.split('---');
            return { data: { source, target, weight, label: weight } };
        });

        return { nodes, edges };
    }
}

module.exports = new GraphService();