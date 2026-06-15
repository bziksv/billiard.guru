/** Prisma client on server is older than DB (new enum value, column, etc.). */
export function isPrismaClientSchemaMismatchError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message;
  return (
    /not found in enum/i.test(msg) ||
    /Inconsistent column data/i.test(msg) ||
    /is not a valid enum/i.test(msg)
  );
}
