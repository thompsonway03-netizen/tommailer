const fs = require("fs");
const { execSync } = require("child_process");
const path = require("path");

console.log("Starting AutoFix v9ja0.1...");

// Ensure electron folder exists
if (!fs.existsSync("electron")) {
  fs.mkdirSync("electron");
  console.log("Created electron folder");
}

// Create main.js
const mainPath = path.join("electron", "main.js");

fs.writeFileSync(
  mainPath,
  `
const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  win.loadFile(path.join(__dirname, "../dist/index.html"));
}

app.whenReady().then(createWindow);
`
);

console.log("Created electron/main.js");

// Install dependencies
execSync("npm install", { stdio: "inherit" });

// Build React
execSync("npx vite build", { stdio: "inherit" });

// Build Installer
execSync("npx electron-builder --win nsis", { stdio: "inherit" });

console.log("AutoFix Complete!");