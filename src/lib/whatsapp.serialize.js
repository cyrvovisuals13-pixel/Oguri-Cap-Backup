import config from "../../config.js"
import { jidDecode, downloadContentFromMessage, getContentType } from '@whiskeysockets/baileys'
import fs from "fs"
import { join } from "path"

const serialize = async (oguri, m) => {
    if (!m) return m
    if (m.key) {
        m.id = m.key.id
        m.from = m.key.remoteJid
        m.fromMe = m.key.fromMe
        m.isGroup = m.from.endsWith('@g.us')
        m.sender = jidDecode(m.fromMe ? oguri.user.id : m.key.participant || m.key.remoteJid || '')?.user + '@s.whatsapp.net'
        
        // Fitur Spesial Oguri
        m.isOwner = m.sender && [...config.options.owner].includes(m.sender.replace(/\D+/g, ""))
        m.isPremium = (m.sender && global.db.users[m.sender]?.premium) || m.isOwner || false
        m.isVIP = (m.sender && global.db.users[m.sender]?.VIP) || m.isOwner || false
    }

    if (m.message) {
        m.mtype = getContentType(m.message)
        m.msg = (m.mtype === 'viewOnceMessageV2') ? m.message[m.mtype].message[getContentType(m.message[m.mtype].message)] : m.message[m.mtype]
        
        // Pengganti m._data.body atau m.body di Oguri lama
        m.body = m.message.conversation || m.msg?.caption || m.msg?.text || (m.mtype == 'listResponseMessage' ? m.msg?.singleSelectReply?.selectedRowId : '') || (m.mtype == 'buttonsResponseMessage' ? m.msg?.selectedButtonId : '') || ''
        
        m.arg = m.body.trim().split(/ +/) || []
        m.args = m.body.trim().split(/ +/).slice(1) || []
        m.text = m.args.join(" ")
        
        m.isMedia = !!m.msg?.mimetype || !!m.msg?.thumbnailDirectPath
        m.mime = m.msg?.mimetype
    }

    // --- REPLACEMENT FUNCTIONS (Agar Command Tidak Error) ---
    
    // Ganti m.reply lama
    m.reply = async (content, options = {}) => {
        let text = (typeof content === 'string') ? content : JSON.stringify(content)
        if (config.msg[text]) text = config.msg[text] // Ambil dari config.msg kalau ada
        return oguri.sendMessage(options.from || m.from, { text: text, mentions: options.mentions || [] }, { quoted: m })
    }

    // Ganti m.downloadMedia lama
    m.downloadMedia = async () => {
        if (!m.isMedia) return
        const type = m.mtype.replace('Message', '')
        const stream = await downloadContentFromMessage(m.msg, type)
        let buffer = Buffer.from([])
        for await (const chunk of stream) {
            buffer = Buffer.concat([buffer, chunk])
        }
        return buffer
    }

    // Simulasi group metadata biar m.isAdmin dll nggak error
    if (m.isGroup) {
        const groupMetadata = await oguri.groupMetadata(m.from)
        m.metadata = groupMetadata
        m.groupAdmins = groupMetadata.participants.filter(p => p.admin || p.superadmin)
        m.isAdmin = !!m.groupAdmins.find(p => p.id === m.sender)
        m.isBotAdmin = !!m.groupAdmins.find(p => p.id === (jidDecode(oguri.user.id).user + '@s.whatsapp.net'))
    }

    return m
}

// Supaya starter oguri.js tidak error saat import { Client }
class Client { } 

export { Client, serialize }

