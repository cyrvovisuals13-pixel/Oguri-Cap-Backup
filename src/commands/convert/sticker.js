import sharp from "sharp"
import axios from "axios"

export default {
    name: "sticker",
    aliases: ["s", "stiker"],
    type: 'convert',
    desc: "Konversi media ke stiker dengan berbagai opsi.",
    execute: async ({ oguri, m, quoted, config, Func }) => {
        try {
            // 1. Ambil sumber media (bisa dari reply atau dari pesan itu sendiri)
            let q = m.quoted ? m.quoted : m
            let mime = (q.msg || q).mimetype || ''

            // 2. Jika ada media (Foto/Video/Stiker/Webp)
            if (/image|video|sticker|webp/.test(mime)) {
                // Beri respon awal agar user tahu bot bekerja
                m.reply("Tunggu sebentar, Oguri lagi buatin stikernya...")

                // Cek durasi jika itu video
                if (q?.duration > 10) return m.reply(`Durasi video terlalu panjang, maksimal 10 detik!`)

                // Download media ke buffer
                let download = await q.download()
                if (!download) return m.reply("Gagal mendownload media, coba kirim ulang fotonya.")

                let media, exif = {}
                let text = (m.text || "").toLowerCase()

                // --- LOGIKA EDITING ---
                if (text.endsWith("--circle")) {
                    media = await crop(download, "circle")
                } else if (text.endsWith("--round")) {
                    media = await crop(download, "rounded")
                } else if (text.endsWith("--gray")) {
                    media = await processImage(download, "grayscale")
                } else if (text.endsWith("--negate")) {
                    media = await processImage(download, "negate")
                } else if (text.endsWith("--pixel")) {
                    media = await processImage(download, "pixelate")
                } else if (text.endsWith("--flip")) {
                    media = await rotate(download, "flip")
                } else if (text.endsWith("--flop")) {
                    media = await rotate(download, "flop")
                } else if (text.endsWith("--nobg")) {
                    // Pastikan Func tersedia untuk removeBG
                    if (Func) {
                        media = await removeBG(download, Func)
                    } else {
                        media = download
                    }
                } else if (/rotate=/i.test(text)) {
                    let deg = text.split`rotate=`[1]
                    if (isNaN(deg)) return m.reply(`Format salah, gunakan angka. Contoh: .s rotate=90`)
                    exif = { packName: config.Exif.packName }
                    media = await rotate(download, Number(deg))
                } else {
                    // Stiker standar tanpa opsi tambahan
                    let [packname, author] = m.text.split`|`
                    exif = { 
                        packName: packname ? packname : config.Exif.packName, 
                        packPublish: author ? author : config.Exif.packPublish 
                    }
                    media = download
                }

                // Kirim hasil akhir sebagai stiker
                await oguri.sendMessage(m.from, media, { asSticker: true, quoted: m, ...exif })

            } 
            // 3. Jika user mention orang (buat stiker dari foto profil)
            else if (m.mentions && m.mentions.length > 0) {
                let url = await oguri.getProfilePicUrl(m.mentions[0]).catch(_ => 'https://telegra.ph/file/241d7180c0283ab40143d.jpg')
                await oguri.sendMessage(m.from, url, { asSticker: true, quoted: m, packName: config.Exif.packName, packPublish: config.Exif.packPublish })
            } 
            // 4. Jika user kirim link gambar/video
            else if (/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm))/i.test(m.text)) {
                let url = m.text.match(/(https?:\/\/.*\.(?:png|jpg|jpeg|webp|mov|mp4|webm))/i)[0]
                await oguri.sendMessage(m.from, url, { quoted: m, asSticker: true, packName: config.Exif.packName, packPublish: config.Exif.packPublish })
            } 
            // 5. Jika tidak ada apa-apa
            else {
                m.reply(`Kirim atau reply foto/video dengan caption *.sticker*`)
            }

        } catch (e) {
            console.error("Sticker Error:", e)
            m.reply(`Error sistem: ${e.message}`)
        }
    }
}

// --- FUNGSI TOOLS (TARUH DI BAWAH) ---

function crop(input, type = 'circle') {
    return new Promise(async (resolve, reject) => {
        sharp(input)
            .toFormat('webp')
            .resize(512, 512)
            .composite([{
                input: Buffer.from(`<svg height="512" width="512"><${type == 'circle' ? 'circle cx="256" cy="256" r="256"' : 'rect x="0" y="0" width="512" height="512" rx="100" ry="100"'} fill="#000"/></svg>`),
                blend: 'dest-in'
            }])
            .toBuffer()
            .then(resolve)
            .catch(reject)
    })
}

async function processImage(input, type = "pixelate") {
    if (type == "pixelate") input = await sharp(input).resize(30, null, { kernel: 'nearest' }).toBuffer()
    return new Promise(async (resolve, reject) => {
        sharp(input)
            .negate(type === 'negate')
            .greyscale(type === "grayscale")
            .resize(512, 512, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
            .toFormat("webp")
            .toBuffer()
            .then(resolve)
            .catch(reject)
    })
}

function rotate(input, type = "flip") {
    return new Promise(async (resolve, reject) => {
        let s = sharp(input)
        if (type == "flip") s.flip()
        else if (type == "flop") s.flop()
        else s.rotate(parseInt(type))
        s.toFormat('webp').toBuffer().then(resolve).catch(reject)
    })
}

async function removeBG(buffer, Func) {
    try {
        let file = await Func.getFile(buffer)
        const { data } = await axios.post(`https://bgremover.zyro.com/v1/ai/background-remover`, { 
            "image_data": `data:image/jpeg;base64,${file.data.toString("base64")}` 
        })
        return Buffer.from(data.result.split`,`[1], "base64")
    } catch (e) {
        throw new Error("API Gagal menghapus background")
    }
}

