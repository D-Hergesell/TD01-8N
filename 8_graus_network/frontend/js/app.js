document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const actorsDatalist = document.getElementById('actors-list');
    const form = document.getElementById('pathfinder-form');
    const sourceInput = document.getElementById('source-actor');
    const targetInput = document.getElementById('target-actor');
    const shortestPathBtn = document.getElementById('find-shortest-btn');
    const allShortestPathsBtn = document.getElementById('find-all-shortest-btn');
    const btnShowGraph = document.getElementById('btnShowGraph'); // Botão do grafo completo
    const resultsContainer = document.getElementById('results-container');

    /**
     * Popula o <datalist> com os atores obtidos da API.
     */
    async function populateActorsDatalist() {
        try {
            const response = await fetch(`${API_URL}/actors`);
            if (!response.ok) throw new Error(`Erro na rede: ${response.statusText}`);
            const actors = await response.json();
            actorsDatalist.innerHTML = actors.map(actor => `<option value="${actor}"></option>`).join('');
        } catch (error) {
            console.error('Falha ao carregar a lista de atores:', error);
            resultsContainer.innerHTML = `<p>Erro: Não foi possível carregar a lista de atores. O servidor backend está rodando?</p>`;
        }
    }

    /**
     * Função genérica que busca um caminho (curto ou exato) na API.
     */
    async function findPath(endpoint) {
        const source = sourceInput.value;
        const target = targetInput.value;

        if (!source || !target) {
            resultsContainer.innerHTML = '<p>Por favor, preencha ambos os campos de ator.</p>';
            return;
        }

        let message = endpoint === '/path' ? 'Buscando o caminho mais curto...' : 'Buscando TODOS os caminhos com 8 conexões...';
        resultsContainer.innerHTML = `<p>${message}</p>`;

        try {
            const query = `?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
            const response = await fetch(`${API_URL}${endpoint}${query}`);
            const data = await response.json();
            renderResults(data, response.status);
        } catch (error) {
            resultsContainer.innerHTML = `<p>Ocorreu um erro de comunicação com a API.</p>`;
        }
    }

    // Eventos dos botões de busca
    form.addEventListener('submit', (event) => event.preventDefault());
    shortestPathBtn.addEventListener('click', () => findPath('/path'));
    allShortestPathsBtn.addEventListener('click', () => findPath('/path/exact'));

    /**
     * EVENTO DO BOTÃO: MOSTRAR GRAFO COMPLETO (Amostra de 40 atores)
     */
    if (btnShowGraph) {
        btnShowGraph.addEventListener('click', async () => {
            const cyContainer = document.getElementById('cy');
            cyContainer.style.display = 'block';
            cyContainer.innerHTML = '<h3 style="text-align:center; padding-top:250px;">Carregando amostra do grafo...</h3>';

            try {
                const response = await fetch('/api/graph-visual');
                const data = await response.json();
                cyContainer.innerHTML = '';

                // Pega só 40 atores para não travar
                const sampleNodes = (data.nodes || []).slice(0, 40);
                const validIds = new Set(sampleNodes.map(n => n.data.id));
                const sampleEdges = (data.edges || []).filter(e => validIds.has(e.data.source) && validIds.has(e.data.target));
                const elementsArray = [...sampleNodes, ...sampleEdges];

                cytoscape({
                    container: cyContainer,
                    elements: elementsArray,
                    style: [
                        { selector: 'node', style: { 'label': 'data(label)', 'background-color': '#007bff', 'color': '#333', 'font-size': '10px', 'width': 20, 'height': 20, 'text-valign': 'bottom' } },
                        { selector: 'edge', style: { 'width': 2, 'line-color': '#adadad', 'curve-style': 'bezier' } }
                    ],
                    layout: { name: 'cose', nodeRepulsion: 400000, idealEdgeLength: 100, animate: true }
                });
            } catch (error) {
                cyContainer.innerHTML = '';
                alert('ERRO ao carregar grafo: ' + error.message);
            }
        });
    }

    /**
     * FUNÇÃO DE RENDERIZAR O RESULTADO (Lista + Árvore BFS)
     */
    function renderResults(data, status) {
        if (status !== 200) {
            resultsContainer.innerHTML = `<h2>Resultado</h2><p>${data.message || data.error || 'Não foi possível encontrar conexão.'}</p>`;
            return;
        }

        const { distance, path, paths } = data;
        const degrees = Math.ceil(distance / 2);

        // O SEGREDO PARA NÃO BUGAR A TELA:
        const pathList = paths || (path ? [path] : []);
        const totalPaths = pathList.length;
        const MAX_PATHS = 10; // Desenha no máximo 10 caminhos
        const pathsToShow = pathList.slice(0, MAX_PATHS);

        let html = `<h2>Conexão Encontrada!</h2><p><strong>Graus de separação:</strong> ${degrees} (Distância: ${distance} arestas)</p>`;

        if (totalPaths > 1) {
            html += `<p>Foram encontrados <strong>${totalPaths}</strong> caminhos no total. (Mostrando os primeiros ${Math.min(totalPaths, MAX_PATHS)} para o grafo não virar uma mancha preta):</p>`;
        } else {
            html += `<p><strong>Caminho em formato de lista:</strong></p>`;
        }

        // Cria as listas de texto (apenas para os caminhos limitados)
        pathsToShow.forEach((currentPath, index) => {
            if (totalPaths > 1) html += `<h3>Caminho ${index + 1}</h3>`;
            html += `<ul>`;
            currentPath.forEach(node => {
                const [type, name] = node.split(': ');
                html += `<li class="${type === 'Ator' ? 'actor' : 'movie'}"><strong>${type}:</strong> ${name}</li>`;
            });
            html += `</ul>`;
        });

        // Se houver mais caminhos que o limite, avisa o usuário
        if (totalPaths > MAX_PATHS) {
            html += `<p style="color: #666; font-style: italic;">... e mais ${totalPaths - MAX_PATHS} caminhos ocultos.</p>`;
        }

        // ALTURA INTELIGENTE: Grande para muitos caminhos, menor para um caminho só
        const alturaCaixa = totalPaths > 1 ? '750px' : '500px';

        // Adiciona a caixa do Grafo com a altura ajustada
        html += `<hr style="margin: 20px 0;"><h3>Grafo do Relacionamento (BFS)</h3><div id="path-cy" style="width: 100%; height: ${alturaCaixa}; border: 2px solid #ccc; background: #fdfdfd;"></div>`;
        resultsContainer.innerHTML = html;

        // Monta os dados do BFS usando APENAS os caminhos limitados
        const elements = [];
        const addedNodes = new Set(), addedEdges = new Set();

        pathsToShow.forEach(currentPath => {
            for (let i = 0; i < currentPath.length; i++) {
                const isActor = currentPath[i].startsWith('Ator:');
                const name = currentPath[i].replace('Ator: ', '').replace('Filme: ', '');

                if (!addedNodes.has(currentPath[i])) {
                    elements.push({ data: { id: currentPath[i], label: name, type: isActor ? 'actor' : 'movie' } });
                    addedNodes.add(currentPath[i]);
                }
                if (i > 0) {
                    const edgeId = currentPath[i - 1] + '->' + currentPath[i];
                    if (!addedEdges.has(edgeId)) {
                        elements.push({ data: { source: currentPath[i - 1], target: currentPath[i] } });
                        addedEdges.add(edgeId);
                    }
                }
            }
        });

        // Desenha a Árvore do BFS
        setTimeout(() => {
            cytoscape({
                container: document.getElementById('path-cy'),
                elements: elements,
                
                userZoomingEnabled: false, // Continua blindado contra o zoom do touchpad!
                userPanningEnabled: true,  // Agora você pode clicar no fundo branco e arrastar a tela!
                minZoom: 0.8,              // PROÍBE o Cytoscape de encolher demais e ficar fosco

                style: [
                    {
                        selector: 'node',
                        style: {
                            'label': 'data(label)',
                            'background-color': '#fff',
                            'border-width': 2,
                            'border-color': '#000',
                            'color': '#000',
                            'font-size': '14px',     // Fonte maior!
                            'font-weight': 'bold',   // Negrito para leitura perfeita
                            'text-valign': 'bottom',
                            'text-margin-y': 6,
                            'width': 35,             // Bolinhas maiores
                            'height': 35,
                            'text-wrap': 'wrap',
                            'text-max-width': '110px'
                        }
                    },
                    {
                        selector: 'edge',
                        style: {
                            'width': 2,
                            'line-color': '#4285F4',
                            'curve-style': 'bezier',
                            'target-arrow-shape': 'triangle',
                            'target-arrow-color': '#4285F4'
                        }
                    }
                ],
                layout: { 
                    name: 'breadthfirst', 
                    directed: true, 
                    spacingFactor: 1.1, // Juntamos um pouquinho os nós para caber melhor
                    padding: 30 
                }
            });
        }, 50);
    }

    // Relógio XP
    function updateClock() {
        const clockElement = document.getElementById('clock');
        if (!clockElement) return;
        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        clockElement.textContent = `${hours % 12 || 12}:${minutes} ${ampm}`;
    }

    populateActorsDatalist();
    setInterval(updateClock, 1000);
    updateClock(); 
});