import React, { useState, useEffect, useRef } from "react";
import {
  Shield,
  Mail,
  Settings,
  Terminal,
  Play,
  Square,
  RefreshCw,
  Key,
  User,
  Lock,
  CheckCircle2,
  AlertCircle,
  LogOut,
  Cpu,
  Plus,
  Trash2,
  Eye,
  EyeOff,
  Clock,
  Send
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// --- Types ---
interface Sender {
  id: string;
  host: string;
  port: string;
  user: string;
  pass: string;
}

interface Recipient {
  email: string;
  status: "pending" | "sending" | "sent" | "error";
  error?: string;
}

interface LogEntry {
  timestamp: string;
  type: "success" | "error" | "info";
  message: string;
}

export default function App() {
  const [isActivated, setIsActivated] = useState<boolean>(false);
  const [activationKey, setActivationKey] = useState<string>("");
  const [hwid, setHwid] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"automation" | "settings">("automation");
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [isSending, setIsSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [serverUrl, setServerUrl] = useState<string>(
    localStorage.getItem('mailforge_server') || ''
  );

  // SMTP Management
  const [senders, setSenders] = useState<Sender[]>([]);
  const [newSender, setNewSender] = useState<Omit<Sender, "id">>({ host: "", port: "587", user: "", pass: "" });
  const [showPassword, setShowPassword] = useState<boolean>(false);

  // Recipient Management
  const [recipients, setRecipients] = useState<Recipient[]>([]);
  const [recipientInput, setRecipientInput] = useState<string>("");

  // Content
  const [subject, setSubject] = useState<string>("Hello from MailForge");
  const [body, setBody] = useState<string>("This is an automated message.");
  const [replyTo, setReplyTo] = useState<string>("");

  const logEndRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    let storedHwid = localStorage.getItem("mailforge_hwid");
    if (!storedHwid) {
      storedHwid = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
      localStorage.setItem("mailforge_hwid", storedHwid);
    }
    setHwid(storedHwid);

    const savedKey = localStorage.getItem("mailforge_key");
    if (savedKey) {
      checkActivation(savedKey, storedHwid);
    }
  }, []);

  useEffect(() => {
    logEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const addLog = (message: string, type: "success" | "error" | "info" = "info") => {
    setLogs(prev => [...prev, {
      timestamp: new Date().toLocaleTimeString(),
      type,
      message
    }]);
  };

  const buildApiUrl = (path: string) => {
    let prefix = serverUrl ? serverUrl.trim().replace(/\/+$/, '') : "http://localhost:3000";
    const hasProtocol = /^https?:\/\//i.test(prefix);
    if (!hasProtocol && prefix) {
      const isLocalTarget =
        /^localhost(?::\d+)?$/i.test(prefix) ||
        /^(127\.0\.0\.1|0\.0\.0\.0)(:\d+)?$/.test(prefix) ||
        /^10\.\d{1,3}\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(prefix) ||
        /^192\.168\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(prefix) ||
        /^172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3}(:\d+)?$/.test(prefix);
      prefix = `${isLocalTarget ? "http" : "https"}://${prefix}`;
    }
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return prefix ? `${prefix}${normalizedPath}` : normalizedPath;
  };

  const apiFetch = (path: string, opts: RequestInit = {}) => {
    const url = buildApiUrl(path);
    console.log(`[API] Fetching: ${url}`);
    return fetch(url, opts);
  };

  const localApiFetch = (path: string, opts: RequestInit = {}) => {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    const url = `http://localhost:3000${normalizedPath}`;
    console.log(`[local-API] Fetching: ${url}`);
    return fetch(url, opts);
  };

  const checkActivation = async (key: string, id: string) => {
    const normalizedKey = key.trim().toUpperCase();

    // Hard-coded protection against default key
    if (normalizedKey === "7B725183DD") {
      localStorage.removeItem("mailforge_key");
      setIsActivated(false);
      setActivationKey("");
      setError("This is a default security key and cannot be used for activation.");
      return;
    }

    setError(null);
    try {
      const res = await apiFetch("/api/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: normalizedKey, hwid: id })
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "Server error");
        throw new Error(`Server returned ${res.status}: ${text}`);
      }

      const data = await res.json();
      if (data.status === "Success") {
        setIsActivated(true);
        setActivationKey(normalizedKey);
        localStorage.setItem("mailforge_key", normalizedKey);
      } else {
        localStorage.removeItem("mailforge_key");
        setError(`Activation Failed: ${data.status}`);
      }
    } catch (e: any) {
      console.error("Activation Error:", e);
      setError(`Connection Error: ${e.message}. Please check your Server URL.`);
    }
  };

  const handleActivate = () => {
    if (!activationKey) return;
    checkActivation(activationKey, hwid);
  };

  const handleTestConnection = async () => {
    setError(null);
    let msg = "";
    try {
      const res = await apiFetch("/api/health");
      const data = await res.json();
      if (res.ok) {
        msg = `Success! Connected to server. Status: ${data.status}`;
        addLog(msg, "success");
        alert(msg);
      } else {
        throw new Error(`HTTP ${res.status}`);
      }
    } catch (e: any) {
      msg = `Connection Failed: ${e.message}. Check your URL.`;
      setError(msg);
      alert(msg);
    }
  };

  const handleDeactivate = async () => {
    // If it's the blocked key, just clear everything locally
    if (activationKey === "7B725183DD") {
      setIsActivated(false);
      setActivationKey("");
      localStorage.removeItem("mailforge_key");
      addLog("Local state cleared for blocked key", "info");
      return;
    }

    try {
      const res = await apiFetch("/api/deactivate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: activationKey, hwid })
      });

      const data = await res.json();
      if (data.status === "Success" || data.status === "Invalid") {
        setIsActivated(false);
        setActivationKey("");
        localStorage.removeItem("mailforge_key");
        addLog("License deactivated or cleared locally", "info");
      }
    } catch (e) {
      // Even on connection error, let's allow the user to clear local state for troubleshooting
      setIsActivated(false);
      setActivationKey("");
      localStorage.removeItem("mailforge_key");
      addLog("Local state cleared manually", "info");
      alert("Connection failed. Local license cleared for troubleshooting.");
    }
  };


  const addSender = () => {
    if (!newSender.host || !newSender.user || !newSender.pass) return;
    setSenders([...senders, { ...newSender, id: crypto.randomUUID() }]);
    setNewSender({ host: "", port: "587", user: "", pass: "" });
    addLog(`Added sender: ${newSender.user}`, "success");
  };

  const removeSender = (id: string) => {
    setSenders(senders.filter(s => s.id !== id));
  };

  const importRecipients = () => {
    const emails = recipientInput.split(/[\n,]+/).map(e => e.trim()).filter(e => e.includes("@"));
    const newRecipients = emails.map(email => ({ email, status: "pending" as const }));
    setRecipients([...recipients, ...newRecipients]);
    setRecipientInput("");
    addLog(`Imported ${emails.length} recipients`, "success");
  };

  const startAutomation = async () => {
    // Auto-import if user forgot to click plus
    if (recipientInput.trim() && recipients.length === 0) {
      importRecipients();
    }

    if (senders.length === 0) {
      addLog("No senders configured. Please add at least one SMTP account.", "error");
      return;
    }

    const pendingCount = recipients.filter(r => r.status === "pending").length;
    if (pendingCount === 0) {
      addLog("No pending recipients found in the list.", "error");
      return;
    }

    setIsSending(true);
    addLog(`Starting automation sequence for ${pendingCount} recipients...`, "info");

    abortControllerRef.current = new AbortController();

    let senderIdx = 0;
    // Use a local flag because React state updates are asynchronous
    let active = true;

    for (let i = 0; i < recipients.length; i++) {
      if (!active) break;
      if (recipients[i].status !== "pending") continue;

      const recipient = recipients[i];
      const sender = senders[senderIdx % senders.length];
      senderIdx++;

      // Update UI status to 'sending'
      setRecipients(prev => prev.map((r, idx) => idx === i ? { ...r, status: "sending" } : r));
      addLog(`[${i + 1}/${recipients.length}] Sending to ${recipient.email} via ${sender.user}...`, "info");

      try {
        const payload: any = {
          senders: [sender],
          recipients: [recipient.email],
          subject,
          body
        };
        if (replyTo) payload.replyTo = replyTo;
        const res = await localApiFetch("/api/send-emails", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: abortControllerRef.current.signal
        });

        const data = await res.json();

        if (res.ok) {
          setRecipients(prev => prev.map((r, idx) => idx === i ? { ...r, status: "sent" } : r));
          addLog(`Successfully sent to ${recipient.email}`, "success");
        } else {
          throw new Error(data.message || "SMTP Error");
        }
      } catch (err: any) {
        if (err.name === 'AbortError') {
          active = false;
          break;
        }
        const apiUrl = "http://localhost:3000/api/send-emails";
        const message = err?.message === "Failed to fetch"
          ? `Network error (Failed to fetch). Check server reachability at ${apiUrl}.`
          : err.message;
        setRecipients(prev => prev.map((r, idx) => idx === i ? { ...r, status: "error", error: message } : r));
        addLog(`Failed to send to ${recipient.email}: ${message}`, "error");
      }

      // 60s Delay (except for the last one or if stopped)
      const isLast = i === recipients.length - 1 || recipients.slice(i + 1).every(r => r.status !== "pending");
      if (!isLast && active) {
        addLog("Waiting 60 seconds for next rotation...", "info");
        for (let s = 60; s > 0; s--) {
          // Check a ref or local variable for stop signal
          if (!abortControllerRef.current || abortControllerRef.current.signal.aborted) {
            active = false;
            break;
          }
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    setIsSending(false);
    addLog("Automation sequence completed", "info");
  };

  const testSmtp = async () => {
    if (!newSender.host || !newSender.user || !newSender.pass) {
      addLog("Please fill in SMTP details to test", "error");
      return;
    }
    addLog(`Testing connection for ${newSender.user}...`, "info");
    try {
      const res = await localApiFetch("/api/send-emails", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          senders: [newSender],
          recipients: [newSender.user], // Send to self
          subject: "MailForge Connection Test",
          body: "Your SMTP settings are correct."
        })
      });
      const data = await res.json();
      if (res.ok) {
        addLog("SMTP Connection Successful! Test email sent to yourself.", "success");
      } else {
        addLog(`SMTP Connection Failed: ${data.message}`, "error");
      }
    } catch (e) {
      const apiUrl = "http://localhost:3000/api/send-emails";
      addLog(`Connection failed. Verify SMTP fields and API endpoint (${apiUrl}).`, "error");
    }
  };

  const stopAutomation = () => {
    setIsSending(false);
    abortControllerRef.current?.abort();
    addLog("Automation stopped by user", "error");
  };

  if (!isActivated) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center p-4 font-mono text-white">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md bg-[#151619] border border-[#333] rounded-xl overflow-hidden shadow-2xl shadow-black"
        >
          <div className="p-6 border-b border-[#333] flex items-center justify-between bg-[#1c1d21]">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-500" />
              <h1 className="text-lg font-bold tracking-widest uppercase text-emerald-400">tommailer v.9ja01</h1>
            </div>
            <Cpu className="w-5 h-5 text-[#444]" />
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
                <Lock className="w-3 h-3" /> System HWID
              </label>
              <div className="bg-[#0a0a0a] p-3 rounded border border-[#222] text-xs text-emerald-400/70 break-all">
                {hwid}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#888]">Server URL (optional)</label>
              <input
                type="text"
                value={serverUrl}
                onChange={(e) => {
                  setServerUrl(e.target.value);
                  localStorage.setItem('mailforge_server', e.target.value);
                }}
                placeholder="http://localhost:3000"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded p-3 text-sm focus:border-emerald-500 outline-none transition-colors placeholder:text-[#333]"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#888] flex items-center gap-2">
                <Key className="w-3 h-3" /> Serial Key
              </label>
              <input
                type="text"
                value={activationKey}
                onChange={(e) => setActivationKey(e.target.value.toUpperCase())}
                placeholder="XXXXX-XXXXX"
                className="w-full bg-[#0a0a0a] border border-[#333] rounded p-3 text-sm focus:border-emerald-500 outline-none transition-colors placeholder:text-[#333]"
              />
            </div>

            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-red-500/10 border border-red-500/20 p-3 rounded flex items-center gap-3 text-xs text-red-400"
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span className="break-all">{error}</span>
              </motion.div>
            )}

            <div className="flex flex-col gap-3">
              <button
                onClick={handleActivate}
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white py-3 rounded font-bold uppercase tracking-widest text-xs transition-all active:scale-95 flex items-center justify-center gap-2"
              >
                <CheckCircle2 className="w-4 h-4" /> Activate License
              </button>

              <button
                onClick={handleTestConnection}
                className="w-full bg-transparent border border-[#333] hover:border-emerald-500/50 text-[#666] hover:text-emerald-400 py-2 rounded font-bold uppercase tracking-widest text-[10px] transition-all flex items-center justify-center gap-2"
              >
                <RefreshCw className="w-3 h-3" /> Test Connection
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] font-mono text-white p-6 flex flex-col items-center">
      <div className="w-full max-w-7xl grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 flex-grow">

        {/* Sidebar */}
        <div className="space-y-6">
          <div className="bg-[#151619] border border-[#333] rounded-xl p-6 space-y-6">
            <div className="flex items-center gap-3">
              <Shield className="w-6 h-6 text-emerald-500" />
              <h1 className="text-lg font-bold tracking-widest uppercase text-emerald-400">tommailer v.9ja01</h1>
            </div>

            <nav className="space-y-1">
              <button
                onClick={() => setActiveTab("automation")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-xs uppercase tracking-widest transition-all ${activeTab === "automation" ? 'bg-emerald-600 text-white' : 'text-[#666] hover:bg-[#1c1d21] hover:text-white'}`}
              >
                <Mail className="w-4 h-4" /> Automation
              </button>
              <button
                onClick={() => setActiveTab("settings")}
                className={`w-full flex items-center gap-3 px-4 py-3 rounded text-xs uppercase tracking-widest transition-all ${activeTab === "settings" ? 'bg-emerald-600 text-white' : 'text-[#666] hover:bg-[#1c1d21] hover:text-white'}`}
              >
                <Settings className="w-4 h-4" /> Settings
              </button>
            </nav>

            <div className="pt-6 border-t border-[#333] space-y-4">
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-[#444] tracking-widest">Active License</p>
                <p className="text-xs text-emerald-400 truncate">{activationKey}</p>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-[#444] tracking-widest">System Status</p>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  <span className="text-[10px] text-emerald-500 uppercase">Online / Secured</span>
                </div>
              </div>
              <div className="space-y-1">
                <p className="text-[9px] uppercase text-[#444] tracking-widest">API Endpoint</p>
                <p className="text-[8px] text-[#444] break-all">{serverUrl || 'http://localhost:3000'}</p>
              </div>
            </div>
          </div>

          <div className="bg-[#151619] border border-[#333] rounded-xl p-6 space-y-4">
            <button
              onClick={handleDeactivate}
              className="w-full flex items-center justify-center gap-2 text-red-400 hover:text-red-300 text-[10px] uppercase tracking-widest transition-colors"
            >
              <LogOut className="w-3 h-3" /> Deactivate License
            </button>
          </div>
        </div>

        {/* Main Content */}
        <div className="space-y-6 flex flex-col min-h-0">
          {activeTab === "automation" ? (
            <>
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 min-h-0">
                {/* Left Column: Senders & Recipients */}
                <div className="space-y-6 flex flex-col min-h-0">
                  {/* SMTP Management */}
                  <div className="bg-[#151619] border border-[#333] rounded-xl p-6 space-y-4">
                    <h3 className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">SMTP Senders</h3>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-[#666]">Host</label>
                        <input
                          type="text"
                          value={newSender.host}
                          onChange={e => setNewSender({ ...newSender, host: e.target.value })}
                          placeholder="smtp.gmail.com"
                          className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-[#666]">Port</label>
                        <input
                          type="text"
                          value={newSender.port}
                          onChange={e => setNewSender({ ...newSender, port: e.target.value })}
                          placeholder="587"
                          className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-[#666]">Username</label>
                        <input
                          type="text"
                          value={newSender.user}
                          onChange={e => setNewSender({ ...newSender, user: e.target.value })}
                          placeholder="user@gmail.com"
                          className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[9px] uppercase text-[#666]">Password</label>
                        <div className="relative">
                          <input
                            type={showPassword ? "text" : "password"}
                            value={newSender.pass}
                            onChange={e => setNewSender({ ...newSender, pass: e.target.value })}
                            placeholder="••••••••"
                            className="w-full bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs outline-none focus:border-emerald-500 pr-8"
                          />
                          <button
                            onClick={() => setShowPassword(!showPassword)}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-[#444] hover:text-[#666]"
                          >
                            {showPassword ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={addSender}
                        className="flex-grow bg-[#1c1d21] border border-[#333] hover:border-emerald-500 text-[10px] uppercase py-2 rounded transition-all flex items-center justify-center gap-2"
                      >
                        <Plus className="w-3 h-3" /> Add SMTP Account
                      </button>
                      <button
                        onClick={testSmtp}
                        className="bg-[#1c1d21] border border-[#333] hover:border-emerald-500 text-[10px] uppercase px-4 py-2 rounded transition-all flex items-center justify-center gap-2"
                        title="Test current SMTP settings"
                      >
                        <RefreshCw className="w-3 h-3" /> Test
                      </button>
                    </div>

                    <div className="space-y-2 max-h-32 overflow-y-auto pr-2">
                      {senders.map(s => (
                        <div key={s.id} className="bg-[#0a0a0a] border border-[#222] p-2 rounded flex items-center justify-between">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-emerald-400">{s.user}</span>
                            <span className="text-[8px] text-[#444]">{s.host}:{s.port}</span>
                          </div>
                          <button onClick={() => removeSender(s.id)} className="text-[#444] hover:text-red-500">
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Recipient Management */}
                  <div className="bg-[#151619] border border-[#333] rounded-xl p-6 space-y-4 flex flex-col min-h-0 flex-grow">
                    <h3 className="text-[10px] uppercase tracking-widest text-emerald-500 font-bold">Recipient List</h3>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={recipientInput}
                        onChange={e => setRecipientInput(e.target.value)}
                        placeholder="Enter email(s) separated by comma or newline"
                        className="flex-grow bg-[#0a0a0a] border border-[#333] rounded p-2 text-xs outline-none focus:border-emerald-500"
                        onKeyDown={e => e.key === 'Enter' && importRecipients()}
                      />
                      <button onClick={importRecipients} className="bg-emerald-600 px-3 rounded hover:bg-emerald-500 transition-colors">
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex-grow overflow-y-auto space-y-1 pr-2">
                      {recipients.length === 0 && <p className="text-[10px] text-[#333] text-center py-4">No recipients added</p>}
                      {recipients.map((r, i) => (
                        <div key={i} className="bg-[#0a0a0a] border border-[#222] p-2 rounded flex items-center justify-between">
                          <span className="text-xs text-[#888]">{r.email}</span>
                          <div className="flex items-center gap-2">
                            {r.status === "pending" && <span className="text-[8px] uppercase text-[#444]">Pending</span>}
                            {r.status === "sending" && <RefreshCw className="w-3 h-3 text-emerald-500 animate-spin" />}
                            {r.status === "sent" && <CheckCircle2 className="w-3 h-3 text-emerald-500" />}
                            {r.status === "error" && <AlertCircle className="w-3 h-3 text-red-500" title={r.error} />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Right Column: Content & Logs */}
                <div className="space-y-6 flex flex-col min-h-0">
                  {/* Content */}
                  <div className="bg-[#151619] border border-[#333] rounded-xl p-6 space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#888]">Reply‑To (optional)</label>
                      <input
                        type="email"
                        value={replyTo}
                        onChange={(e) => setReplyTo(e.target.value)}
                        placeholder="reply@example.com"
                        className="w-full bg-[#0a0a0a] border border-[#333] rounded p-3 text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#888]">Subject</label>
                      <input
                        type="text"
                        value={subject}
                        onChange={(e) => setSubject(e.target.value)}
                        className="w-full bg-[#0a0a0a] border border-[#333] rounded p-3 text-xs focus:border-emerald-500 outline-none"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[10px] uppercase tracking-widest text-[#888]">Body</label>
                      <textarea
                        value={body}
                        onChange={(e) => setBody(e.target.value)}
                        className="w-full h-32 bg-[#0a0a0a] border border-[#333] rounded p-3 text-xs focus:border-emerald-500 outline-none resize-none"
                      />
                    </div>
                  </div>

                  {/* Logs */}
                  <div className="flex-grow bg-[#151619] border border-[#333] rounded-xl overflow-hidden flex flex-col min-h-0">
                    <div className="p-3 border-b border-[#333] bg-[#1c1d21] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Terminal className="w-4 h-4 text-[#666]" />
                        <span className="text-[10px] uppercase tracking-widest text-[#888]">Live Console</span>
                      </div>
                      <button onClick={() => setLogs([])} className="text-[9px] text-[#444] hover:text-white uppercase">Clear</button>
                    </div>
                    <div className="p-4 flex-grow overflow-y-auto font-mono text-[11px] space-y-1 bg-[#0a0a0a]">
                      {logs.length === 0 && <p className="text-[#333]">System ready...</p>}
                      {logs.map((log, i) => (
                        <div key={i} className="flex gap-3">
                          <span className="text-[#444] flex-shrink-0">[{log.timestamp}]</span>
                          <span className={
                            log.type === "success" ? "text-emerald-500" :
                              log.type === "error" ? "text-red-500" :
                                "text-[#888]"
                          }>
                            {log.message}
                          </span>
                        </div>
                      ))}
                      <div ref={logEndRef} />
                    </div>
                  </div>
                </div>
              </div>

              {/* Controls */}
              <div className="bg-[#151619] border border-[#333] rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-6">
                  <div className="flex items-center gap-2">
                    <RefreshCw className={`w-4 h-4 text-emerald-500 ${isSending ? 'animate-spin' : ''}`} />
                    <span className="text-[10px] uppercase tracking-widest text-[#666]">Rotation: {senders.length} Senders</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-emerald-500" />
                    <span className="text-[10px] uppercase tracking-widest text-[#666]">Delay: 60s</span>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  {isSending ? (
                    <button
                      onClick={stopAutomation}
                      className="bg-red-600 hover:bg-red-500 text-white px-8 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2"
                    >
                      <Square className="w-3 h-3" /> Stop Sequence
                    </button>
                  ) : (
                    <button
                      onClick={startAutomation}
                      className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2.5 rounded text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 shadow-lg shadow-emerald-900/20"
                    >
                      <Send className="w-3 h-3" /> Start Sequence
                    </button>
                  )}
                </div>
              </div>
            </>
          ) : (
            <div className="bg-[#151619] border border-[#333] rounded-xl p-8 space-y-6">
              <h2 className="text-sm font-bold uppercase tracking-widest text-emerald-500">System Settings</h2>
              <div className="space-y-4">
                <div className="p-4 bg-[#0a0a0a] border border-[#222] rounded space-y-2">
                  <p className="text-[10px] uppercase text-[#666]">License Management</p>
                  <div className="flex items-center justify-between">
                    <span className="text-xs">{activationKey}</span>
                    <button
                      onClick={handleDeactivate}
                      className="text-[10px] text-red-500 hover:underline uppercase"
                    >
                      Unbind from this PC
                    </button>
                  </div>
                </div>
                <div className="p-4 bg-[#0a0a0a] border border-[#222] rounded space-y-2">
                  <p className="text-[10px] uppercase text-[#666]">Hardware ID</p>
                  <p className="text-xs text-[#444] break-all">{hwid}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
