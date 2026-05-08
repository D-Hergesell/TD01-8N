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
        
        // Salvamos na classe
        this.moviesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        this.moviesData.forEach(movie => {
            const movieNode = `Filme: ${movie.title}`;
            if (!this.graph.has(movieNode)) {
                this.graph.set(movieNode, new Set());
            }

            movie.cast.forEach(actor => {
                const actorNode = `Ator: ${actor}`;
                this.actorsList.add(actor);

                if (!this.graph.has(actorNode)) {
                    this.graph.set(actorNode, new Set());
                }

                this.graph.get(movieNode).add(actorNode);
                this.graph.get(actorNode).add(movieNode);
            });
        });
    }

    getAllActors() {
        return Array.from(this.actorsList).sort();
    }

    /**
     * Encontra TODOS os caminhos mais curtos entre dois atores usando BFS + DFS.
     * @param {string} sourceActor - O nome do ator de origem.
     * @param {string} targetActor - O nome do ator de destino.
     * @param {number} maxDepth - A profundidade máxima da busca.
     * @returns {object} - Um objeto com a distância e uma lista de todos os caminhos mais curtos.
     */
    findAllShortestPaths(sourceActor, targetActor, maxDepth = 8) {
        const startNode = `Ator: ${sourceActor}`;
        const endNode = `Ator: ${targetActor}`;

        if (!this.graph.has(startNode) || !this.graph.has(endNode)) {
            return { error: 'Um ou ambos os atores não foram encontrados no grafo.' };
        }

        // Passo 1: BFS para encontrar as distâncias de todos os nós a partir da origem.
        const distances = new Map();
        const queue = [startNode];
        distances.set(startNode, 0);

        while (queue.length > 0) {
            const u = queue.shift();
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

        // Passo 2: Verificar se o destino foi alcançado e reconstruir os caminhos com DFS.
        if (!distances.has(endNode)) {
            return { distance: -1, paths: [], message: `Nenhum relacionamento encontrado com menos de ${maxDepth} arestas.` };
        }

        const shortestDist = distances.get(endNode);
        const allPaths = [];

        const findPathsDfs = (currentNode, currentPath) => {
            currentPath.unshift(currentNode); // Adiciona no início para construir o caminho na ordem correta

            if (currentNode === startNode) {
                allPaths.push([...currentPath]);
            } else {
                const currentDist = distances.get(currentNode);
                const neighbors = this.graph.get(currentNode) || new Set();
                for (const neighbor of neighbors) {
                    if (distances.has(neighbor) && distances.get(neighbor) === currentDist - 1) {
                        findPathsDfs(neighbor, currentPath);
                    }
                }
            }
            currentPath.shift(); // Backtrack
        };

        findPathsDfs(targetActor, []);

        // Usa a nova função para gerar todas as combinações de filmes (vai restaurar os 3.830)
        const formattedPaths = this._expandActorPaths(allPaths);

        return { distance: shortestDist, paths: formattedPaths };
    }

    /**
     * Encontra TODOS os caminhos de uma profundidade exata usando Busca em Profundidade (DFS).
     * @param {string} sourceActor - O nome do ator de origem.
     * @param {string} targetActor - O nome do ator de destino.
     * @param {number} exactDepth - A profundidade exata do caminho a ser encontrado.
     * @returns {object} - Um objeto com a distância e uma lista de todos os caminhos encontrados.
     */
    findFixedLengthPath(sourceActor, targetActor, exactDepth = 8) {
        const startNode = `Ator: ${sourceActor}`;
        const endNode = `Ator: ${targetActor}`;

        if (!this.graph.has(startNode) || !this.graph.has(endNode)) {
            return { error: 'Um ou ambos os atores não foram encontrados no grafo.', paths: [] };
        }

        const allPaths = [];

        const findPathsDfs = (currentNode, depth, path) => {
            path.push(currentNode);

            if (depth === 0) {
                if (currentNode === endNode) {
                    allPaths.push([...path]); // Adiciona uma cópia do caminho encontrado
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

        findPathsDfs(sourceActor, exactDepth, []);

        // Usa a nova função para gerar todas as combinações de filmes
        const formattedPaths = this._expandActorPaths(allPaths);

        return {
            distance: allPaths.length > 0 ? exactDepth : -1,
            paths: formattedPaths,
            message: formattedPaths.length === 0 ? `Nenhum relacionamento com exatamente ${exactDepth} arestas encontrado.` : undefined
        };
    }

    getFullGraphData() {
    const nodes = Array.from(this.actorsList).map(actor => ({ 
        data: { id: actor, label: actor } 
    }));
    
    const edgesMap = new Map();

    // Lógica para contar as conexões (arestas) entre atores
    this.moviesData.forEach(movie => {
        const cast = movie.cast;
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
_expandActorPaths(allPaths) {
        const finalPaths = [];

        for (const path of allPaths) {
            // Inicia o caminho com o primeiro ator
            let expanded = [ [`Ator: ${path[0]}`] ];

            // Passa por cada dupla de atores no caminho
            for (let i = 0; i < path.length - 1; i++) {
                const a1 = path[i];
                const a2 = path[i + 1];
                const sharedMovies = Array.from(this.graph.get(a1).get(a2));

                const nextExpanded = [];
                
                // Para cada caminho que estamos montando, multiplica pelos filmes em comum
                for (const currentPrefix of expanded) {
                    for (const movie of sharedMovies) {
                        nextExpanded.push([...currentPrefix, `Filme: ${movie}`, `Ator: ${a2}`]);
                    }
                }
                expanded = nextExpanded;
            }

            finalPaths.push(...expanded);
        }

        return finalPaths;
    }
}

module.exports = new GraphService();