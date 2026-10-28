import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createElement, Fragment } from 'react';
import { flattenTextFragments, readableText } from '../src/utils/springTextContent.js';

test('heading fragments preserve explicit breaks and emphasis for the text engine', () => {
    const content = createElement(Fragment, null, 'Clinical precision.', createElement('br'), createElement('em', null, 'Human dignity.'));
    const tokens = flattenTextFragments(content);
    assert.equal(tokens.length, 3);
    assert.equal(tokens[1].type, 'br');
    assert.equal(tokens[2].type, 'em');
    assert.equal(readableText(content), 'Clinical precision. Human dignity.');
});

test('accessible text retains dynamic values without treating icons as words', () => {
    const content = ['Your ', createElement('strong', null, 'report'), ': ', 118, createElement('svg', { 'aria-hidden': true })];
    assert.equal(readableText(content), 'Your report: 118');
});
