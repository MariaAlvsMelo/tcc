
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error('Credenciais do Supabase não configuradas.');
}

// Cliente público para operações de autenticação
const supabase = createClient(
    supabaseUrl,
    supabaseKey,
    {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    }
);

// Cliente que utiliza o token do usuário
// para respeitar as políticas RLS.
function criarClienteAutenticado(token) {
    return createClient(
        supabaseUrl,
        supabaseKey,
        {
            auth: {
                persistSession: false,
                autoRefreshToken: false
            },
            global: {
                headers: {
                    Authorization: `Bearer ${token}`
                }
            }
        }
    );
}

module.exports = {
    supabase,
    criarClienteAutenticado
};
