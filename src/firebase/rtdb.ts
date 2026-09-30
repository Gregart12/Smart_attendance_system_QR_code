import {
  equalTo,
  get,
  limitToFirst,
  limitToLast,
  onValue,
  orderByChild,
  push,
  query as rtdbQuery,
  ref as dbRef,
  remove,
  set,
  update,
  type DatabaseReference,
  type DataSnapshot,
  type Query as RtdbQuery,
  type QueryConstraint
} from 'firebase/database';
import { db } from './config';
import * as rtdbKeys from './rtdbKeys';

/**
 * Realtime Database data layer with a Firestore-shaped API.
 *
 * This project runs on the Firebase Spark (free) plan, where Cloud Firestore
 * cannot be provisioned, so storage is served by the Realtime Database instead.
 * The shim keeps `services.ts` reading like document-oriented code
 * (doc/getDoc/setDoc/query/onSnapshot) while every read and write is an RTDB
 * operation.
 *
 * Two behavioural differences are handled here and nowhere else:
 *
 * 1. RTDB keys may not contain `. # $ [ ] /` or control characters. Emails
 *    (accountEmails) and staff IDs (staffIds) do, so every path segment is
 *    escaped on the way in and unescaped on the way out. Escaping happens in
 *    `doc()`/`collection()`, so all call sites stay unchanged.
 * 2. RTDB rejects `undefined` values, which optional fields produce. Writes are
 *    stripped before they are sent, matching Firestore's behaviour of omitting
 *    those fields.
 */

// ================= PATH ESCAPING =================

const { encodeKey, decodeKey, encodePath, sanitize } = rtdbKeys;

// ================= REFERENCES =================

export type CollectionRef = {
  readonly kind: 'collection';
  readonly path: string;
  readonly name: string;
};

export type DocRef = {
  readonly kind: 'doc';
  readonly path: string;
  readonly id: string;
};

export type Ref = CollectionRef | DocRef;

const toDatabaseRef = (target: Ref): DatabaseReference => dbRef(db, target.path);

export function collection(first: unknown, second?: string): CollectionRef {
  if (first && typeof first === 'object' && (first as Ref).kind === 'collection') {
    const parent = first as CollectionRef;
    return {
      kind: 'collection',
      path: `${parent.path}/${encodeKey(second as string)}`,
      name: second as string
    };
  }
  // `db` is accepted and ignored so call sites can read like `doc(db, ...)`.
  return { kind: 'collection', path: encodePath([second as string]), name: second as string };
}

/**
 * Builds a document reference. Supports the three shapes used in this codebase:
 *
 *   doc(db, 'staff', uid)
 *   doc(db, 'system', 'bootstrap')
 *   doc(collection(db, 'attendanceRecords'))   // auto-generated id
 */
export function doc(first: unknown, ...segments: string[]): DocRef {
  if (first && typeof first === 'object' && (first as Ref).kind === 'collection') {
    const parent = first as CollectionRef;
    // The key is generated locally and only persisted by the caller's setDoc,
    // matching Firestore's auto-id behaviour.
    const generated = push(toDatabaseRef(parent));
    return { kind: 'doc', path: `${parent.path}/${generated.key as string}`, id: generated.key as string };
  }

  if (first && typeof first === 'object' && (first as Ref).kind === 'doc') {
    return first as DocRef;
  }

  const path = encodePath(segments);
  const last = path.split('/').pop() ?? '';
  return { kind: 'doc', path, id: decodeKey(last) };
}

// ================= QUERY CONSTRAINTS =================

export type WhereConstraint = {
  readonly type: 'where';
  readonly field: string;
  readonly op: '==' | '!=' | '<' | '<=' | '>' | '>=';
  readonly value: unknown;
};

export type OrderConstraint = {
  readonly type: 'orderBy';
  readonly field: string;
  readonly direction: 'asc' | 'desc';
};

export type LimitConstraint = {
  readonly type: 'limit';
  readonly count: number;
};

export type Constraint = WhereConstraint | OrderConstraint | LimitConstraint;

export function where(field: string, op: WhereConstraint['op'], value: unknown): WhereConstraint {
  return { type: 'where', field, op, value };
}

export function orderBy(field: string, direction: 'asc' | 'desc' = 'asc'): OrderConstraint {
  return { type: 'orderBy', field, direction };
}

