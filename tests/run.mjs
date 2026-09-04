// Runner dei test del motore diagnostico — nessun framework.
// Esecuzione:  node tests/run.mjs   (oppure: npm test)   Exit code 0 = tutto verde.
//
// Perche' esistono: fino alla v3.11.0 il motore viveva dentro index.html e le verifiche
// erano manuali, descritte nei .txt di riepilogo. Cosi' il FIX 2 della v3.11.0 (mitosi
// non e' criterio di Grade 4) era stato applicato al ramo IDH-wildtype e dimenticato in
// quello IDH-mutato, senza che nulla lo segnalasse.
import { createRequire } from 'node:module';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const E = require('../engine.js');
const { computeDiagnosis, computeMeningiomaDiagnosis, resolveIdh, isNotDone } = E;

let pass = 0, fail = 0; const failures = [];
const check = (name, cond, detail = '') => cond ? pass++ : (fail++, failures.push(name + (detail ? ` — ${detail}` : '')));
const eq = (name, actual, expected) => check(name, actual === expected, `atteso ${JSON.stringify(expected)}, ottenuto ${JSON.stringify(actual)}`);
const section = t => console.log(`\n• ${t}`);
const has = (r, tipo, re) => (r.alerts || []).some(a => a.type === tipo && re.test(a.msg));
const critici = r => (r.alerts || []).filter(a => a.type === 'critical').map(a => a.msg);

// Input completo con i default del form (tutti i select a "—", numeri a 0).
function g(over = {}) {
  const base = {
    age: 0, location: '', imaging: '', cellularity: '', atypia: '', mitosis: 0, celltype: '',
    gfap: '', 'idh-ihc': '', atrx: '', p53: 0, olig2: '', h3k27me3: '', ki67: 0,
    'idh-ngs': '', 'tp53-ngs': '', '1p19q': '', tert: '', h3f3a: '', cdkn2a: '',
    pik3ca: '', pten: '', nf1: '', mtor: '', mgmt: '', 'egfr-cnv': '', 'egfr-snv': '',
    'erbb2-cnv': '', 'met-cnv': '', 'chr7-10': '', braf: '', 'ntrk-fusion': '',
    'ret-fusion': '', 'ros1-fusion': '', 'alk-fusion': '', 'nrg1-fusion': '',
    'fgfr-fusion': '', 'met-fusion': '', 'msi-status': '', 'mmr-ihc': '', tmb: 0,
    pole: '', lynch: '', histFeatures: { necrosis: false, microvascular: false }
  };
  const out = Object.assign({}, base, over);
  out.histFeatures = Object.assign({}, base.histFeatures, over.histFeatures || {});
  return out;
}
const m = (over = {}) => Object.assign({
  age: 0, sex: '', location: '', nf2Clinical: '', recurrence: '', subtype: 'non-specificato',
  mitosis: 0, brainInvasion: '', necrosis: '', hypercell: false, smallCells: false,
  nucleoli: false, sheet: false, frankMalig: '', ki67: 0, ema: '', pr: '', p53: '',
  sstr2a: '', h3k27me3: '', tert: '', cdkn2a: '', nf2: '', bap1: '', chr22q: ''
}, over);

// ══════════════════════════════════════════════════════════════════════════
section('resolveIdh — regola unica per stato IDH');
eq('NGS mutato → isMut', resolveIdh(g({ 'idh-ngs': 'mut-r132h' })).isMut, true);
eq('NGS wildtype → isWt', resolveIdh(g({ 'idh-ngs': 'wildtype' })).isWt, true);
eq('NGS N.E. + IHC pos → isMut', resolveIdh(g({ 'idh-ngs': 'not-done', 'idh-ihc': 'positive' })).isMut, true);
eq('NGS N.E. + IHC neg → isWt', resolveIdh(g({ 'idh-ngs': 'not-done', 'idh-ihc': 'negative' })).isWt, true);
eq('niente dati → status null', resolveIdh(g()).status, null);
eq('IHC neg senza NGS → ihcNegUnconfirmed', resolveIdh(g({ 'idh-ihc': 'negative' })).ihcNegUnconfirmed, true);
eq('IHC neg + NGS fatto → non unconfirmed', resolveIdh(g({ 'idh-ihc': 'negative', 'idh-ngs': 'wildtype' })).ihcNegUnconfirmed, false);
check('isNotDone: N.E. e vuoto equivalenti', isNotDone('not-done') && isNotDone('') && !isNotDone('lost'));

