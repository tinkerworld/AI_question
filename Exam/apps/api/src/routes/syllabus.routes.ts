import { Router, Request, Response, NextFunction } from 'express';
import { pgDb } from '@repo/database';
import { createSyllabusNodeSchema, updateSyllabusNodeSchema, reorderSyllabusNodeSchema } from '@repo/validation';
import { PERMISSIONS } from '@repo/permissions';
import { authenticate } from '../middleware/auth';
import { requirePermission } from '../middleware/permission';
import { validate } from '../middleware/validate';
import { auditLog } from '../middleware/audit';
import { AppError } from '../middleware/error';
import crypto from 'crypto';

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
    const subjectId = (req.params as any).subjectId || (req.query as any).subjectId;
    let query = `SELECT * FROM "syllabus_nodes"`;
    const params: any[] = [];
    if (subjectId) {
      params.push(subjectId);
      query += ` WHERE "subjectId" = $1`;
    }
    query += ` ORDER BY "orderIndex" ASC`;
    const nodesRes = await pgDb.query(query, params);
    res.json({ success: true, data: nodesRes.rows });
  } catch (err) {
    next(err);
  }
});

// Get nested tree structure for syllabus
router.get('/tree', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const subjectId = (req.params as any).subjectId || (req.query as any).subjectId;
    const caller = req.user!;
    const isStudent = caller.roles.includes('STUDENT') && !caller.roles.includes('MAIN_ADMIN') && !caller.roles.includes('SUB_ADMIN');

    let query = `SELECT * FROM "syllabus_nodes" WHERE 1=1`;
    const params: any[] = [];
    if (subjectId) {
      params.push(subjectId);
      query += ` AND "subjectId" = $${params.length}`;
    }
    if (isStudent) {
      query += ` AND "status" = 'PUBLISHED'`;
    }
    query += ` ORDER BY "orderIndex" ASC`;

    const nodesRes = await pgDb.query(query, params);
    const tree = buildTree(nodesRes.rows);
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
      const { parentId, title, type = 'TOPIC', orderIndex = 0, description, learningObjectives, estimatedMinutes = 60, status = 'PUBLISHED', tags = [] } = req.body;

      let depth = 0;
      if (parentId) {
        const parentRes = await pgDb.query(`SELECT * FROM "syllabus_nodes" WHERE "id" = $1`, [parentId]);
        if (parentRes.rows.length === 0) {
          throw new AppError(404, 'PARENT_NODE_NOT_FOUND', `Parent node ${parentId} not found`);
        }
        const parent = parentRes.rows[0];
        depth = parent.depth + 1;
        if (depth > MAX_DEPTH) {
          throw new AppError(400, 'MAX_DEPTH_EXCEEDED', `Maximum syllabus depth limit of 4 levels exceeded`);
        }
      }

      const id = `node_${crypto.randomBytes(8).toString('hex')}`;
      const insertRes = await pgDb.query(
        `INSERT INTO "syllabus_nodes" ("id", "subjectId", "parentId", "title", "type", "depth", "orderIndex", "description", "learningObjectives", "estimatedMinutes", "status", "tags", "createdAt", "updatedAt")
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, NOW(), NOW())
         RETURNING *`,
        [
          id,
          subjectId,
          parentId || null,
          title,
          type,
          depth,
          orderIndex,
          description || null,
          learningObjectives ? JSON.stringify(learningObjectives) : null,
          estimatedMinutes,
          status,
          tags || [],
        ]
      );

      res.status(201).json({ success: true, data: insertRes.rows[0] });
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

      const existingRes = await pgDb.query(`SELECT * FROM "syllabus_nodes" WHERE "id" = $1`, [id]);
      if (existingRes.rows.length === 0) {
        throw new AppError(404, 'NODE_NOT_FOUND', 'Node not found');
      }
      const existing = existingRes.rows[0];

      const updatedTitle = title !== undefined ? title : existing.title;
      const updatedType = type !== undefined ? type : existing.type;
      const updatedDesc = description !== undefined ? description : existing.description;
      const updatedLO = learningObjectives !== undefined ? JSON.stringify(learningObjectives) : existing.learningObjectives;
      const updatedMin = estimatedMinutes !== undefined ? estimatedMinutes : existing.estimatedMinutes;
      const updatedStatus = status !== undefined ? status : existing.status;
      const updatedTags = tags !== undefined ? tags : existing.tags;

      const updateRes = await pgDb.query(
        `UPDATE "syllabus_nodes"
         SET "title" = $1, "type" = $2, "description" = $3, "learningObjectives" = $4, "estimatedMinutes" = $5, "status" = $6, "tags" = $7, "updatedAt" = NOW()
         WHERE "id" = $8
         RETURNING *`,
        [updatedTitle, updatedType, updatedDesc, updatedLO, updatedMin, updatedStatus, updatedTags, id]
      );

      res.json({ success: true, data: updateRes.rows[0] });
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
      const { parentId, orderIndex = 0 } = req.body;

      // Cyclic parent check
      if (parentId === id) {
        throw new AppError(400, 'CYCLIC_PARENT_ERROR', 'A node cannot be set as a child of itself');
      }

      let newDepth = 0;
      if (parentId) {
        const targetRes = await pgDb.query(`SELECT * FROM "syllabus_nodes" WHERE "id" = $1`, [parentId]);
        if (targetRes.rows.length === 0) throw new AppError(404, 'TARGET_PARENT_NOT_FOUND', 'Target parent node not found');
        newDepth = targetRes.rows[0].depth + 1;
        if (newDepth > MAX_DEPTH) {
          throw new AppError(400, 'MAX_DEPTH_EXCEEDED', 'Reordering would exceed max depth of 4 levels');
        }
      }

      const updateRes = await pgDb.query(
        `UPDATE "syllabus_nodes"
         SET "parentId" = $1, "orderIndex" = $2, "depth" = $3, "updatedAt" = NOW()
         WHERE "id" = $4
         RETURNING *`,
        [parentId || null, orderIndex, newDepth, id]
      );

      res.json({ success: true, data: updateRes.rows[0] });
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
      await pgDb.query(`DELETE FROM "syllabus_nodes" WHERE "id" = $1 OR "parentId" = $1`, [id]);
      res.json({ success: true, message: 'Node and children deleted successfully' });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
