(() => {
"use strict";

// =========================================================
// CONFIGURAÇÃO
// =========================================================
const API = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : "https://entre-notas-api.onrender.com";

const feed = document.getElementById("home-container");
const btnLoginCabecalho = document.getElementById("btnLoginCabecalho");

const CHAVE_FEED = "entreNotas_feedCache";
const CHAVE_FOTOS = "entreNotas_fotosAutores";
const PREFIXO_CURTIDAS = "entreNotas_curtidas_";
const POR_PAGINA = 10;          // cards desenhados por vez
const ITENS_NO_CACHE = 40;      // quantos itens do feed ficam salvos
const FOTO_MAX_CACHE = 30000;   // fotos maiores que isso não vão para o localStorage
const TTL_COMENTARIOS = 60 * 1000;

const avaliacoesPorId = new Map();
const fotos = new Map();              // id_usuario -> url da foto
const fotosTentadas = new Set();      // ids já consultados no perfil público
const respostasCache = new Map();     // id_avaliacao -> { t, lista }
const respostasEmAndamento = new Map();
const alteracoesLocais = new Map();   // curtidas feitas durante a sincronização

let curtidas = null;                  // Set de ids curtidos (null = ainda desconhecido)
let todas = [];
let exibidos = 0;
let observador = null;

// =========================================================
// USUÁRIO / REDE
// =========================================================
function obterUsuarioLogado() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado")); }
    catch { return null; }
}

const obterToken = () => obterUsuarioLogado()?.access_token || "";
const cabecalhoAuth = (extra = {}) => ({ ...extra, Authorization: `Bearer ${obterToken()}` });
const esperar = ms => new Promise(r => setTimeout(r, ms));

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
            erro.definitivo = Boolean(dados) && resposta.status < 500; // erro real: não adianta repetir
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

// =========================================================
// SEGURANÇA
// =========================================================
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

// =========================================================
// AUTOR E FOTO DE PERFIL
// =========================================================
// Aceita o autor tanto "achatado" na avaliação quanto aninhado (join do Supabase).
function dadosAutor(a) {
    const u = a.usuarios || a.usuario || a.autor || {};
    return {
        id: Number(a.id_usuario ?? u.id_usuario ?? u.id) || 0,
        nome: a.nome_usuario || u.nome_usuario || u.nome || "Usuário",
        email: a.email || u.email || "",
        foto: a.foto_perfil || a.foto_usuario || a.avatar_url ||
              u.foto_perfil || u.foto_usuario || u.avatar_url || ""
    };
}

function fotoDoAutor(autor) {
    return urlImagemSegura(autor.foto) || fotos.get(autor.id) || "";
}

function carregarFotosSalvas() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_FOTOS)) || {};
        Object.entries(salvo).forEach(([id, url]) => {
            if (urlImagemSegura(url)) fotos.set(Number(id), url);
        });
    } catch {}
}

function salvarFotos() {
    try {
        const obj = {};
        Array.from(fotos).slice(-150).forEach(([id, url]) => {
            if (url.length <= FOTO_MAX_CACHE) obj[id] = url;
        });
        localStorage.setItem(CHAVE_FOTOS, JSON.stringify(obj));
    } catch {}
}

function registrarFotos(lista) {
    lista.forEach(a => {
        const autor = dadosAutor(a);
        const url = urlImagemSegura(autor.foto);
        if (autor.id && url) fotos.set(autor.id, url);
    });
}

function criarPlaceholderFoto(id) {
    const span = document.createElement("span");
    span.className = "foto-autor-avaliacao foto-autor-placeholder";
    span.setAttribute("aria-hidden", "true");
    span.textContent = "👤";
    if (id) span.dataset.autorFoto = id;
    return span;
}