// ══════════════════════════════════════════════════════════════════════════
section('non-regressione v3.11.0 (casi del riepilogo)');

const gbmRif = computeDiagnosis(g({ age: 67, location: 'emisfero', 'idh-ihc': 'negative', atrx: 'retained', ki67: 5, celltype: 'astrocytic', tert: 'mutato', 'egfr-cnv': 'not-amplified', 'chr7-10': 'not-done', nf1: 'mutato', histFeatures: { necrosis: true } }));
eq('GBM riferimento — entita', gbmRif.entity, 'Glioblastoma, IDH-wildtype (WHO CNS5 2021)');
eq('GBM riferimento — grado', gbmRif.grade, 'WHO Grade 4');
check('GBM riferimento — critico morfologico', has(gbmRif, 'critical', /Criteri morfologici Grade 4: Necrosi/));
check('GBM riferimento — critico molecolare', has(gbmRif, 'critical', /cIMPACT-NOW.*TERT mut/));
check('GBM riferimento — eta ≥55 non blocca', has(gbmRif, 'info', /età ≥55/));

const wt40 = computeDiagnosis(g({ age: 40, 'idh-ihc': 'negative', atrx: 'retained', tert: 'wildtype', 'egfr-cnv': 'not-amplified', celltype: 'astrocytic' }));
check('FIX1 v3.11 — <55 senza NGS: alert critico', has(wt40, 'critical', /obbligatorio NGS IDH1\/2/));
check('FIX1 v3.11 — entita marcata PROVVISORIO', /\[PROVVISORIO/.test(wt40.entity));
check('FIX1 v3.11 — non e GBM', !/Glioblastoma/.test(wt40.entity));

const demo14 = computeDiagnosis(g({ age: 58, 'idh-ngs': 'wildtype', mitosis: 14, celltype: 'astrocytic' }));
check('FIX2 v3.11 — mitosi 14 IDH-wt non fa GBM', !/Glioblastoma/.test(demo14.entity));
check('FIX2 v3.11 — warning mitosi elevata', has(demo14, 'warning', /non sufficiente per Grade 4/));
check('FIX2 v3.11 — warning realismo clinico', has(demo14, 'warning', /Realismo clinico/));

const bug010 = computeDiagnosis(g({ age: 45, 'idh-ihc': 'negative', 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 3, '1p19q': 'not-codeleted' }));
eq('BUG-010 — entita invariata', bug010.entity, 'Astrocytoma, IDH-mutated (WHO CNS5 2021)');
check('BUG-010 — warning discordanza IHC/NGS', has(bug010, 'warning', /Discordanza IHC IDH1 R132H negativo/));

// ══════════════════════════════════════════════════════════════════════════
section('FIX 1 v3.12.0 — mitosi non e criterio di Grade 4 nemmeno in IDH-mutato');

const mutMit = g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 14, '1p19q': 'not-codeleted' });
const rMutMit = computeDiagnosis(mutMit);
eq('mitosi 14 isolate → Grade 3', rMutMit.grade, 'WHO Grade 3');
check('nessun critico "Mitosi ≥10"', !critici(rMutMit).some(x => /Mitosi/.test(x)), critici(rMutMit).join(' | '));
check('warning mitosi elevata presente', has(rMutMit, 'warning', /non e' criterio di Grade 4|non è criterio di Grade 4/));

eq('necrosi → Grade 4 (invariato)',
  computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', '1p19q': 'not-codeleted', histFeatures: { necrosis: true } })).grade, 'WHO Grade 4');
eq('MVP → Grade 4 (invariato)',
  computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', '1p19q': 'not-codeleted', histFeatures: { microvascular: true } })).grade, 'WHO Grade 4');
eq('mitosi 5 → Grade 3 (invariato)',
  computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 5, '1p19q': 'not-codeleted' })).grade, 'WHO Grade 3');
eq('mitosi 1 → Grade 2 (invariato)',
  computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 1, '1p19q': 'not-codeleted' })).grade, 'WHO Grade 2');

