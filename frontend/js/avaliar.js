(() => {
"use strict";

// =========================================================
// CONFIGURAÇÃO
// =========================================================
const API = ["localhost", "127.0.0.1"].includes(location.hostname)
    ? "http://localhost:3000"
    : "https://entre-notas-api.onrender.com";
const API_DEEZER = "/deezer";

const $ = id => document.getElementById(id);

const formAvaliacao = $("formAvaliacao");
const campoMusica = $("musicaAvaliacao");
const campoArtista = $("artistaAvaliacao");
const musicaSelecionada = $("musicaSelecionada");
const capaAlbum = $("capaAlbum");
const tituloMusicaSelecionada = $("tituloMusicaSelecionada");
const albumMusicaSelecionada = $("albumMusicaSelecionada");
const mensagemAvaliacao = $("mensagemAvaliacao");
const previewMusica = $("previewMusica");
const areaPreviewMusica = $("areaPreviewMusica");
const erroPreviewAvaliar = $("erroPreviewAvaliar");
const listaSugestoesMusica = $("listaSugestoesMusica");
const listaSugestoesArtista = $("listaSugestoesArtista");
const avaliarSemLogin = $("avaliarSemLogin");

// Sem esses elementos a página não funciona: evita erro em cascata.
if (!formAvaliacao || !campoMusica || !campoArtista || !listaSugestoesMusica || !listaSugestoesArtista) {
    console.error("avaliar.js: elementos do formulário não encontrados.");
    return;
}

let musicaDeezerSelecionada = null;
let tempoBusca = null;
let numeroBusca = 0;

const CACHE_DEEZER_TTL = 3 * 60 * 1000;
const cacheDeezer = new Map(); // só em memória: não enche o localStorage

// =========================================================
// AUXILIARES
// =========================================================
function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, c => ({
        "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
    })[c]);
}

function obterUsuario() {
    try { return JSON.parse(localStorage.getItem("usuarioLogado")); }
    catch { return null; }
}

const obterToken = () => obterUsuario()?.access_token || null;

function urlHttps(valor) {
    return /^https:\/\//i.test(String(valor || "")) ? String(valor) : "";
}

function mostrarMensagem(texto, cor) {
    if (!mensagemAvaliacao) return;
    mensagemAvaliacao.textContent = texto;
    mensagemAvaliacao.style.color = cor;
}

// =========================================================
// LOGIN
// =========================================================
const logado = Boolean(obterToken());

formAvaliacao.style.display = logado ? "" : "none";
if (avaliarSemLogin) avaliarSemLogin.style.display = logado ? "none" : "flex";

// =========================================================
// PRÉVIA
// =========================================================
function limparPreview() {
    if (!previewMusica) return;

    previewMusica.pause();
    previewMusica.removeAttribute("src");
    previewMusica.load();

    if (areaPreviewMusica) areaPreviewMusica.style.display = "none";
    if (erroPreviewAvaliar) erroPreviewAvaliar.hidden = true;
}

function carregarPreview(musica) {
    limparPreview();
    if (!musica?.id || !previewMusica) return;

    previewMusica.src = `/api/deezer-preview?id=${encodeURIComponent(musica.id)}`;
    previewMusica.load();

    if (areaPreviewMusica) areaPreviewMusica.style.display = "block";
}

previewMusica?.addEventListener("error", () => {
    if (erroPreviewAvaliar && previewMusica.getAttribute("src")) erroPreviewAvaliar.hidden = false;
});

previewMusica?.addEventListener("loadeddata", () => {
    if (erroPreviewAvaliar) erroPreviewAvaliar.hidden = true;
});

// =========================================================
// SELEÇÃO E SUGESTÕES
// =========================================================
function limparSelecao() {
    musicaDeezerSelecionada = null;
    if (musicaSelecionada) musicaSelecionada.style.display = "none";
    limparPreview();
}

function esconderLista(lista) {
    lista.innerHTML = "";
    lista.style.display = "none";
}

function esconderSugestoes() {
    esconderLista(listaSugestoesMusica);
    esconderLista(listaSugestoesArtista);
}

