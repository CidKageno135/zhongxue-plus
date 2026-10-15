const fs=require('node:fs/promises');
const path=require('node:path');
const net=require('node:net');
require('dotenv').config({path:path.join(__dirname,'..','.env.local'),quiet:true});
async function isRunning(){return new Promise(resolve=>{const socket=net.createConnection({host:'127.0.0.1',port:3001});socket.on('connect',()=>{socket.destroy();resolve(true);});socket.on('error',()=>resolve(false));});}
async function main(){
 if(await isRunning())throw new Error('Hãy tắt ZhongXue+ trước khi sao lưu dữ liệu.');
 if(process.env.DATABASE_URL)throw new Error('Database ngoài máy cần được sao lưu bằng công cụ PostgreSQL riêng.');
 const root=path.resolve(__dirname,'..'),source=process.env.ZHONGXUE_DATA_DIR?path.resolve(process.env.ZHONGXUE_DATA_DIR):path.join(root,'.data','zhongxue_db');
 await fs.access(source);
 const stamp=new Date().toISOString().replace(/[:.]/g,'-');
 const target=path.join(process.env.USERPROFILE,'Desktop','project management','back-up',`ZhongXue_data_${stamp}`);
 await fs.cp(source,target,{recursive:true,errorOnExist:true,force:false});
 console.log('Đã sao lưu dữ liệu tại: '+target);
}
main().catch(error=>{console.error(error.message);process.exitCode=1;});
