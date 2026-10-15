import { mkdir, copyFile, readdir, readFile, writeFile } from 'node:fs/promises';
// Package the exact shell from the frontend release; asset URLs still target the S3 origin.
await mkdir('.blog-html-shell/assets', { recursive: true });
await copyFile('dist/index.html', '.blog-html-shell/index.html');
const styles = [];
for (const name of await readdir('dist/assets'))
    if (/^blog-.*\.css$/.test(name))
    {
        styles.push('/assets/' + name);
        await copyFile('dist/assets/' + name, '.blog-html-shell/assets/' + name);
    }
// A public manifest lets the API render with the exact deployed frontend assets.
await writeFile('dist/blog-shell.json', JSON.stringify({
    html: await readFile('dist/index.html', 'utf8'), styles,
}) + '\n');
