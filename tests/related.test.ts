import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cambridgeLink, parseRelated } from '../src/lib/related';

test('only Cambridge HTTPS dictionary/topic URLs are accepted', () => {
  const base = 'https://dictionary.cambridge.org/dictionary/english/learn';
  assert.equal(cambridgeLink('/dictionary/english/study?x=1#top', base), 'https://dictionary.cambridge.org/dictionary/english/study');
  for (const link of ['http://dictionary.cambridge.org/dictionary/english/test', 'https://evil.test/dictionary/english/test', '//dictionary.cambridge.org.evil.test/topics/test/', 'https://user@dictionary.cambridge.org/topics/test/', '/login', 'javascript:alert(1)']) {
    assert.equal(cambridgeLink(link, base), null);
  }
});

test('relationship fixtures preserve explicit evidence and ignore navigation or unsafe links', () => {
  const source = 'https://dictionary.cambridge.org/dictionary/english/learn';
  const result = parseRelated(`<nav><a href="/dictionary/english/home">Home</a></nav>
    <div class="xref synonyms"><strong>Synonyms</strong><a href="/dictionary/english/study"><span class="x-h">study</span></a></div>
    <div class="xref opposite"><a href="/dictionary/english/forget">forget</a></div>
    <div class="word-family"><a href="/dictionary/english/learner">learner</a></div>
    <div class="smartt"><a href="/topics/education/studying/">Studying</a>
      <a href="/dictionary/english/revise">revise<span class="pos">verb</span></a>
      <a href="/dictionary/english/study">study</a><a href="https://evil.test/dictionary/english/trap">trap</a></div>`, source);
  assert.deepEqual(result.words.map(word => [word.term, word.relation]), [['study', 'synonym'], ['forget', 'antonym'], ['learner', 'word-family'], ['revise', 'related']]);
  assert.equal(result.words[0].sourceUrl, source);
  assert.equal(result.topic, 'https://dictionary.cambridge.org/topics/education/studying/');
  assert.deepEqual(parseRelated('<html>Access denied</html>', source), { words: [], topic: null });
});
