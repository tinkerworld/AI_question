import { Router, Request, Response, NextFunction } from 'express';
import { prisma } from '@repo/database';
import { createSyllabusNodeSchema, updateSyllabusNodeSchema, reorderSyllabusNodeSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';

const router = Router({ mergeParams: true });

router.use(authenticate);

const MAX_DEPTH = 3; // Depths 0 (UNIT), 1 (TOPIC), 2 (SUBTOPIC), 3 (CONCEPT) -> total 4 levels

// Helper function to build nested JSON tree from flat nodes list
function buildTree(nodes: any[]): any[] {
  const nodeMap = new Map<string, any>();
  const rootNodes: any[] = [];

  nodes.forEach((n) => {
    nodeMap.set(n.id, { ...n, children: [] });
  });

  nodes.forEach((n) => {
    const current = nodeMap.get(n.id);
    if (n.parentId && nodeMap.has(n.parentId)) {
      nodeMap.get(n.parentId).children.push(current);
    } else {
      rootNodes.push(current);
    }
  });

  return rootNodes;
}

// Get flat list of syllabus nodes
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.params;
    const nodes = await prisma.syllabusNode.findMany({
      where: { subjectId },
      orderBy: { orderIndex: 'asc' },
    });
    res.json({ success: true, data: nodes });
  } catch (err) {
    next(err);
  }
});

// Get nested tree structure for syllabus
router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { subjectId } = req.params;
    const caller = req.user!;
    const isStudent = caller.roles.includes('STUDENT') && !caller.roles.includes('MAIN_ADMIN') && !caller.roles.includes('SUB_ADMIN');

    const where: any = { subjectId };
    if (isStudent) {
      where.status = 'PUBLISHED';
    }

    const nodes = await prisma.syllabusNode.findMany({
      where,
      orderBy: { orderIndex: 'asc' },
    });

    const tree = buildTree(nodes);
    res.json({ success: true, data: tree });
  } catch (err) {
    next(err);
  }
});

// Create syllabus node
router.post(
  '/',
  requirePermission(PERMISSIONS.COURSES_CREATE),
  validate(createSyllabusNodeSchema),
  auditLog('CREATE', 'syllabus_node'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { subjectId } = req.params;
      const { parentId, title, type, orderIndex, description, learningObjectives, estimatedMinutes, status, tags } = req.body;

      let depth = 0;
      if (parentId) {
        const parent = await prisma.syllabusNode.findUnique({ where: { id: parentId } });
        if (!parent) {
          throw new AppError(404, 'PARENT_NODE_NOT_FOUND', `Parent node ${parentId} not found`);
        }
        depth = parent.depth + 1;
        if (depth > MAX_DEPTH) {
          throw new AppError(400, 'MAX_DEPTH_EXCEEDED', `Maximum syllabus depth limit of 4 levels exceeded`);
        }
      }

      const node = await prisma.syllabusNode.create({
        data: {
          subjectId,
          parentId: parentId || null,
          title,
          type,
          depth,
          orderIndex: orderIndex || 0,
          description,
          learningObjectives,
          estimatedMinutes: estimatedMinutes || 60,
          status: status || 'PUBLISHED',
          tags: tags || [],
        },
      });

      res.status(201).json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }
);

// Update syllabus node / metadata
router.patch(
  '/node/:id',
  requirePermission(PERMISSIONS.COURSES_UPDATE),
  validate(updateSyllabusNodeSchema),
  auditLog('UPDATE', 'syllabus_node'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { title, type, description, learningObjectives, estimatedMinutes, status, tags } = req.body;

      const node = await prisma.syllabusNode.update({
        where: { id },
        data: {
          title,
          type,
          description,
          learningObjectives,
          estimatedMinutes,
          status,
          tags,
        },
      });

      res.json({ success: true, data: node });
    } catch (err) {
      next(err);
    }
  }
);

// Reorder / move node
router.patch(
  '/node/:id/reorder',
  requirePermission(PERMISSIONS.COURSES_UPDATE),
  validate(reorderSyllabusNodeSchema),
  auditLog('REORDER', 'syllabus_node'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      const { parentId, orderIndex } = req.body;

      // Cyclic parent check
      if (parentId === id) {
        throw new AppError(400, 'CYCLIC_PARENT_ERROR', 'A node cannot be set as a child of itself');
      }

      let newDepth = 0;
      if (parentId) {
        const targetParent = await prisma.syllabusNode.findUnique({ where: { id: parentId } });
        if (!targetParent) throw new AppError(404, 'TARGET_PARENT_NOT_FOUND', 'Target parent node not found');
        newDepth = targetParent.depth + 1;
        if (newDepth > MAX_DEPTH) {
          throw new AppError(400, 'MAX_DEPTH_EXCEEDED', 'Reordering would exceed max depth of 4 levels');
        }
      }

      const updated = await prisma.syllabusNode.update({
        where: { id },
        data: {
          parentId: parentId || null,
          orderIndex,
          depth: newDepth,
        },
      });

      res.json({ success: true, data: updated });
    } catch (err) {
      next(err);
    }
  }
);

// Delete node (cascades children)
router.delete(
  '/node/:id',
  requirePermission(PERMISSIONS.COURSES_DELETE),
  auditLog('DELETE', 'syllabus_node'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { id } = req.params;
      await prisma.syllabusNode.delete({ where: { id } });
      res.json({ success: true, message: 'Node and children deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
