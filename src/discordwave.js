const { Client, MessageEmbed } = require("discord.js");
const { Manager } = require("lavaclient");
const { inspect } = require("util");

const { nodes, token, prefix, owners } = require("../config.json");

const client = new Client({
  disableMentions: "everyone",
  messageCacheMaxSize: 50,
  messageCacheLifetime: 60,
  messageSweepInterval: 120,
  partials: ["MESSAGE", "CHANNEL"],
  ws: {
    intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
  },
});

client.music = new Manager(nodes, {
  shards: client.shard ? client.shard.count : 1,
  send(id, payload) {
    const guild = client.guilds.cache.get(id);
    if (guild) guild.shard.send(payload);
    return;
  },
});

client.ws
  .on("VOICE_SERVER_UPDATE", (pk) => client.music.serverUpdate(pk))
  .on("VOICE_STATE_UPDATE", (pk) => client.music.stateUpdate(pk));

client.once("ready", () => {
  if (client.shard.ids[0] === 0)
    console.log(`${client.user.username} is ready.`);

  client.music.init(client.user.id);

  for (const shard of client.shard.ids) {
    client.user.setStatus("dnd");
    client.user.setActivity(
      `${prefix}help - Shard ${shard}/${client.shard.count}`
    );
  }
});

client.on("message", async (message) => {
  if (message.author.bot || !message.content.startsWith(prefix.toLowerCase()))
    return;

  const [cmd, ...args] = message.content
    .toLowerCase()
    .slice(prefix.length)
    .trim()
    .split(/ +/g);

  if (!cmd) return;

  switch (cmd) {
    case "help":
      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setAuthor(
            `Command List`,
            message.author.displayAvatarURL({ dynamic: true })
          )
          .setDescription([
            `Hello! Welcome to Discordwave! Take a look at my commands!\n`,
            `\`${prefix}invite :\` | Gives you the bot invite link.`,
            `\`${prefix}ping   :\` | Displays the client's latency.`,
            `\`${prefix}play   :\` | Plays the vaporwave station`,
            `\`${prefix}leave  :\` | Leaves the voice channel.`,
            `\`${prefix}join   :\` | Joins the bot in your voice channel.`,
            `\`${prefix}stats  :\` | View the bot statisics`,
          ])
      );
      break;

    case "ping":
      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setDescription(`Pong! **${client.ws.ping}ms**`)
      );
      break;

    case "play":
      const { channel } = message.member.voice;
      if (!channel || !channel.joinable)
        return message.channel.send(
          `You either aren't in a voice channel, or I cannot join that voice channel.`
        );

      const player = await client.music.create(message.guild.id);
      if (player && player.playing)
        return message.channel.send(
          "I'm already playing vaporwave in a channel."
        );

      const { tracks } = await client.music.search(
        "http://radio.plaza.one/ogg"
      );

      if (!tracks.length)
        return message.channel.send(
          `Seems that the vaporwave radio is down. Check back later.`
        );

      if (!player.connected) await player.connect(channel.id, { deaf: true });
      await player.play(tracks[0].track);

      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setDescription(
            `Now playing [vaporwave](http://radio.plaza.one) in your voice channel!`
          )
      );

      player.on("end", async () => player.play(tracks[0].track));
      break;

    case "join":
      const { channel: vc } = message.member.voice;
      if (!vc || !vc.joinable)
        return message.channel.send(
          `You either aren't in a voice channel, or I cannot join that voice channel.`
        );

      const p = await client.music.create(message.guild.id);
      if (p && p.playing)
        return message.channel.send(
          "I'm already playing vaporwave in a channel."
        );

      if (p.connected)
        return message.channel.send(
          new MessageEmbed()
            .setColor("#FF6AD5")
            .setDescription(`I'm already connected to a voice channel!`)
        );

      await p.connect(vc.id, { deaf: true });

      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setDescription(`Joined the voice channel \`${vc.name}\``)
      );
      break;

    case "leave":
      const { channel: ch } = message.member.voice;
      if (!ch) return message.channel.send(`You aren't in a voice channel.`);

      const plr = await client.music.players.get(message.guild.id);
      if (!plr)
        return message.channel.send(
          `How am I supposed to leave the voice channel if I'm not even in one?`
        );

      if (plr.channel !== ch.id)
        return message.channel.send(
          `You cannot disconenct the player while being in another channel!`
        );

      await client.music.destroy(plr.guild);

      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setDescription(`Alright, I've now left the voice channel.`)
      );
      break;

    case "invite":
      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setDescription([
            `Thank you for being interesting in inviting me! Here is my [invite link](${await client.generateInvite(
              0
            )})`,
          ])
      );
      break;

    case "stats":
      message.channel.send(
        new MessageEmbed()
          .setColor("#FF6AD5")
          .setAuthor(
            `Information`,
            client.user.displayAvatarURL({ dynamic: true })
          )
          .setDescription([
            `\`Uptime   :\` | ${require("ms")(client.uptime)}`,
            `\`CPU      :\` | ${
              require("os").cpus()[0].speed.toFixed(2) / 1000
            }%`,
            `\`Memory   :\` | ${(
              process.memoryUsage().heapUsed /
              1024 /
              1024
            ).toFixed(2)}mbs`,
            `\`Servers  :\` | ${await client.shard.broadcastEval(
              `this.guilds.cache.size`
            )} guilds`,
            `\`Users    :\` | ${await client.shard.broadcastEval(
              `this.users.cache.size`
            )} users`,
          ])
      );
      break;

    case "eval":
      if (!owners.includes(message.author.id))
        return message.channel.send(
          `I'm afriad you gotta be an owner to run this command cheif.`
        );

      if (!args.length)
        return message.channel.send(`You gotta eval atleast something.`);

      try {
        let hr = process.hrtime();
        let data = inspect(eval(args.join(" ")), false, 0).replace(
          client.token,
          "[redacted]"
        );
        hr = process.hrtime(hr);

        return message.channel.send([
          `Executed in ${hr[0] > 0 ? `${hr[0]}s ` : ""}${hr[1] / 1000000}ms`,
          `\`\`\`js\n${data.substring(0, 1950)}\`\`\``,
        ]);
      } catch (error) {
        return message.channel.send(
          `Error:\n\`\`\`js\n${error.toString().substring(0, 1950)}\`\`\``
        );
      }
  }
});

