import { mkdir, copyFile, readdir } from 'node:fs/promises';
// Package the exact shell from the frontend release; asset URLs still target the S3 origin.
await mkdir('.blog-html-shell/assets', { recursive: true });
await copyFile('dist/index.html', '.blog-html-shell/index.html');
for (const name of await readdir('dist/assets'))
    if (/^blog-.*\.css$/.test(name))
        await copyFile('dist/assets/' + name, '.blog-html-shell/assets/' + name);
