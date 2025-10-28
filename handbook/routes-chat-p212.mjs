// routes-chat-p212.mjs (ASCII-safe, persona-aware)
// "hurtig": streamer via chat.completions (gpt-5-mini) for lavere latenstid.
// øvrige: responses stream->fallback.
// Non-stream (POST /chat/send) bruger responses, med kort og konkret instruktion.
import express from "express";
import cors from "cors";

function readEnv(k,f){ const v=process.env[k]; return (v===undefined||v===null||v==="")?f:v; }
function corsMw(){
  const raw=readEnv("CORS_ORIGIN",""); const list=raw.split(",").map(s=>s.trim()).filter(Boolean); const allowAll=list.length===0;
  return cors({origin:(o,cb)=>{ if(allowAll||!o) return cb(null,true); if(list.indexOf(o)!==-1) return cb(null,true); return cb(new Error("CORS_DENY "+o)); },
               methods:["GET","POST","OPTIONS"], allowedHeaders:["Content-Type","Authorization","Accept"], credentials:false, maxAge:600});
}
async function callResponses(apiBase, apiKey, model, sys, msg){
  const body={ model:model||"gpt-5", instructions:(sys+" Skriv kort og konkret."),
    input:[{role:"user",content:[{type:"input_text",text:String(msg||"")}]}] };
  return fetch(apiBase.replace(/\/+$/,"")+"/responses",{ method:"POST", headers:{ "Authorization":"Bearer "+apiKey, "Content-Type":"application/json"}, body:JSON.stringify(body)});
}
async function callChat(apiBase, apiKey, model, sys, msg, stream){
  const body={ model:model||"gpt-5-mini", temperature:0.6, stream:!!stream,
    messages:[ {role:"system",content:(sys+" Skriv kort og konkret.")}, {role:"user",content:String(msg||"")} ] };
  return fetch(apiBase.replace(/\/+$/,"")+"/chat/completions",{ method:"POST", headers:{ "Authorization":"Bearer "+apiKey, "Content-Type":"application/json"}, body:JSON.stringify(body)});
}
function extractResp(j){ if(!j) return ""; if(typeof j.output_text==="string"&&j.output_text) return j.output_text;
  try{ const c=j.output&&j.output[0]&&j.output[0].content; if(Array.isArray(c)) for(const x of c){ if(typeof x.text==="string"&&x.text) return x.text; } }catch(_){ } return ""; }
function extractChat(j){ try{ const c=j&&j.choices&&j.choices[0]&&j.choices[0].message&&j.choices[0].message.content; return typeof c==="string"?c:""; }catch(_){ } return ""; }

