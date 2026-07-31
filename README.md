# Pannello Attività — Time Tracker a timer multipli

Un timer da scrivania per chi lavora su più attività durante la giornata e vuole
tracciarne il tempo senza friction: **niente account, niente cloud, niente setup**.

## L'idea

I tool di time-tracking classici (Toggl, Clockify, ecc.) sono pensati per
progetti/clienti/fatturazione. Questo è più semplice: un elenco di attività,
**una sola può essere "accesa" alla volta**. Clicchi su un'attività per
avviarla, quella precedente si ferma da sola ma resta visibile con il suo
tempo accumulato. Vuoi tornarci? Un altro click e riparte da dove l'avevi
lasciata.

Pensato per chi passa spesso da un task all'altro (email, riunioni, sviluppo,
supporto clienti...) e vuole solo capire dove va il tempo, senza compilare
timesheet.

## Come si usa

1. Apri `index.html` nel browser (funziona anche offline, come file locale).
2. Scrivi il nome di un'attività e premi **Avvia**.
3. Cambia attività quando vuoi: scrivine una nuova, oppure clicca su una già
   presente per riprenderla.
4. I dati restano salvati nel browser (`localStorage`) tra una sessione e
   l'altra, sullo stesso dispositivo.

## Stato del progetto

Prototipo funzionante, singolo file HTML/CSS/JS senza dipendenze. In fase di
consolidamento verso una prima release pubblica — vedi le [Issue](../../issues)
per il backlog di miglioramenti (export dati, viste settimanali, versione
mobile, estensione browser).

Contributi, segnalazioni e idee sono benvenuti: apri una issue o una pull
request.

## Licenza

MIT — vedi [LICENSE](./LICENSE).
