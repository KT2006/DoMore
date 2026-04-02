from __future__ import annotations

from typing import Any, Callable, Optional
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

from scraper.captcha import handle_captcha
from scraper.session_manager import create_session, terminate_all_sessions
from scraper.utils import (
    BASE_URL,
    LoginError,
    SessionExpiredError,
    debug_save_html,
    extract_login_error_message,
    find_captcha_image_tag,
    html_snippet,
    looks_logged_in,
    parse_login_form,
    request_with_retries,
)


def _log_step(debug: bool, step: str, resp: requests.Response, body_html: str | None = None) -> None:
    print(f"  → {step}: {resp.status_code}")
    print(f"  → Response URL: {resp.url}")
    if debug and body_html is not None:
        print(f"  → HTML snippet: {html_snippet(body_html, 500)}")


def _is_block_sessions(resp: requests.Response) -> bool:
    return "block-sessions" in (resp.url or "").lower() or "block-sessions" in resp.text.lower()


def _handle_captcha_for_login(
    *,
    session: requests.Session,
    resp_html: str,
    captcha_callback: Optional[Callable[[bytes], str]],
) -> tuple[str, Any | None]:
    img_tag = find_captcha_image_tag(resp_html)
    if img_tag is None:
        return "", None
    captcha_text = handle_captcha(session, img_tag, captcha_callback=captcha_callback)
    return captcha_text, img_tag


