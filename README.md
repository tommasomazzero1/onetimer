# OneTimer

> Un solo timer attivo, ogni attività a un clic di distanza.

OneTimer è un timer locale per chi passa spesso fra email, riunioni, sviluppo, supporto e pianificazione. Clicca un'attività per avviarla: quella precedente si mette automaticamente in pausa.

## Funzionalità

- Una sola attività attiva alla volta, con cambio o pausa in un clic.
- Attività giornaliere, archivio, categorie, storico giornaliero e settimanale.
- Esportazione dei report CSV e backup/import locale JSON.
- Promemoria facoltativo per eliminare la cronologia più vecchia di 30 giorni.
- Interfaccia italiana, desktop-first e utilizzabile anche su schermi stretti.

## Usa l'app

Apri [OneTimer su GitHub Pages](https://tommasomazzero1.github.io/onetimer/) oppure apri [`index.html`](./index.html) in un browser moderno. Non servono installazione, build, server o dipendenze esterne.

Ogni push su `master` pubblica il contenuto corrente del repository su GitHub Pages.

## Privacy e dati

I dati restano nel `localStorage` del browser: non esistono account, backend, analytics o sincronizzazione automatica. Usa il backup JSON per conservare o trasferire i dati.

La versione dell'app è `v0.1.0`; lo schema dei dati locali resta separato ed è attualmente `1`.

## Sviluppo

```sh
node test.js
git diff --check
```

## Licenza

MIT — vedi [LICENSE](./LICENSE).
