"""Single-track spotDL import. Audio is persisted privately, never in a response body."""
from http.server import BaseHTTPRequestHandler
from http.cookies import SimpleCookie
import base64, hashlib, hmac, json, os, re, subprocess, sys, tempfile, time, uuid, queue, threading
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


class CookieConfigurationError(ValueError):
    pass


def prepare_cookie_file(folder):
    """Optional secret, restricted to YouTube domains and this request's temp directory."""
    encoded = os.environ.get('YOUTUBE_COOKIES_BASE64', '').strip()
    if not encoded:
        return None
    try:
        if len(encoded) > 65536:
            raise ValueError('too large')
        content = base64.b64decode(''.join(encoded.split()), validate=True).decode('utf-8-sig')
        lines = content.splitlines()
        if not lines or lines[0] not in ('# Netscape HTTP Cookie File', '# HTTP Cookie File'):
            raise ValueError('header')
        accepted = ['# Netscape HTTP Cookie File']
        for line in lines[1:]:
            if not line.strip() or (line.startswith('#') and not line.startswith('#HttpOnly_')):
                continue
            fields = line.split('\t')
            if len(fields) != 7:
                raise ValueError('columns')
            domain = fields[0].removeprefix('#HttpOnly_').lstrip('.').lower()
            if domain != 'youtube.com' and not domain.endswith('.youtube.com'):
                continue
            if fields[1] not in ('TRUE', 'FALSE') or fields[3] not in ('TRUE', 'FALSE') or not fields[4].isdigit() or not fields[5]:
                raise ValueError('format')
            accepted.append(line)
        if len(accepted) == 1:
            raise ValueError('no YouTube cookies')
        path = Path(folder) / 'youtube-cookies.txt'
        fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        with os.fdopen(fd, 'w', encoding='utf-8') as output:
            output.write('\n'.join(accepted) + '\n')
        return str(path)
    except (ValueError, UnicodeError) as error:
        raise CookieConfigurationError('Invalid server YouTube cookie configuration. Set YOUTUBE_COOKIES_BASE64 to a base64-encoded Netscape cookies.txt export containing YouTube cookies, or remove it.') from None


def downloader_environment(folder):
    # Vercel adds downloaded dependencies to sys.path in the parent process.
    # A fresh Python subprocess does not inherit those additions automatically.
    paths = [str(Path(path).resolve()) for path in sys.path if path and Path(path).is_dir()]
    env = dict(os.environ, PYTHONPATH=os.pathsep.join(paths), XDG_CACHE_HOME=folder, XDG_CONFIG_HOME=folder)
    env.pop('YOUTUBE_COOKIES_BASE64', None)
    return env


def download_failure(result, using_cookies=False):
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
    if using_cookies:
        # Downloader exceptions may contain decoded session data. Never log raw output.
        print('Spotify import diagnostic:', json.dumps({'code':code,'exitCode':result.returncode,'cookiesEnabled':True}), flush=True)
        if code == 'IMPORT_SOURCE_BLOCKED':
            message = 'YouTube rejected the download with server cookies enabled. The owner can refresh the cookies; upload the recording if the block continues.'
        return {'code':code,'error':message}
    # Keep diagnostics on the server and remove URLs, credentials and control codes.
    safe=re.sub(r'\x1b\[[0-9;]*m','',output)
    for key,value in os.environ.items():
        if len(value)>7 and any(word in key.upper() for word in ['KEY','TOKEN','SECRET','PASSWORD','COOKIE']): safe=safe.replace(value,'[redacted]')
    safe=re.sub(r'https?://[^\s]+','[url]',safe)
    print('Spotify import diagnostic:',json.dumps({'code':code,'exitCode':result.returncode,'detail':safe[-2500:]}),flush=True)
    return {'code':code,'error':message}


BOOTSTRAP = r"""
import pathlib, runpy, sys, json
work = sys.argv.pop(1)
pathlib.Path.home = classmethod(lambda cls: pathlib.Path(work))
sys.argv[0] = 'spotdl'
def event(stage, percent=None):
    print('ACES_PROGRESS:' + json.dumps({'stage':stage,'percent':percent}), flush=True)
event('Preparing audio converter')
print('ACES_STAGE:dependencies', file=sys.stderr, flush=True)
from spotdl.utils.ffmpeg import download_ffmpeg
ffmpeg = download_ffmpeg()
import subprocess
subprocess.run([str(ffmpeg), '-version'], check=True, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
event('Preparing YouTube runtime')
from spotdl.utils.deno import download_deno
download_deno()
import yt_dlp
original_init = yt_dlp.YoutubeDL.__init__
def progress(data):
    if data.get('status') == 'downloading':
        total = data.get('total_bytes') or data.get('total_bytes_estimate')
        event('Downloading audio', min(100, round(data.get('downloaded_bytes',0)*100/total)) if total else None)
    elif data.get('status') == 'finished':
        event('Converting audio', None)
def init(self, params=None, *args, **kwargs):
    params = dict(params or {})
    params['progress_hooks'] = list(params.get('progress_hooks',[])) + [progress]
    params['remote_components'] = ['ejs:github']
    original_init(self, params, *args, **kwargs)
yt_dlp.YoutubeDL.__init__ = init
event('Finding matching recording')
print('ACES_STAGE:download', file=sys.stderr, flush=True)
runpy.run_module('spotdl', run_name='__main__')
"""

