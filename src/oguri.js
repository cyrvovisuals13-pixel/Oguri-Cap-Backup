import fs from 'fs'
import path from 'path'
import readline from 'readline'
import pino from 'pino'
import { fileURLToPath } from "url"
import  Collection  from './lib/lib.collection.js' // Tambahkan ini biar raknya bisa dibuat
import config from '../config.js'
import { Message } from './event/event.message.js' 

// --- TAMBAHKAN SEMUA ALAT BAILEYS DI SINI ---
import makeWASocket, {
    useMultiFileAuthState, 
    fetchLatestBaileysVersion, 
    makeCacheableSignalKeyStore, 
    DisconnectReason 
} from '@whiskeysockets/baileys'
// ------------------------------

// --- [ TARUH DI SINI - DATABASE INITIALIZATION ] ---
let dbData = { users: {}, groups: {}, settings: {} }
if (fs.existsSync('./database.json')) {
    try {
        dbData = JSON.parse(fs.readFileSync('./database.json', 'utf-8'))
    } catch (e) {
        console.error("Database rusak, memulai dari awal.")
    }
} else {
    fs.writeFileSync('./database.json', JSON.stringify(dbData, null, 2))
}
global.db = dbData

global.commands = new Collection()

// Auto-save setiap 30 detik
setInterval(() => {
    fs.writeFileSync('./database.json', JSON.stringify(global.db, null, 2))
}, 30000)
// --------------------------------------------------


   // ... isi fungsi start kamu ...

    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const loadCommands = async () => {
    const commandFolder = path.join(__dirname, 'commands')
    const folders = fs.readdirSync(commandFolder)

        for (const folder of folders) {
            const files = fs.readdirSync(path.join(commandFolder, folder)).filter(file => file.endsWith('.js'))
        for (const file of files) {
            const command = await import(`./commands/${folder}/${file}`)
            global.commands.set(command.default.name, command)
        }
    }
    console.log(`>>> Berhasil Memuat ${global.commands.size} Perintah <<<`)
}

await loadCommands() // Panggil loader-nya


const rl = readline.createInterface({ input: process.stdin, output: process.stdout })
const question = (text) => new Promise((resolve) => rl.question(text, resolve))

async function start() {
    const { state, saveCreds } = await useMultiFileAuthState(`./${config.session.Path}`)
    const { version } = await fetchLatestBaileysVersion()

        const oguri = makeWASocket({
        version,
        logger: pino({ level: 'silent' }),
        printQRInTerminal: false,
        // --- BAGIAN AUTH DENGAN CACHE (STEP 3) ---
        auth: {
            creds: state.creds,
            keys: makeCacheableSignalKeyStore(state.keys, pino({ level: 'info' })),
        },
        // --- IDENTITAS (BROWSER) ---
        browser: ["Mac OS", "Chrome", "124.0.0.0"],
        
        // --- STABILIZER SOCKET (STEP 2) ---
        connectTimeoutMs: 60000,      // Tunggu koneksi sampai 60 detik
        defaultQueryTimeoutMs: 0,     // Jangan ada timeout untuk request
        keepAliveIntervalMs: 30000,   // Kirim sinyal "ping" tiap 30 detik biar gak DC
        markOnlineOnConnect: true     // Langsung status online pas nyambung
    })


    if (!oguri.authState.creds.registered) {
        console.log("\n[ CER0 PROJECT - LOGIN ]")
        const opsi = await question("Pilih metode login:\n1. QR Code\n2. Pairing Code\nPilihan: ")

        if (opsi === '2') {
            let phoneNumber = await question("Masukkan nomor WA Bot (contoh: 628123456789): ")
            phoneNumber = phoneNumber.replace(/[^0-9]/g, '')

            console.log("Menunggu koneksi stabil (6 detik)...")
            setTimeout(async () => {
                try {
                    let code = await oguri.requestPairingCode(phoneNumber)
                    code = code?.match(/.{1,4}/g)?.join("-") || code
                    console.log("\n" + "=".repeat(30))
                    console.log("KODE PAIRING ANDA: " + code)
                    console.log("=".repeat(30) + "\n")
                } catch (error) {
                    console.error("Gagal mendapatkan kode, coba restart.", error)
                }
            }, 6000) // Jeda lebih lama
        }
    }

    oguri.ev.on('connection.update', (update) => {
        const { connection, lastDisconnect } = update
        if (connection === 'close') {
            if (lastDisconnect.error?.output?.statusCode !== DisconnectReason.loggedOut) start()
        } else if (connection === 'open') {
            console.log('\n[ Oguri Cap Sudah Bangun ]')
        }
    })

oguri.ev.on('messages.upsert', async (chatUpdate) => {
    try {
        const m = chatUpdate.messages[0]
        if (!m.message) return
        await Message(oguri, m)
    } catch (err) {
        // Kalau error, bot cuma lapor di terminal tapi tetep hidup
        console.error("⚠️ Error di Handler:", err)
    }
})

    oguri.ev.on('creds.update', saveCreds)
    return oguri
    
}


start()
	
