const API =
    "http://localhost:3000";


// =========================================================
// USUÁRIO
// =========================================================

function obterUsuario() {

    try {

        return JSON.parse(
            localStorage.getItem(
                "usuarioLogado"
            )
        );

    } catch (erro) {

        return null;
    }
}


const usuario =
    obterUsuario();


if (!usuario) {

    window.location.href =
        "login.html";
}


// =========================================================
// ELEMENTOS
// =========================================================

const fotoPerfil =
    document.getElementById(
        "fotoPerfil"
    );


const inputFoto =
    document.getElementById(
        "inputFoto"
    );


const botaoAlterarFoto =
    document.getElementById(
        "botaoAlterarFoto"
    );


const nomePerfil =
    document.getElementById(
        "nomePerfil"
    );


const emailPerfil =
    document.getElementById(
        "emailPerfil"
    );


const biografiaPerfil =
    document.getElementById(
        "biografiaPerfil"
    );


const btnEditarPerfil =
    document.getElementById(
        "btnEditarPerfil"
    );


const btnCancelarEdicao =
    document.getElementById(
        "btnCancelarEdicao"
    );


const btnSairConta =
    document.getElementById(
        "btnSairConta"
    );


const areaEdicaoPerfil =
    document.getElementById(
        "areaEdicaoPerfil"
    );


const formPerfil =
    document.getElementById(
        "formPerfil"
    );


const nomePerfilInput =
    document.getElementById(
        "nomePerfilInput"
    );


const emailPerfilInput =
    document.getElementById(
        "emailPerfilInput"
    );


const senhaPerfilInput =
    document.getElementById(
        "senhaPerfilInput"
    );


const biografiaInput =
    document.getElementById(
        "biografiaInput"
    );


const mensagemPerfil =
    document.getElementById(
        "mensagemPerfil"
    );


const listaMinhasAvaliacoes =
    document.getElementById(
        "listaMinhasAvaliacoes"
    );


const contadorAvaliacoes =
    document.getElementById(
        "contadorAvaliacoes"
    );


// =========================================================
// CARREGAR
// =========================================================

carregarPerfil();

carregarMinhasAvaliacoes();


// =========================================================
// ADICIONADO:
// BUSCAR PERFIL NO BANCO
// =========================================================

