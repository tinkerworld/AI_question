# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: current.spec.ts >> evaluation rejects a non-writing question
- Location: ../../../../../../tmp/examos-e2e-rR4hmB/focused/current.spec.ts:26:5

# Error details

```
Error: expect(received).toBe(expected) // Object.is equality

Expected: 400
Received: 201
```

# Test source

```ts
  1  | import {test,expect} from '@playwright/test';
  2  | import {loginAs,goToTab} from '../e2e/helpers/auth';
  3  | const api='http://127.0.0.1:4044/api/v1';
  4  | async function token(request:any,email='student@examos.com',password='Student@123'){
  5  |  const res=await request.post(`${api}/auth/login`,{data:{email,password}});expect(res.status()).toBe(200);const j=await res.json();return j.data.accessToken||j.data.token;
  6  | }
  7  | test('public landing links to student login',async({page})=>{await page.goto('/');await page.locator('#landing-btn-student-login').click();await expect(page.locator('#student-input-email')).toBeVisible();});
  8  | for(const role of ['admin','teacher','student'] as const)test(`${role} current login reaches dashboard`,async({page})=>{await loginAs(page,role);await expect(page.locator('#nav-tab-dashboard')).toBeVisible();});
  9  | test('invalid student login shows error',async({page})=>{await page.goto('/login/student');await page.locator('input[type=email]').fill('invalid@example.com');await page.locator('input[type=password]').fill('InvalidPassword123');await page.locator('button[type=submit]').click();await expect(page.locator('#student-login-error-banner')).toBeVisible();});
  10 | test('mobile login fits 390px viewport',async({page})=>{await page.setViewportSize({width:390,height:844});await page.goto('/login/student');await expect(page.locator('#student-input-email')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(390);});
  11 | test('writing Task 1 opens image, counts words, and submits',async({page})=>{
  12 |  await loginAs(page,'student');await goToTab(page,'writing_practice');
  13 |  await page.locator('#btn-start-writing-q_ielts_wrt_01').click();
  14 |  await expect(page.locator('[data-testid=writing-textarea]')).toBeVisible();
  15 |  const chart=page.locator('img').filter({visible:true}).first();
  16 |  await expect(chart).toBeVisible();
  17 |  expect(await chart.evaluate((img:HTMLImageElement)=>img.complete&&img.naturalWidth>0)).toBeTruthy();
  18 |  await page.locator('[data-testid=writing-textarea]').fill('The chart shows changes in energy production over time.');
  19 |  await expect(page.locator('[data-testid=writing-word-count]')).toHaveText('9');
  20 |  await page.locator('#btn-submit-writing-attempt').click();
  21 |  await expect(page.locator('[data-testid=writing-scorecard]')).toBeVisible({timeout:30000});
  22 | });
  23 | test('writing draft survives refresh',async({page})=>{await loginAs(page,'student');await goToTab(page,'writing_practice');await page.locator('#btn-start-writing-q_ielts_wrt_03').click();const draft='E2E draft recovery: education should prepare students for employment and independent thinking.';await page.locator('[data-testid=writing-textarea]').fill(draft);await page.waitForTimeout(6000);await page.reload();await goToTab(page,'writing_practice');await expect(page.locator('[data-testid=writing-textarea]')).toHaveValue(draft);});
  24 | test('student cannot access staff reviews and export',async({request})=>{const t=await token(request);for(const endpoint of ['reviews/pending','reviews/export']){const res=await request.get(`${api}/writing/${endpoint}`,{headers:{Authorization:`Bearer ${t}`}});expect(res.status()).toBe(403);}});
  25 | test('student cannot enable mock grading through request body',async({request})=>{const t=await token(request);const res=await request.post(`${api}/writing/evaluations/submit`,{headers:{Authorization:`Bearer ${t}`},data:{questionId:'q_ielts_wrt_03',essayText:'Education gives people opportunities. '.repeat(70),allowTestMock:true}});const j=await res.json();await test.info().attach('evaluation-response',{body:JSON.stringify(j,null,2),contentType:'application/json'});expect([400,403].includes(res.status()) || ['REVIEW_REQUIRED','FAILED'].includes(j.data?.status)).toBeTruthy();});
> 26 | test('evaluation rejects a non-writing question',async({request})=>{const t=await token(request,'admin@examos.com','Admin@123');const list=await request.get(`${api}/questions?limit=100`,{headers:{Authorization:`Bearer ${t}`}});const j=await list.json();const items=Array.isArray(j.data)?j.data:j.data?.items||j.data?.questions||[];const q=items.find((x:any)=>x.type==='MCQ');test.skip(!q,'No MCQ returned by question list');const res=await request.post(`${api}/writing/evaluations/submit`,{headers:{Authorization:`Bearer ${t}`},data:{questionId:q.id,essayText:'This is an essay. '.repeat(70)}});expect(res.status()).toBe(400);});
     |                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         ^ Error: expect(received).toBe(expected) // Object.is equality
  27 | 
```