"use strict";

const fs = require("fs");
const express = require("express");
const session = require("express-session");
const { MongoClient } = require("mongodb");

const PORT = 8080;
const MONGO_URL = process.env.MONGO_URL || "mongodb://mongo:27017";
const DB_NAME = "nodegrid";
const SESSION_SECRET = process.env.SESSION_SECRET || "change-me";
const ADMIN_FLAG_FILE = "/app/secret/admin.txt";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  session({
    secret: SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { httpOnly: true },
  })
);

let db = null;

// Connect to Mongo with retry so the app tolerates the database still
// initializing when Compose brings both services up together.
async function connectMongo() {
  for (;;) {
    try {
      const client = await MongoClient.connect(MONGO_URL, {
        serverSelectionTimeoutMS: 2000,
      });
      db = client.db(DB_NAME);
      await db.command({ ping: 1 });
      console.log("connected to mongo");
      return;
    } catch (err) {
      console.log("mongo not ready, retrying: " + err.message);
      await new Promise((r) => setTimeout(r, 2000));
    }
  }
}

function page(title, body) {
  return (
    "<!DOCTYPE html>\n" +
    '<html lang="en"><head><meta charset="UTF-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1.0">' +
    "<title>" +
    title +
    "</title><style>" +
    "body{background:#0f1115;color:#d7dbe0;font-family:'Segoe UI',Tahoma,sans-serif;" +
    "display:flex;justify-content:center;align-items:center;min-height:100vh;margin:0}" +
    ".card{background:#191c22;padding:32px 40px;border-radius:12px;width:360px;" +
    "box-shadow:0 8px 24px rgba(0,0,0,.5);border:1px solid #262a32}" +
    "h2{margin-top:0;color:#fff}label{display:block;margin:12px 0 4px;font-size:14px;color:#9aa4b2}" +
    "input{width:100%;padding:10px;border:1px solid #333;border-radius:6px;background:#23262d;" +
    "color:#e6e6e6;font-size:15px;box-sizing:border-box}" +
    "button{margin-top:18px;width:100%;padding:10px;background:#3d7eff;border:0;border-radius:6px;" +
    "color:#fff;font-size:15px;cursor:pointer}button:hover{background:#2f6be0}" +
    "pre{white-space:pre-wrap;word-break:break-word}a{color:#3d7eff}" +
    ".note{background:#12151b;border:1px solid #262a32;border-radius:8px;padding:14px;margin-top:16px}" +
    ".err{color:#e06c75}.ok{color:#98c379}</style></head><body>" +
    body +
    "</body></html>"
  );
}

app.get("/", (req, res) => {
  // The portal speaks JSON to its own front-end. The login filter is built
  // directly from the parsed request body; operator keys are never stripped.
  const body =
    '<div class="card"><h2>NodeGrid Portal</h2>' +
    '<form id="f"><label>Username</label><input name="username" autocomplete="off">' +
    '<label>Password</label><input name="password" type="password" autocomplete="off">' +
    '<button type="submit">Sign in</button></form>' +
    '<p id="msg"></p>' +
    "<script>document.getElementById('f').addEventListener('submit',async function(e){" +
    "e.preventDefault();var fd=new FormData(e.target);" +
    "var r=await fetch('/login',{method:'POST',headers:{'Content-Type':'application/json'}," +
    "body:JSON.stringify({username:fd.get('username'),password:fd.get('password')})});" +
    "var j=await r.json();if(j.ok){location.href=j.redirect;}else{" +
    "document.getElementById('msg').textContent=j.message||'Login failed';}});</script>" +
    "</div>";
  res.send(page("NodeGrid Portal", body));
});

app.post("/login", async (req, res) => {
  if (!db) {
    return res.status(503).json({ ok: false, message: "Database initializing." });
  }
  const username = req.body.username;
  const password = req.body.password;

  const users = db.collection("users");
  const user = await users.findOne({ username: username, password: password });

  if (user) {
    req.session.user = user.username;
    req.session.role = user.role;
    return res.json({ ok: true, redirect: "/dashboard" });
  }
  return res.json({ ok: false, message: "Invalid username or password." });
});

app.get("/dashboard", async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/");
  }
  if (req.session.role !== "admin") {
    return res
      .status(403)
      .send(page("Portal", '<div class="card"><h2>No access</h2>' +
        '<p class="err">This account has no administrator privileges.</p>' +
        '<p><a href="/logout">Sign out</a></p></div>'));
  }

  let flag = "unavailable";
  try {
    flag = fs.readFileSync(ADMIN_FLAG_FILE, "utf8").trim();
  } catch (e) {
    flag = "flag file unreadable";
  }

  let notesHtml = "";
  try {
    const notes = await db.collection("notes").find({}).toArray();
    for (const n of notes) {
      notesHtml +=
        '<div class="note"><strong>' +
        (n.title || "note") +
        "</strong><pre>" +
        (n.body || "") +
        "</pre></div>";
    }
  } catch (e) {
    notesHtml = '<div class="note">notes unavailable</div>';
  }

  const body =
    '<div class="card"><h2>Admin console</h2>' +
    '<p class="ok">Signed in as ' +
    req.session.user +
    " (admin).</p>" +
    '<div class="note"><strong>Portal flag</strong><pre>' +
    flag +
    "</pre></div>" +
    notesHtml +
    '<p><a href="/logout">Sign out</a></p></div>';
  res.send(page("Admin console", body));
});

app.get("/logout", (req, res) => {
  req.session.destroy(() => res.redirect("/"));
});

connectMongo().then(() => {
  app.listen(PORT, () => console.log("portal listening on " + PORT));
});
