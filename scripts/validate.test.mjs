// node --test scripts/*.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { frontmatter, satisfies, validate } from './validate.mjs';

test('caret, tilde, exact and >= ranges', () => {
  assert.ok(satisfies('1.1.0', '^1.0.0'));
  assert.ok(!satisfies('2.0.0', '^1.0.0'));
  assert.ok(satisfies('0.2.5', '^0.2.0'));
  assert.ok(!satisfies('0.3.0', '^0.2.0'));
  assert.ok(satisfies('1.0.9', '~1.0.0'));
  assert.ok(!satisfies('1.1.0', '~1.0.0'));
  assert.ok(satisfies('1.0.0', '1.0.0'));
  assert.ok(satisfies('3.0.0', '>=1.4.0'));
  assert.ok(!satisfies('1.0.0', 'latest'));
});

test('frontmatter reads scalars and lists', () => {
  const fm = frontmatter('---\nname: a\ntools: Read, Grep\nskills:\n  - x:y\n  - x:z\n---\nbody');
  assert.deepEqual(fm, { name: 'a', tools: 'Read, Grep', skills: ['x:y', 'x:z'] });
  assert.equal(frontmatter('no frontmatter'), null);
});

test('the marketplace in this repository is valid', () => {
  assert.deepEqual(validate(), []);
});
