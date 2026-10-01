const express = require("express");
const cors = require("cors");
const path = require("path");

const usuarioRoutes = require("./routes/usuarioRoutes");
const deezerRoutes = require("./routes/deezerRoutes");

const app = express();


// =========================================================
// MANTIDO:
// Permite requisições do frontend.
// =========================================================

app.use(cors());


// =========================================================
// MODIFICADO:
// Aumentado o limite do JSON.
//
// A foto de perfil é enviada em Base64 e pode ultrapassar
// o limite padrão de aproximadamente 100 KB do Express.
// =========================================================

app.use(
    express.json({
        limit: "10mb"
    })
);


// =========================================================
// ADICIONADO:
// Também permite dados maiores enviados por formulário.
// =========================================================

app.use(
    express.urlencoded({
        extended: true,
        limit: "10mb"
    })
);


// =========================================================
// MANTIDO:
// Disponibiliza os arquivos do frontend.
// =========================================================

app.use(
    express.static(
        path.join(
            __dirname,
            "../frontend"
        )
    )
);


// =========================================================
// MANTIDO:
// Página inicial.
// =========================================================

app.get("/", (req, res) => {

    res.sendFile(
        path.join(
            __dirname,
            "../frontend/html/login.html"
        )
    );

});


// =========================================================
// MANTIDO:
// Rotas dos usuários.
// =========================================================

app.use(
    "/usuarios",
    usuarioRoutes
);


// =========================================================
// MANTIDO:
// Rotas da Deezer.
// =========================================================

app.use(
    "/deezer",
    deezerRoutes
);


// =========================================================
// MANTIDO:
// Inicialização do servidor.
// =========================================================

app.listen(3000, () => {

    console.log(
        "Servidor rodando em http://localhost:3000"
    );

});