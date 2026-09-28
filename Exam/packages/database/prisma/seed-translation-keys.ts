import { pgDb } from '@repo/database';
import { AITranslationService } from '../../../apps/api/src/services/ai-translation.service';
import { BASELINE_LANGUAGES } from '@repo/types';

import {
  TranslationKeyDefinition,
  SEED_TRANSLATION_KEYS,
} from '../../../apps/api/src/constants/seed-translation-keys';

export { TranslationKeyDefinition, SEED_TRANSLATION_KEYS };

export async function runTranslationKeysSeed(): Promise<void> {
  console.log('================================================================');
  console.log('STARTING I18N TRANSLATION KEYS & BASELINE SEED');
  console.log('================================================================');

  // 1. Ensure baseline languages exist in DB
  let seededLangs = 0;
  for (const lang of BASELINE_LANGUAGES) {
    await pgDb.query(
      `INSERT INTO "languages" ("id", "code", "name", "nativeName", "isDefault")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("code") DO UPDATE SET "name" = EXCLUDED."name", "nativeName" = EXCLUDED."nativeName", "isDefault" = EXCLUDED."isDefault"`,
      [lang.id, lang.code, lang.name, lang.nativeName, Boolean(lang.isDefault)]
    );
    seededLangs++;
  }
  console.log(`✓ Languages synchronized: ${seededLangs} baseline languages.`);

  // 2. Fetch language ID mapping
  const langRows = await pgDb.query(`SELECT "id", "code" FROM "languages"`);
  const langIdMap = new Map<string, string>();
  langRows.rows.forEach((r: any) => langIdMap.set(r.code, r.id));

  const enLangId = langIdMap.get('en');
  if (!enLangId) {
    throw new Error('English ("en") baseline language not found in DB');
  }

  // 3. Seed translation keys & English translation rows (with isVerified = true)
  let seededKeys = 0;
  const allKeysPayload = [];

  for (const def of SEED_TRANSLATION_KEYS) {
    const keyId = `tk_${def.key}`;
    await pgDb.query(
      `INSERT INTO "translation_keys" ("id", "key", "description", "module", "category")
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT ("key") DO UPDATE SET "description" = EXCLUDED."description", "module" = EXCLUDED."module", "category" = EXCLUDED."category"`,
      [keyId, def.key, def.description, def.module, def.category || 'general']
    );

    // Fetch confirmed keyId from DB in case it pre-existed with different ID
    const actualKeyRes = await pgDb.query(`SELECT "id" FROM "translation_keys" WHERE "key" = $1`, [def.key]);
    const actualKeyId = actualKeyRes.rows[0]?.id || keyId;

    // English translation row (isVerified = true)
    const enTransId = `t_en_${def.key}`;
    await pgDb.query(
      `INSERT INTO "translations" ("id", "languageId", "translationKeyId", "value", "isVerified")
       VALUES ($1, $2, $3, $4, true)
       ON CONFLICT ("languageId", "translationKeyId")
       DO UPDATE SET "value" = EXCLUDED."value", "isVerified" = true`,
      [enTransId, enLangId, actualKeyId, def.english]
    );

    allKeysPayload.push({
      key: def.key,
      en: def.english,
      description: def.description,
      module: def.module,
    });
    seededKeys++;
  }
  // Ensure all English translations have isVerified = true
  await pgDb.query(`UPDATE "translations" SET "isVerified" = true WHERE "languageId" = $1`, [enLangId]);
  console.log(`✓ Translation keys seeded: ${seededKeys} keys with English base translations (all verified).`);

  // 4. Batch AI translation pass for all non-English baseline languages (Part B)
  console.log('Executing batch translation pass for all baseline languages...');
  let totalTranslatedLangs = 0;

  for (const lang of BASELINE_LANGUAGES) {
    if (lang.code === 'en') continue;
    const targetCode = lang.code;

    try {
      const translatedMap = await AITranslationService.translateBatchForLanguage(targetCode, allKeysPayload, lang.name);
      // Persist with isVerified = false (Part B)
      const count = await AITranslationService.persistTranslations(targetCode, translatedMap, false);
      totalTranslatedLangs++;
      console.log(`  - ${lang.name} (${targetCode}): ${count} keys populated (isVerified = false).`);
    } catch (langErr) {
      console.warn(`  ! Warning translating ${targetCode}:`, langErr);
    }
  }

  console.log(`✓ Batch AI translation pass complete across ${totalTranslatedLangs} baseline languages.`);
  console.log('================================================================');
}

if (require.main === module) {
  runTranslationKeysSeed()
    .then(async () => {
      await pgDb.close();
      process.exit(0);
    })
    .catch(async (e) => {
      console.error('Translation keys seed error:', e);
      try {
        await pgDb.close();
      } catch {}
      process.exit(1);
    });
}
