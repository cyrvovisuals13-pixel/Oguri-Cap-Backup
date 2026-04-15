import Func from "../../lib/lib.function.js" // Pastikan jalurnya benar

function toUpper(query) {
    const arr = query.split(" ")
    for (var i = 0; i < arr.length; i++) {
        arr[i] = arr[i].charAt(0).toUpperCase() + arr[i].slice(1)
    }
    return arr.join(" ")
}

export default {
    name: "menu",
    aliases: ["help", "list"],
    type: 'main',
    desc: "Menampilkan daftar perintah Oguri Cap",
    execute: async ({ oguri, m, prefix, command, commands }) => { // Gunakan 'oguri' huruf kecil
        try {
            if (m.args.length >= 1) {
                let data = []
                const nama = m.text.toLowerCase()
                const cmd = commands.get(nama) || commands.find((cmd) => cmd.default.aliases && cmd.default.aliases.includes(nama))
                
                if (!cmd) return m.reply("Perintah tidak ditemukan.")
                
                data.push(`*- Command :* ${cmd.default.name}`)
                if (cmd.default?.aliases) data.push(`*- Alias :* ${cmd.default.aliases.join(", ")}`)
                if (cmd.default?.desc) data.push(`*- Desc :* ${cmd.default.desc.replace(/%prefix/g, prefix).replace(/%command/g, cmd.default.name)}`)
                
                return m.reply(`*INFO PERINTAH :*\n\n${data.join("\n")}`)
            } else {
                let teks = `Hajimemashite @${m.sender.split("@")[0]}!\n\nOguri Cap siap membantu. Berikut adalah daftar perintah yang tersedia:\n\n`

                const list = {}
                commands.forEach((a) => {
                    if (!a.default?.type) return
                    if (!(a.default.type in list)) list[a.default.type] = []
                    list[a.default.type].push(a)
                })

                Object.entries(list).forEach(([type, commandList]) => {
                    teks += `┌──• *${toUpper(type)} Menu*\n`
                    teks += `│\n`
                    teks += commandList.map((a) => `│⎚ ${a.default.noPrefix ? a.default.name : prefix + a.default.name}`).join('\n')
                    teks += `\n│\n`
                    teks += `└───────⭓\n\n`
                })

                // Cara kirim gambar yang benar untuk Oguri Cap
                await oguri.sendMessage(m.from, {
                    image: { url: 'https://i.pinimg.com/736x/a0/c4/2d/a0c42d730933395915418f8e5698c5ed.jpg' },
                    caption: teks,
                    mentions: [m.sender]
                }, { quoted: m })
            }
        } catch (e) {
            console.error(e)
            m.reply(`Terjadi kesalahan pada menu: ${e.message}`)
        }
    }
}

