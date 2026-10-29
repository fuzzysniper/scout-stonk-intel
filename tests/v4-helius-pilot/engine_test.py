"""Execute the actual mock-only pilot code through unchanged root discovery."""
import pathlib
import subprocess
import unittest


class V4HeliusPilotRegression(unittest.TestCase):
    def test_source_disabled_pilot(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-helius-pilot/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=180, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])
