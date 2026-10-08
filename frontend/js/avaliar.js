const formAvaliacao =
    document.getElementById(
        "formAvaliacao"
    );

const campoMusica =
    document.getElementById(
        "musicaAvaliacao"
    );

const campoArtista =
    document.getElementById(
        "artistaAvaliacao"
    );

const musicaSelecionada =
    document.getElementById(
        "musicaSelecionada"
    );

const capaAlbum =
    document.getElementById(
        "capaAlbum"
    );

const tituloMusicaSelecionada =
    document.getElementById(
        "tituloMusicaSelecionada"
    );

const albumMusicaSelecionada =
    document.getElementById(
        "albumMusicaSelecionada"
    );

const mensagemAvaliacao =
    document.getElementById(
        "mensagemAvaliacao"
    );


const previewMusica =
    document.getElementById(
        "previewMusica"
    );

const areaPreviewMusica =
    document.getElementById(
        "areaPreviewMusica"
    );

const listaSugestoesMusica =
    document.getElementById(
        "listaSugestoesMusica"
    );

const listaSugestoesArtista =
    document.getElementById(
        "listaSugestoesArtista"
    );

// =========================================================
// ADICIONADO:
// PROTEGER PÁGINA DE AVALIAÇÃO
// =========================================================

const usuarioPagina =
    JSON.parse(
        localStorage.getItem("usuarioLogado")
    );

const avaliarSemLogin =
    document.getElementById("avaliarSemLogin");


if (!usuarioPagina) {

    // Esconde somente o formulário.
    formAvaliacao.style.display =
        "none";

    // Mostra a interface exclusiva.
    if (avaliarSemLogin) {

        avaliarSemLogin.style.display =
            "flex";
    }

} else {

    formAvaliacao.style.display =
        "";

    if (avaliarSemLogin) {

        avaliarSemLogin.style.display =
            "none";
    }
}


let musicaDeezerSelecionada =
    null;


let tempoBusca;


campoMusica.addEventListener(
    "input",
    function() {

        musicaDeezerSelecionada =
            null;

        musicaSelecionada.style.display =
            "none";

        // Fecha a lista do artista caso esteja aberta.
        listaSugestoesArtista.innerHTML =
            "";

        listaSugestoesArtista.style.display =
            "none";

        pesquisarDeezer(
            campoMusica.value.trim(),
            "musica"
        );
    }
);


// =========================================================
// PESQUISAR ARTISTA
// =========================================================

campoArtista.addEventListener(
    "input",
    function() {

        musicaDeezerSelecionada =
            null;

        musicaSelecionada.style.display =
            "none";

        // Fecha a lista de música caso esteja aberta.
        listaSugestoesMusica.innerHTML =
            "";

        listaSugestoesMusica.style.display =
            "none";

        pesquisarDeezer(
            campoArtista.value.trim(),
            "artista"
        );
    }
);


// =========================================================
// PESQUISA NOS DOIS CAMPOS
// =========================================================

function pesquisarDeezer(
    busca,
    tipoBusca
) {

    clearTimeout(
        tempoBusca
    );

    const listaAtual =
        tipoBusca === "artista"
            ? listaSugestoesArtista
            : listaSugestoesMusica;

    if (
        busca.length < 2
    ) {

        listaAtual.innerHTML =
            "";

        listaAtual.style.display =
            "none";

        return;
    }

    tempoBusca =
        setTimeout(
            () => {

                buscarMusicas(
                    busca,
                    tipoBusca
                );

            },
            400
        );
}


// =========================================================
// ADICIONADO:
// BUSCAR MÚSICAS / ARTISTAS NA API DO DEEZER
// =========================================================

async function buscarMusicas(
    busca,
    tipoBusca = "musica"
) {

    const listaAtual =
        tipoBusca === "artista"
            ? listaSugestoesArtista
            : listaSugestoesMusica;

    try {

        const resposta =
            await fetch(
                `http://localhost:3000/deezer/buscar?q=${encodeURIComponent(
                    busca
                )}`
            );

        if (!resposta.ok) {

            throw new Error(
                "Erro na busca."
            );
        }

        const dados =
            await resposta.json();

        mostrarSugestoes(
            dados.data || [],
            tipoBusca
        );

    } catch (erro) {

        console.error(
            "Erro ao buscar músicas/artistas:",
            erro
        );

        listaAtual.innerHTML = `
            <div style="
                padding: 12px;
                color: #ff7777;
            ">
                Não foi possível realizar a busca.
            </div>
        `;

        listaAtual.style.display =
            "block";
    }
}


// =========================================================
// MODIFICADO:
// SUGESTÕES
//
// Agora recebe o tipo da pesquisa para saber em qual lista
// mostrar os resultados.
// =========================================================

