import { spawn, exec } from "child_process";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Resolve backend and frontend directories
let baseDir = __dirname;
if (!fs.existsSync(path.join(baseDir, "backend")) && fs.existsSync(path.join(baseDir, "ai-interview-platform", "backend"))) {
  baseDir = path.join(baseDir, "ai-interview-platform");
}

const backendDir = path.join(baseDir, "backend");
const frontendDir = path.join(baseDir, "frontend");

console.log("=========================================");
console.log("   AI Interview Platform - Unified Runner");
console.log("=========================================");
console.log(`Backend  : ${backendDir}`);
console.log(`Frontend : ${frontendDir}\n`);

const isWin = process.platform === "win32";
const npmCmd = isWin ? "npm.cmd" : "npm";

function startProcess(name, cmd, args, cwd, colorPrefix) {
  const proc = spawn(cmd, args, {
    cwd,
    stdio: ["ignore", "pipe", "pipe"],
    shell: isWin
  });

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        console.log(`${colorPrefix}[${name}]${"\x1b[0m"} ${line}`);
      }
    }
  });

  proc.stderr.on("data", (data) => {
    const lines = data.toString().split(/\r?\n/);
    for (const line of lines) {
      if (line.trim()) {
        console.error(`${colorPrefix}[${name} ERR]${"\x1b[0m"} ${line}`);
      }
    }
  });

  proc.on("close", (code) => {
    console.log(`${colorPrefix}[${name}]${"\x1b[0m"} Process exited with code ${code}`);
  });

  return proc;
}

// Start backend
const backendProc = startProcess("BACKEND", npmCmd, ["run", "dev"], backendDir, "\x1b[36m");

// Start frontend
const frontendProc = startProcess("FRONTEND", npmCmd, ["run", "dev"], frontendDir, "\x1b[35m");

// Open browser after 2 seconds
setTimeout(() => {
  console.log("\n\x1b[32m✔ Both Backend and Frontend are running together!\x1b[0m");
  console.log("\x1b[32m✔ Opening http://localhost:5173 in browser...\x1b[0m\n");
  const openCmd = isWin ? 'start "" "http://localhost:5173"' : process.platform === "darwin" ? 'open "http://localhost:5173"' : 'xdg-open "http://localhost:5173"';
  exec(openCmd);
}, 2500);

function cleanup() {
  console.log("\nStopping all services...");
  try {
    if (isWin) {
      if (backendProc.pid) exec(`taskkill /pid ${backendProc.pid} /T /F`);
      if (frontendProc.pid) exec(`taskkill /pid ${frontendProc.pid} /T /F`);
    } else {
      backendProc.kill();
      frontendProc.kill();
    }
  } catch (e) {}
  process.exit(0);
}

process.on("SIGINT", cleanup);
process.on("SIGTERM", cleanup);
