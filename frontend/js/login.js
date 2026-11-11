
// =========================================================
// CONFIGURAÇÃO DA API
// =========================================================

// MODIFICADO:
// Utiliza o mesmo domínio do frontend.
// Funciona localmente e na Vercel.

const API = "";

// =========================================================
// ELEMENTOS DA TELA
// =========================================================

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
// TELA DE CARREGAMENTO
// =========================================================

const loadingOverlay =
    document.getElementById("loadingOverlay");

// =========================================================
// FUNÇÃO AUXILIAR
// =========================================================

// ADICIONADO:
// Evita erros quando o servidor retorna uma resposta
// que não está no formato JSON.

async function obterRespostaJSON(resposta) {
    try {
        return await resposta.json();
    } catch {
        throw new Error(
            "O servidor retornou uma resposta inválida."
        );
    }
}

// =========================================================
// CADASTRO
// =========================================================

if (formCadastro) {

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

            const botaoCadastro =
                formCadastro.querySelector(
                    'button[type="submit"]'
                );

            try {

                if (botaoCadastro) {
                    botaoCadastro.disabled = true;
                }

                mensagemCadastro.innerText =
                    "Realizando cadastro...";

                mensagemCadastro.style.color =
                    "inherit";

                // =================================================
                // MODIFICADO:
                // ENDEREÇO DINÂMICO DA API
                // =================================================

                const resposta = await fetch(
                    `${API}/usuarios/cadastro`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            nome,
                            email,
                            senha
                        })
                    }
                );

                const resultado =
                    await obterRespostaJSON(resposta);

                mensagemCadastro.innerText =
                    resultado.mensagem ||
                    resultado.erro ||
                    "Não foi possível realizar o cadastro.";

                if (resposta.ok && resultado.sucesso) {

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
                    erro.message ||
                    "Erro ao conectar com o servidor.";

                mensagemCadastro.style.color =
                    "red";

            } finally {

                if (botaoCadastro) {
                    botaoCadastro.disabled = false;
                }
            }
        }
    );
}

// =========================================================
// LOGIN
// =========================================================

if (formLogin) {

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
            // MOSTRAR TELA DE CARREGAMENTO
            // =================================================

            if (loadingOverlay) {
                loadingOverlay.classList.add("ativo");
            }

            // =================================================
            // DESATIVAR BOTÃO DURANTE O LOGIN
            // =================================================

            if (botaoLogin) {
                botaoLogin.disabled = true;
            }

            try {

                mensagemLogin.innerText =
                    "Entrando...";

                // =================================================
                // MODIFICADO:
                // ENDEREÇO DINÂMICO DA API
                // =================================================

                const resposta = await fetch(
                    `${API}/usuarios/login`,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify({
                            email,
                            senha
                        })
                    }
                );

                const resultado =
                    await obterRespostaJSON(resposta);

                mensagemLogin.innerText =
                    resultado.mensagem ||
                    resultado.erro ||
                    "Não foi possível realizar o login.";

                if (!resposta.ok || !resultado.sucesso) {

                    mensagemLogin.style.color =
                        "red";

                    return;
                }

                // =================================================
                // ADICIONADO:
                // VALIDAR DADOS RETORNADOS PELO SUPABASE
                // =================================================

                const usuario = resultado.usuario;

                if (
                    !usuario ||
                    !usuario.access_token
                ) {
                    throw new Error(
                        "O login foi realizado, mas o token de autenticação não foi recebido."
                    );
                }

                // =================================================
                // MODIFICADO:
                // SALVAR USUÁRIO E TOKEN DE AUTENTICAÇÃO
                // =================================================

                localStorage.setItem(
                    "usuarioLogado",
                    JSON.stringify(usuario)
                );

                mensagemLogin.style.color =
                    "green";

                mensagemLogin.innerText =
                    resultado.mensagem ||
                    "Login realizado com sucesso!";

                // =================================================
                // REDIRECIONAR PARA O FEED
                // =================================================

                setTimeout(function() {

                    window.location.href =
                        "home.html";

                }, 2000);

            } catch (erro) {

                console.error(
                    "Erro no login:",
                    erro
                );

                mensagemLogin.innerText =
                    erro.message ||
                    "Erro ao conectar com o servidor.";

                mensagemLogin.style.color =
                    "red";

                if (loadingOverlay) {
                    loadingOverlay.classList.remove("ativo");
                }

                if (botaoLogin) {
                    botaoLogin.disabled = false;
                }

            } finally {

                // Se não houve redirecionamento,
                // libera o botão novamente.

                if (
                    botaoLogin &&
                    !localStorage.getItem("usuarioLogado")
                ) {
                    botaoLogin.disabled = false;
                }
            }
        }
    );
}

// =========================================================
// ALTERNAR PARA CADASTRO
// =========================================================

if (
    linkIrCadastro &&
    caixaLogin &&
    caixaCadastro
) {

    linkIrCadastro.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            caixaLogin.style.display = "none";

            caixaCadastro.style.display = "block";
        }
    );
}

// =========================================================
// ALTERNAR PARA LOGIN
// =========================================================

if (
    linkIrLogin &&
    caixaLogin &&
    caixaCadastro
) {

    linkIrLogin.addEventListener(
        "click",
        function(event) {

            event.preventDefault();

            caixaCadastro.style.display = "none";

            caixaLogin.style.display = "block";
        }
    );
}
