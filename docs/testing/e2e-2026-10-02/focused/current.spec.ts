import {test,expect} from '@playwright/test';
import {loginAs,goToTab} from '../e2e/helpers/auth';
const api='http://127.0.0.1:4044/api/v1';
async function token(request:any,email='student@examos.com',password='Student@123'){
 const res=await request.post(`${api}/auth/login`,{data:{email,password}});expect(res.status()).toBe(200);const j=await res.json();return j.data.accessToken||j.data.token;
}
test('public landing links to student login',async({page})=>{await page.goto('/');await page.locator('#landing-btn-student-login').click();await expect(page.locator('#student-input-email')).toBeVisible();});
for(const role of ['admin','teacher','student'] as const)test(`${role} current login reaches dashboard`,async({page})=>{await loginAs(page,role);await expect(page.locator('#nav-tab-dashboard')).toBeVisible();});
test('invalid student login shows error',async({page})=>{await page.goto('/login/student');await page.locator('input[type=email]').fill('invalid@example.com');await page.locator('input[type=password]').fill('InvalidPassword123');await page.locator('button[type=submit]').click();await expect(page.locator('#student-login-error-banner')).toBeVisible();});
test('mobile login fits 390px viewport',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/login/student');await expect(page.locator('#student-input-email')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);});
test('writing Task 1 opens image, counts words, and submits',async({page})=>{
 await loginAs(page,'student');await goToTab(page,'writing_practice');
 await page.locator('#btn-start-writing-q_ielts_wrt_01').click();
 await expect(page.locator('[data-testid=writing-textarea]')).toBeVisible();
 const chart=page.locator('img').filter({visible:true}).first();
 await expect(chart).toBeVisible();
 expect(await chart.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBeTruthy();
 await page.locator('[data-testid=writing-textarea]').fill('The chart shows changes in energy production over time.');
 await expect(page.locator('[data-testid=writing-word-count]')).toHaveText('9');
 await page.locator('#btn-submit-writing-attempt').click();
 await expect(page.locator('[data-testid=writing-scorecard]')).toBeVisible({timeout:30000});
});
test('writing draft survives refresh',async({page})=>{await loginAs(page,'student');await goToTab(page,'writing_practice');await page.locator('#btn-start-writing-q_ielts_wrt_03').click();const draft='E2E draft recovery: education should prepare students for employment and independent thinking.';await page.locator('[data-testid=writing-textarea]').fill(draft);await page.waitForTimeout(6000);await page.reload();await goToTab(page,'writing_practice');await expect(page.locator('[data-testid=writing-textarea]')).toHaveValue(draft);});
test('student cannot access staff reviews and export',async({request})=>{const t=await token(request);for(const endpoint of ['reviews/pending','reviews/export']){const res=await request.get(`${api}/writing/${endpoint}`,{headers:{Authorization:`Bearer ${t}`}});expect(res.status()).toBe(403);}});
test('student cannot enable mock grading through request body',async({request})=>{const t=await token(request);const res=await request.post(`${api}/writing/evaluations/submit`,{headers:{Authorization:`Bearer ${t}`},data:{questionId:'q_ielts_wrt_03',essayText:'Education gives people opportunities. '.repeat(70),allowTestMock:true}});const j=await res.json();await test.info().attach('evaluation-response',{body:JSON.stringify(j,null,2),contentType:'application/json'});expect([400,403].includes(res.status()) || ['REVIEW_REQUIRED','FAILED'].includes(j.data?.status)).toBeTruthy();});
test('evaluation rejects a non-writing question',async({request})=>{const t=await token(request,'admin@examos.com','Admin@123');const list=await request.get(`${api}/questions?limit=100`,{headers:{Authorization:`Bearer ${t}`}});const j=await list.json();const items=Array.isArray(j.data)?j.data:j.data?.items||j.data?.questions||[];const q=items.find((x:any)=>x.type==='MCQ');test.skip(!q,'No MCQ returned by question list');const res=await request.post(`${api}/writing/evaluations/submit`,{headers:{Authorization:`Bearer ${t}`},data:{questionId:q.id,essayText:'This is an essay. '.repeat(70)}});expect(res.status()).toBe(400);});
