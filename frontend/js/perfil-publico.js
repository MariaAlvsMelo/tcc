
const API = "http://localhost:3000";

const mensagem = document.getElementById("mensagemPerfilPublico");
const cabecalhoPerfil = document.getElementById("cabecalhoPerfilPublico");
const secaoAvaliacoes = document.getElementById("secaoAvaliacoesPublicas");
const listaAvaliacoes = document.getElementById("listaAvaliacoesPublicas");

// =========================================================
// AUXILIARES
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

function obterUsuario() {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch {
        return null;
    }
}

function urlImagemSegura(valor) {
    const str = String(valor || "");

    return (
        /^https:\/\//i.test(str) ||
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(str) ||
        /^\.\.\/img\//.test(str)
    ) ? str : "";
}

// =========================================================
// ESTRELAS PADRONIZADAS
// =========================================================

function gerarEstrelas(nota) {
    const n = Math.max(
        0,
        Math.min(5, Math.round(Number(nota) || 0))
    );

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
// DATA
// =========================================================

function formatarData(valor) {
    if (!valor) return "";

    if (String(valor).includes("/")) {
        return String(valor);
    }

    const data = new Date(valor);

    return Number.isNaN(data.getTime())
        ? String(valor)
        : data.toLocaleString("pt-BR");
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

    return src
        ? `
            <div class="preview-avaliacao">

                <span class="preview-titulo">
                    Prévia da música
                </span>

                <audio
                    controls
                    preload="none"
                    src="${escaparHTML(src)}"
                ></audio>

            </div>
        `
        : `
            <span class="sem-preview">
                Prévia indisponível.
            </span>
        `;
}

// =========================================================
// BOTÃO DE CURTIDA
// =========================================================

function curtidaHTML(avaliacao) {
    const quantidade = Math.max(
        0,
        Number(avaliacao.total_curtidas) || 0
    );

    const usuario = obterUsuario();

    if (!usuario) {
        return `
            <span
                class="curtidas-sem-login"
                aria-label="${quantidade} curtidas"
            >
                ♡ ${quantidade}
            </span>
        `;
    }

    return `
        <button
            type="button"
            class="btn-curtir"
            data-id="${Number(avaliacao.id)}"
            disabled
            aria-pressed="false"
            aria-label="Curtir avaliação"
        >
            <span class="icone-curtida" aria-hidden="true">♡</span>
            <span class="quantidade-curtidas">${quantidade}</span>
        </button>
    `;
}

function pintarCurtida(botao, ativo) {
    botao.classList.toggle("curtido", ativo);

    botao.setAttribute(
        "aria-pressed",
        String(ativo)
    );

    botao.setAttribute(
        "aria-label",
        ativo ? "Remover curtida" : "Curtir avaliação"
    );

    botao.querySelector(".icone-curtida").textContent =
        ativo ? "♥" : "♡";
}

// =========================================================
// VERIFICAR CURTIDA SALVA
// =========================================================

async function verificarCurtida(id, botao) {
    const usuario = obterUsuario();

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
                dados.mensagem || "Erro ao verificar curtida"
            );
        }

        pintarCurtida(botao, Boolean(dados.curtiu));
        botao.disabled = false;

    } catch (erro) {
        console.error(erro);
        botao.title = "Erro ao verificar curtida.";
    }
}

// =========================================================
// CURTIR / DESCURTIR
// =========================================================

