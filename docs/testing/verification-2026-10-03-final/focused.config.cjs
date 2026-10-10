const base=require('./playwright.config.cjs');
module.exports={...base,testDir:'./focused',outputDir:'./focused-results',reporter:[['list'],['json',{outputFile:'./focused-report/results.json'}],['html',{open:'never',outputFolder:'./focused-report/html'}]]};