function mostrarSugestoes(
    musicas,
    tipoBusca
) {

    const listaAtual =
        tipoBusca === "artista"
            ? listaSugestoesArtista
            : listaSugestoesMusica;

    listaAtual.innerHTML =
        "";

    if (
        !musicas ||
        musicas.length === 0
    ) {

        listaAtual.innerHTML = `
            <div style="
                padding: 12px;
                color: #aaa;
            ">
                Nenhuma música encontrada.
            </div>
        `;

        listaAtual.style.display =
            "block";

        return;
    }

    musicas
        .slice(0, 5)
        .forEach(
            musica => {

                const sugestao =
                    document.createElement(
                        "div"
                    );

                sugestao.classList.add(
                    "sugestao-musica"
                );

                const capa =
                    musica.album?.cover_medium ||
                    "";

                const titulo =
                    musica.title ||
                    "Música sem nome";

                const artista =
                    musica.artist?.name ||
                    "Artista desconhecido";

                sugestao.innerHTML = `
                    <img
                        src="${capa}"
                        alt="Capa do álbum"
                    >

                    <div class="sugestao-info">

                        <strong>
                            ${escaparHTML(
                                titulo
                            )}
                        </strong>

                        <span>
                            ${escaparHTML(
                                artista
                            )}
                        </span>

                    </div>
                `;

                sugestao.addEventListener(
                    "click",
                    () => {

                        selecionarMusica(
                            musica
                        );
                    }
                );

                listaAtual.appendChild(
                    sugestao
                );
            }
        );

    listaAtual.style.display =
        "block";
}



function selecionarMusica(
    musica
) {

    musicaDeezerSelecionada =
        musica;

    campoMusica.value =
        musica.title;

    campoArtista.value =
        musica.artist?.name ||
        "";

    if (
        musica.album?.cover_medium
    ) {

        capaAlbum.src =
            musica.album.cover_medium;

        capaAlbum.alt =
            `Capa do álbum ${
                musica.album.title || ""
            }`;

        musicaSelecionada.style.display =
            "block";

    } else {

        capaAlbum.src =
            "";

        musicaSelecionada.style.display =
            "block";
    }

    tituloMusicaSelecionada.textContent =
        musica.title;

    albumMusicaSelecionada.textContent =
        musica.album?.title
            ? `Álbum: ${musica.album.title}`
            : "";


    if (
        musica.preview
    ) {

        previewMusica.src =
            musica.preview;

        areaPreviewMusica.style.display =
            "block";

    } else {

        previewMusica.pause();

        previewMusica.removeAttribute(
            "src"
        );

        previewMusica.load();

        areaPreviewMusica.style.display =
            "none";
    }

    listaSugestoesMusica.innerHTML =
        "";

    listaSugestoesMusica.style.display =
        "none";

    listaSugestoesArtista.innerHTML =
        "";

    listaSugestoesArtista.style.display =
        "none";
}


// =========================================================
// MODIFICADO:
// FECHAR SUGESTÕES
// =========================================================

document.addEventListener(
    "click",
    function(event) {

        const clicouMusica =
            campoMusica.contains(
                event.target
            );

        const clicouArtista =
            campoArtista.contains(
                event.target
            );

        const clicouListaMusica =
            listaSugestoesMusica.contains(
                event.target
            );

        const clicouListaArtista =
            listaSugestoesArtista.contains(
                event.target
            );

        if (
            !clicouMusica &&
            !clicouArtista &&
            !clicouListaMusica &&
            !clicouListaArtista
        ) {

            listaSugestoesMusica.style.display =
                "none";

            listaSugestoesArtista.style.display =
                "none";
        }
    }
);


// =========================================================
// ENVIAR AVALIAÇÃO
// =========================================================

