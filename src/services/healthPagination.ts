/** Read a complete bounded native result before exposing any records to persistence. */
export async function readAllHealthPages<T>(
  readPage: (pageToken?: string) => Promise<{ records: T[]; pageToken?: string | null }>,
  limits: { maxPages: number; maxRecords: number } = { maxPages: 100, maxRecords: 100_000 },
): Promise<T[]> {
  if (
    !Number.isInteger(limits.maxPages) ||
    limits.maxPages < 1 ||
    !Number.isInteger(limits.maxRecords) ||
    limits.maxRecords < 1
  )
    throw new Error('Invalid health read limits.');
  const records: T[] = [];
  const seenTokens = new Set<string>();
  let pageToken: string | undefined;
  for (let page = 0; page < limits.maxPages; page++) {
    const result = await readPage(pageToken);
    if (records.length + result.records.length > limits.maxRecords)
      throw new Error('Health import exceeded its record limit.');
    records.push(...result.records);
    const nextToken = result.pageToken;
    if (nextToken == null || nextToken === '') return records;
    if (seenTokens.has(nextToken)) throw new Error('Health import repeated a result page.');
    seenTokens.add(nextToken);
    pageToken = nextToken;
  }
  throw new Error('Health import exceeded its page limit.');
}
