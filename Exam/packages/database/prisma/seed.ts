import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const PERMISSIONS = [
  { key: 'users.create', description: 'Create user accounts', module: 'users' },
  { key: 'users.read', description: 'View user profiles', module: 'users' },
  { key: 'users.update', description: 'Update user profiles', module: 'users' },
  { key: 'users.delete', description: 'Delete user accounts', module: 'users' },
  { key: 'roles.manage', description: 'Manage roles and permissions', module: 'roles' },
  { key: 'audit.read', description: 'View system audit logs', module: 'audit' },
  { key: 'i18n.manage', description: 'Manage multilingual translations', module: 'i18n' },
  { key: 'preferences.update', description: 'Update system preferences', module: 'preferences' },
  { key: 'courses.create', description: 'Create courses and subjects', module: 'courses' },
  { key: 'courses.read', description: 'View courses and syllabus', module: 'courses' },
  { key: 'courses.update', description: 'Update courses and syllabus', module: 'courses' },
  { key: 'courses.delete', description: 'Delete courses', module: 'courses' },
  { key: 'questions.create', description: 'Create question bank items', module: 'questions' },
  { key: 'questions.read', description: 'View question bank', module: 'questions' },
  { key: 'questions.update', description: 'Update question items', module: 'questions' },
  { key: 'questions.delete', description: 'Delete question items', module: 'questions' },
  { key: 'exams.create', description: 'Create exam patterns', module: 'exams' },
  { key: 'exams.read', description: 'View exam patterns and results', module: 'exams' },
  { key: 'exams.publish', description: 'Publish exams', module: 'exams' },
  { key: 'exams.attempt', description: 'Attempt student exams', module: 'exams' },
];

const ROLES = [
  {
    name: 'MAIN_ADMIN',
    description: 'System Super Administrator with full authority',
    isSystem: true,
    permissions: PERMISSIONS.map((p) => p.key),
  },
  {
    name: 'SUB_ADMIN',
    description: 'Delegated Administrator for content & user ops',
    isSystem: true,
    permissions: [
      'users.read', 'users.create', 'users.update',
      'courses.read', 'courses.create', 'courses.update',
      'questions.read', 'questions.create', 'questions.update',
      'exams.read', 'audit.read',
    ],
  },
  {
    name: 'TEACHER',
    description: 'Faculty and question author',
    isSystem: true,
    permissions: [
      'courses.read', 'questions.read', 'questions.create',
      'questions.update', 'exams.read', 'exams.create',
    ],
  },
  {
    name: 'STUDENT',
    description: 'Enrolled learner persona',
    isSystem: true,
    permissions: ['courses.read', 'exams.read', 'exams.attempt'],
  },
];

async function seed() {
  console.log('Seeding permissions...');
  const permMap = new Map<string, string>();

  for (const p of PERMISSIONS) {
    const perm = await prisma.permission.upsert({
      where: { key: p.key },
      update: { description: p.description, module: p.module },
      create: { key: p.key, description: p.description, module: p.module },
    });
    permMap.set(p.key, perm.id);
  }

  console.log('Seeding roles & role-permissions...');
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { name: r.name },
      update: { description: r.description, isSystem: r.isSystem },
      create: { name: r.name, description: r.description, isSystem: r.isSystem },
    });

    for (const permKey of r.permissions) {
      const permId = permMap.get(permKey);
      if (permId) {
        await prisma.rolePermission.upsert({
          where: {
            roleId_permissionId: {
              roleId: role.id,
              permissionId: permId,
            },
          },
          update: {},
          create: {
            roleId: role.id,
            permissionId: permId,
          },
        });
      }
    }
  }

  console.log('Database seed complete!');
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
