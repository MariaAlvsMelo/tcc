const formLogin =
    document.getElementById("formLogin");

const formCadastro =
    document.getElementById("formCadastro");

const caixaLogin =
    document.getElementById("caixaLogin");

const caixaCadastro =
    document.getElementById("caixaCadastro");

const linkIrCadastro =
    document.getElementById("linkIrCadastro");

const linkIrLogin =
    document.getElementById("linkIrLogin");


// =========================================================
// ADICIONADO:
// TELA DE CARREGAMENTO
// =========================================================

const loadingOverlay =
    document.getElementById("loadingOverlay");


// =========================================================
// CADASTRO
// =========================================================

formCadastro.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const nome =
            document
                .getElementById("nomeCadastro")
                .value
                .trim();

        const email =
            document
                .getElementById("emailCadastro")
                .value
                .trim();

        const senha =
            document
                .getElementById("senhaCadastro")
                .value;

        const mensagemCadastro =
            document.getElementById(
                "mensagemCadastro"
            );


        try {

            const resposta =
                await fetch(
                    "http://localhost:3000/usuarios/cadastro",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            nome,
                            email,
                            senha
                        })
                    }
                );


            const resultado =
                await resposta.json();


            mensagemCadastro.innerText =
                resultado.mensagem;


            if (resultado.sucesso) {

                mensagemCadastro.style.color =
                    "green";

                formCadastro.reset();

            } else {

                mensagemCadastro.style.color =
                    "red";
            }


        } catch (erro) {

            console.error(
                "Erro no cadastro:",
                erro
            );

            mensagemCadastro.innerText =
                "Erro ao conectar com o servidor.";

            mensagemCadastro.style.color =
                "red";
        }

    }
);


// =========================================================
// LOGIN
// =========================================================

formLogin.addEventListener(
    "submit",
    async function(event) {

        event.preventDefault();

        const email =
            document
                .getElementById("emailLogin")
                .value
                .trim();

        const senha =
            document
                .getElementById("senhaLogin")
                .value;

        const mensagemLogin =
            document.getElementById(
                "mensagemLogin"
            );

        const botaoLogin =
            formLogin.querySelector(
                'button[type="submit"]'
            );


        // =================================================
        // ADICIONADO:
        // MOSTRA A TELA DE CARREGAMENTO
        // =================================================

        if (loadingOverlay) {

            loadingOverlay.classList.add(
                "ativo"
            );
        }


        // =================================================
        // ADICIONADO:
        // DESATIVA O BOTÃO DURANTE O LOGIN
        // =================================================

        if (botaoLogin) {

            botaoLogin.disabled =
                true;
        }


        try {

            const resposta =
                await fetch(
                    "http://localhost:3000/usuarios/login",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            senha
                        })
                    }
                );


            const resultado =
                await resposta.json();


            mensagemLogin.innerText =
                resultado.mensagem;


            if (resultado.sucesso) {

                mensagemLogin.style.color =
                    "green";

                localStorage.setItem(
                    "usuarioLogado",
                    JSON.stringify(
                        resultado.usuario
                    )
                );


                // =================================================
                // ADICIONADO:
                // PEQUENO TEMPO PARA EXIBIR O CARREGAMENTO
                // ANTES DE ENTRAR NO SITE
                // =================================================

                setTimeout(
                    function() {

                        window.location.href =
                            "home.html";

                    },
                    2000
                );
            } else {

                mensagemLogin.style.color =
                    "red";


                // =================================================
                // ADICIONADO:
                // LOGIN INCORRETO -> REMOVE O CARREGAMENTO
                // =================================================

                if (loadingOverlay) {

                    loadingOverlay.classList.remove(
                        "ativo"
                    );
                }


                if (botaoLogin) {

                    botaoLogin.disabled =
                        false;
                }
            }


        } catch (erro) {

            console.error(
                "Erro no login:",
                erro
            );

            mensagemLogin.innerText =
                "Erro ao conectar com o servidor.";

            mensagemLogin.style.color =
                "red";


            // =================================================
            // ADICIONADO:
            // ERRO DE CONEXÃO -> REMOVE O CARREGAMENTO
            // =================================================

            if (loadingOverlay) {

                loadingOverlay.classList.remove(
                    "ativo"
                );
            }


            if (botaoLogin) {

                botaoLogin.disabled =
                    false;
            }
        }

    }
);


// =========================================================
// ALTERNAR PARA CADASTRO
// =========================================================

linkIrCadastro.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        caixaLogin.style.display =
            "none";

        caixaCadastro.style.display =
            "block";
    }
);


// =========================================================
// ALTERNAR PARA LOGIN
// =========================================================

linkIrLogin.addEventListener(
    "click",
    function(event) {

        event.preventDefault();

        caixaCadastro.style.display =
            "none";

        caixaLogin.style.display =
            "block";
    }
);