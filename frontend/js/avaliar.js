const formAvaliacao = document.getElementById("formAvaliacao");
const bntCor = document.getElementById("btn-tema");

// Envio do formulário de avaliação de música
formAvaliacao.addEventListener("submit", async function (event) {
    event.preventDefault();

    const musica = document.getElementById("musicaAvaliacao").value.trim();
    const artista = document.getElementById("artistaAvaliacao").value.trim();
    const comentario = document.getElementById("comentarioAvaliacao").value.trim();
    const notaSelecionada = document.querySelector('input[name="nota"]:checked');
    const nota = notaSelecionada ? notaSelecionada.value : null;
    const mensagemAvaliacao = document.getElementById("mensagemAvaliacao");

    // Validação de campos obrigatórios e seleção de nota
    if (!musica || !artista || !comentario || !nota) {
        mensagemAvaliacao.innerText = !nota
            ? "Clique em uma estrela para dar sua nota!"
            : "Preencha todos os campos!";
        mensagemAvaliacao.style.color = "red";
        return;
    }

    try {
        // Envio dos dados para a API do backend
        const resposta = await fetch("http://localhost:3000/usuarios/avaliacoes", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ musica, artista, comentario, nota })
        });

        const resultado = await resposta.json();
        mensagemAvaliacao.innerText = resultado.mensagem;

        // Limpeza do formulário em caso de sucesso
        if (resultado.sucesso) {
            mensagemAvaliacao.style.color = "green";
            formAvaliacao.reset();
        } else {
            mensagemAvaliacao.style.color = "red";
        }

    } catch (erro) {
        console.error("Erro ao enviar avaliação:", erro);
        mensagemAvaliacao.innerText = "Erro de conexão com o servidor.";
        mensagemAvaliacao.style.color = "red";
    }
});
