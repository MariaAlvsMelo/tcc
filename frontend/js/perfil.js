
const API = "http://localhost:3000";

const $ = id => document.getElementById(id);

const obterUsuario = () => {
    try {
        return JSON.parse(localStorage.getItem("usuarioLogado"));
    } catch {
        return null;
    }
};

// =========================================================
// FUNÇÕES AUXILIARES
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
        : "";
}

function formatarData(data) {
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
// VERIFICAR LOGIN
// =========================================================

const usuarioLogado = obterUsuario();

const conteudoPerfil = $("perfil-container");
const perfilSemLogin = $("perfilSemLogin");

if (conteudoPerfil) {
    conteudoPerfil.style.display = usuarioLogado ? "" : "none";
}

if (perfilSemLogin) {
    perfilSemLogin.style.display = usuarioLogado ? "none" : "flex";
}

const btnLoginCabecalho = $("btnLoginCabecalho");

if (btnLoginCabecalho) {
    btnLoginCabecalho.style.display =
        usuarioLogado ? "none" : "inline-flex";
}

// =========================================================
// PREENCHER PERFIL
// =========================================================

function preencherPerfil(usuario) {
    if ($("nomePerfil")) {
        $("nomePerfil").textContent =
            usuario.nome_usuario || "Usuário";
    }

    if ($("emailPerfil")) {
        $("emailPerfil").textContent = usuario.email || "";
    }

    if ($("biografiaPerfil")) {
        $("biografiaPerfil").textContent =
            usuario.biografia ||
            "Adicione uma biografia ao seu perfil.";
    }

    if ($("nomePerfilInput")) {
        $("nomePerfilInput").value = usuario.nome_usuario || "";
    }

    if ($("emailPerfilInput")) {
        $("emailPerfilInput").value = usuario.email || "";
    }

    if ($("biografiaInput")) {
        $("biografiaInput").value = usuario.biografia || "";
    }

    if ($("senhaPerfilInput")) {
        $("senhaPerfilInput").value = "";
    }

    if ($("fotoPerfil")) {
        $("fotoPerfil").src =
            urlImagemSegura(usuario.foto_perfil) ||
            "../img/logo.png";
    }
}

// =========================================================
// CARREGAR PERFIL
// =========================================================

async function carregarPerfil() {
    const usuario = obterUsuario();

    if (!usuario?.id_usuario) return;

    try {
        const resposta = await fetch(
            `${API}/usuarios/perfil/${usuario.id_usuario}`
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao carregar perfil"
            );
        }

        preencherPerfil(dados.usuario);

        localStorage.setItem(
            "usuarioLogado",
            JSON.stringify({
                ...usuario,
                ...dados.usuario
            })
        );

    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);

        if ($("mensagemPerfil")) {
            $("mensagemPerfil").textContent =
                "Erro ao conectar com o servidor.";
        }
    }
}

// =========================================================
// MOSTRAR / ESCONDER EDIÇÃO
// =========================================================

function alternarEdicao(mostrar) {
    if ($("areaEdicaoPerfil")) {
        $("areaEdicaoPerfil").style.display =
            mostrar ? "block" : "none";
    }

    if ($("botaoAlterarFoto")) {
        $("botaoAlterarFoto").style.display =
            mostrar ? "inline-block" : "none";
    }

    if ($("btnEditarPerfil")) {
        $("btnEditarPerfil").style.display =
            mostrar ? "none" : "inline-block";
    }
}

$("btnEditarPerfil")?.addEventListener("click", () => {
    alternarEdicao(true);

    $("areaEdicaoPerfil")?.scrollIntoView({
        behavior: "smooth",
        block: "center"
    });
});

$("btnCancelarEdicao")?.addEventListener("click", () => {
    alternarEdicao(false);

    if ($("fotoPerfil")) {
        delete $("fotoPerfil").dataset.novaFoto;
    }

    carregarPerfil();
});

// =========================================================
// ALTERAR FOTO
// =========================================================

