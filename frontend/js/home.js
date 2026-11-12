
const API = (
    window.location.hostname === "localhost" ||
    window.location.hostname === "127.0.0.1"
)
    ? "http://localhost:3000"
    : "https://entre-notas-api.onrender.com";const avaliacoesContainer = document.getElementById("home-container");
const btnLoginCabecalho = document.getElementById("btnLoginCabecalho");
const avaliacoesPorId = new Map();

// =========================================================
// USUÁRIO LOGADO
// =========================================================

function obterUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch {
        return null;
    }
}

function obterToken() {
    const usuario = obterUsuarioLogado();
    return usuario?.access_token || "";
}

// =========================================================
// SEGURANÇA
// =========================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[c]);
}

function urlImagemSegura(valor) {
    const str = String(valor || "");

    if (
        /^https:\/\//i.test(str) ||
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(str) ||
        /^\.\.\/img\//.test(str)
    ) {
        return str;
    }

    return "";
}

// =========================================================
// ESTRELAS PADRONIZADAS
// =========================================================

function gerarEstrelas(nota) {
    const n = Math.max(0, Math.min(5, Math.round(Number(nota) || 0)));

    return `
        <div
            class="estrelas-avaliacao"
            role="img"
            aria-label="Nota ${n} de 5 estrelas"
        >
            ${Array.from({ length: 5 }, (_, i) => `
                <span
                    class="estrela ${i < n ? "ativa" : ""}"
                    aria-hidden="true"
                >★</span>
            `).join("")}
        </div>
    `;
}

// =========================================================
// PRÉVIA MUSICAL
// =========================================================

function gerarPreview(avaliacao) {
    const id = String(avaliacao.id_deezer ?? "");

    const src =
        /^\d{1,20}$/.test(id) && Number(id) > 0
            ? `${API}/deezer/preview/${id}`
            : /^https:\/\//i.test(String(avaliacao.preview || ""))
                ? String(avaliacao.preview)
                : "";

    if (!src) {
        return `
            <div class="preview-avaliacao">
                <span class="preview-titulo">Prévia da música</span>
                <small class="sem-preview">
                    Prévia indisponível.
                </small>
            </div>
        `;
    }

    return `
        <div class="preview-avaliacao">
            <span class="preview-titulo">Prévia da música</span>

            <audio
                controls
                preload="none"
                src="${escaparHTML(src)}"
            ></audio>

            <small class="erro-preview" hidden>
                Prévia indisponível no momento.
            </small>
        </div>
    `;
}

// =========================================================
// FORMATAR DATA
// =========================================================

function formatoData(data) {
    if (!data) return "";

    if (String(data).includes("/")) {
        return String(data);
    }

    const d = new Date(data);

    return Number.isNaN(d.getTime())
        ? String(data)
        : d.toLocaleString("pt-BR");
}

// =========================================================
// BOTÃO DE CURTIDA
// =========================================================

function renderizarCurtida(avaliacao, usuario) {
    const id = Number(avaliacao.id);
    const total = Math.max(0, Number(avaliacao.total_curtidas) || 0);

    if (!usuario) {
        return `
            <span
                class="curtidas-sem-login"
                aria-label="${total} curtidas"
            >
                <span aria-hidden="true">♡</span>
                ${total}
            </span>
        `;
    }

    return `
        <button
            type="button"
            class="btn-curtir"
            data-id="${id}"
            disabled
            aria-pressed="false"
            aria-label="Curtir avaliação"
        >
            <span class="icone-curtida" aria-hidden="true">♡</span>
            <span class="quantidade-curtidas">${total}</span>
        </button>
    `;
}

function atualizarCurtida(botao, curtiu) {
    botao.classList.toggle("curtido", Boolean(curtiu));

    botao.setAttribute(
        "aria-pressed",
        String(Boolean(curtiu))
    );

    botao.setAttribute(
        "aria-label",
        curtiu ? "Remover curtida" : "Curtir avaliação"
    );

    const icone = botao.querySelector(".icone-curtida");

    if (icone) {
        icone.textContent = curtiu ? "♥" : "♡";
    }
}

// =========================================================
// VERIFICAR CURTIDA NO SUPABASE
// =========================================================

