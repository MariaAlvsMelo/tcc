
const path = require("path");
const { createClient } = require("@supabase/supabase-js");

// Carrega o .env que está dentro da pasta backend.
require("dotenv").config({
    path: path.resolve(__dirname, ".env")
});

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
    throw new Error(
        "Credenciais do Supabase não configuradas. Confira backend/.env."
    );
}

const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});

function criarClienteAutenticado(token) {
    return createClient(supabaseUrl, supabaseKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        },
        global: {
            headers: {
                Authorization: `Bearer ${token}`
            }
        }
    });
}

module.exports = {
    supabase,
    criarClienteAutenticado
};
