import { exec } from 'child_process'
import { format } from 'util'

export default {
    name: "$",
    aliases: ["exec"],
    type: 'owner',
    desc: "Oguri Terminal Command (Owner Only)",
    execute: async({ m }) => {
        // --- LAPIS KEAMANAN WAJIB ---
        if (!m.isOwner) return 

        try {
            // Menjalankan perintah terminal
            exec(m.text, async(err, stdout) => {
                // Kalau ada error di terminal (misal salah ketik command)
                if (err) return m.reply(`[ OGURI TERMINAL ERROR ]\n\n${format(err)}`)
                
                // Kalau ada hasil dari terminal, kirim balik ke WA
                if (stdout) return m.reply(format(stdout))
            })
        } catch (e) {
            // Kalau sistem scriptnya yang error
            m.reply(`[ OGURI SYSTEM ERROR ]\n\n${format(e)}`)
        }
    },
    isOwner: true,
    noPrefix: true
}

