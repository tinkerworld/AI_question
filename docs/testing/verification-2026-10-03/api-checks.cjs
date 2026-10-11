const fs=require('fs');
const base='http://127.0.0.1:4044/api/v1';
const records=[];
async function call(path,token,body){const r=await fetch(base+path,{method:body?'POST':'GET',headers:{'Content-Type':'application/json',...(token?{Authorization:`Bearer ${token}`}:{})},...(body?{body:JSON.stringify(body)}:{})});return {http:r.status,body:await r.json()};}
async function login(email,password){const r=await call('/auth/login',null,{email,password});return r.body.data.accessToken||r.body.data.token;}
async function check(name,fn){try{const result=await fn();records.push({name,...result});console.log(name,JSON.stringify(result));}catch(e){records.push({name,error:e.message});console.log(name,e.message);}}
(async()=>{
const student=await login('student@examos.com','Student@123'),student2=await login('student2@examos.com','Student2@123'),teacher=await login('teacher@examos.com','Teacher@123');
let id;
await check('strict provider-failure submission',async()=>{const r=await call('/writing/evaluations/submit',student,{questionId:'q_ielts_wrt_03',essayText:'Test submission unique strict path. '.repeat(55)});id=r.body.data?.id;return{http:r.http,id,status:r.body.data?.status,band:r.body.data?.bandLabel,score:r.body.data?.overallScore,reviewReasons:r.body.data?.reviewReasons};});
await check('cross-student evaluation read',async()=>{const r=await call('/writing/evaluations/'+id,student2);return{http:r.http,message:r.body.message};});
await check('nonexistent question submission',async()=>{const r=await call('/writing/evaluations/submit',student,{questionId:'e2e-missing-question',essayText:'Test nonexistent question submission.'});return{http:r.http,status:r.body.data?.status,message:r.body.message};});
await check('invalid essay type',async()=>{const r=await call('/writing/evaluations/submit',student,{questionId:'q_ielts_wrt_03',essayText:{invalid:true}});return{http:r.http,message:r.body.message};});
await check('student mock override',async()=>{const r=await call('/writing/evaluations/submit',student,{questionId:'q_ielts_wrt_03',essayText:'Education supports individuals and society. '.repeat(60),allowTestMock:true});return{http:r.http,status:r.body.data?.status,score:r.body.data?.overallScore,band:r.body.data?.bandLabel};});
await check('teacher out-of-range score validation',async()=>{const r=await call('/writing/reviews/'+id+'/submit',teacher,{correctedCriteriaScores:{task_response:99,coherence_cohesion:99,lexical_resource:99,grammatical_range:99},correctedOverallScore:99,teacherNotes:'E2E invalid score validation',isApproved:true});return{http:r.http,data:r.body.data,message:r.body.message};});
await check('student denied course creation',async()=>{const r=await call('/courses',student,{name:'E2E unauthorized',code:'E2E_DENIED'});return{http:r.http};});
await check('student denied user listing',async()=>{const r=await call('/users',student);return{http:r.http};});
fs.writeFileSync('/tmp/examos-reverify-pPUolh/api-results.json',JSON.stringify(records,null,2));
})();