function avatarHTML(id, foto) {
    const attr = id ? ` data-autor-foto="${id}"` : "";

    return foto
        ? `<img class="foto-autor-avaliacao"${attr} src="${escaparHTML(foto)}" alt="Foto de perfil" loading="lazy" decoding="async">`
        : `<span class="foto-autor-avaliacao foto-autor-placeholder"${attr} aria-hidden="true">👤</span>`;
}

// Troca o 👤 pela foto (ou atualiza a foto) sem redesenhar o feed.
function aplicarFoto(id, url) {
    feed.querySelectorAll(`[data-autor-foto="${id}"]`).forEach(el => {
        if (el.tagName === "IMG") {
            if (el.getAttribute("src") !== url) el.src = url;
            return;
        }

        const img = document.createElement("img");
        img.className = "foto-autor-avaliacao";
        img.alt = "Foto de perfil";
        img.loading = "lazy";
        img.decoding = "async";
        img.dataset.autorFoto = id;
        img.src = url;
        el.replaceWith(img);
    });
}

function aplicarTodasFotos() {
    const ids = new Set();
    feed.querySelectorAll("[data-autor-foto]").forEach(el => ids.add(Number(el.dataset.autorFoto)));
    ids.forEach(id => { if (fotos.has(id)) aplicarFoto(id, fotos.get(id)); });
}

// Se a API do feed não trouxer a foto, busca no perfil público (só autores que faltam).
async function buscarFotosFaltantes(ids) {
    const faltando = [...new Set(ids)].filter(id => id && !fotos.has(id) && !fotosTentadas.has(id));
    if (!faltando.length) return;

    faltando.forEach(id => fotosTentadas.add(id));

    let indice = 0;

    async function trabalhador() {
        while (indice < faltando.length) {
            const id = faltando[indice++];

            try {
                const dados = await buscarJSON(
                    `${API}/usuarios/perfil-publico/${id}`, {}, { tentativas: 2, timeout: 15000 }
                );
                const url = urlImagemSegura(dados.usuario?.foto_perfil);

                if (url) {
                    fotos.set(id, url);
                    aplicarFoto(id, url);
                }
            } catch {}
        }
    }

    await Promise.all([trabalhador(), trabalhador(), trabalhador()]);
    salvarFotos();
}

// =========================================================
// ESTRELAS, PRÉVIA E DATA
// =========================================================
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

    if (!src) {
        return `
            <div class="preview-avaliacao">
                <span class="preview-titulo">Prévia da música</span>
                <small class="sem-preview">Prévia indisponível.</small>
            </div>
        `;
    }

    return `
        <div class="preview-avaliacao">
            <span class="preview-titulo">Prévia da música</span>
            <audio controls preload="none" src="${escaparHTML(src)}"></audio>
            <small class="erro-preview" hidden>Prévia indisponível no momento.</small>
        </div>
    `;
}

// Sem fuso horário no valor do banco, considera UTC.
function paraDataUTC(valor) {
    const texto = String(valor);
    const semFuso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto);
    return new Date(semFuso ? texto.replace(" ", "T") + "Z" : texto);
}