// ══════════════════════════════════════════════════════════════════════════
section('FIX 2 v3.12.0 — CDKN2A/B solo sulla linea astrocitaria');

const oliCdk = computeDiagnosis(g({ age: 45, 'idh-ngs': 'mut-r132h', atrx: 'retained', '1p19q': 'codeleted', cdkn2a: 'homozygous-del', celltype: 'oligodendroglial', mitosis: 5 }));
check('oligo: entita senza "Grade 4"', !/Grade 4/.test(oliCdk.entity), oliCdk.entity);
eq('oligo: grado resta 3', oliCdk.grade, 'WHO Grade 3');
check('oligo: warning "non e criterio di grading"', has(oliCdk, 'warning', /NON e[’'] criterio di grading/));
check('oligo: nessun critico CDKN2A', !critici(oliCdk).some(x => /CDKN2A/.test(x)));
check('coerenza entita/grado', !/Grade 4/.test(oliCdk.entity) || oliCdk.grade === 'WHO Grade 4');

const astCdk = computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 2, cdkn2a: 'homozygous-del', '1p19q': 'not-codeleted' }));
eq('astrocitoma: CDKN2A → Grade 4', astCdk.grade, 'WHO Grade 4');
check('astrocitoma: suffisso nell entita', /CDKN2A\/B homozygous deletion/.test(astCdk.entity), astCdk.entity);
check('astrocitoma: critico CDKN2A', has(astCdk, 'critical', /CDKN2A\/B homozygous deletion/));

// ══════════════════════════════════════════════════════════════════════════
section('FIX 3 v3.12.0 — esclusioni coerenti con la diagnosi');

const ne = computeDiagnosis(g({ age: 40, 'idh-ngs': 'not-done', 'idh-ihc': 'positive', atrx: 'lost', celltype: 'astrocytic', mitosis: 2, '1p19q': 'not-codeleted' }));
eq('NGS N.E. + IHC pos → IDH-mutato', ne.entity, 'Astrocytoma, IDH-mutated (WHO CNS5 2021)');
const reasons = ne.exclusions.map(e => e.reason).join(' | ');
// il bug produceva reason === 'IDH wildtype' (o con la coda fra parentesi); la stringa
// 'IDH wildtype' dentro "GBM IDH-wt richiede IDH wildtype per definizione" e' legittima.
check('nessuna esclusione motivata come "IDH wildtype"',
  !ne.exclusions.some(e => /^IDH wildtype\b/.test(e.reason)), reasons);
check('GBM escluso perche IDH mutato', ne.exclusions.some(e => /Glioblastoma/.test(e.entity) && /IDH mutato/.test(e.reason)), reasons);
const noIdh = computeDiagnosis(g({ age: 12, h3f3a: 'k27m', location: 'linea-mediana', celltype: 'astrocytic' }));
check('IDH non eseguito ≠ wildtype nelle esclusioni',
  noIdh.exclusions.some(e => /IDH non valutato/.test(e.reason)), noIdh.exclusions.map(e => e.reason).join(' | '));

// ══════════════════════════════════════════════════════════════════════════
section('FIX 4 v3.12.0 — i rami con return anticipato producono il ragionamento');

