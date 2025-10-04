# Assistente Diagnostico SNC - WHO CNS5 2021

Sistema educativo interattivo per apprendere la classificazione WHO 2021 dei tumori del sistema nervoso centrale, con integrazione di criteri morfologici, immunoistochimici e molecolari.

---

## DISCLAIMER CRITICO

### ATTENZIONE: SOLO USO EDUCATIVO

**Questo strumento NON è validato clinicamente e NON deve essere utilizzato per:**
- Diagnosi di pazienti reali
- Decisioni terapeutiche
- Consulenza medica
- Refertazione anatomopatologica

**Limitazioni fondamentali:**
- Database ridotto a 5 entità diagnostiche principali
- Methylation profiling simulato (non vero Heidelberg classifier)
- Grading semplificato senza copy number alterations dettagliate
- Assenza di integrazione imaging
- Assenza di correlazione clinico-patologica completa
- Non sostituisce tumor board multidisciplinare

**Per diagnosi reali consultare:**
- Neuropatologo certificato
- Methylation profiling certificato (Heidelberg/DKFZ)
- Tumor board multidisciplinare (neurochirurgo, oncologo, radioterapista, neuroradiologo)

---

## Per Chi È Questo Strumento

Target primario:
- Studenti di medicina (anni clinici)
- Specializzandi in anatomia patologica
- Neuropatologi in formazione
- Ricercatori che studiano gliomi

**NON per:**
- Clinici che cercano strumenti diagnostici reali
- Pazienti che cercano autodiagnosi
- Decisioni terapeutiche

---

## Cosa Fa

Questo tool simula il processo diagnostico integrato WHO CNS5 2021 per tumori SNC, permettendo di:

1. **Inserire dati clinici**: età, sede anatomica, pattern morfologico
2. **Specificare criteri morfologici**: necrosi, proliferazione microvascolare, attività mitotica
3. **Aggiungere risultati immunoistochimici**: IDH1, ATRX, p53, OLIG2, GFAP, H3K27me3, H3K27M, Ki-67
4. **Integrare dati molecolari**: mutazioni IDH1/2, codelezione 1p/19q, TERT promoter, TP53, EGFR, H3F3A, CDKN2A/B deletion, MGMT methylation
5. **Simulare methylation profiling**: classificazione Heidelberg-style

**Output:**
- Diagnosi primaria con confidenza percentuale
- Grado WHO dinamico (integra morfologia + molecolare)
- Evidenze supportive e contraddittorie
- Diagnosi differenziale
- Dati prognostici (sopravvivenza mediana, 5-year survival)

---

## Caratteristiche Tecniche

### Grading Dinamico WHO CNS5

L'algoritmo calcola il grado secondo gerarchia di priorità:

1. **Methylation class** (gold standard)
2. **CDKN2A/B homozygous deletion** (automatic Grade 4 CNS5)
3. **IDH status** (IDH-wildtype diffuse glioma = GBM Grade 4)
4. **H3 K27M** (DMG sempre Grade 4)
5. **Criteri morfologici** (necrosi, MVP, mitosi)
6. **Ki-67** (correlazione con proliferazione)

### Validazione Biologica

Implementa constraint biologici:
- IDH-mutant esclude EGFR amplification
- 1p/19q codeletion esclude ATRX loss (mutually exclusive)
- ATRX loss correlato con TP53 mutation
- H3 K27M correlato con H3K27me3 loss

### Entità Diagnostiche Implementate

1. **Astrocytoma, IDH-mutant** (Grade 2-4)
2. **Oligodendroglioma, IDH-mutant and 1p/19q-codeleted** (Grade 2-3)
3. **Glioblastoma, IDH-wildtype** (Grade 4)
4. **Diffuse midline glioma, H3 K27-altered** (Grade 4)
5. **Pilocytic astrocytoma** (Grade 1)

---

## Installazione e Uso

### Locale

1. Clone repository:
```bash
git clone https://github.com/[tuo-username]/snc-diagnostic-tool.git
cd snc-diagnostic-tool
