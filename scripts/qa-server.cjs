const {spawn}=require('node:child_process');
const path=require('node:path');
const os=require('node:os');
const root=path.resolve(__dirname,'..');
const dataDir=path.join(os.tmpdir(),'zhongxue-http-qa-'+Date.now());
const child=spawn(process.execPath,[require.resolve('next/dist/bin/next'),'start','-p','3002','-H','127.0.0.1'],{cwd:root,stdio:'inherit',windowsHide:true,env:{...process.env,DATABASE_URL:'',ZHONGXUE_DATA_DIR:dataDir,AI_API_KEY:'',AI_MODEL:'',TRUST_PROXY:'false'}});
console.log('QA uses an isolated temporary database and guided practice on localhost:3002.');
process.on('SIGINT',()=>child.kill());
child.on('exit',code=>{process.exitCode=code??1;});
