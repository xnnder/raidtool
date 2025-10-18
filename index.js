// icsu-raidtool by thexender (OPENSOURCE)
// |- Special thanks to @ghsv5 for spammer-function(4)
// en This code is free to use and share, but modifying and redistributing it as your own work (plagiarism) is strictly prohibited. Good luck in using it.
// ru Этот код можно использовать и распространять бесплатно, но его изменение и распространение в качестве собственной работы (плагиат) строго запрещено. Удачи в использовании.
// Glory to ICSU! https://discord.gg/kfkKmQVsgV
// ===---===---===---===---===---===

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const { Client } = require('discord.js-selfbot-v13');
const WebSocket = require('ws');
const time = require('perf_hooks').performance;
const { v4: uuidv4 } = require("uuid");
const configPath = 'user-config.json';

process.on('unhandledRejection', () => {});
process.on('uncaughtException', () => {});
process.on('SIGTERM', () => process.exit(0));
process.on('SIGINT', () => process.exit(0));
let activeClients = [];

process.removeAllListeners('warning');
process.env.NODE_NO_WARNINGS = '1';

process.title = "ICSU-Raidtool v2.1.0"

const colors = {
    reset: "\x1b[0m",
    green: "\x1b[32;1m",
    yellow: "\x1b[33;1m",
    red: "\x1b[31;1m",
    cyan: "\x1b[36;1m",
    magenta: "\x1b[35;1m",
    blue: "\x1b[34;1m",
    gray: "\x1b[90m"
};

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false
});
const clientIntents = [
    'Guilds',
    'GuildMembers',
    'GuildMessages',
    'MessageContent'
];

const state = {
    tokens: [],
    validTokens: [],
    raidText: "",
    activityLog: "",
    rateLimit: {
        lastRequest: 0,
        delay: 1000
    },
    config: {
        maxThreads: 5,
        defaultDelay: 1000
    }
};

const statusConfigPath = 'statusConfig.json';
let statusConfig = {};
if (fs.existsSync(statusConfigPath)) {
    try {
        statusConfig = JSON.parse(fs.readFileSync(statusConfigPath, 'utf8'));
    } catch {
        statusConfig = {};
    }
}
function saveStatusConfig() {
    fs.writeFileSync(statusConfigPath, JSON.stringify(statusConfig, null, 2));
}

