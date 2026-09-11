const conexao = require("../database/conexao");

const usuarioModel = {

    // Cadastrar novo usuário
    cadastrar: (nome, email, senha, callback) => {

        const sql = `
            INSERT INTO usuario
            (nome_usuario, email, senha)
            VALUES (?, ?, ?)
        `;

        conexao.query(
            sql,
            [nome, email, senha],
            callback
        );
    },


    // Login de usuário
    login: (email, senha, callback) => {

        const sql = `
            SELECT id, nome_usuario, email, senha
            FROM usuario
            WHERE email = ?
            LIMIT 1
        `;

        conexao.query(
            sql,
            [email],
            callback
        );
    },


    // Salvar avaliação de música
    avaliar: (
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
                musica,
                artista,
                comentario,
                nota,
                capa_album,
                id_deezer,
                id_album
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
        `;


        conexao.query(
            sql,
            [
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


    // Listar todas as avaliações
    listarAvaliacoes: (callback) => {

        const sql = `
            SELECT
                id,
                musica,
                artista,
                comentario,
                nota,
                capa_album,
                id_deezer,
                id_album,
                data_avaliacao
            FROM avaliacoes
            ORDER BY data_avaliacao DESC
        `;

        conexao.query(
            sql,
            callback
        );
    }

};

module.exports = usuarioModel;