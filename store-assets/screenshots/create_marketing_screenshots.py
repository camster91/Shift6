#!/usr/bin/env python3
"""
Create marketing screenshots for Shift6 fitness app.
Adds overlay text, gradient, wordmark to raw app captures.
"""
import os
import sys
from PIL import Image, ImageDraw, ImageFont

# Color constants
DARK_BG = (2, 6, 23)
CYAN = (6, 182, 212)  # #06b6d4
WHITE = (255, 255, 255)
SLATE_300 = (203, 213, 225)  # ~slate-300

# Paths
RAW_DIR = os.path.expanduser("~/Shift6/store-assets/screenshots/raw")
FINAL_DIR = os.path.expanduser("~/Shift6/store-assets/screenshots/final")

os.makedirs(FINAL_DIR, exist_ok=True)

# Target dimensions
SIZES = {
    "iphone67": {"width": 1290, "height": 2796, "headline": 88, "sub": 42, "padding": 80},
    "iphone65": {"width": 1242, "height": 2688, "headline": 85, "sub": 40, "padding": 75},
    "ipad": {"width": 2048, "height": 2732, "headline": 110, "sub": 52, "padding": 100},
}

# Screenshots configuration
SCREENSHOTS = [
    {
        "raw": "iphone6.7-01-onboarding-raw.png",
        "name": "onboarding",
        "headline": "SET UP IN 5 SECONDS",
        "sub": "No accounts. No friction. Pick a track, get default weights, start training.",
    },
    {
        "raw": "iphone6.7-02-dashboard-raw.png",
        "name": "dashboard",
        "headline": "6-WEEK PERIODIZATION",
        "sub": "Base → Volume → Heavy → Peak → Deload. The cycle that builds strength, automatically.",
    },
    {
        "raw": "iphone6.7-03-workout-raw.png",
        "name": "workout",
        "headline": "TRAIN THROUGH CHAOS",
        "sub": "Rest timer, plate math, and contingency protocols. Built for days that don't go to plan.",
    },
]

def load_font(size, bold=True):
    """Load system font, fallback to default."""
    if bold:
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
        ]
    else:
        font_paths = [
            "/System/Library/Fonts/Helvetica.ttc",
            "/Library/Fonts/Arial.ttf",
        ]
    
    for path in font_paths:
        if os.path.exists(path):
            try:
                return ImageFont.truetype(path, size)
            except:
                pass
    
    # Fallback to default
    return ImageFont.load_default()

def create_gradient_overlay(img_width, img_height, overlay_height_pct=0.40):
    """Create a vertical gradient from dark to transparent."""
    overlay_height = int(img_height * overlay_height_pct)
    gradient = Image.new("RGBA", (img_width, overlay_height), (0, 0, 0, 0))
    draw = ImageDraw.Draw(gradient)
    
    for y in range(overlay_height):
        # Gradient from rgba(2,6,23,0.85) at bottom to transparent at top
        alpha = int(255 * 0.85 * (1 - y / overlay_height))
        draw.line([(0, y), (img_width, y)], fill=(DARK_BG[0], DARK_BG[1], DARK_BG[2], alpha))
    
    return gradient

def add_overlay_to_screenshot(raw_path, output_path, size_config):
    """Add marketing overlay to a screenshot."""
    # Open and resize raw image to target dimensions
    with Image.open(raw_path) as img:
        # Raw is 430x932 (iPhone 14 Pro Max viewport)
        # Resize to target while maintaining aspect
        raw_w, raw_h = img.size
        target_w = size_config["width"]
        target_h = size_config["height"]
        
        # Scale to fit width, then crop/pad to target height
        scale = target_w / raw_w
        scaled_h = int(raw_h * scale)
        
        img_resized = img.resize((target_w, scaled_h), Image.LANCZOS)
        
        # Create new canvas at target size with dark background
        canvas = Image.new("RGBA", (target_w, target_h), (10, 18, 32, 255))
        
        # Paste resized image centered (top-aligned, centered horizontally)
        paste_x = 0
        paste_y = 0
        canvas.paste(img_resized, (paste_x, paste_y))
        
        # Create gradient overlay
        gradient = create_gradient_overlay(target_w, target_h, overlay_height_pct=0.42)
        
        # Paste gradient at bottom
        gradient_y = target_h - gradient.height
        canvas.paste(gradient, (0, gradient_y), gradient)
        
        draw = ImageDraw.Draw(canvas)
        
        # Text positioning
        padding = size_config["padding"]
        text_bottom = target_h - padding
        headline_size = size_config["headline"]
        sub_size = size_config["sub"]
        
        # Load fonts
        headline_font = load_font(headline_size, bold=True)
        sub_font = load_font(sub_size, bold=False)
        
        # Measure text widths
        bbox = draw.textbbox((0, 0), "SHIFT6", font=headline_font)
        armor_w = bbox[2] - bbox[0]
        sword = "⚔"
        sword_bbox = draw.textbbox((0, 0), sword, font=headline_font)
        sword_w = sword_bbox[2] - sword_bbox[0]
        
        # Wordmark: ⏩ SHIFT6 with cyan accent line
        accent_bar_height = 4
        accent_bar_width = 60
        accent_y = text_bottom - headline_size - 20
        
        # Draw accent bar
        draw.rectangle(
            [padding, accent_y, padding + accent_bar_width, accent_y + accent_bar_height],
            fill=CYAN
        )
        
        # Draw fast-forward + SHIFT6 wordmark
        wordmark_y = accent_y - headline_size - 10
        draw.text((padding, wordmark_y), sword, fill=CYAN, font=headline_font)
        draw.text((padding + sword_w + 5, wordmark_y), "SHIFT6", fill=WHITE, font=headline_font)
        
        # Draw headline
        headline_y = wordmark_y - headline_size - 15
        draw.text((padding, headline_y), "SET UP IN 5 SECONDS" if "SET UP" in open(raw_path).read() else size_config.get("headline_text", ""), fill=WHITE, font=headline_font)
        
        # We need to pass the actual headline text
        return canvas

