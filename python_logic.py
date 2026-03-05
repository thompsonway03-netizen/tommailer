# --- PART 1: LICENSING SERVER (FLASK) ---
import sqlite3
from flask import Flask, request, jsonify
import random
import string

app = Flask(__name__)

def get_db():
    conn = sqlite3.connect('licensing.db')
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute('''CREATE TABLE IF NOT EXISTS keys 
                   (serial_key TEXT PRIMARY KEY, is_active BOOLEAN, hwid_locked_to TEXT)''')
    conn.commit()

@app.route('/activate', methods=['POST'])
def activate():
    data = request.json
    key = data.get('key')
    hwid = data.get('hwid')
    
    conn = get_db()
    row = conn.execute('SELECT * FROM keys WHERE serial_key = ?', (key,)).fetchone()
    
    if not row:
        return "Invalid Key", 400
    
    if row['is_active']:
        if row['hwid_locked_to'] == hwid:
            return "Success", 200
        else:
            return "Serial already in use", 400
            
    conn.execute('UPDATE keys SET is_active = 1, hwid_locked_to = ? WHERE serial_key = ?', (hwid, key))
    conn.commit()
    return "Success", 200

@app.route('/deactivate', methods=['POST'])
def deactivate():
    data = request.json
    key = data.get('key')
    hwid = data.get('hwid')
    
    conn = get_db()
    row = conn.execute('SELECT * FROM keys WHERE serial_key = ?', (key,)).fetchone()
    
    if row and row['hwid_locked_to'] == hwid:
        conn.execute('UPDATE keys SET is_active = 0, hwid_locked_to = NULL WHERE serial_key = ?', (key,))
        conn.commit()
        return "Success", 200
    return "Invalid", 400

# Key Generator Script
def generate_keys(n=10):
    conn = get_db()
    for _ in range(n):
        key = ''.join(random.choices(string.ascii_uppercase + string.digits, k=10))
        conn.execute('INSERT INTO keys (serial_key, is_active) VALUES (?, 0)', (key,))
    conn.commit()

# --- PART 2: DESKTOP APP (TKINTER) ---
import tkinter as tk
from tkinter import messagebox, scrolledtext
import uuid
import requests
import hashlib
import smtplib
import time
import itertools
from email.mime.text import MIMEText

class MailForgeApp:
    def __init__(self, root):
        self.root = root
        self.root.title("MailForge Automation")
        self.hwid = hashlib.sha256(str(uuid.getnode()).encode()).hexdigest()
        self.check_license()

    def check_license(self):
        try:
            with open("license.txt", "r") as f:
                self.key = f.read().strip()
            # Verify with server
            res = requests.post("http://your-server/activate", json={"key": self.key, "hwid": self.hwid})
            if res.text != "Success":
                self.show_activation()
            else:
                self.show_main_ui()
        except FileNotFoundError:
            self.show_activation()

    def show_activation(self):
        self.act_frame = tk.Frame(self.root)
        self.act_frame.pack(padx=20, pady=20)
        tk.Label(self.act_frame, text="Enter Serial Key:").pack()
        self.key_entry = tk.Entry(self.act_frame)
        self.key_entry.pack()
        tk.Button(self.act_frame, text="Activate", command=self.activate_key).pack()

    def activate_key(self):
        key = self.key_entry.get()
        res = requests.post("http://your-server/activate", json={"key": key, "hwid": self.hwid})
        if res.text == "Success":
            with open("license.txt", "w") as f: f.write(key)
            self.key = key
            self.act_frame.destroy()
            self.show_main_ui()
        else:
            messagebox.showerror("Error", res.text)

    def show_main_ui(self):
        # Implementation of Email UI (Inputs, Rotation, Delay)
        # ... (Simplified for brevity)
        pass

    def send_emails(self, senders, recipients, subject, body):
        sender_cycle = itertools.cycle(senders)
        for recipient in recipients:
            sender = next(sender_cycle)
            # smtp, port, user, pass = sender.split(',')
            try:
                server = smtplib.SMTP(sender['host'], sender['port'])
                server.starttls()
                server.login(sender['user'], sender['pass'])
                
                msg = MIMEText(body)
                msg['Subject'] = subject
                msg['From'] = sender['user']
                msg['To'] = recipient
                
                server.sendmail(sender['user'], recipient, msg.as_string())
                server.quit()
                print(f"Sent to {recipient}")
            except Exception as e:
                print(f"Error: {e}")
            
            time.sleep(60) # Strict 60s delay

if __name__ == "__main__":
    init_db()
    # generate_keys() # Run once
    root = tk.Tk()
    app = MailForgeApp(root)
    root.mainloop()
