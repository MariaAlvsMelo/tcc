const API = "https://entre-notas-api.onrender.com";

const mensagem = document.getElementById("mensagemPerfilPublico");
const cabecalhoPerfil = document.getElementById("cabecalhoPerfilPublico");
const secaoAvaliacoes = document.getElementById("secaoAvaliacoesPublicas");
const listaAvaliacoes = document.getElementById("listaAvaliacoesPublicas");

const CACHE_CURTIDAS_PREFIX = "entreNotas_curtidas_";
const curtidasInteragidasDuranteConsulta = new Set();

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

function obterToken() {
    return obterUsuario()?.access_token || "";
}

function urlImagemSegura(valor) {
    const str = String(valor || "").trim();

    return (
        /^https:\/\//i.test(str) ||
        /^data:image\/(png|jpe?g|webp|gif);base64,/i.test(str) ||
        /^\.\.\/img\//.test(str) ||
        /^\/img\//.test(str)
    ) ? str : "";
}

// Aceita os formatos de nome de imagem usados pela API e pelos caches.
function obterImagem(objeto, campos) {
    if (!objeto || typeof objeto !== "object") return "";

    for (const campo of campos) {
        const imagem = urlImagemSegura(objeto[campo]);

        if (imagem) return imagem;
    }

    return "";
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

// Converte o valor do banco em Date. Sem fuso horário, considera UTC.
function paraDataUTC(valor) {
    const texto = String(valor);

    const semFuso =
        /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/
            .test(texto);

    return new Date(
        semFuso ? texto.replace(" ", "T") + "Z" : texto
    );
}

function formatarData(valor) {
    if (!valor) return "";

    if (String(valor).includes("/")) {
        return String(valor);
    }

    const data = paraDataUTC(valor);

    return Number.isNaN(data.getTime())
        ? String(valor)
        : data.toLocaleString("pt-BR", {
            timeZone: "America/Sao_Paulo"
        });
}

// =========================================================
// PRÉVIA MUSICAL
// =========================================================

function gerarPreview(avaliacao) {
    const id = String(avaliacao.id_deezer ?? "");

    const src =
        /^\d{1,20}$/.test(id) && Number(id) > 0
            ? `/api/deezer-preview?id=${id}`
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
// CACHE DE CURTIDAS
// =========================================================

function lerCacheCurtidas(idUsuario) {
    try {
        const valor = JSON.parse(
            localStorage.getItem(
                `${CACHE_CURTIDAS_PREFIX}${idUsuario}`
            )
        );

        return Array.isArray(valor)
            ? new Set(valor.map(Number))
            : null;

    } catch {
        return null;
    }
}

function salvarCacheCurtidas(idUsuario, ids) {
    try {
        localStorage.setItem(
            `${CACHE_CURTIDAS_PREFIX}${idUsuario}`,
            JSON.stringify([...ids].map(Number))
        );
    } catch {}
}

async function carregarCurtidasDoUsuario(botoes) {
    const usuario = obterUsuario();
    const token = obterToken();

    if (!usuario || !token || !botoes.length) return;

    const cache = lerCacheCurtidas(usuario.id_usuario);

    if (cache) {
        botoes.forEach(botao => {
            pintarCurtida(
                botao,
                cache.has(Number(botao.dataset.id))
            );

            botao.disabled = false;
        });
    } else {
        botoes.forEach(botao => botao.disabled = true);
    }

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/curtidas/minhas?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao verificar curtidas"
            );
        }

        const curtidas = new Set(
            (dados.curtidas || []).map(Number)
        );

        botoes.forEach(botao => {
            const id = Number(botao.dataset.id);

            if (
                curtidasInteragidasDuranteConsulta.has(id) ||
                botao.dataset.acaoEmAndamento
            ) {
                if (botao.classList.contains("curtido")) {
                    curtidas.add(id);
                } else {
                    curtidas.delete(id);
                }
            }
        });

        salvarCacheCurtidas(
            usuario.id_usuario,
            curtidas
        );

        botoes.forEach(botao => {
            const id = Number(botao.dataset.id);

            if (
                !curtidasInteragidasDuranteConsulta.has(id) &&
                !botao.dataset.acaoEmAndamento
            ) {
                pintarCurtida(
                    botao,
                    curtidas.has(id)
                );
            }

            botao.disabled = false;
        });

    } catch (erro) {
        console.error("Erro ao verificar curtidas:", erro);

        botoes.forEach(botao => {
            botao.disabled = false;
            botao.title = "Erro ao verificar curtidas.";
        });
    }
}

// =========================================================
// VERIFICAR CURTIDA SALVA
// =========================================================

async function verificarCurtida(id, botao) {
    const usuario = obterUsuario();
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
                dados.mensagem || "Erro ao verificar curtida"
            );
        }

        pintarCurtida(botao, Boolean(dados.curtiu));

    } catch (erro) {
        console.error("Erro ao verificar curtida:", erro);
        botao.title = "Erro ao verificar curtida.";

    } finally {
        botao.disabled = false;
    }
}