function stripAnsi(str) {
    return str.replace(/\x1b\[[0-9;]*m/g, '');
}

function centerText(text = '') {
    const termWidth = process.stdout.columns || 80;
    const visibleLength = stripAnsi(text).length;
    const padding = Math.floor((termWidth - visibleLength) / 2);
    return ' '.repeat(Math.max(0, padding)) + text;
}

function drawAsciiArt(ascii = '') {
    const lines = ascii.split('\n');
    const termWidth = process.stdout.columns || 80;

    const centered = lines.map(line => {
        const visibleLength = stripAnsi(line).length;
        const padding = Math.floor((termWidth - visibleLength) / 2);
        return ' '.repeat(Math.max(0, padding)) + line;
    }).join('\n');

    console.log(centered);
}
let userConfig = {
    menuColor: 'red',
    asciiArt: `
██▀███   ▄▄▄       ██▓▓█████▄ ▄▄▄█████▓ ▒█████   ▒█████   ██▓     
▓██ ▒ ██▒▒████▄    ▓██▒▒██▀ ██▌▓  ██▒ ▓▒▒██▒  ██▒▒██▒  ██▒▓██▒    
▓██ ░▄█ ▒▒██  ▀█▄  ▒██▒░██   █▌▒ ▓██░ ▒░▒██░  ██▒▒██░  ██▒▒██░    
▒██▀▀█▄  ░██▄▄▄▄██ ░██░░▓█▄   ▌░ ▓██▓ ░ ▒██   ██░▒██   ██░▒██░    
░██▓ ▒██▒ ▓█   ▓██▒░██░░▒████▓   ▒██▒ ░ ░ ████▓▒░░ ████▓▒░░██████▒
░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░▓   ▒▒▓  ▒   ▒ ░░   ░ ▒░▒░▒░ ░ ▒░▒░▒░ ░ ▒░▓  ░
  ░▒ ░ ▒░  ▒   ▒▒ ░ ▒ ░ ░ ▒  ▒     ░      ░ ▒ ▒░   ░ ▒ ▒░ ░ ░ ▒  ░
  ░░   ░   ░   ▒    ▒ ░ ░ ░  ░   ░      ░ ░ ░ ▒  ░ ░ ░ ▒    ░ ░   
   ░           ░  ░ ░     ░                 ░ ░      ░ ░      ░  ░`,
    asciiColor: 'red'
};

function loadUserConfig() {
    try {
        if (fs.existsSync(configPath)) {
            const savedConfig = JSON.parse(fs.readFileSync(configPath, 'utf8'));
            userConfig = { ...userConfig, ...savedConfig };
            log('+', 'Конфигурация пользователя загружена');
        }
    } catch (e) {
        log('-', `Ошибка при загрузке конфигурации: ${e.message}`);
    }
}

function saveUserConfig() {
    try {
        fs.writeFileSync(configPath, JSON.stringify(userConfig, null, 2));
        log('+', 'Конфигурация пользователя сохранена');
    } catch (e) {
        log('-', `Ошибка при сохранении конфигурации: ${e.message}`);
    }
}

loadUserConfig();

function getMenuColumns() {
    const color = colors[userConfig.menuColor] || colors.red;
    
    const leftColumn = [
        `${color}[01]${colors.reset} ServerInfo`,
        `${color}[02]${colors.reset} Leaver`,
        `${color}[03]${colors.reset} Scrapper`,
        `${color}[04]${colors.reset} Spammer`,
        `${color}[05]${colors.reset} CreateThreads`
    ];
    
    const rightColumn = [
        `${color}[06]${colors.reset} SpamThreads`,
        `${color}[07]${colors.reset} Status`,
        `${color}[08]${colors.reset} Verification`,
        `${color}[09]${colors.reset} VC Joiner`,
        `${color}[10]${colors.reset} Customization`
    ];
    
    return { leftColumn, rightColumn };
}

function drawMenuTwoColumns(leftItems, rightItems, gap = 5, totalWidth = process.stdout.columns || 80) {
    const maxLeftLen = Math.max(...leftItems.map(item => stripAnsi(item).length));
    const maxRightLen = Math.max(...rightItems.map(item => stripAnsi(item).length));

    const menuWidth = maxLeftLen + gap + maxRightLen;
    const paddingLeft = Math.floor((totalWidth - menuWidth) / 2);

    for (let i = 0; i < Math.max(leftItems.length, rightItems.length); i++) {
        const left = leftItems[i] || '';
        const right = rightItems[i] || '';

        const leftPadLength = maxLeftLen - stripAnsi(left).length;
        const rightPadLength = maxRightLen - stripAnsi(right).length;

        const leftPadded = left + ' '.repeat(leftPadLength);
        const rightPadded = right + ' '.repeat(rightPadLength);

        const line = ' '.repeat(paddingLeft) + leftPadded + ' '.repeat(gap) + rightPadded;
        console.log(line);
    }
}

function drawLine(char = '-', totalWidth = process.stdout.columns || 80) {
  console.log(char.repeat(totalWidth));
}

function drawMenu() {
    console.log(centerText(`${colors.gray}v 2.1.0 | ${colors.gray}https://discord.gg/kfkKmQVsgV`));
    console.log(centerText(`${colors.yellow}[i]${colors.reset} Токены: ${state.tokens.length} | ${colors.yellow}[i]${colors.reset} Валидные: ${state.validTokens.length}${colors.reset}`));
}

function log(status, message) {
    const timestamp = [`${new Date().toLocaleTimeString()}`];
    let color = colors.cyan;
    
    switch(status) {
        case '+': color = colors.green; break;
        case '~': color = colors.yellow; break;
        case '-': color = colors.red; break;
        case '#': color = colors.gray; break;
        case 'i': color = colors.yellow; break;
    }
    
    const logMessage = `${colors.gray}[${timestamp}] ${color}[${status}]${colors.reset} - ${message}`;
    console.log(logMessage);
    state.activityLog += `[${timestamp}] [${status}] - ${message}\n`;
    
    try {
        if (!fs.existsSync('logs')) fs.mkdirSync('logs');
        fs.appendFileSync('logs/activity.log', `[${timestamp}] [${status}] - ${message}\n`);
    } catch (e) {
        console.error(`${colors.red}[!] Ошибка лога: ${e.message}${colors.reset}`);
    }
}

async function validateTokens() {
    log('#', 'Запуск проверки токенов через selfbot API...');
    state.validTokens = [];
    const clients = [];
    const tokens = fs.readFileSync('./tokens.txt', 'utf8').split(/\r?\n/).filter(Boolean);

    for (const token of tokens) {
        try {
            const client = new Client({ checkUpdate: false });
            await client.login(token);
            const username = client.user.username;
            state.validTokens.push({ token, username });
            clients.push(client);
            log('+', `Токен ${token.slice(0, 12)}... валиден (User: ${username})`);
            if (statusConfig[username]) {
                const status = statusConfig[username];
                await client.user.setActivity(status.text, {
                    type: status.type,
                    url: status.url || undefined
                });
                log('i', `Статус восстановлен для @${username}: ${status.type} ${status.text}`);
            }
        } catch (e) {
            log('-', `Токен ${token.slice(0, 12)}... ошибка: ${e.message}`);
        }
    }
    log('+', `Готово! Валидных: ${state.validTokens.length}/${tokens.length}`);
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function ServerInfo() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    const guildId = await questionAsync("Введите ID сервера: ");

    let client = new Client({ checkUpdate: false });
    await client.login(state.validTokens[0].token);

    try {
        let guild = await client.guilds.fetch(guildId);
        await guild.members.fetch();

        let owner = await client.users.fetch(guild.ownerId);
        let members = guild.members.cache;
        let bots = members.filter(m => m.user.bot).size;

        console.log(">> Основная информация о сервере");
        console.log(`Название: ${guild.name}`);
        console.log(`ID: ${guild.id}`);
        console.log(`Владелец: ${owner.username} (ID: ${owner.id})`);
        console.log(`Всего участников: ${members.size}`);
        console.log(`Ботов: ${bots}`);
        console.log(`Создан: ${guild.createdAt.toLocaleString()}`);

        let input;
        do {
            console.log("\nВыберите, чтобы получить дополнительную информацию:");
            console.log("[1] Channels");
            console.log("[2] Roles");
            console.log("exit - выйти");
            input = (await questionAsync("Выбор: ")).trim().toLowerCase();

            if (input === "1") {
                console.log("\n>> Список каналов");
                guild.channels.cache.forEach(ch => {
                    console.log(`[${ch.type}] ${ch.name} (ID: ${ch.id})`);
                });
            } else if (input === "2") {
                console.log("\n>> Список ролей");
                const permissions_table = [
                    ['CREATE_INSTANT_INVITE', 0x0000000000000001],
                    ['KICK_MEMBERS', 0x0000000000000002],
                    ['BAN_MEMBERS', 0x0000000000000004],
                    ['ADMINISTRATOR', 0x0000000000000008],
                    ['MANAGE_CHANNELS', 0x0000000000000010],
                    ['MANAGE_GUILD', 0x0000000000000020],
                    ['ADD_REACTIONS', 0x0000000000000040],
                    ['VIEW_AUDIT_LOG', 0x0000000000000080],
                    ['PRIORITY_SPEAKER', 0x0000000000000100],
                    ['STREAM', 0x0000000000000200],
                    ['VIEW_CHANNEL', 0x0000000000000400],
                    ['SEND_MESSAGES', 0x0000000000000800],
                    ['SEND_TTS_MESSAGES', 0x0000000000001000],
                    ['MANAGE_MESSAGES', 0x0000000000002000],
                    ['EMBED_LINKS', 0x0000000000004000],
                    ['ATTACH_FILES', 0x0000000000008000],
                    ['READ_MESSAGE_HISTORY', 0x0000000000010000],
                    ['MENTION_EVERYONE', 0x0000000000020000],
                    ['USE_EXTERNAL_EMOJIS', 0x0000000000040000],
                    ['CONNECT', 0x0000000000100000],
                    ['SPEAK', 0x0000000000200000],
                    ['MUTE_MEMBERS', 0x0000000000400000],
                    ['DEAFEN_MEMBERS', 0x0000000000800000],
                    ['MOVE_MEMBERS', 0x0000000001000000],
                    ['USE_VAD', 0x0000000002000000],
                    ['CHANGE_NICKNAME', 0x0000000004000000],
                    ['MANAGE_NICKNAMES', 0x0000000008000000],
                    ['MANAGE_ROLES', 0x0000000010000000],
                    ['MANAGE_WEBHOOKS', 0x0000000020000000],
                    ['MANAGE_EMOJIS_AND_STICKERS', 0x0000000040000000],
                    ['USE_APPLICATION_COMMANDS', 0x0000000080000000],
                    ['REQUEST_TO_SPEAK', 0x0000000100000000],
                    ['MANAGE_EVENTS', 0x0000000200000000],
                    ['MANAGE_THREADS', 0x0000000400000000],
                    ['CREATE_PUBLIC_THREADS', 0x0000000800000000],
                    ['CREATE_PRIVATE_THREADS', 0x0000001000000000],
                    ['USE_EXTERNAL_STICKERS', 0x0000002000000000],
                    ['SEND_MESSAGES_IN_THREADS', 0x0000004000000000],
                    ['START_EMBEDDED_ACTIVITIES', 0x0000008000000000],
                    ['MODERATE_MEMBERS', 0x0000010000000000]
                ];

                guild.roles.cache.forEach(role => {
                    let perms = [];
                    permissions_table.forEach(([name, bit]) => {
                        if ((role.permissions.bitfield & BigInt(bit)) === BigInt(bit)) {
                            perms.push(name);
                        }
                    });
                    console.log(`${role.name} (ID: ${role.id}) => ${perms.length > 0 ? perms.join(", ") : "Нет особых прав"}`);
                });
            }

        } while (input !== "exit");

    } catch (e) {
        log('-', `Ошибка: ${e.message}`);
    }

    client.destroy();
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function leaver() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    const guildId = await questionAsync("Введите ID сервера: ");
    let delaySec = parseInt(await questionAsync("Задержка между аккаунтами (1-100 секунд): ")) || 1;
    delaySec = Math.min(Math.max(delaySec, 1), 100) * 1000;

    let successCount = 0;
    let failCount = 0;

    log('~', `Начинаем выход с сервера ${guildId}...`);

    for (const { token, username } of state.validTokens) {
        let client;
        
        try {
            client = new Client({ 
                checkUpdate: false,
                ws: {
                    properties: {
                        $os: "windows",
                        $browser: "chrome", 
                        $device: "desktop"
                    }
                }
            });

            const readyPromise = new Promise((resolve, reject) => {
                const timeout = setTimeout(() => {
                    reject(new Error("Ready timeout"));
                }, 5000);
                
                client.once("ready", () => {
                    clearTimeout(timeout);
                    resolve();
                });

                client.once("error", (error) => {
                    clearTimeout(timeout);
                    reject(error);
                });
            });

            await client.login(token);
            await readyPromise;

            let guild;
            try {
                guild = await client.guilds.fetch(guildId);
            } catch (fetchError) {
                log('-', `@${username}: сервер ${guildId} не найден или нет доступа`);
                failCount++;
                continue;
            }

            if (guild) {
                await guild.leave();
                log('+', `@${username} вышел с сервера "${guild.name}"`);
                successCount++;
            }

        } catch (e) {
            if (e.message === "Ready timeout") {
                log('-', `@${username}: таймаут подключения, пробуем выйти через API`);
                try {
                    await leaveGuildViaAPI(token, guildId, username);
                    successCount++;
                } catch (apiError) {
                    log('-', `@${username}: API выход также не удался - ${apiError.message}`);
                    failCount++;
                }
            } else {
                log('-', `@${username}: ошибка - ${e.message}`);
                failCount++;
            }
        } finally {
            if (client) {
                try {
                    client.destroy();
                } catch (destroyError) {
                }
            }
        }

        if (delaySec > 0) {
            await delay(delaySec);
        }
    }

    log('+', `Готово! Успешно: ${successCount}, Неудачно: ${failCount}`);
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function leaveGuildViaAPI(token, guildId, username) {
    try {
        const response = await fetch(`https://discord.com/api/v9/users/@me/guilds/${guildId}`, {
            method: "DELETE",
            headers: {
                "Authorization": token,
                "Content-Type": "application/json"
            }
        });

        if (response.status === 204 || response.status === 200) {
            log('+', `@${username} вышел с сервера через API`);
            return true;
        } else if (response.status === 404) {
            throw new Error("сервер не найден");
        } else if (response.status === 403) {
            throw new Error("нет доступа к серверу");
        } else {
            throw new Error(`HTTP ${response.status}`);
        }
    } catch (error) {
        throw new Error(`API: ${error.message}`);
    }
}

async function scrapper() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    const guildId = await questionAsync("Введите ID сервера: ");
    const guildDir = path.join('scrapped', guildId);
    if (!fs.existsSync(guildDir)) fs.mkdirSync(guildDir, { recursive: true });

    const userMentions = new Set();

    for (const { token, username } of state.validTokens) {
        try {
            const client = new Client({
                checkUpdate: false,
                intents: ["Guilds", "GuildMembers"]
            });

            await client.login(token);
            const guild = client.guilds.cache.get(guildId);

            if (guild) {
                log('~', `@${username} собирает участников с "${guild.name}"...`);
                const members = await guild.members.fetch();
                members.forEach(m => userMentions.add(`<@${m.user.id}>`));
            } else {
                log('-', `@${username} не нашёл сервер ${guildId}`);
            }

            client.destroy();
        } catch (e) {
            log('-', `Ошибка у @${username}: ${e.message}`);
        }
    }

    if (userMentions.size > 0) {
        const outPath = path.join(guildDir, 'users.txt');
        fs.writeFileSync(outPath, [...userMentions].join('\n'), 'utf8');
        log('+', `Сохранено ${userMentions.size} упоминаний → ${outPath}`);
    } else {
        log('-', "Никого не удалось собрать (проверьте токены и права).");
    }

    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function spammer() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    let guildId = await questionAsync("ID сервера: ");
    let channelIds = (await questionAsync("ID канала (через запятую для нескольких): "))
        .split(",").map(id => id.trim()).filter(Boolean);
    if (!channelIds.length) return log('-', `Не указаны каналы!`);

    let useMentions = (await questionAsync("Использовать упоминания? (y/n): ")).toLowerCase() === 'y';
    let mentions = [];
    if (useMentions) {
        let pathMent = `scrapped/${guildId}/users.txt`;
        if (fs.existsSync(pathMent)) {
            mentions = fs.readFileSync(pathMent, 'utf-8').split('\n').filter(Boolean);
            log('+', `Загружено ${mentions.length} упоминаний`);
        }
    }

    let useRandomSuffix = (await questionAsync("Добавлять рандомные символы? (y/n): ")).toLowerCase() === 'y';
    let randomSuffixLength = 10;
    if (useRandomSuffix) {
        let len = parseInt(await questionAsync("Сколько символов (1-25, по умолчанию 10): ")) || 10;
        randomSuffixLength = Math.max(1, Math.min(len, 25));
    }

    state.raidTexts = loadRaidTexts();
    let mentionsPerMsg = 1;
    let mentionFrequency = 1;

    if (useMentions) {
        mentionsPerMsg = parseInt(await questionAsync("Сколько упоминаний в сообщении: ")) || 1;
        let freq = (await questionAsync("Частота упоминаний (1/число, макс 1/5): ")).trim();
        if (freq) {
            let [a, b] = freq.split('/').map(Number);
            if (a === 1 && b >= 1 && b <= 5) mentionFrequency = b;
        }
    }

    const useSpotify = (await questionAsync("Включить Spotify активность с приглашениями? (y/n): ")).toLowerCase() === "y";
    
    state.spotifySessions = {};
    state.spotifyParties = {};
    
    if (useSpotify) {
        // поднастройте ответы по умолчанию на свои, если лень вписывать каждый раз
        const details = await questionAsync("Введите details: ") || "discord.gg/jPzvYYjRSd";
        const stateText = await questionAsync("Введите state: ") || "ICSU";
        const largeImageID = await questionAsync("Введите ID стикера Discord для large_image: ") || "1408398694629507122";
        const largeText = await questionAsync("Введите large_text: ") || "YOU'RE OWNED BY ICSU :)";

        state.spotifyDetails = details;
        state.spotifyState = stateText;
        state.spotifyLargeImageID = largeImageID;
        state.spotifyLargeText = largeText;

        log('+', 'Настраиваем Spotify активность через WebSocket...');

        for (const { token, username } of state.validTokens) {
            try {
                const now = Math.floor(Date.now() / 1000);
                const partyId = `spotify:${Math.floor(Math.random() * 1e16)}`;
                const sessionId = uuidv4(); 

                const activityPayload = {
                    name: "Spotify",
                    type: 2,
                    details,
                    state: stateText,
                    timestamps: { 
                        start: now,
                        end: now + 3600 
                    },
                    assets: {
                        large_image: `mp:stickers/${largeImageID}.webp`,
                        large_text: largeText
                    },
                    party: { id: partyId },
                    flags: 48,
                    sync_id: "1S0ab1Xv89UqFWU0FJjRPs"
                };

                const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");

                ws.on('open', () => {
                    log('i', `WS connected for @${username}`);
                });

                ws.on('message', (data) => {
                    const msg = JSON.parse(data);

                    if (msg.op === 10) {
                        const heartbeatInterval = msg.d.heartbeat_interval;
                        const payload = {
                            op: 2,
                            d: {
                                token,
                                properties: { 
                                    $os: "windows", 
                                    $browser: "chrome", 
                                    $device: "desktop" 
                                },
                                presence: {
                                    status: "online",
                                    activities: [activityPayload],
                                    afk: false
                                }
                            }
                        };
                        ws.send(JSON.stringify(payload));
                        
                        ws.send(JSON.stringify({ op: 1, d: null })); 
                    }
                    
                    if (msg.t === "READY") {
                        state.spotifySessions[token] = msg.d.session_id;
                        state.spotifyParties[token] = partyId;
                        log('+', `Spotify-активность установлена для @${username} (session: ${msg.d.session_id.slice(0, 8)}...)`);
                        
                        const interval = setInterval(() => {
                            if (ws.readyState === WebSocket.OPEN) {
                                ws.send(JSON.stringify({ op: 1, d: null }));
                            } else {
                                clearInterval(interval);
                            }
                        }, msg.d.heartbeat_interval);

                        if (!state.spotifyWebSockets) state.spotifyWebSockets = [];
                        state.spotifyWebSockets.push({ ws, interval, username });
                    }
                });

                ws.on('close', (code, reason) => {
                    log('-', `WS закрыт для @${username}: ${code} ${reason}`);
                });
                
                ws.on('error', (err) => {
                    log('-', `Ошибка WS у @${username}: ${err.message}`);
                });

            } catch (e) {
                log('-', `Ошибка при установке Spotify для @${username}: ${e.message}`);
            }
        }

        await delay(3000); 
    }

    log('~', 'Подключаем клиенты для спама...');
    activeClients = [];

    for (let { token, username } of state.validTokens) {
        let client = new Client({ checkUpdate: false });
        try {
            await client.login(token);
            activeClients.push({ client, username, token });
            log('+', `@${username} подключен`);
        } catch (e) {
            log('-', `Ошибка входа для @${username}: ${e.message}`);
        }
    }

    if (activeClients.length === 0) {
        log("-", "Нет подключенных клиентов для спама");
        await questionAsync("Нажмите Enter чтобы продолжить...");
        return;
    }

    let totalMessages = 0;
    let lastTotal = 0;
    let lastTime = Date.now();
    let logLines = [];

    let channelUserIndex = channelIds.map((_, i) => i % activeClients.length);
    let channelTextIndex = channelIds.map(() => 0);
    let channelMentionCounter = channelIds.map(() => 0);
    let channelMentionIndex = channelIds.map(() => 0);

    function drawHeader() {
        let now = Date.now();
        let rate = ((totalMessages - lastTotal) / ((now - lastTime) / 1000)).toFixed(2);
        lastTotal = totalMessages;
        lastTime = now;

        let colorRate = parseFloat(rate) < 1.00 ? `\x1b[31m${rate}\x1b[0m` : `\x1b[32m${rate}\x1b[0m`;
        console.clear();
        const spotifyInfo = useSpotify ? " | Spotify" : "";
        process.stdout.write(`tm: ${totalMessages} | ${colorRate} msg/s | clients: ${activeClients.length}${spotifyInfo}`.padStart(process.stdout.columns) + "\n");
        process.stdout.write(logLines.join("\n") + "\n");
    }

    setInterval(drawHeader, 1000);

    async function sendMessageWithSpotify(channel, msg, token, username) {
        if (useSpotify && state.spotifySessions && state.spotifySessions[token] && state.spotifyParties && state.spotifyParties[token]) {
            try {
                const payload = {
                    content: msg,
                    tts: false,
                    flags: 0,
                    allowed_mentions: { parse: [] }
                };

                payload.activity = {
                    type: 3, 
                    session_id: state.spotifySessions[token],
                    party_id: state.spotifyParties[token]
                };

                const response = await fetch(`https://discord.com/api/v9/channels/${channel.id}/messages`, {
                    method: "POST",
                    headers: {
                        "Authorization": token,
                        "Content-Type": "application/json",
                        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
                    },
                    body: JSON.stringify(payload)
                });

                if (response.status === 429) {
                    const data = await response.json();
                    const wait = (data.retry_after || 1) * 1000;
                    throw new Error(`RATE_LIMIT:${wait}`);
                }

                if (response.status === 200) {
                    return true;
                }

                const errorText = await response.text();
                log('~', `@${username}: Spotify API ${response.status}, falling back: ${errorText.slice(0, 100)}`);
                await channel.send(msg);
                return true;

            } catch (error) {
                if (error.message.startsWith('RATE_LIMIT:')) {
                    const waitTime = parseInt(error.message.split(':')[1]);
                    await delay(waitTime);
                    return await sendMessageWithSpotify(channel, msg, token, username);
                }
                
                log('~', `@${username}: Spotify failed, fallback to normal: ${error.message}`);
                await channel.send(msg);
                return true;
            }
        } else {
            await channel.send(msg);
            return true;
        }
    }

    log('+', 'Начинаем спам...');
    
    while (true) {
        for (let chIndex = 0; chIndex < channelIds.length; chIndex++) {
            let channelId = channelIds[chIndex];
            let userIndex = channelUserIndex[chIndex];
            let { client, username, token } = activeClients[userIndex];

            try {
                let channel = client.channels.cache.get(channelId);
                if (!channel) continue;

                let msg = "";
                channelMentionCounter[chIndex]++;

                if (useMentions && mentions.length > 0 && channelMentionCounter[chIndex] === mentionFrequency) {
                    for (let i = 0; i < mentionsPerMsg; i++) {
                        let mention = mentions[channelMentionIndex[chIndex] % mentions.length];
                        msg += mention + " ";
                        channelMentionIndex[chIndex] = (channelMentionIndex[chIndex] + 1) % mentions.length;
                    }
                    channelMentionCounter[chIndex] = 0;
                }

                msg += state.raidTexts[channelTextIndex[chIndex]].replace(/\\n/g, '\n');
                channelTextIndex[chIndex] = (channelTextIndex[chIndex] + 1) % state.raidTexts.length;

                if (useRandomSuffix) {
                    let rnd = Math.random().toString(36).substring(2, 2 + randomSuffixLength);
                    msg += ` ||${rnd}||`;
                }

                const success = await sendMessageWithSpotify(channel, msg, token, username);
                
                if (success) {
                    totalMessages++;
                    logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.green}[+]${colors.reset} - @${username} → #${channel.id}: ${msg.slice(0, 40)}...`);
                    if (logLines.length > process.stdout.rows - 3) logLines.shift();
                }

            } catch (e) {
                if (e.message && e.message.startsWith('RATE_LIMIT:')) {
                    const waitTime = parseInt(e.message.split(':')[1]);
                    logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.yellow}[~]${colors.reset} - @${username}: Рейт-лимит! Ждём ${waitTime}мс`);
                    await delay(waitTime);
                } else if (e.code === 429 || (e.message && e.message.includes('429'))) {
                    logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.yellow}[~]${colors.reset} - @${username}: Рейт-лимит! Ждём 2 секунды`);
                    await delay(2000);
                } else {
                    logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.red}[-]${colors.reset} - @${username}: ${e.message}`);
                }
                if (logLines.length > process.stdout.rows - 3) logLines.shift();
            }

            channelUserIndex[chIndex] = (channelUserIndex[chIndex] + 1) % activeClients.length;
        }
        await delay(channelIds.length > 1 ? 10 : 20);
    }
}

function loadRaidTexts() {
    try {
        let lines = fs.readFileSync('text.txt', 'utf-8')
            .split('\n').map(l => l.trim())
            .filter(l => l && !l.startsWith('#'));
        let texts = [];
        for (let i = 0; i < 5; i++) {
            let prefix = i === 0 ? 'text:' : `text${i}:`;
            let found = lines.find(l => l.toLowerCase().startsWith(prefix));
            if (found) {
                let val = found.slice(prefix.length).trim();
                if (val) texts.push(val);
            } else break;
        }
        return texts.length ? texts : ['Hello World'];
    } catch (e) {
        return ['Hello World'];
    }
}

function delay(ms) {
    return new Promise(res => setTimeout(res, ms));
}

async function createThreads() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    const channelId = await questionAsync("Введите ID канала: ");
    const threadName = await questionAsync("Название веток: ");
    const threadsPerToken = 5;

    if (activeClients.length === 0) {
        for (let { token, username } of state.validTokens) {
            const client = new Client({ checkUpdate: false });
            try {
                await client.login(token);
                activeClients.push({ client, username });
                log('+', `@${username} подключен`);
            } catch (e) {
                log('-', `Ошибка входа для @${username}: ${e.message}`);
            }
        }
    }

    for (let { client, username } of activeClients) {
        const channel = client.channels.cache.get(channelId);
        if (!channel) {
            log('-', `Канал ${channelId} не найден для @${username}`);
            continue;
        }

        for (let i = 0; i < threadsPerToken; i++) {
            try {
                await channel.threads.create({
                    name: `${threadName}-${Date.now()}-${i}`,
                    autoArchiveDuration: 60,
                    reason: 'Automated threads'
                });
                log('+', `@${username}: Ветка #${i+1} создана`);
                await delay(70);
            } catch (e) {
                log('-', `@${username}: Ошибка при создании ветки: ${e.message}`);
            }
        }
    }

    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function spamThreads() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    let guildId = await questionAsync("ID сервера: ");
    let channelIds = (await questionAsync("ID канала (через запятую для нескольких): "))
        .split(",").map(id => id.trim()).filter(Boolean);
    if (!channelIds.length) return log('-', `Не указаны каналы!`);

    let useMentions = (await questionAsync("Использовать упоминания? (y/n): ")).toLowerCase() === 'y';
    let mentions = [];
    if (useMentions) {
        let pathMent = `scrapped/${guildId}/users.txt`;
        if (fs.existsSync(pathMent)) {
            mentions = fs.readFileSync(pathMent, 'utf-8').split('\n').filter(Boolean);
            log('+', `Загружено ${mentions.length} упоминаний`);
        }
    }

    let mentionsPerMsg = 1;
    let mentionFrequency = 1;
    if (useMentions) {
        mentionsPerMsg = parseInt(await questionAsync("Сколько упоминаний в сообщении: ")) || 1;
        let freq = (await questionAsync("Частота упоминаний (1/число, макс 1/5): ")).trim();
        if (freq) {
            let [a, b] = freq.split('/').map(Number);
            if (a === 1 && b >= 1 && b <= 5) mentionFrequency = b;
        }
    }

    let useRandomSuffix = (await questionAsync("Добавлять рандомные символы? (y/n): ")).toLowerCase() === 'y';
    let randomSuffixLength = 10;
    if (useRandomSuffix) {
        let len = parseInt(await questionAsync("Сколько символов (1-25, по умолчанию 10): ")) || 10;
        randomSuffixLength = Math.max(1, Math.min(len, 25));
    }

    state.raidTexts = loadRaidTexts() || [];
    if (!Array.isArray(state.raidTexts) || state.raidTexts.length === 0) {
        log('-', `Файл с текстами пустой или не найден`);
        return;
    }

    if (activeClients.length === 0) {
        for (let { token, username } of state.validTokens) {
            let client = new Client({ checkUpdate: false });
            try {
                await client.login(token);
                activeClients.push({ client, username });
                log('+', `@${username} подключен`);
            } catch (e) {
                log('-', `Ошибка входа для @${username}: ${e.message}`);
            }
        }
    }

    let totalMessages = 0;
    let lastTotal = 0;
    let lastTime = Date.now();
    let logLines = [];

    let threadMentionCounter = {};
    let threadMentionIndex = {};
    let threadTextIndex = {};

    function drawHeader() {
        let now = Date.now();
        let rate = ((totalMessages - lastTotal) / ((now - lastTime) / 1000)).toFixed(2);
        lastTotal = totalMessages;
        lastTime = now;
        let colorRate = parseFloat(rate) < 1.00 ? `\x1b[31m${rate}\x1b[0m` : `\x1b[32m${rate}\x1b[0m`;
        console.clear();
        process.stdout.write(`tm: ${totalMessages} | ${colorRate} msg/s`.padStart(process.stdout.columns) + "\n");
        process.stdout.write(logLines.join("\n") + "\n");
    }

    setInterval(drawHeader, 1000);

    while (true) {
        for (let { client, username } of activeClients) {
            for (let channelId of channelIds) {
                try {
                    let channel = client.channels.cache.get(channelId);
                    if (!channel || !channel.threads) continue;

                    let threads = await channel.threads.fetchActive();
                    for (let thread of threads.threads.values()) {

                        if (!(thread.id in threadMentionCounter)) threadMentionCounter[thread.id] = 0;
                        if (!(thread.id in threadMentionIndex)) threadMentionIndex[thread.id] = 0;
                        if (!(thread.id in threadTextIndex)) threadTextIndex[thread.id] = 0;

                        threadMentionCounter[thread.id]++;

                        let msg = "";

                        if (useMentions && mentions.length > 0 && threadMentionCounter[thread.id] >= mentionFrequency) {
                            for (let i = 0; i < mentionsPerMsg; i++) {
                                msg += mentions[threadMentionIndex[thread.id] % mentions.length] + " ";
                                threadMentionIndex[thread.id]++;
                            }
                            threadMentionCounter[thread.id] = 0; // сброс счётчика для этой ветки
                        }

                        msg += state.raidTexts[threadTextIndex[thread.id]].replace(/\\n/g, '\n');
                        threadTextIndex[thread.id] = (threadTextIndex[thread.id] + 1) % state.raidTexts.length;

                        if (useRandomSuffix) {
                            let rnd = Math.random().toString(36).substring(2, 2 + randomSuffixLength);
                            msg += ` ||${rnd}||`;
                        }

                        await thread.send(msg);
                        totalMessages++;
                        logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.green}[+]${colors.reset} - @${username} → [${thread.name}]: ${msg.slice(0, 40)}...`);
                        if (logLines.length > process.stdout.rows - 3) logLines.shift();
                    }
                } catch (e) {
                    if (e.code === 429) {
                        logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.yellow}[~]${colors.reset} - @${username}: Рейт-лимит! Ждём 5 секунд`);
                        await delay(5000);
                    } else {
                        logLines.push(`${colors.gray}[${new Date().toLocaleTimeString()}] ${colors.red}[-]${colors.reset} - @${username}: ${e.message}`);
                    }
                    if (logLines.length > process.stdout.rows - 3) logLines.shift();
                }
            }
        }
        await delay(300);
    }
}

