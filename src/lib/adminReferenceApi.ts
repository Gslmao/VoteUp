import { NextResponse } from 'next/server';
import { z } from 'zod';
import { adminMutateReference } from '@/lib/procedures';

const schemas = {
  parties: z.object({
    name: z.string().trim().min(1).max(150),
    symbol: z.string().trim().max(100),
    founded: z.union([z.literal(''), z.string().date()]),
  }).strict(),
  constituencies: z.object({
    name: z.string().trim().min(1).max(150),
    stateId: z.number().int().positive(),
    voters: z.number().int().nonnegative(),
  }).strict(),
  observers: z.object({
    name: z.string().trim().min(1).max(150),
    constituencyId: z.number().int().positive(),
    electionId: z.number().int().positive(),
  }).strict(),
};

export type ReferenceEntity = keyof typeof schemas;
export type ReferenceCollection = ReferenceEntity | 'states';

export function isReferenceCollection(value: string): value is ReferenceCollection {
  return value === 'parties' || value === 'constituencies' ||
    value === 'observers' || value === 'states';
}

export async function mutateReference(
  request: Request,
  adminId: number,
  entity: string,
  operation: 'CREATE' | 'UPDATE' | 'DELETE',
  recordId: number | null
) {
  if (!Object.hasOwn(schemas, entity)) {
    return NextResponse.json({ error: 'Unsupported reference type' }, { status: 404 });
  }

  const validatedEntity = entity as ReferenceEntity;
  let data: Record<string, unknown> = {};
  if (operation !== 'DELETE') {
    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json({ error: 'Request body must be valid JSON' }, { status: 400 });
    }
    const parsed = schemas[validatedEntity].safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Invalid input', details: parsed.error.flatten() },
        { status: 400 }
      );
    }
    data = parsed.data;
  }

  const dbData = validatedEntity === 'parties'
    ? { name: data.name, symbol: data.symbol, founded: data.founded }
    : validatedEntity === 'constituencies'
      ? {
          name: data.name,
          state_id: data.stateId,
          voters: data.voters,
        }
      : {
          name: data.name,
          constituency_id: data.constituencyId,
          election_id: data.electionId,
        };

  try {
    const result = await adminMutateReference(
      adminId,
      validatedEntity,
      operation,
      recordId,
      dbData
    );
    return operation === 'DELETE'
      ? NextResponse.json({ success: true })
      : NextResponse.json(result, { status: operation === 'CREATE' ? 201 : 200 });
  } catch (error) {
    const code = typeof error === 'object' && error !== null && 'code' in error
      ? error.code
      : undefined;
    if (code === 'P0002') {
      return NextResponse.json({ error: 'Record not found' }, { status: 404 });
    }
    if (code === '23505') {
      return NextResponse.json({ error: 'A record with these details already exists' }, { status: 409 });
    }
    if (code === '23503') {
      return NextResponse.json({ error: 'Record is referenced by other data' }, { status: 409 });
    }
    console.error(`Error ${operation.toLowerCase()}ing ${entity}:`, error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
