(() => {
"use strict";

const API = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : "https://entre-notas-api.onrender.com";

const $ = id => document.getElementById(id);
const PREFIXO_CURTIDAS = "entreNotas_curtidas_";
const CHAVE_CACHE_MINHAS = "entreNotas_minhas";
const alteracoesLocais = new Map();
let curtidas = null;

// =========================================================
// AUXILIARES
// =========================================================
const esperar = ms => new Promise(r => setTimeout(r, ms));

const obterUsuario = () => {
    try { return JSON.parse(localStorage.getItem("usuarioLogado")); }
    catch { return null; }
};

const obterToken = () => obterUsuario()?.access_token || "";

const headersAutenticacao = (adicionais = {}) => ({
    ...adicionais,
    ...(obterToken() ? { Authorization: `Bearer ${obterToken()}` } : {})
});

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

function urlImagemSegura(valor) {
    const str = String(valor || "");
    return (
        /^https:\/\//i.test(str) ||
        /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(str) ||
        /^\.\.\/img\//.test(str)
    ) ? str : "";
}

function mostrarMensagem(texto, cor = "") {
    const el = $("mensagemPerfil");
    if (!el) return;
    el.textContent = texto;
    el.style.color = cor;
}

// fetch com tempo limite e novas tentativas (o Render demora para "acordar").
async function buscarJSON(url, opcoes = {}, { tentativas = 3, timeout = 25000 } = {}) {
    let ultimoErro;

    for (let i = 0; i < tentativas; i++) {
        const controle = new AbortController();
        const relogio = setTimeout(() => controle.abort(), timeout);

        try {
            const resposta = await fetch(url, { ...opcoes, signal: controle.signal });
            let dados = null;
            try { dados = await resposta.json(); } catch {}

            if (resposta.ok && dados?.sucesso) return dados;

            const erro = new Error(dados?.mensagem || "Servidor indisponível no momento.");
            erro.definitivo = Boolean(dados) && resposta.status < 500;
            throw erro;
        } catch (erro) {
            ultimoErro = erro;
            if (erro.definitivo) break;
        } finally {
            clearTimeout(relogio);
        }

        if (i < tentativas - 1) await esperar(1500 * (i + 1));
    }

    throw ultimoErro;
}

function gerarEstrelas(nota) {
    const n = Math.max(0, Math.min(5, Math.round(Number(nota) || 0)));

    return `
        <div class="estrelas-avaliacao" role="img" aria-label="Nota ${n} de 5 estrelas">
            ${Array.from({ length: 5 }, (_, i) =>
                `<span class="estrela ${i < n ? "ativa" : ""}" aria-hidden="true">★</span>`
            ).join("")}
        </div>
    `;
}

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
                <span class="preview-titulo">Prévia da música</span>
                <audio controls preload="none" src="${escaparHTML(src)}"></audio>
            </div>
        `
        : "";
}

function paraDataUTC(valor) {
    const texto = String(valor);
    const semFuso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto);
    return new Date(semFuso ? texto.replace(" ", "T") + "Z" : texto);
}

function formatarData(data) {
    if (!data) return "";
    if (String(data).includes("/")) return String(data);

    const d = paraDataUTC(data);

    return Number.isNaN(d.getTime())
        ? String(data)
        : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

// Reduz a foto para 256x256 (JPEG) antes de enviar: ~20 KB em vez de MBs.
// Isso deixa o feed leve, porque a foto viaja junto com as avaliações.
function reduzirImagem(arquivo, lado = 256, qualidade = 0.82) {
    return new Promise((resolve, reject) => {
        const url = URL.createObjectURL(arquivo);
        const img = new Image();

        img.onload = () => {
            URL.revokeObjectURL(url);

            const menor = Math.min(img.width, img.height);
            const canvas = document.createElement("canvas");
            canvas.width = canvas.height = lado;

            const ctx = canvas.getContext("2d");
            ctx.fillStyle = "#fff";
            ctx.fillRect(0, 0, lado, lado);
            // recorte quadrado centralizado
            ctx.drawImage(
                img,
                (img.width - menor) / 2, (img.height - menor) / 2, menor, menor,
                0, 0, lado, lado
            );

            resolve(canvas.toDataURL("image/jpeg", qualidade));
        };

        img.onerror = () => {
            URL.revokeObjectURL(url);
            reject(new Error("Não foi possível ler a imagem."));
        };

        img.src = url;
    });
}

// =========================================================
// LOGIN
// =========================================================
const usuarioLogado = obterUsuario();

if ($("perfil-container")) $("perfil-container").style.display = usuarioLogado ? "" : "none";
if ($("perfilSemLogin")) $("perfilSemLogin").style.display = usuarioLogado ? "none" : "flex";
if ($("btnLoginCabecalho")) $("btnLoginCabecalho").style.display = usuarioLogado ? "none" : "inline-flex";

// =========================================================
// PERFIL
// =========================================================
function preencherPerfil(usuario) {
    const texto = (id, valor) => { if ($(id)) $(id).textContent = valor; };
    const campo = (id, valor) => { if ($(id)) $(id).value = valor; };

    texto("nomePerfil", usuario.nome_usuario || "Usuário");
    texto("emailPerfil", usuario.email || "");
    texto("biografiaPerfil", usuario.biografia || "Adicione uma biografia ao seu perfil.");

    campo("nomePerfilInput", usuario.nome_usuario || "");
    campo("emailPerfilInput", usuario.email || "");
    campo("biografiaInput", usuario.biografia || "");
    campo("senhaPerfilInput", "");

    if ($("fotoPerfil")) {
        $("fotoPerfil").onerror = () => { $("fotoPerfil").onerror = null; $("fotoPerfil").src = "../img/logo.png"; };
        $("fotoPerfil").src = urlImagemSegura(usuario.foto_perfil) || "../img/logo.png";
    }
}

async function carregarPerfil() {
    const usuario = obterUsuario();
    if (!usuario?.id_usuario || !obterToken()) return;

    try { preencherPerfil(usuario); } catch {}

    try {
        const dados = await buscarJSON(
            `${API}/usuarios/perfil/${usuario.id_usuario}`,
            { headers: headersAutenticacao(), cache: "no-store" }
        );

        preencherPerfil(dados.usuario);

        // Relê o usuário salvo (o token pode ter mudado durante a espera).
        localStorage.setItem("usuarioLogado", JSON.stringify({ ...(obterUsuario() || usuario), ...dados.usuario }));
    } catch (erro) {
        console.error("Erro ao carregar perfil:", erro);
        mostrarMensagem("Erro ao conectar com o servidor.");
    }
}

function alternarEdicao(mostrar) {
    if ($("areaEdicaoPerfil")) $("areaEdicaoPerfil").style.display = mostrar ? "block" : "none";
    if ($("botaoAlterarFoto")) $("botaoAlterarFoto").style.display = mostrar ? "inline-block" : "none";
    if ($("btnEditarPerfil")) $("btnEditarPerfil").style.display = mostrar ? "none" : "inline-block";
}

$("btnEditarPerfil")?.addEventListener("click", () => {
    alternarEdicao(true);
    $("areaEdicaoPerfil")?.scrollIntoView({ behavior: "smooth", block: "center" });
});

$("btnCancelarEdicao")?.addEventListener("click", () => {
    alternarEdicao(false);
    if ($("fotoPerfil")) delete $("fotoPerfil").dataset.novaFoto;
    carregarPerfil();
});

$("inputFoto")?.addEventListener("change", async event => {
    const arquivo = event.target.files?.[0];
    if (!arquivo) return;

    if (!/^image\/(png|jpeg|webp|gif)$/.test(arquivo.type) || arquivo.size > 8 * 1024 * 1024) {
        mostrarMensagem("Escolha uma imagem PNG, JPEG, WebP ou GIF com até 8 MB.");
        event.target.value = "";
        return;
    }

    try {
        const reduzida = await reduzirImagem(arquivo);

        if ($("fotoPerfil")) {
            $("fotoPerfil").src = reduzida;
            $("fotoPerfil").dataset.novaFoto = reduzida;
        }

        mostrarMensagem("Foto selecionada. Clique em salvar.");
    } catch (erro) {
        mostrarMensagem(erro.message);
        event.target.value = "";
    }
});

$("formPerfil")?.addEventListener("submit", async event => {
    event.preventDefault();

    const usuario = obterUsuario();
    if (!usuario || !obterToken()) return;

    const nome = $("nomePerfilInput")?.value.trim();
    const email = $("emailPerfilInput")?.value.trim();
    const senha = $("senhaPerfilInput")?.value || "";
    const biografia = $("biografiaInput")?.value.trim() || "";

    if (!nome || !email) {
        mostrarMensagem("Preencha nome e e-mail.", "#ff5c7c");
        return;
    }

    try {
        await buscarJSON(
            `${API}/usuarios/perfil/${usuario.id_usuario}`,
            {
                method: "PUT",
                headers: headersAutenticacao({ "Content-Type": "application/json" }),
                body: JSON.stringify({
                    nome, email, senha, biografia,
                    foto_perfil: $("fotoPerfil")?.dataset.novaFoto || usuario.foto_perfil || null
                })
            },
            { tentativas: 1, timeout: 30000 }
        );

        if ($("fotoPerfil")) delete $("fotoPerfil").dataset.novaFoto;
        if ($("inputFoto")) $("inputFoto").value = "";

        await carregarPerfil();
        alternarEdicao(false);

        // A foto pode ter mudado: o feed precisa buscar de novo.
        localStorage.removeItem("entreNotas_feedCache");
        localStorage.removeItem("entreNotas_fotosAutores");

        mostrarMensagem("Perfil atualizado com sucesso!", "#54d98b");
    } catch (erro) {
        console.error(erro);
        mostrarMensagem(erro.message || "Erro ao salvar perfil.", "#ff5c7c");
    }
});

$("btnSairConta")?.addEventListener("click", async () => {
    if (!confirm("Deseja realmente sair da sua conta?")) return;

    try {
        // O cliente do Supabase pode não existir nesta página: não pode impedir a saída.
        if (typeof supabaseFrontend !== "undefined") {
            await supabaseFrontend.auth.signOut();
        }
    } catch (erro) {
        console.error("Erro ao encerrar a sessão:", erro);
    } finally {
        localStorage.removeItem("usuarioLogado");
        location.replace("login.html");
    }
});

// =========================================================
// CURTIDAS
// =========================================================
function lerCacheCurtidas(idUsuario) {
    try {
        const valor = JSON.parse(localStorage.getItem(PREFIXO_CURTIDAS + idUsuario));
        return Array.isArray(valor) ? new Set(valor.map(Number)) : null;
    } catch { return null; }
}

function salvarCacheCurtidas(idUsuario, ids) {
    try { localStorage.setItem(PREFIXO_CURTIDAS + idUsuario, JSON.stringify([...ids].map(Number))); }
    catch {}
}

function curtidaHTML(avaliacao) {
    const total = Math.max(0, Number(avaliacao.total_curtidas) || 0);

    return `
        <button type="button" class="btn-curtir" data-id="${Number(avaliacao.id)}"
            disabled aria-pressed="false" aria-label="Curtir avaliação">
            <span class="icone-curtida" aria-hidden="true">♡</span>
            <span class="quantidade-curtidas">${total}</span>
        </button>
    `;
}

function pintarCurtida(botao, ativo, total) {
    botao.classList.toggle("curtido", ativo);
    botao.setAttribute("aria-pressed", String(ativo));
    botao.setAttribute("aria-label", ativo ? "Remover curtida" : "Curtir avaliação");

    const icone = botao.querySelector(".icone-curtida");
    if (icone) icone.textContent = ativo ? "♥" : "♡";

    if (total !== undefined) {
        const q = botao.querySelector(".quantidade-curtidas");
        if (q) q.textContent = total;
    }
}

function pintarTodas() {
    if (!curtidas) return;

    document.querySelectorAll("#listaMinhasAvaliacoes .btn-curtir").forEach(botao => {
        if (botao.dataset.acaoEmAndamento) return;
        pintarCurtida(botao, curtidas.has(Number(botao.dataset.id)));
        botao.disabled = false;
    });
}

async function carregarCurtidasDoUsuario() {
    const usuario = obterUsuario();
    if (!usuario || !obterToken()) return;

    curtidas = lerCacheCurtidas(usuario.id_usuario);
    pintarTodas();

    try {
        const dados = await buscarJSON(
            `${API}/usuarios/avaliacoes/curtidas/minhas?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            { headers: headersAutenticacao() },
            { tentativas: 2 }
        );

        const novo = new Set((dados.curtidas || []).map(Number));
        alteracoesLocais.forEach((ativo, id) => ativo ? novo.add(id) : novo.delete(id));

        curtidas = novo;
        salvarCacheCurtidas(usuario.id_usuario, novo);
    } catch (erro) {
        console.error("Erro ao verificar curtidas:", erro);
        curtidas = curtidas || new Set();
    } finally {
        alteracoesLocais.clear();
    }

    pintarTodas();
}

