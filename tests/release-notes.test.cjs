const test = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { execFileSync } = require('node:child_process')
const { validate, render, read, tags, loadReleaseNotes } = require('../scripts/release-notes.cjs')
const fixture = () => ({schema: 1, tag: 'v3.0.0', title: {en: 'Baran `3.0.0`', fa: 'باران `3.0.0`'}, blocks: [{id: 'change', type: 'bullet', en: 'Use `Setup.exe` and [guide](https://example.com/guide).', fa: 'از `Setup.exe` و [راهنما](https://example.com/guide) استفاده کنید.'}]})
test('README uses complete checked translation pairs and matches the desktop version', () => {
  const readme = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../docs/readme.json'), 'utf8'))
  const pkg = JSON.parse(fs.readFileSync(path.resolve(__dirname, '../package.json'), 'utf8'))
  validate(readme)
  assert.equal(readme.tag, 'v' + pkg.version)
  execFileSync(process.execPath, [path.resolve(__dirname, '../scripts/readme.cjs')])
})
test('missing, placeholder, duplicate and summary-only Persian blocks stop publication', () => {
  for (const change of [value => { delete value.blocks[0].fa }, value => { value.blocks[0].fa = 'English only' }, value => { value.blocks.push({...value.blocks[0]}) }, value => { value.blocks[0].en = 'This release adds many download features and contains important installation instructions plus validation details and known limitations that every user should read before updating their desktop application.'; value.blocks[0].fa = 'خلاصهٔ نسخه' }]) {
    const value = fixture(); change(value); assert.throws(() => validate(value))
  }
})
test('translations must retain English file/code tokens and guide destinations', () => {
  let value = fixture(); value.blocks[0].fa = 'فایل و [راهنما](https://example.com/guide) را دریافت کنید.'; assert.throws(() => render(value), /lost code/)
  value = fixture(); value.blocks[0].fa = 'فایل `Setup.exe` را از راهنمای دیگری دریافت کنید.'; assert.throws(() => render(value), /lost link/)
})
test('renderer owns the RTL wrapper, right alignment and supported LTR spans', () => {
  const output = render(fixture())
  assert.match(output, /<div dir="rtl" lang="fa" align="right">/)
  assert.match(output, /<li align="right">/)
  assert.match(output, /<span dir="ltr"><code>Setup\.exe<\/code><\/span>/)
  assert.ok(!output.includes('<bdi'))
  assert.equal((output.match(/^- Use /gm) || []).length, 1)
  assert.equal((output.match(/<li align="right">/g) || []).length, 1)
})
test('every published source has synchronized generated notes and paired blocks', () => {
  assert.equal(tags().length >= 5, true)
  for (const tag of tags()) { const document = read(tag); assert.ok(document.blocks.every(block => block.en && block.fa)); assert.equal(loadReleaseNotes(tag), render(document)) }
})
test('all release publishers obtain their body from the validated shared loader', () => {
  const folder = path.resolve(__dirname, '../.github/workflows')
  const publishers = fs.readdirSync(folder).filter(file => /github\.rest\.repos\.(?:createRelease|updateRelease)\(/.test(fs.readFileSync(path.join(folder, file), 'utf8')))
  assert.ok(publishers.length >= 4)
  for (const file of publishers) {
    const workflow = fs.readFileSync(path.join(folder, file), 'utf8')
    assert.match(workflow, /loadReleaseNotes\(tag\)/)
    assert.ok(!/const body = ['"]/.test(workflow), `${file} must not embed a separate handwritten body`)
  }
})