campoMusica.addEventListener("input", () => {
    limparSelecao();
    esconderLista(listaSugestoesArtista);
    pesquisarDeezer(campoMusica.value.trim(), "musica");
});

campoArtista.addEventListener("input", () => {
    limparSelecao();
    esconderLista(listaSugestoesMusica);
    pesquisarDeezer(campoArtista.value.trim(), "artista");
});

function pesquisarDeezer(busca, tipoBusca) {
    clearTimeout(tempoBusca);

    const lista = tipoBusca === "artista" ? listaSugestoesArtista : listaSugestoesMusica;
    const buscaAtual = ++numeroBusca;

    if (busca.length < 2) {
        esconderLista(lista);
        return;
    }

    tempoBusca = setTimeout(() => buscarMusicas(busca, tipoBusca, buscaAtual), 400);
}

async function buscarJSONSimples(url) {
    const resposta = await fetch(url);
    if (!resposta.ok) throw new Error("Erro ao buscar músicas.");
    return resposta.json();
}

async function buscarMusicas(busca, tipoBusca, buscaAtual) {
    const lista = tipoBusca === "artista" ? listaSugestoesArtista : listaSugestoesMusica;
    const chave = `${tipoBusca}_${busca.toLowerCase()}`;

    const guardado = cacheDeezer.get(chave);

    if (guardado && Date.now() - guardado.t < CACHE_DEEZER_TTL) {
        if (buscaAtual === numeroBusca) mostrarSugestoes(guardado.data, tipoBusca);
        return;
    }

    try {
        // Proxy da Vercel primeiro, para não acordar o backend Render em pesquisas.
        let dados;

        try {
            dados = await buscarJSONSimples(`/api/deezer?q=${encodeURIComponent(busca)}`);
        } catch {
            dados = await buscarJSONSimples(`${API}${API_DEEZER}/buscar?q=${encodeURIComponent(busca)}`);
        }

        const resultados = Array.isArray(dados.data) ? dados.data : [];

        if (cacheDeezer.size > 60) cacheDeezer.clear();
        cacheDeezer.set(chave, { t: Date.now(), data: resultados });

        if (buscaAtual !== numeroBusca) return; // pesquisa antiga: ignora
        mostrarSugestoes(resultados, tipoBusca);
    } catch (erro) {
        if (buscaAtual !== numeroBusca) return;

        console.error("Erro na pesquisa:", erro);
        lista.innerHTML = `<div style="padding:12px;color:#ff7777;">Não foi possível realizar a busca.</div>`;
        lista.style.display = "block";
    }
}

function mostrarSugestoes(musicas, tipoBusca) {
    const lista = tipoBusca === "artista" ? listaSugestoesArtista : listaSugestoesMusica;

    lista.innerHTML = "";

    if (!musicas.length) {
        lista.innerHTML = `<div style="padding:12px;color:#aaa;">Nenhuma música encontrada.</div>`;
        lista.style.display = "block";
        return;
    }

    musicas.slice(0, 5).forEach(musica => {
        const sugestao = document.createElement("div");
        sugestao.className = "sugestao-musica";

        const capa = urlHttps(musica.album?.cover_medium);
        const titulo = musica.title || "Música sem nome";
        const artista = musica.artist?.name || "Artista desconhecido";

        sugestao.innerHTML = `
            ${capa ? `<img src="${escaparHTML(capa)}" alt="Capa do álbum" loading="lazy" decoding="async">` : ""}
            <div class="sugestao-info">
                <strong>${escaparHTML(titulo)}</strong>
                <span>${escaparHTML(artista)}</span>
            </div>
        `;

        sugestao.addEventListener("click", () => selecionarMusica(musica));
        lista.appendChild(sugestao);
    });

    lista.style.display = "block";
}

