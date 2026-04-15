import config from '../../config.js'
import Func from '../lib/lib.function.js'
import fs from "fs"
import moment from "moment-timezone"
import path from "path"
import { format } from "util"
import chalk from "chalk"
import { fileURLToPath } from "url"

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export const Message = async (oguri, m) => {
    try {
        if (!m) return
        
        // 1. PENGOLAHAN PESAN
        m.body = m.body || m.text || (m.message?.conversation) || (m.message?.extendedTextMessage?.text) || "";
        
        // --- STRICT FILTER (Hanya respon jika prefix di KARAKTER PERTAMA) ---
        const prefixRegex = /^[°•π÷×¶∆£¢€¥®™+✓_=|~!?@#%^&.©^]/;
        const prefix = m.body.match(prefixRegex) ? m.body.match(prefixRegex)[0] : "";
        const isCmd = m.body.startsWith(prefix) && prefix !== "";

        // JIKA BUKAN PERINTAH ATAU TITIKNYA DI TENGAH, LANGSUNG STOP
        if (!isCmd) return 

        // 2. IDENTITAS & VARIABEL DARURAT
        m.from = m.key.remoteJid
        m.isGroup = m.from.endsWith('@g.us')
        m.sender = m.isGroup ? (m.key.participant || m.key.remoteJid) : m.key.remoteJid
        m.pushName = m.pushName || "User"
        m.args = m.body.trim().split(/ +/).slice(1)
        m.text = m.args.join(" ")
        m.cmd = m.body.slice(prefix.length).trim().split(/ +/).shift().toLowerCase()

        // 3. FUNGSI BALAS PESAN (DELAY 1 DETIK ANTI-BAN)
        m.reply = async (text) => {
            await new Promise(resolve => setTimeout(resolve, 1000))
            return oguri.sendMessage(m.from, { text: text, mentions: [m.sender] }, { quoted: m })
        }

        // 4. LOG COMMAND (Hanya muncul kalau lolos filter)
        console.log(chalk.black(chalk.bgWhite("- COMMAND")), chalk.green(m.pushName), chalk.yellow(m.cmd))

        const commands = global.commands
        const command = commands.get(m.cmd) || commands.find((v) => v.default.aliases && v.default.aliases.includes(m.cmd))
        const quoted = m?.hasQuotedMsg ? m.quoted : m

        // Load Database
        await (await import("../lib/whatsapp.database.js")).loadDatabase(m)

        // 5. PENGECEKAN SYARAT (FITUR LENGKAP KAMU)
        if (command && !m.isBot) {
            const cmdData = command.default

            // Filter Khusus Owner
            if (cmdData.isOwner && !m.isOwner) return m.reply("owner")
            
            // Filter Grup/Private
            if (cmdData.isGroup && !m.isGroup) return m.reply("group")
            if (cmdData.isPrivate && m.isGroup) return m.reply("private")
            
            // Filter Admin (Bot & User)
            if (cmdData.isBotAdmin && !m.isBotAdmin) return m.reply("botAdmin")
            if (cmdData.isAdmin && !m.isAdmin) return m.reply("admin")
            
            // Filter Media
            if (cmdData.isMedia && !quoted.mime) {
                if (typeof cmdData.isMedia === 'object') {
                    if (cmdData.isMedia.Image && !/image/i.test(quoted.mime)) return m.reply('Reply Gambar...')
                    if (cmdData.isMedia.Video && !/video/i.test(quoted.mime)) return m.reply('Reply Video...')
                    if (cmdData.isMedia.Sticker && !/webp/i.test(quoted.mime)) return m.reply('Reply Sticker...')
                } else {
                    return m.reply("media")
                }
            }

            // Filter Quoted & Premium
            if (cmdData.isQuoted && !m.hasQuotedMsg) return m.reply("quoted")
            if (cmdData.isPremium && !m.isPremium) return m.reply("premium")
            if (cmdData.isVIP && !m.isVIP) return m.reply("vip")

            // Filter Contoh Penggunaan
            if (cmdData.example && !m.text) {
                return m.reply(cmdData.example.replace(/%prefix/gi, prefix).replace(/%command/gi, cmdData.name))
            }

            // --- EKSEKUSI ---
            try {
                await cmdData.execute({
                    	 oguri,
			 m,
			 command: m.cmd, quoted, prefix, commands, config, Func
                })
            } catch (err) {
                let text = format(err)
                console.error(err)
                m.reply(`*Error Command*\n\n*- Name :* ${cmdData.name}\n*- Log :*\n${text}`)
            }
        }

        // 6. FUNGSI OTOMATIS (Folder Function)
        if (!command && !m.isBot) {
            const dir = path.join(__dirname, '..', config.options.pathCommand, 'function')
            if (fs.existsSync(dir)) {
                const files = fs.readdirSync(dir).filter(file => file.endsWith('.js'))
                for (const file of files) {
                    const load = await import(Func.__filename(path.join(dir, file)))
                    load.default({ oguri, m, quoted, prefix, commands, command: m.cmd, config })
                }
            }
        }

    } catch (e) {
        console.error(e)
        if (m.reply) m.reply(`*SYSTEM ERROR*\nLog: ${e.message}`)
    }
}

// FUNGSI LOAD SEMUA COMMAND
export const readCommands = async (pathname = config.options.pathCommand) => {
    try {
        const dir = path.join(__dirname, "..", pathname)
        const dirs = fs.readdirSync(dir)
        dirs.filter(a => a !== "function").map(async (res) => {
            let files = fs.readdirSync(`${dir}/${res}`).filter((file) => file.endsWith(".js"))
            for (const file of files) {
                const command = await import(`../${pathname}/${res}/${file}?update=${Date.now()}`)
                if (command.default?.name) {
                    global.commands.set(command.default.name, command)
                }
            }
        })
    } catch (e) {
        console.error(e)
    }
}

// AUTO RELOAD
let fileP = fileURLToPath(import.meta.url)
fs.watchFile(fileP, () => {
    fs.unwatchFile(fileP)
    console.log(chalk.blueBright(`[ UPDATE ] File "${fileP}" Updated.`))
    import(`${import.meta.url}?update=${Date.now()}`)
})

