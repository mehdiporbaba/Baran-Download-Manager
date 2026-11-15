const fs = require('node:fs')
const path = require('node:path')
const ROOT = path.resolve(__dirname, '..')
const SOURCE = path.join(ROOT, 'docs', 'releases')
const TAG = /^(?:v\d+\.\d+\.\d+(?:-[a-z0-9.]+)?|firefox-v\d+\.\d+\.\d+)$/
function pair(value, label) {
  for (const language of ['en', 'fa']) {
    if (!value || typeof value[language] !== 'string' || !value[language].trim()) throw Error(`${label}: missing ${language} translation`)
    if (/<\/?[a-z][^>]*>/i.test(value[language])) throw Error(`${label}: write text/inline Markdown; RTL HTML is generated centrally`)
  }
  if (!/[\u0600-\u06ff]/.test(value.fa)) throw Error(`${label}: Persian translation must contain Persian text`)
  const prose = text => text.replace(/\]\(https:\/\/[^\s)]+\)/g, ']').replace(/`[^`]+`/g, '')
  const englishWords = (prose(value.en).match(/[a-z]{2,}/gi) || []).length
  const persianWords = (prose(value.fa).match(/[\u0600-\u06ff]+/g) || []).length
  if (englishWords >= 12 && persianWords < Math.ceil(englishWords * 0.45)) throw Error(`${label}: Persian text appears to be a short summary, not a full translation`)
  const tokens = [...value.en.matchAll(/`([^`]+)`/g)].map(match => match[1])
  for (const token of tokens) if (!value.fa.includes('`' + token + '`')) throw Error(`${label}: Persian translation lost code/name ${token}`)
  for (const match of value.en.matchAll(/\]\((https:\/\/[^\s)]+)\)/g)) if (!value.fa.includes('](' + match[1] + ')')) throw Error(`${label}: Persian translation lost link ${match[1]}`)
}
function validate(document) {
  if (document.schema !== 1 || !TAG.test(document.tag || '')) throw Error('Invalid release-note schema or tag')
  pair(document.title, 'title')
  if (!Array.isArray(document.blocks) || !document.blocks.length) throw Error('Release notes require bilingual blocks')
  const ids = new Set()
  for (const block of document.blocks) {
    if (!/^[a-z][a-z0-9-]*$/.test(block.id || '') || ids.has(block.id)) throw Error('Each block needs a unique stable ID')
    ids.add(block.id)
    if (!['paragraph', 'heading', 'bullet'].includes(block.type)) throw Error(`Unsupported block type: ${block.type}`)
    pair(block, block.id)
  }
  return document
}
function escape(text) { return text.replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]) }
function inline(text) {
  const pattern = /`([^`]+)`|\*\*([^*]+)\*\*|\[([^\]]+)\]\((https:\/\/[^\s)]+)\)/g
  let output = '', position = 0
  for (const match of text.matchAll(pattern)) {
    output += escape(text.slice(position, match.index))
    output += match[1] ? `<span dir="ltr"><code>${escape(match[1])}</code></span>` : match[2] ? `<strong>${inline(match[2])}</strong>` : `<a href="${escape(match[4])}">${inline(match[3])}</a>`
    position = match.index + match[0].length
  }
  return output + escape(text.slice(position))
}
function render(document) {
  validate(document)
  const id = document.tag.replace(/[^a-z0-9-]/g, '-')
  const english = document.blocks.map(block => block.type === 'heading' ? `## ${block.en}` : block.type === 'bullet' ? `- ${block.en}` : block.en).join('\n\n')
  let persian = '', list = false
  for (const block of document.blocks) {
    if (block.type === 'bullet' && !list) { persian += '<ul>\n'; list = true }
    if (block.type !== 'bullet' && list) { persian += '</ul>\n\n'; list = false }
    const element = block.type === 'heading' ? 'h3' : block.type === 'bullet' ? 'li' : 'p'
    persian += `<${element} align="right">${inline(block.fa)}</${element}>\n`
  }
  if (list) persian += '</ul>\n'
  return `<!-- Generated from docs/releases/${document.tag}.json; edit paired translations there. -->\n<a id="en-${id}"></a>\n\n# ${document.title.en}\n\n[فارسی](#fa-${id})\n\n${english}\n\n<a id="fa-${id}"></a>\n\n<div dir="rtl" lang="fa" align="right">\n<h2 align="right">${inline(document.title.fa)}</h2>\n<p align="right"><a href="#en-${id}" dir="ltr">English</a></p>\n${persian}\n</div>\n`
}
function read(tag) {
  if (!TAG.test(tag)) throw Error('Invalid release tag')
  const document = JSON.parse(fs.readFileSync(path.join(SOURCE, tag + '.json'), 'utf8'))
  if (document.tag !== tag) throw Error('Release-note file/tag mismatch')
  return validate(document)
}
function markdownFile(tag) { return path.join(ROOT, 'docs', 'RELEASE-' + tag.replace(/^v/, '') + '.md') }
function loadReleaseNotes(tag) {
  const body = render(read(tag))
  const existing = fs.readFileSync(markdownFile(tag), 'utf8').replace(/\r\n/g, '\n')
  if (existing !== body) throw Error(`${tag}: generated release notes are stale; run node scripts/release-notes.cjs --write`)
  return body
}
function tags() { return fs.readdirSync(SOURCE).filter(name => name.endsWith('.json')).map(name => name.slice(0, -5)).sort() }
if (require.main === module) {
  const write = process.argv.includes('--write')
  for (const tag of tags()) { if (write) fs.writeFileSync(markdownFile(tag), render(read(tag))); else loadReleaseNotes(tag) }
  // A version bump cannot publish until that exact version has complete notes.
  loadReleaseNotes('v' + JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8')).version)
  console.log(`${write ? 'Generated' : 'Validated'} ${tags().length} complete English/Persian release descriptions.`)
}
module.exports = { validate, render, read, tags, loadReleaseNotes }
