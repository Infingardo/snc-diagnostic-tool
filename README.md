# 🧠 Tool Diagnostico Neoplasie Cerebrali — v3.10.2

**WHO CNS5 2021 · Gliomi & Meningiomi · Workflow morfologia → IHC → NGS**  
Pannello Diatech Pharmacogenetics Extended

---

## Descrizione

Ausilio didattico per la formazione in neuropatologia.  
Esegue pattern matching su regole **WHO CNS5 2021** — non è un sistema diagnostico certificato e non sostituisce il giudizio clinico-patologico.

Due moduli integrati in un unico file HTML self-contained:

| Modulo | Entità coperte |
|--------|---------------|
| 🧬 **Gliomi / PCNSL** | Astrocitoma IDH-mut, Oligodendroglioma IDH-mut 1p/19q-codel, GBM IDH-wt, DMG H3K27-alt, DIPG, Ependimoma, Medulloblastoma, PCNSL, Gliomi fusione (NTRK, FGFR, NRG1) |
| 🔴 **Meningiomi** | Tutti i sottotipi WHO CNS5, grading molecolare integrato |

---

## Workflow

```
Morfologia EE
    ↓
IHC (IDH1 R132H, ATRX, p53, Ki-67, TERT, H3K27me3, BRD1, EGFR, …)
    ↓
NGS — Pannello Diatech Extended
  · SNV/InsDel: IDH1/2, TERT, CDKN2A/B, EGFR, BRAF, H3F3A/HIST1H3B
  · CNV: EGFR amp, ERBB2, MET
  · Fusioni: ALK, FGFR1/2/3, MET, NRG1, NTRK1/2/3, PPARG, RET, ROS1
  · MSI: Bethesda esteso (BAT25, BAT26, CAT25 + 118 marker mononucleotidici)
    ↓
Report diagnostico WHO CNS5 + raccomandazioni cliniche
```

---

## Modulo Gliomi — Parametri chiave

### Gating (prerequisiti per la generazione del report)
- Istotipo selezionato (obbligatorio)
- Almeno un marker IHC inserito

### Classificatori molecolari principali

| Alterazione | Peso classificatorio |
|-------------|---------------------|
| IDH1/2 mut | Astrocitoma vs Oligodendroglioma vs GBM IDH-wt |
| 1p/19q codelezione | Oligodendroglioma (richiede IDH mut) |
| TERT mut | GBM IDH-wt (con EGFR amp o +7/−10) |
| H3K27M | DMG pediatrico, Grade 4 |
| CDKN2A/B del omozigote | Astrocitoma IDH-mut → Grade 4 |
| Necrosi + MVP | GBM IDH-wt: criteri istologici Grade 4 |
| NTRK / FGFR / NRG1 fusion | Gliomi fusione — entità emergenti CNS5 |

### Casi precaricati (demo)

| # | Caso | Entità attesa |
|---|------|--------------|
| 1 | Astrocitoma IDH-mut Ki-67 alto | WHO Grade 3 |
| 2 | Oligodendroglioma IDH-mut 1p/19q-codel | WHO Grade 2 |
| 3 | GBM IDH-wt con necrosi e MVP | WHO Grade 4 |
| 4 | DMG H3K27M pediatrico con necrosi | WHO Grade 4 |
| 5 | Glioma NTRK-fusion | Entità emergente |

---

## Modulo Meningiomi — Parametri chiave

### Grading WHO CNS5 2021

| Criterio | Grado assegnato |
|----------|----------------|
| Sottotipo istologico benigno, assenza altri criteri | Grade 1 |
| Invasione cerebrale confermata | Grade 2 (criterio isolato) |
| Indice mitotico ≥ 4/10 HPF (Grade 2) o ≥ 20/10 HPF (Grade 3) | Grade 2 / Grade 3 |
| **TERT promoter mutation** | **Grade 3 — criterio molecolare indipendente (WHO CNS5 2021)** |
| CDKN2A/B delezione omozigote | Grade 3 — criterio molecolare indipendente |
| Sottotipo istologico a grado implicito (es. rabdoide, papillare) | Grade 2 o 3 per definizione |

> ⚠️ **Nota v3.10.2**: `TERT promoter mutation` assegna direttamente **WHO Grade 3**, non Grade 2.  
> Versioni precedenti al v3.10.2 contenevano un errore su questo punto — corretto in questa release.

### Pannello molecolare meningiomi (Diatech)
- SNV/InsDel: TERT promoter, NF2, SMARCB1, SMARCA4, SMARCE1
- CNV: CDKN2A/B (delezione omozigote)

---

## Funzionalità UI

- **Switch modulo**: bottoni Gliomi / Meningiomi in header
- **Casi precaricati**: dropdown con 5 casi demo per il modulo gliomi
- **Reset form**: pulisce solo il modulo attivo (gliomi o meningiomi)
- **Export PDF**: disponibile per entrambi i moduli (pulsante dedicato per ciascuno)
- **Sezione bibliografia**: highlight automatico delle referenze pertinenti al caso
- **Disclaimer**: visibile in footer — tool non certificato, uso solo didattico

---

## Changelog

### v3.10.2 (2026-03)
- **[FIX CRITICO]** TERT promoter mutation nel meningioma → correttamente assegnato a WHO Grade 3 (non Grade 2). Il bug era presente dal v3.9.x.
- **[FIX]** Help-text campo TERT aggiornato: "Mut → criterio molecolare indipendente di WHO Grade 3 (WHO CNS5 2021)"
- **[FIX]** Opzione "Non specificato" nel gate ora accettata come valore valido (non bloccava più la generazione del report)
- **[FIX]** Reset form ora confinato al modulo gliomi (non resettava per errore anche i campi meningioma)
- **[FIX]** Export PDF unificato: entrambi i moduli dispongono di pulsante export con label e filename corretti
- **[FIX]** Casi precaricati: aggiunti campi `hist-necrosis` e `hist-microvascular` a tutti i 5 casi demo

### v3.10.1
- Aggiunto modulo meningiomi con grading molecolare
- Integrazione pannello Diatech per fusioni (NRG1, NTRK, FGFR)
- MSI Bethesda esteso

### v3.10.0
- Refactoring architettura dual-module (gliomi + meningiomi)
- Switch UI con tab dedicati

---

## Riferimenti normativi

- **WHO Classification of Tumours of the Central Nervous System, 5th ed. (CNS5), 2021** — Louis DN et al., *Neuro-Oncology* 23(8):1231–1251, 2021
- Sahm F et al. — TERT promoter mutations and meningioma grading, *Acta Neuropathol* 2016
- Goutagny S et al. — Meningioma molecular classification, *Brain Pathol* 2021
- Brat DJ et al. — cIMPACT-NOW update, *Acta Neuropathol* 2020

---

## Note tecniche

- File: **singolo HTML self-contained** (no dipendenze esterne, no framework)
- Compatibile con: Chrome 90+, Firefox 88+, Safari 14+, Edge 90+
- Export PDF: `window.print()` con CSS `@media print` ottimizzato
- Nessun dato trasmesso a server esterni — tutto client-side

---

*Tool sviluppato a scopo didattico interno — SC Anatomia Patologica, ASST Fatebenefratelli-Sacco, Milano.*  
*Non certificato come dispositivo medico. Non utilizzare per decisioni diagnostiche cliniche.*
