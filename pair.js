const PastebinAPI = require('pastebin-js');
const pastebin = new PastebinAPI('EMWTMkQAVfJa9kM-MRUrxd5Oku1U7pgL');
const { makeid } = require('./id');
const express = require('express');
const fs = require('fs');
const router = express.Router();
const pino = require("pino");
const {
    default: Uranium,
    useMultiFileAuthState,
    delay,
    makeCacheableSignalKeyStore,
    Browsers
} = require("maher-zubair-baileys");

function removeFile(FilePath) {
    if (!fs.existsSync(FilePath)) return false;
    fs.rmSync(FilePath, { recursive: true, force: true });
};

router.get('/', async (req, res) => {
    const sessionId = makeid();
    let phoneNumber = req.query.number;
    
    async function uraniumPairCode() {
        const { state, saveCreds } = await useMultiFileAuthState(`./temp/${sessionId}`);
        
        try {
            let uraniumBot = Uranium({
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, pino({ level: "fatal" }).child({ level: "fatal" })),
                },
                printQRInTerminal: false,
                logger: pino({ level: "fatal" }).child({ level: "fatal" }),
                browser: ["Uranium (Linux)", "", ""],
                syncFullHistory: false,
                getMessage: async () => {}
            });

            if (!uraniumBot.authState.creds.registered) {
                await delay(1500);
                phoneNumber = phoneNumber.replace(/[^0-9]/g, '');
                const code = await uraniumBot.requestPairingCode(phoneNumber);
                
                if (!res.headersSent) {
                    await res.send({ code });
                }
            }

            uraniumBot.ev.on('creds.update', saveCreds);
            uraniumBot.ev.on("connection.update", async (update) => {
                const { connection, lastDisconnect } = update;
                
                if (connection === "open") {
                    await delay(5000);
                    let data = fs.readFileSync(__dirname + `/temp/${sessionId}/creds.json`);
                    await delay(800);
                    let b64data = Buffer.from(data).toString('base64');
                    
                    let sessionMessage = await uraniumBot.sendMessage(
                        uraniumBot.user.id, 
                        { text: `Session Credentials (Base64):` }
                    );

                    const successMessage = `
*⚡ Pairing Successful with Uranium ✨*
*Crafted with ❤️ by Ilyass ☕*
______________________________________
╔════════════════════════╗
║  『 URANIUM DEPLOYMENT SUCCESS 』
║ • You've completed the first step!
║ • Bot is now ready for action
╚════════════════════════╝
╔════════════════════════╗
║  『 SUPPORT INFORMATION 』
║❒ *Developer:* Ilyass ☕
║❒ *Contact:* https://wa.me/2348075952205
║❒ *YouTube:* https://www.youtube.com/@BTSMODZ
║❒ *GitHub:* https://github.com/Fearless-tech1
║❒ *Community:* https://chat.whatsapp.com/C3GFThC0tIpGaJY9DFUeCK
║❒ *Channel:* https://whatsapp.com/channel/0029VahusSh0QeaoFzHJCk2x
╚════════════════════════╝
_____________________________________
_Remember to star our GitHub repository!_`;

                    await uraniumBot.sendMessage(
                        uraniumBot.user.id,
                        { text: successMessage },
                        { quoted: sessionMessage }
                    );

                    await delay(100);
                    await uraniumBot.ws.close();
                    return removeFile(`./temp/${sessionId}`);
                } 
                else if (connection === "close" && lastDisconnect?.error?.output?.statusCode !== 401) {
                    console.log("Reconnecting...");
                    await delay(10000);
                    uraniumPairCode();
                }
            });
        } 
        catch (error) {
            console.error("Pairing error:", error.message);
            await removeFile(`./temp/${sessionId}`);
            
            if (!res.headersSent) {
                await res.status(503).send({ code: "Service Unavailable" });
            }
        }
    }
    
    return uraniumPairCode();
});

module.exports = router;
