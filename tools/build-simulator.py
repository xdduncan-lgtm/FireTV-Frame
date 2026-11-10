"""Builds simulator.html: a single file with the TV app embedded. Run after changing the web app."""
import base64, pathlib
root = pathlib.Path(__file__).resolve().parent.parent
web = root / "app/src/main/assets/web"
html = (web / "index.html").read_text(encoding="utf-8")
html = html.replace('<link rel="stylesheet" href="styles.css">', "<style>\n" + (web / "styles.css").read_text(encoding="utf-8") + "\n</style>")
html = html.replace('<script src="app.js"></script>', "<script>\n" + (web / "app.js").read_text(encoding="utf-8") + "\n</script>")
b64 = base64.b64encode(html.encode("utf-8")).decode("ascii")
tpl = (root / "tools/simulator-template.html").read_text(encoding="utf-8")
(root / "simulator.html").write_text(tpl.replace("__APP_B64__", b64), encoding="utf-8")
print("simulator.html built,", len(b64) // 1024, "KB of app embedded")