async function statusManager() {
    const allUsers = state.validTokens.map(({ username, token }) => ({
        username,
        token,
        active: false 
    }));

    while (true) {
        console.clear();
        drawAsciiArt(getCustomAsciiArt());
        drawLine();
        const text = await questionAsync("Текст активности: ");

        let typeChoice = (await questionAsync("Выберите тип статуса (g/l/w/s): ")).toLowerCase();
        let type;
        let url = null;

        switch (typeChoice) {
            case 'g': type = "PLAYING"; break;
            case 'l': type = "LISTENING"; break;
            case 'w': type = "WATCHING"; break;
            case 's':
                type = "STREAMING";
                url = await questionAsync("Ссылка на Twitch: ");
                break;
            default:
                log('-', "Неверный тип статуса!");
                continue;
        }

        while (true) {
            console.clear();
            console.log('Выберите аккаунт, чтобы установить активность (например: "1, 2, 4" или "all"):\n');

            allUsers.forEach((u, idx) => {
                const cfg = statusConfig[u.username];
                if (cfg) {
                    console.log(`${colors.gray}[${u.active ? '#' : idx + 1}]${colors.reset} @${u.username} | ${cfg.type} ${cfg.text}`);
                } else {
                    console.log(`${colors.green}[${idx + 1}]${colors.reset} @${u.username} | (Не установлена активность)`);
                }
            });

            console.log(`${colors.red}[x]${colors.reset} Очистить все статусы`);

            const choice = (await questionAsync("Выбор: ")).trim().toLowerCase();

            if (choice === 'all') {
                for (let i = 0; i < allUsers.length; i++) {
                    await setUserStatus(allUsers[i], type, text, url);
                }
            } else if (choice === 'x') {
                await clearAllStatuses(allUsers);
                continue;
            } else {
                const chosenIndexes = choice.split(',')
                    .map(c => parseInt(c.trim()) - 1)
                    .filter(i => i >= 0 && i < allUsers.length);

                if (chosenIndexes.length === 0) {
                    log('-', 'Неверный выбор.');
                    continue;
                }

                for (const idx of chosenIndexes) {
                    await setUserStatus(allUsers[idx], type, text, url);
                }
            }

            if (allUsers.every(u => u.active)) {
                log('#', "Все аккаунты получили статус. Нажмите Enter чтобы продолжить...");
                await questionAsync("");
                return;
            }

            break;
        }
    }

    async function setUserStatus(user, type, text, url) {
        if (!activeClients[user.username]) {
            activeClients[user.username] = new Client({ checkUpdate: false });
            await activeClients[user.username].login(user.token);
        }
        const client = activeClients[user.username];

        try {
            await client.user.setActivity(text, { type, url: url || undefined });
            statusConfig[user.username] = { type, text, url };
            saveStatusConfig();
            user.active = true;
            log('+', `Установлен статус для @${user.username}`);
        } catch (e) {
            log('-', `Ошибка установки статуса для @${user.username}: ${e.message}`);
        }
    }



    async function clearAllStatuses(users) {
        for (const u of users) {
            const client = new Client({ checkUpdate: false });
            try {
                await client.login(u.token);
                await client.user.setActivity(null);
                delete statusConfig[u.username];
                u.active = false;
                log('-', `Статус очищен для @${u.username}`);
            } catch (e) {
                log('-', `Ошибка очистки статуса для @${u.username}: ${e.message}`);
            } finally {
                client.destroy();
            }
        }
        saveStatusConfig();
    }
}

