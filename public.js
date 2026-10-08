'use strict';
const $ = selector => document.querySelector(selector);
let records = [], siteCopy = { ...BUNDLED_COPY }, observer;
function el(tag, cls, text) { const node = document.createElement(tag); if (cls) node.className = cls; if (text !== undefined) node.textContent = text; return node; }
function validImage(image) { return typeof image === 'string' && (/^assets\/portrait-[1-8]\.svg$/.test(image) || /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/=]+$/.test(image)); }
function validateRecords(data) {
 if (!Array.isArray(data) || data.length > 300) throw Error('Invalid archive');
 const ids = new Set();
 return data.map((row, index) => {
  if (!row || typeof row.name !== 'string' || !row.name.trim() || row.name.length > 80 || typeof row.community !== 'string' || !row.community.trim() || row.community.length > 120 || !Number.isInteger(row.year) || row.year < 1900 || row.year > 2100 || !validImage(row.image) || row.image.length > 2500000 || typeof row.note !== 'string' || row.note.length > 2000) throw Error('Invalid character');
  const id = typeof row.id === 'string' && row.id.length < 100 ? row.id : 'character-' + index;
  if (ids.has(id)) throw Error('Duplicate character'); ids.add(id);
  return {id, name: row.name, community: row.community, year: row.year, image: row.image, note: row.note};
 });
}
function validateCopy(data) {
 if (!data || typeof data !== 'object' || Array.isArray(data)) throw Error('Invalid copy');
 const next = {};
 for (const key of ['titleLead','titleAccent','subtitle','spine','characterLabel','seasonLabel','viewStory','footerHandle']) {
  const value = data[key] ?? BUNDLED_COPY[key];
  if (typeof value !== 'string' || value.length > 600) throw Error('Invalid text');
  next[key] = value;
 }
 if (/^VIEW STORY/i.test(next.viewStory)) next.viewStory = '더보기';
 next.spine = next.spine.replace(/\s*[—–-]\s*\d+\s*\/\s*∞\s*$/, '');
 if (next.subtitle.trim() === 'THE CHARACTER FILES') next.subtitle = 'ONE NAN';
 return next;
}
function applyCopy() {
 document.querySelectorAll('[data-copy]').forEach(node => { if (node.dataset.copy in siteCopy) node.textContent = siteCopy[node.dataset.copy]; });
 $('#spine-count').textContent = ' — ' + String(records.length).padStart(2,'0') + ' / ∞';
 document.title = [siteCopy.titleLead, siteCopy.titleAccent].filter(Boolean).join(' ') || 'Character Archive';
}
function showDetail(id) {
 const row = records.find(record => record.id === id); if (!row) return;
 $('#detail-image').src = BUNDLED_PORTRAITS[row.image] || row.image; $('#detail-image').alt = row.name;
 $('#detail-name').textContent = row.name; $('#detail-year').textContent = row.year + ' / CHARACTER ARCHIVE';
 $('#detail-community').textContent = row.community; $('#detail-note').textContent = row.note;
 $('#detail').showModal();
}
function render() {
 const archive = $('#archive'), nav = $('#years'); archive.replaceChildren(); nav.replaceChildren();
 const years = [...new Set(records.map(row => row.year))].sort((a,b) => b-a);
 $('#total').textContent = String(records.length).padStart(2,'0') + ' ' + siteCopy.characterLabel + ' / ' + years.length + ' ' + siteCopy.seasonLabel;
 years.forEach(year => {
  const group = records.filter(row => row.year === year), link = el('a','',String(year)); link.href = '#year-' + year; nav.append(link);
  const section = el('section','year-section'); section.id = 'year-' + year;
  const heading = el('div','year-heading'), title = el('div','year-title'); title.append(el('h2','',String(year)),el('span','',String(group.length).padStart(2,'0') + ' ' + siteCopy.characterLabel)); heading.append(title); section.append(heading);
  const grid = el('div','grid');
  group.forEach((row,index) => {
   const card = el('button','card'); card.setAttribute('aria-label',row.name+' · '+row.community+' · '+year+'년 상세 보기');
   const portrait = el('div','portrait'); portrait.dataset.viewStory = siteCopy.viewStory;
   const image = el('img'); image.src = BUNDLED_PORTRAITS[row.image] || row.image; image.alt = row.name+'의 초상'; image.loading = 'lazy'; portrait.append(image);
   const meta = el('div','card-meta'); meta.append(el('span','card-name',row.name),el('span','card-num',String(index+1).padStart(2,'0')));
   card.append(portrait,meta,el('div','card-community',row.community)); card.onclick = () => showDetail(row.id); grid.append(card);
  });
  section.append(grid); const caption = el('div','year-caption'); caption.append(el('span','',''),el('span','',String(year))); section.append(caption); archive.append(section);
 });
 if (!years.length) archive.append(el('p','empty','아직 등록된 캐릭터가 없습니다.'));
 observer?.disconnect(); observer = new IntersectionObserver(entries => { for (const entry of entries) if (entry.isIntersecting) nav.querySelectorAll('a').forEach(link => link.classList.toggle('active',link.hash === '#'+entry.target.id)); },{rootMargin:'-10% 0px -60% 0px'});
 document.querySelectorAll('.year-section').forEach(section => observer.observe(section)); applyCopy();
}
$('#detail [data-close]').onclick = () => $('#detail').close();
$('#detail').addEventListener('click', event => { if (event.target !== $('#detail')) return; const rect = $('#detail').getBoundingClientRect(); if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) $('#detail').close(); });
records = validateRecords(BUNDLED_ARCHIVE); siteCopy = validateCopy(BUNDLED_COPY); render();
async function refreshPublishedData() {
 const results = await Promise.allSettled([fetch('archive.json',{cache:'no-store'}).then(response => {if(!response.ok) throw Error('Unavailable');return response.json();}).then(validateRecords),fetch('settings.json',{cache:'no-store'}).then(response => {if(!response.ok) throw Error('Unavailable');return response.json();}).then(validateCopy)]);
 if (results[0].status === 'fulfilled') records = results[0].value;
 if (results[1].status === 'fulfilled') siteCopy = results[1].value;
 render();
}
refreshPublishedData();