function formatoData(data) {
    if (!data) return "";
    if (String(data).includes("/")) return String(data);

    const d = paraDataUTC(data);

    return Number.isNaN(d.getTime())
        ? String(data)
        : d.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

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

function renderizarCurtida(avaliacao, logado) {
    const total = Math.max(0, Number(avaliacao.total_curtidas) || 0);

    if (!logado) {
        return `
            <span class="curtidas-sem-login" aria-label="${total} curtidas">
                <span aria-hidden="true">♡</span> ${total}
            </span>
        `;
    }

    return `
        <button type="button" class="btn-curtir" data-id="${Number(avaliacao.id)}"
            disabled aria-pressed="false" aria-label="Curtir avaliação">
            <span class="icone-curtida" aria-hidden="true">♡</span>
            <span class="quantidade-curtidas">${total}</span>
        </button>
    `;
}

function setarCurtida(botao, ativo, total) {
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

// Pinta (e habilita) todos os botões visíveis a partir do estado conhecido.
function pintarCurtidas() {
    if (!curtidas) return;

    feed.querySelectorAll(".btn-curtir").forEach(botao => {
        if (botao.dataset.acaoEmAndamento) return;
        setarCurtida(botao, curtidas.has(Number(botao.dataset.id)));
        botao.disabled = false;
    });
}

// Usa o cache na hora e confirma com o servidor em segundo plano.
async function sincronizarCurtidas() {
    const usuario = obterUsuarioLogado();
    if (!usuario || !obterToken()) return;

    curtidas = lerCacheCurtidas(usuario.id_usuario);
    pintarCurtidas();

    try {
        const dados = await buscarJSON(
            `${API}/usuarios/avaliacoes/curtidas/minhas?id_usuario=${encodeURIComponent(usuario.id_usuario)}`,
            { headers: cabecalhoAuth() },
            { tentativas: 2 }
        );

        const novo = new Set((dados.curtidas || []).map(Number));
        alteracoesLocais.forEach((ativo, id) => ativo ? novo.add(id) : novo.delete(id));

        curtidas = novo;
        salvarCacheCurtidas(usuario.id_usuario, novo);
    } catch (erro) {
        console.error("Falha ao consultar curtidas:", erro);
        curtidas = curtidas || new Set(); // libera os botões mesmo sem resposta
    } finally {
        alteracoesLocais.clear();
    }

    pintarCurtidas();
}

async function alternarCurtida(botao) {
    const usuario = obterUsuarioLogado();

    if (!usuario || !obterToken()) {
        location.href = "login.html";
        return;
    }

    if (botao.disabled) return;

    const id = Number(botao.dataset.id);
    const estava = botao.classList.contains("curtido");
    const totalAntes = Number(botao.querySelector(".quantidade-curtidas")?.textContent) || 0;

    // Atualiza a tela na hora; se falhar, volta ao estado anterior.
    setarCurtida(botao, !estava, Math.max(0, totalAntes + (estava ? -1 : 1)));
    botao.disabled = true;
    botao.dataset.acaoEmAndamento = "1";

    let ativoFinal = !estava;

    try {
        await buscarJSON(
            `${API}/usuarios/avaliacoes/${id}/curtir`,
            {
                method: estava ? "DELETE" : "POST",
                headers: cabecalhoAuth({ "Content-Type": "application/json" }),
                body: JSON.stringify({ id_usuario: usuario.id_usuario })
            },
            { tentativas: 1, timeout: 20000 }
        );
    } catch (erro) {
        if (!estava && /já curtiu/i.test(erro.message)) {
            // O servidor já tinha a curtida: o total exibido já a incluía.
            ativoFinal = true;
            setarCurtida(botao, true, totalAntes);
        } else {
            console.error("Falha ao alterar curtida:", erro);
            ativoFinal = estava;
            setarCurtida(botao, estava, totalAntes);
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
// CARD DO FEED
// =========================================================
function montarCard(avaliacao, logado, usuario) {
    const id = Number(avaliacao.id);
    if (!Number.isSafeInteger(id) || id <= 0) return "";

    const autor = dadosAutor(avaliacao);
    const idAutor = autor.id;

    const perfilURL = idAutor > 0
        ? (Number(usuario?.id_usuario) === idAutor ? "perfil.html" : `perfil-publico.html?id=${idAutor}`)
        : "";

    const capa = urlImagemSegura(avaliacao.capa_album);

    const dadosHTML = `
        ${avatarHTML(idAutor, fotoDoAutor(autor))}
        <span class="dados-autor">
            <strong>${escaparHTML(autor.nome)}</strong>
            <span class="email-autor">${escaparHTML(autor.email)}</span>
        </span>
    `;

    const autorHTML = perfilURL
        ? `<a class="link-perfil-autor" href="${perfilURL}" aria-label="Abrir perfil de ${escaparHTML(autor.nome)}">${dadosHTML}</a>`
        : `<div class="link-perfil-autor">${dadosHTML}</div>`;

    const capaHTML = capa
        ? `<img class="capa-musica-feed" src="${escaparHTML(capa)}" alt="Capa do álbum" loading="lazy" decoding="async">`
        : `<div class="capa-musica-feed capa-placeholder" aria-hidden="true">♫</div>`;

    return `
        <article class="card-avaliacao" data-avaliacao-id="${id}">
            <div class="curtida-canto-superior">${renderizarCurtida(avaliacao, logado)}</div>

            <div class="autor-avaliacao">${autorHTML}</div>

            <div class="conteudo-card-musica">
                <div class="capa-musica-container">${capaHTML}</div>

                <div class="informacoes-musica">
                    <h3>${escaparHTML(avaliacao.musica)}</h3>

                    <p class="artista-avaliacao">
                        <strong>Artista:</strong> ${escaparHTML(avaliacao.artista)}
                    </p>

                    <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                    ${gerarEstrelas(avaliacao.nota)}

                    <p class="data-postagem">${escaparHTML(formatoData(avaliacao.data_avaliacao))}</p>

                    <div class="area-preview-feed">${gerarPreview(avaliacao)}</div>
                </div>
            </div>

            <section class="area-respostas" data-id-avaliacao="${id}">
                <button type="button" class="btn-toggle-respostas" data-id="${id}">
                    <img src="../img/comentario.png" alt="" width="20" height="20">
                    Comentários
                </button>
            </section>
        </article>
    `;
}

// =========================================================
// COMENTÁRIOS
// =========================================================
function renderizarRespostas(lista, comentarios) {
    if (!comentarios.length) {
        lista.innerHTML = `<p class="sem-respostas">Ainda não há comentários. Seja o primeiro a comentar!</p>`;
        return;
    }

    lista.innerHTML = comentarios.map(item => {
        const autor = dadosAutor(item);
        const foto = fotoDoAutor(autor);

        return `
            <article class="card-resposta">
                <div class="autor-resposta" style="display:flex;align-items:center;gap:8px">
                    ${foto ? `<img class="foto-comentario" src="${escaparHTML(foto)}" alt="" loading="lazy" decoding="async"
                        style="width:32px;height:32px;border-radius:50%;object-fit:cover">` : ""}
                    <strong>${escaparHTML(autor.nome)}</strong>
                </div>
                <p>${escaparHTML(item.resposta)}</p>
                <small>${escaparHTML(formatoData(item.data_resposta))}</small>
            </article>
        `;
    }).join("");
}

async function buscarRespostas(id, forcar = false) {
    const chave = Number(id);
    const guardado = respostasCache.get(chave);

    if (!forcar && guardado && Date.now() - guardado.t < TTL_COMENTARIOS) return guardado.lista;
    if (respostasEmAndamento.has(chave)) return respostasEmAndamento.get(chave);

    const requisicao = buscarJSON(`${API}/usuarios/avaliacoes/${chave}/respostas`, {}, { tentativas: 2, timeout: 20000 })
        .then(dados => {
            const lista = dados.respostas || [];
            respostasCache.set(chave, { t: Date.now(), lista });
            return lista;
        })
        .finally(() => respostasEmAndamento.delete(chave));

    respostasEmAndamento.set(chave, requisicao);
    return requisicao;
}

async function carregarRespostas(id, forcar = false) {
    const lista = document.getElementById("lista-comentarios-modal");
    if (!lista) return;

    const emCache = respostasCache.get(Number(id))?.lista;

    if (emCache) renderizarRespostas(lista, emCache);
    else lista.innerHTML = `<p class="carregando-respostas">Carregando comentários...</p>`;

    try {
        renderizarRespostas(lista, await buscarRespostas(id, forcar));
    } catch (erro) {
        console.error("Erro ao carregar comentários:", erro);
        if (!emCache) lista.innerHTML = `<p class="sem-respostas">Não foi possível carregar os comentários.</p>`;
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

    const autor = dadosAutor(avaliacao);
    const capa = urlImagemSegura(avaliacao.capa_album);

    tela.innerHTML = `
        <div class="conteudo-tela-comentarios">
            <button type="button" class="btn-voltar-comentarios">← Voltar ao Feed</button>

            <h2>Comentários</h2>

            <article class="avaliacao-em-comentarios">
                <div class="autor-avaliacao">
                    <span class="link-perfil-autor">
                        ${avatarHTML(0, fotoDoAutor(autor))}
                        <span class="dados-autor"><strong>${escaparHTML(autor.nome)}</strong></span>
                    </span>
                </div>

                <div class="conteudo-card-musica">
                    ${capa ? `<img class="capa-musica-feed" src="${escaparHTML(capa)}" alt="Capa do álbum" decoding="async">` : ""}

                    <div class="informacoes-musica">
                        <h3>${escaparHTML(avaliacao.musica)}</h3>
                        <p><strong>Artista:</strong> ${escaparHTML(avaliacao.artista)}</p>
                        <p class="comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>
                        ${gerarEstrelas(avaliacao.nota)}
                        <p class="data-postagem">${escaparHTML(formatoData(avaliacao.data_avaliacao))}</p>
                    </div>
                </div>
            </article>

            <section class="secao-lista-comentarios">
                <h3>Comentários publicados</h3>
                <div id="lista-comentarios-modal"><p>Carregando comentários...</p></div>
            </section>

            ${obterToken() ? `
                <form class="form-resposta form-comentario-modal" data-id="${Number(id)}">
                    <label for="campo-comentario-modal">Escreva seu comentário</label>
                    <textarea id="campo-comentario-modal" name="resposta" maxlength="500"
                        placeholder="Compartilhe sua opinião..." required></textarea>
                    <button type="submit">Publicar comentário</button>
                </form>
            ` : `
                <p class="aviso-login-resposta">
                    Faça login para comentar. <a href="login.html">Entrar</a>
                </p>
            `}
        </div>
    `;

    tela.classList.add("aberta");
    document.body.classList.add("comentarios-abertos");

    tela.querySelector(".btn-voltar-comentarios").addEventListener("click", fecharTelaComentarios);

    const formulario = tela.querySelector(".form-comentario-modal");

    formulario?.addEventListener("submit", event => {
        event.preventDefault();
        publicarResposta(Number(id), formulario);
    });

    carregarRespostas(id);
}

function fecharTelaComentarios() {
    document.getElementById("tela-comentarios")?.classList.remove("aberta");
    document.body.classList.remove("comentarios-abertos");
}

async function publicarResposta(id, formulario) {
    const campo = formulario.querySelector("textarea");
    const botao = formulario.querySelector("button");
    const resposta = campo.value.trim();

    if (!obterToken()) {
        location.href = "login.html";
        return;
    }

    if (!resposta || resposta.length > 500) {
        alert("Digite um comentário de até 500 caracteres.");
        return;
    }

    botao.disabled = true;
    botao.textContent = "Enviando...";

    try {
        await buscarJSON(
            `${API}/usuarios/avaliacoes/${id}/respostas`,
            {
                method: "POST",
                headers: cabecalhoAuth({ "Content-Type": "application/json" }),
                body: JSON.stringify({ resposta })
            },
            { tentativas: 1, timeout: 20000 }
        );

        formulario.reset();
        respostasCache.delete(id);              // senão o comentário novo não aparece
        await carregarRespostas(id, true);
    } catch (erro) {
        console.error("Erro ao publicar comentário:", erro);
        alert(erro.message || "Erro ao publicar comentário.");
    } finally {
        botao.disabled = false;
        botao.textContent = "Publicar comentário";
    }
}

// =========================================================
// FEED: CACHE, DESENHO E CARREGAMENTO
// =========================================================
function limparFotoGrande(obj) {
    ["foto_perfil", "foto_usuario", "avatar_url"].forEach(k => {
        if (typeof obj[k] === "string" && obj[k].length > FOTO_MAX_CACHE) obj[k] = "";
    });
}

// Cópia do item sem fotos enormes (base64), para não estourar o localStorage.
function versaoLeve(avaliacao) {
    const copia = { ...avaliacao };
    limparFotoGrande(copia);

    ["usuarios", "usuario", "autor"].forEach(k => {
        if (copia[k] && typeof copia[k] === "object") {
            copia[k] = { ...copia[k] };
            limparFotoGrande(copia[k]);
        }
    });

    return copia;
}

function lerCacheFeed() {
    try {
        const salvo = JSON.parse(localStorage.getItem(CHAVE_FEED));
        return Array.isArray(salvo) ? salvo : null;
    } catch { return null; }
}

function salvarCacheFeed(lista) {
    try { localStorage.setItem(CHAVE_FEED, JSON.stringify(lista.slice(0, ITENS_NO_CACHE).map(versaoLeve))); }
    catch {}
}

// Resumo barato para saber se o topo do feed mudou.
function assinaturaDe(lista) {
    return lista.slice(0, ITENS_NO_CACHE).map(a =>
        [a.id, a.total_curtidas, a.nota, a.musica, a.comentario, dadosAutor(a).nome].join("~")
    ).join("|");
}

function mostrarMensagem(texto, comRetentar = false) {
    feed.innerHTML = `
        <p class="mensagem-lista-vazia" aria-live="polite">${escaparHTML(texto)}</p>
        ${comRetentar ? `<button type="button" class="btn-tentar-novamente"
            style="display:block;margin:12px auto;padding:10px 20px;cursor:pointer">Tentar novamente</button>` : ""}
    `;
}

function atualizarLista(lista) {
    todas = lista;
    avaliacoesPorId.clear();
    lista.forEach(a => avaliacoesPorId.set(Number(a.id), a));
    registrarFotos(lista);
}

function ajustarBotaoMais() {
    observador?.disconnect();
    observador = null;
    feed.querySelector(".feed-mais")?.remove();

    if (exibidos >= todas.length) return;

    feed.insertAdjacentHTML("beforeend", `
        <button type="button" class="feed-mais"
            style="display:block;margin:16px auto;padding:10px 20px;cursor:pointer">
            Carregar mais avaliações
        </button>
    `);

    if ("IntersectionObserver" in window) {
        observador = new IntersectionObserver(entradas => {
            if (entradas.some(e => e.isIntersecting)) mostrarMais();
        }, { rootMargin: "600px" });

        observador.observe(feed.querySelector(".feed-mais"));
    }
}

function mostrarMais(quantidade = POR_PAGINA) {
    const usuario = obterUsuarioLogado();
    const logado = Boolean(usuario && usuario.access_token);
    const fatia = todas.slice(exibidos, exibidos + quantidade);

    exibidos += fatia.length;

    feed.querySelector(".feed-mais")?.remove();
    feed.insertAdjacentHTML("beforeend", fatia.map(a => montarCard(a, logado, usuario)).join(""));

    ajustarBotaoMais();
    pintarCurtidas();
    buscarFotosFaltantes(fatia.map(a => dadosAutor(a).id));
}

function renderizarFeed(lista) {
    // Mantém a quantidade já exibida para a página não "pular" ao atualizar.
    const quantidade = Math.max(POR_PAGINA, exibidos);

    atualizarLista(lista);
    exibidos = 0;

    if (!lista.length) {
        feed.innerHTML = `<p class="mensagem-lista-vazia">Nenhuma avaliação encontrada ainda.</p>`;
        return;
    }

    feed.innerHTML = "";
    mostrarMais(quantidade);
}

async function carregarAvaliacoes() {
    if (!feed) return;

    // 1) Mostra na hora o último feed salvo.
    const emCache = lerCacheFeed();
    const temCache = Boolean(emCache && emCache.length);

    if (temCache) {
        try { renderizarFeed(emCache); }
        catch (erro) { console.error("Cache do feed inválido:", erro); localStorage.removeItem(CHAVE_FEED); }
    } else {
        mostrarMensagem("Carregando avaliações...");
    }

    // 2) Se o servidor demorar (Render "dormindo"), avisa em vez de parecer travado.
    const aviso = !temCache
        ? setTimeout(() => {
            if (!todas.length) mostrarMensagem("Acordando o servidor… na primeira visita pode levar alguns segundos.");
        }, 4000)
        : null;

    // Curtidas em paralelo: não esperam o feed.
    sincronizarCurtidas();

    try {
        const dados = await buscarJSON(`${API}/usuarios/avaliacoes`, { cache: "no-store" }, { tentativas: 3, timeout: 25000 });
        const lista = dados.avaliacoes || [];

        const mudou = !temCache || assinaturaDe(lista) !== assinaturaDe(emCache);

        salvarCacheFeed(lista);

        if (mudou) {
            renderizarFeed(lista);
        } else {
            atualizarLista(lista);
            ajustarBotaoMais();
            aplicarTodasFotos();
        }
    } catch (erro) {
        console.error("Erro no Feed:", erro);

        if (!todas.length) {
            mostrarMensagem("Não foi possível carregar o Feed. Tente novamente em instantes.", true);
        }
    } finally {
        clearTimeout(aviso);
    }
}

// =========================================================
// EVENTOS
// =========================================================
if (btnLoginCabecalho) {
    btnLoginCabecalho.style.display = obterUsuarioLogado() ? "none" : "inline-flex";
}

if (feed) {
    carregarFotosSalvas();

    const eu = obterUsuarioLogado();
    const minhaFoto = urlImagemSegura(eu?.foto_perfil);
    if (eu?.id_usuario && minhaFoto) fotos.set(Number(eu.id_usuario), minhaFoto);

    feed.addEventListener("click", event => {
        const respostas = event.target.closest(".btn-toggle-respostas");
        if (respostas) { abrirTelaComentarios(Number(respostas.dataset.id)); return; }

        const curtir = event.target.closest(".btn-curtir");
        if (curtir) { alternarCurtida(curtir); return; }

        const maisBotao = event.target.closest(".feed-mais");
        if (maisBotao) { mostrarMais(); return; }

        if (event.target.closest(".btn-tentar-novamente")) carregarAvaliacoes();
    });

    // Pré-carrega os comentários quando o dedo/mouse chega ao botão.
    ["mouseover", "touchstart"].forEach(tipo => {
        feed.addEventListener(tipo, event => {
            const botao = event.target.closest(".btn-toggle-respostas");
            if (botao) buscarRespostas(Number(botao.dataset.id)).catch(() => {});
        }, { passive: true });
    });

    // Imagens/áudios que falham: troca por placeholder em vez de ícone quebrado.
    feed.addEventListener("error", event => {
        const el = event.target;

        if (el.tagName === "AUDIO") {
            el.closest(".preview-avaliacao")?.querySelector(".erro-preview")?.removeAttribute("hidden");
        } else if (el.tagName === "IMG") {
            if (el.classList.contains("foto-autor-avaliacao")) {
                const id = Number(el.dataset.autorFoto) || 0;
                if (id) { fotos.delete(id); fotosTentadas.add(id); }
                el.replaceWith(criarPlaceholderFoto(id));
            } else if (el.classList.contains("capa-musica-feed")) {
                const div = document.createElement("div");
                div.className = "capa-musica-feed capa-placeholder";
                div.setAttribute("aria-hidden", "true");
                div.textContent = "♫";
                el.replaceWith(div);
            }
        }
    }, true);

    document.addEventListener("keydown", event => {
        if (event.key === "Escape") fecharTelaComentarios();
    });

    carregarAvaliacoes();
}

// =========================================================
// ESCONDER CABEÇALHO AO ROLAR
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