async function verification() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    const guildId = await questionAsync("Введите ID сервера: ");
    const channelId = await questionAsync("Введите ID канала: ");

    console.log("Выберите способ верификации на сервере:");
    console.log("[1] Reaction Click");
    console.log("[2] Button Click");
    const verifyMethod = parseInt(await questionAsync("Выбор: "));

    if (verifyMethod === 1) {
        const messageId = await questionAsync("Введите ID сообщения: ");

        let firstClient = new Client({ checkUpdate: false });
        await firstClient.login(state.validTokens[0].token);
        let channel = await firstClient.channels.fetch(channelId);
        let msg = await channel.messages.fetch(messageId);

        let reactions = Array.from(msg.reactions.cache.values());
        console.log("Выберите реакции (через запятую) или all:");
        reactions.forEach((r, i) => {
            console.log(`[${i + 1}] ${r.emoji.name || r.emoji.id}`);
        });

        let input = (await questionAsync("Выбор: ")).trim().toLowerCase();
        let chosenReactions = [];

        if (input === "all") {
            chosenReactions = reactions;
        } else {
            let indexes = input
                .split(",")
                .map(x => parseInt(x.trim()) - 1)
                .filter(i => i >= 0 && i < reactions.length);
            chosenReactions = indexes.map(i => reactions[i]);
        }

        for (const { token, username } of state.validTokens) {
            let client = new Client({ checkUpdate: false });
            try {
                await client.login(token);
                let ch = await client.channels.fetch(channelId);
                let m = await ch.messages.fetch(messageId);

                for (let reaction of chosenReactions) {
                    await m.react(reaction.emoji);
                    log('+', `@${username} нажал реакцию ${reaction.emoji.name || reaction.emoji.id}`);
                    await delay(500);
                }
            } catch (e) {
                log('-', `Ошибка у @${username}: ${e.message}`);
            }
            client.destroy();
        }
        firstClient.destroy();

    } else if (verifyMethod === 2) {
        const messageId = await questionAsync("Введите ID сообщения: ");

        let firstClient = new Client({ checkUpdate: false });
        await firstClient.login(state.validTokens[0].token);
        let channel = await firstClient.channels.fetch(channelId);
        let msg = await channel.messages.fetch(messageId);

        let buttons = [];
            const raw = msg.toJSON();

            if (raw.components?.length > 0) {
                raw.components.forEach(row => {
                    row.components.forEach(comp => {
                        if (comp.type === 2) {
                            buttons.push({
                                emoji: comp.emoji ? (comp.emoji.name || comp.emoji.id) : "",
                                label: comp.label || "",
                                customId: comp.custom_id
                            });
                        }
                    });
                });
            }


        if (buttons.length === 0) {
            console.log("На сообщении нет кнопок.");
            firstClient.destroy();
            return;
        }

        console.log("Выберите кнопки (через запятую) или all:");
        buttons.forEach((b, i) => {
            console.log(`[${i + 1}] ${b.emoji || "🔘"} ${b.label}`);
        });

        let input = (await questionAsync("Выбор: ")).trim().toLowerCase();
        let chosenButtons = [];

        if (input === "all") {
            chosenButtons = buttons;
        } else {
            let indexes = input
                .split(",")
                .map(x => parseInt(x.trim()) - 1)
                .filter(i => i >= 0 && i < buttons.length);
            chosenButtons = indexes.map(i => buttons[i]);
        }

        for (const { token, username } of state.validTokens) {
            let client = new Client({ checkUpdate: false });
            try {
                await client.login(token);
                let ch = await client.channels.fetch(channelId);
                let m = await ch.messages.fetch(messageId);

                for (let button of chosenButtons) {
                    try {
                        await m.clickButton(button.customId);
                        log('+', `@${username} нажал кнопку ${button.label || button.emoji}`);
                        await delay(500);
                    } catch (e) {
                        log('-', `@${username}: Ошибка при клике кнопки ${button.label}: ${e.message}`);
                    }
                }
            } catch (e) {
                log('-', `Ошибка у @${username}: ${e.message}`);
            }
            client.destroy();
        }
        firstClient.destroy();
    }

    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function joinVoiceChannelTool() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();

    const guildId = await questionAsync("Введите ID сервера: ");
    const channelId = await questionAsync("Введите ID голосового канала: ");

    let connectedCount = 0;
    const voiceConnections = [];

    log('~', 'Проверяем доступ к серверу и каналу...');

    for (const { token, username } of state.validTokens) {
        let client = new Client({ 
            checkUpdate: false
        });

        try {
            await client.login(token);
            await delay(500);

            const guild = await client.guilds.fetch(guildId).catch(() => null);
            if (!guild) {
                log("-", `@${username}: сервер ${guildId} не найден или нет доступа`);
                client.destroy();
                continue;
            }

            const channel = await guild.channels.fetch(channelId).catch(() => null);
            if (!channel) {
                log("-", `@${username}: канал ${channelId} не найден или нет доступа`);
                client.destroy();
                continue;
            }

            log('~', `@${username}: найден канал "${channel.name}" на сервере "${guild.name}"`);

            let joined = false;

            try {
                log('~', `@${username}: подключение...`);
                await joinVoiceWebSocket(token, guildId, channelId, username);
                log("+", `@${username} подключился к голосовому каналу ${channel.name}`);
                voiceConnections.push({ token, username, guildId, channelId });
                connectedCount++;
                joined = true;
            } catch (wsError) {
                log('~', `@${username}: ${wsError.message}`);
            }

            if (!voiceConnections.some(conn => conn.client === client)) {
                client.destroy();
            }

        } catch (e) {
            log("-", `Ошибка у @${username}: ${e.message}`);
            try {
                client.destroy();
            } catch {}
        }
    }

    if (connectedCount > 0) {
        log(`+`, `Успешно подключено ${connectedCount} клиентов к голосовому каналу.`);
        log(`i`, `Они будут оставаться в канале до завершения программы.`);
        await questionAsync("Нажмите Enter чтобы продолжить...");
        
        for (const connection of voiceConnections) {
            try {
                if (connection.client && connection.client.voice) {
                    connection.client.voice.leave();
                    connection.client.destroy();
                } else {
                    await leaveVoiceWebSocket(connection.token, connection.guildId, connection.username);
                }
                log("-", `@${connection.username} отключился от голосового канала`);
            } catch (e) {
                log("-", `Ошибка при отключении @${connection.username}: ${e.message}`);
            }
        }
    } else {
        console.log(`\n${colors.red}Ни один клиент не смог подключиться к голосовому каналу.${colors.reset}`);
        await questionAsync("Нажмите Enter чтобы продолжить...");
    }
}

