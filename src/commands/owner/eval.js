import { format } from "util"

export default {
    name: ">",
    aliases: ["eval", ">>"],
    type: 'owner',
    desc: "Oguri System Command (Owner Only)",
    execute: async (opt) => {
        const { m, hisoka, config } = opt
        
        // --- LAPIS KEAMANAN 1: CEK NOMOR OWNER ---
        if (!m.isOwner) return 

        let evalCmd
        try {
            // Menjalankan kode JavaScript langsung dari chat
            evalCmd = /await/i.test(m.text) 
                ? eval("(async() => { " + m.text + " })()") 
                : eval(m.text)
        } catch (e) {
            // Kirim pesan error kalau kodenya salah
            return m.reply(`[ OGURI ERROR ]\n\n${format(e)}`)
        }

        // --- PROSES HASIL EVAL ---
        Promise.resolve(evalCmd)
            .then((res) => {
                // Balas dengan hasil eksekusi yang rapi
                m.reply(format(res))
            })
            .catch((err) => {
                // Balas kalau ada error di dalam Promise
                m.reply(`[ OGURI PROMISE ERROR ]\n\n${format(err)}`)
            })
    },
    isOwner: true, // Lapis keamanan 2 (tergantung handler)
    noPrefix: true
}

