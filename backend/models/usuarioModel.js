
const { supabase, criarClienteAutenticado } = require("../supabase");

// =====================================================
// CLIENTE E AUTENTICAÇÃO
// =====================================================

function obterCliente(token) {
    return token
        ? criarClienteAutenticado(token)
        : supabase;
}

async function obterIdUsuario(token) {
    if (!token) {
        throw new Error("Usuário não autenticado.");
    }

    const cliente = obterCliente(token);

    const { data: authData, error: authError } =
        await cliente.auth.getUser();

    if (authError || !authData.user) {
        throw new Error("Sessão inválida ou expirada.");
    }

    const { data: usuario, error } = await supabase
        .from("usuarios")
        .select("id_usuario")
        .eq("auth_user_id", authData.user.id)
        .single();

    if (error || !usuario) {
        throw new Error("Perfil do usuário não encontrado.");
    }

    return usuario.id_usuario;
}

// =====================================================
// BUSCAR PERFIL PÚBLICO
// =====================================================

async function buscarPerfilPublico(id_usuario) {
    const { data, error } = await supabase
        .from("usuarios")
        .select(`
            id_usuario,
            nome_usuario,
            foto_perfil,
            biografia
        `)
        .eq("id_usuario", id_usuario)
        .maybeSingle();

    if (error) throw error;

    return data;
}

// =====================================================
// LISTAR AVALIAÇÕES PÚBLICAS DE UM USUÁRIO
// =====================================================

async function listarAvaliacoesPublicas(id_usuario) {
    const { data, error } = await supabase
        .from("avaliacoes")
        .select(`
            id,
            id_usuario,
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album,
            preview,
            data_avaliacao,
            curtidas(count)
        `)
        .eq("id_usuario", id_usuario)
        .order("data_avaliacao", { ascending: false });

    if (error) throw error;

    return (data || []).map(avaliacao => ({
        ...avaliacao,
        total_curtidas: avaliacao.curtidas?.[0]?.count || 0
    }));
}

// =====================================================
// CADASTRAR USUÁRIO - SUPABASE AUTH
// =====================================================

async function cadastrar(nome, email, senha) {
    const emailNormalizado = String(email || "")
        .trim()
        .toLowerCase();

    const { data, error } = await supabase.auth.signUp({
        email: emailNormalizado,
        password: senha,
        options: {
            data: {
                nome_usuario: nome
            }
        }
    });

    if (error) {
        throw error;
    }

    return data;
}
// =====================================================
// LOGIN - SUPABASE AUTH
// =====================================================

async function login(email, senha) {
    const emailNormalizado = String(email || "")
        .trim()
        .toLowerCase();

    const { data, error } = await supabase.auth.signInWithPassword({
        email: emailNormalizado,
        password: senha
    });

    if (error) throw error;

    const cliente = criarClienteAutenticado(
        data.session.access_token
    );

    const { data: usuario, error: perfilError } = await cliente
        .from("usuarios")
        .select(`
            id_usuario,
            nome_usuario,
            foto_perfil,
            biografia
        `)
        .eq("auth_user_id", data.user.id)
        .single();

    if (perfilError) throw perfilError;

    return {
        ...usuario,
        email: data.user.email,
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token
    };
}

// =====================================================
// BUSCAR PERFIL DO USUÁRIO
// =====================================================

async function buscarPerfil(id_usuario, token) {
    const cliente = obterCliente(token);

    const { data: usuario, error } = await cliente
        .from("usuarios")
        .select(`
            id_usuario,
            nome_usuario,
            foto_perfil,
            biografia
        `)
        .eq("id_usuario", id_usuario)
        .single();

    if (error) throw error;

    const { data: authData } = await cliente.auth.getUser();

    return {
        ...usuario,
        email: authData?.user?.email || null
    };
}

// =====================================================
// ATUALIZAR PERFIL
// =====================================================

async function atualizarPerfil(
    id_usuario,
    nome,
    email,
    senha,
    foto_perfil,
    biografia,
    token
) {
    if (!token) {
        throw new Error("Usuário não autenticado.");
    }

    const cliente = obterCliente(token);

    // Verifica se a sessão pertence ao usuário solicitado.
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Você não pode alterar outro perfil.");
    }

    // Atualiza os dados do perfil no Supabase.
    const { data, error } = await cliente
        .from("usuarios")
        .update({
            nome_usuario: nome,
            foto_perfil,
            biografia
        })
        .eq("id_usuario", id_usuario)
        .select()
        .single();

    if (error) throw error;

    // Verifica o e-mail atual da conta.
    const { data: authData, error: authError } =
        await cliente.auth.getUser();

    if (authError || !authData.user) {
        throw new Error("Não foi possível verificar sua conta.");
    }

    const emailAtual = authData.user.email?.trim().toLowerCase();
    const novoEmail = email?.trim().toLowerCase();

    // Só tenta atualizar o e-mail se ele realmente mudou.
    if (novoEmail && novoEmail !== emailAtual) {
        throw new Error(
            "A alteração de e-mail precisa ser configurada separadamente."
        );
    }

    // A alteração de senha será configurada separadamente.
    if (senha && senha.trim() !== "") {
        throw new Error(
            "A alteração de senha precisa ser configurada separadamente."
        );
    }

    return data;
}

