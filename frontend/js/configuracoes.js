
/* =========================================================
   ENTRE NOTAS - CONFIGURAÇÕES
========================================================= */

const CHAVE_TEMA = "entreNotas_modoNoturno";
const CHAVE_METRICAS = "entreNotas_cookiesMetricas";

// =========================================================
// LER PREFERÊNCIAS SALVAS
// =========================================================

function modoNoturnoAtivo() {
    const salvo = localStorage.getItem(CHAVE_TEMA);

    // O visual original do Entre Notas é escuro.
    return salvo !== "false";
}

function metricasAtivas() {
    return localStorage.getItem(CHAVE_METRICAS) === "true";
}

// =========================================================
// APLICAR TEMA
// =========================================================

function aplicarTema(noturno) {
    document.body.classList.toggle(
        "tema-claro",
        !noturno
    );

    const toggle = document.getElementById(
        "toggleModoNoturno"
    );

    if (toggle) {
        toggle.checked = noturno;
    }
}

// =========================================================
// SALVAR TEMA
// =========================================================

function salvarTema(noturno) {
    localStorage.setItem(
        CHAVE_TEMA,
        String(noturno)
    );

    aplicarTema(noturno);
}

// =========================================================
// SALVAR PREFERÊNCIA DE MÉTRICAS
// =========================================================

function salvarMetricas(ativo) {
    localStorage.setItem(
        CHAVE_METRICAS,
        String(ativo)
    );

    atualizarStatusMetricas();
}

// =========================================================
// ATUALIZAR TELA DE COOKIES
// =========================================================

function atualizarStatusMetricas() {
    const toggle = document.getElementById(
        "toggleCookiesMetricas"
    );

    const status = document.getElementById(
        "statusCookiesMetricas"
    );

    const ativo = metricasAtivas();

    if (toggle) {
        toggle.checked = ativo;
    }

    if (status) {
        status.textContent = ativo
            ? "Ativado"
            : "Desativado";
    }
}

// =========================================================
// INICIALIZAR CONFIGURAÇÕES
// =========================================================

function iniciarConfiguracoes() {

    // Recuperar tema salvo.
    aplicarTema(modoNoturnoAtivo());

    // Recuperar preferência de cookies.
    atualizarStatusMetricas();

    // =====================================================
    // TOGGLE MODO NOTURNO
    // =====================================================

    const toggleTema = document.getElementById(
        "toggleModoNoturno"
    );

    if (toggleTema) {
        toggleTema.addEventListener(
            "change",
            function () {
                salvarTema(this.checked);
            }
        );
    }

    // =====================================================
    // TOGGLE COOKIES DE PROGRESSO E MÉTRICAS
    // =====================================================

    const toggleMetricas = document.getElementById(
        "toggleCookiesMetricas"
    );

    if (toggleMetricas) {
        toggleMetricas.addEventListener(
            "change",
            function () {
                salvarMetricas(this.checked);
            }
        );
    }

}

// =========================================================
// EXECUTAR EM TODAS AS PÁGINAS
// =========================================================

if (document.readyState === "loading") {
    document.addEventListener(
        "DOMContentLoaded",
        iniciarConfiguracoes
    );
} else {
    iniciarConfiguracoes();
}
