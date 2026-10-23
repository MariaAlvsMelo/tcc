
// =========================================================
// ENTRE NOTAS - PERFIL PÚBLICO
// =========================================================

const mensagem = document.getElementById(
    "mensagemPerfilPublico"
);

const cabecalhoPerfil = document.getElementById(
    "cabecalhoPerfilPublico"
);

const secaoAvaliacoes = document.getElementById(
    "secaoAvaliacoesPublicas"
);

const listaAvaliacoes = document.getElementById(
    "listaAvaliacoesPublicas"
);

// =========================================================
// PROTEGER TEXTO DO HTML
// =========================================================

function escaparHTML(valor) {
    return String(valor ?? "").replace(
        /[&<>"']/g,
        caractere => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;"
        })[caractere]
    );
}

// =========================================================
// VALIDAR ENDEREÇO DA IMAGEM
// =========================================================

function urlImagemSegura(valor) {
    const url = String(valor || "");

    if (
        /^https?:\/\//i.test(url) ||
        /^data:image\/(png|jpeg|jpg|webp|gif);base64,/i.test(url)
    ) {
        return url;
    }

    return "";
}

// =========================================================
// ESTRELAS DAS AVALIAÇÕES
// =========================================================

function estrelasHTML(nota) {

    const n = Math.max(
        0,
        Math.min(5, Number(nota) || 0)
    );

    const estrelas = Array.from(
        { length: 5 },
        (_, i) => `
            <span class="${i < n ? "ativa" : ""}">
                ★
            </span>
        `
    ).join("");

    return `
        <div
            class="perfil-publico-estrelas"
            aria-label="Nota ${n} de 5 estrelas"
        >
            ${estrelas}
        </div>
    `;
}

// =========================================================
// FORMATAR DATA
// =========================================================

function dataFormatada(data) {

    if (!data) return "";

    const d = new Date(data);

    if (Number.isNaN(d.getTime())) {
        return "";
    }

    return d.toLocaleString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
    });
}

// =========================================================
// GERAR CARD DE AVALIAÇÃO
// =========================================================

function montarCard(avaliacao) {

    // CAPA
    const capa = urlImagemSegura(avaliacao.capa_album);

    const capaHTML = capa
        ? `
            <img
                class="perfil-publico-capa"
                src="${escaparHTML(capa)}"
                alt="Capa do álbum"
            >
        `
        : `
            <div
                class="perfil-publico-capa perfil-publico-sem-capa"
            >
                ♫
            </div>
        `;

    // =====================================================
    // PRÉVIA DA DEEZER
    // =====================================================

    const idDeezer = Number(avaliacao.id_deezer);

    const preview =
        /^https:\/\//i.test(String(avaliacao.preview || ""))
            ? String(avaliacao.preview)
            : "";

    const srcAudio =
        Number.isSafeInteger(idDeezer) && idDeezer > 0
            ? `/deezer/preview/${idDeezer}`
            : preview;

    const player = srcAudio
        ? `
            <div class="perfil-publico-preview">

                <span>Prévia da música</span>

                <audio
                    controls
                    preload="none"
                    src="${escaparHTML(srcAudio)}"
                ></audio>

            </div>
        `
        : `
            <p class="perfil-publico-sem-preview">
                Prévia indisponível.
            </p>
        `;

    // =====================================================
    // CARD COMPLETO
    // =====================================================

    return `
        <article class="perfil-publico-avaliacao">

            ${capaHTML}

            <div class="perfil-publico-conteudo">

                <h3>
                    ${escaparHTML(avaliacao.musica)}
                </h3>

                <p class="perfil-publico-artista">
                    <strong>Artista:</strong>
                    ${escaparHTML(avaliacao.artista)}
                </p>

                <p class="perfil-publico-comentario">${escaparHTML(avaliacao.comentario)}</p>

                ${estrelasHTML(avaliacao.nota)}

                <div class="perfil-publico-meta">

                    <span>
                        ${escaparHTML(
                            dataFormatada(avaliacao.data_avaliacao)
                        )}
                    </span>

                    <span>
                        ♥ ${Number(avaliacao.total_curtidas) || 0}
                    </span>

                </div>

                ${player}

            </div>

        </article>
    `;
}

// =========================================================
// CARREGAR PERFIL PÚBLICO
// =========================================================

async function carregarPerfilPublico() {

    // Obtém o ID da URL.
    // Exemplo: perfil-publico.html?id=2

    const id = Number(
        new URLSearchParams(
            window.location.search
        ).get("id")
    );

    // Validar ID.
    if (
        !Number.isSafeInteger(id) ||
        id <= 0
    ) {
        mensagem.textContent =
            "Perfil inválido. Volte ao Feed e selecione um usuário.";

        return;
    }

    // =====================================================
    // VERIFICAR SE É O PRÓPRIO PERFIL
    // =====================================================

    try {
        const logado = JSON.parse(
            localStorage.getItem("usuarioLogado")
        );

        if (Number(logado?.id_usuario) === id) {
            window.location.replace("perfil.html");
            return;
        }

    } catch (erro) {
        console.warn("Não foi possível ler a sessão.", erro);
    }

    // =====================================================
    // BUSCAR INFORMAÇÕES
    // =====================================================

    try {

        
        const resposta = await fetch(
            `http://localhost:3000/usuarios/perfil-publico/${id}`,
            {
                method: "GET",
                headers: {
                    "Accept": "application/json"
                },
                cache: "no-store"
            }
        );


        const dados = await resposta.json();

        if (!resposta.ok || !dados.sucesso) {
            throw new Error(
                dados.mensagem || "Perfil não encontrado."
            );
        }

        const usuario = dados.usuario;
        const avaliacoes = dados.avaliacoes || [];

        document.title =
            `${usuario.nome_usuario} | Entre Notas`;

        // =================================================
        // NOME
        // =================================================

        document.getElementById(
            "nomePerfilPublico"
        ).textContent =
            usuario.nome_usuario || "Usuário";

        // =================================================
        // BIOGRAFIA
        // =================================================

        document.getElementById(
            "biografiaPerfilPublico"
        ).textContent =
            usuario.biografia ||
            "Este usuário ainda não adicionou uma biografia.";

        // =================================================
        // QUANTIDADE DE AVALIAÇÕES
        // =================================================

        document.getElementById(
            "totalAvaliacoesPublicas"
        ).textContent = `
            ${avaliacoes.length}
            ${avaliacoes.length === 1
                ? "avaliação"
                : "avaliações"}
        `;

        // =================================================
        // FOTO
        // =================================================

        const foto = urlImagemSegura(
            usuario.foto_perfil
        );

        if (foto) {
            document.getElementById(
                "fotoPerfilPublico"
            ).src = foto;
        }

        // =================================================
        // LISTAR AVALIAÇÕES DO USUÁRIO
        // =================================================

        if (avaliacoes.length) {

            listaAvaliacoes.innerHTML =
                avaliacoes.map(montarCard).join("");

        } else {

            listaAvaliacoes.innerHTML = `
                <p class="perfil-publico-vazio">
                    Este usuário ainda não publicou avaliações.
                </p>
            `;
        }

        // MOSTRAR PERFIL
        mensagem.hidden = true;
        cabecalhoPerfil.hidden = false;
        secaoAvaliacoes.hidden = false;

    } catch (erro) {

        console.error(
            "Erro ao carregar perfil público:",
            erro
        );

        mensagem.textContent =
            erro.message ||
            "Não foi possível carregar o perfil.";
    }
}

// =========================================================
// INICIAR
// =========================================================

carregarPerfilPublico();
