document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const actorsDatalist = document.getElementById('actors-list');
    const form = document.getElementById('pathfinder-form');
    const sourceInput = document.getElementById('source-actor');
    const targetInput = document.getElementById('target-actor');
    const shortestPathBtn = document.getElementById('find-shortest-btn');
    const allShortestPathsBtn = document.getElementById('find-all-shortest-btn');
    const resultsContainer = document.getElementById('results-container');

    /**
     * Popula o <datalist> com os atores obtidos da API.
     */
    async function populateActorsDatalist() {
        try {
            const response = await fetch(`${API_URL}/actors`);
            if (!response.ok) {
                throw new Error(`Erro na rede: ${response.statusText}`);
            }
            const actors = await response.json();
            actorsDatalist.innerHTML = actors.map(actor => `<option value="${actor}"></option>`).join('');
        } catch (error) {
            console.error('Falha ao carregar a lista de atores:', error);
            resultsContainer.innerHTML = `<p>Erro: Não foi possível carregar a lista de atores. O servidor backend está rodando?</p>`;
        }
    }

    /**
     * Função genérica que busca um caminho (curto ou exato) na API.
     * @param {string} endpoint - O endpoint da API a ser chamado ('/path' ou '/path/exact').
     */
    async function findPath(endpoint) {
        const source = sourceInput.value;
        const target = targetInput.value;

        if (!source || !target) {
            resultsContainer.innerHTML = '<p>Por favor, preencha ambos os campos de ator.</p>';
            return;
        }

        let message = 'Buscando...';
        if (endpoint === '/path') {
            message = 'Buscando o caminho mais curto...';
        } else if (endpoint === '/path/exact') {
            message = 'Buscando TODOS os caminhos com 8 conexões... Isso pode levar um momento.';
        }
        resultsContainer.innerHTML = `<p>${message}</p>`;

        try {
            const query = `?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
            const response = await fetch(`${API_URL}${endpoint}${query}`);
            const data = await response.json();

            renderResults(data, response.status);

        } catch (error) {
            console.error(`Erro ao buscar o caminho em ${endpoint}:`, error);
            resultsContainer.innerHTML = `<p>Ocorreu um erro de comunicação com a API.</p>`;
        }
    }

    // Impede que o formulário seja enviado ao pressionar Enter
    form.addEventListener('submit', (event) => event.preventDefault());

    // Adiciona os listeners aos botões
    shortestPathBtn.addEventListener('click', () => findPath('/path')); // Busca UM caminho mais curto
    allShortestPathsBtn.addEventListener('click', () => findPath('/path/exact')); // Busca TODOS os caminhos de tamanho 8

    /**
     * Renderiza os resultados da busca no container apropriado.
     * @param {object} data - Os dados retornados pela API.
     * @param {number} status - O código de status HTTP da resposta.
     */
    function renderResults(data, status) {
        if (status !== 200) {
            resultsContainer.innerHTML = `<h2>Resultado</h2><p>${data.message || data.error || 'Não foi possível encontrar uma conexão.'}</p>`;
            return;
        }

        // A resposta pode ter 'path' (singular) ou 'paths' (plural)
        const { distance, path, paths } = data;
        const degrees = Math.ceil(distance / 2); // Cada "grau" é um par Ator -> Filme

        let html = `<h2>Conexão Encontrada!</h2>`;
        html += `<p><strong>Graus de separação:</strong> ${degrees}</p>`;

        // Cria uma lista de caminhos para iterar, funcionando para ambos os casos
        const pathList = paths || (path ? [path] : []);

        if (pathList.length > 1) {
            html += `<p>Foram encontrados <strong>${pathList.length}</strong> caminhos mais curtos:</p>`;
        } else {
            html += `<p><strong>Caminho:</strong></p>`;
        }

        pathList.forEach((currentPath, index) => {
            if (pathList.length > 1) {
                html += `<h3>Caminho ${index + 1}</h3>`;
            }
            html += `<ul>`;
            currentPath.forEach(node => {
                const [type, name] = node.split(': ');
                const cssClass = type === 'Ator' ? 'actor' : 'movie';
                html += `<li class="${cssClass}">${name}</li>`;
            });
            html += `</ul>`;
        });
        resultsContainer.innerHTML = html;
    }

    // Inicializa a aplicação populando a lista de atores.
    populateActorsDatalist();

    /**
     * Atualiza o relógio na barra de tarefas a cada segundo.
     */
    function updateClock() {
        const clockElement = document.getElementById('clock');
        if (!clockElement) return;

        const now = new Date();
        const hours = now.getHours();
        const minutes = now.getMinutes().toString().padStart(2, '0');
        const ampm = hours >= 12 ? 'PM' : 'AM';
        const formattedHours = (hours % 12 || 12).toString();
        
        clockElement.textContent = `${formattedHours}:${minutes} ${ampm}`;
    }
    setInterval(updateClock, 1000);
    updateClock(); // Chamada inicial para não esperar 1 segundo
});