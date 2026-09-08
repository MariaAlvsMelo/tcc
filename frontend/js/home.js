const API = "http://localhost:3000";
const avaliacoesContainer = document.getElementById("home-container");

// Gera as estrelas visuais com base na nota numérica
function gerarEstrelas(nota) {
    return "⭐".repeat(nota) + "☆".repeat(5 - nota);
}

// Busca e renderiza todas as avaliações cadastradas
async function carregarAvaliacoes() {
    try {
        const resposta = await fetch(`${API}/usuarios/avaliacoes`);
        const dados = await resposta.json();

        avaliacoesContainer.innerHTML = "";

        // Validação para caso não existam registros no banco de dados
        if (!dados.sucesso || !dados.avaliacoes || dados.avaliacoes.length === 0) {
            avaliacoesContainer.innerHTML = "<p>Nenhuma avaliação encontrada ainda.</p>";
            return;
        }

        // Renderiza cada card de avaliação recebido da API
        dados.avaliacoes.forEach((avaliacao) => {
            
            // Formata a data recebida da API antes de exibir no HTML
            const dataFormatada = avaliacao.data_avaliacao 
                ? new Date(avaliacao.data_avaliacao).toLocaleString('pt-BR', {
                    day: '2-digit',
                    month: '2-digit',
                    year: 'numeric',
                    hour: '2-digit',
                    minute: '2-digit'
                  })
                : "Sem data";

            avaliacoesContainer.innerHTML += `
                <div class="card-avaliacao">
                    <h3>${avaliacao.musica}</h3>
                    <p><strong>Artista:</strong> ${avaliacao.artista}</p>
                    <p>${avaliacao.comentario}</p>
                    <p>${gerarEstrelas(avaliacao.nota)}</p>
                    <p class="data-postagem" style="color: #777; font-size: 0.85rem; margin-top: 10px;">
                        <small>${dataFormatada}</small> 
                    </p>
                </div>
            `;
        });

    } catch (erro) {
        console.error("Erro ao carregar avaliações:", erro);
        avaliacoesContainer.innerHTML = "<p>Erro ao carregar avaliações. Verifique se o servidor está rodando.</p>";
    }
}

// Inicializa a listagem ao carregar a página
carregarAvaliacoes();
