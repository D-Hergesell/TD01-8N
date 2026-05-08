document.addEventListener('DOMContentLoaded', () => {
    const API_URL = '/api';
    const actorsDatalist = document.getElementById('actors-list');
    const form = document.getElementById('pathfinder-form');
    const sourceInput = document.getElementById('source-actor');
    const targetInput = document.getElementById('target-actor');
    const shortestPathBtn = document.getElementById('find-shortest-btn');
    const allShortestPathsBtn = document.getElementById('find-all-shortest-btn');
    const resultsContainer = document.getElementById('results-container');

    async function populateActorsDatalist() {
        try {
            const response = await fetch(`${API_URL}/actors`);
            const actors = await response.json();
            actorsDatalist.innerHTML = actors.map(actor => `<option value="${actor}"></option>`).join('');
        } catch (error) {
            console.error('Erro ao carregar atores:', error);
        }
    }

    async function findPath(endpoint) {
        const source = sourceInput.value;
        const target = targetInput.value;

        if (!source || !target) {
            resultsContainer.innerHTML = '<p>Por favor, selecione os dois atores.</p>';
            return;
        }

        const loadingMsg = endpoint === '/path' ? 'Buscando BFS...' : 'Buscando BFS 8...';
        resultsContainer.innerHTML = `<p>${loadingMsg}</p>`;

        try {
            const query = `?source=${encodeURIComponent(source)}&target=${encodeURIComponent(target)}`;
            const response = await fetch(`${API_URL}${endpoint}${query}`);
            const data = await response.json();
            renderResults(data, response.status, endpoint);
        } catch (error) {
            resultsContainer.innerHTML = `<p>Erro na comunicação com o servidor.</p>`;
        }
    }

    function renderResults(data, status, endpoint) {
        if (status !== 200) {
            resultsContainer.innerHTML = `<h2>Resultado</h2><p>${data.message || data.error || 'Caminho não encontrado.'}</p>`;
            return;
        }

        const { distance, path, paths } = data;
        const degrees = Math.ceil(distance / 2);
        const pathList = paths || (path ? [path] : []);
        const total = pathList.length;
        const isBFS8 = endpoint === '/path/exact';

        let html = `<h2>Conexão Encontrada!</h2><p><strong>Graus de separação:</strong> ${degrees}</p>`;

        if (isBFS8) {
            html += `<p><strong>Total de resultados (BFS 8):</strong> ${total}</p>`;
        } else if (total > 1) {
            html += `<p><strong>Total de resultados:</strong> ${total}</p>`;
        }

        pathList.forEach((currentPath, index) => {
            if (total > 1) html += `<h3>Caminho ${index + 1}</h3>`;

            // Mapeia cada item do caminho para uma etiqueta estilizada
            const formattedPath = currentPath.map(node => {
                const isActor = node.startsWith('Ator: ');
                const name = node.replace('Ator: ', '').replace('Filme: ', '');
                const tagClass = isActor ? 'xp-tag-actor' : 'xp-tag-movie';

                return `<span class="xp-tag ${tagClass}">${name}</span>`;
            }).join('<span class="xp-arrow"> ➔ </span>');

            html += `<div class="path-row">
                        ${formattedPath}
                     </div>`;
        });

        resultsContainer.innerHTML = html;
    }

    form.addEventListener('submit', (e) => e.preventDefault());
    shortestPathBtn.addEventListener('click', () => findPath('/path'));
    allShortestPathsBtn.addEventListener('click', () => findPath('/path/exact'));

    function updateClock() {
        const clock = document.getElementById('clock');
        if (!clock) return;
        const now = new Date();
        clock.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    populateActorsDatalist();
    setInterval(updateClock, 1000);
    updateClock();
});