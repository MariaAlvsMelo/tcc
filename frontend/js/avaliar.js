
const API_DEEZER = "http://localhost:3000/deezer";

const formAvaliacao = document.getElementById("formAvaliacao");
const campoMusica = document.getElementById("musicaAvaliacao");
const campoArtista = document.getElementById("artistaAvaliacao");

const musicaSelecionada = document.getElementById("musicaSelecionada");
const capaAlbum = document.getElementById("capaAlbum");

const tituloMusicaSelecionada = document.getElementById(
    "tituloMusicaSelecionada"
);

const albumMusicaSelecionada = document.getElementById(
    "albumMusicaSelecionada"
);

const mensagemAvaliacao = document.getElementById(
    "mensagemAvaliacao"
);

const previewMusica = document.getElementById("previewMusica");
const areaPreviewMusica = document.getElementById("areaPreviewMusica");
const erroPreviewAvaliar = document.getElementById("erroPreviewAvaliar");

const listaSugestoesMusica = document.getElementById(
    "listaSugestoesMusica"
);

const listaSugestoesArtista = document.getElementById(
    "listaSugestoesArtista"
);

const avaliarSemLogin = document.getElementById("avaliarSemLogin");

let musicaDeezerSelecionada = null;
let tempoBusca = null;
let numeroBusca = 0;

// =========================================================
// SEGURANÇA
// =========================================================

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto ?? "";
    return elemento.innerHTML;
}

function obterUsuario() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch (erro) {
        return null;
    }
}

// =========================================================
// VERIFICAR LOGIN
// =========================================================

const usuarioPagina = obterUsuario();

if (!usuarioPagina) {
    formAvaliacao.style.display = "none";

    if (avaliarSemLogin) {
        avaliarSemLogin.style.display = "flex";
    }
} else {
    formAvaliacao.style.display = "";

    if (avaliarSemLogin) {
        avaliarSemLogin.style.display = "none";
    }
}

// =========================================================
// LIMPAR PLAYER
// =========================================================

function limparPreview() {
    previewMusica.pause();
    previewMusica.removeAttribute("src");
    previewMusica.load();

    areaPreviewMusica.style.display = "none";

    if (erroPreviewAvaliar) {
        erroPreviewAvaliar.hidden = true;
    }
}

// =========================================================
// MOSTRAR PLAYER
// =========================================================

function carregarPreview(musica) {
    limparPreview();

    if (!musica?.id) {
        return;
    }

    // MODIFICADO:
    // Utiliza o ID da faixa para obter uma prévia atualizada.
    const url = `${API_DEEZER}/preview/${encodeURIComponent(musica.id)}`;

    previewMusica.src = url;
    previewMusica.load();

    areaPreviewMusica.style.display = "block";
}

// =========================================================
// EVENTOS DO PLAYER
// =========================================================

previewMusica.addEventListener("error", () => {
    if (erroPreviewAvaliar) {
        erroPreviewAvaliar.hidden = false;
    }
});

previewMusica.addEventListener("loadeddata", () => {
    if (erroPreviewAvaliar) {
        erroPreviewAvaliar.hidden = true;
    }
});

// =========================================================
// LIMPAR SELEÇÃO DE MÚSICA
// =========================================================

function limparSelecao() {
    musicaDeezerSelecionada = null;

    musicaSelecionada.style.display = "none";

    limparPreview();
}

// =========================================================
// ESCONDER SUGESTÕES
// =========================================================

function esconderSugestoes() {
    listaSugestoesMusica.innerHTML = "";
    listaSugestoesMusica.style.display = "none";

    listaSugestoesArtista.innerHTML = "";
    listaSugestoesArtista.style.display = "none";
}

// =========================================================
// PESQUISAR MÚSICAS
// =========================================================

campoMusica.addEventListener("input", () => {
    limparSelecao();

    listaSugestoesArtista.innerHTML = "";
    listaSugestoesArtista.style.display = "none";

    pesquisarDeezer(campoMusica.value.trim(), "musica");
});

// =========================================================
// PESQUISAR ARTISTAS
// =========================================================

