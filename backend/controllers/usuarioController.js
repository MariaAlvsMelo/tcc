const usuarioModel =
    require("../models/usuarioModel");


const UsuarioController = {

    // =====================================================
// ADICIONADO — LISTAR AVALIAÇÕES DO USUÁRIO
// =====================================================

listarAvaliacoesUsuario: (req, res) => {

    const id_usuario =
        req.params.id;


    if (!id_usuario) {

        return res.status(400).json({

            sucesso: false,

            mensagem:
                "Usuário não informado."

        });

    }


    usuarioModel.listarAvaliacoesUsuario(
        id_usuario,

        (erro, resultados) => {

            if (erro) {

                console.error(
                    "Erro ao listar avaliações do usuário:",
                    erro
                );

                return res.status(500).json({

                    sucesso: false,

                    mensagem:
                        "Erro interno ao carregar avaliações."

                });

            }


            const avaliacoesFormatadas =
                (resultados || []).map(
                    item => ({

                        ...item,

                        data_avaliacao:
                            item.data_avaliacao
                                ? new Date(
                                    item.data_avaliacao
                                ).toLocaleString(
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

                    })
                );


            return res.json({

                sucesso: true,

                avaliacoes:
                    avaliacoesFormatadas

            });

        }
    );
},
    
        // ==========================================
    // ===== ADICIONADO: CURTIR AVALIAÇÃO =====
    // ==========================================
    curtirAvaliacao: (req, res) => {

        const { id_usuario } = req.body;
        const { id } = req.params;

        if (!id_usuario || !id) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Usuário ou avaliação não informados."
            });
        }

        usuarioModel.curtirAvaliacao(
            id_usuario,
            id,
            (erro) => {

                if (erro) {

                    // ER_DUP_ENTRY = usuário já curtiu
                    if (erro.code === "ER_DUP_ENTRY") {

                        return res.status(400).json({
                            sucesso: false,
                            mensagem: "Você já curtiu esta avaliação."
                        });
                    }

                    console.error(
                        "Erro ao curtir avaliação:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Erro ao registrar curtida."
                    });
                }

                return res.status(201).json({
                    sucesso: true,
                    mensagem: "Avaliação curtida!"
                });
            }
        );
    },


    // ==========================================
    // ===== ADICIONADO: REMOVER CURTIDA =====
    // ==========================================
    removerCurtida: (req, res) => {

        const { id_usuario } = req.body;
        const { id } = req.params;

        if (!id_usuario || !id) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Usuário ou avaliação não informados."
            });
        }

        usuarioModel.removerCurtida(
            id_usuario,
            id,
            (erro) => {

                if (erro) {

                    console.error(
                        "Erro ao remover curtida:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Erro ao remover curtida."
                    });
                }

                return res.json({
                    sucesso: true,
                    mensagem: "Curtida removida!"
                });
            }
        );
    },


    // ==========================================
    // ===== ADICIONADO: VERIFICAR CURTIDA =====
    // ==========================================
    verificarCurtida: (req, res) => {

        const { id_usuario } = req.query;
        const { id } = req.params;

        if (!id_usuario || !id) {
            return res.status(400).json({
                sucesso: false,
                mensagem: "Usuário ou avaliação não informados."
            });
        }

        usuarioModel.verificarCurtida(
            id_usuario,
            id,
            (erro, resultado) => {

                if (erro) {

                    console.error(
                        "Erro ao verificar curtida:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem: "Erro ao verificar curtida."
                    });
                }

                return res.json({
                    sucesso: true,
                    curtiu: resultado.length > 0
                });
            }
        );
    },
    // =========================================================
    // MANTIDO:
    // CADASTRAR
    // =========================================================

    cadastrar: (
        req,
        res
    ) => {

        const {
            nome,
            email,
            senha
        } = req.body;


        if (
            !nome ||
            !email ||
            !senha
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Preencha todos os campos!"
            });
        }


        usuarioModel.cadastrar(
            nome,
            email,
            senha,

            (erro) => {

                if (erro) {

                    console.error(
                        "Erro ao cadastrar usuário:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno ao cadastrar usuário."
                    });
                }


                return res.status(201).json({
                    sucesso: true,
                    mensagem:
                        "Usuário cadastrado com sucesso!"
                });

            }
        );
    },


    // =========================================================
    // MODIFICADO:
    // LOGIN
    // =========================================================

    login: (
        req,
        res
    ) => {

        const {
            email,
            senha
        } = req.body;


        if (
            !email ||
            !senha
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Preencha todos os campos!"
            });
        }


        usuarioModel.login(
            email,
            senha,

            (
                erro,
                resultado
            ) => {

                if (erro) {

                    console.error(
                        "Erro no login:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno no servidor."
                    });
                }


                if (
                    !resultado ||
                    resultado.length === 0
                ) {

                    return res.status(401).json({
                        sucesso: false,
                        mensagem:
                            "E-mail ou senha incorretos."
                    });
                }


                return res.json({
                    sucesso: true,
                    mensagem:
                        "Login realizado com sucesso!",

                    usuario:
                        resultado[0]
                });

            }
        );
    },


    // =========================================================
    // ADICIONADO:
    // BUSCAR PERFIL
    // =========================================================

    buscarPerfil: (
        req,
        res
    ) => {

        const {
            id_usuario
        } = req.params;


        usuarioModel.buscarPerfil(
            id_usuario,

            (
                erro,
                resultado
            ) => {

                if (erro) {

                    console.error(
                        "Erro ao buscar perfil:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno ao carregar o perfil."
                    });
                }


                if (
                    !resultado ||
                    resultado.length === 0
                ) {

                    return res.status(404).json({
                        sucesso: false,
                        mensagem:
                            "Usuário não encontrado."
                    });
                }


                return res.json({
                    sucesso: true,
                    usuario:
                        resultado[0]
                });

            }
        );
    },


    // =========================================================
    // ADICIONADO:
    // ATUALIZAR PERFIL
    // =========================================================

    atualizarPerfil: (
        req,
        res
    ) => {

        const {
            id_usuario
        } = req.params;


        const {
            nome,
            email,
            senha,
            foto_perfil,
            biografia
        } = req.body;


        if (
            !nome ||
            !email
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Nome e e-mail são obrigatórios."
            });
        }


        usuarioModel.atualizarPerfil(

            id_usuario,

            nome.trim(),

            email.trim(),

            senha,

            foto_perfil || null,

            biografia
                ? biografia.trim()
                : null,

            (erro) => {

                if (erro) {

                    console.error(
                        "Erro ao atualizar perfil:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno ao atualizar o perfil."
                    });
                }


                return res.json({
                    sucesso: true,
                    mensagem:
                        "Perfil atualizado com sucesso!"
                });

            }
        );
    },


    // =========================================================
    // MODIFICADO:
    // SALVAR AVALIAÇÃO
    // =========================================================

    avaliar: (
        req,
        res
    ) => {

        const {
            id_usuario,
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album
        } = req.body;


        if (
            !id_usuario ||
            !musica ||
            !artista ||
            !comentario ||
            nota === undefined
        ) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Preencha todos os campos e faça login antes de avaliar!"
            });
        }


        usuarioModel.avaliar(

            id_usuario,
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
                        mensagem:
                            "Erro interno ao salvar avaliação."
                    });
                }


                return res.status(201).json({
                    sucesso: true,
                    mensagem:
                        "Avaliação salva com sucesso!"
                });

            }
        );
    },


    // =========================================================
    // MODIFICADO:
    // LISTAR AVALIAÇÕES
    // =========================================================

    listarAvaliacoes: (
        req,
        res
    ) => {

        usuarioModel.listarAvaliacoes(
            (
                erro,
                resultados
            ) => {

                if (erro) {

                    console.error(
                        "Erro ao listar avaliações:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno ao listar avaliações."
                    });
                }


                const avaliacoesFormatadas =
                    (resultados || []).map(
                        item => ({

                            ...item,

                            data_avaliacao:
                                item.data_avaliacao
                                    ? new Date(
                                        item.data_avaliacao
                                    ).toLocaleString(
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

                        })
                    );


                return res.json({
                    sucesso: true,
                    avaliacoes:
                        avaliacoesFormatadas
                });

            }
        );
    },


    // =========================================================
    // ADICIONADO:
    // AVALIAÇÕES DO PERFIL
    // =========================================================

   // =========================================================
