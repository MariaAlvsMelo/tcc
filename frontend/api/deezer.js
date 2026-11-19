
export default async function handler(req, res) {
    // Permite chamadas do frontend
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");

    // Responde às requisições OPTIONS
    if (req.method === "OPTIONS") {
        return res.status(200).end();
    }

    if (req.method !== "GET") {
        return res.status(405).json({ erro: "Método não permitido." });
    }

    try {
        const busca = String(req.query.q || "").trim();

        if (!busca) {
            return res.status(400).json({ erro: "Digite uma música ou artista." });
        }

        const url = `https://api.deezer.com/search?q=${encodeURIComponent(busca)}`;

        const resposta = await fetch(url);

        if (!resposta.ok) {
            return res.status(502).json({
                erro: "A Deezer recusou a solicitação.",
                status: resposta.status
            });
        }

        const dados = await resposta.json();

        return res.status(200).json(dados);

    } catch (erro) {
        console.error("Erro Deezer Vercel:", erro);

        return res.status(500).json({
            erro: "Falha ao consultar a Deezer."
        });
    }
}
