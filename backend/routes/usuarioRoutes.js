
const express = require("express");

const router = express.Router();

const usuarioController = require("../controllers/usuarioController");

// =====================================================
// CADASTRO E LOGIN
// =====================================================

router.post("/cadastro", usuarioController.cadastrar);

router.post("/login", usuarioController.login);

// =====================================================
// PERFIL
// =====================================================

// Buscar perfil privado do usuário.
router.get(
    "/perfil/:id_usuario",
    usuarioController.buscarPerfil
);

// Atualizar perfil.
router.put(
    "/perfil/:id_usuario",
    usuarioController.atualizarPerfil
);

// Buscar perfil público de outro usuário.
router.get(
    "/perfil-publico/:id_usuario",
    usuarioController.buscarPerfilPublico
);

// =====================================================
// AVALIAÇÕES
// =====================================================

// Criar avaliação.
router.post(
    "/avaliacoes",
    usuarioController.avaliar
);

// Listar todas as avaliações.
router.get(
    "/avaliacoes",
    usuarioController.listarAvaliacoes
);

// Listar avaliações de um usuário.
router.get(
    "/avaliacoes/usuario/:id_usuario",
    usuarioController.minhasAvaliacoes
);

// Excluir avaliação.
router.delete(
    "/avaliacoes/:id",
    usuarioController.excluirAvaliacao
);

// =====================================================
// CURTIDAS
// =====================================================

// Curtir avaliação.
router.post(
    "/avaliacoes/:id/curtir",
    usuarioController.curtirAvaliacao
);

// Remover curtida.
router.delete(
    "/avaliacoes/:id/curtir",
    usuarioController.removerCurtida
);

// Verificar se o usuário curtiu.
router.get(
    "/avaliacoes/:id/curtiu",
    usuarioController.verificarCurtida
);

// =====================================================
// EXPORTAÇÃO
// =====================================================

module.exports = router;