async function alternarCurtida(botao) {
    const usuario = obterUsuario();
    if (!usuario || !obterToken() || botao.disabled) return;

    const id = Number(botao.dataset.id);
    const estava = botao.classList.contains("curtido");
    const totalAntes = Number(botao.querySelector(".quantidade-curtidas")?.textContent) || 0;

    pintarCurtida(botao, !estava, Math.max(0, totalAntes + (estava ? -1 : 1)));
    botao.disabled = true;
    botao.dataset.acaoEmAndamento = "1";

    let ativoFinal = !estava;

    try {
        await buscarJSON(
            `${API}/usuarios/avaliacoes/${id}/curtir`,
            {
                method: estava ? "DELETE" : "POST",
                headers: headersAutenticacao({ "Content-Type": "application/json" }),
                body: JSON.stringify({ id_usuario: usuario.id_usuario })
            },
            { tentativas: 1, timeout: 20000 }
        );
    } catch (erro) {
        if (!estava && /já curtiu/i.test(erro.message)) {
            ativoFinal = true;
            pintarCurtida(botao, true, totalAntes);
        } else {
            console.error(erro);
            ativoFinal = estava;
            pintarCurtida(botao, estava, totalAntes);
            alert("Não foi possível alterar a curtida.");
        }
    } finally {
        delete botao.dataset.acaoEmAndamento;
        botao.disabled = false;
    }

    const conjunto = curtidas || lerCacheCurtidas(usuario.id_usuario) || new Set();
    if (ativoFinal) conjunto.add(id); else conjunto.delete(id);
    curtidas = conjunto;
    salvarCacheCurtidas(usuario.id_usuario, conjunto);
    alteracoesLocais.set(id, ativoFinal);
}