for (const [nome, dati] of [
  ['DMG K27M', { age: 12, h3f3a: 'k27m', location: 'linea-mediana', celltype: 'astrocytic' }],
  ['H3 G34', { age: 25, h3f3a: 'g34r', location: 'emisfero', celltype: 'astrocytic' }],
  ['H3K27me3 loss', { age: 20, h3k27me3: 'lost', location: 'linea-mediana', celltype: 'astrocytic' }],
  ['IDH indeterminato', { age: 50, celltype: 'astrocytic', mitosis: 3 }]
]) {
  const r = computeDiagnosis(g(dati));
  check(`${nome} — reasoning presente`, !!r.reasoning);
  check(`${nome} — exclusions presenti`, Array.isArray(r.exclusions));
  check(`${nome} — missingRequired presente`, Array.isArray(r.missingRequired) && r.missingRequired.length > 0);
  check(`${nome} — stepWHO valorizzato`, !!r.reasoning && r.reasoning.stepWHO.length > 0);
}
eq('DMG K27M — grado invariato', computeDiagnosis(g({ age: 12, h3f3a: 'k27m', location: 'linea-mediana' })).grade, 'WHO Grade 4');

// ══════════════════════════════════════════════════════════════════════════
section('FIX 5 v3.12.0 — soglie mitotiche coerenti fra motore e interfaccia');

const step14 = computeDiagnosis(g({ age: 60, 'idh-ngs': 'wildtype', celltype: 'astrocytic', mitosis: 14, histFeatures: { necrosis: true } })).reasoning.stepMorfologia.map(s => s.label).join(' ');
check('il ragionamento non promette Gr.4 per le mitosi', !/→ Gr\.4/.test(step14), step14);
check('il ragionamento cita il criterio reale di Gr.4', /necrosi, MVP o criterio molecolare/.test(step14), step14);
const htmlSrc = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
check('help-text del campo mitosi allineato', !/Gr\.4 ≥10/.test(htmlSrc) && /il Grade 4 richiede necrosi, MVP o criterio molecolare/.test(htmlSrc));

// ══════════════════════════════════════════════════════════════════════════
section('FIX 6 v3.12.0 — N.E. conta come dato mancante');

const neTutto = computeDiagnosis(g({ age: 60, 'idh-ngs': 'wildtype', atrx: 'not-done', '1p19q': 'not-done', tert: 'not-done', celltype: 'astrocytic', histFeatures: { necrosis: true } }));
const lbl = neTutto.missingRequired.map(x => x.label).join(' | ');
check('ATRX N.E. segnalato', /ATRX/.test(lbl), lbl);
check('1p/19q N.E. segnalato', /1p\/19q/.test(lbl), lbl);
check('TERT N.E. segnalato', /TERT/.test(lbl), lbl);
const idhNe = computeDiagnosis(g({ age: 50, 'idh-ngs': 'not-done', 'idh-ihc': 'not-done', celltype: 'astrocytic' })).missingRequired.map(x => x.label).join(' | ');
check('IDH entrambi N.E. segnalato', /IDH: nessun dato eseguito/.test(idhNe), idhNe);
const cdkNe = computeDiagnosis(g({ age: 38, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 2, '1p19q': 'not-codeleted' })).missingRequired.map(x => x.label).join(' | ');
check('CDKN2A segnalato in IDH-mutato', /CDKN2A/.test(cdkNe), cdkNe);

// ══════════════════════════════════════════════════════════════════════════
section('purezza e forma dell output');
const inMut = g({ age: 45, 'idh-ngs': 'mut-r132h', atrx: 'lost', celltype: 'astrocytic', mitosis: 5, '1p19q': 'not-codeleted' });
const snap = JSON.stringify(inMut);
computeDiagnosis(inMut);
eq('computeDiagnosis non muta l input', JSON.stringify(inMut), snap);
const shape = computeDiagnosis(inMut);
check('alerts e un array', Array.isArray(shape.alerts));
check('confidence presente', !!shape.confidence);
check('reasoning ha i 4 step', ['stepMorfologia', 'stepIHC', 'stepMol', 'stepWHO'].every(k => Array.isArray(shape.reasoning[k])));

