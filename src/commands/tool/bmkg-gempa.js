import config from "../../../config.js"

export default {
    name: "gempa",
    aliases: ["infogempa", "bmkg"],
    type: 'tool',
    desc: "Mendapatkan informasi gempa terbaru dari BMKG",
    execute: async({ oguri, m, Func }) => {
        try {
            const response = await fetch(`https://bmkg-content-inatews.storage.googleapis.com/datagempa.json?t=${Date.now()}`)
            const a = await response.json()
            
            if (!a || !a.info) return m.reply("Gagal mengambil data dari BMKG.")

            let text = `
‼ *${a.info.instruction}*

📅 *Tanggal :* ${a.info.timesent}
📌 *Koordinat :* ${a.info.latitude} - ${a.info.longitude}
🌋 *Magnitudo :* ${a.info.magnitude}
🌊 *Kedalaman :* ${a.info.depth}
📍 *Area :* ${a.info.area}
📈 *Potensi :* ${a.info.potential}
📝 *Dirasakan :* ${a.info.felt}
            `.trim()

            // 1. Kirim titik lokasi gempa
            await oguri.sendMessage(m.from, { 
                location: { 
                    degreesLatitude: parseFloat(a.info.latitude), 
                    degreesLongitude: parseFloat(a.info.longitude) 
                } 
            })

            // 2. Kirim gambar peta guncangan (shakemap) beserta keterangannya
            await oguri.sendMessage(m.from, { 
                image: { url: "https://bmkg-content-inatews.storage.googleapis.com/" + a.info.shakemap }, 
                caption: text 
            }, { quoted: m })

        } catch (e) {
            console.error(e)
            m.reply("Terjadi kesalahan saat memproses data BMKG.")
        }
    }
}

