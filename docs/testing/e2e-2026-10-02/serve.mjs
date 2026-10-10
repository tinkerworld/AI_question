import {createServer} from '/home/ubuntu/exam_shekhar/AI_question/Exam/apps/web/node_modules/vite/dist/node/index.js';
const server=await createServer({server:{host:'127.0.0.1',port:3001,strictPort:true,proxy:{'/api':{target:'http://127.0.0.1:4044',changeOrigin:true}}}});
await server.listen(); server.printUrls();
