"""
jupyterlab-spark-webui: frontend-only JupyterLab extension.

Declares this package as a pure labextension so Jupyter does not attempt
to load it as a server-side ExtensionApp (which would raise:
  "This extension doesn't have any static paths listed").
"""
from pathlib import Path


def _jupyter_labextension_paths():
    """Return metadata for the installed labextension."""
    return [
        {
            "src": str(Path(__file__).parent / "labextension"),
            "dest": "jupyterlab-spark-webui",
        }
    ]