campoArtista.addEventListener("input", () => {
    limparSelecao();

    listaSugestoesMusica.innerHTML = "";
    listaSugestoesMusica.style.display = "none";

    pesquisarDeezer(campoArtista.value.trim(), "artista");
});

// =========================================================
// DEBOUNCE DA PESQUISA
// =========================================================

function pesquisarDeezer(busca, tipoBusca) {
    clearTimeout(tempoBusca);

    const listaAtual = tipoBusca === "artista"
        ? listaSugestoesArtista
        : listaSugestoesMusica;

    numeroBusca++;
    const buscaAtual = numeroBusca;

    if (busca.length < 2) {
        listaAtual.innerHTML = "";
        listaAtual.style.display = "none";
        return;
    }

    tempoBusca = setTimeout(() => {
        buscarMusicas(busca, tipoBusca, buscaAtual);
    }, 400);
}

// =========================================================
// BUSCA NA API DEEZER
// =========================================================

async function buscarMusicas(busca, tipoBusca, buscaAtual) {
    const listaAtual = tipoBusca === "artista"
        ? listaSugestoesArtista
        : listaSugestoesMusica;

    try {
        const resposta = await fetch(
            `${API_DEEZER}/buscar?q=${encodeURIComponent(busca)}`
        );

        if (!resposta.ok) {
            throw new Error("Erro ao buscar músicas.");
        }

        const dados = await resposta.json();

        // Evita mostrar resultados de uma pesquisa antiga.
        if (buscaAtual !== numeroBusca) return;

        mostrarSugestoes(dados.data || [], tipoBusca);

    } catch (erro) {
        if (buscaAtual !== numeroBusca) return;

        console.error("Erro na pesquisa:", erro);

        listaAtual.innerHTML = `
            <div style="padding:12px;color:#ff7777;">
                Não foi possível realizar a busca.
            </div>
        `;

        listaAtual.style.display = "block";
    }
}

// =========================================================
// EXIBIR SUGESTÕES
// =========================================================

function mostrarSugestoes(musicas, tipoBusca) {
    const listaAtual = tipoBusca === "artista"
        ? listaSugestoesArtista
        : listaSugestoesMusica;

    listaAtual.innerHTML = "";

    if (!musicas.length) {
        listaAtual.innerHTML = `
            <div style="padding:12px;color:#aaa;">
                Nenhuma música encontrada.
            </div>
        `;

        listaAtual.style.display = "block";
        return;
    }

    musicas.slice(0, 5).forEach(musica => {
        const sugestao = document.createElement("div");
        sugestao.className = "sugestao-musica";

        const capa = musica.album?.cover_medium || "";
        const titulo = musica.title || "Música sem nome";
        const artista = musica.artist?.name || "Artista desconhecido";

        sugestao.innerHTML = `
            <img
                src="${escaparHTML(capa)}"
                alt="Capa do álbum"
            >

            <div class="sugestao-info">
                <strong>${escaparHTML(titulo)}</strong>
                <span>${escaparHTML(artista)}</span>
            </div>
        `;

        sugestao.addEventListener("click", () => {
            selecionarMusica(musica);
        });

        listaAtual.appendChild(sugestao);
    });

    listaAtual.style.display = "block";
}

// =========================================================
// SELECIONAR MÚSICA
// =========================================================

function selecionarMusica(musica) {
    numeroBusca++;
    clearTimeout(tempoBusca);

    musicaDeezerSelecionada = musica;

    campoMusica.value = musica.title || "";
    campoArtista.value = musica.artist?.name || "";

    const capa = musica.album?.cover_medium || "";

    if (capa) {
        capaAlbum.src = capa;
        capaAlbum.style.display = "block";
    } else {
        capaAlbum.removeAttribute("src");
        capaAlbum.style.display = "none";
    }

    tituloMusicaSelecionada.textContent = musica.title || "";

    albumMusicaSelecionada.textContent = musica.album?.title
        ? `Álbum: ${musica.album.title}`
        : "";

    musicaSelecionada.style.display = "block";

    // MODIFICADO: carregar player atualizado.
    carregarPreview(musica);

    esconderSugestoes();
}

// =========================================================
// FECHAR SUGESTÕES AO CLICAR FORA
// =========================================================

