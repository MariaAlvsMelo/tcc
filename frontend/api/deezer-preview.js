// GET /api/deezer-preview?id=123  ->  redireciona para a prévia (MP3) atualizada.
// A URL de prévia da Deezer expira, por isso buscamos uma nova a cada uso.
const { consultarDeezer } = require("./_deezer");

module.exports = async function handler(req, res) {
    const id = String(req.query.id || "");

    if (!/^\d{1,20}$/.test(id)) {
        return res.status(400).json({ erro: "ID da música inválido." });
    }

    try {
        const musica = await consultarDeezer(`/track/${id}`);

        if (!musica.preview) {
            return res.status(404).json({
                erro: "Esta música não possui prévia disponível."
            });
        }

        const url = new URL(musica.preview);
        const dominioValido =
            url.hostname === "dzcdn.net" || url.hostname.endsWith(".dzcdn.net");

        if (url.protocol !== "https:" || !dominioValido) {
            throw new Error("URL de áudio inválida.");
        }

        res.setHeader("Cache-Control", "no-store, max-age=0");
        return res.redirect(302, url.toString());
    } catch (erro) {
        console.error("Erro ao carregar prévia:", erro.message);

        return res.status(502).json({
            erro: "Não foi possível obter a prévia.",
            detalhe: erro.message
        });
    }
};