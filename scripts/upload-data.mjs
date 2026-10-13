import fs from 'node:fs/promises';
import path from 'node:path';
import { put } from '@vercel/blob';
if (!process.env.BLOB_READ_WRITE_TOKEN || !process.env.BLOB_PREFIX) throw new Error('Set your private Blob token and namespace first.');
const root=process.env.MOMONEY_DATA_DIR || '.data';
for(const name of ['snapshot.json','history.json','analysis.json','receipts.json','tasks.json']) {
  const text=await fs.readFile(path.join(root,name),'utf8');JSON.parse(text);
  await put(`${process.env.BLOB_PREFIX.replace(/\/+$/,'')}/${name}`,text,{access:'private',allowOverwrite:true,addRandomSuffix:false,contentType:'application/json'});
  console.log(`Uploaded ${name}`);
}