async function joinVoiceWebSocket(token, guildId, channelId, username) {
    return new Promise((resolve, reject) => {
        const ws = new WebSocket("wss://gateway.discord.gg/?v=10&encoding=json");
        let resolved = false;

        ws.on('open', () => {
            const identify = {
                op: 2,
                d: {
                    token: token,
                    properties: {
                        $os: "windows",
                        $browser: "chrome",
                        $device: "desktop"
                    },
                    compress: false
                }
            };
            ws.send(JSON.stringify(identify));
        });

        ws.on('message', (data) => {
            const msg = JSON.parse(data);
            
            if (msg.op === 10) {
                const interval = setInterval(() => {
                    if (ws.readyState === WebSocket.OPEN) {
                        ws.send(JSON.stringify({ op: 1, d: null }));
                    } else {
                        clearInterval(interval);
                    }
                }, msg.d.heartbeat_interval);
            }
            
            if (msg.t === "READY" && !resolved) {
                const voiceUpdate = {
                    op: 4,
                    d: {
                        guild_id: guildId,
                        channel_id: channelId,
                        self_mute: false,
                        self_deaf: false
                    }
                };
                ws.send(JSON.stringify(voiceUpdate));
                resolved = true;
                
                setTimeout(() => {
                    ws.close();
                    resolve();
                }, 2000);
            }
        });

        ws.on('error', (error) => {
            if (!resolved) {
                resolved = true;
                reject(error);
            }
        });

        ws.on('close', () => {
            if (!resolved) {
                resolved = true;
                resolve(); 
            }
        });

        setTimeout(() => {
            if (!resolved) {
                resolved = true;
                ws.close();
                reject(new Error("WebSocket timeout"));
            }
        }, 15000);
    });
}

