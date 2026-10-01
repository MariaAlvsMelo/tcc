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


const listaSugestoes =
    document.getElementById(
        "listaSugestoes"
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


// =========================================================
// MANTIDO:
// Música selecionada da Deezer.
// =========================================================

let musicaDeezerSelecionada =
    null;


// =========================================================
// PESQUISA
// =========================================================

let tempoBusca;


campoMusica.addEventListener(
    "input",
    function() {

        musicaDeezerSelecionada =
            null;


        campoArtista.value =
            "";


        musicaSelecionada.style.display =
            "none";


        const busca =
            campoMusica.value.trim();


        clearTimeout(
            tempoBusca
        );


        if (
            busca.length < 2
        ) {

            listaSugestoes.innerHTML =
                "";

            listaSugestoes.style.display =
                "none";

            return;
        }


        tempoBusca =
            setTimeout(
                () => {

                    buscarMusicas(
                        busca
                    );

                },
                400
            );

    }
);


// =========================================================
// BUSCAR NA DEEZER
// =========================================================

async function buscarMusicas(
    busca
) {

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
            dados.data || []
        );


    } catch (erro) {

        console.error(
            "Erro ao buscar músicas:",
            erro
        );


        listaSugestoes.innerHTML = `
            <div style="
                padding:12px;
                color:#ff7777;
            ">
                Não foi possível buscar músicas.
            </div>
        `;


        listaSugestoes.style.display =
            "block";
    }
}


// =========================================================
// SUGESTÕES
// =========================================================

function mostrarSugestoes(
    musicas
) {

    listaSugestoes.innerHTML =
        "";


    if (
        !musicas ||
        musicas.length === 0
    ) {

        listaSugestoes.innerHTML = `
            <div style="
                padding:12px;
                color:#aaa;
            ">
                Nenhuma música encontrada.
            </div>
        `;


        listaSugestoes.style.display =
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


                listaSugestoes.appendChild(
                    sugestao
                );

            }
        );


    listaSugestoes.style.display =
        "block";
}


// =========================================================
// SELECIONAR MÚSICA
// =========================================================

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
    }


    tituloMusicaSelecionada.textContent =
        musica.title;


    albumMusicaSelecionada.textContent =
        musica.album?.title
            ? `Álbum: ${musica.album.title}`
            : "";


    listaSugestoes.innerHTML =
        "";


    listaSugestoes.style.display =
        "none";
}


// =========================================================
// FECHAR SUGESTÕES
// =========================================================

document.addEventListener(
    "click",
    function(event) {

        if (
            !campoMusica.contains(
                event.target
            ) &&
            !listaSugestoes.contains(
                event.target
            )
        ) {

            listaSugestoes.style.display =
                "none";
        }

    }
);


// =========================================================
// MODIFICADO:
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
            // MODIFICADO:
            // Agora envia id_usuario.
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


                listaSugestoes.innerHTML =
                    "";


                listaSugestoes.style.display =
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