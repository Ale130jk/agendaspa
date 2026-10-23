import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { openApiDocument } from './openapi';

const target = resolve(__dirname, '../../../docs/openapi.json');
mkdirSync(dirname(target), { recursive: true });
writeFileSync(target, `${JSON.stringify(openApiDocument, null, 2)}\n`, 'utf8');
console.info(`OpenAPI written to ${target}`);
