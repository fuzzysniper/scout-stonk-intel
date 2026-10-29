"""Full actual-tree package tests plus cross-component native SQL/TLS proof."""
import pathlib
import subprocess
import unittest


class FinalCompositionRegression(unittest.TestCase):
    def test_combined_package_bridge_producer_off(self):
        root = pathlib.Path(__file__).resolve().parents[2]
        result = subprocess.run(["bash", "tests/v4-final/run.sh"], cwd=root,
                                capture_output=True, text=True, timeout=240, check=False)
        print(result.stdout, end="")
        self.assertEqual(result.returncode, 0, result.stderr + result.stdout[-16000:])