client.login(token).catch(() => console.log("Invalid token!"));
// const Discord = require("discord.js");
// const cpuStat = require("cpu-stat");
// const { ErelaClient } = require("erela.js");

// const { prefix, token, nodes } = require("./config.json");

// const client = new Discord.Client({
//   disableMentions: "everyone",
//   messageCacheMaxSize: 50,
//   messageCacheLifetime: 60,
//   messageSweepInterval: 120,
//   partials: ["MESSAGE", "CHANNEL"],
//   ws: {
//     intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_VOICE_STATES"],
//   },
// });

// client.log = (msg) => {
//   console.log(`[${new Date().toLocaleString()}] > ${msg}`);
// };
// const embedColor = "#FF6AD5";

// client.once("ready", () => {
//   client.user.setActivity("%vaporwave", { type: "LISTENING" });

//   client.music = new ErelaClient(client, nodes);
//   client.music.on("nodeError", (node, error) =>
//     console.log(`Node error: ${error.message}`)
//   );
//   client.music.on("queueEnd", (player) => {
//     client.music.players.destroy(player.guild.id);
//   });

//   if (client.shard.ids == client.shard.count - 1) {
//     const promises = [
//       client.shard.fetchClientValues("guilds.cache.size"),
//       client.shard.broadcastEval(
//         "this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)"
//       ),
//     ];

//     return Promise.all(promises).then(async (results) => {
//       const totalGuilds = results[0].reduce(
//         (prev, guildCount) => prev + guildCount,
//         0
//       );
//       const totalMembers = results[1].reduce(
//         (prev, memberCount) => prev + memberCount,
//         0
//       );
//       client.log(
//         `Discordwave is online: ${client.shard.count} shards, ${totalGuilds} servers and ${totalMembers} members.`
//       );
//     });
//   }
// });

// client.on("message", async (message) => {
//   if (!message.content.startsWith(prefix) || message.author.bot) return;

//   const args = message.content.slice(prefix.length).split(/ +/);
//   const command = args.shift().toLowerCase();

//   if (
//     command === "vaporwave" ||
//     command === "radio" ||
//     command === "join" ||
//     command === "play"
//   ) {
//     if (!message.member.voice.channel)
//       return message.channel.send(
//         "You must be in a voice channel to use this command"
//       );

//     const player = client.music.players.spawn({
//       guild: message.guild,
//       voiceChannel: message.member.voice.channel,
//       textChannel: message.channel,
//     });

//     if (player.playing) return message.channel.send("Already playing");

//     const permissions = message.member.voice.channel.permissionsFor(
//       client.user
//     );
//     if (!permissions.has("CONNECT"))
//       return message.channel.send(
//         "I do not have permission to join your voice channel."
//       );
//     if (!permissions.has("SPEAK"))
//       return message.channel.send(
//         "I do not have permission to speak in your voice channel."
//       );

//     const res = await client.music.search(
//       `http://radio.plaza.one/ogg`,
//       message.author
//     );
//     player.queue.add(res.tracks[0]);

//     let randomNum = Math.floor(Math.random() * 83 + 2);
//     if (randomNum < 10) randomNum = "0" + randomNum;
//     let randomGif = `https://plaza.one/img/backs/${randomNum}.gif`;

