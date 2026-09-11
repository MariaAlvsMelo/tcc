const usuarioModel = require("../models/usuarioModel");

const UsuarioController = {

    // Cadastrar novo usuário
    cadastrar: (req, res) => {
        const { nome, email, senha } = req.body;

        if (!nome || !email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos!"
            });
        }

        usuarioModel.cadastrar(nome, email, senha, (erro) => {

            if (erro) {
                console.error("Erro ao cadastrar usuário:", erro);

                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro interno ao cadastrar usuário."
                });
            }

            return res.status(201).json({
                sucesso: true,
                mensagem: "Usuário cadastrado com sucesso!"
            });

        });
    },


    // Login de usuário
    login: (req, res) => {

        const { email, senha } = req.body;

        if (!email || !senha) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos!"
            });
        }

        usuarioModel.login(email, senha, (erro, resultado) => {

            if (erro) {
                console.error("Erro no login:", erro);

                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro interno no servidor."
                });
            }

            if (!resultado || resultado.length === 0) {
                return res.status(401).json({
                    sucesso: false,
                    mensagem: "E-mail ou senha incorretos."
                });
            }

            return res.json({
                sucesso: true,
                mensagem: "Login realizado com sucesso!",
                usuario: resultado[0]
            });

        });
    },


    // Salvar avaliação de música
    avaliar: (req, res) => {

        const {
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album
        } = req.body;


        // Campos obrigatórios
        if (!musica || !artista || !comentario || nota === undefined) {

            return res.status(400).json({
                sucesso: false,
                mensagem: "Preencha todos os campos!"
            });

        }


        usuarioModel.avaliar(
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album,
            (erro) => {

                if (erro) {

                    console.error(
                        "Erro ao salvar avaliação:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Erro interno ao salvar avaliação."
                    });

                }


                return res.status(201).json({
                    sucesso: true,
                    mensagem: "Avaliação salva com sucesso!"
                });

            }
        );
    },


    // Listar todas as avaliações
    listarAvaliacoes: (req, res) => {

        usuarioModel.listarAvaliacoes((erro, resultados) => {

            if (erro) {

                console.error(
                    "Erro ao listar avaliações:",
                    erro
                );

                return res.status(500).json({
                    sucesso: false,
                    mensagem: "Erro interno ao listar avaliações."
                });

            }


            const avaliacoesFormatadas =
                (resultados || []).map(item => ({

                    ...item,

                    data_avaliacao: item.data_avaliacao
                        ? new Date(item.data_avaliacao).toLocaleString(
                            "pt-BR",
                            {
                                day: "2-digit",
                                month: "2-digit",
                                year: "numeric",
                                hour: "2-digit",
                                minute: "2-digit"
                            }
                        )
                        : null

                }));


            return res.json({
                sucesso: true,
                avaliacoes: avaliacoesFormatadas
            });

        });
    }

};

module.exports = UsuarioController;