// ADICIONADO/MODIFICADO:
// AVALIAÇÕES DO PERFIL
// =========================================================

// =========================================================
// ADICIONADO/MODIFICADO:
// AVALIAÇÕES DO PERFIL
// =========================================================

minhasAvaliacoes: (
    req,
    res
) => {

    const id_usuario = req.params.id_usuario;

    console.log("====================================");
    console.log("BUSCANDO AVALIAÇÕES DO USUÁRIO");
    console.log("ID RECEBIDO:", id_usuario);
    console.log("====================================");


    if (!id_usuario) {

        return res.status(400).json({
            sucesso: false,
            mensagem: "Usuário não informado."
        });

    }


    usuarioModel.listarAvaliacoesUsuario(
        id_usuario,

        (erro, resultados) => {

            // ===== ADICIONADO =====
            // Mostra o erro REAL do MySQL no terminal.
            if (erro) {

                console.error(
                    "===================================="
                );

                console.error(
                    "ERRO REAL DO MYSQL:"
                );

                console.error(erro);

                console.error(
                    "===================================="
                );


                return res.status(500).json({

                    sucesso: false,

                    mensagem:
                        "Erro interno ao carregar avaliações.",

                    // ===== ADICIONADO =====
                    // Apenas para descobrir o erro.
                    erro:
                        erro.message || String(erro)

                });

            }


            console.log(
                "AVALIAÇÕES ENCONTRADAS:",
                resultados
            );


            const avaliacoesFormatadas =
                (resultados || []).map(
                    item => ({

                        ...item,

                        data_avaliacao:
                            item.data_avaliacao
                                ? new Date(
                                    item.data_avaliacao
                                ).toLocaleString(
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

                    })
                );


            return res.json({

                sucesso: true,

                avaliacoes:
                    avaliacoesFormatadas

            });

        }
    );

},


    // =========================================================
    // ADICIONADO:
    // EXCLUIR AVALIAÇÃO
    // =========================================================

    excluirAvaliacao: (
        req,
        res
    ) => {

        const {
            id
        } = req.params;


        const {
            id_usuario
        } = req.body;


        if (!id_usuario) {

            return res.status(400).json({
                sucesso: false,
                mensagem:
                    "Usuário não identificado."
            });
        }


        usuarioModel.excluirAvaliacao(

            id,
            id_usuario,

            (
                erro,
                resultado
            ) => {

                if (erro) {

                    console.error(
                        "Erro ao excluir avaliação:",
                        erro
                    );

                    return res.status(500).json({
                        sucesso: false,
                        mensagem:
                            "Erro interno ao excluir avaliação."
                    });
                }


                if (
                    !resultado ||
                    resultado.affectedRows === 0
                ) {

                    return res.status(404).json({
                        sucesso: false,
                        mensagem:
                            "Avaliação não encontrada ou não pertence a este usuário."
                    });
                }


                return res.json({
                    sucesso: true,
                    mensagem:
                        "Avaliação excluída com sucesso!"
                });

            }
        );
    }


};


module.exports =
    UsuarioController;