// GET /api/deezer-preview?id=123  ->  entrega o MP3 da prévia (30s).
// A função baixa o áudio e repassa ao player; se não conseguir, redireciona.
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

const UA = "Mozilla/5.0 (compatible; EntreNotas/1.0)";

async function consultarDeezer(caminho, tentativas = 3) {
    let ultimoErro;

    for (let i = 0; i < tentativas; i++) {
        try {
            const resposta = await fetch(`https://api.deezer.com${caminho}`, {
                headers: { "User-Agent": UA, "Accept": "application/json" },
                signal: AbortSignal.timeout(8000)
            });

            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status}`);
            }

            const dados = await resposta.json();

            if (dados && dados.error) {
                throw new Error(dados.error.message || "Erro da Deezer");
            }

            return dados;
        } catch (erro) {
            ultimoErro = erro;
            await esperar(400 * (i + 1));
        }
    }

    throw ultimoErro;
}

module.exports = async function handler(req, res) {
    const id = String((req.query && req.query.id) || "");

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

        // 1) Tenta baixar o áudio pelo servidor e entregar ao player.
        try {
            const headers = { "User-Agent": UA, "Accept": "*/*" };

            // Permite avançar/voltar no player.
            if (req.headers.range) {
                headers.Range = req.headers.range;
            }

            const audio = await fetch(url.toString(), {
                headers,
                signal: AbortSignal.timeout(10000)
            });

            if (audio.ok || audio.status === 206) {
                const buffer = Buffer.from(await audio.arrayBuffer());

                res.statusCode = audio.status;
                res.setHeader(
                    "Content-Type",
                    audio.headers.get("content-type") || "audio/mpeg"
                );
                res.setHeader("Accept-Ranges", "bytes");
                res.setHeader("Content-Length", buffer.length);
                res.setHeader("Cache-Control", "private, max-age=600");

                const faixa = audio.headers.get("content-range");
                if (faixa) {
                    res.setHeader("Content-Range", faixa);
                }

                return res.end(buffer);
            }

            console.error("Áudio recusado pela Deezer:", audio.status);
        } catch (erroAudio) {
            console.error("Falha ao baixar o áudio:", erroAudio.message);
        }

        // 2) Reserva: deixa o navegador tentar direto na Deezer.
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