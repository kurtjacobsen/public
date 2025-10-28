// renolie-proxy-v3.6.35-p212.mjs (ASCII-safe)
// Start: node renolie-proxy.mjs
import express from "express";
import cors from "cors";
import mountChatRoutes from "./routes-chat-p212.mjs";

const app = express();
app.use(cors());

// Health endpoint with version and enc-check
app.get("/healthz", (req,res)=>{
  res.json({ ok:true, name:"renolie-proxy", version:"v3.6.35-p212", enc:"&aelig; &oslash; &aring; &AElig; &Oslash; &Aring; &deg;" });
});

// Optional allowlist passthrough (mock)
app.get("/allowlist", (req,res)=>{ res.json({ items: [] }); });

// Mount chat routes
mountChatRoutes(app);

// Listen
const PORT = process.env.PORT || 3000;
app.listen(PORT, ()=>{
  console.log("proxy p212 listening on :", PORT);
});