//     const embed = new Discord.MessageEmbed()
//       .setAuthor(client.user.username)
//       .setDescription("Playing Vaporwave Radio")
//       .setThumbnail(randomGif)
//       .setFooter("Powered by plaza.one")
//       .setColor(embedColor)
//       .setTimestamp();
//     message.channel.send(embed);

//     player.play();
//   }

//   if (
//     command === "stop" ||
//     command === "leave" ||
//     command === "dc" ||
//     command === "fuckoff"
//   ) {
//     if (!message.member.voice.channel)
//       return message.channel.send(
//         "You must be in a voice channel to use this command"
//       );

//     const player = client.music.players.get(message.guild.id);

//     if (player) {
//       client.music.players.destroy(player.guild.id);
//     } else {
//       message.member.voice.channel.leave();
//     }

//     return message.channel.send(
//       `Left **${message.member.voice.channel.name}**`
//     );
//   }

//   if (command === "ping") {
//     const msg = await message.channel.send(`Pinging...`);
//     return msg.edit(
//       `Pong! (Latency: ${
//         msg.createdTimestamp - message.createdTimestamp
//       }ms. API Latency: ${Math.round(client.ws.ping)}ms.)`
//     );
//   }

//   if (command === "support") {
//     return message.channel.send(`https://discord.gg/DaXPp8C`);
//   }

//   if (command === "invite") {
//     return message.channel.send(
//       `https://discordapp.com/oauth2/authorize?client_id=697917836953255956&scope=bot&permissions=36826112`
//     );
//   }

//   if (command === "stats") {
//     const msg = await message.channel.send(`Gathering stats...`);
//     const totalSeconds = process.uptime();
//     const realTotalSecs = Math.floor(totalSeconds % 60);
//     const days = Math.floor((totalSeconds % 31536000) / 86400);
//     const hours = Math.floor((totalSeconds / 3600) % 24);
//     const mins = Math.floor((totalSeconds / 60) % 60);

//     const promises = [
//       client.shard.fetchClientValues("guilds.cache.size"),
//       client.shard.broadcastEval(
//         "this.guilds.cache.reduce((prev, guild) => prev + guild.memberCount, 0)"
//       ),
//     ];

//     const shardInfo = await client.shard.broadcastEval(`[
// 			this.shard.ids,
// 			this.shard.mode,
// 			this.guilds.cache.size,
// 			this.channels.cache.size,
// 			this.users.cache.size,
// 			(process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2),
// 			this.music.players.size,
// 			this.ws.ping
// 		  ]`);

//     let totalMusicStreams = 0;
//     shardInfo.forEach((i) => {
//       totalMusicStreams += i[6];
//     });

//     Promise.all(promises)
//       .then((results) => {
//         const totalGuilds = results[0].reduce(
//           (prev, guildCount) => prev + guildCount,
//           0
//         );
//         const totalMembers = results[1].reduce(
//           (prev, memberCount) => prev + memberCount,
//           0
//         );

//         let totalMemory = 0;
//         shardInfo.forEach((s) => (totalMemory += parseInt(s[5])));
//         let avgLatency = 0;
//         shardInfo.forEach((s) => (avgLatency += s[7]));
//         avgLatency = avgLatency / shardInfo.length;

//         cpuStat.usagePercent(function (err, percent) {
//           const statsEmbed = new Discord.MessageEmbed()
//             .setAuthor("Discordwave", client.user.displayAvatarURL())
//             .setColor(embedColor)
//             .setThumbnail(client.user.avatarURL())
//             .addField("Born On", client.user.createdAt)
//             .addField("Servers", `${totalGuilds} servers`, true)
//             .addField("Members", `${totalMembers} members`, true)
//             .addField(
//               "Shards",
//               `${parseInt(client.shard.ids) + 1}/${client.shard.count}`,
//               true
//             )
//             .addField("Memory Used", `${totalMemory.toFixed(2)} mb`, true)
//             .addField("CPU usage", `${percent.toFixed(2)}%`, true)
//             .addField("Music Streams", `${totalMusicStreams} stream(s)`, true)
//             .addField(
//               "Uptime",
//               `\`\`\`${days} days, ${hours} hours, ${mins} minutes, and ${realTotalSecs} seconds\`\`\``
//             )
//             .setFooter(
//               `Latency ${msg.createdTimestamp - message.createdTimestamp}ms`
//             )
//             .setTimestamp();
//           return msg.edit("", statsEmbed);
//         });
//       })
//       .catch(console.error);
//   }

//   if (command === "help" || command === "commands") {
//     let commands = `
// **List of available commands**
// Type %<command> to use a command.

// **invite** - sends the bot's invite link
// **join** - joins the voice channel
// **leave** - leaves the voice channel
// **ping** - shows the bot's latency
// **play** - joins your voice channel and plays vaporwave 24/7

// Need more help? Join the support server: https://discord.gg/DaXPp8C
// `;

//     message.channel.send(commands);
//   }
// });

// client.login(token);
