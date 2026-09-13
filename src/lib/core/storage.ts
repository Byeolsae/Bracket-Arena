export type ExportEnvelope<T> = {
  version: 1;
  type: string;
  exportedAt: string;
  data: T;
};

export function createExportEnvelope<T>(type: string, data: T): ExportEnvelope<T> {
  return {
    version: 1,
    type,
    exportedAt: new Date().toISOString(),
    data
  };
}

export function serializeExport<T>(type: string, data: T): string {
  return JSON.stringify(createExportEnvelope(type, data), null, 2);
}

export function parseExportEnvelope<T>(json: string, expectedType: string): ExportEnvelope<T> {
  const payload = JSON.parse(json) as ExportEnvelope<T>;

  if (payload.version !== 1 || payload.type !== expectedType) {
    throw new Error("잘못된 JSON 파일입니다.");
  }

  return payload;
}
