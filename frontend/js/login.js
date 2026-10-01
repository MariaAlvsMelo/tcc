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


                // =================================================
                // ADICIONADO:
                // Salva os dados do usuário logado.
                //
                // Isso permite que o perfil e as avaliações saibam
                // qual usuário está conectado.
                // =================================================

                localStorage.setItem(
                    "usuarioLogado",
                    JSON.stringify(
                        resultado.usuario
                    )
                );


                window.location.href =
                    "home.html";

            } else {

                mensagemLogin.style.color =
                    "red";
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