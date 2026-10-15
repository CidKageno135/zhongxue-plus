const {spawn}=require('node:child_process');
const path=require('node:path');
const root=path.resolve(__dirname,'..');
const url='http://localhost:3001';
const openBrowser=()=>spawn('cmd.exe',['/c','start','',url],{windowsHide:true,stdio:'ignore'});
async function running() {
  try {const response=await fetch(url+'/dashboard',{signal:AbortSignal.timeout(1500)});return response.ok && (await response.text()).includes('ZhongXue');}
  catch {return false;}
}
async function main() {
  if (await running()) {openBrowser();console.log('ZhongXue+ is running: '+url);return;}
  const next=require.resolve('next/dist/bin/next');
  const child=spawn(process.execPath,[next,'dev','--webpack','-p','3001','-H','127.0.0.1'],{cwd:root,stdio:'inherit',windowsHide:true});
  let exited=false;
  child.on('exit',code=>{exited=true;process.exitCode=code ?? 1;});
  process.on('SIGINT',()=>child.kill());
  for (let i=0;i<90 && !exited;i++) {
    if (await running()) {openBrowser();return;}
    await new Promise(resolve=>setTimeout(resolve,500));
  }
  if (!exited) console.log('Open '+url+' when the server is ready.');
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
