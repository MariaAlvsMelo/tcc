// Reduz as fotos de perfil já salvas (base64 grande) para 256x256 JPEG (~20 KB).
//   node reduzir-fotos.js            -> só mostra o que mudaria (não grava nada)
//   node reduzir-fotos.js --aplicar  -> grava as fotos reduzidas
// Antes: npm i @supabase/supabase-js sharp
// Variáveis: SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY (chave de serviço, só no seu computador)
const { createClient } = require("@supabase/supabase-js");
const sharp = require("sharp");

const TABELA = "usuarios";        // confirme o nome da tabela
const COLUNA_ID = "id_usuario";
const COLUNA_FOTO = "foto_perfil";
const LIMITE = 40000;             // só mexe em fotos maiores que ~40 KB (em caracteres)
const aplicar = process.argv.includes("--aplicar");

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

(async () => {
    const { data: lista, error } = await supabase.from(TABELA).select(COLUNA_ID);
    if (error) throw error;

    let antes = 0, depois = 0, alteradas = 0;

    for (const { [COLUNA_ID]: id } of lista) {
        // uma linha por vez: evita baixar tudo de uma vez
        const { data, error: erroLinha } = await supabase.from(TABELA).select(COLUNA_FOTO).eq(COLUNA_ID, id).single();
        if (erroLinha) { console.log(`#${id}: erro ao ler (${erroLinha.message})`); continue; }

        const foto = data?.[COLUNA_FOTO];
        if (typeof foto !== "string" || !foto.startsWith("data:image/") || foto.length <= LIMITE) continue;

        try {
            const bruto = Buffer.from(foto.split(",")[1], "base64");
            const nova = "data:image/jpeg;base64," + (await sharp(bruto)
                .rotate()
                .resize(256, 256, { fit: "cover" })
                .flatten({ background: "#ffffff" })
                .jpeg({ quality: 82 })
                .toBuffer()).toString("base64");

            antes += foto.length; depois += nova.length; alteradas++;
            console.log(`#${id}: ${Math.round(foto.length / 1024)} KB -> ${Math.round(nova.length / 1024)} KB`);

            if (aplicar) {
                const { error: erroUpdate } = await supabase.from(TABELA).update({ [COLUNA_FOTO]: nova }).eq(COLUNA_ID, id);
                if (erroUpdate) console.log(`#${id}: erro ao gravar (${erroUpdate.message})`);
            }
        } catch (e) {
            console.log(`#${id}: imagem ignorada (${e.message})`);
        }
    }

    console.log(`\n${alteradas} foto(s) | ${Math.round(antes / 1024)} KB -> ${Math.round(depois / 1024)} KB | ${aplicar ? "GRAVADO" : "simulação (use --aplicar para gravar)"}`);
})().catch(e => { console.error(e); process.exit(1); });