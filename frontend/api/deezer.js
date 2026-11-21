// GET /api/deezer?q=termo  ->  busca de músicas na Deezer
const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

async function consultarDeezer(caminho, tentativas = 3) {
    let ultimoErro;

    for (let i = 0; i < tentativas; i++) {
        try {
            const resposta = await fetch(`https://api.deezer.com${caminho}`, {
                headers: {
                    "User-Agent": "Mozilla/5.0 (compatible; EntreNotas/1.0)",
                    "Accept": "application/json"
                },
                signal: AbortSignal.timeout(8000)
            });

            if (!resposta.ok) {
                throw new Error(`HTTP ${resposta.status}`);
            }

            const dados = await resposta.json();

            // A Deezer devolve erros com status 200 dentro do JSON.
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
    if (req.method !== "GET") {
        return res.status(405).json({ erro: "Método não permitido." });
    }

    const busca = String((req.query && req.query.q) || "").trim();

    if (!busca) {
        return res.status(400).json({ erro: "Digite uma música ou artista." });
    }

    try {
        const dados = await consultarDeezer(
            `/search?q=${encodeURIComponent(busca)}&limit=25`
        );

        res.setHeader(
            "Cache-Control",
            "public, s-maxage=300, stale-while-revalidate=600"
        );

        return res.status(200).json(dados);
    } catch (erro) {
        console.error("Erro ao buscar na Deezer:", erro.message);

        return res.status(502).json({
            erro: "Erro ao consultar a Deezer.",
            detalhe: erro.message
        });
    }
};