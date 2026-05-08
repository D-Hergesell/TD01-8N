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

        // CORREÇÃO AQUI: Faltava o "this." bem no começo desta linha!
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
     * Algoritmo de Busca em Largura (BFS) para encontrar TODOS os menores caminhos.
     * @param {string} sourceActor - O nome do ator de origem.
     * @param {string} targetActor - O nome do ator de destino.
     * @param {number} maxDepth - A profundidade máxima da busca (limite de arestas).
     * @returns {object} - Um objeto com a distância e os caminhos encontrados.
     */
    findShortestPath(sourceActor, targetActor, maxDepth = 8) {
        const startNode = `Ator: ${sourceActor}`;
        const endNode = `Ator: ${targetActor}`;

        if (!this.graph.has(startNode) || !this.graph.has(endNode)) {
            return { error: 'Um ou ambos os atores não foram encontrados no grafo.' };
        }

        if (startNode === endNode) {
            return { distance: 0, paths: [[startNode]] }; // Note que agora retorna 'paths' no plural
        }

        const distances = new Map();
        // O segredo: usamos um Set para mapear MÚLTIPLOS predecessores em caso de empate!
        const predecessors = new Map();
        const queue = [startNode];

        distances.set(startNode, 0);
        let shortestDistance = -1;

        while (queue.length > 0) {
            const currentNode = queue.shift();
            const currentDistance = distances.get(currentNode);

            // Otimização de Ouro: Se já achamos o alvo em um nível anterior,
            // não exploramos mais nada que seja mais profundo que ele.
            if (shortestDistance !== -1 && currentDistance >= shortestDistance) {
                continue;
            }

            if (currentDistance >= maxDepth) {
                continue;
            }

            const neighbors = this.graph.get(currentNode) || new Set();

            for (const neighbor of neighbors) {
                if (!distances.has(neighbor)) {
                    // Achou o vizinho pela primeira vez
                    distances.set(neighbor, currentDistance + 1);
                    predecessors.set(neighbor, new Set([currentNode]));
                    queue.push(neighbor);

                    // Se for o destino, gravamos em qual profundidade ele foi achado
                    if (neighbor === endNode) {
                        shortestDistance = currentDistance + 1;
                    }
                } else if (distances.get(neighbor) === currentDistance + 1) {
                    // Achou o vizinho DE NOVO, na MESMA profundidade (Caminho alternativo!)
                    predecessors.get(neighbor).add(currentNode);
                }
            }
        }

        // Se a fila esvaziar e não tivermos achado nada
        if (shortestDistance === -1) {
            return { distance: -1, paths: [], message: `Nenhum relacionamento encontrado com menos de ${maxDepth} arestas.` };
        }

        // DFS rápido para reconstruir todas as rotas andando de trás pra frente
        const allPaths = [];

        const buildPaths = (node, currentPath) => {
            currentPath.unshift(node); // Bota o nó no começo do array

            if (node === startNode) {
                allPaths.push([...currentPath]); // Caminho completo montado
            } else {
                const preds = predecessors.get(node) || new Set();
                for (const pred of preds) {
                    buildPaths(pred, currentPath);
                }
            }

            currentPath.shift(); // Remove para testar outras ramificações (backtrack)
        };

        buildPaths(endNode, []);

        return { distance: shortestDistance, paths: allPaths };
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

        findPathsDfs(endNode, []);

        return { distance: shortestDist, paths: allPaths };
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

        findPathsDfs(startNode, exactDepth, []);

        return {
            distance: allPaths.length > 0 ? exactDepth : -1,
            paths: allPaths,
            message: allPaths.length === 0 ? `Nenhum relacionamento com exatamente ${exactDepth} conexões encontrado.` : undefined
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
}

module.exports = new GraphService();