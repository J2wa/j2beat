import base64, hashlib, hmac, importlib.util, io, json, os, sys, time, types, unittest
from pathlib import Path
from unittest.mock import patch
spec=importlib.util.spec_from_file_location('spotify',Path(__file__).parents[1]/'api/spotify.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
class ImportTests(unittest.TestCase):
 def setUp(self):
  self.env=patch.dict(os.environ,{'USER_PASSWORD':'test-password','BLOB_READ_WRITE_TOKEN':'test-blob'});self.env.start()
  payload=base64.urlsafe_b64encode(json.dumps({'name':'Test','exp':time.time()*1000+60000}).encode()).decode().rstrip('=')
  sig=base64.urlsafe_b64encode(hmac.new(b'test-password',('aces-music-session:v1:'+payload).encode(),hashlib.sha256).digest()).decode().rstrip('=')
  self.headers={'Cookie':'aces_music_session='+payload+'.'+sig,'Host':'music.test','Origin':'https://music.test'}
 def tearDown(self): self.env.stop()
 def call(self,body):
  h=module.handler.__new__(module.handler);data=json.dumps(body).encode();h.headers={**self.headers,'Content-Length':str(len(data))};h.rfile=io.BytesIO(data);result=[];h.reply=lambda status,data:result.append((status,data));h.do_POST();return result[0]
 def test_auth_and_origin(self):
  self.assertTrue(module.valid_session(self.headers));self.assertFalse(module.valid_session({**self.headers,'Origin':'https://evil.test'}));self.assertFalse(module.valid_session({}))
 def test_reject_playlist_and_unconfirmed(self):
  self.assertEqual(self.call({'url':'https://open.spotify.com/playlist/'+'a'*22,'rightsConfirmed':True})[0],400)
  self.assertEqual(self.call({'url':'https://open.spotify.com/track/'+'a'*22})[0],400)
 def test_download_and_private_persistence(self):
  def download(command,**kwargs):
   self.assertIn('--threads',command);self.assertEqual(command[5],'https://open.spotify.com/track/'+'a'*22)
   Path(kwargs['cwd'],'Test song.mp3').write_bytes(b'fake audio');return types.SimpleNamespace(returncode=0,stdout=b'',stderr=b'')
  requests=types.SimpleNamespace(put=lambda url,**kwargs:types.SimpleNamespace(ok=kwargs['headers']['x-vercel-blob-access']=='private'))
  with patch.dict(sys.modules,{'requests':requests,'imageio_ffmpeg':types.SimpleNamespace(get_ffmpeg_exe=lambda:'/ffmpeg')}),patch.object(module.subprocess,'run',side_effect=download):
   status,data=self.call({'url':'https://open.spotify.com/track/'+'a'*22,'rightsConfirmed':True})
  self.assertEqual(status,200);self.assertTrue(data['path'].startswith('music/'));self.assertNotIn('test-blob',json.dumps(data))
 def test_dynamic_dependency_paths_reach_child(self):
  import tempfile, subprocess
  with tempfile.TemporaryDirectory() as folder:
   Path(folder,'aces_runtime_dependency.py').write_text('VALUE=42')
   sys.path.insert(0,folder)
   try:
    result=subprocess.run([sys.executable,'-c','import aces_runtime_dependency; print(aces_runtime_dependency.VALUE)'],cwd='/tmp',env=module.downloader_environment(folder),capture_output=True)
    self.assertEqual(result.returncode,0,result.stderr);self.assertIn(b'42',result.stdout)
   finally:sys.path.remove(folder)
 def test_error_classification(self):
  missing=types.SimpleNamespace(returncode=1,stderr=b"ModuleNotFoundError: No module named 'spotdl'",stdout=b'')
  self.assertEqual(module.download_failure(missing)['code'],'IMPORT_DEPENDENCY')
  blocked=types.SimpleNamespace(returncode=1,stderr=b'ACES_STAGE:download\nSign in to confirm you are not a bot',stdout=b'')
  self.assertEqual(module.download_failure(blocked)['code'],'IMPORT_SOURCE_BLOCKED')
if __name__=='__main__': unittest.main()