async function carregarPerfil() {

    const usuarioAtual =
        obterUsuario();


    if (
        !usuarioAtual ||
        !usuarioAtual.id_usuario
    ) {

        window.location.href =
            "login.html";

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API}/usuarios/perfil/${usuarioAtual.id_usuario}`
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            mensagemPerfil.innerText =
                dados.mensagem;

            return;
        }


        preencherPerfil(
            dados.usuario
        );


        // =====================================================
        // MODIFICADO:
        // Atualiza os dados salvos no navegador.
        // =====================================================

        localStorage.setItem(
            "usuarioLogado",
            JSON.stringify(
                dados.usuario
            )
        );


    } catch (erro) {

        console.error(
            "Erro ao carregar perfil:",
            erro
        );

        mensagemPerfil.innerText =
            "Erro ao conectar com o servidor.";
    }
}


// =========================================================
// PREENCHER PERFIL
// =========================================================

function preencherPerfil(
    usuario
) {

    nomePerfil.textContent =
        usuario.nome_usuario ||
        "Usuário";


    emailPerfil.textContent =
        usuario.email ||
        "";


    biografiaPerfil.textContent =
        usuario.biografia ||
        "Adicione uma biografia ao seu perfil.";


    nomePerfilInput.value =
        usuario.nome_usuario ||
        "";


    emailPerfilInput.value =
        usuario.email ||
        "";


    biografiaInput.value =
        usuario.biografia ||
        "";


    senhaPerfilInput.value =
        "";


    // =====================================================
    // MODIFICADO:
    // Carrega a foto salva no banco.
    // =====================================================

    fotoPerfil.src =
        usuario.foto_perfil ||
        "../img/logo.png";
}


// =========================================================
// ADICIONADO:
// ABRIR EDIÇÃO
// =========================================================

btnEditarPerfil.addEventListener(
    "click",
    () => {

        areaEdicaoPerfil.style.display =
            "block";


        botaoAlterarFoto.style.display =
            "inline-block";


        btnEditarPerfil.style.display =
            "none";


        window.scrollTo({
            top:
                areaEdicaoPerfil.offsetTop -
                100,

            behavior:
                "smooth"
        });

    }
);


// =========================================================
// ADICIONADO:
// CANCELAR EDIÇÃO
// =========================================================

btnCancelarEdicao.addEventListener(
    "click",
    () => {

        areaEdicaoPerfil.style.display =
            "none";


        botaoAlterarFoto.style.display =
            "none";


        btnEditarPerfil.style.display =
            "inline-block";


        carregarPerfil();

    }
);


// =========================================================
// ADICIONADO:
// SELECIONAR FOTO
// =========================================================

inputFoto.addEventListener(
    "change",
    function() {

        const arquivo =
            inputFoto.files[0];


        if (!arquivo)
            return;


        if (
            !arquivo.type.startsWith(
                "image/"
            )
        ) {

            mensagemPerfil.innerText =
                "Selecione uma imagem válida.";

            mensagemPerfil.style.color =
                "red";

            inputFoto.value =
                "";

            return;
        }


        // =====================================================
        // ADICIONADO:
        // Limite de 2 MB.
        // =====================================================

        if (
            arquivo.size >
            2 * 1024 * 1024
        ) {

            mensagemPerfil.innerText =
                "A foto deve ter no máximo 2 MB.";

            mensagemPerfil.style.color =
                "red";

            inputFoto.value =
                "";

            return;
        }


        const leitor =
            new FileReader();


        leitor.onload =
            function() {

                // =================================================
                // ADICIONADO:
                // Pré-visualização.
                // =================================================

                fotoPerfil.src =
                    leitor.result;


                fotoPerfil.dataset.novaFoto =
                    leitor.result;


                mensagemPerfil.innerText =
                    "Foto selecionada. Clique em salvar.";

                mensagemPerfil.style.color =
                    "#9b63ff";
            };


        leitor.onerror =
            function() {

                mensagemPerfil.innerText =
                    "Não foi possível carregar a foto.";

                mensagemPerfil.style.color =
                    "red";
            };


        leitor.readAsDataURL(
            arquivo
        );
    }
);


// =========================================================
// ADICIONADO:
// SALVAR PERFIL
// =========================================================

formPerfil.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();


        const usuarioAtual =
            obterUsuario();


        const nome =
            nomePerfilInput.value.trim();


        const email =
            emailPerfilInput.value.trim();


        const senha =
            senhaPerfilInput.value;


        const biografia =
            biografiaInput.value.trim();


        // =====================================================
        // MODIFICADO:
        // Usa a nova foto se houver.
        // Caso contrário, mantém a atual.
        // =====================================================

        const foto_perfil =
            fotoPerfil.dataset.novaFoto ||
            usuarioAtual.foto_perfil ||
            null;


        if (
            !nome ||
            !email
        ) {

            mensagemPerfil.innerText =
                "Preencha nome e e-mail.";

            mensagemPerfil.style.color =
                "red";

            return;
        }


        try {

            const resposta =
                await fetch(
                    `${API}/usuarios/perfil/${usuarioAtual.id_usuario}`,
                    {
                        method: "PUT",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({

                            nome,

                            email,

                            senha,

                            foto_perfil,

                            biografia

                        })
                    }
                );


            const dados =
                await resposta.json();


            if (!dados.sucesso) {

                mensagemPerfil.innerText =
                    dados.mensagem ||
                    "Erro ao salvar perfil.";

                mensagemPerfil.style.color =
                    "red";

                return;
            }


            // =================================================
            // ADICIONADO:
            // Busca novamente os dados diretamente do banco.
            // =================================================

            await carregarPerfil();


            mensagemPerfil.innerText =
                "Perfil atualizado com sucesso!";

            mensagemPerfil.style.color =
                "green";


            fotoPerfil.dataset.novaFoto =
                "";


            inputFoto.value =
                "";


            // =================================================
            // MODIFICADO:
            // Fecha o modo de edição depois de salvar.
            // =================================================

            setTimeout(
                () => {

                    areaEdicaoPerfil.style.display =
                        "none";


                    botaoAlterarFoto.style.display =
                        "none";


                    btnEditarPerfil.style.display =
                        "inline-block";

                },
                700
            );


        } catch (erro) {

            console.error(
                "Erro ao atualizar perfil:",
                erro
            );


            mensagemPerfil.innerText =
                "Erro ao conectar com o servidor. Verifique se o servidor está funcionando.";

            mensagemPerfil.style.color =
                "red";
        }

    }
);


// =========================================================
// ADICIONADO:
// SAIR DA CONTA
// =========================================================

btnSairConta.addEventListener(
    "click",
    function() {

        const confirmar =
            confirm(
                "Deseja realmente sair da sua conta?"
            );


        if (!confirmar)
            return;


        localStorage.removeItem(
            "usuarioLogado"
        );


        window.location.href =
            "login.html";
    }
);


// =========================================================
// ADICIONADO:
// CARREGAR MINHAS AVALIAÇÕES
// =========================================================

async function carregarMinhasAvaliacoes() {

    const usuarioAtual =
        obterUsuario();


    if (
        !usuarioAtual ||
        !usuarioAtual.id_usuario
    ) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API}/usuarios/avaliacoes/usuario/${usuarioAtual.id_usuario}`
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            listaMinhasAvaliacoes.innerHTML =
                `
                    <p>
                        ${escaparHTML(
                            dados.mensagem
                        )}
                    </p>
                `;

            return;
        }


        const avaliacoes =
            dados.avaliacoes || [];


        contadorAvaliacoes.textContent =
            `${avaliacoes.length} ${
                avaliacoes.length === 1
                    ? "avaliação"
                    : "avaliações"
            }`;


        if (
            avaliacoes.length === 0
        ) {

            listaMinhasAvaliacoes.innerHTML =
                `
                    <div class="sem-avaliacoes">

                        <p>
                            Você ainda não fez nenhuma avaliação.
                        </p>

                        <a href="avaliar.html">
                            ⭐ Fazer uma avaliação
                        </a>

                    </div>
                `;

            return;
        }


        listaMinhasAvaliacoes.innerHTML =
            avaliacoes.map(
                avaliacao => {

                    const capa =
                        avaliacao.capa_album
                            ? `
                                <img
                                    src="${escaparHTML(
                                        avaliacao.capa_album
                                    )}"
                                    alt="Capa do álbum"
                                >
                            `
                            : "";


                    return `

                        <article
                            class="card-minha-avaliacao"
                        >

                            ${capa}


                            <div
                                class="conteudo-minha-avaliacao"
                            >

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


                                <p
                                    class="estrelas-avaliacao"
                                >
                                    ${gerarEstrelas(
                                        avaliacao.nota
                                    )}
                                </p>


                                <p>
                                    ${escaparHTML(
                                        avaliacao.comentario
                                    )}
                                </p>


                                <small>
                                    ${escaparHTML(
                                        avaliacao.data_avaliacao ||
                                        "Sem data"
                                    )}
                                </small>

                            </div>


                            <button
                                type="button"
                                class="botao-excluir-avaliacao"
                                data-id="${Number(
                                    avaliacao.id
                                )}"
                            >
                                🗑️ Excluir
                            </button>

                        </article>

                    `;
                }
            ).join("");


        document
            .querySelectorAll(
                ".botao-excluir-avaliacao"
            )
            .forEach(
                botao => {

                    botao.addEventListener(
                        "click",
                        () => {

                            excluirAvaliacao(
                                botao.dataset.id
                            );

                        }
                    );

                }
            );


    } catch (erro) {

        console.error(
            "Erro ao carregar avaliações:",
            erro
        );

        listaMinhasAvaliacoes.innerHTML =
            "<p>Erro ao carregar suas avaliações.</p>";
    }
}