function selecionarMusica(musica) {
    numeroBusca++;
    clearTimeout(tempoBusca);

    musicaDeezerSelecionada = musica;

    campoMusica.value = musica.title || "";
    campoArtista.value = musica.artist?.name || "";

    const capa = urlHttps(musica.album?.cover_medium);

    if (capaAlbum) {
        if (capa) {
            capaAlbum.src = capa;
            capaAlbum.style.display = "block";
        } else {
            capaAlbum.removeAttribute("src");
            capaAlbum.style.display = "none";
        }
    }

    if (tituloMusicaSelecionada) tituloMusicaSelecionada.textContent = musica.title || "";
    if (albumMusicaSelecionada) {
        albumMusicaSelecionada.textContent = musica.album?.title ? `Álbum: ${musica.album.title}` : "";
    }
    if (musicaSelecionada) musicaSelecionada.style.display = "block";

    carregarPreview(musica);
    esconderSugestoes();
}

document.addEventListener("click", event => {
    const dentro = [campoMusica, campoArtista, listaSugestoesMusica, listaSugestoesArtista]
        .some(el => el.contains(event.target));

    if (!dentro) esconderSugestoes();
});

// =========================================================
// ENVIAR AVALIAÇÃO
// =========================================================
formAvaliacao.addEventListener("submit", async event => {
    event.preventDefault();

    const overlay = $("loadingOverlay");
    const botaoSubmit = formAvaliacao.querySelector('button[type="submit"]');

    const musica = campoMusica.value.trim();
    const artista = campoArtista.value.trim();
    const comentario = $("comentarioAvaliacao")?.value.trim() || "";
    const notaSelecionada = document.querySelector('input[name="nota"]:checked');
    const nota = notaSelecionada ? Number(notaSelecionada.value) : null;

    if (!musica || !artista || !comentario || !nota) {
        mostrarMensagem(
            !nota ? "Clique em uma estrela para dar sua nota!" : "Preencha todos os campos!",
            "#ff5c7c"
        );
        return;
    }

    const usuario = obterUsuario();
    const token = obterToken();

    if (!usuario || !token) {
        mostrarMensagem("Sua sessão expirou. Faça login novamente.", "#ff5c7c");
        return;
    }

    const controle = new AbortController();
    const relogio = setTimeout(() => controle.abort(), 60000); // Render pode estar acordando

    try {
        overlay?.classList.add("ativo");
        if (botaoSubmit) botaoSubmit.disabled = true;

        const resposta = await fetch(`${API}/usuarios/avaliacoes`, {
            method: "POST",
            signal: controle.signal,
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify({
                id_usuario: usuario.id_usuario,
                musica,
                artista,
                comentario,
                nota,
                capa_album: musicaDeezerSelecionada?.album?.cover_medium || null,
                id_deezer: musicaDeezerSelecionada?.id || null,
                id_album: musicaDeezerSelecionada?.album?.id || null,
                preview: musicaDeezerSelecionada?.preview || null
            })
        });

        let resultado = null;
        try { resultado = await resposta.json(); } catch {}

        if (!resposta.ok || !resultado?.sucesso) {
            throw new Error(resultado?.mensagem || resultado?.erro || "Erro ao enviar avaliação.");
        }

        mostrarMensagem(resultado.mensagem || "Avaliação enviada!", "#54d98b");

        formAvaliacao.reset();
        musicaDeezerSelecionada = null;
        if (musicaSelecionada) musicaSelecionada.style.display = "none";
        capaAlbum?.removeAttribute("src");
        limparPreview();
        esconderSugestoes();

        // O feed e "minhas avaliações" precisam buscar de novo.
        localStorage.removeItem("entreNotas_feedCache");
        localStorage.removeItem("entreNotas_minhas");

        setTimeout(() => { location.href = "home.html"; }, 800);
    } catch (erro) {
        console.error("Erro ao enviar avaliação:", erro);

        mostrarMensagem(
            erro.name === "AbortError"
                ? "O servidor demorou para responder. Tente novamente."
                : (erro.message || "Erro de conexão com o servidor."),
            "#ff5c7c"
        );

        overlay?.classList.remove("ativo");
        if (botaoSubmit) botaoSubmit.disabled = false;
    } finally {
        clearTimeout(relogio);
    }
});

// =========================================================
// CABEÇALHO AO ROLAR
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