def process_all():
    """Process all screenshots for all sizes."""
    
    for shot in SCREENSHOTS:
        raw_path = os.path.join(RAW_DIR, shot["raw"])
        
        for size_name, size_config in SIZES.items():
            # Create the marketing screenshot
            img = create_marketing_screenshot(raw_path, size_config, shot["headline"], shot["sub"])
            
            # Generate output filename
            if size_name == "iphone67":
                prefix = f"iphone6.7-{shot['name']}"
            elif size_name == "iphone65":
                prefix = f"iphone6.5-{shot['name']}"
            else:
                prefix = f"ipad-{shot['name']}"
            
            output_path = os.path.join(FINAL_DIR, f"{prefix}.png")
            img.save(output_path, "PNG", optimize=True)
            
            # Check file size
            size_kb = os.path.getsize(output_path) / 1024
            w, h = img.size
            print(f"Created: {os.path.basename(output_path)} ({w}x{h}, {size_kb:.1f}KB)")

def create_marketing_screenshot(raw_path, size_config, headline, sub):
    """Create a marketing screenshot with overlay."""
    with Image.open(raw_path) as img:
        raw_w, raw_h = img.size
        target_w = size_config["width"]
        target_h = size_config["height"]
        
        # Scale to fit width
        scale = target_w / raw_w
        scaled_h = int(raw_h * scale)
        
        img_resized = img.resize((target_w, scaled_h), Image.LANCZOS)
        
        # Create canvas
        canvas = Image.new("RGBA", (target_w, target_h), (10, 18, 32, 255))
        canvas.paste(img_resized, (0, 0))
        
        # Create gradient overlay
        gradient = create_gradient_overlay(target_w, target_h, overlay_height_pct=0.42)
        gradient_y = target_h - gradient.height
        canvas.paste(gradient, (0, gradient_y), gradient)
        
        draw = ImageDraw.Draw(canvas)
        
        padding = size_config["padding"]
        headline_size = size_config["headline"]
        sub_size = size_config["sub"]
        
        # Fonts
        headline_font = load_font(headline_size, bold=True)
        sub_font = load_font(sub_size, bold=False)
        
        # Measure wordmark
        bbox_h = draw.textbbox((0, 0), "SHIFT6", font=headline_font)
        armor_w = bbox_h[2] - bbox_h[0]
        bbox_s = draw.textbbox((0, 0), "⚔", font=headline_font)
        sword_w = bbox_s[2] - bbox_s[0]
        
        # Accent bar
        accent_y = target_h - padding - 200
        accent_bar_width = 70
        draw.rectangle(
            [padding, accent_y, padding + accent_bar_width, accent_y + 5],
            fill=CYAN
        )
        
        # Wordmark line: ⏩ SHIFT6
        wordmark_y = accent_y - headline_size - 15
        draw.text((padding, wordmark_y), "⚔", fill=CYAN, font=headline_font)
        draw.text((padding + sword_w + 8, wordmark_y), "SHIFT6", fill=WHITE, font=headline_font)
        
        # Headline
        headline_y = wordmark_y - headline_size - 20
        draw.text((padding, headline_y), headline, fill=WHITE, font=headline_font)
        
        # Subhead
        sub_y = headline_y + headline_size + 15
        
        # Word wrap sub text
        max_sub_width = target_w - (padding * 2)
        wrapped_sub = wrap_text(sub, sub_font, max_sub_width, draw)
        
        for i, line in enumerate(wrapped_sub):
            draw.text((padding, sub_y + (i * (sub_size + 10))), line, fill=SLATE_300, font=sub_font)
        
        return canvas

def wrap_text(text, font, max_width, draw):
    """Simple word wrap for subhead text."""
    words = text.split()
    lines = []
    current_line = ""
    
    for word in words:
        test_line = current_line + (" " if current_line else "") + word
        bbox = draw.textbbox((0, 0), test_line, font=font)
        if bbox[2] - bbox[0] <= max_width:
            current_line = test_line
        else:
            if current_line:
                lines.append(current_line)
            current_line = word
    
    if current_line:
        lines.append(current_line)
    
    return lines

if __name__ == "__main__":
    process_all()