function getCustomAsciiArt() {
    const color = colors[userConfig.asciiColor] || colors.red;
    return `${color}${userConfig.asciiArt}${colors.reset}`;
}

async function customization() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    
    while (true) {
        console.clear();
        drawAsciiArt(getCustomAsciiArt());
        drawLine();
        console.log(`${colors.red}> > > - Меню Кастомизации - < < <${colors.reset}\n`);
        console.log(`${colors.red}[1]${colors.reset} Изменить цвет меню (Сейчас: ${userConfig.menuColor})`);
        console.log(`${colors.red}[2]${colors.reset} Изменить цвет ASCII-арта (Сейчас: ${userConfig.asciiColor})`);
        console.log(`${colors.red}[3]${colors.reset} Изменить ASCII-арт`);
        console.log(`${colors.red}[4]${colors.reset} Посмотреть настройки`);
        console.log(`${colors.red}[5]${colors.reset} Сбросить настройки`);
        console.log(`${colors.red}[6]${colors.reset} Вернуться в меню\n`);
        
        const choice = await questionAsync("Выбор: ");
        
        switch (choice) {
            case '1':
                await changeMenuColor();
                break;
            case '2':
                await changeAsciiColor();
                break;
            case '3':
                await changeAsciiText();
                break;
            case '4':
                await previewSettings();
                break;
            case '5':
                await resetToDefault();
                break;
            case '6':
                return;
            default:
                log('-', 'Неверный выбор!');
                await delay(1000);
        }
    }
}

