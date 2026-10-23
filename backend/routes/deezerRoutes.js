
const express = require("express");

const router = express.Router();

const API_DEEZER = "https://api.deezer.com";

// =========================================================
// BUSCAR MÚSICAS
// =========================================================

router.get("/buscar", async (req, res) => {
    try {
        const busca = String(req.query.q || "").trim();

        if (!busca) {
            return res.status(400).json({
                erro: "Digite uma música ou artista."
            });
        }

        const resposta = await fetch(
            `${API_DEEZER}/search?q=${encodeURIComponent(busca)}`
        );

        if (!resposta.ok) {
            throw new Error(
                `Erro HTTP: ${resposta.status}`
            );
        }

        const dados = await resposta.json();

        if (dados.error) {
            throw new Error(dados.error.message);
        }

        return res.json(dados);

    } catch (erro) {
        console.error("Erro ao buscar músicas:", erro);

        return res.status(502).json({
            erro: "Erro ao consultar a Deezer."
        });
    }
});

// =========================================================
// BUSCAR ÁLBUM
// =========================================================

router.get("/album/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const resposta = await fetch(
            `${API_DEEZER}/album/${id}`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar álbum.");
        }

        const dados = await resposta.json();

        return res.json(dados);

    } catch (erro) {
        console.error("Erro ao buscar álbum:", erro);

        return res.status(502).json({
            erro: "Erro ao consultar álbum."
        });
    }
});

// =========================================================
// BUSCAR ARTISTA
// =========================================================

router.get("/artista/:id", async (req, res) => {
    try {
        const { id } = req.params;

        if (!/^\d+$/.test(id)) {
            return res.status(400).json({
                erro: "ID inválido."
            });
        }

        const resposta = await fetch(
            `${API_DEEZER}/artist/${id}`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar artista.");
        }

        const dados = await resposta.json();

        return res.json(dados);

    } catch (erro) {
        console.error("Erro ao buscar artista:", erro);

        return res.status(502).json({
            erro: "Erro ao consultar artista."
        });
    }
});

// =========================================================
// CORRIGIDO: REPRODUZIR PRÉVIA DA MÚSICA
//
// Busca uma URL nova de áudio.
// O navegador reproduz diretamente pelo CDN da Deezer.
// O Node.js não precisa baixar o arquivo MP3.
// =========================================================

router.get("/preview/:id", async (req, res) => {
    const { id } = req.params;

    // Validar o ID recebido.
    if (!/^\d{1,20}$/.test(id)) {
        return res.status(400).json({
            erro: "ID da música inválido."
        });
    }

    try {
        // 1. Solicitar dados atualizados da faixa.
        const resposta = await fetch(
            `${API_DEEZER}/track/${id}`,
            {
                signal: AbortSignal.timeout(15000)
            }
        );

        if (!resposta.ok) {
            throw new Error(
                `Erro da Deezer: ${resposta.status}`
            );
        }

        const musica = await resposta.json();

        // 2. Verificar erro retornado pela Deezer.
        if (musica.error) {
            throw new Error(
                musica.error.message ||
                "Erro ao consultar música."
            );
        }

        // 3. Verificar se existe uma prévia.
        if (!musica.preview) {
            return res.status(404).json({
                erro: "Esta música não possui prévia disponível."
            });
        }

        // 4. Validar a URL recebida.
        const urlAudio = new URL(musica.preview);

        const dominioValido =
            urlAudio.hostname === "dzcdn.net" ||
            urlAudio.hostname.endsWith(".dzcdn.net");

        if (
            urlAudio.protocol !== "https:" ||
            !dominioValido
        ) {
            throw new Error("URL de áudio inválida.");
        }

        // =================================================
        // CORREÇÃO PRINCIPAL
        //
        // Antes: Node.js tentava transmitir o arquivo MP3.
        //
        // Agora: o navegador recebe o endereço atualizado
        // da Deezer e reproduz o áudio diretamente.
        // =================================================

        res.setHeader(
            "Cache-Control",
            "no-store, max-age=0"
        );

        return res.redirect(
            302,
            urlAudio.toString()
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar prévia da música:",
            erro.message
        );

        if (!res.headersSent) {
            return res.status(502).json({
                erro: "Não foi possível obter a prévia.",
                detalhe: erro.message
            });
        }
    }
});

// =========================================================
// EXPORTAR ROTAS
// =========================================================

module.exports = router;
