#!/usr/bin/env python3
"""No-network integration tests for cinematic-video-director project/shotlist helpers."""
import json
import tempfile
import unittest
from pathlib import Path
from init_project import create
from validate_plan import validate
from route_project import blank_route, check, recommend_route

class SkillTests(unittest.TestCase):
    def setUp(self):
        self.temp=tempfile.TemporaryDirectory(prefix="motion-lab-skill-")
        self.addCleanup(self.temp.cleanup)
        self.root=Path(self.temp.name)

    def test_scaffold_creates_isolated_plan_and_manifest(self):
        project=create("alpha-01","测试电影",duration=48,fps=24,bpm=96,root=self.root)
        self.assertTrue((project/"brief.md").is_file())
        self.assertTrue((project/"assets-manifest.json").is_file())
        self.assertTrue((project/"production-route.json").is_file())
        self.assertEqual(json.loads((project/"production-route.json").read_text())["audio_engine"],"edge")
        self.assertTrue((self.root/"public/alpha-01/3d").is_dir())
        plan=json.loads((project/"shotlist.json").read_text())
        self.assertEqual(plan["total_frames"],1152)
        self.assertEqual(plan["shots"][0]["start_frame"],0)
        self.assertEqual(plan["shots"][-1]["end_frame"],1152)
        self.assertFalse(validate(project/"shotlist.json","draft"))

    def test_no_overwrite(self):
        create("alpha-01","测试",root=self.root)
        with self.assertRaises(FileExistsError):
            create("alpha-01","新版本",root=self.root)

    def test_invalid_slug(self):
        with self.assertRaises(ValueError):
            create("../unsafe","测试",root=self.root)

    def test_final_cannot_pass_with_placeholders(self):
        project=create("alpha-01","测试",root=self.root)
        self.assertTrue(validate(project/"shotlist.json","final"))

    def test_gap_rejected(self):
        project=create("alpha-01","测试",root=self.root)
        file=project/"shotlist.json"
        obj=json.loads(file.read_text())
        obj["shots"][1]["start_frame"]+=3
        file.write_text(json.dumps(obj,ensure_ascii=False))
        self.assertTrue(any("空洞" in msg for msg in validate(file)))

    def test_no_still_for_required_continuous_3d(self):
        project=create("alpha-01","测试",root=self.root)
        file=project/"shotlist.json"
        obj=json.loads(file.read_text())
        obj["shots"][3]["source_kind"]="3d_still"
        file.write_text(json.dumps(obj,ensure_ascii=False))
        self.assertTrue(any("不能用静帧" in msg for msg in validate(file)))

    def test_photo_real_human_drama_routes_to_footage_first(self):
        route=recommend_route("human_drama","photoreal_live_action","central","none")
        self.assertEqual(route,"footage_first")

    def test_licensed_actor_footage_routes_to_hybrid(self):
        self.assertEqual(recommend_route("human_drama","photoreal_live_action","central","licensed_available"),"hybrid")

    def test_stylized_story_kept_in_motion_lab(self):
        self.assertEqual(recommend_route("stylized_story","stylized_cgi","central","none"),"motion_lab_native")
        self.assertEqual(recommend_route("human_drama","stylized_cgi","central","none"),"motion_lab_native")

    def test_product_cgi_is_native(self):
        self.assertEqual(recommend_route("product_cgi","product_cgi","none","none"),"motion_lab_native")

    def test_no_external_paid_authorization_in_scaffold(self):
        self.assertFalse(blank_route()["external_generation_authorized"])

    def test_invalid_route_prevents_final_claim(self):
        p=create("alpha-02","真实古装短片",root=self.root)
        path=p/"production-route.json"
        data=blank_route()
        data.update(content_kind="human_drama",visual_target="photoreal_live_action",
                    human_performance="central",existing_footage="none",
                    route="motion_lab_native",rationale="错用简化CG",audio_engine="edge")
        self.assertTrue(any("footage_first" in e for e in check(data)))
        path.write_text(json.dumps(data,ensure_ascii=False))
        self.assertTrue(any("production-route" in e for e in validate(p/"shotlist.json","final")))

    def test_story_scaffold_does_not_force_product_reveal_or_cgi(self):
        project=create("story-01","聊斋故事",root=self.root,genre="story")
        plan=json.loads((project/"shotlist.json").read_text())
        self.assertEqual(plan["genre"],"story")
        self.assertEqual(plan["shots"][0]["role"],"establish")
        self.assertFalse(any(s["role"]=="proof" for s in plan["shots"]))
        self.assertFalse(any(s["source_kind"]=="full_3d_motion" for s in plan["shots"]))
        self.assertEqual(len(plan["shots"]),6)

    def test_education_scaffold_uses_explanation_not_sales(self):
        project=create("edu-01","科普",root=self.root,genre="education")
        plan=json.loads((project/"shotlist.json").read_text())
        self.assertEqual(plan["genre"],"education")
        self.assertEqual(plan["shots"][-1]["role"],"recap")
        self.assertTrue(all(s["source_kind"]=="ui_motion" for s in plan["shots"]))

    def test_reject_unknown_genre(self):
        with self.assertRaises(ValueError):
            create("wrong-genre","错误",root=self.root,genre="cinema")

if __name__=="__main__":
    unittest.main(verbosity=2)
