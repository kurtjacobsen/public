/* d103.js - RENOLIE debug-panel + autosave (persona/chat) (ASCII-safe)
 * Contract:
 *  Input: none (reads/writes localStorage)
 *  Output: window.debugPanel API (init, log, getLogs, autosave)
 *  Errors: none (UI-only; network errors are logged)
 */
(function(){
  var logs = [];
  var AUTOKEY = 'renolie.ui.autosave';
  function qs(id){ return document.getElementById(id); }
  function now(){ return new Date().toISOString(); }
  function add(msg){
    var line = now()+" :: "+msg;
    logs.push(line);
    var box = qs('debug-log');
    if(box){
      var pre = document.createElement('div');
      pre.textContent = line;
      box.appendChild(pre);
      box.scrollTop = box.scrollHeight;
    }
    if (console && console.log) console.log(line);
  }
  function getProxyBase(){
    return localStorage.getItem('renolie.proxy.base') || '';
  }
  function setProxyBase(v){
    localStorage.setItem('renolie.proxy.base', v||'');
  }
  function dl(filename, text){
    var blob = new Blob([text], {type:'application/json'});
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(function(){
      URL.revokeObjectURL(url);
      a.remove();
    }, 0);
  }
  function ping(url){
    add("GET "+url);
    return fetch(url, {method:'GET'})
      .then(function(r){ return r.json().catch(function(){ return {status:r.status}; }); })
      .then(function(j){ add("OK "+url+" :: "+JSON.stringify(j).slice(0,300)); return j; })
      .catch(function(e){ add("ERR "+url+" :: "+String(e)); return null; });
  }
  function allowlistCount(url){
    add("GET "+url);
    return fetch(url, {method:'GET'})
      .then(function(r){ return r.json(); })
      .then(function(j){
        var n = (Array.isArray(j) ? j.length : (j && j.items && j.items.length) || 0);
        add("Allowlist items = "+n);
        return n;
      })
      .catch(function(e){ add("ERR allowlist :: "+String(e)); return 0; });
  }
  function killSW(){
    if(!('serviceWorker' in navigator)){ add("No Service Worker support"); return; }
    navigator.serviceWorker.getRegistrations().then(function(regs){
      if(!regs || regs.length===0){ add("No SW registrations"); return; }
      regs.forEach(function(reg){ reg.unregister().then(function(ok){ add("SW unregistered="+ok); }); });
    });
  }
  function hardReload(){
    try{ location.reload(true); }catch(e){ location.reload(); }
  }
  function readAutosave(){
    try{
      var raw = localStorage.getItem(AUTOKEY);
      if(!raw) return null;
      return JSON.parse(raw);
    }catch(e){ return null; }
  }
  function writeAutosave(obj){
    try{
      obj = obj || {};
      obj.ts = now();
      localStorage.setItem(AUTOKEY, JSON.stringify(obj));
    }catch(e){}
  }
  function currentUIState(){
    var panel = qs('debug-panel');
    var proxy = getProxyBase();
    var persona = (qs('persona') && qs('persona').value) || 'standard';
    var chat = (qs('chat-text') && qs('chat-text').value) || '';
    return {
      debugVisible: panel && panel.style.display !== 'none',
      proxyBase: proxy || '',
      persona: persona,
      chat: chat
    };
  }

  window.debugPanel = {
    init: function(){
      add("Debug panel init (M5.3)");
      // restore autosave
      var saved = readAutosave() || {};
      var base = saved.proxyBase || getProxyBase();
      var persona = saved.persona || 'standard';
      var chat = saved.chat || '';

      if(qs('proxy-base')){
        qs('proxy-base').value = base || '';
        if(base){ if(qs('saved-proxy')) qs('saved-proxy').textContent = "Aktiv proxy: "+base; }
        if(base) setProxyBase(base);
      }
      if(saved.debugVisible){
        var p = qs('debug-panel');
        if(p) p.style.display = 'block';
      }
      if(qs('persona')) qs('persona').value = persona;
      if(qs('chat-text')) qs('chat-text').value = chat;

      // wire buttons
      if(qs('dp-save-proxy')){
        qs('dp-save-proxy').addEventListener('click', function(){
          var v = (qs('proxy-base') && qs('proxy-base').value) || '';
          setProxyBase(v);
          add("Proxy saved: "+v);
          if(qs('saved-proxy')) qs('saved-proxy').textContent = v ? ("Aktiv proxy: "+v) : "";
          writeAutosave(currentUIState());
        });
      }
      if(qs('dp-reload')) qs('dp-reload').addEventListener('click', hardReload);
      if(qs('dp-kill-sw')) qs('dp-kill-sw').addEventListener('click', killSW);
      if(qs('dp-dl-logs')) qs('dp-dl-logs').addEventListener('click', function(){
        var payload = JSON.stringify({ts: now(), logs: logs}, null, 2);
        dl("renolie-debug-bundle-m5.3.json", payload);
      });
      if(qs('dp-healthz')) qs('dp-healthz').addEventListener('click', function(){
        var base = getProxyBase();
        if(!base){ add("Set proxy base first"); return; }
        ping(base.replace(/\/+$/,'') + "/healthz");
      });
      if(qs('dp-allowlist')) qs('dp-allowlist').addEventListener('click', function(){
        var base = getProxyBase();
        if(!base){ add("Set proxy base first"); return; }
        allowlistCount(base.replace(/\/+$/,'') + "/allowlist");
      });
      // Handbook echo
      add("Boot Check: Start=node renolie-proxy.mjs | Build=npm install --omit=dev | ASCII-only UI | Anchor=exact filename | TZ=Europe/Copenhagen");
      add("Handbook pointer: https://shop96018.sfstatic.io/upload_dir/docs/renolie-handbook-v3.6.17.ascii.html");
    },
    log: add,
    getLogs: function(){ return logs.slice(); },
    autosave: function(){ writeAutosave(currentUIState()); }
  };
})();
