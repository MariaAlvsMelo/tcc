const express = require("express");
const cors = require("cors");
const path = require("path");

const usuarioRoutes = require("./routes/usuarioRoutes");
const deezerRoutes = require("./routes/deezerRoutes");

const app = express();

app.use(cors());
app.use(express.json());


// Disponibiliza os arquivos do frontend
app.use(
    express.static(
        path.join(__dirname, "../frontend")
    )
);


// Página inicial
app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend/html/login.html"
        )
    );

});


// Rotas dos usuários
app.use(
    "/usuarios",
    usuarioRoutes
);


// Rotas da Deezer
app.use(
    "/deezer",
    deezerRoutes
);


app.listen(3000, () => {

    console.log(
        "Servidor rodando em http://localhost:3000"
    );

});