#!/usr/bin/env python3
"""
Regenerate marketing screenshots with fixed overlay layout (no text collision).
ARMOR at top of overlay, headline below, subhead at bottom — all separated.
Uses existing final images as base, but clears the overlay region first.
"""

from PIL import Image, ImageDraw, ImageFont
import os

# Paths
FINAL_DIR = os.path.expanduser("~/Shift6/store-assets/screenshots/final")

# Color constants
COLOR_BG = (2, 6, 23)       # Dark navy background
COLOR_CYAN = (6, 182, 212)  # #06b6d4
COLOR_WHITE = (255, 255, 255)
COLOR_SLATE_300 = (203, 213, 225)  # slate-300

# Layout constants (for iPhone 6.7" at 1290×2796)
OVERLAY_FRACTION = 0.45  # bottom 45%
ARMOR_MARGIN_TOP = 60    # from start of overlay region
HEADLINE_MARGIN_TOP = 80 # below ARMOR
SUBHEAD_MARGIN_TOP = 40  # below headline

# Text sizes (adjusted to fit within available width)
ARMOR_ICON_SIZE = 60
ARMOR_WORD_SIZE = 60
HEADLINE_SIZE = 90       # reduced from 130 to fit width
SUBHEAD_SIZE = 45        # reduced from 64 to fit width

# Text positions (x offset from left edge)
TEXT_X = 80
ICON_X = 40

# Scale factors for other devices
SCALE_6_5 = 0.96      # iPhone 6.5" (1242×2688)
SCALE_IPAD = 1.59     # iPad (2048×2732)

# Device configs
DEVICES = [
    {
        "name": "iphone6.7",
        "width": 1290,
        "height": 2796,
        "scale": 1.0,
        "screenshots": ["onboarding", "dashboard", "workout"],
    },
    {
        "name": "iphone6.5",
        "width": 1242,
        "height": 2688,
        "scale": SCALE_6_5,
        "screenshots": ["onboarding", "dashboard", "workout"],
    },
    {
        "name": "ipad",
        "width": 2048,
        "height": 2732,
        "scale": SCALE_IPAD,
        "screenshots": ["onboarding", "dashboard", "workout"],
    },
]

def load_font(font_path, size):
    """Load a font at given size."""
    try:
        return ImageFont.truetype(font_path, size)
    except Exception:
        return ImageFont.load_default()

def get_font(size):
    """Get appropriate font for given size."""
    sf_font = "/System/Library/Fonts/SFNS.ttf"
    helvetica = "/System/Library/Fonts/Helvetica.ttc"
    if os.path.exists(sf_font):
        return load_font(sf_font, size)
    return load_font(helvetica, size)

def scale_value(val, scale):
    """Scale a value by the given scale factor."""
    return int(val * scale)

def create_gradient_image(width, height):
    """Create a vertical gradient image (transparent at top, opaque dark navy at bottom)."""
    img = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)
    
    for y in range(height):
        # Linear gradient: alpha 0 at top, alpha 255 at bottom
        alpha = int(255 * y / (height - 1)) if height > 1 else 255
        draw.line([(0, y), (width, y)], fill=(COLOR_BG[0], COLOR_BG[1], COLOR_BG[2], alpha))
    
    return img

def add_text_overlay(draw, overlay_top, scale, screenshot_type):
    """Add all text elements to the overlay region."""
    s = scale
    
    # Scale dimensions
    armor_margin = scale_value(ARMOR_MARGIN_TOP, s)
    headline_margin = scale_value(HEADLINE_MARGIN_TOP, s)
    subhead_margin = scale_value(SUBHEAD_MARGIN_TOP, s)
    
    icon_size = scale_value(ARMOR_ICON_SIZE, s)
    word_size = scale_value(ARMOR_WORD_SIZE, s)
    headline_size = scale_value(HEADLINE_SIZE, s)
    subhead_size = scale_value(SUBHEAD_SIZE, s)
    
    text_x = scale_value(TEXT_X, s)
    icon_x = scale_value(ICON_X, s)
    
    # Get fonts
    icon_font = get_font(icon_size)
    word_font = get_font(word_size)
    headline_font = get_font(headline_size)
    subhead_font = get_font(subhead_size)
    
    # Y positions
    y_icon = overlay_top + armor_margin
    y_word = overlay_top + armor_margin
    y_headline = y_icon + icon_size + headline_margin
    y_subhead = y_headline + headline_size + subhead_margin
    
    # Draw ⚔ icon
    draw.text((icon_x, y_icon), "⚔", font=icon_font, fill=COLOR_CYAN)
    
    # Draw "ARMOR" wordmark
    draw.text((text_x, y_word), "ARMOR", font=word_font, fill=COLOR_CYAN)
    
    # Headline and subhead depend on screenshot type
    if screenshot_type == "onboarding":
        headline = "SET UP IN 5 SECONDS"
        subhead = "No accounts. No friction. Pick a track,\nget default weights, start training."
    elif screenshot_type == "dashboard":
        headline = "6-WEEK PERIODIZATION"
        subhead = "Base → Volume → Heavy → Peak → Deload.\nThe cycle that builds strength."
    elif screenshot_type == "workout":
        headline = "REAL-TIME PROGRESSION"
        subhead = "Watch your IRM climb week over week.\nEvery rep counts toward your peak."
    else:
        headline = "SHIFT6"
        subhead = "Your personalized fitness journey."
    
    # Draw headline (white)
    draw.text((text_x, y_headline), headline, font=headline_font, fill=COLOR_WHITE)
    
    # Draw subhead (slate-300)
    draw.text((text_x, y_subhead), subhead, font=subhead_font, fill=COLOR_SLATE_300)

