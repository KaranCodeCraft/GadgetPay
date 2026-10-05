import { Prisma } from "@prisma/client";

const models = Prisma.dmmf.datamodel.models;
for (const m of models) {
  console.log(`\nModel: ${m.name} (dbName: ${m.dbName || m.name})`);
  for (const f of m.fields) {
    if (f.kind === 'scalar') {
      console.log(`  ${f.name}: ${f.type}${f.isRequired ? '!' : '?'} (default: ${JSON.stringify(f.default)})`);
    } else if (f.kind === 'object') {
      console.log(`  [rel] ${f.name} -> ${f.type} (fields: ${f.relationFromFields}, refs: ${f.relationToFields})`);
    }
  }
}
