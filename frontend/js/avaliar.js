const formAvaliacao = document.getElementById("formAvaliacao");

const campoMusica =
    document.getElementById("musicaAvaliacao");

const campoArtista =
    document.getElementById("artistaAvaliacao");

const listaSugestoes =
    document.getElementById("listaSugestoes");

const musicaSelecionada =
    document.getElementById("musicaSelecionada");

const capaAlbum =
    document.getElementById("capaAlbum");

const tituloMusicaSelecionada =
    document.getElementById(
        "tituloMusicaSelecionada"
    );

const albumMusicaSelecionada =
    document.getElementById(
        "albumMusicaSelecionada"
    );

const mensagemAvaliacao =
    document.getElementById(
        "mensagemAvaliacao"
    );


// Guarda a música selecionada da Deezer
let musicaDeezerSelecionada = null;


// ==========================================
// PESQUISA
// ==========================================

let tempoBusca;

campoMusica.addEventListener(
    "input",
    function () {

        // Se o usuário alterar o texto,
        // a música anteriormente selecionada deixa de ser válida
        musicaDeezerSelecionada = null;

        campoArtista.value = "";

        musicaSelecionada.style.display = "none";

        const busca =
            campoMusica.value.trim();

        clearTimeout(tempoBusca);


        if (busca.length < 2) {

            listaSugestoes.innerHTML = "";

            listaSugestoes.style.display =
                "none";

            return;
        }


        tempoBusca = setTimeout(() => {

            buscarMusicas(busca);

        }, 400);

    }
);


// ==========================================
// BUSCAR NA DEEZER
// ==========================================

async function buscarMusicas(busca) {

    try {

        const resposta = await fetch(
            `http://localhost:3000/deezer/buscar?q=${encodeURIComponent(busca)}`
        );


        if (!resposta.ok) {
            throw new Error(
                "Erro na busca."
            );
        }


        const dados =
            await resposta.json();


        mostrarSugestoes(
            dados.data || []
        );


    } catch (erro) {

        console.error(
            "Erro ao buscar músicas:",
            erro
        );

        listaSugestoes.innerHTML = `
            <div style="
                padding: 12px;
                color: #ff7777;
            ">
                Não foi possível buscar músicas.
            </div>
        `;

        listaSugestoes.style.display =
            "block";
    }
}


// ==========================================
// MOSTRAR SUGESTÕES
// ==========================================

function mostrarSugestoes(musicas) {

    listaSugestoes.innerHTML = "";


    if (
        !musicas ||
        musicas.length === 0
    ) {

        listaSugestoes.innerHTML = `
            <div style="
                padding: 12px;
                color: #aaa;
            ">
                Nenhuma música encontrada.
            </div>
        `;

        listaSugestoes.style.display =
            "block";

        return;
    }


    // Mostrar somente 5 sugestões
    musicas
        .slice(0, 5)
        .forEach(musica => {

            const sugestao =
                document.createElement("div");


            sugestao.classList.add(
                "sugestao-musica"
            );


            const capa =
                musica.album?.cover_medium ||
                "";


            const titulo =
                musica.title ||
                "Música sem nome";


            const artista =
                musica.artist?.name ||
                "Artista desconhecido";


            sugestao.innerHTML = `

                <img
                    src="${capa}"
                    alt="Capa do álbum"
                >

                <div class="sugestao-info">

                    <strong>
                        ${escaparHTML(titulo)}
                    </strong>

                    <span>
                        ${escaparHTML(artista)}
                    </span>

                </div>

            `;


            sugestao.addEventListener(
                "click",
                () => {

                    selecionarMusica(
                        musica
                    );

                }
            );


            listaSugestoes.appendChild(
                sugestao
            );

        });


    listaSugestoes.style.display =
        "block";
}


// ==========================================
// SELECIONAR MÚSICA
// ==========================================

function selecionarMusica(musica) {

    musicaDeezerSelecionada =
        musica;


    // Nome da música
    campoMusica.value =
        musica.title;


    // Nome do artista
    campoArtista.value =
        musica.artist?.name || "";


    // Capa
    if (
        musica.album?.cover_medium
    ) {

        capaAlbum.src =
            musica.album.cover_medium;


        capaAlbum.alt =
            `Capa do álbum ${musica.album.title || ""}`;


        musicaSelecionada.style.display =
            "block";
    }


    // Informações
    tituloMusicaSelecionada.textContent =
        musica.title;


    albumMusicaSelecionada.textContent =
        musica.album?.title
            ? `Álbum: ${musica.album.title}`
            : "";


    // Esconder sugestões
    listaSugestoes.innerHTML = "";

    listaSugestoes.style.display =
        "none";
}


