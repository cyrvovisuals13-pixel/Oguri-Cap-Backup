export default {
    name: "sswa",
    aliases: ["ssweb"],
    type: 'owner',
    desc: "Screenshot Oguri Session (Owner Only)",
    execute: async ({ m, oguri }) => {
        // --- SATPAM UTAMA ---
        if (!m.isOwner) return 

        try {
            m.reply('Sedang mengambil screenshot, tunggu sebentar...')
            let media = await oguri.screenshot() // Tergantung fungsi di base kamu
            await oguri.sendFile(m.from, media, { quoted: m, caption: "Ini tampilan WhatsApp Oguri sekarang." })
        } catch (e) {
            m.reply(`[ OGURI ERROR ]\nGagal mengambil screenshot. Pastikan fitur ini didukung oleh base kamu.`)
        }
    },
    isOwner: true
}

