(() => {
"use strict";

const API = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : "https://entre-notas-api.onrender.com";

let mensagem, cabecalhoPerfil, secaoAvaliacoes, listaAvaliacoes; // preenchidos em iniciar()

const PREFIXO_CURTIDAS = "entreNotas_curtidas_";
const FOTO_MAX_CACHE = 30000;
const alteracoesLocais = new Map();
let curtidas = null;
let exibiuAlgo = false;   // já há algo na tela (cache, Feed ou servidor)

// =========================================================
// VISIBILIDADE E AVISOS NA TELA
// =========================================================
// Garante que o elemento aparece, mesmo que o HTML/CSS o esconda de outro jeito.
function mostrar(el) {
    if (!el) return;
    el.hidden = false;
    el.style.display = "";
    if (getComputedStyle(el).display === "none") el.style.setProperty("display", "block", "important");
}

// Mostra um aviso visível (cria o elemento se a página não tiver #mensagemPerfilPublico).
function avisar(texto, { botao = false, voltar = false } = {}) {
    if (!mensagem) {
        mensagem = document.createElement("p");
        mensagem.id = "mensagemPerfilPublico";
        (listaAvaliacoes?.parentElement || document.body).prepend(mensagem);
    }

    mostrar(mensagem);
    mensagem.textContent = texto + " ";

    if (botao) {
        const b = document.createElement("button");
        b.type = "button";
        b.textContent = "Tentar novamente";
        b.addEventListener("click", () => location.reload());
        mensagem.appendChild(b);
    }

    if (voltar) {
        const a = document.createElement("a");
        a.href = "home.html";
        a.textContent = "Voltar ao Feed";
        mensagem.appendChild(a);
    }
}

// =========================================================
// AUXILIARES
// =========================================================
const esperar = ms => new Promise(r => setTimeout(r, ms));

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

function obterUsuario() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado")); }
    catch { return null; }
}

const obterToken = () => obterUsuario()?.access_token || "";
const cabecalhoAuth = (extra = {}) => ({ ...extra, Authorization: `Bearer ${obterToken()}` });

function urlImagemSegura(valor) {
    const str = String(valor || "");
    return (
        /^https:\/\//i.test(str) ||
        /^data:image\/(png|jpe?g|webp|gif|avif);base64,/i.test(str) ||
        /^\.\.\/img\//.test(str)
    ) ? str : "";
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
            erro.status = resposta.status;
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

function paraDataUTC(valor) {
    const texto = String(valor);
    const semFuso = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}(:\d{2}(\.\d+)?)?$/.test(texto);
    return new Date(semFuso ? texto.replace(" ", "T") + "Z" : texto);
}

function formatarData(valor) {
    if (!valor) return "";
    if (String(valor).includes("/")) return String(valor);

    const data = paraDataUTC(valor);

    return Number.isNaN(data.getTime())
        ? String(valor)
        : data.toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" });
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
        : `<span class="sem-preview">Prévia indisponível.</span>`;
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

function curtidaHTML(avaliacao) {
    const total = Math.max(0, Number(avaliacao.total_curtidas) || 0);

    if (!obterToken()) {
        return `<span class="curtidas-sem-login" aria-label="${total} curtidas">♡ ${total}</span>`;
    }

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

    listaAvaliacoes.querySelectorAll(".btn-curtir").forEach(botao => {
        if (botao.dataset.acaoEmAndamento) return;
        pintarCurtida(botao, curtidas.has(Number(botao.dataset.id)));
        botao.disabled = false;
    });
}

async function carregarCurtidasDoUsuario() {
    const usuario = obterUsuario();
    if (!usuario || !obterToken() || !listaAvaliacoes.querySelector(".btn-curtir")) return;

    curtidas = lerCacheCurtidas(usuario.id_usuario);
    pintarTodas();

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
        console.error("Erro ao verificar curtidas:", erro);
        curtidas = curtidas || new Set();
    } finally {
        alteracoesLocais.clear();
    }

    pintarTodas();
}

async function alternarCurtida(botao) {
    const usuario = obterUsuario();

    if (!usuario || !obterToken()) {
        location.href = "login.html";
        return;
    }

    if (botao.disabled) return;

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
                headers: cabecalhoAuth({ "Content-Type": "application/json" }),
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
// CARD
// =========================================================
function montarCard(avaliacao) {
    const id = Number(avaliacao.id);
    if (!Number.isSafeInteger(id) || id <= 0) return "";

    const capa = urlImagemSegura(avaliacao.capa_album);

    const capaHTML = capa
        ? `<img class="perfil-publico-capa capa-musica-feed" src="${escaparHTML(capa)}" alt="Capa do álbum" loading="lazy" decoding="async">`
        : `<div class="perfil-publico-capa capa-musica-feed capa-placeholder" aria-hidden="true">♫</div>`;

    return `
        <article class="perfil-publico-avaliacao" data-avaliacao-id="${id}">
            <div class="capa-musica-container">${capaHTML}</div>

            <div class="perfil-publico-conteudo informacoes-musica">
                <h3>${escaparHTML(avaliacao.musica)}</h3>

                <p class="perfil-publico-artista artista-avaliacao">
                    <strong>Artista:</strong> ${escaparHTML(avaliacao.artista)}
                </p>

                <p class="perfil-publico-comentario comentario-avaliacao">${escaparHTML(avaliacao.comentario)}</p>

                ${gerarEstrelas(avaliacao.nota)}

                <p class="data-postagem">${escaparHTML(formatarData(avaliacao.data_avaliacao))}</p>

                <div class="area-preview-feed">${gerarPreview(avaliacao)}</div>

                <div class="acoes-avaliacao-publica">${curtidaHTML(avaliacao)}</div>
            </div>
        </article>
    `;
}

// =========================================================
// PERFIL PÚBLICO
// =========================================================
function exibirPerfilPublico(usuario, avaliacoes) {
    const nome = usuario.nome_usuario || "Usuário";
    const total = avaliacoes.length;

    exibiuAlgo = true;
    document.title = `${nome} | Entre Notas`;

    const definir = (id, texto) => {
        const el = document.getElementById(id);
        if (el) el.textContent = texto;
    };

    definir("nomePerfilPublico", nome);
    definir("biografiaPerfilPublico", usuario.biografia === undefined
        ? "Carregando biografia..."
        : (usuario.biografia || "Este usuário ainda não adicionou uma biografia."));
    definir("totalAvaliacoesPublicas", `${total} ${total === 1 ? "avaliação" : "avaliações"}`);

    const elementoFoto = document.getElementById("fotoPerfilPublico");

    if (elementoFoto) {
        elementoFoto.onerror = () => { elementoFoto.onerror = null; elementoFoto.src = "../img/logo.png"; };
        elementoFoto.decoding = "async";
        elementoFoto.src = urlImagemSegura(usuario.foto_perfil) || "../img/logo.png";
    }

    listaAvaliacoes.innerHTML = total
        ? avaliacoes.map(montarCard).join("")
        : `<p class="perfil-publico-vazio">Este usuário ainda não publicou avaliações.</p>`;

    mostrar(cabecalhoPerfil);
    mostrar(secaoAvaliacoes);
    mostrar(listaAvaliacoes);
    if (mensagem) mensagem.textContent = "";

    carregarCurtidasDoUsuario();
}

function lerCachePerfil(chave) {
    try {
        const cache = JSON.parse(localStorage.getItem(chave));
        // Cache só serve para exibir rápido; sempre atualiza em seguida.
        return cache && Date.now() - cache.timestamp < 60 * 60 * 1000 ? cache : null;
    } catch { return null; }
}

// Sem fotos enormes (base64) para não estourar o localStorage.
function usuarioLeve(usuario) {
    const leve = { ...usuario };

    if (typeof leve.foto_perfil === "string" && leve.foto_perfil.length > FOTO_MAX_CACHE) {
        leve.foto_perfil = "";
    }

    return leve;
}

function salvarCachePerfil(chave, usuario, avaliacoes) {
    try { localStorage.setItem(chave, JSON.stringify({ timestamp: Date.now(), usuario: usuarioLeve(usuario), avaliacoes })); }
    catch {}
}

// Dados que o Feed deixou prontos ao clicar no autor (mostram o perfil na hora).
function lerSemente(id) {
    try {
        const chave = `entreNotas_semente_${id}`;
        const semente = JSON.parse(sessionStorage.getItem(chave));
        sessionStorage.removeItem(chave);
        return semente && semente.usuario ? semente : null;
    } catch { return null; }
}

function falhar(erro) {
    console.error("Erro ao carregar perfil público:", erro);
    avisar(`Não foi possível carregar o perfil${erro.status ? ` (código ${erro.status})` : ""}.`, { botao: true });
}

function lerCacheFeed() {
    try {
        const lista = JSON.parse(localStorage.getItem("entreNotas_feedCache"));
        return Array.isArray(lista) ? lista : [];
    } catch { return []; }
}

function donoDaAvaliacao(a) {
    const u = a.usuarios || a.usuario || a.autor || {};
    return Number(a.id_usuario ?? u.id_usuario ?? u.id);
}

// Monta um perfil "básico" (nome, foto e avaliações) com o que o Feed já traz.
function perfilDoFeed(lista, id) {
    const itens = lista.filter(a => donoDaAvaliacao(a) === id);
    if (!itens.length) return null;

    const a = itens[0];
    const u = a.usuarios || a.usuario || a.autor || {};

    return {
        usuario: {
            id_usuario: id,
            nome_usuario: a.nome_usuario || u.nome_usuario || u.nome || "Usuário",
            foto_perfil: a.foto_perfil || a.foto_usuario || a.avatar_url || u.foto_perfil || u.avatar_url || ""
        },
        avaliacoes: itens
    };
}

let feedTentado = null;

// Plano B: se a rota do perfil demorar ou falhar, usa a rota do Feed (que responde bem).
function tentarPeloFeed(id) {
    if (!feedTentado) {
        feedTentado = buscarJSON(`${API}/usuarios/avaliacoes`, {}, { tentativas: 1, timeout: 20000 })
            .then(dados => perfilDoFeed(dados.avaliacoes || [], id))
            .catch(() => null);
    }

    return feedTentado.then(perfil => {
        if (perfil && !exibiuAlgo) exibirPerfilPublico(perfil.usuario, perfil.avaliacoes);
        return exibiuAlgo;
    });
}

async function carregarPerfilPublico() {
    const id = Number(new URLSearchParams(location.search).get("id"));

    if (!Number.isSafeInteger(id) || id <= 0) {
        avisar("Este endereço não indica qual perfil abrir (falta ?id=...). Abra o perfil clicando no nome de um usuário no Feed.", { voltar: true });
        return;
    }

    if (Number(obterUsuario()?.id_usuario) === id) {
        location.replace("perfil.html");
        return;
    }

    const chave = `entreNotas_perfilPublico_${id}`;
    const cache = lerCachePerfil(chave);
    const inicial = cache || lerSemente(id) || perfilDoFeed(lerCacheFeed(), id);

    if (inicial) {
        try { exibirPerfilPublico(inicial.usuario || {}, inicial.avaliacoes || []); }
        catch (erro) { console.error("Dados iniciais do perfil inválidos:", erro); }
    } else {
        avisar("Carregando perfil...");
    }

    // Se nada apareceu em 6 s, tenta o plano B sem esperar o servidor desistir.
    const planoB = setTimeout(() => {
        if (exibiuAlgo) return;
        avisar("O servidor está demorando. Tentando outro caminho...");
        tentarPeloFeed(id);
    }, 6000);

    try {
        const dados = await buscarJSON(`${API}/usuarios/perfil-publico/${id}`, {}, { tentativas: 2, timeout: 20000 });
        const usuario = dados.usuario || {};
        const avaliacoes = dados.avaliacoes || [];

        salvarCachePerfil(chave, usuario, avaliacoes);

        const mudou = !cache ||
            JSON.stringify(cache.usuario) !== JSON.stringify(usuarioLeve(usuario)) ||
            JSON.stringify(cache.avaliacoes) !== JSON.stringify(avaliacoes) ||
            (usuario.foto_perfil && !cache.usuario?.foto_perfil);

        if (mudou) exibirPerfilPublico(usuario, avaliacoes);
    } catch (erro) {
        console.error("Erro na rota do perfil público:", erro);

        if (!exibiuAlgo) {
            if (!(await tentarPeloFeed(id))) falhar(erro);
        } else if (!cache) {
            const bio = document.getElementById("biografiaPerfilPublico");
            if (bio) bio.textContent = "Não foi possível carregar a biografia agora.";
        }
    } finally {
        clearTimeout(planoB);
    }
}

function iniciar() {
    mensagem = document.getElementById("mensagemPerfilPublico");
    cabecalhoPerfil = document.getElementById("cabecalhoPerfilPublico");
    secaoAvaliacoes = document.getElementById("secaoAvaliacoesPublicas");
    listaAvaliacoes = document.getElementById("listaAvaliacoesPublicas");

    if (!listaAvaliacoes) {
        avisar("Página incompleta: não encontrei o elemento #listaAvaliacoesPublicas no HTML.");
        return;
    }

    listaAvaliacoes.addEventListener("click", event => {
        const botao = event.target.closest(".btn-curtir");
        if (botao) alternarCurtida(botao);
    });

    listaAvaliacoes.addEventListener("error", event => {
        const el = event.target;

        if (el.tagName === "IMG" && el.classList.contains("capa-musica-feed")) {
            const div = document.createElement("div");
            div.className = "capa-musica-feed capa-placeholder";
            div.setAttribute("aria-hidden", "true");
            div.textContent = "♫";
            el.replaceWith(div);
        }
    }, true);

    carregarPerfilPublico();
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", iniciar);
else iniciar();
})();