$("inputFoto")?.addEventListener("change", event => {
    const arquivo = event.target.files?.[0];

    if (!arquivo) return;

    if (
        !/^image\/(png|jpeg|webp|gif)$/.test(arquivo.type) ||
        arquivo.size > 2 * 1024 * 1024
    ) {
        if ($("mensagemPerfil")) {
            $("mensagemPerfil").textContent =
                "Escolha uma imagem PNG, JPEG, WebP ou GIF com até 2 MB.";
        }

        event.target.value = "";
        return;
    }

    const leitor = new FileReader();

    leitor.onload = () => {
        if ($("fotoPerfil")) {
            $("fotoPerfil").src = leitor.result;
            $("fotoPerfil").dataset.novaFoto = leitor.result;
        }

        if ($("mensagemPerfil")) {
            $("mensagemPerfil").textContent =
                "Foto selecionada. Clique em salvar.";
        }
    };

    leitor.readAsDataURL(arquivo);
});

// =========================================================
// SALVAR ALTERAÇÕES
// =========================================================

$("formPerfil")?.addEventListener("submit", async event => {
    event.preventDefault();

    const usuario = obterUsuario();

    if (!usuario) return;

    const nome = $("nomePerfilInput")?.value.trim();
    const email = $("emailPerfilInput")?.value.trim();
    const senha = $("senhaPerfilInput")?.value || "";
    const biografia = $("biografiaInput")?.value.trim() || "";

    if (!nome || !email) {
        $("mensagemPerfil").textContent =
            "Preencha nome e e-mail.";
        return;
    }

    try {
        const resposta = await fetch(
            `${API}/usuarios/perfil/${usuario.id_usuario}`,
            {
                method: "PUT",

                headers: {
                    "Content-Type": "application/json"
                },

                body: JSON.stringify({
                    nome,
                    email,
                    senha,
                    biografia,
                    foto_perfil:
                        $("fotoPerfil")?.dataset.novaFoto ||
                        usuario.foto_perfil ||
                        null
                })
            }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao salvar perfil"
            );
        }

        if ($("fotoPerfil")) {
            delete $("fotoPerfil").dataset.novaFoto;
        }

        if ($("inputFoto")) {
            $("inputFoto").value = "";
        }

        await carregarPerfil();

        alternarEdicao(false);

        if ($("mensagemPerfil")) {
            $("mensagemPerfil").textContent =
                "Perfil atualizado com sucesso!";

            $("mensagemPerfil").style.color = "#54d98b";
        }

    } catch (erro) {
        console.error(erro);

        if ($("mensagemPerfil")) {
            $("mensagemPerfil").textContent = erro.message;
        }
    }
});

// =========================================================
// SAIR DA CONTA
// =========================================================

$("btnSairConta")?.addEventListener("click", () => {
    if (!confirm("Deseja realmente sair da sua conta?")) {
        return;
    }

    localStorage.removeItem("usuarioLogado");

    window.location.href = "login.html";
});

// =========================================================
// CURTIDAS PADRONIZADAS
// =========================================================

function curtidaHTML(avaliacao) {
    const id = Number(avaliacao.id);

    const total = Math.max(
        0,
        Number(avaliacao.total_curtidas) || 0
    );

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

function pintarCurtida(botao, ativo) {
    botao.classList.toggle("curtido", ativo);

    botao.setAttribute("aria-pressed", String(ativo));

    botao.setAttribute(
        "aria-label",
        ativo ? "Remover curtida" : "Curtir avaliação"
    );

    botao.querySelector(".icone-curtida").textContent =
        ativo ? "♥" : "♡";
}

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
        botao.title = "Não foi possível verificar a curtida.";
    }
}

async function alternarCurtida(botao) {
    const usuario = obterUsuario();

    if (!usuario || botao.disabled) return;

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
                dados.mensagem || "Não foi possível alterar a curtida"
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
        alert("Erro ao alterar curtida.");

    } finally {
        botao.disabled = false;
    }
}

// =========================================================
// MONTAR AVALIAÇÃO DO PERFIL
// =========================================================

