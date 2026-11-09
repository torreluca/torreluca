/**
 * Claude Drive Upload — ponte per caricare file su Google Drive
 * dalle sessioni cloud di Claude Code.
 *
 * INSTALLAZIONE (una volta sola):
 *  1. Vai su https://script.google.com > Nuovo progetto, incolla questo file.
 *  2. Esegui il deployment > Nuovo deployment > tipo "App web":
 *       Esegui come: Me    —    Chi ha accesso: Chiunque
 *     Autorizza e copia l'URL che finisce con /exec.
 *  3. Nell'editor seleziona la funzione `setup` ed eseguila.
 *     Crea in Drive il file "Claude Drive Upload - chiave" con la chiave segreta.
 *  4. Manda a Claude l'URL /exec (non la chiave: Claude la legge da Drive).
 *
 * Senza la chiave lo script rifiuta qualsiasi richiesta.
 * Per revocare l'accesso: esegui `revoca` (o archivia il deployment).
 */

const KEY_FILE_NAME = 'Claude Drive Upload - chiave';
const MAX_BYTES = 45 * 1024 * 1024;

function setup() {
  const props = PropertiesService.getScriptProperties();
  let key = props.getProperty('UPLOAD_KEY');
  if (!key) {
    key = (Utilities.getUuid() + Utilities.getUuid()).replace(/-/g, '');
    props.setProperty('UPLOAD_KEY', key);
  }
  const old = DriveApp.getFilesByName(KEY_FILE_NAME);
  while (old.hasNext()) old.next().setTrashed(true);
  DriveApp.getRootFolder().createFile(KEY_FILE_NAME, key, MimeType.PLAIN_TEXT);
  Logger.log('Chiave salvata in Drive nel file "%s".', KEY_FILE_NAME);
}

function revoca() {
  PropertiesService.getScriptProperties().deleteProperty('UPLOAD_KEY');
  const old = DriveApp.getFilesByName(KEY_FILE_NAME);
  while (old.hasNext()) old.next().setTrashed(true);
  Logger.log('Chiave revocata: nessun upload sarà più accettato finché non riesegui setup.');
}

/**
 * POST ?key=...&name=...&folderId=...[&subfolder=...][&mimeType=...][&overwrite=1]
 * Corpo: contenuto del file in base64 (text/plain).
 */
function doPost(e) {
  try {
    const p = e.parameter || {};
    const key = PropertiesService.getScriptProperties().getProperty('UPLOAD_KEY');
    if (!key || p.key !== key) return out_({ ok: false, error: 'unauthorized' });
    if (!p.name) return out_({ ok: false, error: 'manca il parametro name' });

    const bytes = Utilities.base64Decode(e.postData.contents.replace(/\s/g, ''));
    if (bytes.length > MAX_BYTES) return out_({ ok: false, error: 'file troppo grande' });

    let folder = p.folderId ? DriveApp.getFolderById(p.folderId) : DriveApp.getRootFolder();
    if (p.subfolder) {
      const it = folder.getFoldersByName(p.subfolder);
      folder = it.hasNext() ? it.next() : folder.createFolder(p.subfolder);
    }

    const existing = folder.getFilesByName(p.name);
    if (existing.hasNext()) {
      if (p.overwrite !== '1') return out_({ ok: false, error: 'esiste già', id: existing.next().getId() });
      while (existing.hasNext()) existing.next().setTrashed(true);
    }

    const blob = Utilities.newBlob(bytes, p.mimeType || 'application/octet-stream', p.name);
    const file = folder.createFile(blob);
    const md5 = Utilities.computeDigest(Utilities.DigestAlgorithm.MD5, bytes)
      .map(b => ((b + 256) % 256).toString(16).padStart(2, '0')).join('');
    return out_({
      ok: true, id: file.getId(), name: file.getName(), url: file.getUrl(),
      size: bytes.length, md5: md5, folder: folder.getName(), folderId: folder.getId(),
    });
  } catch (err) {
    return out_({ ok: false, error: String(err) });
  }
}

function doGet() {
  return out_({ ok: true, service: 'claude-drive-upload' });
}

function out_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