def run_download(command, folder, env, notify):
    lines = queue.Queue()
    output = []
    with subprocess.Popen(command, cwd=folder, env=env, stdout=subprocess.PIPE, stderr=subprocess.STDOUT) as process:
        def read():
            for line in process.stdout:
                lines.put(line)
            lines.put(None)
        threading.Thread(target=read, daemon=True).start()
        deadline = time.monotonic() + 210
        try:
            while True:
                if time.monotonic() >= deadline:
                    raise subprocess.TimeoutExpired(command,210)
                try: line = lines.get(timeout=1)
                except queue.Empty: continue
                if line is None: break
                if line.startswith(b'ACES_PROGRESS:'):
                    try: notify(json.loads(line[len(b'ACES_PROGRESS:'):]))
                    except (ValueError, TypeError): pass
                else:
                    output.append(line)
                    if len(output)>1000: output.pop(0)
            process.wait(timeout=max(1,deadline-time.monotonic()))
        finally:
            if process.poll() is None:
                process.kill(); process.wait()
    return subprocess.CompletedProcess(command,process.returncode,b''.join(output),b'')


class handler(BaseHTTPRequestHandler):
    def reply(self, status, data):
        if getattr(self,'streaming',False):
            return self.event({'type':'result' if status<400 else 'error',**data})
        self.send_response(status); self.send_header('Content-Type','application/json'); self.send_header('Cache-Control','no-store'); self.end_headers()
        self.wfile.write(json.dumps(data).encode())

    def event(self, data):
        self.wfile.write((json.dumps(data)+'\n').encode()); self.wfile.flush()

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
                cookie_file = prepare_cookie_file(folder)
                env = downloader_environment(folder)
                streaming = 'application/x-ndjson' in self.headers.get('Accept','')
                if streaming:
                    self.send_response(200); self.send_header('Content-Type','application/x-ndjson'); self.send_header('Cache-Control','no-store'); self.end_headers()
                    self.streaming=True
                notify = lambda event: self.event({'type':'progress',**event}) if streaming else None
                command = [sys.executable,'-u','-c',BOOTSTRAP,folder,'download',canonical,'--output',folder+'/{title}.{output-ext}', '--format','mp3','--bitrate','192k','--threads','1','--no-cache','--audio','youtube','youtube-music','--log-level','INFO' if cookie_file else 'DEBUG']
                if cookie_file:
                    command.extend(['--cookie-file', cookie_file])
                result = run_download(command, folder, env, notify)
                files = list(Path(folder).glob('*.mp3'))
                if result.returncode or len(files) != 1:
                    return self.reply(502, download_failure(result, using_cookies=bool(cookie_file)))
                audio = files[0]
                if not 0 < audio.stat().st_size <= 100*1024*1024: return self.reply(413, {'error':'Imported audio exceeds 100 MB.'})
                notify({'stage':'Saving private audio','percent':None})
                path = 'music/'+str(uuid.uuid4())+'.mp3'
                token = os.environ.get('BLOB_READ_WRITE_TOKEN') or os.environ.get('VERCEL_OIDC_TOKEN')
                if not token: return self.reply(503, {'error':'Private audio storage is not configured.'})
                headers = {'Authorization':'Bearer '+token,'x-api-version':'13','x-vercel-blob-store-id':os.environ.get('BLOB_STORE_ID','store_PntqkokZ1AMhBkcC'),'x-vercel-blob-access':'private','x-content-type':'audio/mpeg','x-add-random-suffix':'0','Content-Type':'audio/mpeg'}
                with audio.open('rb') as body:
                    response = requests.put('https://vercel.com/api/blob/?pathname='+quote(path,safe=''),data=body,headers=headers,timeout=45)
                if not response.ok: return self.reply(502, {'error':'The download completed but private storage failed. Please retry.'})
                return self.reply(200, {'path':path,'name':audio.name,'sourceUrl':canonical,'source':'spotDL / matched YouTube recording'})
        except CookieConfigurationError as error: self.reply(503, {'code':'IMPORT_COOKIE_CONFIG','error':str(error)})
        except subprocess.TimeoutExpired: self.reply(504, {'error':'Music import timed out. Try again or upload your audio file.'})
        except Exception as error:
            print('Spotify import failed:', type(error).__name__)
            self.reply(502, {'error':'Music import failed. Please retry or upload your audio file.'})
