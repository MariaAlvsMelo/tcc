
const express = require("express");
const cors = require("cors");
const path = require("path");

const usuarioRoutes = require("./routes/usuarioRoutes");
const deezerRoutes = require("./routes/deezerRoutes");

const app = express();

app.use(cors());

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({
    extended: true,
    limit: "10mb"
}));

// Disponibiliza os arquivos do frontend.
app.use(express.static(path.join(__dirname, "../frontend")));

// Página inicial.
app.get("/", (req, res) => {
    res.sendFile(
        path.join(__dirname, "../frontend/html/login.html")
    );
});

// Rotas da aplicação.
app.use("/usuarios", usuarioRoutes);
app.use("/deezer", deezerRoutes);

// Inicializa o servidor localmente.
// Na Vercel, a plataforma executa a aplicação.
if (require.main === module) {
    const PORT = process.env.PORT || 3000;

    app.listen(PORT, () => {
        console.log(`Servidor rodando na porta ${PORT}`);
    });
}

module.exports = app;