export function limit(count: number): LimitConstraint {
  return { type: 'limit', count };
}

export type Query = {
  readonly kind: 'query';
  readonly target: CollectionRef;
  readonly constraints: Constraint[];
};

export function query(target: CollectionRef, ...constraints: Constraint[]): Query {
  return { kind: 'query', target, constraints };
}

// ================= QUERY PLANNING =================

type Plan = {
  /** Sort field pushed to the server, if any. */
  sortField: string | null;
  /** Equality filter the server can apply, if any. */
  served: WhereConstraint | null;
  /** Filters that must be applied in memory. */
  residual: WhereConstraint[];
  order: OrderConstraint | null;
  limit: LimitConstraint | null;
};

const planQuery = (q: Query): Plan => {
  const wheres = q.constraints.filter((c): c is WhereConstraint => c.type === 'where');
  const order = (q.constraints.find((c): c is OrderConstraint => c.type === 'orderBy') ?? null) as OrderConstraint | null;
  const limitConstraint = (q.constraints.find((c): c is LimitConstraint => c.type === 'limit') ?? null) as LimitConstraint | null;

  // RTDB orders by a single child and can only equality-filter that same child.
  const served =
    wheres.find((w) => w.op === '==' && (!order || w.field === order.field)) ?? null;

  return {
    sortField: order?.field ?? served?.field ?? null,
    served,
    residual: wheres.filter((w) => w !== served),
    order,
    limit: limitConstraint
  };
};

/** Assembles the RTDB query, keeping the limit clause last as the SDK requires. */
const buildRtdbQuery = (base: DatabaseReference, plan: Plan): RtdbQuery | DatabaseReference => {
  const parts: QueryConstraint[] = [];

  if (plan.sortField) parts.push(orderByChild(plan.sortField));
  if (plan.served && !plan.order) parts.push(equalTo(plan.served.value as string | number | boolean));
  if (plan.limit) {
    parts.push(plan.order?.direction === 'desc' ? limitToLast(plan.limit.count) : limitToFirst(plan.limit.count));
  }

  return parts.length > 0 ? rtdbQuery(base, ...parts) : base;
};

const matchesConstraint = (data: Record<string, unknown>, constraint: WhereConstraint): boolean => {
  const actual = data?.[constraint.field];
  const expected = constraint.value;

  switch (constraint.op) {
    case '==':
      return actual === expected;
    case '!=':
      return actual !== expected;
    case '<':
      return typeof actual === 'number' && actual < (expected as number);
    case '<=':
      return typeof actual === 'number' && actual <= (expected as number);
    case '>':
      return typeof actual === 'number' && actual > (expected as number);
    case '>=':
      return typeof actual === 'number' && actual >= (expected as number);
    default:
      return true;
  }
};

const compareBy = (a: unknown, b: unknown): number => {
  if (a === b) return 0;
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  return (a as never) > (b as never) ? 1 : -1;
};

// ================= SNAPSHOTS =================

export type DocSnapshot = {
  readonly id: string;
  exists: () => boolean;
  // Mirrors Firestore's DocumentData, which callers cast to their own record
  // types. Kept loose on purpose so call sites do not need double casts.
  data: () => any;
};

export type QuerySnapshot = {
  readonly docs: DocSnapshot[];
  readonly empty: boolean;
  readonly size: number;
  forEach: (callback: (doc: DocSnapshot) => void) => void;
};

const buildQuerySnapshot = (entries: { id: string; data: unknown }[]): QuerySnapshot => {
  const docs: DocSnapshot[] = entries.map((entry) => ({
    id: entry.id,
    exists: () => entry.data !== null && entry.data !== undefined,
    data: () => entry.data
  }));

  return {
    docs,
    empty: docs.length === 0,
    size: docs.length,
    forEach: (callback) => {
      docs.forEach(callback);
    }
  };
};

/** Turns an RTDB value into snapshot-shaped documents, applying in-memory filters. */
const toSnapshot = (snapshot: DataSnapshot, plan: Plan): QuerySnapshot => {
  if (!snapshot.exists()) return buildQuerySnapshot([]);

  const entries: { id: string; data: unknown }[] = [];
  snapshot.forEach((child) => {
    if (child.val() === null) return;
    entries.push({ id: decodeKey(child.key), data: child.val() });
  });

  const filtered = plan.residual.length > 0
    ? entries.filter((entry) => plan.residual.every((w) => matchesConstraint(entry.data as Record<string, unknown>, w)))
    : entries;

  if (plan.order) {
    const field = plan.order.field;
    filtered.sort((a, b) => {
      const result = compareBy(
        (a.data as Record<string, unknown>)?.[field],
        (b.data as Record<string, unknown>)?.[field]
      );
      return plan.order?.direction === 'desc' ? -result : result;
    });
  }

  return buildQuerySnapshot(filtered);
};

