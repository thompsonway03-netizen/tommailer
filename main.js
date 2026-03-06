const { app, BrowserWindow } = require("electron");
const path = require("path");

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
  });

  if (process.env.NODE_ENV === 'development') {
    win.loadURL('http://localhost:5173');
  } else {
    win.loadFile(path.join(__dirname, "dist", "index.html"));
  }
}

// Start the backend server (licensing / email) from the main process. This
// ensures the API endpoints exist automatically in both development and
// packaged builds so the renderer never reports "Server connection failed."
function startBackend() {
  try {
    const serverPath = path.join(__dirname, "server.js");
    const serverApp = require(serverPath);

    // If server.js doesn't auto-start when required, we might need to call something
    // but based on our change, it won't auto-start. Let's make it start explicitly if needed.
    const PORT = process.env.PORT || 3000;
    const server = serverApp.listen(PORT, "0.0.0.0", () => {
      console.log(`Backend server started on port ${PORT}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Backend server (port ${PORT}) already running.`);
      } else {
        console.error("Backend server error:", err);
      }
    });
  } catch (err) {
    console.error("Failed to start backend server:", err);
  }
}

app.whenReady().then(() => {
  startBackend();
  createWindow();
});

// Global error handling to catch main process crashes
process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception in main process:', error);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});