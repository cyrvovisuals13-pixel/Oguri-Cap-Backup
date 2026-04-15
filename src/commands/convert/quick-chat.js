import { UploadFileUgu } from "../../lib/lib.convert.js"
import fs from "fs"
import axios from "axios"


export default {
    name: "fakechat",
    aliases: ["fake-chat", "qc", "sqc"],
    type: 'convert',
    desc: "Convert text to sticker",
    execute: async({ oguri, m, quoted, prefix, command, Func }) => {
        let [a, b] = m.text.split`|`
        let media, reply
        if (quoted?.isMedia) {
            let fileName = await Func.getRandom(`${quoted?.mime?.split("/")[1]}`)
            let upload = await UploadFileUgu(await quoted.downloadMedia(fileName))
            media = { media: { url: upload?.url } }
            fs.unlinkSync(`./temp/${fileName}`)
        }
        if (b && m.quoted.sender) {
            reply = {
                name: await (await oguri.getContactById(m.quoted.sender)).pushname,
                text: (b == "q") ? quoted.body.replace(prefix+command, "") : b,
                chatId: 5,
                id: 5
            }
        }
        m.reply("wait")
        let jsonnya = {
            type: "quoted",
            format: "png",
            backgroundColor: "#1b1e23",
            messages: [
                {
                    avatar: true,
                    from: {
                        id: 8,
                        name: b ? await (await oguri.getContactById(m.sender)).pushname : await (await oguri.getContactById(quoted.sender)).pushname,
                        photo: {
                            url: b ? await oguri.getProfilePicUrl(m.sender).catch(() => 'https://i0.wp.com/telegra.ph/file/134ccbbd0dfc434a910ab.png') : await oguri.getProfilePicUrl(quoted.sender).catch(() => 'https://i0.wp.com/telegra.ph/file/134ccbbd0dfc434a910ab.png'),
                        }
                    },
                    ...media,
                    text: m.text ? a : quoted.body.replace(prefix+command, ""),
                    replyMessage: { ...reply },
                },
            ],
        }
        const post = await axios.post("https://bot.lyo.su/quote/generate",
        jsonnya,{
            headers: { "Content-Type": "application/json"},
        })
        let buffer = Buffer.from(post.data.result.image, "base64")
        oguri.sendMessage(m.from, buffer, { asSticker: true, quoted: m })
    }
}
