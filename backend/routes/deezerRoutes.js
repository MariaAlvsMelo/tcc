const express = require("express");

const router = express.Router();


// ==========================================
// BUSCAR MÚSICAS
// ==========================================

router.get("/buscar", async (req, res) => {

    try {

        const { q } = req.query;

        if (!q) {

            return res.status(400).json({
                erro: "Digite uma música ou artista."
            });

        }


        const resposta = await fetch(
            `https://api.deezer.com/search?q=${encodeURIComponent(q)}`
        );


        if (!resposta.ok) {

            throw new Error(
                `Erro HTTP: ${resposta.status}`
            );

        }


        const dados = await resposta.json();

        res.json(dados);


    } catch (erro) {

        console.error(
            "Erro ao consultar a Deezer:",
            erro
        );

        res.status(500).json({
            erro: "Erro ao consultar a Deezer."
        });

    }

});


// ==========================================
// DETALHES DO ÁLBUM
// ==========================================

router.get("/album/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const resposta = await fetch(
            `https://api.deezer.com/album/${id}`
        );

        const dados = await resposta.json();

        res.json(dados);


    } catch (erro) {

        console.error(
            "Erro ao consultar álbum:",
            erro
        );

        res.status(500).json({
            erro: "Erro ao consultar álbum."
        });

    }

});


// ==========================================
// DETALHES DO ARTISTA
// ==========================================

router.get("/artista/:id", async (req, res) => {

    try {

        const { id } = req.params;

        const resposta = await fetch(
            `https://api.deezer.com/artist/${id}`
        );

        const dados = await resposta.json();

        res.json(dados);


    } catch (erro) {

        console.error(
            "Erro ao consultar artista:",
            erro
        );

        res.status(500).json({
            erro: "Erro ao consultar artista."
        });

    }

});


module.exports = router;