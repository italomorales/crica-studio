import test from 'node:test';
import assert from 'node:assert/strict';
import { blogReadingMinutes } from '../src/app/blog/blog-reading-time.ts';

const paragraph = (text: string) => ({ type: 'paragraph', content: [{ type: 'text', text }] });
const words = (count: number) => Array(count).fill('palavra').join(' ');

test('server estimate is shared by lightweight cards and the full article', () => {
    const document = { type: 'doc', content: [] };
    assert.equal(blogReadingMinutes({ readingMinutes: 4, document, html: '' }), 4);
    assert.equal(blogReadingMinutes({ readingMinutes: 4, html: `<p>${words(610)}</p>` }), 4);
});

test('listing and full article show the same time even when list HTML is omitted', () => {
    const document = { type: 'doc', content: [paragraph(words(601))] };
    assert.equal(blogReadingMinutes({ document, html: '' }), 4);
    assert.equal(blogReadingMinutes({ document, html: `<p>${words(601)}</p><aside>Ver produto</aside>` }), 4);
});

test('formatted text stays joined within words while paragraphs and line breaks separate words', () => {
    const document = { type: 'doc', content: [
        paragraph(words(199)),
        { type: 'paragraph', content: [
            { type: 'text', text: 'cri' }, { type: 'text', text: 'atividade', marks: [{ type: 'bold' }] },
        ] },
    ] };
    assert.equal(blogReadingMinutes({ document, html: '' }), 1);
    const withLineBreak = { type: 'doc', content: [...document.content,
        { type: 'paragraph', content: [{ type: 'hardBreak' }, { type: 'text', text: 'começar' }] },
    ] };
    assert.equal(blogReadingMinutes({ document: withLineBreak, html: '' }), 2);
});

test('each translation has its own estimate; blank content keeps a one-minute minimum', () => {
    assert.equal(blogReadingMinutes({ document: { type: 'doc', content: [paragraph(words(200))] }, html: '' }), 1);
    assert.equal(blogReadingMinutes({ document: { type: 'doc', content: [paragraph(words(401))] }, html: '' }), 3);
    assert.equal(blogReadingMinutes({ document: { type: 'doc', content: [] }, html: '' }), 1);
});

test('legacy content without an editorial document falls back to HTML and handles block boundaries', () => {
    assert.equal(blogReadingMinutes({ html: `<p>${words(200)}</p><p>outra&nbsp;palavra</p>` }), 2);
    assert.equal(blogReadingMinutes({ html: '' }), 1);
});
