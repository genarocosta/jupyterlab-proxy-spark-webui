A [JupyterLab](https://jupyterlab.readthedocs.io) extension that adds a **Spark UI**
menu entry to the menu bar. When clicked, it verifies that Apache Spark is running on
port 4040 and opens the Spark jobs page as an embedded JupyterLab tab — no extra browser
tab needed.

[![PyPI version](https://img.shields.io/pypi/v/jupyterlab-spark-webui)](https://pypi.org/project/jupyterlab-spark-webui/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://github.com/genarocosta/jupyterlab-proxy-spark-webui/blob/main/LICENSE)

---

## Requirements

| Dependency | Version |
|------------|---------|
| JupyterLab | ≥ 4.0 |
| [jupyter-server-proxy](https://github.com/jupyterhub/jupyter-server-proxy) | ≥ 4.0 |
| Python | ≥ 3.8 |

---

## Installation

```bash
pip install jupyterlab-spark-webui
```

JupyterLab discovers the extension automatically — no extra `jupyter labextension install` step needed.

### Verify

```bash
jupyter labextension list
# jupyterlab-spark-webui v0.1.0 enabled OK
```

---

## Usage

1. Start a Spark session from a notebook (this starts the Spark UI on port 4040):

   ```python
   from pyspark.sql import SparkSession
   spark = SparkSession.builder.appName("MyApp").getOrCreate()
   ```

2. Click **Spark UI** in the JupyterLab menu bar (between *Tabs* and *Settings*).

3. Click **Open Spark UI**.

| Situation | Result |
|-----------|--------|
| Spark is running on port 4040 | Spark jobs page opens as a JupyterLab tab |
| Spark is not running | Dialog: *"No Spark found (port 4040)."* |

The extension resolves the proxy URL from the current page path and is fully
compatible with **JupyterHub** deployments at any base URL prefix
(e.g. `/notebook/<namespace>/<name>/lab`).

---

## How it works

```
Browser (JupyterLab)
    │
    │  HEAD /notebook/ns/nb/proxy/4040/jobs/
    ▼
jupyter-server-proxy  ──►  localhost:4040  (Spark UI)
```

On click the extension:
1. Derives the proxy base path from `window.location.pathname` using the
   pattern `…/lab` → `…/proxy/4040/jobs/`.
2. Fires a `HEAD` request to verify Spark is reachable (`200–299` = up).
3. Opens an `IFrame` widget inside JupyterLab's main area — or shows an
   error dialog if Spark is not responding.

---

## Uninstallation

```bash
pip uninstall jupyterlab-spark-webui
```

---

## Development

See the [repository README](https://github.com/genarocosta/jupyterlab-proxy-spark-webui#development)
for the full development setup, build instructions, and PyPI publishing guide.

---

## License

[MIT](https://github.com/genarocosta/jupyterlab-proxy-spark-webui/blob/main/LICENSE) ©
[Genaro Costa](mailto:genaro@carvalhocosta.net)
