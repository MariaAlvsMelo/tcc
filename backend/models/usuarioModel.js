const conexao = require("../database/conexao");

const usuarioModel = {

    // =========================================================
    // MANTIDO:
    // CADASTRAR USUÁRIO
    // =========================================================

    cadastrar: (
        nome,
        email,
        senha,
        callback
    ) => {

        const sql = `
            INSERT INTO usuario
            (
                nome_usuario,
                email,
                senha
            )
            VALUES (?, ?, ?)
        `;

        conexao.query(
            sql,
            [
                nome,
                email,
                senha
            ],
            callback
        );
    },


    // =========================================================
    // MODIFICADO:
    // LOGIN
    //
    // Agora retorna também foto e biografia.
    // =========================================================

    login: (
        email,
        senha,
        callback
    ) => {

        const sql = `
            SELECT
                id_usuario,
                nome_usuario,
                email,
                foto_perfil,
                biografia
            FROM usuario
            WHERE email = ?
            AND senha = ?
            LIMIT 1
        `;

        conexao.query(
            sql,
            [
                email,
                senha
            ],
            callback
        );
    },


    // =========================================================
    // ADICIONADO:
    // BUSCAR PERFIL
    // =========================================================

    buscarPerfil: (
        id_usuario,
        callback
    ) => {

        const sql = `
            SELECT
                id_usuario,
                nome_usuario,
                email,
                foto_perfil,
                biografia
            FROM usuario
            WHERE id_usuario = ?
            LIMIT 1
        `;

        conexao.query(
            sql,
            [
                id_usuario
            ],
            callback
        );
    },


    // =========================================================
    // ADICIONADO:
    // ATUALIZAR PERFIL
    //
    // Se a senha estiver vazia, a senha antiga é mantida.
    // =========================================================

    atualizarPerfil: (
        id_usuario,
        nome,
        email,
        senha,
        foto_perfil,
        biografia,
        callback
    ) => {

        let sql;
        let valores;


        // =====================================================
        // MODIFICADO:
        // Se o usuário digitou uma nova senha, atualiza.
        // =====================================================

        if (
            senha &&
            senha.trim() !== ""
        ) {

            sql = `
                UPDATE usuario

                SET
                    nome_usuario = ?,
                    email = ?,
                    senha = ?,
                    foto_perfil = ?,
                    biografia = ?

                WHERE id_usuario = ?
            `;

            valores = [
                nome,
                email,
                senha,
                foto_perfil,
                biografia,
                id_usuario
            ];

        } else {

            // =================================================
            // MANTIDO/MODIFICADO:
            // Não altera a senha quando o campo estiver vazio.
            // =================================================

            sql = `
                UPDATE usuario

                SET
                    nome_usuario = ?,
                    email = ?,
                    foto_perfil = ?,
                    biografia = ?

                WHERE id_usuario = ?
            `;

            valores = [
                nome,
                email,
                foto_perfil,
                biografia,
                id_usuario
            ];
        }


        conexao.query(
            sql,
            valores,
            callback
        );
    },


    // =========================================================
    // MODIFICADO:
    // SALVAR AVALIAÇÃO
    //
    // Agora a avaliação recebe id_usuario.
    // =========================================================

    avaliar: (
        id_usuario,
        musica,
        artista,
        comentario,
        nota,
        capa_album,
        id_deezer,
        id_album,
        callback
    ) => {

        const sql = `
            INSERT INTO avaliacoes
            (
                id_usuario,
                musica,
                artista,
                comentario,
                nota,
                capa_album,
                id_deezer,
                id_album
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;

        conexao.query(
            sql,
            [
                id_usuario,
                musica,
                artista,
                comentario,
                nota,
                capa_album,
                id_deezer,
                id_album
            ],
            callback
        );
    },


    // =========================================================
    // MODIFICADO:
    // LISTAR AVALIAÇÕES
    //
    // O JOIN traz nome, e-mail e foto do autor.
    // =========================================================

    listarAvaliacoes: (
        callback
    ) => {

        const sql = `
            SELECT
                a.id,
                a.id_usuario,
                a.musica,
                a.artista,
                a.comentario,
                a.nota,
                a.capa_album,
                a.id_deezer,
                a.id_album,
                a.data_avaliacao,

                u.nome_usuario,
                u.email,
                u.foto_perfil

            FROM avaliacoes a

            LEFT JOIN usuario u
                ON a.id_usuario = u.id_usuario

            ORDER BY
                a.data_avaliacao DESC
        `;

        conexao.query(
            sql,
            callback
        );
    },


    // =========================================================
    // ADICIONADO:
    // AVALIAÇÕES DO USUÁRIO
    // =========================================================

       // ==========================================
    // ===== MODIFICADO: LISTAR AVALIAÇÕES =====
    // ==========================================
    listarAvaliacoes: (callback) => {

        const sql = `
            SELECT
                a.id,
                a.musica,
                a.artista,
                a.comentario,
                a.nota,
                a.capa_album,
                a.id_deezer,
                a.id_album,
                a.data_avaliacao,
                a.id_usuario,

                u.nome_usuario,
                u.email,
                u.foto_perfil,

                -- ===== ADICIONADO: quantidade de curtidas =====
                (
                    SELECT COUNT(*)
                    FROM curtidas c
                    WHERE c.id_avaliacao = a.id
                ) AS total_curtidas

            FROM avaliacoes a

            LEFT JOIN usuario u
                ON a.id_usuario = u.id_usuario

            ORDER BY a.data_avaliacao DESC
        `;

        conexao.query(sql, callback);
    },

    


    // =========================================================
    // ADICIONADO:
    // EXCLUIR AVALIAÇÃO
    // =========================================================

    excluirAvaliacao: (
        id,
        id_usuario,
        callback
    ) => {

        const sql = `
            DELETE FROM avaliacoes

            WHERE id = ?
            AND id_usuario = ?
        `;

        conexao.query(
            sql,
            [
                id,
                id_usuario
            ],
            callback
        );
    },

        // ==========================================
    // ===== ADICIONADO: CURTIR AVALIAÇÃO =====
    // ==========================================
    curtirAvaliacao: (id_usuario, id_avaliacao, callback) => {

        const sql = `
            INSERT INTO curtidas
            (id_usuario, id_avaliacao)
            VALUES (?, ?)
        `;

        conexao.query(
            sql,
            [id_usuario, id_avaliacao],
            callback
        );
    },


    // ==========================================
    // ===== ADICIONADO: REMOVER CURTIDA =====
    // ==========================================
    removerCurtida: (id_usuario, id_avaliacao, callback) => {

        const sql = `
            DELETE FROM curtidas
            WHERE id_usuario = ?
            AND id_avaliacao = ?
        `;

        conexao.query(
            sql,
            [id_usuario, id_avaliacao],
            callback
        );
    },


    // ==========================================
    // ===== ADICIONADO: VERIFICAR CURTIDA =====
    // ==========================================
    verificarCurtida: (id_usuario, id_avaliacao, callback) => {

        const sql = `
            SELECT id_curtida
            FROM curtidas
            WHERE id_usuario = ?
            AND id_avaliacao = ?
            LIMIT 1
        `;

        conexao.query(
            sql,
            [id_usuario, id_avaliacao],
            callback
        );
    },


    // ==========================================
    // ===== ADICIONADO: CONTAR CURTIDAS =====
    // ==========================================
    contarCurtidas: (id_avaliacao, callback) => {

        const sql = `
            SELECT COUNT(*) AS total
            FROM curtidas
            WHERE id_avaliacao = ?
        `;

        conexao.query(
            sql,
            [id_avaliacao],
            callback
        );
    },

    // =====================================================
// ADICIONADO — BUSCAR AVALIAÇÕES DO USUÁRIO
// =====================================================

    listarAvaliacoesUsuario: (
        id_usuario,
        callback
    ) => {

        const sql = `

            SELECT

                a.id,
                a.musica,
                a.artista,
                a.comentario,
                a.nota,

                a.capa_album,
                a.id_deezer,
                a.id_album,

                a.data_avaliacao,
                a.id_usuario,

                u.nome_usuario,
                u.email,
                u.foto_perfil

            FROM avaliacoes a

            INNER JOIN usuario u
                ON a.id_usuario = u.id_usuario

            WHERE a.id_usuario = ?

            ORDER BY
                a.data_avaliacao DESC

        `;


        conexao.query(
            sql,
            [id_usuario],
            callback
        );
    },
        

};




module.exports = usuarioModel;