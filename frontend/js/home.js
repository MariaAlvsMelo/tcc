
const API = "http://localhost:3000";

const avaliacoesContainer = document.getElementById("home-container");
const btnLoginCabecalho = document.getElementById("btnLoginCabecalho");

function obterUsuarioLogado() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch {
        return null;
    }
}

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
// VERIFICAR CURTIDA NO MYSQL
// =========================================================

async function verificarCurtida(id, botao) {
    const usuario = obterUsuarioLogado();

    if (!usuario || !botao) return;

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/curtiu?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            { cache: "no-store" }
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

    if (!usuario) {
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
                    "Content-Type": "application/json"
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
        </article>
    `;
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

        if (usuario) {
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
    avaliacoesContainer.addEventListener("click", event => {
        const botao = event.target.closest(".btn-curtir");

        if (botao) {
            curtirAvaliacao(
                Number(botao.dataset.id),
                botao
            );
        }
    });

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
