"""Single-track spotDL import. Audio is persisted privately, never in a response body."""
from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
import base64, hashlib, hmac, json, os, re, subprocess, sys, tempfile, time, uuid
from pathlib import Path
from urllib.parse import urlparse, quote


def valid_session(headers):
    try:
        password = os.environ.get('USER_PASSWORD', '')
        if not password: return False
        origin = headers.get('Origin')
        if origin and urlparse(origin).netloc != headers.get('Host'): return False
        cookie = SimpleCookie(headers.get('Cookie', ''))
        token = cookie['aces_music_session'].value
        if len(token) > 2048: return False
        payload, signature = token.split('.')
        expected = base64.urlsafe_b64encode(hmac.new(password.encode(), ('aces-music-session:v1:'+payload).encode(), hashlib.sha256).digest()).decode().rstrip('=')
        data = json.loads(base64.urlsafe_b64decode(payload+'='*(-len(payload)%4)))
        return hmac.compare_digest(signature, expected) and isinstance(data.get('name'), str) and 0 < len(data['name']) <= 80 and data.get('exp',0) > time.time()*1000
    except Exception: return False


def downloader_environment(folder):
    # Vercel adds downloaded dependencies to sys.path in the parent process.
    # A fresh Python subprocess does not inherit those additions automatically.
    paths = [str(Path(path).resolve()) for path in sys.path if path and Path(path).is_dir()]
    return dict(os.environ, PYTHONPATH=os.pathsep.join(paths), XDG_CACHE_HOME=folder, XDG_CONFIG_HOME=folder)


def download_failure(result):
    output=(result.stderr or b'').decode('utf-8', errors='replace')+'\n'+(result.stdout or b'').decode('utf-8', errors='replace')
    if 'No module named' in output or 'ModuleNotFoundError' in output:
        code='IMPORT_DEPENDENCY'
        message='The download worker could not load a required component. Please retry; the project owner can check the worker logs.'
    elif 'ACES_STAGE:download' not in output:
        code='IMPORT_FFMPEG'
        message='The download worker could not prepare FFmpeg. Please retry or upload your audio file.'
    elif any(word in output.lower() for word in ['sign in to confirm','not a bot','http error 403','http error 429','login required']):
        code='IMPORT_SOURCE_BLOCKED'
        message='The music source rejected the server download. Please upload the recording instead.'
    else:
        code='IMPORT_DOWNLOAD'
        message='The downloader could not retrieve this recording. Please retry or upload the audio file.'
    # Keep diagnostics on the server and remove URLs, credentials and control codes.
    safe=re.sub(r'\x1b\[[0-9;]*m','',output)
    for key,value in os.environ.items():
        if len(value)>7 and any(word in key.upper() for word in ['KEY','TOKEN','SECRET','PASSWORD']): safe=safe.replace(value,'[redacted]')
    safe=re.sub(r'https?://[^\s]+','[url]',safe)
    print('Spotify import diagnostic:',json.dumps({'code':code,'exitCode':result.returncode,'detail':safe[-2500:]}),flush=True)
    return {'code':code,'error':message}


class handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store'); self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def do_POST(self):
        if not valid_session(self.headers): return self.reply(401, {'error':'Please sign in to import music.'})
        try:
            length = int(self.headers.get('Content-Length','0'))
            if length < 1 or length > 2048: return self.reply(400, {'error':'Invalid import request.'})
            data = json.loads(self.rfile.read(length))
            match = re.fullmatch(r'https://open\.spotify\.com/(?:intl-[a-z]+/)?track/([A-Za-z0-9]{22})(?:\?[^\s]*)?', data.get('url',''))
            if not match: return self.reply(400, {'error':'Paste a single Spotify track link. Albums and playlists are not supported.'})
            if data.get('rightsConfirmed') is not True: return self.reply(400, {'error':'Confirm that you have permission to download and analyze this recording.'})
            import requests
            canonical = 'https://open.spotify.com/track/'+match[1]
            with tempfile.TemporaryDirectory(prefix='aces-import-') as folder:
                # spotDL and its caches must only write to ephemeral /tmp.
                env = downloader_environment(folder)
                bootstrap = "import pathlib,runpy,sys; work=sys.argv.pop(1); pathlib.Path.home=classmethod(lambda cls:pathlib.Path(work)); sys.argv[0]='spotdl'; print('ACES_STAGE:dependencies',file=sys.stderr,flush=True); from spotdl.utils.ffmpeg import download_ffmpeg; print('ACES_STAGE:ffmpeg',file=sys.stderr,flush=True); ffmpeg=download_ffmpeg(); import subprocess; subprocess.run([str(ffmpeg),'-version'],check=True,stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); print('ACES_STAGE:download',file=sys.stderr,flush=True); runpy.run_module('spotdl',run_name='__main__')"
                command = [sys.executable,'-c',bootstrap,folder,'download',canonical,'--output',folder+'/{title}.{output-ext}', '--format','mp3','--bitrate','192k','--threads','1','--no-cache']
                result = subprocess.run(command, cwd=folder, env=env, capture_output=True, timeout=210)
                files = list(Path(folder).glob('*.mp3'))
                if result.returncode or len(files) != 1:
                    return self.reply(502, download_failure(result))
                audio = files[0]
                if not 0 < audio.stat().st_size <= 100*1024*1024: return self.reply(413, {'error':'Imported audio exceeds 100 MB.'})
                path = 'music/'+str(uuid.uuid4())+'.mp3'
                token = os.environ.get('BLOB_READ_WRITE_TOKEN') or os.environ.get('VERCEL_OIDC_TOKEN')
                if not token: return self.reply(503, {'error':'Private audio storage is not configured.'})
                headers = {'Authorization':'Bearer '+token,'x-api-version':'13','x-vercel-blob-store-id':os.environ.get('BLOB_STORE_ID','store_PntqkokZ1AMhBkcC'),'x-vercel-blob-access':'private','x-content-type':'audio/mpeg','x-add-random-suffix':'0','Content-Type':'audio/mpeg'}
                with audio.open('rb') as body:
                    response = requests.put('https://vercel.com/api/blob/?pathname='+quote(path,safe=''),data=body,headers=headers,timeout=45)
                if not response.ok: return self.reply(502, {'error':'The download completed but private storage failed. Please retry.'})
                return self.reply(200, {'path':path,'name':audio.name,'sourceUrl':canonical,'source':'spotDL / matched YouTube recording'})
        except subprocess.TimeoutExpired: self.reply(504, {'error':'Music import timed out. Try again or upload your audio file.'})
        except Exception as error:
            print('Spotify import failed:', type(error).__name__)
            self.reply(502, {'error':'Music import failed. Please retry or upload your audio file.'})
