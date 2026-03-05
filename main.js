const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  // In production the files will be located in the `dist` folder inside the
  // app's resources. Use a file:// URL so that relative asset paths are
  // respected and avoid potential issues when packaging with asar.
  const indexPath = path.join(__dirname, "dist", "index.html");
  win.loadURL(`file://${indexPath}`);
}

// Start the backend server (licensing / email) from the main process. This
// ensures the API endpoints exist automatically in both development and
// packaged builds so the renderer never reports "Server connection failed."
function startBackend() {
  try {
    const serverPath = path.join(__dirname, "server.js");
    require(serverPath);
    console.log("Backend server started");
  } catch (err) {
    console.error("Failed to start backend server:", err);
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});