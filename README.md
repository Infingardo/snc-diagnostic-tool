# 🧠 Neoplasie Cerebrali — Tool Diagnostico Didattico
**v3.10.1** · WHO CNS5 2021 · Gliomi & Meningiomi

---

## Cos'è

Un ausilio didattico per la formazione in neuropatologia. Traduce il flusso diagnostico WHO CNS5 2021 in un percorso interattivo: morfologia EE → IHC → NGS → criterio WHO soddisfatto.

Non è un sistema diagnostico certificato. Non sostituisce il giudizio clinico-patologico. Il vetrino rimane il documento primario.

---

## Cosa fa

Per ogni caso inserito, il tool produce:

1. **Ipotesi classificativa** — entità WHO CNS5 con grade assegnato
2. **Ragionamento diagnostico** — 4 step espliciti (morfologia → IHC → molecolare → criterio WHO), con gerarchia visiva: ✔ soddisfatto · ⚠ borderline · ❌ mancante · 🧬 supporto non determinante
3. **Entità escluse** — per ciascuna, il criterio determinante dell'esclusione (*"Oligodendroglioma escluso: 1p/19q non codeleta"*)
4. **Alert clinici** — incoerenze molecolari, criteri borderline, alterazioni actionable
5. **Indice di compatibilità morfo-molecolare** — scoring qualitativo pre-ragionamento, utile per casi equivoci
6. **Nota epistemica** — promemoria su cosa il tool è e cosa non è

---

## Entità coperte

### Gliomi (pannello Diatech Pharmacogenetics, 50 geni)
| Entità | Criteri chiave |
|---|---|
| Astrocytoma, IDH-mutated (Gr. 2–4) | IDH mut, ATRX loss, TP53; CDKN2A hom-del → Gr.4 |
| Oligodendroglioma, IDH-mut 1p/19q-codel (Gr. 2–3) | IDH mut + codelezione obbligatoria |
| Glioblastoma, IDH-wildtype (Gr. 4) | Criteri morfologici o molecolari cIMPACT-NOW |
| Diffuse Midline Glioma, H3 K27-altered (Gr. 4) | H3 K27M o H3K27me3 loss + sede midline |
| Diffuse Hemispheric Glioma, H3 G34-mutant (Gr. 4) | H3 G34R/W, sede emisferica, età pediatrica/giovane adulto |
| Astrocitoma Pilocitico (Gr. 1) | BRAF-KIAA1549 fusion, morfologia bifasica |

Inclusi: fusioni actionable (NTRK, FGFR-TACC, RET, ROS1, ALK, NRG1), BRAF V600E, MSI/TMB, MGMT, POLE.

### Meningiomi (WHO CNS5 2021)
| Grade | Criteri morfologici | Criteri molecolari |
|---|---|---|
| Gr. 1 | Nessun criterio atipico | — |
| Gr. 2 (Atipico) | ≥4 mitosi/10HPF, o ≥3 criteri minori, o invasione cerebrale, o sottotipo (cordoide, clear cell) | TERT mut → upgrading Gr. 2 |
| Gr. 3 (Anaplastico) | ≥20 mitosi/10HPF, o morfologia franca, o sottotipo (rhabdoide, papillare) | CDKN2A/B hom-del → Gr. 3 automatico |

IHC inclusa: Ki67, EMA, PR, p53, SSTR2A, H3K27me3.  
Molecolare opzionale: TERT, CDKN2A/B, NF2, BAP1, Chr22q.

---

## Architettura

- **Single-file HTML** — nessuna dipendenza esterna eccetto `html2pdf.js` (CDN) per l'export PDF
- **Zero backend** — tutto client-side, nessun dato inviato a server
- **Deployabile su GitHub Pages** — rinominare in `index.html`
- Due engine separati: `computeDiagnosis()` per gliomi, `computeMeningiomaDiagnosis()` per meningiomi
- `isPosFusion()` helper dedicato per campi fusion (distinto da `isPos` per SNV/IHC)

---

## Utilizzo

```
index_v3.10.1.html  →  rinominare in index.html  →  caricare su GitHub Pages
```

Al primo avvio: modale con 3 checkbox di consenso informato (non riproposto nella stessa sessione via `sessionStorage`).

Prima di ogni generazione: `confirm()` con riepilogo delle limitazioni.

---

## Pannello molecolare di riferimento

**Diatech Pharmacogenetics — 50 geni** (versione estesa)

SNV/InsDel · CNV · Fusioni · MSI · TMB

Campi disponibili nel tool: IDH1/2, TP53, ATRX, TERT, H3F3A, CDKN2A/B, PIK3CA, PTEN, NF1, mTOR, EGFR (CNV + SNV/EGFRvIII), ERBB2, MET (CNV + fusion), NTRK1/2/3, RET, ROS1, ALK, NRG1, FGFR1/3 (TACC fusions), BRAF (V600E + fusion), MGMT, MSI, MMR-IHC, TMB, POLE, Lynch.

---

## Limiti espliciti

- Il tool applica le regole WHO come **interruttori on/off**. La patologia reale è un gradiente.
- Non incorpora la variabilità morfologica del vetrino né la qualità pre-analitica del campione.
- Un campione da agoaspirato e una resezione totale producono lo stesso output con gli stessi input — il tool non lo sa.
- Le fusioni actionable (NTRK, FGFR-TACC) generano alert di target therapy: **non implicano efficacia nel contesto specifico**. Ogni decisione terapeutica richiede tumor board.
- Lo scoring percentuale è un indice qualitativo di allineamento, non una probabilità bayesiana.

---

## Casi precaricati

### Gliomi
| # | Entità | Caratteristiche chiave |
|---|---|---|
| M1 | Astrocitoma IDH-mut Gr. 3 | IDH R132H, ATRX loss, TP53 mut, mitosi 6 |
| M2 | Oligodendroglioma IDH-mut 1p/19q-codel | 1p/19q codeleto, TERT wt |
| M3 | GBM IDH-wt con EGFR amp + PTEN loss | EGFRvIII, +7/-10, TERT mut |
| M4 | DMG H3 K27M pediatrico | H3F3A K27M, sede midline, CDKN2A hom-del |
| M5 | Glioma NTRK-fusion (actionable) | NTRK3 fusion, IDH-wt giovane adulto |

### Meningiomi
| # | Entità | Caratteristiche chiave |
|---|---|---|
| M1 | Gr. 1 classico | Meningoteliomatoso, 1 mitosi, NF2 mut |
| M2 | Gr. 2 atipico | Mitosi 6 + invasione cerebrale, I recidiva |
| M3 | Gr. 3 anaplastico | Mitosi 24 + CDKN2A hom-del + BAP1 loss |
| M4 | Gr. 3 rhabdoide | Sottotipo rhabdoide, BAP1 lost |
| M5 | Upgrade molecolare | Morfologia Gr. 1 borderline → Gr. 3 per TERT mut + CDKN2A hom-del |

---

## Riferimenti principali

- Louis DN et al. *The 2021 WHO Classification of Tumors of the Central Nervous System.* Neuro Oncol 2021
- Perry A et al. *Meningiomas.* In: WHO Classification of Tumors of the CNS 2021
- cIMPACT-NOW updates 2, 3, 6 (Brat et al., Ellison et al., Louis et al.)
- Sturm D et al. *Paediatric and adult gliomas.* Nat Rev Cancer 2023

---

## Autore

Dr. Filippo Bianchi  
Direttore SC Anatomia Patologica — ASST Fatebenefratelli-Sacco, Milano  
Uso interno didattico · Non per distribuzione clinica