async function changeMenuColor() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    console.log(`${colors.red}> > > - Выбор цвета меню - < < <${colors.reset}\n`);
    console.log("Доступные цвета");
    console.log(`${colors.green}[1] Зелёный${colors.reset}`);
    console.log(`${colors.yellow}[2] Жёлтый${colors.reset}`);
    console.log(`${colors.red}[3] Красный${colors.reset}`);
    console.log(`${colors.cyan}[4] Голубой${colors.reset}`);
    console.log(`${colors.magenta}[5] Пурпурный${colors.reset}`);
    console.log(`${colors.blue}[6] Синий${colors.reset}`);
    console.log(`${colors.gray}[7] Серый${colors.reset}\n`);
    
    const colorChoice = await questionAsync("Select color (1-7): ");
    
    const colorMap = {
        '1': 'green',
        '2': 'yellow',
        '3': 'red',
        '4': 'cyan',
        '5': 'magenta',
        '6': 'blue',
        '7': 'gray'
    };
    
    if (colorMap[colorChoice]) {
        userConfig.menuColor = colorMap[colorChoice];
        saveUserConfig();
        log('+', `Цвет меню был изменён на ${userConfig.menuColor}`);
    } else {
        log('-', 'Неверный выбор!');
    }
    
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function changeAsciiColor() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    console.log(`${colors.red}> > > - Выбор цвета для ASCII-арта - < < <${colors.reset}\n`);
    console.log("Доступные цвета");
    console.log(`${colors.green}[1] Зелёный${colors.reset}`);
    console.log(`${colors.yellow}[2] Жёлтый${colors.reset}`);
    console.log(`${colors.red}[3] Красный${colors.reset}`);
    console.log(`${colors.cyan}[4] Голубой${colors.reset}`);
    console.log(`${colors.magenta}[5] Пурпурный${colors.reset}`);
    console.log(`${colors.blue}[6] Синий${colors.reset}`);
    console.log(`${colors.gray}[7] Серый${colors.reset}\n`);
    
    const colorChoice = await questionAsync("Выбор(1-7): ");
    
    const colorMap = {
        '1': 'green',
        '2': 'yellow',
        '3': 'red',
        '4': 'cyan',
        '5': 'magenta',
        '6': 'blue',
        '7': 'gray'
    };
    
    if (colorMap[colorChoice]) {
        userConfig.asciiColor = colorMap[colorChoice];
        saveUserConfig();
        log('+', `Цвет ASCII-арта был изменён на ${userConfig.asciiColor}`);
    } else {
        log('-', 'Неверный выбор!');
    }
    
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function changeAsciiText() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    console.log(`${colors.red}> > > - Изменить ASCII-арт - < < <${colors.reset}\n`);
    console.log("Нынешний ASCII-арт:");
    console.log(getCustomAsciiArt());
    console.log(`\n${colors.yellow}[i] Введите новый ASCII арт построчно.${colors.reset}`);
    console.log(`${colors.yellow}[i] Введите 'stop' на отдельной строке для завершения ввода.${colors.reset}`);
    console.log(`${colors.yellow}[i] Введите 'default' для использования оригинала.${colors.reset}\n`);
    
    let input = await questionAsync("Выбор (start/default): ");
    input = input.trim().toLowerCase();
    
    if (input === 'default') {
        userConfig.asciiArt = `
██▀███   ▄▄▄       ██▓▓█████▄ ▄▄▄█████▓ ▒█████   ▒█████   ██▓     
▓██ ▒ ██▒▒████▄    ▓██▒▒██▀ ██▌▓  ██▒ ▓▒▒██▒  ██▒▒██▒  ██▒▓██▒    
▓██ ░▄█ ▒▒██  ▀█▄  ▒██▒░██   █▌▒ ▓██░ ▒░▒██░  ██▒▒██░  ██▒▒██░    
▒██▀▀█▄  ░██▄▄▄▄██ ░██░░▓█▄   ▌░ ▓██▓ ░ ▒██   ██░▒██   ██░▒██░    
░██▓ ▒██▒ ▓█   ▓██▒░██░░▒████▓   ▒██▒ ░ ░ ████▓▒░░ ████▓▒░░██████▒
░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░▓   ▒▒▓  ▒   ▒ ░░   ░ ▒░▒░▒░ ░ ▒░▒░▒░ ░ ▒░▓  ░
  ░▒ ░ ▒░  ▒   ▒▒ ░ ▒ ░ ░ ▒  ▒     ░      ░ ▒ ▒░   ░ ▒ ▒░ ░ ░ ▒  ░
  ░░   ░   ░   ▒    ▒ ░ ░ ░  ░   ░      ░ ░ ░ ▒  ░ ░ ░ ▒    ░ ░   
   ░           ░  ░ ░     ░                 ░ ░      ░ ░      ░  ░`;
        log('+', 'ASCII-арт был возвращен на обычный');
    } else if (input === 'start') {
        console.log(`\n${colors.yellow}[i] Начинайте ввод ASCII арта построчно.${colors.reset}`);
        console.log(`${colors.yellow}[i] Введите 'stop' на отдельной строке для завершения.${colors.reset}\n`);
        
        const lines = [];
        let lineNumber = 1;
        
        while (true) {
            const line = await questionAsync(`[${lineNumber}] `);
            const trimmedLine = line.trim();
            
            if (trimmedLine.toLowerCase() === 'stop') {
                break;
            }
            
            lines.push(line); 
            lineNumber++;
            
            if (lineNumber > 20) { 
                console.log(`${colors.yellow}Достигнут лимит в 20 строк. Завершение ввода.${colors.reset}`);
                break;
            }
        }
        
        if (lines.length > 0) {
            userConfig.asciiArt = lines.join('\n');
            log('+', `ASCII-арт был изменен с ${lines.length} линиями`);
            
            console.log(`\n${colors.green}Новый ASCII арт:${colors.reset}`);
            console.log(getCustomAsciiArt());
        } else {
            log('-', 'ASCII-арт не может быть пустым.');
            await questionAsync("Нажмите Enter чтобы продолжить...");
            return;
        }
    } else {
        log('-', 'Неверный выбор! Используйте "start" или "default"');
        await questionAsync("Нажмите Enter чтобы продолжить...");
        return;
    }
    
    saveUserConfig();
    console.log(`\n${colors.green}Настройки сохранены!${colors.reset}`);
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function previewSettings() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    console.log(`${colors.red}> > > - Настройки - < < <${colors.reset}\n`);
    
    console.log(`${colors.yellow}Цвет меню:${colors.reset} ${userConfig.menuColor}`);
    console.log(`${colors.yellow}Цвет ASCII-арта:${colors.reset} ${userConfig.asciiColor}`);
    console.log(`${colors.yellow}ASCII-арт:${colors.reset}\n`);
    console.log(getCustomAsciiArt());
    
    console.log(`\n${colors.yellow}Меню:${colors.reset}`);
    const { leftColumn, rightColumn } = getMenuColumns();
    drawMenuTwoColumns(leftColumn, rightColumn);
    
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

