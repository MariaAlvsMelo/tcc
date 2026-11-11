
const usuarioModel = require("../models/usuarioModel");

// =====================================================
// FUNÇÕES AUXILIARES
// =====================================================

// ADICIONADO: Obtém o token enviado pelo frontend.
function obterToken(req) {
    const autorizacao = req.headers.authorization;

    if (!autorizacao || !autorizacao.startsWith("Bearer ")) {
        return null;
    }

    return autorizacao.substring(7);
}

// ADICIONADO: Formata a data das avaliações.
function formatarAvaliacoes(avaliacoes) {
    return (avaliacoes || []).map(item => ({
        ...item,
        data_avaliacao: item.data_avaliacao
            ? new Date(item.data_avaliacao).toLocaleString("pt-BR", {
                day: "2-digit",
                month: "2-digit",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit"
            })
            : null
    }));
}

// ADICIONADO: Valida se o ID é um número inteiro positivo.
function idValido(id) {
    const numero = Number(id);

    return Number.isSafeInteger(numero) && numero > 0;
}

// =====================================================
// CONTROLLER DE USUÁRIOS
// =====================================================

const UsuarioController = {

    // =====================================================
    // VISUALIZAR PERFIL PÚBLICO
    // =====================================================

    buscarPerfilPublico: async (req, res) => {
        try {
            const id_usuario = Number(req.params.id_usuario);

            if (!idValido(id_usuario)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID inválido."
                });
            }

            const usuario = await usuarioModel.buscarPerfilPublico(id_usuario);

            if (!usuario) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Usuário não encontrado."
                });
            }

            const avaliacoes =
                await usuarioModel.listarAvaliacoesPublicas(id_usuario);

            return res.json({
                sucesso: true,
                usuario,
                avaliacoes: formatarAvaliacoes(avaliacoes)
            });

        } catch (erro) {
            console.error("Erro ao consultar perfil público:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao consultar perfil."
            });
        }
    },

    // =====================================================
    // LISTAR AVALIAÇÕES DE UM USUÁRIO
    // =====================================================

    listarAvaliacoesUsuario: async (req, res) => {
        try {
            const id_usuario = req.params.id;
            const token = obterToken(req);

            if (!idValido(id_usuario)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID do usuário inválido."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            const resultados =
                await usuarioModel.listarAvaliacoesUsuario(
                    id_usuario,
                    token
                );

            return res.json({
                sucesso: true,
                avaliacoes: formatarAvaliacoes(resultados)
            });

        } catch (erro) {
            console.error("Erro ao listar avaliações do usuário:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao carregar avaliações."
            });
        }
    },

    // =====================================================
    // CURTIR AVALIAÇÃO
    // =====================================================

    curtirAvaliacao: async (req, res) => {
        try {
            const { id_usuario } = req.body;
            const { id } = req.params;
            const token = obterToken(req);

            if (!id_usuario || !idValido(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Usuário ou avaliação não informados."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login para curtir."
                });
            }

            await usuarioModel.curtirAvaliacao(
                id_usuario,
                id,
                token
            );

            return res.status(201).json({
                sucesso: true,
                mensagem: "Avaliação curtida!"
            });

        } catch (erro) {
            console.error("Erro ao curtir avaliação:", erro);

            // MODIFICADO: Código de duplicidade do PostgreSQL/Supabase.
            if (erro.code === "23505") {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Você já curtiu esta avaliação."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao registrar curtida."
            });
        }
    },

    // =====================================================
    // REMOVER CURTIDA
    // =====================================================

    removerCurtida: async (req, res) => {
        try {
            const { id_usuario } = req.body;
            const { id } = req.params;
            const token = obterToken(req);

            if (!id_usuario || !idValido(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Usuário ou avaliação não informados."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            await usuarioModel.removerCurtida(
                id_usuario,
                id,
                token
            );

            return res.json({
                sucesso: true,
                mensagem: "Curtida removida!"
            });

        } catch (erro) {
            console.error("Erro ao remover curtida:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao remover curtida."
            });
        }
    },

    // =====================================================
    // VERIFICAR SE O USUÁRIO CURTIU UMA AVALIAÇÃO
    // =====================================================

    verificarCurtida: async (req, res) => {
        try {
            const { id_usuario } = req.query;
            const { id } = req.params;

            if (!id_usuario || !idValido(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Usuário ou avaliação não informados."
                });
            }

            const resultado = await usuarioModel.verificarCurtida(
                id_usuario,
                id
            );

            // MODIFICADO: Compatível com retorno booleano ou lista.
            const curtiu = Array.isArray(resultado)
                ? resultado.length > 0
                : Boolean(resultado);

            return res.json({
                sucesso: true,
                curtiu
            });

        } catch (erro) {
            console.error("Erro ao verificar curtida:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro ao verificar curtida."
            });
        }
    },

    // =====================================================
    // CADASTRAR USUÁRIO
    // =====================================================

    cadastrar: async (req, res) => {
        try {
            const { nome, email, senha } = req.body;

            if (!nome || !email || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os campos!"
                });
            }

            if (String(senha).length < 6) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "A senha deve ter pelo menos 6 caracteres."
                });
            }

            const resultado = await usuarioModel.cadastrar(
                nome.trim(),
                email.trim(),
                senha
            );

            // MODIFICADO: O Supabase pode exigir confirmação por e-mail.
            const sessao = resultado?.session || null;

            return res.status(201).json({
                sucesso: true,
                mensagem: sessao
                    ? "Usuário cadastrado com sucesso!"
                    : "Cadastro realizado! Verifique seu e-mail para confirmar a conta.",
                sessaoAtiva: Boolean(sessao)
            });

        } catch (erro) {
            console.error("Erro ao cadastrar usuário:", erro);

            if (
                erro.code === "23505" ||
                erro.message?.toLowerCase().includes("already registered") ||
                erro.message?.toLowerCase().includes("already been registered")
            ) {
                return res.status(409).json({
                    sucesso: false,
                    mensagem: "Este e-mail já está cadastrado."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message || "Erro interno ao cadastrar usuário."
            });
        }
    },

    // =====================================================
    // LOGIN
    // =====================================================

    login: async (req, res) => {
        try {
            const { email, senha } = req.body;

            if (!email || !senha) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os campos!"
                });
            }

            const resultado = await usuarioModel.login(
                email.trim(),
                senha
            );

            if (!resultado) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "E-mail ou senha incorretos."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Login realizado com sucesso!",
                usuario: resultado
            });

        } catch (erro) {
            console.error("Erro no login:", erro);

            const mensagemErro = erro.message?.toLowerCase() || "";

            if (
                mensagemErro.includes("invalid login credentials") ||
                mensagemErro.includes("invalid credentials")
            ) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "E-mail ou senha incorretos."
                });
            }

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno no servidor."
            });
        }
    },

    // =====================================================
    // BUSCAR PERFIL DO USUÁRIO LOGADO
    // =====================================================

    buscarPerfil: async (req, res) => {
        try {
            const { id_usuario } = req.params;
            const token = obterToken(req);

            if (!idValido(id_usuario)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID do usuário inválido."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            const resultado = await usuarioModel.buscarPerfil(
                id_usuario,
                token
            );

            if (!resultado) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Usuário não encontrado."
                });
            }

            return res.json({
                sucesso: true,
                usuario: resultado
            });

        } catch (erro) {
            console.error("Erro ao buscar perfil:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao carregar o perfil."
            });
        }
    },

    // =====================================================
    // ATUALIZAR PERFIL
    // =====================================================

    atualizarPerfil: async (req, res) => {
        try {
            const { id_usuario } = req.params;
            const {
                nome,
                email,
                senha,
                foto_perfil,
                biografia
            } = req.body;

            const token = obterToken(req);

            if (!idValido(id_usuario)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID do usuário inválido."
                });
            }

            if (!nome || !email) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Nome e e-mail são obrigatórios."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            await usuarioModel.atualizarPerfil(
                id_usuario,
                nome.trim(),
                email.trim(),
                senha,
                foto_perfil || null,
                biografia ? biografia.trim() : null,
                token
            );

            return res.json({
                sucesso: true,
                mensagem: "Perfil atualizado com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao atualizar perfil:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message || "Erro interno ao atualizar o perfil."
            });
        }
    },

    // =====================================================
    // CRIAR AVALIAÇÃO
    // =====================================================

    avaliar: async (req, res) => {
        try {
            const {
                id_usuario,
                musica,
                artista,
                comentario,
                nota,
                capa_album,
                id_deezer,
                id_album,
                preview
            } = req.body;

            const token = obterToken(req);

            if (
                !id_usuario ||
                !musica ||
                !artista ||
                !comentario ||
                nota === undefined ||
                nota === null
            ) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Preencha todos os campos e faça login antes de avaliar!"
                });
            }

            if (!Number.isInteger(Number(nota)) || Number(nota) < 1 || Number(nota) > 5) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "A nota deve estar entre 1 e 5."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login antes de avaliar."
                });
            }

            await usuarioModel.avaliar(
                id_usuario,
                musica,
                artista,
                comentario,
                Number(nota),
                capa_album,
                id_deezer,
                id_album,
                preview,
                token
            );

            return res.status(201).json({
                sucesso: true,
                mensagem: "Avaliação salva com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao salvar avaliação:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message || "Erro interno ao salvar avaliação."
            });
        }
    },

    // =====================================================
    // LISTAR TODAS AS AVALIAÇÕES
    // =====================================================

    listarAvaliacoes: async (req, res) => {
        try {
            const resultados = await usuarioModel.listarAvaliacoes();

            return res.json({
                sucesso: true,
                avaliacoes: formatarAvaliacoes(resultados)
            });

        } catch (erro) {
            console.error("Erro ao listar avaliações:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao listar avaliações."
            });
        }
    },

    // =====================================================
    // LISTAR MINHAS AVALIAÇÕES
    // =====================================================

    minhasAvaliacoes: async (req, res) => {
        try {
            const id_usuario = req.params.id_usuario;
            const token = obterToken(req);

            if (!idValido(id_usuario)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Usuário não informado ou ID inválido."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            const resultados =
                await usuarioModel.listarAvaliacoesUsuario(
                    id_usuario,
                    token
                );

            return res.json({
                sucesso: true,
                avaliacoes: formatarAvaliacoes(resultados)
            });

        } catch (erro) {
            console.error("Erro ao carregar minhas avaliações:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: "Erro interno ao carregar avaliações."
            });
        }
    },

    // =====================================================
    // EXCLUIR AVALIAÇÃO
    // =====================================================

    excluirAvaliacao: async (req, res) => {
        try {
            const { id } = req.params;
            const { id_usuario } = req.body;
            const token = obterToken(req);

            if (!idValido(id)) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "ID da avaliação inválido."
                });
            }

            if (!id_usuario) {
                return res.status(400).json({
                    sucesso: false,
                    mensagem: "Usuário não identificado."
                });
            }

            if (!token) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "É necessário fazer login."
                });
            }

            const resultado = await usuarioModel.excluirAvaliacao(
                id,
                id_usuario,
                token
            );

            if (
                resultado === null ||
                resultado === false ||
                (Array.isArray(resultado) && resultado.length === 0)
            ) {
                return res.status(404).json({
                    sucesso: false,
                    mensagem: "Avaliação não encontrada ou não pertence a este usuário."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Avaliação excluída com sucesso!"
            });

        } catch (erro) {
            console.error("Erro ao excluir avaliação:", erro);

            return res.status(500).json({
                sucesso: false,
                mensagem: erro.message || "Erro interno ao excluir avaliação."
            });
        }
    }
};

module.exports = UsuarioController;