export default function mountChatRoutes(app){
  const router=express.Router();
  const API=readEnv("PROXY_BASE","https://api.openai.com/v1");
  const KEY=readEnv("OPENAI_API_KEY","");
  const SYS="Du skriver altid paa dansk. ASCII-venligt output i HTML (ingen smart quotes).";

  const c=corsMw();
  router.use("/chat", c);
  router.options("/chat/*", c, (req,res)=>res.sendStatus(204));

  // SEND (responses; fallback chat hvis tomt)
  router.post("/chat/send", express.json({limit:"1mb"}), async (req,res)=>{
    try{
      const {message="", model="gpt-5", persona="standard"}=req.body||{};
      const eff=(persona==="hurtig" && (!req.body.model || req.body.model==="gpt-5"))?"gpt-5-mini":model;
      let r=await callResponses(API,KEY,eff,SYS,message);
      if(!r.ok){ const t=await r.text().catch(()=> ""); return res.status(502).json({ok:false,error:"UPSTREAM_"+r.status,detail:String(t).slice(0,800)}); }
      let j=await r.json().catch(()=> ({})); let text=extractResp(j);
      if(!text){ const r2=await callChat(API,KEY,eff,SYS,message,false); if(r2.ok){ const j2=await r2.json().catch(()=> ({})); text=extractChat(j2); } }
      return res.json({ok:true, output_text:String(text||"")});
    }catch(e){ return res.status(500).json({ok:false,error:"SERVER_ERROR",detail:String(e).slice(0,800)}); }
  });

  // STREAM (hurtig -> chat.completions; andre -> responses->fallback chat)
  router.get("/chat/stream", async (req,res)=>{
    const {message="", model="gpt-5", persona="standard"}=req.query||{};
    res.setHeader("Content-Type","text/event-stream"); res.setHeader("Cache-Control","no-cache"); res.setHeader("Connection","keep-alive");

    async function streamChat(effModel){
      const r=await callChat(API,KEY,effModel,SYS,message,true);
      if(!r.ok){ const t=await r.text().catch(()=> ""); res.write("data: ERROR FALLBACK_"+r.status+" "+String(t).slice(0,200)+"\n\n"); res.write("data: [DONE]\n\n"); return res.end(); }
      res.write("data: META STREAM_VIA=chat.completions\n\n");
      const reader=r.body.getReader(); const dec=new TextDecoder("utf-8"); let buf="";
      while(true){ const {value,done}=await reader.read(); if(done){ res.write("data: [DONE]\n\n"); return res.end(); }
        buf+=dec.decode(value,{stream:true}); let idx; while((idx=buf.indexOf("\n"))>=0){ const line=buf.slice(0,idx).trim(); buf=buf.slice(idx+1); if(!line) continue;
          if(line.startsWith("data: ")){ const payload=line.slice(6).trim(); if(payload==="[DONE]"){ res.write("data: [DONE]\n\n"); return res.end(); }
            try{ const j=JSON.parse(payload); const d=j&&j.choices&&j.choices[0]&&j.choices[0].delta&&j.choices[0].delta.content; if(d){ res.write("data: "+d+"\n\n"); } }catch(_){}
          }
        } }
    }

    try{
      if(persona==="hurtig"){ const eff=(!model || model==="gpt-5")?"gpt-5-mini":model; return await streamChat(eff); }
      const body={ model:(model||"gpt-5"), stream:true, instructions:(SYS+" Skriv kort og konkret."),
        input:[{role:"user",content:[{type:"input_text",text:String(message||"")}]}] };
      const r=await fetch(API.replace(/\/+$/,"")+"/responses",{ method:"POST", headers:{ "Authorization":"Bearer "+KEY, "Content-Type":"application/json"}, body:JSON.stringify(body) });
      if(!r.ok){ const eff=(!model || model==="gpt-5")?"gpt-5-mini":model; return await streamChat(eff); }
      res.write("data: META STREAM_VIA=responses\n\n");
      const reader=r.body.getReader(); const dec=new TextDecoder("utf-8"); let buf="";
      while(true){ const {value,done}=await reader.read(); if(done){ res.write("data: [DONE]\n\n"); return res.end(); }
        buf+=dec.decode(value,{stream:true}); let idx; while((idx=buf.indexOf("\n"))>=0){ const line=buf.slice(0,idx).trim(); buf=buf.slice(idx+1); if(!line) continue;
          if(line.startsWith("data: ")){ const payload=line.slice(6).trim(); if(payload==="[DONE]"){ res.write("data: [DONE]\n\n"); return res.end(); }
            try{ const j=JSON.parse(payload);
              if(j.type && j.type.indexOf("response.output_text.delta")>=0 && typeof j.delta==="string"){ res.write("data: "+j.delta+"\n\n"); }
              else if(j.delta && typeof j.delta==="string"){ res.write("data: "+j.delta+"\n\n"); }
              else if(j.output && Array.isArray(j.output) && j.output[0] && j.output[0].content){ for(const c of j.output[0].content){ if(typeof c.text==="string"&&c.text){ res.write("data: "+c.text+"\n\n"); } } }
            }catch(_){}
          }
        }
      }
    }catch(e){ try{ const eff=(!model || model==="gpt-5")?"gpt-5-mini":model; await streamChat(eff); }catch(_){ res.write("data: ERROR "+String(e).slice(0,200)+"\n\n"); res.write("data: [DONE]\n\n"); res.end(); } }
  });

  app.use(router);
}
