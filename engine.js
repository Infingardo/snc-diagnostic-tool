;(function (root) {
  'use strict';
  // ==========================================================================
  //  MOTORE DIAGNOSTICO — gliomi (WHO CNS5 2021) e meningiomi
  // ==========================================================================
  //  Estratto da index.html nella v3.12.0. Nessuna dipendenza dal DOM: tutte le
  //  funzioni prendono l'oggetto `data`/`d` prodotto da getData()/getMenData() e
  //  restituiscono un oggetto diagnosi. Questo consente di eseguirle sotto test
  //  (tests/run.mjs) senza browser — la mancanza di test e' la ragione per cui il
  //  FIX 2 della v3.11.0 era stato applicato al solo ramo IDH-wildtype.
  //
  //  Regola: qui NON si scrive in pagina. Rendering e lettura del form restano in
  //  index.html.
  // ==========================================================================

const isPosFusion = v => v && v !== 'negative' && v !== 'not-done' && v !== '';
// Campo non eseguito: '' e 'not-done' (N.E.) sono entrambi assenza di dato.
const isNotDone = v => !v || v === '' || v === 'not-done';
// v3.12.0 — Risoluzione UNICA dello stato IDH, condivisa fra motore e blocco
// ragionamento/esclusioni. Prima coesistevano due regole diverse: la seconda
// (`data['idh-ngs'] ? ... : ...`) trattava 'not-done' come dato presente e non
// guardava mai l'IHC, per cui le esclusioni dichiaravano wildtype un caso che la
// diagnosi aveva classificato IDH-mutato.
function resolveIdh(data) {
    const ngsDone = !isNotDone(data['idh-ngs']);
    const status = ngsDone ? data['idh-ngs']
        : (data['idh-ihc'] === 'positive' ? 'mutato-ihc'
        : (data['idh-ihc'] === 'negative' ? 'wildtype-ihc' : null));
    return {
        status: status,
        isMut: !!status && status.startsWith('mut'),
        isWt: status === 'wildtype' || status === 'wildtype-ihc',
        ihcNegUnconfirmed: data['idh-ihc'] === 'negative' && !ngsDone
    };
}

function computeDiagnosis(data) {
    let alerts = []; let diagnosis = {};
    let scores = { astrocytoma: 0, oligodendroglioma: 0, glioblastoma: 0, dmg: 0, h3altered: 0, pilocytic: 0, other: 0 };
    let actionableAlerts = []; let msiAlerts = [];

    if (isPosFusion(data['ntrk-fusion'])) { const ntrk = data['ntrk-fusion'].toUpperCase(); actionableAlerts.push({ gene: ntrk + ' fusion', drug: 'Larotrectinib (EMA/FDA approvato tumor-agnostic) | Entrectinib', note: 'Confermare con IHC pan-TRK (screening) prima di NGS in setting resource-limited. Efficacia documentata anche in metastasi SNC.' }); }
    if (data['ret-fusion'] === 'positive') actionableAlerts.push({ gene: 'RET fusion', drug: 'Selpercatinib | Pralsetinib (off-label SNC)', note: 'Dati di penetrazione cerebrale per selpercatinib. Counseling oncologico.' });
    if (data['ros1-fusion'] === 'positive') actionableAlerts.push({ gene: 'ROS1 fusion', drug: 'Entrectinib (attività SNC) | Crizotinib', note: 'Entrectinib preferito per penetrazione cerebrale.' });
    if (data['alk-fusion'] === 'positive') actionableAlerts.push({ gene: 'ALK fusion', drug: 'Lorlatinib | Alectinib', note: 'ALK fusion nei gliomi: raro ma actionable. Discutere in tumor board.' });
    if (isPosFusion(data['fgfr-fusion'])) {
        const isTACC = data['fgfr-fusion'] === 'fgfr1-tacc1' || data['fgfr-fusion'] === 'fgfr3-tacc3';
        if (isTACC) actionableAlerts.push({ gene: `FGFR-TACC fusion (${data['fgfr-fusion'].toUpperCase()})`, drug: 'Inibitori FGFR sperimentali (infigratinib, erdafitinib)', note: 'Fusione canonica FGFR-TACC: target sperimentale. ~3% GBM IDH-wt.' });
        else actionableAlerts.push({ gene: `FGFR fusion (non-TACC: ${data['fgfr-fusion']})`, drug: 'Nessuna terapia standard approvata', note: 'Fusione FGFR non-TACC: evidenza terapeutica variabile e limitata.' });
    }
    if (data.braf === 'v600e') actionableAlerts.push({ gene: 'BRAF V600E', drug: 'Dabrafenib + trametinib (FDA approvato BRAF V600E solid tumors)', note: 'Considerare in gliomi pediatrici o adulti con BRAF V600E. Tumor board.' });
    if (data.braf === 'fusion') { scores.pilocytic += 40; if (data.age < 18 && data.location === 'cervelletto') scores.pilocytic += 20; alerts.push({ type: 'info', msg: 'BRAF-KIAA1549 fusion: suggestivo di Astrocitoma Pilocitico, ma richiede conferma morfologica (pattern bifasico, fibre di Rosenthal) e contesto clinico.' }); }

    if (data['msi-status'] === 'msi-h') { msiAlerts.push('MSI-H rilevato. Nei gliomi primari è evento raro; escludere MMR-deficient glioma su base sindromica (Lynch) o iatrogena (post-TMZ). Evidenza per pembrolizumab nei gliomi limitata. Tumor board obbligatorio.'); if (data.lynch === 'yes') msiAlerts.push('Sospetto Lynch: counseling genetico obbligatorio.'); }
    if (data['mmr-ihc'] && data['mmr-ihc'] !== 'intact' && data['mmr-ihc'] !== 'not-done' && data['mmr-ihc'] !== '') { const gene = data['mmr-ihc'].replace('-loss', '').toUpperCase(); msiAlerts.push(`Loss IHC ${gene}: verificare concordanza con PCR MSI.`); }
    if (data.pole === 'mutato') msiAlerts.push('POLE mutato: ultramutator phenotype. TMB molto alta attesa. Evidenza per immunoterapia limitata — tumor board.');
    if (data.tmb >= 10) msiAlerts.push(`TMB: ${data.tmb} mut/Mb. Cut-off FDA pembrolizumab ≥10 mut/Mb. Nei gliomi l'evidenza predittiva è limitata. Tumor board obbligatorio.`);

    if (data.atrx === 'lost' && data['1p19q'] === 'codeleted') alerts.push({ type: 'critical', msg: 'INCOERENZA MOLECOLARE: ATRX loss + 1p/19q codeleted sono mutualmente esclusivi. Verificare qualità campione o errore tecnico (FISH/NGS).' });
    if (data['idh-ngs'] === 'wildtype' && data.atrx === 'lost') alerts.push({ type: 'warning', msg: 'Red flag: ATRX loss in IDH-wt — raro e atipico. DDx: GBM con ATRX loss, campione misto, o artefatto IHC. Rivedere vetrino.' });
    if (data['1p19q'] === 'codeleted' && data['tp53-ngs'] === 'mutato') alerts.push({ type: 'warning', msg: 'Red flag: 1p/19q codeleted + TP53 mutato — combinazione rara. Verificare sequenziamento e FISH.' });
    if (data['egfr-cnv'] === 'amplified' && data['idh-ngs'] && data['idh-ngs'].startsWith('mut')) alerts.push({ type: 'warning', msg: 'Red flag: EGFR amplificazione in IDH-mutato — biologicamente molto raro. Verificare purezza campione.' });

    if (data.h3f3a === 'k27m') { alerts.push({ type: 'critical', msg: 'H3F3A K27M mutato: Diffuse Midline Glioma, H3 K27-altered — WHO Grade 4. Diagnosi definitiva.' }); if (data.location === 'emisfero') alerts.push({ type: 'warning', msg: 'Sede emisferica + H3K27M: escludere DMG emisferico vs DMG corticale (entità in revisione WHO CNS5+)' }); diagnosis.grade = 'WHO Grade 4'; diagnosis.entity = 'Diffuse Midline Glioma, H3 K27-altered'; diagnosis.confidence = { astrocytoma: 0, oligodendroglioma: 0, glioblastoma: 0, dmg: 100, pilocytic: 0 }; diagnosis.alerts = alerts; diagnosis.actionableAlerts = actionableAlerts; diagnosis.msiAlerts = msiAlerts; buildReasoning(diagnosis, data); return diagnosis; }
    if (data.h3f3a === 'g34r' || data.h3f3a === 'g34w') { const g34var = data.h3f3a.toUpperCase(); alerts.push({ type: 'critical', msg: `H3F3A ${g34var} mutato: Diffuse Hemispheric Glioma, H3 G34-mutant — WHO Grade 4. Tipicamente emisferico, giovane adulto (15-35 anni).` }); if (data.location !== 'emisfero') alerts.push({ type: 'warning', msg: `H3F3A ${g34var} in sede non emisferica: atipico — rivedere classificazione.` }); if (data.age > 40) alerts.push({ type: 'warning', msg: `H3F3A G34 in paziente >40 anni: inusuale. Verificare sequenziamento.` }); diagnosis.grade = 'WHO Grade 4'; diagnosis.entity = `Diffuse Hemispheric Glioma, H3 G34-mutant (${g34var})`; diagnosis.confidence = { astrocytoma: 0, oligodendroglioma: 0, glioblastoma: 5, dmg: 0, h3altered: 95, pilocytic: 0 }; diagnosis.alerts = alerts; diagnosis.actionableAlerts = actionableAlerts; diagnosis.msiAlerts = msiAlerts; buildReasoning(diagnosis, data); return diagnosis; }
    if (data.h3k27me3 === 'lost' && data.h3f3a !== 'k27m') { const midlineLike = data.location === 'linea-mediana' || data.location === 'midline' || data.location === 'spinale'; const dmgConf = midlineLike ? 90 : 60; alerts.push({ type: 'critical', msg: `H3K27me3 loss IHC (senza H3F3A K27M NGS): ${midlineLike ? 'sede midline — fortemente suggestivo di DMG H3K27-altered' : 'sede NON midline — confidenza DMG ridotta'}. Confermare con NGS H3F3A/H3C.` }); if (!midlineLike) alerts.push({ type: 'warning', msg: 'H3K27me3 loss in sede non midline: allargare DDx (ependimoma PF-A, tumore con EZHIP).' }); diagnosis.grade = 'WHO Grade 4 (provvisorio — conferma NGS)'; diagnosis.entity = 'Sospetto DMG, H3K27-altered (conferma NGS H3F3A obbligatoria)'; diagnosis.confidence = { astrocytoma: 0, oligodendroglioma: 0, glioblastoma: midlineLike ? 0 : 20, dmg: dmgConf, h3altered: 0, pilocytic: 0 }; diagnosis.alerts = alerts; diagnosis.actionableAlerts = actionableAlerts; diagnosis.msiAlerts = msiAlerts; buildReasoning(diagnosis, data); return diagnosis; }

    const idh = resolveIdh(data);
    if (!idh.status) { alerts.push({ type: 'warning', msg: 'IDH status non determinato — diagnosi provvisoria' }); diagnosis.entity = 'Glioma (tipo indeterminato)'; diagnosis.grade = 'Indeterminato'; diagnosis.alerts = alerts; diagnosis.actionableAlerts = actionableAlerts; diagnosis.msiAlerts = msiAlerts; buildReasoning(diagnosis, data); return diagnosis; }

    const isIDHMut = idh.isMut;
    const isIDHWt = idh.isWt;
    // FIX v3.11.0: IHC IDH1 R132H negativa NON confermata da NGS (mutazioni non-canoniche R132C/G/S/L, IDH2 R172 sfuggono all'anticorpo)
    const idhIhcNegUnconfirmed = idh.ihcNegUnconfirmed;
    const egfrAmp = data['egfr-cnv'] === 'amplified'; const tertMut = data.tert === 'mutato'; const chr710 = data['chr7-10'] === 'present';

    if (isIDHMut) {
        scores.astrocytoma += 50; scores.oligodendroglioma += 40;
        if (data['idh-ihc'] === 'negative' && idh.status && idh.status.includes('mut')) alerts.push({ type: 'warning', msg: 'Discordanza IHC IDH1 R132H negativo / NGS mutato → Mutazione NON-R132H (R132C, R132G, IDH2) o errore tecnico' });
        else alerts.push({ type: 'success', msg: '✓ IDH mutato confermato' });
        const tp53Altered = (data.p53 > 10) || (data['tp53-ngs'] === 'mutato');
        const atypiaScore = { 'scarse': 1, 'moderate': 2, 'numerose': 3 }[data.atypia] || 0;
        const hasNecrosis = data.histFeatures.necrosis; const hasMVP = data.histFeatures.microvascular;
        if (tp53Altered) alerts.push({ type: 'info', msg: 'TP53 alterato: supporta lineage astrocitario. Non è criterio di grading WHO CNS5.' });
        if (data.pik3ca === 'mutato') alerts.push({ type: 'info', msg: 'PIK3CA mutato: attivazione pathway PI3K/AKT. Raro in IDH-mut; verificare purezza campione.' });
        if (data.pten === 'loss') alerts.push({ type: 'warning', msg: 'PTEN loss: più frequente in IDH-wt GBM; in IDH-mut suggerisce progressione o diagnosi differenziale' });
        const isDiffusePattern = !data.celltype || data.celltype === 'astrocytic' || data.celltype === 'mixed' || data.celltype === 'glioblastic';
        // FIX v3.12.0: come gia' fatto in v3.11.0 per il ramo IDH-wildtype, l'indice
        // mitotico NON e' criterio di Grade 4 nell'astrocitoma IDH-mutante. WHO CNS5:
        // Grade 4 = necrosi, proliferazione microvascolare o CDKN2A/B hom-del. Le mitosi
        // separano il Grade 2 dal Grade 3.
        if (isDiffusePattern && (hasNecrosis || hasMVP)) { diagnosis.grade = 'WHO Grade 4'; const criterioGr4 = [hasNecrosis ? 'Necrosi' : null, hasMVP ? 'Prolif. microvascolare' : null].filter(Boolean).join(' + '); alerts.push({ type: 'critical', msg: `Criterio morfologico Grade 4: ${criterioGr4}` }); alerts.push({ type: 'warning', msg: 'Necrosi/MVP in IDH-mutato è evento raro rispetto a CDKN2A del → escludere sampling bias.' }); }
        else if (!isDiffusePattern && (hasNecrosis || hasMVP)) alerts.push({ type: 'warning', msg: 'Necrosi/MVP in celltype non diffuso: escludere necrosi artefattuale. Non applicare criteri Grade 4.' });
        else if (atypiaScore === 3 || data.mitosis >= 4) { diagnosis.grade = 'WHO Grade 3'; scores.astrocytoma += 40; alerts.push({ type: 'warning', msg: `Atipia numerosa e/o mitosi ≥4 (${data.mitosis}/HPF): Grade 3` }); }
        else if (atypiaScore >= 2 || data.mitosis >= 2) { diagnosis.grade = 'WHO Grade indeterminato (tra 2 e 3 — borderline)'; scores.astrocytoma += 30; alerts.push({ type: 'warning', msg: 'Morfologia borderline Gr.2/3: valutare campionamento e contesto clinico' }); }
        else { diagnosis.grade = 'WHO Grade 2'; scores.astrocytoma += 20; }
        // FIX v3.12.0: mitosi elevata isolata → segnalazione, non promozione a Grade 4.
        if (isDiffusePattern && data.mitosis >= 10 && !hasNecrosis && !hasMVP) alerts.push({ type: 'warning', msg: `Elevato indice mitotico (${data.mitosis}/HPF) in glioma IDH-mutato senza necrosi né MVP: non e' criterio di Grade 4 secondo WHO CNS5. Verificare CDKN2A/B (criterio molecolare di Grade 4) ed escludere sottocampionamento.` });

        if (data.atrx === 'lost') { diagnosis.entity = 'Astrocytoma, IDH-mutated (WHO CNS5 2021)'; scores.astrocytoma += 60; alerts.push({ type: 'success', msg: '✓ ATRX loss → Astrocytoma (mutually exclusive con 1p/19q codeletion)' }); }
        else if (data.atrx === 'retained' && data['1p19q'] === 'codeleted') { diagnosis.entity = 'Oligodendroglioma, IDH-mutated and 1p/19q-codeleted (WHO CNS5 2021)'; scores.oligodendroglioma += 100; if (data.tert === 'mutato') { scores.oligodendroglioma += 30; alerts.push({ type: 'success', msg: '✓ TERT mut + 1p/19q codel: pattern molecolare Oligodendroglioma confermato' }); } alerts.push({ type: 'success', msg: '✓ 1p/19q codeleted + ATRX retained → Oligodendroglioma definito' }); if (data.mitosis >= 4 || atypiaScore >= 2) diagnosis.grade = 'WHO Grade 3'; }
        else if (data.atrx === 'retained' && data['1p19q'] !== 'codeleted' && data['1p19q'] !== 'not-done') { diagnosis.entity = 'Astrocytoma, IDH-mutated (ATRX retained, 1p/19q non-codeleted)'; scores.astrocytoma += 40; alerts.push({ type: 'info', msg: 'ATRX retained + 1p/19q non-codel: fenotipo astrocitario inusuale. DDx: ATRX wt astrocytoma (raro) | artefatto FISH.' }); }
        else { diagnosis.entity = 'Glioma IDH-mutated (fenotipo da completare)'; alerts.push({ type: 'warning', msg: 'ATRX e/o 1p/19q non disponibili: fenotipo incompleto' }); }
        // FIX v3.12.0: CDKN2A/B hom-del e' criterio di Grade 4 per l'ASTROCITOMA
        // IDH-mutante. Nell'oligodendroglioma non e' criterio di grading CNS5 (resta un
        // marker prognostico sfavorevole): prima veniva appeso a qualunque entita',
        // producendo un oligodendroglioma la cui stringa diceva Grade 4 mentre il campo
        // grado diceva Grade 3.
        if (data.cdkn2a === 'homozygous-del' && diagnosis.entity) {
            const isOligo = diagnosis.entity.indexOf('Oligodendroglioma') !== -1;
            if (isOligo) {
                alerts.push({ type: 'warning', msg: 'CDKN2A/B homozygous deletion in oligodendroglioma IDH-mutato 1p/19q-codeleto: NON e\u2019 criterio di grading WHO CNS5 per questa entit\u00e0 (lo e\u2019 per l\u2019astrocitoma IDH-mutante). Reperto prognosticamente sfavorevole \u2014 grado invariato.' });
            } else {
                diagnosis.grade = 'WHO Grade 4';
                diagnosis.entity = diagnosis.entity.replace(' (WHO CNS5 2021)', '') + ', WHO Grade 4 (CDKN2A/B homozygous deletion)';
                alerts.push({ type: 'critical', msg: 'CDKN2A/B homozygous deletion: criterio WHO CNS5 per Astrocytoma IDH-mutated, WHO Grade 4 \u2014 anche in assenza di necrosi o MVP.' });
            }
        }

    } else if (isIDHWt) {
        // FIX v3.11.0: sotto i 55 anni una sola IHC IDH1 R132H negativa non basta per dichiarare IDH-wt (cIMPACT-NOW / WHO CNS5)
        if (idhIhcNegUnconfirmed) {
            if (data.age < 55) alerts.push({ type: 'critical', msg: 'IHC IDH1 R132H negativa non confermata da sequenziamento in paziente <55 anni: obbligatorio NGS IDH1/2 (R132 non-canoniche, IDH2 R172) prima di classificare come IDH-wildtype (cIMPACT-NOW). Classificazione IDH-wildtype PROVVISORIA.' });
            else alerts.push({ type: 'info', msg: 'IDH-wildtype su sola IHC IDH1 R132H negativa (età ≥55 anni): accettabile per WHO CNS5, ma conferma NGS IDH1/2 (R132 non-canoniche, IDH2 R172) non eseguita.' });
        } else {
            alerts.push({ type: 'success', msg: '✓ IDH wildtype confermato' });
        }
        scores.glioblastoma += 40;
        const tp53Altered = (data.p53 > 10) || (data['tp53-ngs'] === 'mutato');
        const hasNecrosis = data.histFeatures.necrosis; const hasMVP = data.histFeatures.microvascular;
        const molecularGBM = egfrAmp || chr710 || tertMut;
        const isDiffusePatternWt = !data.celltype || data.celltype === 'astrocytic' || data.celltype === 'mixed' || data.celltype === 'glioblastic';
        if (molecularGBM) { const criteria = [egfrAmp ? 'EGFR amp' : null, chr710 ? '+7/-10' : null, tertMut ? 'TERT mut' : null].filter(Boolean).join(' + '); if (isDiffusePatternWt) alerts.push({ type: 'critical', msg: `GBM molecolare (cIMPACT-NOW update 3): ${criteria} → Grade 4 in glioma diffuso IDH-wt, anche senza criteri morfologici` }); else alerts.push({ type: 'warning', msg: `Criteri molecolari GBM (${criteria}) in pattern non diffuso: cIMPACT-NOW si applica a glioma diffuso astrocitario.` }); }
        // FIX v3.11.0: mitosi ≥10 NON è criterio autonomo di Grade 4 nel GBM IDH-wt (WHO CNS5). Grade 4 solo su necrosi / MVP / criteri molecolari.
        if (isDiffusePatternWt && (hasNecrosis || hasMVP || molecularGBM)) { diagnosis.grade = 'WHO Grade 4'; diagnosis.entity = 'Glioblastoma, IDH-wildtype (WHO CNS5 2021)'; scores.glioblastoma += 80; if (hasNecrosis || hasMVP) { const crit = [hasNecrosis ? 'Necrosi' : null, hasMVP ? 'MVP' : null].filter(Boolean).join(' + '); alerts.push({ type: 'critical', msg: `Criteri morfologici Grade 4: ${crit}` }); } }
        else if (!isDiffusePatternWt && molecularGBM) { diagnosis.grade = 'WHO Grade indeterminato (pattern non diffuso)'; diagnosis.entity = 'Glioma IDH-wildtype, pattern circoscritto (tipo da determinare)'; scores.glioblastoma += 20; alerts.push({ type: 'warning', msg: 'Alterazioni molecolari GBM in tumore non diffuso: classificazione WHO richiede conferma di pattern infiltrante. Rivalutare morfologia.' }); }
        else { diagnosis.grade = 'Grading indeterminato (pannello incompleto / possibile sottocampionamento)'; diagnosis.entity = 'Glioma diffuso, IDH-wildtype (tipo da determinare)'; scores.glioblastoma += 30; alerts.push({ type: 'warning', msg: 'Glioma IDH-wt senza criteri GBM morfologici né molecolari completi: pannello completo obbligatorio' }); if (data.age > 50) alerts.push({ type: 'warning', msg: `Realismo clinico: adulto ${data.age} anni, IDH-wt, senza criteri GBM → altissima probabilità di GBM sottocampionato.` }); }
        // FIX v3.11.0: mitosi elevata isolata → segnalazione, non promozione a Grade 4
        if (isDiffusePatternWt && data.mitosis >= 10 && !hasNecrosis && !hasMVP && !molecularGBM) alerts.push({ type: 'warning', msg: `Elevato indice mitotico (≥10, ${data.mitosis}/HPF) in glioma diffuso IDH-wt senza necrosi/MVP né criteri molecolari: sospetto ma non sufficiente per Grade 4 secondo WHO CNS5. Raccomandato completamento molecolare (TERT, EGFR, +7/−10).` });
        if (egfrAmp) { scores.glioblastoma += 30; alerts.push({ type: 'warning', msg: 'EGFR amplificato: Classical subtype GBM. Prognosticamente sfavorevole.' }); }
        if (data['egfr-snv'] === 'vIII') { scores.glioblastoma += 20; alerts.push({ type: 'info', msg: 'EGFRvIII: marker prognostico sfavorevole. Target sperimentale (vaccini, ADC).' }); }
        if (tertMut) { scores.glioblastoma += 20; alerts.push({ type: 'info', msg: 'TERT promoter mutato: favorisce GBM primario IDH-wt. Prognosi sfavorevole.' }); }
        if (chr710) { scores.glioblastoma += 25; alerts.push({ type: 'warning', msg: '+7/-10 presente: pattern cromosomico GBM.' }); }
        if (data['met-cnv'] === 'amplified') alerts.push({ type: 'critical', msg: 'MET amplificato: prognosi molto sfavorevole in GBM. Target sperimentale. Discutere trial.' });
        if (data.pten === 'loss') { scores.glioblastoma += 20; alerts.push({ type: 'info', msg: 'PTEN loss: attivazione pathway PI3K/AKT/mTOR. Presente in ~40% GBM. Mesenchymal subtype.' }); }
        if (data.nf1 === 'mutato') alerts.push({ type: 'info', msg: 'NF1 loss (singolo hit): Mesenchymal subtype GBM.' });
        else if (data.nf1 === 'biallelico') alerts.push({ type: 'info', msg: 'Possibile inattivazione biallelica NF1 (multipli hit troncanti/frameshift): coerente con GBM subtype mesenchimale.' });
        if (data.mtor === 'mutato') alerts.push({ type: 'info', msg: 'mTOR mutato (gain-of-function): target rapamicina/everolimus. Dati clinici limitati in gliomi.' });
        if (data['nrg1-fusion'] === 'positive') alerts.push({ type: 'warning', msg: 'NRG1 fusion: entità emergente nei gliomi IDH-wt. Verificare con letteratura aggiornata.' });
        if (tp53Altered) alerts.push({ type: 'info', msg: 'TP53 alterato: presente in subset di GBM IDH-wt, più frequente nei casi proneural-like.' });
        // FIX v3.11.0: <55 anni con IHC R132H neg non confermata da NGS → entità IDH-wt esplicitamente provvisoria
        if (idhIhcNegUnconfirmed && data.age < 55 && diagnosis.entity) diagnosis.entity += ' [PROVVISORIO — NGS IDH1/2 obbligatorio: IHC R132H neg non confermata, età <55]';
    }

    if (data.mgmt === 'methylated') {
        if (isIDHMut) alerts.push({ type: 'info', msg: 'MGMT metilato. In IDH-mutato la metilazione è frequente per ipermetilazione globale G-CIMP — il valore predittivo per TMZ è meno discriminante rispetto a GBM IDH-wt.' });
        else alerts.push({ type: 'success', msg: 'MGMT metilato: predittore favorevole risposta a temozolomide in GBM IDH-wt (Hegi 2005, Stupp protocol). Impatto su OS +9 mesi mediana.' });
    } else if (data.mgmt === 'unmethylated') alerts.push({ type: 'warning', msg: 'MGMT non metilato: ridotta risposta a TMZ. Considerare alternative terapeutiche.' });

    if (isIDHWt && tertMut && !egfrAmp && !chr710 && data.age < 40) alerts.push({ type: 'warning', msg: `TERT mut isolato in giovane adulto (${data.age} anni) IDH-wt senza EGFR amp né +7/-10: raro pattern. Escludere tumore circoscritto IDH-wt prima di classificare GBM molecolare.` });
    if (data.braf === 'fusion' && (data.mitosis >= 10 || data.histFeatures.necrosis)) { scores.pilocytic = Math.max(scores.pilocytic - 40, 0); alerts.push({ type: 'warning', msg: 'BRAF fusion con morfologia high-grade (necrosi / mitosi ≥10): profilo incompatibile con astrocitoma pilocitico classico.' }); }

    const maxScore = Math.max(...Object.values(scores), 1);
    const confidence = {};
    for (const k in scores) confidence[k] = Math.round((scores[k] / maxScore) * 100);

    diagnosis.confidence = confidence; diagnosis.alerts = alerts;
    diagnosis.actionableAlerts = actionableAlerts; diagnosis.msiAlerts = msiAlerts;
    buildReasoning(diagnosis, data);
    return diagnosis;
}

// v3.12.0 \u2014 Blocco ragionamento / esclusioni / criteri mancanti, estratto da
// computeDiagnosis. I rami con return anticipato (H3 K27M, H3 G34, H3K27me3 loss,
// IDH indeterminato) non lo eseguivano mai: per le entita' di Grade 4 piu' gravi
// l'interfaccia mostrava solo gli alert, senza ragionamento, esclusioni o pannello
// dei criteri mancanti.
function buildReasoning(diagnosis, data) {
    const idh = resolveIdh(data);
    const idhMut = idh.isMut;
    const egfrAmp = data['egfr-cnv'] === 'amplified';
    const tertMut = data.tert === 'mutato';
    const chr710 = data['chr7-10'] === 'present';
    const has1p19q = data['1p19q'] === 'codeleted';

    const stepMorfologia = [];
    if (data.celltype) stepMorfologia.push({ status: '✔', label: `Cellularità: ${data.cellularity || '—'}, tipo: ${data.celltype}` });
    // FIX v3.12.0: il ragionamento mostrava "→ Gr.4" a ≥20 mitosi, soglia che il motore
    // non usa in nessun ramo. Il grado 4 richiede necrosi, MVP o criterio molecolare.
    if (data.mitosis > 0) stepMorfologia.push({ status: data.mitosis >= 4 ? '⚠' : '✔', label: `Mitosi: ${data.mitosis}/10HPF ${data.mitosis >= 4 ? '(≥4 → almeno Gr.3; il Gr.4 richiede necrosi, MVP o criterio molecolare)' : '(compatibile Gr.2)'}` });
    if (data.histFeatures.necrosis) stepMorfologia.push({ status: '⚠', label: 'Necrosi: presente' });
    if (data.histFeatures.microvascular) stepMorfologia.push({ status: '⚠', label: 'Proliferazione microvascolare: presente' });
    if (!data.histFeatures.necrosis && !data.histFeatures.microvascular) stepMorfologia.push({ status: '✔', label: 'Nessuna necrosi / MVP' });

    const stepIHC = [];
    if (data['idh-ihc']) stepIHC.push({ status: '✔', label: `IDH IHC: ${data['idh-ihc']}` });
    if (data.atrx) stepIHC.push({ status: '✔', label: `ATRX: ${data.atrx}` });
    if (data.p53 > 0) stepIHC.push({ status: '✔', label: `p53: ${data.p53}% (${data.p53 > 10 ? 'overespresso / mut pattern' : 'WT'})` });

    const stepMol = [];
    if (data['idh-ngs']) stepMol.push({ status: '✔', label: `IDH NGS: ${data['idh-ngs']}` });
    if (data['1p19q']) stepMol.push({ status: '✔', label: `1p/19q: ${data['1p19q']}` });
    if (data.tert && data.tert !== 'not-done') stepMol.push({ status: data.tert === 'mutato' ? '⚠' : '✔', label: `TERT: ${data.tert}` });
    if (data.cdkn2a && data.cdkn2a !== 'not-done') stepMol.push({ status: data.cdkn2a === 'homozygous-del' ? '⚠' : '✔', label: `CDKN2A: ${data.cdkn2a}` });
    if (data['egfr-cnv'] && data['egfr-cnv'] !== 'not-done') stepMol.push({ status: data['egfr-cnv'] === 'amplified' ? '⚠' : '✔', label: `EGFR CNV: ${data['egfr-cnv']}${data['egfr-snv'] ? ' / SNV: ' + data['egfr-snv'] : ''}` });
    if (data['chr7-10'] && data['chr7-10'] !== 'not-done') stepMol.push({ status: data['chr7-10'] === 'present' ? '⚠' : '✔', label: `+7/-10: ${data['chr7-10']}` });
    if (data.h3f3a && data.h3f3a !== 'wildtype' && data.h3f3a !== 'not-done') stepMol.push({ status: '⚠', label: `H3F3A: ${data.h3f3a}` });
    if (data.mgmt && data.mgmt !== 'not-done') stepMol.push({ status: '🧬', label: `MGMT: ${data.mgmt} (supporto, non determinante per entità)` });

    const stepWHO = [];
    if (diagnosis.entity) { stepWHO.push({ status: '✔', label: `Entità classificabile: ${diagnosis.entity}` }); if (diagnosis.grade) stepWHO.push({ status: '✔', label: `Grade assegnato: ${diagnosis.grade}` }); }
    else stepWHO.push({ status: '❌', label: 'Entità non classificabile con i dati inseriti — criteri WHO insufficienti' });

    const supportOnly = [];
    if (data.mgmt && data.mgmt !== 'not-done') supportOnly.push(`MGMT metilazione (risposta TMZ — non criterio entità)`);
    if (data.pten && data.pten !== 'wildtype' && data.pten !== 'not-done') supportOnly.push(`PTEN loss (segnalazione PI3K — non criterio primario)`);
    if (data.nf1 && data.nf1 !== 'wildtype' && data.nf1 !== 'not-done') supportOnly.push(`NF1 mut (subtype mesenchymal — non criterio entità)`);

    const exclusions = [];
    const entity = diagnosis.entity || '';
    // v3.12.0: distinguere "IDH wildtype" da "IDH non valutato" — con i rami H3 che ora
    // passano di qui, l'assenza del dato non deve essere raccontata come wildtype.
    const idhReason = idh.status ? 'IDH wildtype' : 'IDH non valutato (IHC/NGS non eseguiti)';
    if (!entity.includes('Oligodendroglioma')) { if (!idhMut) exclusions.push({ entity: 'Oligodendroglioma', reason: idhReason + ' (IDH-mut richiesto per definizione)' }); else if (!has1p19q) exclusions.push({ entity: 'Oligodendroglioma', reason: '1p/19q non codeleta (codelezione richiesta per definizione WHO CNS5)' }); }
    if (!entity.includes('Astrocytoma, IDH-mutated')) { if (!idhMut) exclusions.push({ entity: 'Astrocytoma IDH-mutated', reason: idhReason }); else if (has1p19q) exclusions.push({ entity: 'Astrocytoma IDH-mutated', reason: '1p/19q codeleta → diagnosi preferenziale oligodendroglioma' }); }
    if (!entity.includes('Glioblastoma')) { if (idhMut) exclusions.push({ entity: 'Glioblastoma IDH-wildtype', reason: 'IDH mutato (GBM IDH-wt richiede IDH wildtype per definizione WHO CNS5)' }); else { const missingGBMcrit = []; if (!data.histFeatures.necrosis && !data.histFeatures.microvascular) missingGBMcrit.push('assenza necrosi/MVP morfologica'); if (!egfrAmp && !tertMut && !chr710) missingGBMcrit.push('assenza criteri molecolari cIMPACT (EGFR amp, TERT mut, +7/-10)'); if (missingGBMcrit.length > 0) exclusions.push({ entity: 'Glioblastoma IDH-wildtype', reason: missingGBMcrit.join('; ') }); } }
    if (!entity.includes('Midline') && !entity.includes('DMG')) { if (data.h3f3a !== 'k27m') exclusions.push({ entity: 'Diffuse Midline Glioma H3 K27-altered', reason: 'H3 K27M non rilevato (o NGS non eseguito)' }); }
    if (!entity.includes('Pilocitico') && !entity.includes('Pilocytic')) { if (data.braf !== 'fusion') exclusions.push({ entity: 'Astrocitoma Pilocitico', reason: 'Assenza BRAF-KIAA1549 fusion (principale marker molecolare)' }); }

    // FIX v3.12.0: 'not-done' (N.E.) e' assenza di dato quanto il campo vuoto. Prima solo
    // TERT lo verificava: selezionare N.E. su ATRX o 1p/19q — cioe' la via che il gate
    // d'ingresso suggerisce esplicitamente — cancellava la segnalazione di incompletezza.
    const missingRequired = [];
    if (isNotDone(data['idh-ngs']) && isNotDone(data['idh-ihc'])) missingRequired.push({ status: '❌', label: 'IDH: nessun dato eseguito (IHC o NGS) — criterio obbligatorio per la classificazione dei gliomi diffusi' });
    else if (isNotDone(data['idh-ngs']) && data['idh-ihc'] === 'negative') missingRequired.push({ status: '⚠', label: 'IDH NGS: non eseguito — l\u2019IHC R132H negativa non esclude le mutazioni non-canoniche (IDH1 R132C/G/S/L, IDH2 R172)' });
    if (isNotDone(data.atrx)) missingRequired.push({ status: '❌', label: 'ATRX IHC: non eseguito' });
    if (isNotDone(data['1p19q'])) missingRequired.push({ status: '❌', label: '1p/19q: non eseguito (necessario per DDx oligodendroglioma)' });
    if (isNotDone(data.tert)) missingRequired.push({ status: '⚠', label: 'TERT: non eseguito — rilevante per GBM molecolare IDH-wt' });
    if (idhMut && isNotDone(data.cdkn2a)) missingRequired.push({ status: '⚠', label: 'CDKN2A/B: non eseguito — criterio molecolare di Grade 4 per l\u2019astrocitoma IDH-mutante' });

    diagnosis.reasoning = { stepMorfologia, stepIHC, stepMol, stepWHO, supportOnly };
    diagnosis.exclusions = exclusions; diagnosis.missingRequired = missingRequired;
    return diagnosis;
}

function computeMeningiomaDiagnosis(d) {
    const alerts = []; let grade = null; let gradeReason = []; let recidiveRisk = null;

    // STEP 1 — Sottotipo con grading implicito (WHO CNS5)
    const gr3Sub = ['rhabdoide','papillare']; const gr2Sub = ['cordoide','clear-cell'];
    if (gr3Sub.includes(d.subtype)) {
        grade = 'WHO Grade 3'; gradeReason.push(`Sottotipo ${d.subtype} → Gr.3 per definizione WHO CNS5`);
        alerts.push({ type:'critical', msg:`&#128680; Sottotipo ${d.subtype}: WHO Grade 3 per definizione (WHO CNS5 2021) — indipendentemente dal numero di mitosi.` });
        if (d.subtype==='rhabdoide') alerts.push({ type:'warning', msg:'&#9888;&#65039; Rhabdoide: verificare BAP1 (loss/mut frequente). H3K27me3 loss comune. Prognosi sfavorevole.' });
        if (d.subtype==='papillare') alerts.push({ type:'info', msg:'&#8505;&#65039; Papillare: architettura pseudo-papillare perivascolare. Recidiva frequente.' });
    } else if (gr2Sub.includes(d.subtype)) {
        grade = 'WHO Grade 2'; gradeReason.push(`Sottotipo ${d.subtype} → Gr.2 per definizione WHO CNS5`);
        alerts.push({ type:'warning', msg:`&#9888;&#65039; Sottotipo ${d.subtype}: WHO Grade 2 per definizione (WHO CNS5 2021).` });
        if (d.subtype==='clear-cell') alerts.push({ type:'info', msg:'&#8505;&#65039; Clear cell: freq. in fossa posteriore e spinale; associato a mut SMARCE1.' });
        if (d.subtype==='cordoide') alerts.push({ type:'info', msg:'&#8505;&#65039; Cordoide: simil-cordoma con mucina. IHC: S100+, EMA+.' });
    }

    // STEP 2 — Upgrade molecolare
    // FIX CRITICO: CDKN2A/B hom-del → Grade 3 (invariato, era già corretto)
    if (d.cdkn2a === 'homozygous-del') {
        const prev = grade; grade = 'WHO Grade 3'; gradeReason.push('CDKN2A/B hom-del → Gr.3 molecolare');
        const note = prev === 'WHO Grade 3' ? 'conferma molecolare Grade 3' : 'upgrading molecolare a Grade 3';
        alerts.push({ type:'critical', msg:`&#128680; CDKN2A/B homozygous deletion: ${note} (WHO CNS5 2021).` });
    } else if (d.cdkn2a === 'heterozygous') {
        alerts.push({ type:'warning', msg:'&#9888;&#65039; CDKN2A/B delezione eterozigote: non criterio Gr.3, ma associata a prognosi sfavorevole. Monitoraggio stretto.' });
    }

    // *** FIX PRINCIPALE BUG-MENINGIOMA-TERT ***
    // Originale (SBAGLIATO): TERT mut → Grade 2
    // Corretto (WHO CNS5 2021): TERT promoter mutation = criterio molecolare INDIPENDENTE per WHO Grade 3
    // Rif: Perry A et al. in Louis DN (ed.) WHO Classification of CNS Tumours 2021, pp. 264-311
    //      Nassiri F et al. Nat Genet 2021; Maas SLN et al. Nat Genet 2021
    if (d.tert === 'mutato') {
        const prevGrade = grade;
        grade = 'WHO Grade 3';
        gradeReason.push('TERT promoter mutation → criterio molecolare indipendente Grade 3');
        alerts.push({
            type: 'critical',
            msg: `&#128680; TERT promoter mutato: criterio molecolare indipendente per WHO Grade 3 nel meningioma (WHO CNS5 2021).${prevGrade && prevGrade !== 'WHO Grade 3' ? ` Upgrading da ${prevGrade} a Grade 3.` : ''}`
                });
                alerts.push({ type: 'info',
                    msg: `&#x26A0;&#xFE0F; <strong>Nota critica — TERT isolato:</strong> la robustezza prognostica di TERTp come unico criterio molecolare di Grade 3 è oggetto di revisione nella letteratura recente (cfr. Sahm 2016; Nassiri 2021; revisioni 2024–2025). CDKN2A/B hom-del mostra stratificazione prognostica più consolidata. Il tool applica WHO CNS5 2021 as written.`
        });
    }

    // STEP 3 — Grading morfologico
    // FIX v3.10.8: necrosi spontanea inclusa nei criteri minori (WHO CNS5: 5 criteri, cutoff ≥3)
    const minorFeatures = [d.hypercell, d.smallCells, d.nucleoli, d.sheet, d.necrosis === 'presente'];
    const minorCount = minorFeatures.filter(Boolean).length;
    if (grade !== 'WHO Grade 3') {
        if (d.mitosis >= 20) { grade = 'WHO Grade 3'; gradeReason.push(`Mitosi ≥20 (${d.mitosis}/1.6mm²)`); alerts.push({ type:'critical', msg:`&#128680; Mitosi ${d.mitosis}/1.6mm² (≥20): criterio morfologico WHO Grade 3.` }); }
        else if (d.frankMalig && d.frankMalig !== 'assente' && d.frankMalig !== '') { grade = 'WHO Grade 3'; gradeReason.push(`Morfologia maligna franca (${d.frankMalig})`); alerts.push({ type:'critical', msg:`&#128680; Morfologia maligna franca (${d.frankMalig}): criterio WHO Grade 3.` }); }
    }
    if (grade !== 'WHO Grade 3') {
        const gr2crit = [];
        if (d.mitosis >= 4) gr2crit.push(`Mitosi ≥4 (${d.mitosis}/1.6mm²)`);
        if (d.brainInvasion === 'present') gr2crit.push('Invasione cerebrale confermata');
        if (minorCount >= 3) gr2crit.push(`Criteri minori ≥3 (${minorCount}/5)`);
        if (gr2crit.length) { grade = 'WHO Grade 2'; gradeReason = gradeReason.concat(gr2crit); alerts.push({ type:'warning', msg:`&#9888;&#65039; Criterio/i WHO Grade 2: ${gr2crit.join(' | ')}` }); }
    }
    if (d.brainInvasion === 'sospetta') alerts.push({ type:'warning', msg:'&#9888;&#65039; Invasione cerebrale sospetta ma non confermata: campionamento aggiuntivo raccomandato. Se confermata → Grade 2 isolato (WHO CNS5).' });
    if (!grade) { grade = 'WHO Grade 1'; gradeReason.push('Nessun criterio di upgrading identificato'); }

    // STEP 4 — IHC alerts
    if (d.ki67 > 0) { const ctx = d.ki67 < 4 ? 'compatibile Gr.1' : d.ki67 <= 20 ? 'range Gr.2' : 'elevato — range Gr.3'; alerts.push({ type: d.ki67 > 20 ? 'warning' : 'info', msg:`&#8505;&#65039; Ki67: ${d.ki67}% (${ctx}) — orientativo, non criterio WHO per grading.` }); }
    if (d.pr === 'negative' && grade === 'WHO Grade 1') alerts.push({ type:'warning', msg:'&#9888;&#65039; PR negativo in morfologia Gr.1: atipico — riconsiderare campionamento o criteri minori.' });
    if (d.sstr2a === 'negative') alerts.push({ type:'info', msg:'&#8505;&#65039; SSTR2A negativo: esclude eligibilità PRRT standard. Frequente in Gr.3 e meningiomi NF2-wt (base cranica).' });
    else if (d.sstr2a === 'positive') alerts.push({ type:'success', msg:'&#10003; SSTR2A positivo: eligibile per dotatate PET-CT e potenzialmente PRRT in setting di recidiva/non resecabile.' });
    if (d.h3k27me3 === 'lost') alerts.push({ type:'warning', msg:'&#9888;&#65039; H3K27me3 loss: nei meningiomi associata a Gr.2/3 e prognosi sfavorevole — non implica mutazione H3 (diverso dal contesto gliomi).' });
    if (d.p53 === 'overexp' || d.p53 === 'null') alerts.push({ type:'info', msg:`&#8505;&#65039; p53 ${d.p53 === 'null' ? 'pattern null' : 'overespresso'}: marker instabilità genomica — correlato a grading elevato e recidiva.` });

    // STEP 5 — Molecolare alerts
    if (d.bap1 === 'lost' || d.bap1 === 'mutato') { alerts.push({ type:'warning', msg:`&#9888;&#65039; BAP1 ${d.bap1}: rischio elevato recidiva. Frequente in morfologia rhabdoide/aggressiva. Sorveglianza imaging ravvicinata.` }); recidiveRisk = 'ALTO'; }
    if (d.nf2 === 'mutato') alerts.push({ type:'info', msg:'&#8505;&#65039; NF2 mutato: freq. in fibrosi/transizionali; correlato a chr22q loss. In giovane → escludere NF2 sindromico.' });
    if (d.nf2Clinical === 'sospetto' || d.nf2Clinical === 'confermato') alerts.push({ type:'warning', msg:`&#9888;&#65039; NF2 sindromico (${d.nf2Clinical}): counseling genetico. Meningiomi multipli attesi. Screening familiare.` });
    if (d.chr22q === 'loss' && d.nf2 === 'wildtype') alerts.push({ type:'info', msg:'&#8505;&#65039; Chr22q loss con NF2 wt: raro — considerare NF2 non rilevata (mosaicismo) o altre alterazioni 22q.' });

    // STEP 6 — Recidiva
    if (d.recurrence) { alerts.push({ type:'warning', msg:`&#9888;&#65039; ${d.recurrence==='II'?'II+ recidiva':'I recidiva'}: rischio upgrading al momento della recidiva (~15–30% studi). Rivalutare criteri morfologici e molecolari.` }); if (!recidiveRisk) recidiveRisk = d.recurrence === 'II' ? 'ALTO' : 'INTERMEDIO'; }

    const subtypeLbl = (d.subtype && d.subtype !== 'non-specificato') ? ` (${d.subtype.charAt(0).toUpperCase()+d.subtype.slice(1)})` : '';
    const entity = `Meningioma${subtypeLbl}, ${grade} (WHO CNS5 2021)`;
    return { grade, entity, gradeReason, recidiveRisk, alerts };
}

  var api = {
    isPosFusion: isPosFusion, isNotDone: isNotDone, resolveIdh: resolveIdh,
    computeDiagnosis: computeDiagnosis, buildReasoning: buildReasoning,
    computeMeningiomaDiagnosis: computeMeningiomaDiagnosis
  };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else { for (var k in api) root[k] = api[k]; }
})(typeof self !== 'undefined' ? self : this);
