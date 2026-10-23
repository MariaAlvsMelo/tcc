
const API = "http://localhost:3000";

const avaliacoesContainer = document.getElementById("home-container");
const btnLoginCabecalho = document.getElementById("btnLoginCabecalho");

// =========================================================
// USUÁRIO LOGADO
// =========================================================

function obterUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch (erro) {
        return null;
    }
}

if (btnLoginCabecalho) {
    btnLoginCabecalho.style.display = obterUsuarioLogado()
        ? "none"
        : "inline-flex";
}

// =========================================================
// FUNÇÕES AUXILIARES
// =========================================================

function escaparHTML(texto) {
    const elemento = document.createElement("div");
    elemento.textContent = texto ?? "";
    return elemento.innerHTML;
}

function gerarEstrelas(nota) {
    const numero = Math.max(0, Math.min(5, Number(nota) || 0));

    let html = `<div class="estrelas-avaliacao" aria-label="Nota ${numero} de 5 estrelas">`;

    for (let i = 1; i <= 5; i++) {
        html += `
            <span class="estrela ${i <= numero ? "ativa" : ""}">
                ★
            </span>
        `;
    }

    html += `</div>`;

    return html;
}

function atualizarBotaoCurtida(botao, curtiu) {
    const icone = botao.querySelector(".icone-curtida");

    botao.classList.toggle("curtido", curtiu);
    botao.setAttribute("aria-pressed", String(curtiu));

    if (icone) {
        icone.textContent = curtiu ? "♥" : "♡";
    }
}

// =========================================================
// VERIFICAR CURTIDA SALVA NO MYSQL
// =========================================================

async function verificarCurtida(idAvaliacao, botao) {
    const usuario = obterUsuarioLogado();

    if (!usuario || !botao) return;

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${idAvaliacao}/curtiu?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error("Erro ao verificar curtida.");
        }

        atualizarBotaoCurtida(botao, Boolean(dados.curtiu));
        botao.disabled = false;

    } catch (erro) {
        console.error("Erro ao verificar curtida:", erro);

        // Evita uma curtida duplicada caso a consulta falhe.
        botao.title = "Não foi possível verificar a curtida.";
    }
}

// =========================================================
// CURTIR E DESCURTIR
// =========================================================

