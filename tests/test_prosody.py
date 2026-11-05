"""Motion Lab prosody safeguards: independent from paid voice generation."""
import importlib.util
import json
import tempfile
import unittest
from pathlib import Path
from unittest import mock
ROOT=Path(__file__).resolve().parents[1]
FILE=ROOT/"scripts/prosody/rhythm_engine.py"
spec=importlib.util.spec_from_file_location("rhythm_engine",FILE)
engine=importlib.util.module_from_spec(spec)
spec.loader.exec_module(engine)
class ProsodyTests(unittest.TestCase):
 def setUp(self):
  self.script=json.loads(engine.SCRIPT.read_text(encoding="utf8"))
  self.score=engine.make_score(self.script)
 def test_preserve_verbatim_every_word(self):
  self.assertEqual(len(self.score["blocks"]),19)
  self.assertGreaterEqual(sum(len(b["phrases"]) for b in self.score["blocks"]),60)
  by_id={b["id"]:b for b in self.script["segments"]}
  for b in self.score["blocks"]:
   self.assertEqual("".join(p["text"] for p in b["phrases"]),by_id[b["id"]]["text"])
 def test_key_emotional_reversal_is_not_uniform_rate(self):
  b=next(b for b in self.score["blocks"] if b["id"]=="06")
  self.assertEqual([p["ratePercent"] for p in b["phrases"]],[5,-17,-8,-1,-19])
  self.assertGreater(b["phrases"][1]["pauseAfterMs"],b["phrases"][0]["pauseAfterMs"])
 def test_final_line_has_long_reaction_and_slow_end(self):
  b=self.score["blocks"][-1]
  self.assertEqual(b["id"],"19")
  self.assertGreaterEqual(b["reactionHoldMs"],1200)
  self.assertLessEqual(b["phrases"][-1]["ratePercent"],-19)
 def test_source_is_immutable_not_rewritten_by_editor(self):
  b=self.score["blocks"][0];b["phrases"][0]["text"]="错误的替换"
  with self.assertRaises(ValueError):engine.safe_join(b["phrases"],self.script["segments"][0]["text"],"01")
 def test_end_pause_never_unbounded(self):
  for b in self.score["blocks"]:
   for p in b["phrases"]:
    self.assertGreaterEqual(p["pauseAfterMs"],0)
    self.assertLessEqual(p["pauseAfterMs"],2200)
    self.assertGreaterEqual(p["ratePercent"],-35)
    self.assertLessEqual(p["ratePercent"],20)
 def test_plain_non_editorial_phrases_still_have_semantic_splits(self):
  a=next(b for b in self.score["blocks"] if b["id"]=="04")
  self.assertGreaterEqual(len(a["phrases"]),2)
  self.assertTrue(all(p["text"] for p in a["phrases"]))
 def test_audio_missing_fails_closed(self):
  with mock.patch.object(engine,"VOICE_DIR",Path("X:/no/such/audio")):
   with self.assertRaises(FileNotFoundError):engine.compile_timeline(self.score)
 def test_fingerprint_changes_with_tempo(self):
  p=self.score["blocks"][0]["phrases"][0]
  a=engine.fingerprint(p,"voice","-8Hz")
  b=engine.fingerprint({**p,"ratePercent":p["ratePercent"]+1},"voice","-8Hz")
  self.assertNotEqual(a,b)
 def test_no_fake_breath_sound_or_music_in_score(self):
  self.assertIn("no",self.score["notes"])
  for b in self.score["blocks"]:
   self.assertFalse(any("inhale.mp3" in p["text"] for p in b["phrases"]))

 def test_generic_project_cli_and_editable_director_score(self):
  import subprocess
  import sys
  with tempfile.TemporaryDirectory(prefix="prosody-test-",dir=ROOT/"projects") as td:
   p=Path(td)
   data={"fps":30,"introFrames":15,"voice":{"narrator":"zh-CN-YunyangNeural"},
         "segments":[{"id":"01","role":"narrator","scene":"hallway","text":"他走了。灯还亮着。","overlay":"等待","reactionHoldMs":520}]}
   (p/"script.json").write_text(json.dumps(data,ensure_ascii=False),encoding="utf8")
   direction={"version":1,"blocks":{"01":{"arc":"离别与希望","chunks":[
     {"text":"他走了。","ratePercent":2,"pauseAfterMs":500,"direction":"沉静"},
     {"text":"灯还亮着。","ratePercent":-19,"pauseAfterMs":700,"direction":"留白"}]}}}
   (p/"rhythm-direction.json").write_text(json.dumps(direction,ensure_ascii=False),encoding="utf8")
   run=subprocess.run([sys.executable,str(FILE),"--script",str(p/"script.json"),"--score-only"],
     capture_output=True,text=True,timeout=12)
   self.assertEqual(run.returncode,0,run.stderr)
   score=json.loads((p/"rhythm-score.json").read_text("utf8"))
   self.assertEqual(score["fps"],30)
   self.assertEqual(score["introFrames"],15)
   self.assertEqual([x["ratePercent"] for x in score["blocks"][0]["phrases"]],[2,-19])
   self.assertEqual(score["blocks"][0]["reactionHoldMs"],520)

if __name__=="__main__":unittest.main()