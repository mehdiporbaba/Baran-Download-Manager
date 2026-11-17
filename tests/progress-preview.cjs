// Local visual QA harness: the built renderer talks to the actual isolated
// native engine. It never reads the installed user's profile or browser data.
const fs = require('node:fs')
const path = require('node:path')
const http = require('node:http')
const { spawn } = require('node:child_process')
const { createInterface } = require('node:readline')
const crypto = require('node:crypto')
const root = process.cwd()
const profile = path.resolve('.tools/progress-preview', `${Date.now()}-${process.pid}`)
fs.mkdirSync(profile, { recursive: true })
const app = spawn(path.resolve('dist/native/Baran Download Manager.exe'), ['--test-driver', '--profile', profile], { windowsHide: true, stdio: ['pipe','pipe','pipe'] })
const waiting = new Map(), clients = new Set()
let serial = 0, taskId = '', stopped = false
const nonce = crypto.randomBytes(24).toString('hex')
const payload = Buffer.alloc(16*1024*1024, 37)
app.stderr.pipe(process.stderr)
createInterface({ input: app.stdout }).on('line', line => {
  let value; try { value = JSON.parse(line) } catch { return }
  if (value.event) { for (const client of clients) client.write(`data: ${JSON.stringify(value.event)}\n\n`); return }
  const request = waiting.get(value.id); if (!request) return
  clearTimeout(request.timer); waiting.delete(value.id)
  value.error ? request.reject(Error(value.error)) : request.resolve(value.result)
})
app.once('exit', () => { for (const request of waiting.values()) { clearTimeout(request.timer); request.reject(Error('Preview engine closed')) }; waiting.clear() })
function invoke(method,...args) { return new Promise((resolve,reject) => { const id=++serial,timer=setTimeout(()=>{waiting.delete(id);reject(Error('Preview IPC timeout'))},20000);waiting.set(id,{resolve,reject,timer});app.stdin.write(JSON.stringify({id,method,args})+'\n') }) }
function finish() { if (stopped) return; stopped=true; for (const client of clients) client.end();server.closeAllConnections();server.close();app.stdin.end();setTimeout(()=>{if(app.exitCode===null)app.kill()},5000).unref() }
const server = http.createServer(async (req,res) => {
  try {
    const url=new URL(req.url,'http://localhost')
    if (url.pathname==='/fixture.bin') {
      const range=/^bytes=(\d+)-(\d+)$/.exec(req.headers.range||'')
      const start=range?+range[1]:0,end=range?+range[2]:payload.length-1
      res.writeHead(range?206:200,{'Content-Type':'application/octet-stream','Content-Length':end-start+1,ETag:'"progress-preview"',...(range?{'Content-Range':`bytes ${start}-${end}/${payload.length}`}:{})})
      res.end(payload.subarray(start,end+1));return
    }
    if (url.pathname==='/finish') {
      if(req.method!=='POST'||req.headers['x-preview-key']!==nonce){res.writeHead(403);res.end();return}
      res.end('done');setImmediate(finish);return
    }
    if (url.pathname==='/events') { res.writeHead(200,{'Content-Type':'text/event-stream','Cache-Control':'no-cache'});res.write(': connected\n\n');clients.add(res);req.on('close',()=>clients.delete(res));return }
    if (url.pathname==='/rpc') {
      if(req.method!=='POST'||req.headers.origin!==`http://${req.headers.host}`||req.headers['content-type']!=='application/json'){res.writeHead(403);res.end();return}
      let body='';for await(const chunk of req){body+=chunk;if(body.length>65536)throw Error('Request too large')}
      const {method,args=[]}=JSON.parse(body)
      const methods=['pauseTask','resumeTask','cancelTask','retryTask','replaceUrl','setTaskSpeedLimit','setTaskChecksum','setTaskCloseOnComplete']
      let result
      if(method==='snapshot'){result=await invoke('snapshot');result.tasks=result.tasks.filter(t=>t.id===taskId)}
      else if(method==='windowControl'){result=null}
      else {if(!methods.includes(method)||args[0]!==taskId)throw Error('Preview command is outside its test download');result=await invoke(method,...args)}
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({result}));return
    }
    const renderer=path.resolve('out/renderer')
    const file=path.resolve(renderer,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname))
    if(!file.startsWith(renderer+path.sep))throw Error('Invalid asset path')
    if(file.endsWith('index.html')) {
      const bridge=`<script>const listeners=new Set();const events=new EventSource('/events');events.onmessage=e=>{for(const listener of listeners)listener(JSON.parse(e.data))};const invoke=async(method,...args)=>{const r=await fetch('/rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({method,args})});const v=await r.json();if(v.error)throw Error(v.error);return v.result};window.pulse=Object.fromEntries(['snapshot','windowControl','pauseTask','resumeTask','cancelTask','retryTask','replaceUrl','setTaskSpeedLimit','setTaskChecksum','setTaskCloseOnComplete','openTask','revealTask'].map(method=>[method,(...args)=>invoke(method,...args)]));window.pulse.subscribe=listener=>{listeners.add(listener);return()=>listeners.delete(listener)};</script>`
      res.setHeader('Content-Type','text/html; charset=utf-8');res.end(fs.readFileSync(file,'utf8').replace('</head>',bridge+'</head>'));return
    }
    res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.css')?'text/css':'application/octet-stream');fs.createReadStream(file).pipe(res)
  } catch(error) {res.statusCode=400;res.setHeader('Content-Type','application/json');res.end(JSON.stringify({error:error.message}))}
})
server.listen(0,'127.0.0.1',async()=>{
  try {
    const origin=`http://127.0.0.1:${server.address().port}`
    await invoke('updateSettings',{downloadDir:path.join(profile,'downloads'),language:'fa',theme:'dark',launchAtStartup:false,clipboardWatch:false,notifyOnComplete:false})
    const task=await invoke('addDownload',{url:origin+'/fixture.bin',kind:'http',fileName:'Baran — دانلود آزمایشی.iso',connections:8,speedLimit:65536})
    taskId=task.id
    const state={url:`${origin}/?mode=progress&task=${taskId}`,profile,finish:origin+'/finish',nonce,pid:process.pid}
    fs.writeFileSync('.tools/progress-preview.json',JSON.stringify(state));console.log(JSON.stringify({url:state.url,profile}))
  }catch(error){console.error(error);finish();process.exitCode=1}
})
process.once('SIGINT',finish);process.once('SIGTERM',finish)
setTimeout(finish,15*60*1000).unref()
