# 🌴 Vaporwave Bot v2.0

A modern Discord bot built with TypeScript that plays vaporwave radio using slash commands!

## ✨ Features

- 🎵 **Vaporwave Radio**: Stream continuous vaporwave music from Plaza radio
- ⚡ **Slash Commands**: Modern Discord interaction system
- 🎯 **TypeScript**: Full type safety and better development experience
- 🔊 **Voice Support**: High-quality audio streaming with Discord.js Voice
- 📊 **Statistics**: Bot performance and usage statistics
- 🎨 **Beautiful Embeds**: Aesthetic Discord message formatting

## 🚀 Commands

| Command  | Description                      |
| -------- | -------------------------------- |
| `/play`  | Play the vaporwave radio station |
| `/join`  | Join your voice channel          |
| `/leave` | Leave the voice channel          |
| `/ping`  | Show bot latency                 |
| `/stats` | Show bot statistics              |
| `/help`  | Show available commands          |

## 🛠️ Installation

### Prerequisites

- Node.js 18.0.0 or higher
- A Discord bot application (see setup below)

### Setup

1. **Clone the repository**

   ```bash
   git clone https://github.com/3eif/discordwave.git
   cd discordwave
   ```

2. **Install dependencies**

   ```bash
   npm install
   ```

3. **Configure the bot**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` with your bot credentials:

   ```env
   DISCORD_TOKEN=your_bot_token_here
   DISCORD_CLIENT_ID=your_application_id_here
   DISCORD_GUILD_ID=your_guild_id_here_optional
   ```

4. **Build the project**

   ```bash
   npm run build
   ```

5. **Start the bot**
   ```bash
   npm start
   ```

## 🔧 Development

For development with auto-reload:

```bash
npm run dev
```

To watch for TypeScript changes:

```bash
npm run watch
```

## 🤖 Discord Bot Setup

1. **Create a Discord Application**

   - Go to https://discord.com/developers/applications
   - Click "New Application"
   - Give your bot a name

2. **Create a Bot User**

   - Go to the "Bot" section
   - Click "Add Bot"
   - Copy the bot token for your config

3. **Get Application ID**

   - Go to "General Information"
   - Copy the "Application ID" for your config

4. **Bot Permissions**
   Your bot needs these permissions:

   - `Connect` - To join voice channels
   - `Speak` - To play audio
   - `Use Slash Commands` - To register and use commands
   - `Send Messages` - To send responses
   - `Embed Links` - To send rich embeds

5. **Invite the Bot**
   Use this URL template (replace `YOUR_CLIENT_ID`):
   ```
   https://discord.com/api/oauth2/authorize?client_id=YOUR_CLIENT_ID&permissions=3145728&scope=bot%20applications.commands
   ```

## 📁 Project Structure

```
discordwave/
├── src/
│   └── index.ts          # Main bot file
├── old-bot/              # Backup of original bot
├── dist/                 # Compiled JavaScript (generated)
├── .env                  # Environment variables (create from .env.example)
├── .env.example          # Environment variables template
├── package.json          # Dependencies and scripts
├── tsconfig.json         # TypeScript configuration
└── README.md            # This file
```

## 🎵 Audio Requirements

The bot uses the following audio libraries:

- `@discordjs/opus` - Audio encoding
- `@discordjs/voice` - Voice connection handling

These handle the audio streaming from the vaporwave radio station at `http://radio.plaza.one/ogg`.

## 🔍 Troubleshooting

### Common Issues

1. **Bot doesn't respond to commands**

   - Make sure the bot has the `applications.commands` scope
   - Check that your bot token is correct
   - Verify the bot is online in your Discord server

2. **Audio doesn't play**

   - Ensure the bot has `Connect` and `Speak` permissions
   - Check that you're in a voice channel the bot can join
   - Verify the radio station is online

3. **Commands not appearing**
   - Commands may take up to 1 hour to register globally
   - Use `DISCORD_GUILD_ID` in .env for faster testing (guild commands)
   - Check console for registration errors

### Debug Mode

For detailed logging, check the console output when running the bot.

## 🎨 Customization

### Changing the Radio Station

Edit the `RADIO_URL` constant in `src/index.ts`:

```typescript
const RADIO_URL = "your-radio-stream-url";
```

### Modifying Commands

Add new commands to the `commands` array and create corresponding handlers in the switch statement.

### Styling

Change the embed color by modifying the `.setColor('#FF6AD5')` calls throughout the code.

## 📝 License

This project is licensed under the ISC License - see the LICENSE file for details.

## 🙏 Credits

- **Original Bot**: Based on the original Discordwave bot
- **Radio Station**: Thanks to Plaza for the vaporwave radio stream
- **Discord.js**: For the amazing Discord library
- **TypeScript**: For making JavaScript better

## 🆕 What's New in v2.0

- ✅ **Complete rewrite** in TypeScript
- ✅ **Slash commands** instead of prefix commands
- ✅ **Modern Discord.js** (v14) with latest features
- ✅ **Environment variables** for secure configuration
- ✅ **Better error handling** and logging
- ✅ **Improved audio quality** with @discordjs/voice
- ✅ **Beautiful embeds** with emojis and formatting
- ✅ **Type safety** throughout the codebase
- ✅ **Modular structure** for easier maintenance