// ══════════════════════════════════════════════════════════════════════════
section('meningioma — grading WHO CNS5');
eq('nessun criterio → Grade 1', computeMeningiomaDiagnosis(m({ mitosis: 1 })).grade, 'WHO Grade 1');
eq('mitosi 4 → Grade 2', computeMeningiomaDiagnosis(m({ mitosis: 4 })).grade, 'WHO Grade 2');
eq('mitosi 20 → Grade 3', computeMeningiomaDiagnosis(m({ mitosis: 20 })).grade, 'WHO Grade 3');
eq('invasione cerebrale isolata → Grade 2', computeMeningiomaDiagnosis(m({ mitosis: 1, brainInvasion: 'present' })).grade, 'WHO Grade 2');
eq('3 criteri minori su 5 → Grade 2', computeMeningiomaDiagnosis(m({ mitosis: 1, hypercell: true, nucleoli: true, sheet: true })).grade, 'WHO Grade 2');
eq('2 criteri minori → Grade 1', computeMeningiomaDiagnosis(m({ mitosis: 1, hypercell: true, nucleoli: true })).grade, 'WHO Grade 1');
eq('necrosi conta fra i minori', computeMeningiomaDiagnosis(m({ mitosis: 1, hypercell: true, nucleoli: true, necrosis: 'presente' })).grade, 'WHO Grade 2');
eq('rabdoide → Grade 3 per definizione', computeMeningiomaDiagnosis(m({ subtype: 'rhabdoide', mitosis: 0 })).grade, 'WHO Grade 3');
eq('cordoide → Grade 2 per definizione', computeMeningiomaDiagnosis(m({ subtype: 'cordoide', mitosis: 0 })).grade, 'WHO Grade 2');
eq('TERT mutato → Grade 3', computeMeningiomaDiagnosis(m({ mitosis: 1, tert: 'mutato' })).grade, 'WHO Grade 3');
eq('CDKN2A hom-del → Grade 3', computeMeningiomaDiagnosis(m({ mitosis: 1, cdkna: '', cdkn2a: 'homozygous-del' })).grade, 'WHO Grade 3');
eq('CDKN2A eterozigote non fa Grade 3', computeMeningiomaDiagnosis(m({ mitosis: 1, cdkn2a: 'heterozygous' })).grade, 'WHO Grade 1');
eq('cordoide + mitosi 25 → Grade 3 (nessun blocco all upgrade)', computeMeningiomaDiagnosis(m({ subtype: 'cordoide', mitosis: 25 })).grade, 'WHO Grade 3');
eq('rabdoide + 0 mitosi non viene declassato', computeMeningiomaDiagnosis(m({ subtype: 'rhabdoide', mitosis: 0, hypercell: false })).grade, 'WHO Grade 3');
check('TERT: nota critica sulla robustezza prognostica', has(computeMeningiomaDiagnosis(m({ mitosis: 1, tert: 'mutato' })), 'info', /revisione nella letteratura/));

// ══════════════════════════════════════════════════════════════════════════
section('coerenza versione');
const pkg = JSON.parse(fs.readFileSync(new URL('../package.json', import.meta.url), 'utf8'));
check('titolo index.html allineato a package.json', htmlSrc.includes(`Neoplasie Cerebrali v${pkg.version}`), pkg.version);
check('header index.html allineato', htmlSrc.includes(`NEOPLASIE CEREBRALI // v${pkg.version}`));
check('engine.js caricato con ?v= della versione', htmlSrc.includes(`engine.js?v=${pkg.version}`));
check('il motore non tocca il DOM', !/document\.|getElementById/.test(fs.readFileSync(new URL('../engine.js', import.meta.url), 'utf8')));

console.log(`\n${fail === 0 ? 'OK' : 'FALLITO'} — ${pass} pass, ${fail} fail`);
if (failures.length) { console.log('\nFallimenti:'); failures.forEach(f => console.log('  ✗ ' + f)); }
process.exit(fail === 0 ? 0 : 1);
