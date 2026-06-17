from pathlib import Path
text = Path("/opt/traefik/dynamic/routers.yml").read_text()

# Find armor-security block
start = text.find("armor-security:")
assert start > 0
# Find the end of the headers block (next non-indented line)
end_marker = "\n  routers:\n"
end = text.find(end_marker, start)
assert end > 0
block = text[start:end]

# Check if CSP already set
if "contentSecurityPolicy" in block:
    print("CSP already set")
    raise SystemExit(0)

# Append CSP at the end of the block
csp_line = "        contentSecurityPolicy: \"default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https://sync.getshift6.com; frame-ancestors 'none'; form-action 'self'; base-uri 'self'\"\n"
new_block = block.rstrip("\n") + "\n" + csp_line
text = text[:start] + new_block + text[end:]

Path("/opt/traefik/dynamic/routers.yml").write_text(text)
print("CSP added")
