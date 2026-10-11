const Module=require('module');
const original=Module._resolveFilename;
Module._resolveFilename=function(request,...args){
 if(request.startsWith('../../apps/api/src/')) request=request.replace('../../apps/api/src/','/home/ubuntu/exam_shekhar/AI_question/Exam/apps/api/src/');
 return original.call(this,request,...args);
};
