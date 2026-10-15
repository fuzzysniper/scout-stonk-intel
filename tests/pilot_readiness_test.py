"""Inactive permission proposal only; applies to a disposable tree, never live config."""
import pathlib
import subprocess
import tempfile
import unittest
ROOT = pathlib.Path(__file__).resolve().parents[1]

class PilotProposalTests(unittest.TestCase):
    def test_permission_proposal_only_adds_actions_read_and_keeps_all_sources_gated_by_existing_conditions(self):
        path = pathlib.Path('.github/workflows/reward-snapshots.yml')
        original = (ROOT/path).read_text()
        self.assertEqual(original.split('permissions:\n',1)[1].split('concurrency:',1)[0], '  contents: write\n')
        with tempfile.TemporaryDirectory() as folder:
            root = pathlib.Path(folder)
            (root/path).parent.mkdir(parents=True)
            (root/path).write_text(original)
            result = subprocess.run(['git','apply',str(ROOT/'docs/proposals/68-collector-actions-read.patch')],cwd=root,capture_output=True)
            self.assertEqual(result.returncode,0)
            candidate = (root/path).read_text()
            self.assertEqual(candidate,original.replace('permissions:\n  contents: write\n','permissions:\n  contents: write\n  actions: read\n',1))
        self.assertEqual((ROOT/path).read_text(),original)

if __name__ == '__main__': unittest.main()
