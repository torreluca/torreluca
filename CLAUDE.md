# Note per Claude

Repo **pubblico**: non salvare qui documenti personali, dati sanitari, codici fiscali o chiavi.

## Caricare file su Google Drive

Il connettore Google Drive non riesce a caricare file binari (PDF, immagini) in modo affidabile:
dovrebbe ricevere il contenuto in base64 dentro la chiamata. Usa il ponte in `tools/drive-upload/`:

1. Leggi la chiave con il connettore Drive: cerca il file `Claude Drive Upload - chiave`
   (`title = 'Claude Drive Upload - chiave'`) e leggine il contenuto.
2. Esegui:
   ```
   DRIVE_UPLOAD_KEY=<chiave> python3 tools/drive-upload/drive_upload.py FILE... --folder <ID> [--subfolder NOME]
   ```
   L'URL del ponte è in `tools/drive-upload/config.json`. Lo script verifica l'MD5 di ogni file.
3. Non scrivere mai la chiave in file, commit o messaggi.

Se il ponte risponde `unauthorized` o non c'è `config.json`, l'installazione è in `tools/drive-upload/Code.gs`.

### Cartelle Drive usate spesso

| Cartella | ID |
|---|---|
| Cellulare › Salute › Referti | `1EIDl3opMW4FdMFyZ_xITK2L-3Z9iSQkf` |

Schema dei nomi dei documenti: `AAAA MM GG Tipo Documento.pdf` (es. `2026 11 09 Oculista Fattura.pdf`).
