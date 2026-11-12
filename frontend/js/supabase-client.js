const SUPABASE_URL =
    "https://bmgtbnsknskeoaymbawo.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_A0hTbYe85C4X_jwajRP5SA_L2am9PKG";

const supabaseFrontend = window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_PUBLISHABLE_KEY
);