// =====================================================
// CRIAR AVALIAÇÃO
// =====================================================

async function avaliar(
    id_usuario,
    musica,
    artista,
    comentario,
    nota,
    capa_album,
    id_deezer,
    id_album,
    preview,
    token
) {
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Usuário não autorizado.");
    }

    const cliente = obterCliente(token);

    const { data, error } = await cliente
        .from("avaliacoes")
        .insert({
            id_usuario: idAutenticado,
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album,
            preview
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

// =====================================================
// LISTAR TODAS AS AVALIAÇÕES
// =====================================================

async function listarAvaliacoes() {
    const { data, error } = await supabase
        .from("avaliacoes")
        .select(`
            id,
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album,
            preview,
            data_avaliacao,
            id_usuario,
            usuarios (
                nome_usuario,
                foto_perfil
            ),
            curtidas(count)
        `)
        .order("data_avaliacao", { ascending: false });

    if (error) throw error;

    return (data || []).map(avaliacao => ({
        ...avaliacao,
        nome_usuario: avaliacao.usuarios?.nome_usuario || "Usuário",
        foto_perfil: avaliacao.usuarios?.foto_perfil || null,
        total_curtidas: avaliacao.curtidas?.[0]?.count || 0
    }));
}

// =====================================================
// EXCLUIR AVALIAÇÃO
// =====================================================

async function excluirAvaliacao(id, id_usuario, token) {
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Usuário não autorizado.");
    }

    const cliente = obterCliente(token);

    const { data, error } = await cliente
        .from("avaliacoes")
        .delete()
        .eq("id", id)
        .eq("id_usuario", idAutenticado)
        .select();

    if (error) throw error;

    return data;
}

// =====================================================
// CURTIR AVALIAÇÃO
// =====================================================

async function curtirAvaliacao(id_usuario, id_avaliacao, token) {
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Usuário não autorizado.");
    }

    const cliente = obterCliente(token);

    const { data, error } = await cliente
        .from("curtidas")
        .insert({
            id_usuario: idAutenticado,
            id_avaliacao
        })
        .select()
        .single();

    if (error) throw error;

    return data;
}

// =====================================================
// REMOVER CURTIDA
// =====================================================

async function removerCurtida(id_usuario, id_avaliacao, token) {
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Usuário não autorizado.");
    }

    const cliente = obterCliente(token);

    const { data, error } = await cliente
        .from("curtidas")
        .delete()
        .eq("id_usuario", idAutenticado)
        .eq("id_avaliacao", id_avaliacao)
        .select();

    if (error) throw error;

    return data;
}

// =====================================================
// VERIFICAR SE O USUÁRIO CURTIU
// =====================================================

async function verificarCurtida(id_usuario, id_avaliacao) {
    const { data, error } = await supabase
        .from("curtidas")
        .select("id_curtida")
        .eq("id_usuario", id_usuario)
        .eq("id_avaliacao", id_avaliacao)
        .maybeSingle();

    if (error) throw error;

    return data;
}

// =====================================================
// CONTAR CURTIDAS
// =====================================================

async function contarCurtidas(id_avaliacao) {
    const { count, error } = await supabase
        .from("curtidas")
        .select("*", {
            count: "exact",
            head: true
        })
        .eq("id_avaliacao", id_avaliacao);

    if (error) throw error;

    return count || 0;
}

// =====================================================
// LISTAR AVALIAÇÕES DO PRÓPRIO USUÁRIO
// =====================================================

async function listarAvaliacoesUsuario(id_usuario, token) {
    const idAutenticado = await obterIdUsuario(token);

    if (Number(idAutenticado) !== Number(id_usuario)) {
        throw new Error("Usuário não autorizado.");
    }

    const cliente = obterCliente(token);

    const { data, error } = await cliente
        .from("avaliacoes")
        .select(`
            id,
            musica,
            artista,
            comentario,
            nota,
            capa_album,
            id_deezer,
            id_album,
            preview,
            data_avaliacao,
            id_usuario,
            usuarios (
                nome_usuario
            ),
            curtidas(count)
        `)
        .eq("id_usuario", idAutenticado)
        .order("data_avaliacao", { ascending: false });

    if (error) throw error;

    return (data || []).map(avaliacao => ({
        ...avaliacao,
        nome_usuario: avaliacao.usuarios?.nome_usuario || "Usuário",
        total_curtidas: avaliacao.curtidas?.[0]?.count || 0
    }));
}

// =====================================================
// EXPORTAÇÕES
// =====================================================

module.exports = {
    buscarPerfilPublico,
    listarAvaliacoesPublicas,
    cadastrar,
    login,
    buscarPerfil,
    atualizarPerfil,
    avaliar,
    listarAvaliacoes,
    excluirAvaliacao,
    curtirAvaliacao,
    removerCurtida,
    verificarCurtida,
    contarCurtidas,
    listarAvaliacoesUsuario
};
