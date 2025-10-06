const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const config = require('./settings.json');
const express = require('express');

const app = express();
app.get('/', (req, res) => {
  res.send('Enhanced AFK Bot Running');
});
app.listen(8000, () => {
  console.log('Web server started on port 8000');
});

// Enhanced global variables
let bot = null;
let isConnecting = false;
let reconnectTimeout = null;
let consecutiveFailures = 0;
let lastSuccessfulConnection = 0;
let connectionStartTime = 0;

// Enhanced cleanup function
function cleanup() {
  if (reconnectTimeout) {
    clearTimeout(reconnectTimeout);
    reconnectTimeout = null;
  }
  
  if (bot) {
    try {
      bot.removeAllListeners();
      if (bot._client) {
        bot._client.removeAllListeners();
        if (bot._client.socket) {
          bot._client.socket.destroy();
        }
      }
    } catch (error) {
      // Ignore cleanup errors
    }
    bot = null;
  }
  
  isConnecting = false;
}

// Enhanced server status check including Aternos sleep detection
function checkServerStatus() {
  return new Promise((resolve) => {
    const net = require('net');
    const socket = new net.Socket();
    
    const timeout = setTimeout(() => {
      socket.destroy();
      console.log('[SERVER] Connection timeout - server might be sleeping (Aternos)');
      resolve(false);
    }, 8000); // Longer timeout for Aternos
    
    socket.connect(config.server.port, config.server.ip, () => {
      clearTimeout(timeout);
      socket.destroy();
      console.log('[SERVER] Port is open - server appears online');
      resolve(true);
    });
    
    socket.on('error', (error) => {
      clearTimeout(timeout);
      socket.destroy();
      console.log(`[SERVER] Connection error: ${error.code || error.message}`);
      resolve(false);
    });
  });
}