formAvaliacao.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        // =====================================================
        // MANTIDO:
        // Tela de carregamento.
        // =====================================================

        const overlay =
            document.getElementById(
                "loadingOverlay"
            );


        const botaoSubmit =
            formAvaliacao.querySelector(
                'button[type="submit"]'
            );


        const musica =
            campoMusica.value.trim();


        const artista =
            campoArtista.value.trim();


        const comentario =
            document
                .getElementById(
                    "comentarioAvaliacao"
                )
                .value
                .trim();


        const notaSelecionada =
            document.querySelector(
                'input[name="nota"]:checked'
            );


        const nota =
            notaSelecionada
                ? notaSelecionada.value
                : null;


        // =====================================================
        // VALIDAÇÃO
        // =====================================================

        if (
            !musica ||
            !artista ||
            !comentario ||
            !nota
        ) {

            mensagemAvaliacao.innerText =
                !nota
                    ? "Clique em uma estrela para dar sua nota!"
                    : "Preencha todos os campos!";


            mensagemAvaliacao.style.color =
                "red";


            return;
        }


        // =====================================================
        // ADICIONADO:
        // Recupera o usuário logado.
        // =====================================================

        const usuarioSalvo =
            localStorage.getItem(
                "usuarioLogado"
            );


        if (!usuarioSalvo) {

            mensagemAvaliacao.innerText =
                "Faça login para enviar uma avaliação.";


            mensagemAvaliacao.style.color =
                "red";


            return;
        }


        const usuarioLogado =
            JSON.parse(
                usuarioSalvo
            );


        try {

            // =================================================
            // MANTIDO:
            // ATIVA A TELA ESCURA E A ESTRELA GIRATÓRIA.
            // =================================================

            if (overlay) {

                overlay.classList.add(
                    "ativo"
                );
            }


            if (botaoSubmit) {

                botaoSubmit.disabled =
                    true;
            }


            // =================================================
            // MANTIDO:
            // Envia id_usuario.
            // =================================================

            const resposta =
                await fetch(
                    "http://localhost:3000/usuarios/avaliacoes",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            id_usuario:
                                usuarioLogado.id_usuario,

                            musica,

                            artista,

                            comentario,

                            nota,

                            capa_album:
                                musicaDeezerSelecionada
                                    ?.album
                                    ?.cover_medium ||
                                null,

                            id_deezer:
                                musicaDeezerSelecionada
                                    ?.id ||
                                null,

                            id_album:
                                musicaDeezerSelecionada
                                    ?.album
                                    ?.id ||
                                null,

                            preview:
                                musicaDeezerSelecionada
                                    ?.preview ||
                                null

                        })
                    }
                );


            const resultado =
                await resposta.json();


            mensagemAvaliacao.innerText =
                resultado.mensagem;


            if (
                resultado.sucesso
            ) {

                mensagemAvaliacao.style.color =
                    "green";


                // =================================================
                // MANTIDO:
                // Limpa o formulário.
                // =================================================

                formAvaliacao.reset();


                musicaDeezerSelecionada =
                    null;


                musicaSelecionada.style.display =
                    "none";


                capaAlbum.src =
                    "";

                previewMusica.pause();

                previewMusica.removeAttribute(
                    "src"
                );

                previewMusica.load();

                areaPreviewMusica.style.display =
                    "none";

                // =================================================
                // MODIFICADO:
                // Limpa as duas listas de sugestões.
                // =================================================

                listaSugestoesMusica.innerHTML =
                    "";

                listaSugestoesMusica.style.display =
                    "none";


                listaSugestoesArtista.innerHTML =
                    "";

                listaSugestoesArtista.style.display =
                    "none";


                // =================================================
                // MANTIDO:
                // Aguarda 2 segundos mostrando o carregamento.
                // =================================================

                setTimeout(
                    function() {

                        window.location.href =
                            "home.html";

                    },
                    2000
                );


            } else {

                mensagemAvaliacao.style.color =
                    "red";


                if (overlay) {

                    overlay.classList.remove(
                        "ativo"
                    );
                }


                if (botaoSubmit) {

                    botaoSubmit.disabled =
                        false;
                }
            }


        } catch (erro) {

            console.error(
                "Erro ao enviar avaliação:",
                erro
            );


            mensagemAvaliacao.innerText =
                "Erro de conexão com o servidor.";


            mensagemAvaliacao.style.color =
                "red";


            if (overlay) {

                overlay.classList.remove(
                    "ativo"
                );
            }


            if (botaoSubmit) {

                botaoSubmit.disabled =
                    false;
            }
        }

    }
);


// =========================================================
// MANTIDO:
// EVITAR HTML INJETADO
// =========================================================

function escaparHTML(
    texto
) {

    const div =
        document.createElement(
            "div"
        );


    div.textContent =
        texto ?? "";


    return div.innerHTML;
}


// =========================================================
// MANTIDO:
// ANIMAÇÃO DO CABEÇALHO
//
// Igual ao home.js.
// =========================================================

const cabecalho =
    document.querySelector(
        ".cabecalho"
    );


let lastScrollY =
    window.scrollY;


if (cabecalho) {

    window.addEventListener(
        "scroll",
        () => {

            if (
                window.scrollY >
                lastScrollY
            ) {

                cabecalho.classList.add(
                    "cabecalho--hidden"
                );

            } else {

                cabecalho.classList.remove(
                    "cabecalho--hidden"
                );

            }


            lastScrollY =
                window.scrollY;

        }
    );

}