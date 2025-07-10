import {
  Client,
  GatewayIntentBits,
  SlashCommandBuilder,
  CommandInteraction,
  EmbedBuilder,
  VoiceChannel,
  GuildMember,
  ActivityType,
  ChatInputCommandInteraction,
} from "discord.js";
import {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  getVoiceConnection,
  AudioPlayer,
  StreamType,
} from "@discordjs/voice";
import { config } from "dotenv";

// Load environment variables
config();

// Configuration interface
interface Config {
  token: string;
  clientId: string;
  guildId?: string;
}

// Load configuration from environment variables
const botConfig: Config = {
  token: process.env.DISCORD_TOKEN || "",
  clientId: process.env.DISCORD_CLIENT_ID || "",
  guildId: process.env.DISCORD_GUILD_ID || undefined,
};

// Validate required environment variables
if (!botConfig.token) {
  console.error("❌ DISCORD_TOKEN environment variable is required!");
  process.exit(1);
}

if (!botConfig.clientId) {
  console.error("❌ DISCORD_CLIENT_ID environment variable is required!");
  process.exit(1);
}

// Create Discord client
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessages,
  ],
});

// Audio player instance
let audioPlayer: AudioPlayer | null = null;

// Vaporwave radio URL
const RADIO_URL = "http://radio.plaza.one/ogg";

// Commands
const commands = [
  new SlashCommandBuilder()
    .setName("play")
    .setDescription("Play the vaporwave radio station"),

  new SlashCommandBuilder()
    .setName("join")
    .setDescription("Join your voice channel"),

  new SlashCommandBuilder()
    .setName("leave")
    .setDescription("Leave the voice channel"),

  new SlashCommandBuilder().setName("ping").setDescription("Show bot latency"),

  new SlashCommandBuilder()
    .setName("stats")
    .setDescription("Show bot statistics"),

  new SlashCommandBuilder()
    .setName("help")
    .setDescription("Show available commands"),
];

// Register commands
async function registerCommands() {
  try {
    console.log("Started refreshing application (/) commands.");

    const { REST, Routes } = require("discord.js");
    const rest = new REST({ version: "10" }).setToken(botConfig.token);

    if (botConfig.guildId) {
      // Guild commands (faster for development)
      await rest.put(
        Routes.applicationGuildCommands(botConfig.clientId, botConfig.guildId),
        { body: commands }
      );
    } else {
      // Global commands
      await rest.put(Routes.applicationCommands(botConfig.clientId), {
        body: commands,
      });
    }

    console.log("Successfully reloaded application (/) commands.");
  } catch (error) {
    console.error("Error registering commands:", error);
  }
}

// Bot ready event
client.once("ready", async () => {
  console.log(`✨ ${client.user?.tag} is ready!`);

  // Set bot status
  client.user?.setActivity("vaporwave radio", { type: ActivityType.Listening });

  // Register commands
  await registerCommands();
});

// Command interaction handler
client.on("interactionCreate", async (interaction) => {
  if (!interaction.isChatInputCommand()) return;

  const { commandName } = interaction;

  try {
    switch (commandName) {
      case "play":
        await handlePlayCommand(interaction);
        break;
      case "join":
        await handleJoinCommand(interaction);
        break;
      case "leave":
        await handleLeaveCommand(interaction);
        break;
      case "ping":
        await handlePingCommand(interaction);
        break;
      case "stats":
        await handleStatsCommand(interaction);
        break;
      case "help":
        await handleHelpCommand(interaction);
        break;
      default:
        await interaction.reply({
          content: "❌ Unknown command!",
          ephemeral: true,
        });
    }
  } catch (error) {
    console.error("Error handling command:", error);
    const errorEmbed = new EmbedBuilder()
      .setColor("#FF0000")
      .setDescription("❌ An error occurred while executing this command!");

    if (interaction.replied || interaction.deferred) {
      await interaction.followUp({ embeds: [errorEmbed], ephemeral: true });
    } else {
      await interaction.reply({ embeds: [errorEmbed], ephemeral: true });
    }
  }
});