// Enhanced bot creation with better error handling
async function createBot() {
  if (isConnecting) return;
  isConnecting = true;
  connectionStartTime = Date.now();
  
  // Check server status first
  console.log('[CHECK] Checking server status...');
  const serverOnline = await checkServerStatus();
  
  if (!serverOnline) {
    console.log('[SERVER] Server appears offline or unreachable');
    isConnecting = false;
    scheduleReconnect(Math.min(60000 + (consecutiveFailures * 30000), 300000)); // Max 5 minutes
    return;
  }
  
  console.log('[SERVER] Server is reachable, connecting...');
  
  try {
    console.log(`[CONNECT] Attempting connection as '${config['bot-account']['username']}' to ${config.server.ip}:${config.server.port}`);
    
    bot = mineflayer.createBot({
      username: config['bot-account']['username'],
      password: config['bot-account']['password'],
      auth: config['bot-account']['type'],
      host: config.server.ip,
      port: config.server.port,
      version: config.server.version,
      keepAlive: true,
      checkTimeoutInterval: 45000, // Longer for Aternos
      timeout: 45000,
      skipValidation: true,
      hideErrors: false,
      // Add more resilient settings for Aternos
      viewDistance: 'tiny',
      chatLengthLimit: 100
    });

    // Load pathfinder plugin for accurate movement
    bot.loadPlugin(pathfinder);

    // Connection timeout handler
    const connectionTimeout = setTimeout(() => {
      console.log('[TIMEOUT] Connection taking too long, aborting...');
      if (bot && bot._client) {
        bot._client.end();
      }
      isConnecting = false;
      scheduleReconnect();
    }, 20000); // 20 second total timeout

    // Login success
    bot.on('login', () => {
      clearTimeout(connectionTimeout);
      console.log('[SUCCESS] Bot logged in successfully!');
      consecutiveFailures = 0; // Reset failure counter
      lastSuccessfulConnection = Date.now();
      isConnecting = false;
    });

    // Spawn success
    bot.once('spawn', () => {
      const connectionTime = Date.now() - connectionStartTime;
      console.log(`[AFK] Bot joined server - Movement system ready (connected in ${connectionTime}ms)`);
      
      // Initialize pathfinder movements
      const mcData = require('minecraft-data')(bot.version);
      const defaultMove = new Movements(bot, mcData);
      bot.pathfinder.setMovements(defaultMove);
      
      console.log('[MOVEMENT] Pathfinder initialized - Bot can move accurately');
      
      // Only do auto-auth if enabled
      if (config.utils['auto-auth'].enabled) {
        const password = config.utils['auto-auth'].password;
        console.log('[AUTH] Attempting auto-auth...');
        
        setTimeout(() => {
          if (bot && bot._client && bot._client.state === 'play') {
            bot.chat(`/register ${password} ${password}`);
          }
        }, 3000);
        
        setTimeout(() => {
          if (bot && bot._client && bot._client.state === 'play') {
            bot.chat(`/login ${password}`);
          }
        }, 6000);
      }
    });

    // Movement command handler
    bot.on('chat', (username, message) => {
      if (username === bot.username) return;
      
      // Log chat
      console.log(`[CHAT] <${username}> ${message}`);
      
      // Movement commands
      const args = message.split(' ');
      const command = args[0].toLowerCase();
      
      try {
        // Go to coordinates: !goto x y z
        if (command === '!goto' && args.length === 4) {
          const x = parseInt(args[1]);
          const y = parseInt(args[2]);
          const z = parseInt(args[3]);
          
          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            console.log(`[MOVE] Going to coordinates (${x}, ${y}, ${z})`);
            bot.pathfinder.setGoal(new goals.GoalBlock(x, y, z));
            bot.chat(`Bergerak ke (${x}, ${y}, ${z})`);
          }
        }
        
        // Follow player: !follow <playername>
        else if (command === '!follow' && args.length === 2) {
          const targetPlayer = bot.players[args[1]];
          if (targetPlayer && targetPlayer.entity) {
            console.log(`[MOVE] Following player: ${args[1]}`);
            bot.pathfinder.setGoal(new goals.GoalFollow(targetPlayer.entity, 2), true);
            bot.chat(`Mengikuti ${args[1]}`);
          } else {
            bot.chat(`Player ${args[1]} tidak ditemukan`);
          }
        }
        
        // Come to player: !come
        else if (command === '!come') {
          const player = bot.players[username];
          if (player && player.entity) {
            console.log(`[MOVE] Coming to ${username}`);
            const pos = player.entity.position;
            bot.pathfinder.setGoal(new goals.GoalNear(pos.x, pos.y, pos.z, 1));
            bot.chat(`Datang ke ${username}`);
          }
        }
        
        // Stop movement: !stop
        else if (command === '!stop') {
          console.log('[MOVE] Stopping movement');
          bot.pathfinder.setGoal(null);
          bot.chat('Berhenti bergerak');
        }
        
        // Get current position: !pos
        else if (command === '!pos') {
          const pos = bot.entity.position;
          bot.chat(`Posisi: (${Math.floor(pos.x)}, ${Math.floor(pos.y)}, ${Math.floor(pos.z)})`);
          console.log(`[POS] Current position: (${pos.x}, ${pos.y}, ${pos.z})`);
        }
        
        // Help command: !help
        else if (command === '!help') {
          bot.chat('Perintah: !goto x y z | !follow nama | !come | !stop | !pos');
        }
      } catch (error) {
        console.log(`[MOVE-ERROR] ${error.message}`);
      }
    });

    // Pathfinder goal reached
    bot.on('goal_reached', (goal) => {
      console.log('[MOVE] Goal reached!');
    });

    // Handle disconnection with better logging
    bot.on('end', (reason) => {
      clearTimeout(connectionTimeout);
      const connectionDuration = Date.now() - connectionStartTime;
      console.log(`[DISCONNECT] Bot disconnected after ${connectionDuration}ms: ${reason || 'unknown'}`);
      
      // Check if this was an immediate disconnect (might indicate server issue)
      if (connectionDuration < 5000) {
        console.log('[ANALYSIS] Very quick disconnect - server might be rejecting connection');
      }
      
      consecutiveFailures++;
      isConnecting = false;
      scheduleReconnect();
    });

    // Handle kicks
    bot.on('kicked', (reason) => {
      clearTimeout(connectionTimeout);
      console.log(`[KICKED] ${reason}`);
      consecutiveFailures++;
      isConnecting = false;
      
      // Longer wait for kicks
      scheduleReconnect(Math.min(60000 + (consecutiveFailures * 30000), 300000));
    });

    // Handle errors
    bot.on('error', (error) => {
      clearTimeout(connectionTimeout);
      console.log(`[ERROR] ${error.message}`);
      consecutiveFailures++;
      isConnecting = false;
      scheduleReconnect();
    });

    // Simple death handling
    bot.on('death', () => {
      console.log('[DEATH] Bot died and respawned');
    });

    // Handle spawn timeout
    setTimeout(() => {
      if (bot && bot._client && bot._client.state !== 'play') {
        console.log('[SPAWN-TIMEOUT] Bot failed to spawn within reasonable time');
        bot._client.end();
      }
    }, 30000);

  } catch (error) {
    console.log(`[CREATE-ERROR] Failed to create bot: ${error.message}`);
    isConnecting = false;
    consecutiveFailures++;
    scheduleReconnect();
  }
}

// Enhanced reconnection scheduler with exponential backoff and Aternos-friendly delays
function scheduleReconnect(customDelay = null) {
  cleanup();
  
  // Calculate delay with exponential backoff
  let delay = customDelay;
  if (!delay) {
    // Longer base delay for Aternos: 60 seconds, increases with failures
    delay = Math.min(60000 + (consecutiveFailures * 30000), 600000); // Max 10 minutes
  }
  
  console.log(`[RECONNECT] Reconnecting in ${delay/1000} seconds (failures: ${consecutiveFailures})`);
  
  // Add advice for high failure counts
  if (consecutiveFailures >= 5) {
    console.log('[ADVICE] High failure count - server might be offline or sleeping');
    console.log('[ADVICE] Aternos servers sleep when no players are online');
  }
  
  reconnectTimeout = setTimeout(() => {
    reconnectTimeout = null;
    createBot();
  }, delay);
}

// Start the bot
console.log('[INIT] Starting Simple AFK Bot...');
createBot();

// Simple health check every 5 minutes
setInterval(() => {
  if (bot && bot._client && bot._client.state === 'play') {
    console.log('[HEALTH] Bot is healthy and connected');
  } else if (!isConnecting) {
    console.log('[HEALTH] Bot appears disconnected, attempting reconnect');
    scheduleReconnect();
  }
}, 300000); // 5 minutes

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('[SHUTDOWN] Gracefully shutting down...');
  cleanup();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('[SHUTDOWN] Gracefully shutting down...');
  cleanup();
  process.exit(0);
});
