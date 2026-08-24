import React from 'react';

export interface DiffField {
  fieldName: string;
  label: string;
  oldValue: any;
  newValue: any;
  hasChanged: boolean;
}

interface EntityDiffViewerProps {
  title?: string;
  oldLabel: string;
  newLabel: string;
  oldEntity: Record<string, any> | null;
  newEntity: Record<string, any> | null;
  entityType?: 'Question' | 'User' | 'General';
}

function formatValue(val: any): string {
  if (val === null || val === undefined) return '(none)';
  if (typeof val === 'boolean') return val ? 'True' : 'False';
  if (Array.isArray(val)) {
    if (val.length === 0) return '(empty)';
    if (typeof val[0] === 'object') return JSON.stringify(val, null, 2);
    return val.join(', ');
  }
  if (typeof val === 'object') return JSON.stringify(val, null, 2);
  return String(val);
}

export function computeEntityDiffs(
  oldObj: Record<string, any> | null,
  newObj: Record<string, any> | null,
  entityType: 'Question' | 'User' | 'General' = 'General'
): DiffField[] {
  if (!oldObj && !newObj) return [];
  const oldSafe = oldObj || {};
  const newSafe = newObj || {};

  const diffs: DiffField[] = [];

  if (entityType === 'Question') {
    // 1. Content / Statement
    const oldContent = oldSafe.content ?? '';
    const newContent = newSafe.content ?? '';
    diffs.push({
      fieldName: 'content',
      label: 'Question Statement',
      oldValue: oldContent,
      newValue: newContent,
      hasChanged: oldContent !== newContent,
    });

    // 2. Difficulty
    const oldDiff = oldSafe.difficulty ?? '';
    const newDiff = newSafe.difficulty ?? '';
    diffs.push({
      fieldName: 'difficulty',
      label: 'Difficulty Level',
      oldValue: oldDiff,
      newValue: newDiff,
      hasChanged: oldDiff !== newDiff,
    });

    // 3. Marks
    const oldMarks = oldSafe.marks !== undefined ? String(oldSafe.marks) : '';
    const newMarks = newSafe.marks !== undefined ? String(newSafe.marks) : '';
    diffs.push({
      fieldName: 'marks',
      label: 'Marks / Points',
      oldValue: oldMarks,
      newValue: newMarks,
      hasChanged: oldMarks !== newMarks,
    });

    // 4. Status
    if (oldSafe.status !== undefined || newSafe.status !== undefined) {
      const oldStatus = oldSafe.status ?? '(unchanged)';
      const newStatus = newSafe.status ?? '(unchanged)';
      diffs.push({
        fieldName: 'status',
        label: 'Lifecycle Status',
        oldValue: oldStatus,
        newValue: newStatus,
        hasChanged: oldStatus !== newStatus && oldSafe.status !== undefined && newSafe.status !== undefined,
      });
    }

    // 5. Payload Data (Options, Correct Answer, Explanation)
    const oldData = typeof oldSafe.data === 'string' ? JSON.parse(oldSafe.data || '{}') : (oldSafe.data || {});
    const newData = typeof newSafe.data === 'string' ? JSON.parse(newSafe.data || '{}') : (newSafe.data || {});

    // Correct Answer
    if (oldData.correctAnswer !== undefined || newData.correctAnswer !== undefined) {
      const oldAns = oldData.correctAnswer;
      const newAns = newData.correctAnswer;
      diffs.push({
        fieldName: 'data.correctAnswer',
        label: 'Correct Answer',
        oldValue: formatValue(oldAns),
        newValue: formatValue(newAns),
        hasChanged: JSON.stringify(oldAns) !== JSON.stringify(newAns),
      });
    }

    // Options
    if (oldData.options !== undefined || newData.options !== undefined) {
      const oldOpts = oldData.options || [];
      const newOpts = newData.options || [];
      diffs.push({
        fieldName: 'data.options',
        label: 'Answer Options',
        oldValue: Array.isArray(oldOpts) ? oldOpts.map((o: any) => typeof o === 'object' ? `${o.id || ''}: ${o.text || ''}` : o).join('\n') : formatValue(oldOpts),
        newValue: Array.isArray(newOpts) ? newOpts.map((o: any) => typeof o === 'object' ? `${o.id || ''}: ${o.text || ''}` : o).join('\n') : formatValue(newOpts),
        hasChanged: JSON.stringify(oldOpts) !== JSON.stringify(newOpts),
      });
    }

    // Explanation
    if (oldData.explanation !== undefined || newData.explanation !== undefined) {
      const oldExp = oldData.explanation ?? '';
      const newExp = newData.explanation ?? '';
      diffs.push({
        fieldName: 'data.explanation',
        label: 'Explanation / Solution',
        oldValue: oldExp,
        newValue: newExp,
        hasChanged: oldExp !== newExp,
      });
    }

    // Syllabus mappings
    if (oldSafe.courseId !== undefined || newSafe.courseId !== undefined || oldSafe.subjectId !== undefined || newSafe.subjectId !== undefined) {
      const oldMap = `Course: ${oldSafe.courseId || '(none)'}, Subject: ${oldSafe.subjectId || '(none)'}`;
      const newMap = `Course: ${newSafe.courseId || '(none)'}, Subject: ${newSafe.subjectId || '(none)'}`;
      diffs.push({
        fieldName: 'syllabusMapping',
        label: 'Academic Syllabus Mapping',
        oldValue: oldMap,
        newValue: newMap,
        hasChanged: oldMap !== newMap,
      });
    }
  } else if (entityType === 'User') {
    // 1. First Name
    const oldFn = oldSafe.firstName ?? '';
    const newFn = newSafe.firstName ?? '';
    diffs.push({
      fieldName: 'firstName',
      label: 'First Name',
      oldValue: oldFn,
      newValue: newFn,
      hasChanged: oldFn !== newFn,
    });

    // 2. Last Name
    const oldLn = oldSafe.lastName ?? '';
    const newLn = newSafe.lastName ?? '';
    diffs.push({
      fieldName: 'lastName',
      label: 'Last Name',
      oldValue: oldLn,
      newValue: newLn,
      hasChanged: oldLn !== newLn,
    });

    // 3. Email
    const oldEmail = oldSafe.email ?? '';
    const newEmail = newSafe.email ?? '';
    diffs.push({
      fieldName: 'email',
      label: 'Email Address',
      oldValue: oldEmail,
      newValue: newEmail,
      hasChanged: oldEmail !== newEmail,
    });

    // 4. Role(s)
    const oldRoles = Array.isArray(oldSafe.roles) ? oldSafe.roles.join(', ') : (oldSafe.roles || '(none)');
    const newRoles = Array.isArray(newSafe.roles) ? newSafe.roles.join(', ') : (newSafe.roles || '(none)');
    diffs.push({
      fieldName: 'roles',
      label: 'Assigned Roles',
      oldValue: oldRoles,
      newValue: newRoles,
      hasChanged: oldRoles !== newRoles,
    });

    // 5. Status
    const oldStatus = oldSafe.status ?? '';
    const newStatus = newSafe.status ?? '';
    diffs.push({
      fieldName: 'status',
      label: 'Account Status',
      oldValue: oldStatus,
      newValue: newStatus,
      hasChanged: oldStatus !== newStatus,
    });
  } else {
    // General fallback
    const allKeys = Array.from(new Set([...Object.keys(oldSafe), ...Object.keys(newSafe)]));
    for (const key of allKeys) {
      if (key === 'id' || key === 'createdAt' || key === 'updatedAt' || key === 'version') continue;
      const oldVal = formatValue(oldSafe[key]);
      const newVal = formatValue(newSafe[key]);
      diffs.push({
        fieldName: key,
        label: key,
        oldValue: oldVal,
        newValue: newVal,
        hasChanged: oldVal !== newVal,
      });
    }
  }

  return diffs;
}

