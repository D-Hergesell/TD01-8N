const fs = require('fs');
const path = require('path');

class GraphService {
    constructor() {
        this.graph = new Map();
        this.types = new Map();
        this.actorsList = [];
        this.buildGraph();
    }

    /**
     * Carrega os dados do JSON e constrói o grafo.
     */
    buildGraph() {
        const dataPath = path.join(__dirname, '../../data/latest_movies.json');
        const moviesData = JSON.parse(fs.readFileSync(dataPath, 'utf8'));

        this.graph.clear();
        this.types.clear();

        moviesData.forEach((movie) => {
            if (!movie.id || !movie.title || !Array.isArray(movie.cast)) return;
            
            const movieNode = `Filme: ${movie.id} - ${movie.title}`;
            this._addVertex(movieNode, "filme");

            movie.cast.forEach((actor) => {
                this._addVertex(actor, "ator");
                this._addEdge(movieNode, actor);
            });
        });

        this.actorsList = [...this.types.entries()]
            .filter(([, type]) => type === "ator")
            .map(([name]) => name)
            .sort((a, b) => a.localeCompare(b));
    }

    _addVertex(name, type) {
        if (!this.graph.has(name)) {
            this.graph.set(name, new Set());
            this.types.set(name, type);
        }
    }

    _addEdge(source, destination) {
        this.graph.get(source).add(destination);
        this.graph.get(destination).add(source);
    }

    getAllActors() {
        return this.actorsList;
    }

    /**
     * Encontra todos os caminhos mais curtos entre dois atores usando BFS.
     */
    findAllShortestPaths(sourceActor, targetActor) {
        if (!this.graph.has(sourceActor) || !this.graph.has(targetActor)) {
            return { distance: -1, paths: [] };
        }

        const queue = [sourceActor];
        const distances = new Map([[sourceActor, 0]]);
        const predecessors = new Map();
        let shortestDistance = Infinity;
        let queueIndex = 0;

        while (queueIndex < queue.length) {
            const currentNode = queue[queueIndex++];
            const currentDist = distances.get(currentNode);

            if (currentDist >= shortestDistance) continue;

            const neighbors = [...(this.graph.get(currentNode) || new Set())].sort((a, b) => a.localeCompare(b));

            for (const neighbor of neighbors) {
                const newDist = currentDist + 1;
                if (newDist > shortestDistance) continue;

                if (!distances.has(neighbor)) {
                    distances.set(neighbor, newDist);
                    predecessors.set(neighbor, [currentNode]);
                    if (neighbor === targetActor) {
                        shortestDistance = newDist;
                    } else {
                        queue.push(neighbor);
                    }
                } else if (distances.get(neighbor) === newDist) {
                    const preds = predecessors.get(neighbor) || [];
                    if (!preds.includes(currentNode)) {
                        preds.push(currentNode);
                        predecessors.set(neighbor, preds);
                    }
                }
            }
        }

        if (!distances.has(targetActor)) {
            return { distance: -1, paths: [] };
        }

        const paths = this._reconstructPaths(predecessors, sourceActor, targetActor);
        return { distance: paths.length > 0 ? paths[0].length - 1 : -1, paths };
    }

    _reconstructPaths(predecessors, source, destination) {
        const allPaths = [];
        const reconstructRecursive = (current, pathReversed) => {
            if (current === source) {
                allPaths.push([...pathReversed].reverse());
                return;
            }
            const preds = predecessors.get(current) || [];
            for (const pred of preds) {
                reconstructRecursive(pred, [...pathReversed, pred]);
            }
        };
        reconstructRecursive(destination, [destination]);
        return allPaths;
    }

    /**
     * Encontra todos os caminhos com até `maxLength` arestas usando uma busca A* (guiada).
     */
    findAllPathsUpToLength(sourceActor, targetActor, maxLength = 8) {
        const distancesToTarget = this._calculateDistancesTo(targetActor);
        if (!distancesToTarget.has(sourceActor) || distancesToTarget.get(sourceActor) > maxLength) {
            return { paths: [] };
        }

        const foundPaths = [];
        const foundPathsSet = new Set(); // Para garantir a unicidade dos caminhos

        const searchRecursive = (path) => {
            const currentNode = path[path.length - 1];
            const currentDist = path.length - 1;
            const remainingEdges = maxLength - currentDist;

            const shortestDistRemaining = distancesToTarget.get(currentNode);
            if (shortestDistRemaining === undefined || shortestDistRemaining > remainingEdges) {
                return;
            }

            if (currentNode === targetActor) {
                if (currentDist > 0 && currentDist <= maxLength) {
                    const pathKey = path.join('||');
                    if (!foundPathsSet.has(pathKey)) {
                        foundPaths.push([...path]);
                        foundPathsSet.add(pathKey);
                    }
                }
                return;
            }
            
            if (currentDist === maxLength) return;

            const neighbors = [...(this.graph.get(currentNode) || new Set())]
                .filter(neighbor => {
                    if (path.includes(neighbor)) return false;
                    const dist = distancesToTarget.get(neighbor);
                    return dist !== undefined && dist <= remainingEdges - 1;
                })
                .sort((a, b) => {
                    const distA = distancesToTarget.get(a) ?? Infinity;
                    const distB = distancesToTarget.get(b) ?? Infinity;
                    return distA !== distB ? distA - distB : a.localeCompare(b);
                });

            for (const neighbor of neighbors) {
                path.push(neighbor);
                searchRecursive(path);
                path.pop(); // Backtrack
            }
        };

        searchRecursive([sourceActor]);
        return { paths: foundPaths };
    }

    /**
     * Calcula a distância de todos os nós alcançáveis até um nó de destino (BFS reverso).
     */
    _calculateDistancesTo(destination) {
        const distances = new Map([[destination, 0]]);
        const queue = [destination];
        let queueIndex = 0;

        while (queueIndex < queue.length) {
            const currentNode = queue[queueIndex++];
            const currentDist = distances.get(currentNode);
            const neighbors = this.graph.get(currentNode) || new Set();

            for (const neighbor of neighbors) {
                if (!distances.has(neighbor)) {
                    distances.set(neighbor, currentDist + 1);
                    queue.push(neighbor);
                }
            }
        }
        return distances;
    }
}

module.exports = new GraphService();