const Discord = require('discord.js');
const cpuStat = require('cpu-stat');
const { ErelaClient } = require("erela.js");

const { prefix, token, nodes } = require('./config.json');

const client = new Discord.Client();
client.log = (msg) => { console.log(`[${new Date().toLocaleString()}] > ${msg}`); };
const embedColor = "#FF6AD5";

client.once("ready", () => {
    client.user.setActivity('%vaporwave', { type: 'LISTENING' });

    client.music = new ErelaClient(client, nodes);
    client.music.on("nodeError", (node, error) => console.log(`Node error: ${error.message}`));
    client.music.on("queueEnd", player => {
        client.music.players.destroy(player.guild.id);
    });

    if (client.shard.ids == client.shard.count - 1) {
        const promises = [
            client.shard.fetchClientValues('guilds.cache.size'),
            client.shard.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)'),
        ];

        return Promise.all(promises)
            .then(async results => {
                const totalGuilds = results[0].reduce((prev, guildCount) => prev + guildCount, 0);
                const totalMembers = results[1].reduce((prev, memberCount) => prev + memberCount, 0);
                client.log(`Discordwave is online: ${client.shard.count} shards, ${totalGuilds} servers and ${totalMembers} members.`);
            });
    }
});

client.on("message", async message => {

    if (!message.content.startsWith(prefix) || message.author.bot) return;

	const args = message.content.slice(prefix.length).split(/ +/);
	const command = args.shift().toLowerCase();

    if (command === "vaporwave" || command === "radio" || command === "join" || command === "play") {
        const player = client.music.players.spawn({
            guild: message.guild,
            voiceChannel: message.member.voice.channel,
            textChannel: message.channel,
        });

        if (player.playing) return message.channel.send("Already playing");

        const permissions = message.member.voice.channel.permissionsFor(client.user);
        if (!permissions.has('CONNECT')) return message.channel.send('I do not have permission to join your voice channel.');
        if (!permissions.has('SPEAK')) return message.channel.send('I do not have permission to speak in your voice channel.');

        const res = await client.music.search(`http://radio.plaza.one/ogg`, message.author);
        player.queue.add(res.tracks[0]);

        let randomNum = Math.floor((Math.random() * 83) + 2);
        if (randomNum < 10) randomNum = '0' + randomNum;
        let randomGif = `https://plaza.one/img/backs/${randomNum}.gif`

        const embed = new Discord.MessageEmbed()
            .setAuthor(client.user.username)
            .setDescription("Playing Vaporwave Radio")
            .setThumbnail(randomGif)
            .setFooter('Powered by plaza.one')
            .setColor(embedColor)
            .setTimestamp()
        message.channel.send(embed)

        player.play();
    }

    if (command === "stop" || command === "leave" || command === "dc" || command === "fuckoff") {
        const player = client.music.players.get(message.guild.id);

        if (player) {
            client.music.players.destroy(player.guild.id);
        }
        else { message.member.voice.channel.leave(); }

        return message.channel.send(`Left **${message.member.voice.channel.name}**`);
    }

    if (command === "ping") {
        const msg = await message.channel.send(`Pinging...`);
        return msg.edit(`Pong! (Latency: ${msg.createdTimestamp - message.createdTimestamp}ms. API Latency: ${Math.round(client.ws.ping)}ms.)`);
    }

    if (command === "support") {
        return message.channel.send(`https://discord.gg/DaXPp8C`);
    }

    if (command === "invite") {
        return message.channel.send(`https://discordapp.com/oauth2/authorize?client_id=697917836953255956&scope=bot&permissions=36826112`);
    }

    if (command === "stats") {
        const msg = await message.channel.send(`Gathering stats...`);
        const totalSeconds = process.uptime();
        const realTotalSecs = Math.floor(totalSeconds % 60);
        const days = Math.floor((totalSeconds % 31536000) / 86400);
        const hours = Math.floor((totalSeconds / 3600) % 24);
        const mins = Math.floor((totalSeconds / 60) % 60);

        const promises = [
            client.shard.fetchClientValues('guilds.cache.size'),
            client.shard.broadcastEval('this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)'),
        ];

        const shardInfo = await client.shard.broadcastEval(`[
			this.shard.ids,
			this.shard.mode,
			this.guilds.cache.size,
			this.channels.cache.size,
			this.users.cache.size,
			(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
			this.music.players.size,
			this.ws.ping
		  ]`);

        let totalMusicStreams = 0;
        shardInfo.forEach(i => {
            totalMusicStreams += i[6];
        });

        Promise.all(promises)
            .then(results => {
                const totalGuilds = results[0].reduce((prev, guildCount) => prev + guildCount, 0);
                const totalMembers = results[1].reduce((prev, memberCount) => prev + memberCount, 0);

                let totalMemory = 0;
                shardInfo.forEach(s => totalMemory += parseInt(s[5]));
                let avgLatency = 0;
                shardInfo.forEach(s => avgLatency += s[7]);
                avgLatency = avgLatency / shardInfo.length;

                cpuStat.usagePercent(function (err, percent) {
                    const statsEmbed = new Discord.MessageEmbed()
                        .setAuthor('Discordwave', client.user.displayAvatarURL())
                        .setColor(embedColor)
                        .setThumbnail(client.user.avatarURL())
                        .addField('Born On', client.user.createdAt)
                        .addField('Servers', `${totalGuilds} servers`, true)
                        .addField('Members', `${totalMembers} members`, true)
                        .addField('Shards', `${parseInt(client.shard.ids) + 1}/${client.shard.count}`, true)
                        .addField('Memory Used', `${totalMemory.toFixed(2)} mb`, true)
                        .addField('CPU usage', `${percent.toFixed(2)}%`, true)
                        .addField('Music Streams', `${totalMusicStreams} stream(s)`, true)
                        .addField('Uptime', `\`\`\`${days} days, ${hours} hours, ${mins} minutes, and ${realTotalSecs} seconds\`\`\``)
                        .setFooter(`Latency ${msg.createdTimestamp - message.createdTimestamp}ms`)
                        .setTimestamp();
                    return msg.edit('', statsEmbed);
                });
            })
            .catch(console.error);
    }

    if (command === "help" || command === "commands") {
        let commands = `
**List of available commands**
Type %<command> to use a command. 

**invite** - sends the bot's invite link
**join** - joins the voice channel
**leave** - leaves the voice channel
**ping** - shows the bot's latency
**play** - joins your voice channel and plays vaporwave 24/7

Need more help? Join the support server: https://discord.gg/DaXPp8C
`

        message.channel.send(commands);
    }
});

client.login(token);