export const EntityDiffViewer: React.FC<EntityDiffViewerProps> = ({
  title,
  oldLabel,
  newLabel,
  oldEntity,
  newEntity,
  entityType = 'General',
}) => {
  const diffs = computeEntityDiffs(oldEntity, newEntity, entityType);
  const changedDiffs = diffs.filter((d) => d.hasChanged);
  const unchangedDiffs = diffs.filter((d) => !d.hasChanged);

  return (
    <div
      style={{
        background: 'var(--panel-bg)',
        border: '1px solid var(--border-color)',
        borderRadius: '10px',
        padding: '16px',
        display: 'flex',
        flexDirection: 'column',
        gap: '14px',
      }}
    >
      {title && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>
          <h3 style={{ margin: 0, fontSize: '15px', fontFamily: 'JetBrains Mono', color: 'var(--text-main)' }}>
            {title}
          </h3>
          <div style={{ display: 'flex', gap: '8px', fontSize: '11px', fontFamily: 'JetBrains Mono' }}>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid #ef4444' }}>
              🔴 {oldLabel} (Previous)
            </span>
            <span style={{ color: 'var(--text-muted)' }}>➔</span>
            <span style={{ padding: '2px 8px', borderRadius: '4px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', border: '1px solid #10b981' }}>
              🟢 {newLabel} (Target)
            </span>
          </div>
        </div>
      )}

      {changedDiffs.length === 0 ? (
        <div style={{ padding: '16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px', background: 'var(--bg-color)', borderRadius: '6px' }}>
          ✨ No field modifications detected between {oldLabel} and {newLabel}.
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '12px', fontWeight: 'bold', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
            Modified Fields ({changedDiffs.length})
          </div>

          {changedDiffs.map((diff) => (
            <div
              key={diff.fieldName}
              style={{
                background: 'var(--bg-color)',
                border: '1px solid rgba(245, 158, 11, 0.3)',
                borderRadius: '8px',
                padding: '12px',
                display: 'flex',
                flexDirection: 'column',
                gap: '8px',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontWeight: 'bold', fontSize: '12px', color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>
                  {diff.label}
                </span>
                <span style={{ fontSize: '10px', background: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                  CHANGED
                </span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                {/* Old Value */}
                <div
                  style={{
                    background: 'rgba(239, 68, 68, 0.08)',
                    border: '1px solid rgba(239, 68, 68, 0.25)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#ef4444', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {oldLabel} (Old)
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#f87171',
                      textDecoration: 'line-through',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    {formatValue(diff.oldValue)}
                  </div>
                </div>

                {/* New Value */}
                <div
                  style={{
                    background: 'rgba(16, 185, 129, 0.08)',
                    border: '1px solid rgba(16, 185, 129, 0.25)',
                    borderRadius: '6px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                  }}
                >
                  <div style={{ fontSize: '10px', color: '#10b981', fontWeight: 'bold', textTransform: 'uppercase' }}>
                    {newLabel} (New)
                  </div>
                  <div
                    style={{
                      fontSize: '12px',
                      color: '#34d399',
                      fontWeight: '500',
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      lineHeight: '1.4',
                    }}
                  >
                    {formatValue(diff.newValue)}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {unchangedDiffs.length > 0 && (
        <details style={{ marginTop: '6px' }}>
          <summary style={{ cursor: 'pointer', fontSize: '12px', color: 'var(--text-muted)', userSelect: 'none' }}>
            Unchanged Fields ({unchangedDiffs.length})
          </summary>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
            {unchangedDiffs.map((diff) => (
              <div
                key={diff.fieldName}
                style={{
                  background: 'var(--bg-color)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '6px',
                  padding: '6px 10px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  fontSize: '11px',
                }}
              >
                <span style={{ color: 'var(--text-muted)' }}>{diff.label}:</span>
                <span style={{ color: 'var(--text-main)', fontFamily: 'JetBrains Mono' }}>{formatValue(diff.oldValue)}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
};