// =========================================================
// MINHAS AVALIAÇÕES
// =========================================================
function montarMinhaAvaliacao(avaliacao) {
    const id = Number(avaliacao.id);
    if (!Number.isSafeInteger(id) || id <= 0) return "";

    const capa = urlImagemSegura(avaliacao.capa_album);

    const capaHTML = capa
        ? `<img class="capa-musica-feed" src="${escaparHTML(capa)}" alt="Capa do álbum" loading="lazy" decoding="async">`
        : `<div class="capa-musica-feed capa-placeholder" aria-hidden="true">♫</div>`;

    return `
        <article class="card-minha-avaliacao" data-avaliacao-id="${id}">
            <div class="capa-musica-container">${capaHTML}</div>

            <div class="conteudo-minha-avaliacao informacoes-musica">
                <h3>${escaparHTML(avaliacao.musica)}</h3>

                <p class="artista-avaliacao">
                    <strong>Artista:</strong> ${escaparHTML(avaliacao.artista)}
                </p>

                <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">${escaparHTML(formatarData(avaliacao.data_avaliacao))}</p>

                <div class="area-preview-feed">${gerarPreview(avaliacao)}</div>

                <div class="acoes-minha-avaliacao">
                    ${curtidaHTML(avaliacao)}
                    <button type="button" class="botao-excluir-avaliacao" data-id="${id}">
                        Excluir avaliação
                    </button>
                </div>
            </div>
        </article>
    `;
}

