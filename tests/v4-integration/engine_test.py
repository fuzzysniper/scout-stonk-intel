"""Actual A/B/C bridge and exact-source guards in existing root test discovery."""
import pathlib
import subprocess
import unittest


class V4AssemblyRegression(unittest.TestCase):
    def test_source_off_combined_contracts(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-integration/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])
