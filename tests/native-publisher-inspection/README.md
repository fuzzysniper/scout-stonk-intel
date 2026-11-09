# One owner-started GET-only inspection

Dependent on installed publisher `370f15cc29901e3d1d267273d09993a3283d7dd4`.
This adds inspection to the registered workflow, not a new registered workflow.
The new CI workflow has no dispatch or environment secrets. Its dependent draft
targets the preserved diagnostics input ref; installation fast-forwards only the
separate rehearsal ref after exact-head CI. Main, #291, the
publisher, original gates and original failed run remain unchanged.

After exact-head tests/CI and a verified fast-forward installation, the owner
manually opens **Native pilot admission** / **Run workflow** and selects:

- Branch: `native-pilot/review-rehearsal` (verify installed SHA).
- `mode`: `inspection`.
- `approved_sha`: the exact tested installed commit SHA.
- `deployment`: EMPTY.

Approve ONLY the `inspection` job in `native-pilot-review-rehearsal` after checking
its actual new run/SHA. Suggested review comment:
`INSPECT_NATIVE_METADATA_READ_ONLY_ONCE <actual-run-ID> <installed-SHA>`.
No variable, publication or provider permission is created. Both publisher jobs
are skipped, and the inspection job has only Contents/Actions/Deployments READ.
GitHub can create its normal environment-job deployment/status metadata; those
platform records are permitted and differ from explicit publisher POSTs. This
code has no POST/mutation transport and imports no publisher or application code.
No real run or actual token was used during offline verification.

The existing environment token is bound ONLY to the final inspection step,
after checkout/setup and synthetic regressions. It is never read/exported by an
agent, written to disk, printed or uploaded. There is no new token setup. Saved
setup/source rules are read, never modified. No dispatch is performed by the agent.

Read bounds: fixed api.github.com repository/run/SHA/environment endpoints;
2500ms/request, 60s total, <=50 requests, <=256KiB/256 chunks/response,
20 rows/page, <=3 pages per deployment/status history, <=12 deployments.
Links are validated, never followed as arbitrary URLs. No redirects or retries.
Denied/404/rate-limited/timed-out/malformed/incomplete reads are categorical HOLD,
not proof of absent objects. An expired original artifact is not required:
original historical Git tree/source bytes and reviewed artifact pins reconstruct
the canonical original manifest; only its match/hash is reported.

The JSON log/step summary reports environment IDs/protection comparison, original
run/approval, canonical variable match/hash, bounded record/status classifications
and digests. It does not expose response bodies, variable contents, tokens or
arbitrary errors/URLs. An explicit task with wrong payload and ambiguous/truncated
history HOLD. `deploy` alone is not proof of an automatic record; an exact original
failed-job URL is required for the job-linked nonpublisher category. Run-only links
remain ambiguous. COMPLETE_READ_ONLY is metadata inspection, never successful
rehearsal/admission or live acceptance. Historical POST attempts/root cause can
remain UNKNOWN even when all visible records have been reconciled. GitHub pages
are a bounded observation, not an atomic snapshot or proof against prior deletion;
partial page observations are retained if a later read fails.

On HOLD or uncertain execution: preserve all records, STOP; no rerun, cleanup,
variable deletion, token replacement or permission expansion without new approval.
All sources/setup/native SQL and existing signed lanes remain OFF/unchanged.