function lerCacheMinhas(idUsuario) {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_CACHE_MINHAS));
        return salvo && Number(salvo.id_usuario) === Number(idUsuario) ? salvo.avaliacoes : null;
    } catch { return null; }
}

function salvarCacheMinhas(idUsuario, avaliacoes) {
    try { localStorage.setItem(CHAVE_CACHE_MINHAS, JSON.stringify({ id_usuario: idUsuario, avaliacoes })); }
    catch {}
}

function renderizarMinhas(container, minhas) {
    if ($("contadorAvaliacoes")) {
        $("contadorAvaliacoes").textContent =
            `${minhas.length} ${minhas.length === 1 ? "avaliação" : "avaliações"}`;
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

    container.innerHTML = minhas.map(montarMinhaAvaliacao).join("");
    pintarTodas();
}

async function carregarMinhasAvaliacoes(usarCache = true) {
    const usuario = obterUsuario();
    const container = $("listaMinhasAvaliacoes");

    if (!usuario?.id_usuario || !obterToken() || !container) return;

    const emCache = usarCache ? lerCacheMinhas(usuario.id_usuario) : null;

    if (emCache) renderizarMinhas(container, emCache);
    else container.innerHTML = `<p aria-live="polite">Carregando suas avaliações...</p>`;

    try {
        const dados = await buscarJSON(
            `${API}/usuarios/avaliacoes/usuario/${usuario.id_usuario}`,
            { headers: headersAutenticacao(), cache: "no-store" }
        );

        const minhas = dados.avaliacoes || [];

        salvarCacheMinhas(usuario.id_usuario, minhas);

        if (!emCache || JSON.stringify(emCache) !== JSON.stringify(minhas)) {
            renderizarMinhas(container, minhas);
        }

        if (minhas.length) await carregarCurtidasDoUsuario();
    } catch (erro) {
        console.error("Erro ao carregar avaliações do perfil:", erro);
        if (!emCache) container.innerHTML = `<p>Erro ao carregar suas avaliações.</p>`;
    }
}

async function excluirAvaliacao(id) {
    const usuario = obterUsuario();

    if (!usuario || !obterToken() || !confirm("Tem certeza que deseja excluir esta avaliação?")) return;

    try {
        await buscarJSON(
            `${API}/usuarios/avaliacoes/${id}`,
            {
                method: "DELETE",
                headers: headersAutenticacao({ "Content-Type": "application/json" }),
                body: JSON.stringify({ id_usuario: usuario.id_usuario })
            },
            { tentativas: 1, timeout: 20000 }
        );

        localStorage.removeItem("entreNotas_feedCache");
        await carregarMinhasAvaliacoes(false);
    } catch (erro) {
        console.error(erro);
        alert(erro.message || "Não foi possível excluir.");
    }
}

$("listaMinhasAvaliacoes")?.addEventListener("click", event => {
    const like = event.target.closest(".btn-curtir");
    if (like) { alternarCurtida(like); return; }

    const excluir = event.target.closest(".botao-excluir-avaliacao");
    if (excluir) excluirAvaliacao(Number(excluir.dataset.id));
});

$("listaMinhasAvaliacoes")?.addEventListener("error", event => {
    const el = event.target;

    if (el.tagName === "IMG" && el.classList.contains("capa-musica-feed")) {
        const div = document.createElement("div");
        div.className = "capa-musica-feed capa-placeholder";
        div.setAttribute("aria-hidden", "true");
        div.textContent = "♫";
        el.replaceWith(div);
    }
}, true);

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
    window.addEventListener("scroll", () => {
        cabecalho.classList.toggle("cabecalho--hidden", window.scrollY > ultimaRolagem && window.scrollY > 120);
        ultimaRolagem = window.scrollY;
    }, { passive: true });
}
})();