async function resetToDefault() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    console.log(`${colors.red}> > > - Сбросить настройки - < < <${colors.reset}\n`);
    
    const confirm = await questionAsync("Хотите ли вы сбросить все настройки(y/n)?: ");
    
    if (confirm.toLowerCase() === 'y') {
        userConfig = {
            menuColor: 'red',
            asciiArt: `
██▀███   ▄▄▄       ██▓▓█████▄ ▄▄▄█████▓ ▒█████   ▒█████   ██▓     
▓██ ▒ ██▒▒████▄    ▓██▒▒██▀ ██▌▓  ██▒ ▓▒▒██▒  ██▒▒██▒  ██▒▓██▒    
▓██ ░▄█ ▒▒██  ▀█▄  ▒██▒░██   █▌▒ ▓██░ ▒░▒██░  ██▒▒██░  ██▒▒██░    
▒██▀▀█▄  ░██▄▄▄▄██ ░██░░▓█▄   ▌░ ▓██▓ ░ ▒██   ██░▒██   ██░▒██░    
░██▓ ▒██▒ ▓█   ▓██▒░██░░▒████▓   ▒██▒ ░ ░ ████▓▒░░ ████▓▒░░██████▒
░ ▒▓ ░▒▓░ ▒▒   ▓▒█░░▓   ▒▒▓  ▒   ▒ ░░   ░ ▒░▒░▒░ ░ ▒░▒░▒░ ░ ▒░▓  ░
  ░▒ ░ ▒░  ▒   ▒▒ ░ ▒ ░ ░ ▒  ▒     ░      ░ ▒ ▒░   ░ ▒ ▒░ ░ ░ ▒  ░
  ░░   ░   ░   ▒    ▒ ░ ░ ░  ░   ░      ░ ░ ░ ▒  ░ ░ ░ ▒    ░ ░   
   ░           ░  ░ ░     ░                 ░ ░      ░ ░      ░  ░`,
            asciiColor: 'red'
        };
        saveUserConfig();
        log('+', 'Все настройки были сброшены.');
    } else {
        log('+', 'Сброс настроек отменен');
    }
    
    await questionAsync("Нажмите Enter чтобы продолжить...");
}

function drawAsciiArt(ascii = '') {
    const lines = ascii.split('\n');
    const termWidth = process.stdout.columns || 80;

    const centered = lines.map(line => {
        const visibleLength = stripAnsi(line).length;
        const padding = Math.floor((termWidth - visibleLength) / 2);
        return ' '.repeat(Math.max(0, padding)) + line;
    }).join('\n');

    console.log(centered);
}


process.on('SIGINT', async () => {
    console.log('\nОтключаем все аккаунты...');
    for (const client of activeClients) {
        client.destroy();
    }
    process.exit();
});

async function main() {
    console.clear();
    drawAsciiArt(getCustomAsciiArt());
    drawLine();
    
    if (fs.existsSync('tokens.txt')) {
        state.tokens = fs.readFileSync('tokens.txt', 'utf-8')
            .split('\n')
            .map(t => t.trim())
            .filter(t => t.length > 50);
        log('i', `Загружено ${state.tokens.length} токенов`);
    } else {
        log('-', 'Файл tokens.txt не найден!');
    }
    
    await validateTokens();
    
    while (true) {
        console.clear();
        drawAsciiArt(getCustomAsciiArt());
        drawLine();
        drawMenu();
        drawLine();
        
        const { leftColumn, rightColumn } = getMenuColumns();
        drawMenuTwoColumns(leftColumn, rightColumn);
        
        const choice = await questionAsync("Выбор: ");
        switch (Number(choice.trim())) {
            case 1: await ServerInfo(); break;
            case 2: await leaver(); break;
            case 3: await scrapper(); break;
            case 4: await spammer(); break;
            case 5: await createThreads(); break;
            case 6: await spamThreads(); break;
            case 7: await statusManager(); break;
            case 8: await verification(); break;
            case 9: await joinVoiceChannelTool(); break;
            case 10: await customization(); break;
            default:
                log('-', 'Неверный выбор!');
                await delay(1000);
        }
    }
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function questionAsync(prompt) {
    return new Promise(resolve => rl.question(prompt, resolve));
}

main().catch(err => {
    console.error(colors.red + "[!] Критическая ошибка: " + err.message + colors.reset);
    process.exit(1);
});
