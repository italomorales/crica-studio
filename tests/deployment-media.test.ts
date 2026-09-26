import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

test('deployment must preserve uploaded catalog media when synchronizing the shared S3 bucket', () => {
    const workflow = readFileSync(new URL('../.github/workflows/main.yml', import.meta.url), 'utf8');
    const syncCommands = workflow.split(/\r?\n/).filter(line => /aws\s+s3\s+sync\s/.test(line));
    assert.ok(syncCommands.length, 'Expected an S3 deployment command');
    for (const command of syncCommands) {
        if (/--delete\b/.test(command)) {
            assert.match(command, /--exclude\s+['"]catalog\/\*['"]/, 'Deleting sync must exclude the uploaded media prefix');
            assert.doesNotMatch(command, /--include\s/, 'A later include can override media protection');
        }
    }
});