// ==========================================
// FECHAR SUGESTÕES
// ==========================================

document.addEventListener(
    "click",
    function (event) {

        if (
            !campoMusica.contains(
                event.target
            ) &&
            !listaSugestoes.contains(
                event.target
            )
        ) {

            listaSugestoes.style.display =
                "none";

        }

    }
);


// ==========================================
// ENVIAR AVALIAÇÃO
// ==========================================
formAvaliacao.addEventListener(
    "submit",
    async function (event) {

        event.preventDefault();

        // Seleciona os elementos da tela de carregamento e o botão
        const overlay = document.getElementById("loadingOverlay");
        const botaoSubmit = formAvaliacao.querySelector('button[type="submit"]');

        const musica = campoMusica.value.trim();
        const artista = campoArtista.value.trim();
        const comentario = document.getElementById("comentarioAvaliacao").value.trim();
        const notaSelecionada = document.querySelector('input[name="nota"]:checked');
        const nota = notaSelecionada ? notaSelecionada.value : null;

        // Validação
        if (!musica || !artista || !comentario || !nota) {
            mensagemAvaliacao.innerText = !nota
                ? "Clique em uma estrela para dar sua nota!"
                : "Preencha todos os campos!";
            mensagemAvaliacao.style.color = "red";
            return;
        }

        try {
            // === ATIVA A TELA ESCURA E A ESTRELA GIRATÓRIA ===
            if (overlay) {
                overlay.classList.add("ativo");
            }

            if (botaoSubmit) {
                botaoSubmit.disabled = true;
            }

            const resposta = await fetch(
                "http://localhost:3000/usuarios/avaliacoes",
                {
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify({
                        musica: musica,
                        artista: artista,
                        comentario: comentario,
                        nota: nota,
                        capa_album: musicaDeezerSelecionada?.album?.cover_medium || null,
                        id_deezer: musicaDeezerSelecionada?.id || null,
                        id_album: musicaDeezerSelecionada?.album?.id || null
                    })
                }
            );

            const resultado = await resposta.json();
            mensagemAvaliacao.innerText = resultado.mensagem;

            if (resultado.sucesso) {
                mensagemAvaliacao.style.color = "green";

                // Limpa os campos do formulário normalmente
                formAvaliacao.reset();
                musicaDeezerSelecionada = null;
                musicaSelecionada.style.display = "none";
                capaAlbum.src = "";
                listaSugestoes.innerHTML = "";
                listaSugestoes.style.display = "none";

                // === ESPERA OS 2 SEGUNDOS COM A ESTRELA GIRANDO E DEPOIS DIRECIONA ===
                setTimeout(function () {
                    window.location.href = "home.html"; 
                }, 2000);

            } else {
                mensagemAvaliacao.style.color = "red";
                // Desativa a tela de carregamento caso dê erro nas regras do backend
                if (overlay) overlay.classList.remove("ativo");
                if (botaoSubmit) {
                    botaoSubmit.disabled = false;
                }
            }

        } catch (erro) {
            console.error("Erro ao enviar avaliação:", erro);
            mensagemAvaliacao.innerText = "Erro de conexão com o servidor.";
            mensagemAvaliacao.style.color = "red";
            
            // Desativa a tela de carregamento caso caia no erro de rede
            if (overlay) overlay.classList.remove("ativo");
            if (botaoSubmit) {
                botaoSubmit.disabled = false;
            }
        }
    }
);



// ==========================================
// EVITAR HTML INJETADO
// ==========================================

function escaparHTML(texto) {

    const div =
        document.createElement("div");

    div.textContent =
        texto;

    return div.innerHTML;
}

// ==========================================
// CABEÇALHO SOBE/DESCE AO ROLAR A PÁGINA
// ==========================================

const cabecalho = document.querySelector(".cabecalho");

let lastScrollY = window.scrollY;

if (cabecalho) {

    window.addEventListener("scroll", () => {

        if (window.scrollY > lastScrollY) {

            // Usuário está descendo
            cabecalho.classList.add("cabecalho--hidden");

        } else {

            // Usuário está subindo
            cabecalho.classList.remove("cabecalho--hidden");

        }

        lastScrollY = window.scrollY;

    });

}