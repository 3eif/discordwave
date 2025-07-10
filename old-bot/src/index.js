const { ShardingManager } = require("discord.js");
const { token } = require("../config.json");

const manager = new ShardingManager(
  require("path").join(process.cwd(), "src", "discordwave.js"),
  {
    token: token,
    timeout: 999999,
  }
);

manager.on("launch", (shard) => {
  console.log(`Shard [${shard.id}] launched`);
  shard
    .on("death", () => console.log(`Shard [${shard.id}] died`))
    .on("ready", () => console.log(`Shard [${shard.id}] ready`))
    .on("disconnect", () => console.log(`Shard [${shard.id}] disconnected`))
    .on("reconnecting", () => console.log(`Shard [${shard.id}] reconnecting`));
});

manager.spawn().catch((err) => console.log(err));

manager.on("launch", (shard) => console.log(`Launched shard ${shard.id}`));
manager.on("message", (msg) => console.log(`Message from shard: ${msg}`));
