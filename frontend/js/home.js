const API = "http://localhost:3000";

const avaliacoesContainer =
    document.getElementById(
        "home-container"
    );


// ==========================================
// GERAR ESTRELAS
// ==========================================

function gerarEstrelas(nota) {

    const numeroNota =
        Number(nota);

    return (
        "⭐".repeat(numeroNota) +
        "☆".repeat(5 - numeroNota)
    );
}


// ==========================================
// CARREGAR AVALIAÇÕES
// ==========================================

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


        dados.avaliacoes.forEach(
            (avaliacao) => {


                const dataFormatada =
                    avaliacao.data_avaliacao
                        ? avaliacao.data_avaliacao
                        : "Sem data";


                const capaHTML =
                    avaliacao.capa_album
                        ? `
                            <img
                                src="${avaliacao.capa_album}"
                                alt="Capa do álbum"
                                style="
                                    width: 120px;
                                    height: 120px;
                                    object-fit: cover;
                                    border-radius: 10px;
                                    flex-shrink: 0;
                                "
                            >
                        `
                        : "";


                avaliacoesContainer.innerHTML += `

                    <div class="card-avaliacao">

                        <div style="
                            display: flex;
                            gap: 20px;
                            align-items: flex-start;
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
                                        color: #777;
                                        font-size: 0.85rem;
                                        margin-top: 10px;
                                    "
                                >

                                    <small>
                                        ${dataFormatada}
                                    </small>

                                </p>

                            </div>

                        </div>

                    </div>

                `;
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


// ==========================================
// PROTEGER TEXTO
// ==========================================

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto;

    return div.innerHTML;
}


// ==========================================
// INICIAR
// ==========================================

carregarAvaliacoes();


// ==========================================
// CABEÇALHO AO ROLAR
// ==========================================

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