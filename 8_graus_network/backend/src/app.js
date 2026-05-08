const express = require('express');
const cors = require('cors');
const graphRoutes = require('./routes/graphRoutes');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Disponibiliza arquivos estáticos para o frontend
const frontendPath = path.join(__dirname, '..', '..', 'frontend');
app.use(express.static(frontendPath));

// Registro das rotas da API
app.use('/api', graphRoutes);

app.listen(PORT, () => {
    console.log(`[API] 8 Graus de Network rodando em http://localhost:${PORT}`);
});