function montarMinhaAvaliacao(avaliacao) {
    const id = Number(avaliacao.id);

    if (!Number.isSafeInteger(id) || id <= 0) return "";

    const capa = urlImagemSegura(avaliacao.capa_album);

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
            class="card-minha-avaliacao"
            data-avaliacao-id="${id}"
        >

            <div class="capa-musica-container">
                ${capaHTML}
            </div>

            <div class="conteudo-minha-avaliacao informacoes-musica">

                <h3>${escaparHTML(avaliacao.musica)}</h3>

                <p class="artista-avaliacao">
                    <strong>Artista:</strong>
                    ${escaparHTML(avaliacao.artista)}
                </p>

                <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">
                    ${escaparHTML(formatarData(avaliacao.data_avaliacao))}
                </p>

                <div class="area-preview-feed">
                    ${gerarPreview(avaliacao)}
                </div>

                <div class="acoes-minha-avaliacao">

                    ${curtidaHTML(avaliacao)}

                    <button
                        type="button"
                        class="botao-excluir-avaliacao"
                        data-id="${id}"
                    >
                        Excluir avaliação
                    </button>

                </div>

            </div>

        </article>
    `;
}

// =========================================================
// CARREGAR MINHAS AVALIAÇÕES
// =========================================================

async function carregarMinhasAvaliacoes() {
    const usuario = obterUsuario();
    const container = $("listaMinhasAvaliacoes");

    if (!usuario?.id_usuario || !container) return;

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/usuario/${usuario.id_usuario}`,
            { cache: "no-store" }
        );

        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Erro ao listar avaliações"
            );
        }

        const minhas = dados.avaliacoes || [];

        if ($("contadorAvaliacoes")) {
            $("contadorAvaliacoes").textContent = `
                ${minhas.length}
                ${minhas.length === 1 ? "avaliação" : "avaliações"}
            `;
        }

        if (!minhas.length) {
            container.innerHTML = `
                <div class="sem-avaliacoes">
                    <p>Você ainda não fez nenhuma avaliação.</p>
                    <a href="avaliar.html">Fazer uma avaliação</a>
                </div>
            `;
            return;
        }

        // Recuperar contagens atualizadas do Feed.
        try {
            const respostaFeed = await fetch(
                `${API}/usuarios/avaliacoes`,
                { cache: "no-store" }
            );

            const dadosFeed = await respostaFeed.json();

            if (respostaFeed.ok && dadosFeed.sucesso) {
                const contagens = new Map(
                    (dadosFeed.avaliacoes || []).map(a => [
                        Number(a.id),
                        Number(a.total_curtidas) || 0
                    ])
                );

                minhas.forEach(a => {
                    if (contagens.has(Number(a.id))) {
                        a.total_curtidas = contagens.get(
                            Number(a.id)
                        );
                    }
                });
            }

        } catch (erro) {
            console.warn("Contagens indisponíveis:", erro);
        }

        container.innerHTML = minhas
            .map(montarMinhaAvaliacao)
            .join("");

        const botoes = Array.from(
            container.querySelectorAll(".btn-curtir")
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
            "Erro ao carregar avaliações do perfil:",
            erro
        );

        container.innerHTML = `
            <p>Erro ao carregar suas avaliações.</p>
        `;
    }
}

// =========================================================
// EXCLUIR AVALIAÇÃO
// =========================================================

async function excluirAvaliacao(id) {
    const usuario = obterUsuario();

    if (
        !usuario ||
        !confirm("Tem certeza que deseja excluir esta avaliação?")
    ) {
        return;
    }

    try {
        const resposta = await fetch(
            `${API}/usuarios/avaliacoes/${id}`,
            {
                method: "DELETE",

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
            throw new Error(
                dados.mensagem || "Não foi possível excluir."
            );
        }

        await carregarMinhasAvaliacoes();

    } catch (erro) {
        console.error(erro);
        alert(erro.message);
    }
}

// =========================================================
// EVENTOS DOS CARDS
// =========================================================

$("listaMinhasAvaliacoes")?.addEventListener("click", event => {
    const like = event.target.closest(".btn-curtir");

    if (like) {
        alternarCurtida(like);
        return;
    }

    const excluir = event.target.closest(
        ".botao-excluir-avaliacao"
    );

    if (excluir) {
        excluirAvaliacao(Number(excluir.dataset.id));
    }
});

if (usuarioLogado) {
    carregarPerfil();
    carregarMinhasAvaliacoes();
}

// =========================================================
// CABEÇALHO
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
