/* TEST ONLY: PostgreSQL process wall-clock fault injection. No system clock change.
 * CLOCK_MONOTONIC/deadlines are untouched. Only the isolated test harness loads it. */
#define _GNU_SOURCE
#include <sys/time.h>
#include <dlfcn.h>
#include <stdio.h>
#include <stdlib.h>
int gettimeofday(struct timeval *tv, void *tz) {
  static int (*real_gettimeofday)(struct timeval *, void *);
  if (!real_gettimeofday) real_gettimeofday = dlsym(RTLD_NEXT, "gettimeofday");
  int result = real_gettimeofday(tv, tz);
  const char *path = getenv("UNFARMD_TEST_CLOCK_FILE");
  if (result == 0 && path) {
    FILE *file = fopen(path, "r"); long offset = 0;
    if (file) { if (fscanf(file, "%ld", &offset) != 1) offset = 0; fclose(file); }
    if (offset >= 0 && offset <= 3600) tv->tv_sec += offset;
  }
  return result;
}