def regenerate_screenshot(device_name, screenshot_type, final_path):
    """Regenerate a single screenshot with fixed overlay."""
    print(f"  Processing {device_name}-{screenshot_type}...")
    
    # Determine scale
    if device_name == "iphone6.7":
        scale = 1.0
    elif device_name == "iphone6.5":
        scale = SCALE_6_5
    elif device_name == "ipad":
        scale = SCALE_IPAD
    else:
        scale = 1.0
    
    # Open existing final image
    if os.path.exists(final_path):
        base_img = Image.open(final_path).convert("RGBA")
        width, height = base_img.size
    else:
        print(f"    ERROR: {final_path} not found, skipping")
        return None
    
    # Calculate overlay region (bottom 45%)
    overlay_height = int(height * OVERLAY_FRACTION)
    overlay_top = height - overlay_height
    
    # Step 1: Create a clean base - keep only the top portion (above overlay)
    top_portion = base_img.crop((0, 0, width, overlay_top))
    
    # Create new image with dark background
    clean_base = Image.new("RGBA", (width, height), (*COLOR_BG, 255))
    clean_base.paste(top_portion, (0, 0))
    
    # Step 2: Create gradient overlay for bottom 45%
    gradient = create_gradient_image(width, overlay_height)
    
    # Step 3: Create overlay layer (gradient + text)
    overlay_layer = Image.new("RGBA", (width, height), (0, 0, 0, 0))
    overlay_layer.paste(gradient, (0, overlay_top))
    
    # Add text to overlay layer
    draw = ImageDraw.Draw(overlay_layer)
    add_text_overlay(draw, overlay_top, scale, screenshot_type)
    
    # Step 4: Composite clean_base + overlay
    final_img = Image.alpha_composite(clean_base, overlay_layer)
    
    # Step 5: Convert to RGB and save
    final_rgb = Image.new("RGB", (width, height), COLOR_BG)
    final_rgb.paste(final_img, (0, 0), final_img)
    
    final_rgb.save(final_path, "PNG", optimize=True)
    
    size_kb = os.path.getsize(final_path) / 1024
    print(f"    Saved: {final_path} ({width}×{height}, {size_kb:.1f} KB)")
    
    return final_path, (width, height), size_kb

def main():
    """Regenerate all 9 marketing screenshots."""
    print("=" * 60)
    print("Regenerating marketing screenshots with fixed overlay layout")
    print("=" * 60)
    
    results = []
    
    for device in DEVICES:
        device_name = device["name"]
        for screenshot_type in device["screenshots"]:
            final_filename = f"{device_name}-{screenshot_type}.png"
            final_path = os.path.join(FINAL_DIR, final_filename)
            
            result = regenerate_screenshot(device_name, screenshot_type, final_path)
            if result:
                path, dims, size_kb = result
                results.append({
                    "file": final_filename,
                    "path": path,
                    "dimensions": dims,
                    "size_kb": size_kb
                })
    
    print("\n" + "=" * 60)
    print("SUMMARY")
    print("=" * 60)
    for r in results:
        status = "✓" if r["size_kb"] < 5000 else "⚠ large"
        print(f"  {status} {r['file']}: {r['dimensions'][0]}×{r['dimensions'][1]}, {r['size_kb']:.1f} KB")
    
    print("\nAll screenshots regenerated successfully!")
    return results

if __name__ == "__main__":
    main()