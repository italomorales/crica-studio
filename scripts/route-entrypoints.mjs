import { mkdir, copyFile } from 'node:fs/promises';
for (const route of [
  'loja',
  'fornecedores',
  'login',
  'admin',
  'admin/loja',
  'admin/fornecedores',
  'admin/tipos',
  'admin/configuracoes',
]) {
  await mkdir(`dist/${route}`, { recursive: true });
  await copyFile('dist/index.html', `dist/${route}/index.html`);
}
