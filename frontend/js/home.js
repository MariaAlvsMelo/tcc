const API =
    "http://localhost:3000";


const avaliacoesContainer =
    document.getElementById(
        "home-container"
    );


// =========================================================
// ESTRELAS
// =========================================================

function gerarEstrelas(
    nota
) {

    const numeroNota =
        Number(nota);

    return (
        "⭐".repeat(numeroNota) +
        "☆".repeat(5 - numeroNota)
    );
}


// =========================================================
// CARREGAR AVALIAÇÕES
// =========================================================

async function carregarAvaliacoes() {

    try {

        const resposta =
            await fetch(
                `${API}/usuarios/avaliacoes`
            );


        const dados =
            await resposta.json();


        avaliacoesContainer.innerHTML =
            "";


        if (
            !dados.sucesso ||
            !dados.avaliacoes ||
            dados.avaliacoes.length === 0
        ) {

            avaliacoesContainer.innerHTML =
                "<p>Nenhuma avaliação encontrada ainda.</p>";

            return;
        }


        // =================================================
        // ADICIONADO:
        // Verifica qual usuário está logado.
        // =================================================

        const usuarioLogado =
            JSON.parse(
                localStorage.getItem(
                    "usuarioLogado"
                )
            );


        const idUsuario =
            usuarioLogado
                ? usuarioLogado.id_usuario
                : null;


        dados.avaliacoes.forEach(
            (avaliacao) => {


                const dataFormatada =
                    avaliacao.data_avaliacao ||
                    "Sem data";


                const capaHTML =
                    avaliacao.capa_album

                        ? `
                            <img
                                src="${escaparHTML(
                                    avaliacao.capa_album
                                )}"
                                alt="Capa do álbum"
                                style="
                                    width:120px;
                                    height:120px;
                                    object-fit:cover;
                                    border-radius:10px;
                                    flex-shrink:0;
                                "
                            >
                        `

                        : "";


                // =================================================
                // ADICIONADO:
                // Exibe a foto do usuário que fez a avaliação.
                // =================================================

                const fotoHTML =
                    avaliacao.foto_perfil

                        ? `
                            <img
                                src="${escaparHTML(
                                    avaliacao.foto_perfil
                                )}"
                                alt="Foto de perfil"
                                class="foto-autor-avaliacao"
                            >
                        `

                        : `
                            <div
                                class="
                                    foto-autor-avaliacao
                                    foto-autor-placeholder
                                "
                            >
                                👤
                            </div>
                        `;


                // =================================================
                // ADICIONADO:
                // Nome e e-mail do usuário.
                // =================================================

                const nomeAutor =
                    avaliacao.nome_usuario ||
                    "Usuário";


                const emailAutor =
                    avaliacao.email ||
                    "";


                // =================================================
                // ADICIONADO:
                // Quantidade de curtidas da avaliação.
                // =================================================

                const totalCurtidas =
                    Number(
                        avaliacao.total_curtidas || 0
                    );


                // =================================================
                // ADICIONADO:
                // Botão de curtida.
                // =================================================

                let botaoCurtida = "";


                if (idUsuario) {

                    botaoCurtida = `
                        <button
                            class="btn-curtir"
                            data-id="${avaliacao.id}"
                            onclick="curtirAvaliacao(
                                ${avaliacao.id},
                                this
                            )"
                        >

                            <span class="icone-curtida">
                                ♡
                            </span>

                            <span class="quantidade-curtidas">
                                ${totalCurtidas}
                            </span>

                        </button>
                    `;

                } else {

                    botaoCurtida = `
                        <div class="curtidas-sem-login">

                            ♡
                            ${totalCurtidas}

                        </div>
                    `;

                }


                // =================================================
                // MODIFICADO:
                // Card da avaliação.
                // Foi mantida a estrutura original.
                // =================================================

                avaliacoesContainer.innerHTML += `

                    <div
                        class="card-avaliacao"
                        data-avaliacao-id="${avaliacao.id}"
                    >


                        <div class="autor-avaliacao">

                            ${fotoHTML}

                            <div>

                                <strong>
                                    ${escaparHTML(
                                        nomeAutor
                                    )}
                                </strong>

                                <span>
                                    ${escaparHTML(
                                        emailAutor
                                    )}
                                </span>

                            </div>

                        </div>


                        <div style="
                            display:flex;
                            gap:20px;
                            align-items:flex-start;
                        ">


                            ${capaHTML}


                            <div>

                                <h3>
                                    ${escaparHTML(
                                        avaliacao.musica
                                    )}
                                </h3>


                                <p>

                                    <strong>
                                        Artista:
                                    </strong>

                                    ${escaparHTML(
                                        avaliacao.artista
                                    )}

                                </p>


                                <p>

                                    ${escaparHTML(
                                        avaliacao.comentario
                                    )}

                                </p>


                                <p>

                                    ${gerarEstrelas(
                                        avaliacao.nota
                                    )}

                                </p>


                                <p
                                    class="data-postagem"
                                    style="
                                        color:#777;
                                        font-size:0.85rem;
                                        margin-top:10px;
                                    "
                                >

                                    <small>

                                        ${escaparHTML(
                                            dataFormatada
                                        )}

                                    </small>

                                </p>


                                <!-- =====================================
                                     ADICIONADO:
                                     Área de curtida
                                     ===================================== -->

                                <div class="area-curtida">

                                    ${botaoCurtida}

                                </div>


                            </div>

                        </div>

                    </div>

                `;


                // =================================================
                // ADICIONADO:
                // Depois que o card foi criado,
                // verifica se o usuário já curtiu.
                // =================================================

                if (idUsuario) {

                    const card =
                        avaliacoesContainer.querySelector(
                            `[data-avaliacao-id="${avaliacao.id}"]`
                        );


                    if (card) {

                        const botao =
                            card.querySelector(
                                ".btn-curtir"
                            );


                        if (botao) {

                            verificarCurtida(
                                avaliacao.id,
                                botao
                            );

                        }

                    }

                }

            }
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar avaliações:",
            erro
        );


        avaliacoesContainer.innerHTML =
            "<p>Erro ao carregar avaliações. Verifique se o servidor está rodando.</p>";
    }
}


