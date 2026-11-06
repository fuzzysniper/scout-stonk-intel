# Publisher diagnostics — dependent code-only review, HARD OFF

Parent: `0a5abd56faa4fbb7aa0049f0207d139a23c051f6` on the separately installed
`native-pilot/review-rehearsal` branch. This draft changes neither that ref nor
main. No manual workflow run, mutable variable, token or metadata record is
installed, changed, retried or removed. It authorizes no later execution.

## Failed-run reconciliation, 2026-11-06

Run [42293408658](https://github.com/fuzzysniper/scout-stonk-intel/actions/runs/42293408658),
publish job 128152513109, remains completed/failure/attempt 1 at the parent SHA.
Context and artifact succeeded. The genuine owner review is exactly
`REHEARSE_NATIVE_REVIEW_ONCE a7da74bfb34d14c04de8412053ca5d26f308785511188115a292268efb331032 42293408658`.
Environment 26506985994 reports `can_admins_bypass:false` in that approval object.
The actual job received Actions read, Contents read, Deployments write and
Metadata read; masked read-secret presence does not prove its validity/scope.

The source hashes, actual artifact ID 13541200379/digest
`5b2552bdb08748cc08dd72310f2c288cba31c47e61babbefc488bab8be2a2747`, SHA/tree and
run ID reconstruct the exact approved manifest hash. This is not a raw ZIP hash
recomputation or proof of the private variable's saved bytes.

Fresh read-only deployment/variable reads are rejected by the connector URL
allowlist before GitHub. Its managed executor exposes no approved alternate
credential binding. Do not interpret this as a GitHub permission failure, missing
variable, missing deployment or proof that no POST occurred. **Incident cause and
explicit publication outcome remain UNKNOWN.** The established defect is that
all failures collapse into one HOLD, including after accepted writes/lost ACKs.

Before any separately approved execution, use an approved metadata-READ binding
to enumerate ALL tasks at this exact SHA/environment, then each relevant status
history (100 rows/page, at most two pages; more pages or failed reads => HOLD).
Retain every automatic/explicit/uncertain record. Match automatic records to the
actual Actions job, not task name alone. The publisher's explicit task is
`native-pilot-review-rehearsal:42293408658`, protocol
`native-pilot-approval-rehearsal/1`, manifest hash above, admissionEligible:false,
nonproduction/transient, expected Actions bot. Compare the original nonsecret
repository variable byte-for-byte with the actual canonical manifest. No Secrets
value, token replacement, deletion, repair, inactive status or retry is required.
No matching persisted row after complete enumeration still does not prove zero
attempted POSTs. Even matching success metadata cannot turn the failed run into
completed success or native admission.

## Correction

Only fixed phase/category names, sanitized numeric HTTP status, `activate:false`
and two write states are emitted to stderr. Concurrent GET failures retain their
own phase. Transport failures distinguish binding, HTTP, TLS, network, timeout,
pagination, headers, size, framing and JSON; no raw exception/message/stack,
header, request/response body, variable value, token, URL, run or deployment ID is
added to diagnostic records. Existing success output and generic HOLD are kept.

`not_started` means the writer path was not entered; `started_unconfirmed` is
set BEFORE requesting the write and remains after denial/lost ACK/timeout;
`acknowledged` follows the existing response checks. A rejected create contract
remains conservative/uncertain. Successful create does not imply successful
status. No state is reset and no retry is added.

Intent records are best-effort Actions stderr, **not durable admission state or
a write-ahead journal**. There is no existing safe durable intent store here.
Sink failure has no fallback I/O and changes no authorization/network behavior;
absent logs never prove no attempt. Diagnostics confer no permission/capability.
All old predicates, identity/policy/payload/allowlist helpers, timeout=1200ms,
retry=0, TLS verification, source-OFF gates and legacy code are retained.

## Offline verification

```sh
bash tests/native-publisher-diagnostics/run.sh
bash tests/native-publisher-diagnostics/scope.sh # full exact-head checkout/CI
```

The 38 original packet cases remain with only their import path changed. New
tests compare request traces, decisions, accepted synthetic server rows and old
stdout against immutable Git blob d969ce8e33ca4ad7b043de3c9d0f17a1dc273102
(SHA-256 6f342a4a7b4e73e41c7ebb4b6fcc2b9e74f00b3f702cb22f1db5e487f3605f60).
Only temporary test exports expose private publish/context functions; function
bodies are unchanged by the test loader. API responses and credentials are
explicitly synthetic; HTTPS is simulated, not sent. Tests cover 0/1/2 POSTs,
accepted writes/lost acknowledgements, read/write timeouts, denied reads, malformed
variables, TLS, immutable guards, concurrent phase classification, redaction,
hostile errors, sink failure, import purity and no retry.

Focused CI runs on this dependent PR only, with contents:read, no environments,
secrets, dispatch, deployment permissions, database or provider. It checks exact
head scope, types, lint, a network-guarded production build and archive invariants.
Existing workflows/tests are unchanged. Only this new draft branch is added to
the existing Vercel Git suppression map. Local full-clone/build execution was
blocked by the executor's unavailable proxy and full /workspace disk; full-root
validation must be reported from actual exact-head CI, never inferred locally.

## Review and rollback

Owner approval is required for this draft, any future installation, and any
future execution independently. Do not rerun the failed run or reuse its approval
or manifest after a source/workflow hash changes. The installed publisher remains
unchanged. Before any installation, abandoning this branch is the code rollback;
it does not remove/rewrite any historical metadata, variable, source budget,
permanent STOP, counter or uncertain attempt. No UI work/screenshots apply.
