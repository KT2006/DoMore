from __future__ import annotations

import os
import subprocess
import sys
from typing import Any, Callable, Optional
from urllib.parse import urljoin

import requests

from scraper.utils import BASE_URL, ensure_dirs


def extract_img_src(img_element: Any) -> str:
    if not img_element:
        raise ValueError("Missing CAPTCHA <img> element.")
    src = img_element.get("src") if hasattr(img_element, "get") else None
    if not src:
        raise ValueError("CAPTCHA <img> tag is missing `src`.")
    return str(src)


def handle_captcha(
    session: requests.Session,
    img_element: Any,
    *,
    captcha_callback: Optional[Callable[[bytes], str]] = None,
    filename: str = "captcha.png",
) -> str:
    """
    Terminal mode:
    - download captcha image
    - save it under output/
    - open it (best-effort)
    - prompt user to type value

    Future UI mode:
    - if `captcha_callback` is provided, pass image bytes and use its returned text.
    """
    output_dir, _ = ensure_dirs()
    captcha_path = output_dir / filename

    img_src = extract_img_src(img_element)
    img_url = urljoin(BASE_URL, img_src)

    img_resp = session.get(img_url, timeout=20)
    img_resp.raise_for_status()

    captcha_bytes = img_resp.content
    captcha_path.write_bytes(captcha_bytes)

    print(f"\n  CAPTCHA image saved to: {os.path.abspath(str(captcha_path))}")

    # Keep the image if explicitly requested (useful for UI integration / debugging).
    keep = (os.getenv("SRM_KEEP_CAPTCHA") or "").lower() in {"1", "true", "yes", "on"}
    try:
        if captcha_callback is not None:
            # UI mode: let the caller decode without prompting here.
            return captcha_callback(captcha_bytes).strip()

        # Allow non-interactive runs (like CI/agents) to inject CAPTCHA.
        injected = (os.getenv("SRM_CAPTCHA") or "").strip()
        if injected:
            return injected

        # If stdin is not a TTY, avoid blocking forever waiting for human input.
        if not sys.stdin.isatty():
            raise RuntimeError(
                "CAPTCHA input required, but stdin is not interactive. "
                "Set `SRM_CAPTCHA` or run in an interactive terminal."
            )

        print("  → Open the image, read the text, and enter it below.")

        # Best-effort auto-open.
        try:
            if sys.platform == "darwin":
                subprocess.Popen(["open", str(captcha_path)])
            elif sys.platform == "linux":
                subprocess.Popen(["xdg-open", str(captcha_path)])
        except Exception:
            pass

        return input("  ⌨ Enter CAPTCHA text: ").strip()
    finally:
        if not keep:
            try:
                if captcha_path.exists():
                    captcha_path.unlink()
            except Exception:
                # Best-effort cleanup; ignore failures.
                pass

