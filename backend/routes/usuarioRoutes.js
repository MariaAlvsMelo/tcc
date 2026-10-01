const express = require("express");

const router =
    express.Router();


const usuarioController =
    require("../controllers/usuarioController");


// =========================================================
// MANTIDO:
// CADASTRO E LOGIN
// =========================================================

router.post(
    "/cadastro",
    usuarioController.cadastrar
);


router.post(
    "/login",
    usuarioController.login
);


// =========================================================
// ADICIONADO:
// PERFIL
// =========================================================

router.get(
    "/perfil/:id_usuario",
    usuarioController.buscarPerfil
);


router.put(
    "/perfil/:id_usuario",
    usuarioController.atualizarPerfil
);


// =========================================================
// AVALIAÇÕES
// =========================================================

router.post(
    "/avaliacoes",
    usuarioController.avaliar
);


router.get(
    "/avaliacoes",
    usuarioController.listarAvaliacoes
);


// =========================================================
// ADICIONADO:
// AVALIAÇÕES DO USUÁRIO
// =========================================================

router.get(
    "/avaliacoes/usuario/:id_usuario",
    usuarioController.minhasAvaliacoes
);


// =========================================================
// ADICIONADO:
// EXCLUIR AVALIAÇÃO
// =========================================================

router.delete(
    "/avaliacoes/:id",
    usuarioController.excluirAvaliacao
);

// ==========================================
// ===== ADICIONADO: CURTIDAS =====
// ==========================================

router.post(
    "/avaliacoes/:id/curtir",
    usuarioController.curtirAvaliacao
);

router.delete(
    "/avaliacoes/:id/curtir",
    usuarioController.removerCurtida
);

router.get(
    "/avaliacoes/:id/curtiu",
    usuarioController.verificarCurtida
);

// =====================================================
// ADICIONADO — Buscar avaliações de um usuário
// =====================================================

module.exports = router;