// ================= READS =================

export async function getDoc(target: DocRef): Promise<DocSnapshot> {
  if (!target || target.kind !== 'doc') {
    throw new Error('getDoc() expects a document reference.');
  }

  const snapshot = await get(toDatabaseRef(target));
  return {
    id: target.id,
    exists: () => snapshot.exists(),
    data: () => snapshot.val() ?? undefined
  };
}

export async function getDocs(target: CollectionRef | Query): Promise<QuerySnapshot> {
  if (!target || (target.kind !== 'collection' && target.kind !== 'query')) {
    throw new Error('getDocs() expects a collection or query.');
  }

  const q = target as Query;
  const isQuery = (target as Query).kind === 'query';
  const plan = isQuery ? planQuery(q) : { sortField: null, served: null, residual: [], order: null, limit: null };
  const collectionRef = isQuery ? q.target : (target as CollectionRef);

  const snapshot = await get(buildRtdbQuery(toDatabaseRef(collectionRef), plan));
  return toSnapshot(snapshot, plan);
}

// ================= WRITES =================

export async function setDoc(target: DocRef, data: any): Promise<void> {
  if (!target || target.kind !== 'doc') {
    throw new Error('setDoc() expects a document reference.');
  }
  await set(toDatabaseRef(target), (sanitize(data) ?? {}) as never);
}

export async function addDoc(target: CollectionRef, data: any): Promise<DocRef> {
  if (!target || target.kind !== 'collection') {
    throw new Error('addDoc() expects a collection reference.');
  }
  const generated = push(toDatabaseRef(target));
  await set(generated, (sanitize(data) ?? {}) as never);
  return { kind: 'doc', path: `${target.path}/${generated.key as string}`, id: generated.key as string };
}

export async function updateDoc(target: DocRef, data: any): Promise<void> {
  if (!target || target.kind !== 'doc') {
    throw new Error('updateDoc() expects a document reference.');
  }
  const cleaned = (sanitize(data) ?? {}) as Record<string, unknown>;
  if (Object.keys(cleaned).length === 0) return;
  await update(toDatabaseRef(target), cleaned as never);
}

export async function deleteDoc(target: DocRef): Promise<void> {
  if (!target || target.kind !== 'doc') {
    throw new Error('deleteDoc() expects a document reference.');
  }
  await remove(toDatabaseRef(target));
}

// ================= REALTIME =================

/**
 * Subscribes to a document or a query. RTDB pushes a value on every change
 * rather than a snapshot diff, which suits this app: every consumer re-renders
 * from the full list anyway.
 */
export function onSnapshot(
  target: DocRef | CollectionRef | Query,
  next: (snapshot: any) => void,
  onError?: (error: Error) => void
): () => void {
  if (!target || (target.kind !== 'doc' && target.kind !== 'collection' && target.kind !== 'query')) {
    onError?.(new Error('onSnapshot() requires a document, collection or query.'));
    return () => undefined;
  }

  const reportError = (error: Error) => {
    if (onError) onError(error);
    else console.error('Realtime Database subscription error:', error);
  };

  if ((target as DocRef).kind === 'doc') {
    const docRef = target as DocRef;
    return onValue(
      toDatabaseRef(docRef),
      (snapshot) => {
        const data = snapshot.val() ?? undefined;
        next({ id: docRef.id, exists: () => data !== undefined, data: () => data });
      },
      (error) => reportError(error)
    );
  }

  const q = target as Query;
  const isQuery = (target as Query).kind === 'query';
  const plan = isQuery ? planQuery(q) : { sortField: null, served: null, residual: [], order: null, limit: null };
  const collectionRef = isQuery ? q.target : (target as CollectionRef);

  return onValue(
    buildRtdbQuery(toDatabaseRef(collectionRef), plan),
    (snapshot) => {
      next(toSnapshot(snapshot, plan));
    },
    (error) => reportError(error)
  );
}