async function alternarCurtida(botao) {
    const usuario = obterUsuario();

    if (!usuario) {
        window.location.href = "login.html";
        return;
    }

    if (botao.disabled) return;

    const id = Number(botao.dataset.id);
    const ativo = botao.classList.contains("curtido");

    botao.disabled = true;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/curtir`,
            {
                method: ativo ? "DELETE" : "POST",

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
                const contador = botao.querySelector(
                    ".quantidade-curtidas"
                );

                if (!ativo) {
                    contador.textContent =
                        (Number(contador.textContent) || 0) + 1;
                }

                pintarCurtida(botao, true);
                return;
            }

            throw new Error(
                dados.mensagem || "Erro ao alterar curtida"
            );
        }

        pintarCurtida(botao, !ativo);

        const contador = botao.querySelector(
            ".quantidade-curtidas"
        );

        contador.textContent = Math.max(
            0,
            (Number(contador.textContent) || 0) +
            (ativo ? -1 : 1)
        );

    } catch (erro) {
        console.error(erro);
        alert("Não foi possível alterar a curtida.");

    } finally {
        botao.disabled = false;
    }
}

// =========================================================
// MONTAR CARD DO PERFIL PÚBLICO
// =========================================================

function montarCard(avaliacao) {
    const id = Number(avaliacao.id);

    if (!Number.isSafeInteger(id) || id <= 0) {
        return "";
    }

    const capa = urlImagemSegura(avaliacao.capa_album);

    const capaHTML = capa
        ? `
            <img
                class="perfil-publico-capa capa-musica-feed"
                src="${escaparHTML(capa)}"
                alt="Capa do álbum"
            >
        `
        : `
            <div
                class="perfil-publico-capa capa-musica-feed capa-placeholder"
                aria-hidden="true"
            >♫</div>
        `;

    return `
        <article
            class="perfil-publico-avaliacao"
            data-avaliacao-id="${id}"
        >

            <div class="capa-musica-container">
                ${capaHTML}
            </div>

            <div class="perfil-publico-conteudo informacoes-musica">

                <h3>${escaparHTML(avaliacao.musica)}</h3>

                <p class="perfil-publico-artista artista-avaliacao">
                    <strong>Artista:</strong>
                    ${escaparHTML(avaliacao.artista)}
                </p>

                <p class="perfil-publico-comentario comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">
                    ${escaparHTML(formatarData(avaliacao.data_avaliacao))}
                </p>

                <div class="area-preview-feed">
                    ${gerarPreview(avaliacao)}
                </div>

                <div class="acoes-avaliacao-publica">
                    ${curtidaHTML(avaliacao)}
                </div>

            </div>
        </article>
    `;
}

// =========================================================
// CARREGAR PERFIL PÚBLICO
// =========================================================

async function carregarPerfilPublico() {
    const id = Number(
        new URLSearchParams(window.location.search).get("id")
    );

    if (!Number.isSafeInteger(id) || id <= 0) {
        if (mensagem) {
            mensagem.textContent =
                "Perfil inválido. Volte ao Feed e selecione um usuário.";
        }

        return;
    }

    if (Number(obterUsuario()?.id_usuario) === id) {
        window.location.replace("perfil.html");
        return;
    }

    try {
        const resposta = await fetch(
            `${API}/usuarios/perfil-publico/${id}`,
            { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Perfil não encontrado."
            );
        }

        const usuario = dados.usuario || {};
        const avaliacoes = dados.avaliacoes || [];

        document.title = `
            ${usuario.nome_usuario || "Usuário"} | Entre Notas
        `;

        document.getElementById(
            "nomePerfilPublico"
        ).textContent = usuario.nome_usuario || "Usuário";

        document.getElementById(
            "biografiaPerfilPublico"
        ).textContent =
            usuario.biografia ||
            "Este usuário ainda não adicionou uma biografia.";

        document.getElementById(
            "totalAvaliacoesPublicas"
        ).textContent = `
            ${avaliacoes.length}
            ${avaliacoes.length === 1 ? "avaliação" : "avaliações"}
        `;

        const foto = urlImagemSegura(usuario.foto_perfil);

        if (foto) {
            document.getElementById(
                "fotoPerfilPublico"
            ).src = foto;
        }

        listaAvaliacoes.innerHTML = avaliacoes.length
            ? avaliacoes.map(montarCard).join("")
            : `
                <p class="perfil-publico-vazio">
                    Este usuário ainda não publicou avaliações.
                </p>
            `;

        if (mensagem) {
            mensagem.hidden = true;
        }

        if (cabecalhoPerfil) {
            cabecalhoPerfil.hidden = false;
        }

        if (secaoAvaliacoes) {
            secaoAvaliacoes.hidden = false;
        }

        const botoes = Array.from(
            listaAvaliacoes.querySelectorAll(".btn-curtir")
        );

        await Promise.all(
            botoes.map(botao =>
                verificarCurtida(
                    Number(botao.dataset.id),
                    botao
                )
            )
        );

    } catch (erro) {
        console.error(
            "Erro ao carregar perfil público:",
            erro
        );

        if (mensagem) {
            mensagem.textContent =
                erro.message || "Erro ao buscar perfil.";
        }
    }
}

// =========================================================
// INICIAR
// =========================================================

listaAvaliacoes?.addEventListener("click", event => {
    const botao = event.target.closest(".btn-curtir");

    if (botao) {
        alternarCurtida(botao);
    }
});

carregarPerfilPublico();
