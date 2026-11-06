# ML Production — sito 2026

Sito statico di ML Production (service audio, luci e video per eventi). HTML, CSS e JavaScript puri: niente builder e niente dipendenze, quindi gira subito su GitHub Pages.

## Pagine

| File | Pagina |
|---|---|
| `index.html` | Home con l'occhio di bue interattivo |
| `service-eventi.html` | Service audio e luci |
| `produzione-video.html` | Live production, video e spot |
| `fotografia.html` | Corporate, ricorrenze, musica dal vivo |
| `chi-siamo.html` | Storia e team |
| `404.html` | Pagina non trovata |

`serviceeventi.html`, `produzionevideo.html` e `Chi siamo.html` reindirizzano ai nuovi indirizzi, così i vecchi link e Google non trovano pagine rotte.

## Struttura

- `assets/css/site.css`: tutti gli stili. I colori sono in cima al file (`--red` è il rosso del logo, `#cc0033`).
- `assets/js/site.js`: occhio di bue, menu mobile, anteprime dei servizi, striscia foto, lightbox e modulo contatti.
- `assets/img/`: foto in WebP. Ogni foto ha due versioni: `nome.webp` (1800 px) e `nome-s.webp` (900 px).
- `assets/img/logos/`: loghi dei marchi dell'attrezzatura.
- `assets/fonts/`: **Hubot Sans** per titoli e pulsanti (grotesk tecnico di GitHub/Degarism), **Mona Sans** per i testi, **Martian Mono** per i piccoli dati tecnici. Ospitati in locale (nessuna chiamata a Google Fonts, meglio per la privacy e il GDPR), tutti con licenza SIL Open Font License.

## Modifiche frequenti

- **Cambiare una foto**: sostituisci i due file WebP con lo stesso nome.
- **Cambiare testi**: sono direttamente negli HTML.
- **Contatti**: email, WhatsApp e Instagram sono in ogni pagina (header, sezione contatti e footer). Il modulo non ha bisogno di un server: apre WhatsApp o l'email con il messaggio già compilato.

## Pubblicazione su GitHub Pages

1. Settings → Pages → Source: branch `main`, cartella `/ (root)`.
2. Per usare `mlproduction.it`: togli prima il dominio personalizzato dalla vecchia repository `mlproduction`, poi inseriscilo qui in Settings → Pages → Custom domain. GitHub creerà il file `CNAME`.