// =========================================================
// ADICIONADO:
// CURTIR / DESCURTIR AVALIAÇÃO
// =========================================================

async function curtirAvaliacao(
    idAvaliacao,
    botao
) {


    const usuarioLogado =
        JSON.parse(
            localStorage.getItem(
                "usuarioLogado"
            )
        );


    if (!usuarioLogado) {

        alert(
            "Faça login para curtir uma avaliação."
        );

        return;
    }


    const idUsuario =
        usuarioLogado.id_usuario;


    const estaCurtido =
        botao.classList.contains(
            "curtido"
        );


    try {

        let resposta;


        // =================================================
        // ADICIONADO:
        // Se já curtiu, remove a curtida.
        // =================================================

        if (estaCurtido) {

            resposta =
                await fetch(
                    `${API}/usuarios/avaliacoes/${idAvaliacao}/curtir`,
                    {

                        method: "DELETE",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            id_usuario:
                                idUsuario
                        })

                    }
                );

        }


        // =================================================
        // ADICIONADO:
        // Se ainda não curtiu, adiciona a curtida.
        // =================================================

        else {

            resposta =
                await fetch(
                    `${API}/usuarios/avaliacoes/${idAvaliacao}/curtir`,
                    {

                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            id_usuario:
                                idUsuario
                        })

                    }
                );

        }


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            alert(
                dados.mensagem ||
                "Não foi possível alterar a curtida."
            );

            return;
        }


        // =================================================
        // ADICIONADO:
        // Atualiza o coração e o número sem
        // precisar recarregar a página.
        // =================================================

        const icone =
            botao.querySelector(
                ".icone-curtida"
            );


        const quantidade =
            botao.querySelector(
                ".quantidade-curtidas"
            );


        let numeroAtual =
            parseInt(
                quantidade.textContent
            ) || 0;


        if (estaCurtido) {

            // ---------------------------------------------
            // DESCURTIR
            // ---------------------------------------------

            botao.classList.remove(
                "curtido"
            );


            icone.textContent =
                "♡";


            numeroAtual =
                Math.max(
                    0,
                    numeroAtual - 1
                );

        } else {

            // ---------------------------------------------
            // CURTIR
            // ---------------------------------------------

            botao.classList.add(
                "curtido"
            );


            icone.textContent =
                "♥";


            numeroAtual++;

        }


        quantidade.textContent =
            numeroAtual;


    } catch (erro) {

        console.error(
            "Erro ao alterar curtida:",
            erro
        );


        alert(
            "Erro ao conectar com o servidor."
        );

    }

}


// =========================================================
// ADICIONADO:
// VERIFICAR SE O USUÁRIO JÁ CURTIU
// =========================================================

async function verificarCurtida(
    idAvaliacao,
    botao
) {


    const usuarioLogado =
        JSON.parse(
            localStorage.getItem(
                "usuarioLogado"
            )
        );


    if (!usuarioLogado) {

        return;
    }


    const idUsuario =
        usuarioLogado.id_usuario;


    try {

        const resposta =
            await fetch(
                `${API}/usuarios/avaliacoes/${idAvaliacao}/curtiu?id_usuario=${idUsuario}`
            );


        const dados =
            await resposta.json();


        if (
            dados.sucesso &&
            dados.curtiu
        ) {

            botao.classList.add(
                "curtido"
            );


            const icone =
                botao.querySelector(
                    ".icone-curtida"
                );


            if (icone) {

                icone.textContent =
                    "♥";

            }

        }


    } catch (erro) {

        console.error(
            "Erro ao verificar curtida:",
            erro
        );

    }

}


// =========================================================
// PROTEGER TEXTO
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
// INICIAR
// =========================================================

carregarAvaliacoes();


// =========================================================
// CABEÇALHO AO ROLAR
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