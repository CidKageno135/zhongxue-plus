import {normalizeSpeech} from './learning';
import type {Message} from './conversation';
export interface SpeechDifference {kind:'match'|'missing'|'extra'|'different';expected:string;received:string}
export function alignSpeech(expected:string,received:string):SpeechDifference[]{
 const chars=(s:string)=>Array.from(s.normalize('NFKC')).filter(c=>/[\p{L}\p{N}]/u.test(c));
 const a=chars(expected),b=chars(received);let matrix=[Array.from({length:b.length+1},(_,i)=>i)];
 for(let i=0;i<a.length;i++){
  let row=[i+1];for(let j=0;j<b.length;j++)row=[...row,Math.min(row[j]+1,matrix[i][j+1]+1,matrix[i][j]+(normalizeSpeech(a[i])===normalizeSpeech(b[j])?0:1))];
  matrix=[...matrix,row];
 }
 let i=a.length,j=b.length,result:SpeechDifference[]=[];
 while(i||j){
  if(i&&j&&normalizeSpeech(a[i-1])===normalizeSpeech(b[j-1])){result=[{kind:'match',expected:a[i-1],received:b[j-1]},...result];i--;j--;}
  else if(i&&j&&matrix[i][j]===matrix[i-1][j-1]+1){result=[{kind:'different',expected:a[i-1],received:b[j-1]},...result];i--;j--;}
  else if(i&&matrix[i][j]===matrix[i-1][j]+1){result=[{kind:'missing',expected:a[i-1],received:''},...result];i--;}
  else{result=[{kind:'extra',expected:'',received:b[j-1]},...result];j--;}
 }
 return result;
}
export function plainTutorText(text:string){return text.replace(/^#{1,6}\s+/gm,'').replace(/\*\*|__|`/g,'');}
export function appendDialogue(history:Message[],user:string,assistant:string):Message[]{return [...history.slice(-14),{role:'user',content:user},{role:'assistant',content:assistant}];}