// =========================================================
// CURTIR / DESCURTIR
// =========================================================

async function alternarCurtida(botao) {
    const usuario = obterUsuario();
    const token = obterToken();

    if (!usuario || !token) {
        window.location.href = "login.html";
        return;
    }

    if (botao.disabled) return;

    const id = Number(botao.dataset.id);
    const ativo = botao.classList.contains("curtido");

    botao.disabled = true;
    botao.dataset.acaoEmAndamento = "1";

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}/curtir`,
            {
                method: ativo ? "DELETE" : "POST",

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

        const idsSalvos =
            lerCacheCurtidas(usuario.id_usuario) || new Set();

        if (ativo) {
            idsSalvos.delete(id);
        } else {
            idsSalvos.add(id);
        }

        salvarCacheCurtidas(
            usuario.id_usuario,
            idsSalvos
        );

        curtidasInteragidasDuranteConsulta.add(id);

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
        delete botao.dataset.acaoEmAndamento;
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

    // CAPA DO ÁLBUM
    const capa = obterImagem(avaliacao, [
        "capa_album",
        "album_cover",
        "album_cover_url",
        "cover_url",
        "capa",
        "cover",
        "imagem_album",
        "album_image"
    ]);

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

                <p class="perfil-publico-comentario comentario-avaliacao">
                    ${escaparHTML(avaliacao.comentario)}
                </p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">
                    ${escaparHTML(
                        formatarData(avaliacao.data_avaliacao)
                    )}
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

function exibirPerfilPublico(usuario, avaliacoes, id) {
    document.title = `${usuario.nome_usuario || "Usuário"} | Entre Notas`;

    document.getElementById("nomePerfilPublico").textContent =
        usuario.nome_usuario || "Usuário";

    document.getElementById("biografiaPerfilPublico").textContent =
        usuario.biografia ||
        "Este usuário ainda não adicionou uma biografia.";

    document.getElementById("totalAvaliacoesPublicas").textContent =
        `${avaliacoes.length} ${
            avaliacoes.length === 1
                ? "avaliação"
                : "avaliações"
        }`;

    // FOTO DO PERFIL PÚBLICO
    const foto = obterImagem(usuario, [
        "foto_perfil",
        "avatar_url",
        "foto_usuario",
        "imagem_perfil",
        "avatar",
        "profile_picture",
        "profile_photo"
    ]);

    const elementoFoto = document.getElementById(
        "fotoPerfilPublico"
    );

    if (elementoFoto) {
        elementoFoto.src = foto || "../img/logo.png";
    }

    listaAvaliacoes.innerHTML = avaliacoes.length
        ? avaliacoes.map(montarCard).join("")
        : `
            <p class="perfil-publico-vazio">
                Este usuário ainda não publicou avaliações.
            </p>
        `;

    if (cabecalhoPerfil) {
        cabecalhoPerfil.style.display = "";
    }

    if (secaoAvaliacoes) {
        secaoAvaliacoes.style.display = "";
    }

    if (mensagem) {
        mensagem.textContent = "";
    }

    const usuarioLogado = obterUsuario();

    if (usuarioLogado?.access_token) {
        carregarCurtidasDoUsuario(
            Array.from(
                listaAvaliacoes.querySelectorAll(".btn-curtir")
            )
        );
    }
}

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

    const chaveCache = `entreNotas_perfilPublico_${id}`;

    let cache = null;

    try {
        cache = JSON.parse(
            localStorage.getItem(chaveCache)
        );

        if (
            cache &&
            Date.now() - cache.timestamp < 5 * 60 * 1000
        ) {
            exibirPerfilPublico(
                cache.usuario || {},
                cache.avaliacoes || [],
                id
            );
        } else {
            cache = null;
        }

    } catch {
        cache = null;
    }

    if (!cache && mensagem) {
        mensagem.textContent = "Carregando perfil...";
    }

    try {
        const resposta = await fetch(
            `${API}/usuarios/perfil-publico/${id}`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Perfil não encontrado."
            );
        }

        const usuario = dados.usuario || {};
        const avaliacoes = dados.avaliacoes || [];

        try {
            localStorage.setItem(
                chaveCache,
                JSON.stringify({
                    timestamp: Date.now(),
                    usuario,
                    avaliacoes
                })
            );
        } catch {}

        const mudou =
            !cache ||
            JSON.stringify(cache.usuario) !== JSON.stringify(usuario) ||
            JSON.stringify(cache.avaliacoes) !== JSON.stringify(avaliacoes);

        if (mudou) {
            exibirPerfilPublico(usuario, avaliacoes, id);
        }

    } catch (erro) {
        console.error("Erro ao carregar perfil público:", erro);

        if (!cache && mensagem) {
            mensagem.textContent =
                erro.message || "Não foi possível carregar o perfil.";
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