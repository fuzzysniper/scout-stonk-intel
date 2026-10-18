import { boundedReader, newAdmission, type Dependencies } from "./reader-core";
/** Test-only seam: mandatory injected transport, every source explicitly synthetic. Not re-exported. */
export function syntheticReader(dependencies: Omit<Dependencies, "acquisition">) {
  return boundedReader({ ...dependencies, acquisition: "synthetic_fixture" }, newAdmission());
}
