<Syllabus Management — Functional Specification>
## 1. Overview
The Syllabus Management module provides a robust hierarchical structure for organizing educational content. It models the curriculum as a recursive tree, starting from Courses and Subjects down to Units, Topics, Subtopics, and atomic Concepts. This granular structure enables precise tagging of questions, highly targeted adaptive testing, and detailed performance analytics.

## 2. User Stories
- As a Main Admin or Sub-Admin, I want to create a hierarchical syllabus tree so that content is organized logically.
- As an Admin, I want to drag-and-drop syllabus nodes to reorder them easily.
- As an Admin, I want to perform bulk operations (copying subtrees) to save time when creating similar syllabi for different courses.
- As a Teacher, I want to navigate the syllabus tree to understand the curriculum and find specific topics to assign assessments on.

## 3. Permissions & Access Control
| Action | Main Admin | Sub-Admin | Teacher | Student | Preview Student |
| :--- | :--- | :--- | :--- | :--- | :--- |
| View Syllabus Tree | ✅ | ✅ | ✅ | ✅ (Read-only) | ✅ (Read-only) |
| Create Nodes | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Edit Nodes | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Delete Nodes | ✅ | ✅ | ❌ | ❌ | ❌ |
| Reorder Nodes | ✅ | ✅ | ⚙️ | ❌ | ❌ |
| Bulk Move/Copy | ✅ | ✅ | ❌ | ❌ | ❌ |

## 4. Features & Capabilities

### 4.1 Hierarchical Syllabus Tree
**What it does**: Models curriculum as a recursive structure: Course → Subject → Unit → Topic → Subtopic → Concept.
**How it works**:
- Data is stored using an adjacency list model with `parent_id`.
- Each node has a defined `depth` (level in the hierarchy) and `order` (for sorting among siblings).
- Example: Class 12 Mathematics (Course) → Algebra (Subject) → Matrices (Unit) → Types of Matrices (Topic) → Diagonal Matrix (Concept).
**Business Rules**: Maximum allowed depth is 6 levels to prevent UI and querying complexity.
**Edge Cases**: Orphaned nodes if a parent is deleted (handled by cascading deletes or preventing deletion).

### 4.2 Node Metadata Management
**What it does**: Stores detailed information about each node in the syllabus.
**How it works**:
- When creating or editing a node, users provide a title, description, learning objectives, estimated hours to complete, status (Active/Inactive), and searchable tags.
**Business Rules**: Title is mandatory. Status defaults to Active.
**Edge Cases**: Long descriptions truncated in tree view but fully visible in details panel.

### 4.3 Drag-and-Drop Reordering
**What it does**: Allows intuitive restructuring of the syllabus.
**How it works**:
- In the UI tree builder, users can drag a node up/down to change its order among siblings.
- Users can drag a node inside another node to change its parent.
- Backend receives the new parent and sibling order, updating `parent_id` and `order_index` accordingly.
**Business Rules**: Cannot drag a node to become a child of its own descendant (circular reference prevention).
**Edge Cases**: Dragging a large subtree updates ordering efficiently without timing out.

### 4.4 Bulk Operations
**What it does**: Allows copying or moving entire subtrees.
**How it works**:
- User selects a node (e.g., "Unit 1: Algebra") and clicks "Duplicate".
- The system recursively copies the node and all its descendants, creating a new subtree.
**Business Rules**: Duplicated nodes have " (Copy)" appended to their titles initially.
**Edge Cases**: Copying massive subtrees might take time; should be handled asynchronously if node count exceeds a threshold.

## 5. Data Model
```
Table: syllabus_nodes
├── id (PK, CUID)
├── course_id (CUID, FK to courses) — Root reference for faster querying
├── parent_id (CUID, FK to syllabus_nodes, NULL for root)
├── title (String)
├── description (Text)
├── learning_objectives (Text)
├── estimated_hours (Float)
├── depth_level (Int) — E.g., 1 for Unit, 2 for Topic
├── order_index (Int) — For sibling sorting
├── status (Enum: ACTIVE, INACTIVE)
├── tags (JSONB)
├── created_at (Timestamp)
└── updated_at (Timestamp)
```

## 6. API Endpoints
| Method | Endpoint | Description | Request Body | Response | Auth | Permission |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| GET | `/api/v1/courses/:id/syllabus` | Get full syllabus tree for a course | | `[TreeNodeObject]` | Bearer | Any |
| POST | `/api/v1/syllabus-nodes` | Create new node | `NodePayload` | `NodeObject` | Bearer | Admin |
| PUT | `/api/v1/syllabus-nodes/:id` | Update node details | `NodePayload` | `NodeObject` | Bearer | Admin |
| DELETE | `/api/v1/syllabus-nodes/:id` | Delete node and children | | `SuccessMessage` | Bearer | Admin |
| PATCH | `/api/v1/syllabus-nodes/reorder` | Update node positions | `[{id, parentId, order}]`| `SuccessMessage` | Bearer | Admin |
| POST | `/api/v1/syllabus-nodes/:id/duplicate`| Copy subtree | `{ targetParentId }` | `[NodeObject]` | Bearer | Admin |

## 7. UI Screens & Components
### Screen: Syllabus Tree Builder
**URL**: `/admin/courses/:id/syllabus`
**Layout**: Two-pane layout. Left pane shows an expandable/collapsible tree view of the syllabus. Right pane shows the details and edit form for the currently selected node.
**Interactive Elements**: 
- Tree nodes with expand/collapse arrows.
- Drag handles on nodes.
- "Add Child", "Add Sibling", "Delete", "Duplicate" context menu actions on nodes.
- Rich text editor in the right pane for learning objectives.
**States**: Empty state with "Start building syllabus", loading skeleton while fetching tree.

## 8. Business Rules
1. Maximum hierarchy depth is 6 levels.
2. A node cannot be deleted if it has questions tagged to it in the Question Bank (soft delete or warning required).
3. Moving a node to a new parent automatically updates its `depth_level` and the depth of all its descendants.
4. Circular parent-child relationships are strictly prohibited.

## 9. Validation Rules
- **Title**: Required, max 255 chars.
- **Parent ID**: Must reference an existing node within the same course.
- **Order Index**: Must be an integer >= 0.

## 10. Error Handling
- `422 Unprocessable Entity`: If dragging a node creates a circular reference.
- `400 Bad Request`: If trying to nest beyond the maximum depth of 6.
- `409 Conflict`: If attempting to delete a node linked to active questions.

## 11. Integration Points
- **Course Management**: Syllabus is attached to a specific Course/Subject.
- **Question Bank**: Questions are tagged to specific syllabus nodes (usually Concepts or Subtopics).
- **Analytics Engine**: Performance is aggregated up the syllabus tree (e.g., student is weak in Matrices, therefore weak in Algebra).

## 12. Configuration Options
- Customize terminology for levels (e.g., Level 1 = "Module", Level 2 = "Chapter" instead of Unit/Topic).
- Set max depth limit globally.

## 13. Future Enhancements
- Syllabus versioning (tracking curriculum changes year-over-year).
- Import syllabus from CSV/Excel.
- Export syllabus tree to PDF.
</Syllabus Management — Functional Specification>