def login(
    email: str,
    password: str,
    *,
    captcha_callback: Optional[Callable[[bytes], str]] = None,
    debug: bool = False,
    max_retries: int = 3,
) -> requests.Session:
    """
    Phase 1 auth: login with CAPTCHA using Zoho's JSON APIs. 
    Follows cross-domain handoff to generate app cookies.
    """
    import time
    session = create_session()

    for attempt in range(max_retries):
        print(f"\n[Attempt {attempt + 1}/{max_retries}] Starting login...")
        try:
            # Step 1: GET login page
            resp1 = request_with_retries(session, "GET", BASE_URL, debug=debug)
            _log_step(debug, "GET login page", resp1, resp1.text)

            if looks_logged_in(resp1.text, resp1.url):
                return session

            # Step 2: Grab the Zoho signin iframe URL
            soup1 = BeautifulSoup(resp1.text, "html.parser")
            iframe = soup1.find("iframe", id="zohoiam") or soup1.find(
                "iframe", src=lambda s: isinstance(s, str) and "signin" in s
            )
            
            if iframe is None or not iframe.get("src"):
                path = debug_save_html(resp1.text, "no_iframe.html")
                raise LoginError(f"Could not find Zoho signin iframe. Saved: {path}")

            iframe_src = str(iframe.get("src"))
            iframe_url = urljoin(BASE_URL, iframe_src)
            resp1_iframe = request_with_retries(
                session, "GET", iframe_url, headers={"Referer": BASE_URL}, debug=debug
            )
            _log_step(debug, "GET zoho sign-in iframe", resp1_iframe, resp1_iframe.text)

            iamcsr = session.cookies.get("iamcsr")
            if not iamcsr:
                raise LoginError("Failed to acquire 'iamcsr' cookie from the signin iframe.")

            headers_api = {
                "x-zcsrf-token": f"iamcsrcoo={iamcsr}",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "*/*",
                "X-Requested-With": "XMLHttpRequest",
                "Referer": iframe_url,
            }

            # Step 3: Lookup User
            lookup_url = urljoin(BASE_URL, f"/accounts/p/40-10002227248/signin/v2/lookup/{email}")
            ts = int(time.time() * 1000)
            serviceurl = "https%3A%2F%2Facademia.srmist.edu.in%2Fportal%2Facademia-academic-services%2FredirectFromLogin"
            base_lookup_data = f"mode=primary&cli_time={ts}&servicename=ZohoCreator&service_language=en&serviceurl={serviceurl}"
            lookup_data = base_lookup_data
            
            for _ in range(2): 
                r_lookup = request_with_retries(session, "POST", lookup_url, data=lookup_data, headers=headers_api, debug=debug)
                try:
                    j_lookup = r_lookup.json()
                except Exception:
                    path = debug_save_html(r_lookup.text, "invalid_lookup.html")
                    raise LoginError(f"Lookup API did not return JSON. Saved: {path}")

                status_code = j_lookup.get("status_code")
                if status_code == 400 and j_lookup.get("message") == "HIP REQUIRED":
                    print("  ⚠ CAPTCHA required for login.")
                    cdigest = j_lookup.get("cdigest", "")
                    captcha_img_url = urljoin(BASE_URL, f"/accounts/p/40-10002227248/webclient/v1/captcha/{cdigest}")
                    captcha_text = handle_captcha(session, {"src": captcha_img_url}, captcha_callback=captcha_callback)
                    lookup_data = base_lookup_data + f"&captcha={captcha_text}&cdigest={cdigest}"
                    continue
                    
                if status_code == 201:
                    identifier = j_lookup["lookup"]["identifier"]
                    digest = j_lookup["lookup"]["digest"]
                    break
                raise LoginError(f"Lookup API failed: {j_lookup.get('message')}")
            else:
                raise LoginError("Failed to lookup user after solving CAPTCHA.")

            # Step 4: Password Auth
            pass_url = urljoin(BASE_URL, f"/accounts/p/40-10002227248/signin/v2/primary/{identifier}/password?digest={digest}&cli_time={ts}&servicename=ZohoCreator&service_language=en&serviceurl={serviceurl}")
            pass_data = f'{{"passwordauth":{{"password":"{password}"}}}}'
            headers_pass = {**headers_api, "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8"}
            
            print("  → POST JSON API /password")
            r_pass = request_with_retries(session, "POST", pass_url, data=pass_data, headers=headers_pass, debug=debug)
            
            try:
                j_pass = r_pass.json()
            except Exception:
                path = debug_save_html(r_pass.text, "invalid_password.html")
                raise LoginError(f"Password API did not return JSON. Saved: {path}")

            if j_pass.get("status_code") == 435 or "concurrent" in j_pass.get("message", "").lower():
                print("  ⚠ Session limit exceeded! Terminating all sessions...")
                ok = terminate_all_sessions(session, r_pass)
                if not ok:
                    print("  ✗ Terminate-all-sessions failed; retrying login...")
                continue
                
            if j_pass.get("status_code") != 201:
                raise LoginError(f"Password API failed: {j_pass.get('message')}")

            # Step 5: Follow redirect handoff to acquire IAM application cookies!
            redirect_uri = j_pass.get("passwordauth", {}).get("redirect_uri")
            if redirect_uri:
                if "block-sessions" in redirect_uri.lower() or "sessions-reminder" in redirect_uri.lower():
                    print("  ⚠ Session limit exceeded (via redirect_uri)! Terminating all sessions...")
                    r_block = request_with_retries(session, "GET", redirect_uri, headers={"Referer": iframe_url}, debug=debug)
                    if debug:
                        debug_save_html(r_block.text, f"block_sessions_page_{attempt + 1}.html")
                    ok = terminate_all_sessions(session, r_block)
                    if not ok:
                        print("  ✗ Terminate-all-sessions failed; retrying login...")
                    continue
                elif "relogin" in redirect_uri.lower():
                    print("  ⚠ Re-verification (relogin) required! Fetching relogin page...")
                    r_relogin = request_with_retries(session, "GET", redirect_uri, headers={"Referer": iframe_url}, debug=debug)
                    if debug:
                        debug_save_html(r_relogin.text, f"relogin_step1_{attempt + 1}.html")
                    
                    soup_relogin = BeautifulSoup(r_relogin.text, "html.parser")
                    forms = soup_relogin.find_all("form")
                    if not forms:
                        print("  ✗ Relogin form not found.")
                    else:
                        form = forms[0]
                        action = form.get("action") or ""
                        action_url = urljoin(redirect_uri, action)
                        payload = {}
                        for inp in form.find_all("input"):
                            name = inp.get("name")
                            if not name: continue
                            val = inp.get("value", "")
                            if inp.get("type") == "password" or "password" in name.lower():
                                val = password
                            payload[name] = val
                            
                        print(f"  → POSTing password to {action_url}")
                        r_relogin_post = request_with_retries(
                            session, "POST", action_url, data=payload, 
                            headers={"Referer": redirect_uri, "Content-Type": "application/x-www-form-urlencoded"}, 
                            debug=debug
                        )
                        if debug:
                            debug_save_html(r_relogin_post.text, f"relogin_step2_{attempt + 1}.html")
                        
                        redirect_uri = r_relogin_post.url
                        if looks_logged_in(r_relogin_post.text, r_relogin_post.url):
                            print("  ✓ Login successful (via relogin)!")
                            return session
                    
                print(f"  → GET handoff redirect_uri: {redirect_uri}")
                # We do not send AJAX headers for the handoff! It is a top-level jump to set cookies.
                r_redir = request_with_retries(session, "GET", redirect_uri, headers={"Referer": iframe_url}, debug=debug)
                if debug:
                    debug_save_html(r_redir.text, f"handoff_attempt{attempt + 1}.html")
            else:
                print("  ⚠ No redirect_uri provided in success payload.")

            print("  ✓ Login successful!")
            return session

        except SessionExpiredError:
            if debug:
                print("  ↻ Session expired while logging in; retrying login...")
            continue

    raise LoginError(f"Failed to login after maximum retries ({max_retries}).")

