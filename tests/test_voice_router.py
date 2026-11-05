"""Motion Lab voice provider safeguards: no inference/network needed."""
import json
import subprocess
import sys
import unittest
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
CLI=ROOT/"scripts/voice-library/voice_router.py"
def run(*args):
    return subprocess.run([sys.executable,str(CLI),*args],capture_output=True,text=True,timeout=12)

class VoiceRouterTests(unittest.TestCase):
    def test_catalog_has_voice_and_provenance(self):
        result=run("--list")
        self.assertEqual(result.returncode,0,result.stderr)
        data=json.loads(result.stdout)
        self.assertGreaterEqual(len(data["voices"]),27)
        self.assertTrue(any(d["id"]=="Parler-TTS / LibriTTS-R Speaker Descriptions" for d in data["datasets"]))
        gated=next(d for d in data["datasets"] if d["id"]=="WenetSpeech4TTS")
        self.assertIn("NONCOMMERCIAL",gated["license"])
    def test_bad_project_name_rejected(self):
        r=run("--text","Hello","--project","../outside")
        self.assertNotEqual(r.returncode,0)
        self.assertIn("safe folder slug",r.stderr)
    def test_qwen_cantonese_unapproved(self):
        r=run("--engine","qwen","--language","Cantonese","--text","大家好")
        self.assertNotEqual(r.returncode,0)
        self.assertIn("not accepted",r.stderr)
    def test_qwen_unverified_tempo_control_rejected(self):
        r=run("--engine","qwen","--language","Chinese","--text","你好","--rate","+12%")
        self.assertNotEqual(r.returncode,0)
        self.assertIn("no verified",r.stderr)
    def test_unknown_voice_not_cloned(self):
        r=run("--engine","qwen","--voice","Celebrity-Unknown","--text","Hello")
        self.assertNotEqual(r.returncode,0)
        self.assertIn("Unknown Qwen preset",r.stderr)
    def test_empty_text_rejected(self):
        r=run("--text","  ")
        self.assertNotEqual(r.returncode,0)
        self.assertIn("1-180",r.stderr)
if __name__=="__main__":unittest.main()