document.addEventListener("click", event => {
    const clicouMusica = campoMusica.contains(event.target);
    const clicouArtista = campoArtista.contains(event.target);

    const clicouListaMusica = listaSugestoesMusica.contains(
        event.target
    );

    const clicouListaArtista = listaSugestoesArtista.contains(
        event.target
    );

    if (
        !clicouMusica &&
        !clicouArtista &&
        !clicouListaMusica &&
        !clicouListaArtista
    ) {
        listaSugestoesMusica.style.display = "none";
        listaSugestoesArtista.style.display = "none";
    }
});

// =========================================================
// ENVIAR AVALIAÇÃO
// =========================================================

formAvaliacao.addEventListener("submit", async event => {
    event.preventDefault();

    const overlay = document.getElementById("loadingOverlay");
    const botaoSubmit = formAvaliacao.querySelector(
        'button[type="submit"]'
    );

    const musica = campoMusica.value.trim();
    const artista = campoArtista.value.trim();

    const comentario = document.getElementById(
        "comentarioAvaliacao"
    ).value.trim();

    const notaSelecionada = document.querySelector(
        'input[name="nota"]:checked'
    );

    const nota = notaSelecionada
        ? Number(notaSelecionada.value)
        : null;

    // VALIDAÇÃO
    if (!musica || !artista || !comentario || !nota) {
        mensagemAvaliacao.textContent = !nota
            ? "Clique em uma estrela para dar sua nota!"
            : "Preencha todos os campos!";

        mensagemAvaliacao.style.color = "#ff5c7c";
        return;
    }

    const usuario = obterUsuario();

    if (!usuario) {
        mensagemAvaliacao.textContent =
            "Faça login para enviar uma avaliação.";

        mensagemAvaliacao.style.color = "#ff5c7c";
        return;
    }

    try {
        if (overlay) {
            overlay.classList.add("ativo");
        }

        if (botaoSubmit) {
            botaoSubmit.disabled = true;
        }

        const resposta = await fetch(
            "http://localhost:3000/usuarios/avaliacoes",
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    id_usuario: usuario.id_usuario,
                    musica,
                    artista,
                    comentario,
                    nota,

                    capa_album:
                        musicaDeezerSelecionada?.album?.cover_medium ||
                        null,

                    id_deezer:
                        musicaDeezerSelecionada?.id || null,

                    id_album:
                        musicaDeezerSelecionada?.album?.id ||
                        null,

                    preview:
                        musicaDeezerSelecionada?.preview || null
                })
            }
        );

        const resultado = await resposta.json();

        if (!resposta.ok || !resultado.sucesso) {
            throw new Error(
                resultado.mensagem || "Erro ao enviar avaliação."
            );
        }

        mensagemAvaliacao.textContent =
            resultado.mensagem || "Avaliação enviada!";

        mensagemAvaliacao.style.color = "#54d98b";

        formAvaliacao.reset();

        musicaDeezerSelecionada = null;
        musicaSelecionada.style.display = "none";

        capaAlbum.removeAttribute("src");

        limparPreview();
        esconderSugestoes();

        // Mantém o carregamento antes de retornar ao Feed.
        setTimeout(() => {
            window.location.href = "home.html";
        }, 2000);

    } catch (erro) {
        console.error("Erro ao enviar avaliação:", erro);

        mensagemAvaliacao.textContent = erro.message ||
            "Erro de conexão com o servidor.";

        mensagemAvaliacao.style.color = "#ff5c7c";

        if (overlay) {
            overlay.classList.remove("ativo");
        }

        if (botaoSubmit) {
            botaoSubmit.disabled = false;
        }
    }
});

// =========================================================
// CABEÇALHO AO ROLAR
// =========================================================

const cabecalho = document.querySelector(".cabecalho");
let ultimaRolagem = window.scrollY;

if (cabecalho) {
    window.addEventListener("scroll", () => {
        if (window.scrollY > ultimaRolagem) {
            cabecalho.classList.add("cabecalho--hidden");
        } else {
            cabecalho.classList.remove("cabecalho--hidden");
        }

        ultimaRolagem = window.scrollY;
    });
}