async function verificarCurtida(id, botao) {
    const usuario = obterUsuarioLogado();
    const token = obterToken();

    if (!usuario || !token || !botao) return;

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/curtiu?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            {
                cache: "no-store",
                headers: {
                    "Authorization": `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao consultar curtida"
            );
        }

        atualizarCurtida(botao, Boolean(dados.curtiu));
        botao.disabled = false;

    } catch (erro) {
        console.error("Falha na verificação da curtida:", erro);

        botao.title =
            "Não foi possível consultar esta curtida. Atualize a página.";
    }
}

// =========================================================
// CURTIR E DESCURTIR
// =========================================================

async function curtirAvaliacao(id, botao) {
    const usuario = obterUsuarioLogado();
    const token = obterToken();

    if (!usuario || !token) {
        window.location.href = "login.html";
        return;
    }

    if (botao.disabled) return;

    const estavaCurtido = botao.classList.contains("curtido");

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/curtir`,
            {
                method: estavaCurtido ? "DELETE" : "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },

                body: JSON.stringify({
                    id_usuario: usuario.id_usuario
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            if (
                String(dados.mensagem || "")
                    .toLowerCase()
                    .includes("já curtiu")
            ) {
                const total = botao.querySelector(
                    ".quantidade-curtidas"
                );

                if (total && !estavaCurtido) {
                    total.textContent =
                        (Number(total.textContent) || 0) + 1;
                }

                atualizarCurtida(botao, true);
                return;
            }

            throw new Error(
                dados.mensagem ||
                "Não foi possível alterar a curtida."
            );
        }

        atualizarCurtida(botao, !estavaCurtido);

        const total = botao.querySelector(
            ".quantidade-curtidas"
        );

        if (total) {
            total.textContent = Math.max(
                0,
                (Number(total.textContent) || 0) +
                (estavaCurtido ? -1 : 1)
            );
        }

    } catch (erro) {
        console.error("Falha ao alterar curtida:", erro);
        alert("Não foi possível alterar a curtida.");

    } finally {
        botao.disabled = false;
    }
}

// =========================================================
// MONTAR CARD DO FEED
// =========================================================

function montarCard(avaliacao, usuario) {
    const id = Number(avaliacao.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return "";
    }

    const idAutor = Number(avaliacao.id_usuario);

    const perfilURL =
        Number.isSafeInteger(idAutor) && idAutor > 0
            ? (
                Number(usuario?.id_usuario) === idAutor
                    ? "perfil.html"
                    : `perfil-publico.html?id=${idAutor}`
            )
            : "";

    const nome = avaliacao.nome_usuario || "Usuário";
    const email = avaliacao.email || "";

    const foto = urlImagemSegura(avaliacao.foto_perfil);
    const capa = urlImagemSegura(avaliacao.capa_album);

    const avatar = foto
        ? `
            <img
                class="foto-autor-avaliacao"
                src="${escaparHTML(foto)}"
                alt="Foto do usuário"
            >
        `
        : `
            <span
                class="foto-autor-avaliacao foto-autor-placeholder"
                aria-hidden="true"
            >👤</span>
        `;

    const dadosAutor = `
        ${avatar}

        <span class="dados-autor">
            <strong>${escaparHTML(nome)}</strong>
            <span class="email-autor">${escaparHTML(email)}</span>
        </span>
    `;

    const autor = perfilURL
        ? `
            <a
                class="link-perfil-autor"
                href="${perfilURL}"
                aria-label="Abrir perfil de ${escaparHTML(nome)}"
            >
                ${dadosAutor}
            </a>
        `
        : `
            <div class="link-perfil-autor">
                ${dadosAutor}
            </div>
        `;

    const capaHTML = capa
        ? `
            <img
                class="capa-musica-feed"
                src="${escaparHTML(capa)}"
                alt="Capa do álbum"
            >
        `
        : `
            <div
                class="capa-musica-feed capa-placeholder"
                aria-hidden="true"
            >♫</div>
        `;

    return `
        <article
            class="card-avaliacao"
            data-avaliacao-id="${id}"
        >

            <div class="curtida-canto-superior">
                ${renderizarCurtida(avaliacao, usuario)}
            </div>

            <div class="autor-avaliacao">
                ${autor}
            </div>

            <div class="conteudo-card-musica">

                <div class="capa-musica-container">
                    ${capaHTML}
                </div>

                <div class="informacoes-musica">

                    <h3>${escaparHTML(avaliacao.musica)}</h3>

                    <p class="artista-avaliacao">
                        <strong>Artista:</strong>
                        ${escaparHTML(avaliacao.artista)}
                    </p>

                    <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                    ${gerarEstrelas(avaliacao.nota)}

                    <p class="data-postagem">
                        ${escaparHTML(formatoData(avaliacao.data_avaliacao))}
                    </p>

                    <div class="area-preview-feed">
                        ${gerarPreview(avaliacao)}
                    </div>

                                </div>
            </div>

                    <!-- ADICIONADO: ACESSO AOS COMENTÁRIOS -->
            <section class="area-respostas" data-id-avaliacao="${id}">
                <button
                    type="button"
                    class="btn-toggle-respostas"
                    data-id="${id}"
                >
                    💬 Comentários
                </button>
            </section>
        </article>
    `;
}


// =========================================================
// ADICIONADO: CARREGAR RESPOSTAS
// =========================================================


async function carregarRespostas(id) {
    const lista = document.getElementById("lista-comentarios-modal");

    if (!lista) return;

    lista.innerHTML = `
        <p class="carregando-respostas">
            Carregando comentários...
        </p>
    `;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/respostas`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(dados.mensagem || "Erro ao carregar comentários.");
        }

        const comentarios = dados.respostas || [];

        if (!comentarios.length) {
            lista.innerHTML = `
                <p class="sem-respostas">
                    Ainda não há comentários. Seja o primeiro a comentar!
                </p>
            `;
            return;
        }

        lista.innerHTML = comentarios.map(item => `
            <article class="card-resposta">
                <strong>${escaparHTML(item.nome_usuario)}</strong>
                <p>${escaparHTML(item.resposta)}</p>
                <small>${escaparHTML(formatoData(item.data_resposta))}</small>
            </article>
        `).join("");

    } catch (erro) {
        console.error("Erro ao carregar comentários:", erro);

        lista.innerHTML = `
            <p class="sem-respostas">
                Não foi possível carregar os comentários.
            </p>
        `;
    }
}


function abrirTelaComentarios(id) {
    const avaliacao = avaliacoesPorId.get(Number(id));

    if (!avaliacao) {
        alert("Não foi possível encontrar esta avaliação.");
        return;
    }

    let tela = document.getElementById("tela-comentarios");

    if (!tela) {
        tela = document.createElement("div");
        tela.id = "tela-comentarios";
        tela.className = "tela-comentarios";

        document.body.appendChild(tela);
    }

    const capa = urlImagemSegura(avaliacao.capa_album);

    tela.innerHTML = `
        <div class="conteudo-tela-comentarios">

            <button type="button" class="btn-voltar-comentarios">
                ← Voltar ao Feed
            </button>

            <h2>Comentários</h2>

            <article class="avaliacao-em-comentarios">
                <div class="autor-avaliacao">
                    <strong>${escaparHTML(avaliacao.nome_usuario || "Usuário")}</strong>
                </div>

                <div class="conteudo-card-musica">
                    ${capa ? `
                        <img
                            class="capa-musica-feed"
                            src="${escaparHTML(capa)}"
                            alt="Capa do álbum"
                        >
                    ` : ""}

                    <div class="informacoes-musica">
                        <h3>${escaparHTML(avaliacao.musica)}</h3>

                        <p>
                            <strong>Artista:</strong>
                            ${escaparHTML(avaliacao.artista)}
                        </p>

                        <p class="comentario-avaliacao">
                            ${escaparHTML(avaliacao.comentario)}
                        </p>

                        ${gerarEstrelas(avaliacao.nota)}

                        <p class="data-postagem">
                            ${escaparHTML(formatoData(avaliacao.data_avaliacao))}
                        </p>
                    </div>
                </div>
            </article>

            <section class="secao-lista-comentarios">
                <h3>Comentários publicados</h3>

                <div id="lista-comentarios-modal">
                    <p>Carregando comentários...</p>
                </div>
            </section>

            ${obterToken() ? `
                <form class="form-resposta form-comentario-modal" data-id="${id}">
                    <label for="campo-comentario-modal">
                        Escreva seu comentário
                    </label>

                    <textarea
                        id="campo-comentario-modal"
                        name="resposta"
                        maxlength="500"
                        placeholder="Compartilhe sua opinião..."
                        required
                    ></textarea>

                    <button type="submit">Publicar comentário</button>
                </form>
            ` : `
                <p class="aviso-login-resposta">
                    Faça login para comentar.
                    <a href="login.html">Entrar</a>
                </p>
            `}
        </div>
    `;

    tela.classList.add("aberta");
    document.body.classList.add("comentarios-abertos");

// ADICIONADO: botão para voltar ao Feed
const botaoVoltar = tela.querySelector(".btn-voltar-comentarios");

botaoVoltar.addEventListener("click", fecharTelaComentarios);

// ADICIONADO: envio do comentário pelo formulário da tela
const formulario = tela.querySelector(".form-comentario-modal");

if (formulario) {
    formulario.addEventListener("submit", event => {
        event.preventDefault();
        publicarResposta(id, formulario);
    });
}

// Carregar comentários publicados
carregarRespostas(id);}

// ADICIONADO: fechar a tela de comentários
function fecharTelaComentarios() {
    const tela = document.getElementById("tela-comentarios");

    if (tela) {
        tela.classList.remove("aberta");
    }

    document.body.classList.remove("comentarios-abertos");
}


// =========================================================
// ADICIONADO: PUBLICAR RESPOSTA
// =========================================================

async function publicarResposta(id, formulario) {
    const campo = formulario.querySelector("textarea");
    const botao = formulario.querySelector("button");
    const resposta = campo.value.trim();
    const token = obterToken();

    if (!token) {
        window.location.href = "login.html";
        return;
    }

    if (!resposta || resposta.length > 500) {
        alert("Digite uma resposta de até 500 caracteres.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {
        const requisicao = await fetch(
            `${API}/usuarios/avaliacoes/${id}/respostas`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                },
                body: JSON.stringify({ resposta })
            }
        );

        const dados = await requisicao.json();

        if (!requisicao.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Não foi possível publicar."
            );
        }

        formulario.reset();

        await carregarRespostas(id);

    } catch (erro) {
        console.error("Erro ao publicar resposta:", erro);
        alert(erro.message || "Erro ao publicar resposta.");

    } finally {
        botao.disabled = false;
        botao.textContent = "Publicar comentário";
    }
}

// =========================================================
// CARREGAR AVALIAÇÕES
// =========================================================

async function carregarAvaliacoes() {
    if (!avaliacoesContainer) return;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes`,
            { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao carregar avaliações."
            );
        }

        const avaliacoes = dados.avaliacoes || [];

        // ADICIONADO: guardar avaliações para abrir seus comentários
    avaliacoesPorId.clear();

    avaliacoes.forEach(avaliacao => {
        avaliacoesPorId.set(Number(avaliacao.id), avaliacao);
    });

        if (!avaliacoes.length) {
            avaliacoesContainer.innerHTML = `
                <p class="mensagem-lista-vazia">
                    Nenhuma avaliação encontrada ainda.
                </p>
            `;
            return;
        }

        const usuario = obterUsuarioLogado();

        avaliacoesContainer.innerHTML = avaliacoes
            .map(a => montarCard(a, usuario))
            .join("");

        if (usuario?.access_token) {
            const botoes = Array.from(
                avaliacoesContainer.querySelectorAll(".btn-curtir")
            );

            await Promise.all(
                botoes.map(botao =>
                    verificarCurtida(
                        Number(botao.dataset.id),
                        botao
                    )
                )
            );
        }

    } catch (erro) {
        console.error("Erro no Feed:", erro);

        avaliacoesContainer.innerHTML = `
            <p class="mensagem-lista-vazia">
                Não foi possível carregar o Feed.
                Verifique o servidor.
            </p>
        `;
    }
}


// =========================================================
// INICIAR EVENTOS
// =========================================================

if (btnLoginCabecalho) {
    btnLoginCabecalho.style.display =
        obterUsuarioLogado() ? "none" : "inline-flex";
}

if (avaliacoesContainer) {

    // ADICIONADO: eventos de clique do Feed
    avaliacoesContainer.addEventListener("click", event => {

        const botaoRespostas = event.target.closest(
            ".btn-toggle-respostas"
        );

        if (botaoRespostas) {
            const id = Number(botaoRespostas.dataset.id);

            abrirTelaComentarios(id);
            return;
        }

        const botao = event.target.closest(".btn-curtir");

        if (botao) {
            curtirAvaliacao(
                Number(botao.dataset.id),
                botao
            );
        }
    });

    // ADICIONADO: detectar erros nas prévias musicais
    avaliacoesContainer.addEventListener(
        "error",
        event => {
            if (event.target.tagName === "AUDIO") {
                const mensagem = event.target
                    .closest(".preview-avaliacao")
                    ?.querySelector(".erro-preview");

                if (mensagem) {
                    mensagem.hidden = false;
                }
            }
        },
        true
    );
}

// ADICIONADO: carregar avaliações do Feed
carregarAvaliacoes();

// =========================================================
// ESCONDER CABEÇALHO AO ROLAR
// =========================================================

const cabecalho = document.querySelector(".cabecalho");

let ultimaRolagem = window.scrollY;

if (cabecalho) {
    window.addEventListener(
        "scroll",
        () => {
            cabecalho.classList.toggle(
                "cabecalho--hidden",
                window.scrollY > ultimaRolagem &&
                window.scrollY > 120
            );

            ultimaRolagem = window.scrollY;
        },
        { passive: true }
    );
}
