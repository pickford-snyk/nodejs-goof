# Snyk Architecture in GitLab Pipelines

This document describes two approaches for implementing Snyk in Gitlab pipelines, along with more general consideration.

---

## Considerations

- [Architecture Approaches](#architecture)
- [Centralized or distributed implementation](#centralized-or-distributed)
- [Snyk products](#snyk-products)
- [Coverage](#coverage)
- [Gating](#gating-considerations)
- [GitLab subscription](#gitlab-subscription)
- [Snyk authentication](#snyk-authentication)

---

## Overview

Snyk scans require build toolchains. There are two approaches to including the correct tool chain: 

1. **Using a Snyk distributed image with the toolchain**  
  - Use a [Snyk distributed image](https://hub.docker.com/r/snyk/snyk) in the CI template. 
  - Hardcode the image name, set up project/group variables or manage logic to auto detect and select the appropriate image.

2. **Installing the Snyk CLI in the build image**  
  - The CLI is installed into the proejct's default build image. 

---

## Approach 1: Snyk images

**Pros**
- No install step in the pipeline; images are ready to run `snyk test`.
- Potentially more consistent behavior across repos; consistent images and CLI versions.

**Cons**
- Potential mismatch between repo needs and image toolchains. 
- Additional build time spinning up container with tool chain

### 1a. Image from variable

The template uses a variable (e.g. `SNYK_SCAN_IMAGE`) with a default. Each repo or group sets the variable so the right image runs.

**Template example: `snyk-security-scan.yml`**

```yaml
stages:
  - .pipeline-policy-pre
  - test

.appsec-snyk-test:
  stage: .pipeline-policy-pre
  image: ${SNYK_SCAN_IMAGE}
  script:
    - snyk test
```

Repos can provide `SNYK_SCAN_IMAGE` variables in a [variety of ways](https://docs.gitlab.com/ee/ci/variables/#cicd-variable-precedence)

---

### 1b. Image set manually in repo YAML

The template still uses a variable with a default (as in 1a). The repo **explicitly** sets the image (or the variable) in its own `.gitlab-ci.yml` so the choice is in code and reviewable.

**Option 1 – global variables after the include:**

```yaml
include:
  - project: 'appsec-group/ci-templates'
    ref: main
    file: 'snyk-security-scan.yml'

variables:
  SNYK_SCAN_IMAGE: snyk/snyk:maven
```

**Option 2 – override only the Snyk job:**

```yaml
include:
  - project: 'appsec-group/ci-templates'
    ref: main
    file: 'snyk-security-scan.yml'

appsec-snyk-test:
  variables:
    SNYK_SCAN_IMAGE: snyk/snyk:maven
```

---

### 1c. Auto-detection 

The template defines **one job per ecosystem**, each with the right Snyk image and `rules: exists:` on that ecosystem’s manifest files. GitLab runs only the job(s) whose paths exist. No variable and no repo-specific image config are needed.

**Template example: `snyk-security-scan-auto.yml`**

```yaml
stages:
  - .pipeline-policy-pre
  - test

.appsec-snyk-test-node:
  stage: .pipeline-policy-pre
  image: snyk/snyk:node
  script:
    - snyk test
  rules:
    - if:
      exists:
        - package.json

.appsec-snyk-test-maven:
  stage: .pipeline-policy-pre
  image: snyk/snyk:maven
  script:
    - snyk test
  rules:
    - if:
      exists:
        - pom.xml
```
---

## Approach 2: Snyk CLI installed on the build image

The scan runs in the **project’s build image**. The template’s `before_script` installs the Snyk CLI. 

```yaml
.appsec-snyk-test:
  stage: .pipeline-policy-pre
  before_script:
    - apt-get update -qq && apt-get install -y -qq curl
    - curl -sSfL https://downloads.snyk.io/cli/stable/snyk-linux -o /usr/local/bin/snyk
    - chmod +x /usr/local/bin/snyk
  script:
    - snyk test 
```

## Consideration details

### Centralized or distributed

Decide whether configuration of the Snyk tests need to be managed centrally or should be managed by each repo's pipeline owner. 

Centralized control makes it harder for projects to skip or weaken scans. However, a centralized platform or AppSec team may increase friction trying to match or understand a repository's needs. Distributed installations give teams more flexibility but are hard to enforce strict configurations.

### Snyk products

Different Snyk products require different commands and produce different outputs (e.g. `snyk test` for Open Source, `snyk code test` for code analysis, `snyk container test` for images). Your template and gating logic should match the product(s) you use and how you want to consume results (e.g. SARIF, JSON, or exit code only).

### Coverage

Repository and application coverage will need to be defined and then confirmed and/or enforced. A common approach might be using Gitlab policies to scan protected branches. 

#### Example running only on protected branches

1. Every implementaiton will need to decide what builds should be covered. An example might be to run scans on protected branches:

```yaml
rules:
  - if: $CI_COMMIT_REF_PROTECTED == "true"
```

2. [Pipeline Execution Policies](https://docs.gitlab.com/user/application_security/policies/pipeline_execution_policies/) can be used to insert a policy at the appropriate stage.

### Gating considerations

Snyk's tools have broad flexibility with gating: from strict (fail on any vuln above a severity) to softer (report only, or fail only on new vulns). Choose a level that fits your risk tolerance and rollout strategy. 

A common approach is to do a report only on highs and criticals. Then communicate a timeline to development teams when harder gating will be implemented, giving them time to identify and fix where they might be blocked

#### Gating Options (fail pipeline on vulnerabilities)

| Method | Use case |
|--------|----------|
| **`--severity-threshold=low\|medium\|high\|critical`** | Fail if any vuln at or above that severity exists. |
| **`snyk-filter`** | [Custom criteria](https://docs.snyk.io/developer-tools/snyk-cli/scan-and-maintain-projects-using-the-cli/cli-tools/snyk-filter) (e.g. CVSS ≥ 8). |

Example:

```yaml
script:
  - snyk test --severity-threshold=high
```