// =========================================================
// EXCLUIR AVALIAÇÃO
// =========================================================

async function excluirAvaliacao(
    id
) {

    const usuarioAtual =
        obterUsuario();


    if (!usuarioAtual)
        return;


    if (
        !confirm(
            "Tem certeza que deseja excluir esta avaliação?"
        )
    ) {

        return;
    }


    try {

        const resposta =
            await fetch(
                `${API}/usuarios/avaliacoes/${id}`,
                {
                    method: "DELETE",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        id_usuario:
                            usuarioAtual.id_usuario
                    })
                }
            );


        const dados =
            await resposta.json();


        if (!dados.sucesso) {

            alert(
                dados.mensagem ||
                "Não foi possível excluir."
            );

            return;
        }


        await carregarMinhasAvaliacoes();


    } catch (erro) {

        console.error(
            "Erro ao excluir avaliação:",
            erro
        );

        alert(
            "Erro ao conectar com o servidor."
        );
    }
}


// =========================================================
// ESTRELAS
// =========================================================

function gerarEstrelas(
    nota
) {

    const numeroNota =
        Number(nota);


    return (
        "⭐".repeat(
            numeroNota
        ) +
        "☆".repeat(
            5 - numeroNota
        )
    );
}


// =========================================================
// PROTEGER HTML
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
// ANIMAÇÃO DO CABEÇALHO
//
// MANTIDO:
// Igual ao Feed e à página Avaliar.
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