// Command handlers
async function handlePlayCommand(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel;

  if (!voiceChannel) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ You need to be in a voice channel to play music!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (!voiceChannel.joinable) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ I cannot join that voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const existingConnection = getVoiceConnection(interaction.guildId!);
  if (existingConnection && audioPlayer) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("🎵 Already playing vaporwave radio!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  try {
    const connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId!,
      adapterCreator: interaction.guild!.voiceAdapterCreator,
    });

    audioPlayer = createAudioPlayer();
    const resource = createAudioResource(RADIO_URL, {
      inputType: StreamType.OggOpus,
    });

    connection.subscribe(audioPlayer);
    audioPlayer.play(resource);

    // Handle connection events
    connection.on(VoiceConnectionStatus.Disconnected, () => {
      audioPlayer = null;
    });

    audioPlayer.on(AudioPlayerStatus.Playing, () => {
      console.log("🎵 Audio player is now playing!");
    });

    audioPlayer.on("error", (error) => {
      console.error("Audio player error:", error);
    });

    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription(
        "🎵 Now playing **vaporwave radio** in your voice channel!"
      );
    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error playing audio:", error);
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription(
        "❌ Sorry, the vaporwave radio is currently down. Please try again later!"
      );

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleJoinCommand(interaction: ChatInputCommandInteraction) {
  const member = interaction.member as GuildMember;
  const voiceChannel = member.voice.channel as VoiceChannel;

  if (!voiceChannel) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ You need to be in a voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  if (!voiceChannel.joinable) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ I cannot join that voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  const existingConnection = getVoiceConnection(interaction.guildId!);
  if (existingConnection) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("🔊 Already connected to a voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  try {
    joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: interaction.guildId!,
      adapterCreator: interaction.guild!.voiceAdapterCreator,
    });

    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription(`🔊 Joined voice channel **${voiceChannel.name}**!`)
      .setFooter({ text: "Use /play to start the vaporwave radio!" });

    await interaction.reply({ embeds: [embed] });
  } catch (error) {
    console.error("Error joining voice channel:", error);
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ Failed to join the voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
}

async function handleLeaveCommand(interaction: ChatInputCommandInteraction) {
  const connection = getVoiceConnection(interaction.guildId!);

  if (!connection) {
    const embed = new EmbedBuilder()
      .setColor("#FF6AD5")
      .setDescription("❌ I'm not connected to any voice channel!");

    await interaction.reply({ embeds: [embed], ephemeral: true });
    return;
  }

  connection.destroy();
  audioPlayer = null;

  const embed = new EmbedBuilder()
    .setColor("#FF6AD5")
    .setDescription("👋 Left the voice channel!");

  await interaction.reply({ embeds: [embed] });
}

async function handlePingCommand(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor("#FF6AD5")
    .setDescription(`🏓 Pong! **${client.ws.ping}ms**`);

  await interaction.reply({ embeds: [embed] });
}

async function handleStatsCommand(interaction: ChatInputCommandInteraction) {
  const uptime = process.uptime();
  const uptimeStr =
    Math.floor(uptime / 3600) + "h " + Math.floor((uptime % 3600) / 60) + "m";
  const memoryUsage = (process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2);

  const embed = new EmbedBuilder()
    .setColor("#FF6AD5")
    .setTitle("📊 Bot Statistics")
    .addFields(
      { name: "⏰ Uptime", value: uptimeStr, inline: true },
      { name: "🧠 Memory Usage", value: `${memoryUsage}MB`, inline: true },
      { name: "🏓 Ping", value: `${client.ws.ping}ms`, inline: true },
      {
        name: "🏠 Servers",
        value: client.guilds.cache.size.toString(),
        inline: true,
      },
      {
        name: "👥 Users",
        value: client.users.cache.size.toString(),
        inline: true,
      },
      { name: "🎵 Playing", value: audioPlayer ? "Yes" : "No", inline: true }
    )
    .setFooter({ text: "Vaporwave Bot v2.0" });

  await interaction.reply({ embeds: [embed] });
}

async function handleHelpCommand(interaction: ChatInputCommandInteraction) {
  const embed = new EmbedBuilder()
    .setColor("#FF6AD5")
    .setTitle("🎵 Vaporwave Bot Commands")
    .setDescription("A modern Discord bot for playing vaporwave radio!")
    .addFields(
      { name: "/play", value: "Play the vaporwave radio station" },
      { name: "/join", value: "Join your voice channel" },
      { name: "/leave", value: "Leave the voice channel" },
      { name: "/ping", value: "Show bot latency" },
      { name: "/stats", value: "Show bot statistics" },
      { name: "/help", value: "Show this help message" }
    );

  await interaction.reply({ embeds: [embed] });
}

// Error handling
process.on("unhandledRejection", (error) => {
  console.error("Unhandled promise rejection:", error);
});

process.on("uncaughtException", (error) => {
  console.error("Uncaught exception:", error);
  process.exit(1);
});

// Login to Discord
client.login(botConfig.token).catch((error) => {
  console.error("Failed to login:", error);
  process.exit(1);
});
