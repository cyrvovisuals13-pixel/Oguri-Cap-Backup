export default {
    name: "option",
    aliases: ["setting", "mode"],
    type: 'owner',
    desc: "Change Oguri Mode (Owner Only)",
    execute: async ({ m, config }) => {
        // --- SATPAM UTAMA ---
        if (!m.isOwner) return 

        if (config.options.public) {
            config.options.public = false
            m.reply("Mode: [ SELF ]\nSekarang hanya Owner yang bisa menggunakan bot.")
        } else {
            config.options.public = true
            m.reply("Mode: [ PUBLIC ]\nSekarang semua orang bisa menggunakan bot.")
        }
    },
    isOwner: true
}

