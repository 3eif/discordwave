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
