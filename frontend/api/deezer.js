// Utilitário compartilhado pelas funções da Vercel (o "_" evita virar rota).
const API_DEEZER = "https://api.deezer.com";

const esperar = (ms) => new Promise((r) => setTimeout(r, ms));

// Consulta a Deezer. Tenta de novo quando ela responde "quota exceeded"
// (código 4), que acontece com frequência em IPs compartilhados.
async function consultarDeezer(caminho, tentativas = 3) {
    let ultimoErro;

    for (let i = 0; i < tentativas; i++) {
        try {
            const resposta = await fetch(`${API_DEEZER}${caminho}`, {
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
                const erro = new Error(dados.error.message || "Erro da Deezer");
                erro.codigo = dados.error.code;
                throw erro;
            }

            return dados;
        } catch (erro) {
            ultimoErro = erro;
            await esperar(400 * (i + 1));
        }
    }

    throw ultimoErro;
}

module.exports = { consultarDeezer };