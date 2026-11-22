"""Capturas reales de las cuatro pantallas + comprobación básica de interacciones."""
import os
from pathlib import Path
from PIL import Image, ImageDraw
from playwright.sync_api import sync_playwright

OUT = Path("screenshots")
OUT.mkdir(exist_ok=True)
BASE = os.environ.get("APP_URL", f"http://127.0.0.1:{os.environ.get('PORT', '8100')}")
errors = []


def shot(page, name):
    page.screenshot(path=str(OUT / f"{name}.png"))


with sync_playwright() as p:
    browser = p.chromium.launch(headless=True)
    page = browser.new_page(viewport={"width": 390, "height": 844}, device_scale_factor=1)
    page.on("console", lambda msg: errors.append(f"console: {msg.text}") if msg.type == "error" else None)
    page.on("pageerror", lambda err: errors.append(f"pageerror: {err}"))

    page.goto(BASE, wait_until="domcontentloaded")
    page.wait_for_selector(".tabbar")
    HIDE_TOASTS = ".toast { display: none !important; }"
    page.add_style_tag(content=HIDE_TOASTS)

    for tab in ["plan", "social", "progreso", "coach"]:
        page.locator(f'[data-tab="{tab}"]').click()
        page.wait_for_timeout(250)
        shot(page, tab)

    # Comprobación: racha semanal
    page.locator('[data-tab="progreso"]').click()
    assert page.locator('.streak-card').count() == 1, "No aparece la tarjeta de racha"

    # Vista completa de la pantalla Plan (sin la barra fija para que no tape el contenido)
    page.locator('[data-tab="plan"]').click()
    page.add_style_tag(content=".tabbar { display: none !important; }")
    page.wait_for_timeout(200)
    page.screenshot(path=str(OUT / "plan-completo.png"), full_page=True)
    page.reload(wait_until="networkidle")
    page.add_style_tag(content=HIDE_TOASTS)

    # Comprobación: sumar un alimento a Cena
    page.locator('.add-row[data-meal="cena"]').click()
    page.locator('[data-food="salmon"]').click()
    page.locator("#qty-input").fill("150")
    preview = page.locator("#qty-preview").inner_text()
    assert "312" in preview, f"Vista previa incorrecta: {preview}"
    page.locator('[data-action="confirm-food"]').click()
    assert page.get_by_text("Salmón a la plancha").first.is_visible(), "El alimento no aparece en Cena"

    # Comprobación: registrar una comida con foto
    fixture = OUT / "test-food.png"
    Image.new("RGB", (80, 80), (190, 140, 90)).save(fixture)
    page.locator('.add-row[data-meal="cena"]').click()
    page.locator('[data-action="photo-food"]').click()
    page.locator("#food-photo-input").set_input_files(str(fixture))
    page.locator("#photo-food-name").fill("Mi comida con foto")
    page.locator("#photo-food-kcal").fill("300")
    page.locator("#photo-food-p").fill("20")
    page.locator("#photo-food-c").fill("30")
    page.locator("#photo-food-g").fill("10")
    shot(page, "foto-comida")
    page.locator('[data-action="save-photo-food"]').click()
    assert page.get_by_text("Mi comida con foto").first.is_visible(), "La comida con foto no aparece en Cena"

    # Comprobación: el coach responde
    page.locator('[data-tab="coach"]').click()
    page.locator('[data-prompt="ideas para cena"]').click()
    page.wait_for_timeout(900)
    assert page.locator(".bubble.coach").count() >= 1, "El coach no respondió"
    suggestion = page.locator('[data-action="coach-apply"]')
    assert suggestion.count() >= 1, "El coach no ofreció una sugerencia aplicable"
    shot(page, "coach-sugerencia")
    suggestion.last.click()
    page.locator('[data-tab="plan"]').click()
    assert page.get_by_text("Ensalada grande").first.is_visible(), "La sugerencia del coach no se agregó al plan"

    # Comprobación: agua y cambio de día
    page.locator('[data-tab="plan"]').click()
    water_before = page.locator(".metric-chip span").inner_text()
    page.locator('[data-action="water"]').click()
    water_after = page.locator(".metric-chip span").inner_text()
    assert int(water_after) == int(water_before) + 1, "El contador de agua no aumentó"

    # Comprobación: exportar e importar datos
    page.locator('[data-action="settings"]').click()
    with page.expect_download() as download_info:
        page.locator('[data-action="export-data"]').click()
    download = download_info.value
    assert download.suggested_filename == "nutriplan-datos.json", "La exportación no generó el archivo"
    page.locator("#import-input").set_input_files(str(download.path()))
    page.wait_for_timeout(300)
    assert page.locator(".overlay").count() == 0, "La importación no cerró el diálogo"

    browser.close()

# Montaje de las cuatro pantallas en una sola imagen
names = ["plan", "social", "progreso", "coach"]
imgs = [Image.open(OUT / f"{n}.png").convert("RGB") for n in names]
w, h = imgs[0].size
canvas = Image.new("RGB", (w * len(imgs), h + 44), (12, 12, 12))
d = ImageDraw.Draw(canvas)
for i, (img, name) in enumerate(zip(imgs, names)):
    canvas.paste(img, (i * w, 44))
    d.text((i * w + 16, 16), name.upper(), fill=(255, 196, 0))
canvas.save(OUT / "app-preview.png")

# Segundo montaje: funciones nuevas en uso
improvements = ["foto-comida", "coach-sugerencia"]
imgs2 = [Image.open(OUT / f"{n}.png").convert("RGB") for n in improvements]
canvas2 = Image.new("RGB", (w * 2, h + 44), (12, 12, 12))
d2 = ImageDraw.Draw(canvas2)
for i, (img, name) in enumerate(zip(imgs2, improvements)):
    canvas2.paste(img, (i * w, 44))
    d2.text((i * w + 16, 16), name.upper().replace("-", " "), fill=(255, 196, 0))
canvas2.save(OUT / "mejoras-preview.png")

print("Capturas guardadas en", OUT.resolve())
print("Errores de consola:", errors if errors else "ninguno")
assert not errors, "Hay errores en la consola"