async function curtirAvaliacao(idAvaliacao, botao) {
    const usuario = obterUsuarioLogado();

    if (!usuario) {
        alert("Faça login para curtir uma avaliação.");
        return;
    }

    if (botao.disabled) return;

    const jaCurtiu = botao.classList.contains("curtido");
    const contador = botao.querySelector(".quantidade-curtidas");

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${idAvaliacao}/curtir`,
            {
                method: jaCurtiu ? "DELETE" : "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    id_usuario: usuario.id_usuario
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            // Se o banco já possuir a curtida, apenas
            // recupera o estado correto do botão.
            if (
                String(dados.mensagem || "")
                    .toLowerCase()
                    .includes("já curtiu")
            ) {
                await verificarCurtida(idAvaliacao, botao);
                return;
            }

            throw new Error(
                dados.mensagem || "Erro ao alterar curtida."
            );
        }

        atualizarBotaoCurtida(botao, !jaCurtiu);

        if (contador) {
            const atual = Number(contador.textContent) || 0;
            contador.textContent = jaCurtiu
                ? Math.max(0, atual - 1)
                : atual + 1;
        }

    } catch (erro) {
        console.error("Erro na curtida:", erro);
        alert("Não foi possível alterar a curtida.");

    } finally {
        botao.disabled = false;
    }
}

// =========================================================
// GERAR PLAYER DA MÚSICA
// =========================================================

function gerarPreview(avaliacao) {
    const idDeezer = Number(avaliacao.id_deezer);

    let urlPreview = "";

    // Prioriza o ID da Deezer, pois o endereço antigo
    // salvo no MySQL pode não funcionar mais.
    if (Number.isSafeInteger(idDeezer) && idDeezer > 0) {
        urlPreview = `${API}/deezer/preview/${idDeezer}`;

    } else if (avaliacao.preview) {
        urlPreview = String(avaliacao.preview);

        if (!/^https:\/\//i.test(urlPreview)) {
            urlPreview = "";
        }
    }

    if (!urlPreview) {
        return `
            <div class="preview-avaliacao">
                <p class="preview-titulo">Prévia da música</p>
                <small class="sem-preview">
                    Prévia indisponível para esta música.
                </small>
            </div>
        `;
    }

    return `
        <div class="preview-avaliacao">
            <p class="preview-titulo">Prévia da música</p>

            <audio
                controls
                preload="metadata"
                src="${escaparHTML(urlPreview)}"
                onerror="
                    this.closest('.preview-avaliacao')
                    .querySelector('.erro-preview').hidden = false;
                "
                onloadeddata="
                    this.closest('.preview-avaliacao')
                    .querySelector('.erro-preview').hidden = true;
                "
            >
                Seu navegador não suporta áudio.
            </audio>

            <small class="erro-preview" hidden>
                Não foi possível reproduzir esta prévia.
            </small>
        </div>
    `;
}

// =========================================================
// CARREGAR AVALIAÇÕES
// =========================================================

async function carregarAvaliacoes() {
    if (!avaliacoesContainer) return;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error("Erro ao carregar avaliações.");
        }

        if (!dados.avaliacoes || !dados.avaliacoes.length) {
            avaliacoesContainer.innerHTML =
                "<p>Nenhuma avaliação encontrada ainda.</p>";
            return;
        }

        const usuario = obterUsuarioLogado();
        const idUsuario = usuario?.id_usuario;

        // Cria todos os cards antes de verificar curtidas.
        const cards = dados.avaliacoes.map(avaliacao => {
            const idAvaliacao = Number(avaliacao.id);

            if (!Number.isSafeInteger(idAvaliacao)) {
                return "";
            }

            const totalCurtidas =
                Number(avaliacao.total_curtidas) || 0;

            const nomeAutor =
                avaliacao.nome_usuario || "Usuário";


            const idAutor = Number(avaliacao.id_usuario);

            const perfilURL =
                Number.isSafeInteger(idAutor) && idAutor > 0
                    ? (
                        Number(idUsuario) === idAutor
                            ? "perfil.html"
                            : `perfil-publico.html?id=${idAutor}`
                    )
                    : null;


            const emailAutor =
                avaliacao.email || "";

            const fotoHTML = avaliacao.foto_perfil
                ? `
                    <img
                        src="${escaparHTML(avaliacao.foto_perfil)}"
                        alt="Foto de perfil"
                        class="foto-autor-avaliacao"
                    >
                `
                : `
                    <div class="foto-autor-avaliacao foto-autor-placeholder">
                        👤
                    </div>
                `;


            const capaHTML = avaliacao.capa_album
                ? `
                    <img
                        src="${escaparHTML(avaliacao.capa_album)}"
                        alt="Capa do álbum"
                        class="capa-musica-feed"
                    >
                `
                : "";


            const botaoCurtida = idUsuario
                ? `
                    <button
                        type="button"
                        class="btn-curtir"
                        data-id="${idAvaliacao}"
                        aria-pressed="false"
                        disabled
                        onclick="curtirAvaliacao(${idAvaliacao}, this)"
                    >
                        <span class="icone-curtida">♡</span>
                        <span class="quantidade-curtidas">
                            ${totalCurtidas}
                        </span>
                    </button>
                `
                : `
                    <div class="curtidas-sem-login">
                        ♡ ${totalCurtidas}
                    </div>
                `;


return `
    <div
        class="card-avaliacao"
        data-avaliacao-id="${idAvaliacao}"
    >

        <!-- CURTIDA -->

        <div class="curtida-canto-superior">
            ${botaoCurtida}
        </div>

        <!-- AUTOR -->

       
   
<!-- AUTOR DA AVALIAÇÃO -->

    <div class="autor-avaliacao">

        ${
            perfilURL
                ? `
                    <a
                        href="${perfilURL}"
                        class="link-perfil-autor"
                        aria-label="Visualizar perfil de ${escaparHTML(nomeAutor)}"
                    >

                        ${fotoHTML}

                        <div class="dados-autor">

                            <strong>
                                ${escaparHTML(nomeAutor)}
                            </strong>

                            <span class="email-autor">
                                ${escaparHTML(emailAutor)}
                            </span>

                        </div>

                    </a>
                `
                : `
                    ${fotoHTML}

                    <div class="dados-autor">

                        <strong>
                            ${escaparHTML(nomeAutor)}
                        </strong>

                        <span class="email-autor">
                            ${escaparHTML(emailAutor)}
                        </span>

                    </div>
                `
        }

    </div>


        <!-- CAPA E INFORMAÇÕES LADO A LADO -->

        <div class="conteudo-card-musica">

            <div class="capa-musica-container">
                ${capaHTML}
            </div>

            <div class="informacoes-musica">

                <h3>${escaparHTML(avaliacao.musica)}</h3>

                <p class="artista-avaliacao"><strong>Artista:</strong> ${escaparHTML(avaliacao.artista)}</p>

                <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">
                    ${escaparHTML(avaliacao.data_avaliacao || "Sem data")}
                </p>

                <div class="area-preview-feed">
                    ${gerarPreview(avaliacao)}
                </div>

            </div>

        </div>

    </div>
`;

        });

        avaliacoesContainer.innerHTML = cards.join("");

        // Verifica o estado das curtidas somente depois
        // que todos os elementos estão na página.
        if (idUsuario) {
            const botoes = avaliacoesContainer.querySelectorAll(
                ".btn-curtir"
            );

            await Promise.all(
                Array.from(botoes).map(botao => {
                    return verificarCurtida(
                        Number(botao.dataset.id),
                        botao
                    );
                })
            );
        }

    } catch (erro) {
        console.error("Erro ao carregar avaliações:", erro);

        avaliacoesContainer.innerHTML = `
            <p>
                Erro ao carregar avaliações.
                Verifique se o servidor está funcionando.
            </p>
        `;
    }
}

// =========================================================
// INICIAR FEED
// =========================================================

carregarAvaliacoes();

// =========================================================
// ESCONDER / MOSTRAR CABEÇALHO AO ROLAR
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
