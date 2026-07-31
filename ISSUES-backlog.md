# Backlog — da incollare come Issue su GitHub

Ogni blocco sotto è pensato per diventare **una issue separata**: titolo +
descrizione + etichette suggerite. Copia/incolla così come sono, oppure
adattale.

---

## 1. Export dati in CSV
**Etichette:** `enhancement`, `priority-high`

Aggiungere un pulsante "Esporta" che scarichi un file `.csv` con: nome
attività, data, ora inizio, ora fine, durata. Utile per chi vuole importare i
dati in Excel/Google Sheets per un report settimanale/mensile.

**Criteri di accettazione:**
- [ ] Pulsante visibile nell'interfaccia
- [ ] Il CSV include tutte le sessioni (non solo il totale per attività)
- [ ] Formato ora leggibile (es. `2026-07-30 09:14`)

---

## 2. Vista storico per giorno/settimana
**Etichette:** `enhancement`, `priority-high`

Attualmente tutto è "oggi": alla mezzanotte (o al refresh) si perde la
distinzione tra giorni. Serve uno storico navigabile per rivedere i giorni
precedenti.

**Criteri di accettazione:**
- [ ] I dati di ogni giorno restano separati e consultabili
- [ ] Un selettore permette di scegliere la data da visualizzare
- [ ] Il totale giornaliero resta corretto anche a cavallo di mezzanotte

---

## 3. Comportamento configurabile alla chiusura del browser
**Etichette:** `enhancement`, `priority-medium`

Oggi un timer attivo continua a contare anche a browser chiuso (calcolato
sulla differenza di timestamp). Aggiungere un'opzione per mettere in pausa
automaticamente il timer attivo alla chiusura/refresh della pagina, per chi
preferisce questo comportamento.

---

## 4. Responsive / versione mobile
**Etichette:** `enhancement`, `priority-medium`

Il layout attuale è pensato per desktop. Verificare e adattare per schermi
stretti (uso da smartphone durante la giornata lavorativa).

---

## 5. Import/backup dati
**Etichette:** `enhancement`, `priority-medium`

I dati vivono solo nel `localStorage` del browser: si perdono cambiando
dispositivo o cancellando la cache. Aggiungere un pulsante per esportare/
importare un backup in JSON.

---

## 6. Estensione browser (Chrome/Firefox)
**Etichette:** `enhancement`, `priority-low`, `future`

Valutare il porting a estensione da browser (popup/side panel), così il
timer resta sempre a portata di click mentre si lavora, senza tenere una
scheda aperta.

---

## 7. Scorciatoie da tastiera
**Etichette:** `enhancement`, `priority-low`

Es. `Ctrl+N` per focus sul campo "nuova attività", numeri `1-9` per
switchare rapidamente tra le prime attività della lista.

---

## 8. Statistiche di riepilogo
**Etichette:** `enhancement`, `priority-low`

Un piccolo pannello con: attività con più tempo tracciato nella settimana,
numero di switch tra attività, media giornaliera.

---

## 9. Dark/Light mode toggle
**Etichette:** `enhancement`, `priority-low`

L'interfaccia attuale è scura di default. Aggiungere un toggle per un tema
chiaro, per chi preferisce.

---

## 10. Test su più tab aperte contemporaneamente
**Etichette:** `bug`, `priority-medium`

Verificare cosa succede se l'app è aperta in due tab diverse dello stesso
browser: il `localStorage` è condiviso, quindi bisogna capire come gestire
eventuali conflitti o disallineamenti di stato tra le tab.
