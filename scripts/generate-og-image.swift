import Foundation
import AppKit

let width = 1200
let height = 630

let svgString = """
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 630" width="1200" height="630">
  <defs>
    <!-- Background Gradient -->
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0B0F19" />
      <stop offset="50%" stop-color="#0F172A" />
      <stop offset="100%" stop-color="#1E1B4B" />
    </linearGradient>

    <!-- Radial Glows -->
    <radialGradient id="purpleGlow" cx="20%" cy="30%" r="50%">
      <stop offset="0%" stop-color="#8B5CF6" stop-opacity="0.3" />
      <stop offset="100%" stop-color="#8B5CF6" stop-opacity="0" />
    </radialGradient>
    <radialGradient id="pinkGlow" cx="85%" cy="80%" r="50%">
      <stop offset="0%" stop-color="#EC4899" stop-opacity="0.25" />
      <stop offset="100%" stop-color="#EC4899" stop-opacity="0" />
    </radialGradient>

    <!-- Mascot Gradients -->
    <radialGradient id="skyGrad" cx="50%" cy="50%" r="50%" fx="30%" fy="30%">
      <stop offset="0%" stop-color="#EFF6FF" />
      <stop offset="100%" stop-color="#BAE6FD" />
    </radialGradient>
    <linearGradient id="sunGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FDE047" />
      <stop offset="50%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#F59E0B" />
    </linearGradient>
    <linearGradient id="rayGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#FBBF24" />
      <stop offset="100%" stop-color="#D97706" />
    </linearGradient>
    <linearGradient id="hatGrad" x1="0%" y1="0%" x2="0%" y2="100%">
      <stop offset="0%" stop-color="#D97706" />
      <stop offset="100%" stop-color="#92400E" />
    </linearGradient>
    <linearGradient id="leafGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#34D399" />
      <stop offset="100%" stop-color="#059669" />
    </linearGradient>

    <!-- Card Shadow Filter -->
    <filter id="cardShadow" x="-10%" y="-10%" width="120%" height="120%">
      <feDropShadow dx="0" dy="12" stdDeviation="24" flood-color="#000000" flood-opacity="0.5" />
    </filter>
  </defs>

  <!-- Dark Background -->
  <rect width="1200" height="630" fill="url(#bgGrad)" />

  <!-- Ambient Glows -->
  <rect width="1200" height="630" fill="url(#purpleGlow)" />
  <rect width="1200" height="630" fill="url(#pinkGlow)" />

  <!-- Subtle Border Frame -->
  <rect x="24" y="24" width="1152" height="582" rx="28" fill="none" stroke="#334155" stroke-width="1.5" stroke-opacity="0.6" />

  <!-- Mascot Container Card on the Left -->
  <g transform="translate(80, 115)">
    <!-- Mascot Backdrop Card -->
    <rect x="0" y="0" width="400" height="400" rx="36" fill="#1E293B" fill-opacity="0.6" stroke="#475569" stroke-width="2" filter="url(#cardShadow)" />
    
    <!-- Mascot SVG Group scaled to fit -->
    <g transform="translate(0, 0) scale(0.78125)">
      <!-- Circular Backdrop -->
      <circle cx="256" cy="256" r="210" fill="url(#skyGrad)" />

      <!-- Sun Rays -->
      <g stroke="url(#rayGrad)" stroke-width="26" stroke-linecap="round" opacity="0.95">
        <line x1="256" y1="56" x2="256" y2="86" />
        <line x1="356" y1="83" x2="339" y2="109" />
        <line x1="431" y1="156" x2="405" y2="173" />
        <line x1="456" y1="256" x2="426" y2="256" />
        <line x1="431" y1="356" x2="405" y2="339" />
        <line x1="356" y1="429" x2="339" y2="403" />
        <line x1="256" y1="456" x2="256" y2="426" />
        <line x1="156" y1="429" x2="173" y2="403" />
        <line x1="81" y1="356" x2="107" y2="339" />
        <line x1="56" y1="256" x2="86" y2="256" />
        <line x1="81" y1="156" x2="107" y2="173" />
        <line x1="156" y1="83" x2="173" y2="109" />
      </g>

      <!-- Sun Face Base Circle -->
      <circle cx="256" cy="268" r="148" fill="url(#sunGrad)" stroke="#D97706" stroke-width="8" />

      <!-- Rosy Kawaii Cheeks -->
      <circle cx="196" cy="308" r="22" fill="#FB7185" opacity="0.75" />
      <circle cx="316" cy="308" r="22" fill="#FB7185" opacity="0.75" />

      <!-- Big Eyes -->
      <g fill="#1E293B">
        <ellipse cx="206" cy="268" rx="14" ry="19" />
        <circle cx="202" cy="260" r="6" fill="#FFFFFF" />
        <circle cx="211" cy="274" r="2.5" fill="#FFFFFF" />
        <ellipse cx="306" cy="268" rx="14" ry="19" />
        <circle cx="302" cy="260" r="6" fill="#FFFFFF" />
        <circle cx="311" cy="274" r="2.5" fill="#FFFFFF" />
      </g>

      <!-- Smile -->
      <path d="M 230 300 Q 256 332 282 300" stroke="#78350F" stroke-width="7" stroke-linecap="round" fill="#DC2626" />
      <path d="M 238 308 Q 256 324 274 308" fill="#F87171" opacity="0.9" />

      <!-- Safari Hat -->
      <path d="M 180 186 C 180 120 332 120 332 186 Z" fill="url(#hatGrad)" stroke="#78350F" stroke-width="7" />
      <path d="M 236 128 C 256 142 256 142 276 128" stroke="#78350F" stroke-width="5" stroke-linecap="round" fill="none" />
      <path d="M 176 178 C 220 188 292 188 336 178 L 336 190 C 292 200 220 200 176 190 Z" fill="#047857" stroke="#064E3B" stroke-width="4" />
      <ellipse cx="256" cy="188" rx="92" ry="24" fill="#B45309" stroke="#78350F" stroke-width="6" />

      <!-- Sprout Leaf -->
      <path d="M 314 140 C 330 110 370 116 364 144 C 344 148 326 150 314 140 Z" fill="url(#leafGrad)" stroke="#047857" stroke-width="4" />
      <path d="M 334 142 C 348 130 356 126 360 124" stroke="#A7F3D0" stroke-width="2.5" stroke-linecap="round" fill="none" />
      <path d="M 306 148 C 314 126 336 124 336 146 Z" fill="url(#leafGrad)" stroke="#047857" stroke-width="3" />
    </g>
  </g>

  <!-- Typography and Info Section on Right -->
  <g transform="translate(530, 130)">
    <!-- Pill Category Header -->
    <rect x="0" y="0" width="370" height="36" rx="18" fill="#7C3AED" fill-opacity="0.2" stroke="#8B5CF6" stroke-width="1.5" />
    <text x="18" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="700" fill="#DDD6FE" letter-spacing="1.5">✨ SAN FRANCISCO BAY AREA</text>

    <!-- Main Title -->
    <text x="0" y="115" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="64" font-weight="900" fill="#FFFFFF" letter-spacing="-1">Little Days Out</text>

    <!-- Tagline -->
    <text x="0" y="165" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="24" font-weight="600" fill="#A5B4FC">Curated Kids Activities &amp; Family Events</text>

    <!-- Description -->
    <text x="0" y="215" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="#94A3B8">Discover weekend festivals, library storytimes, museum</text>
    <text x="0" y="243" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="18" font-weight="400" fill="#94A3B8">outings, and outdoor adventures filtered by age and region.</text>

    <!-- Feature Badges -->
    <g transform="translate(0, 285)">
      <!-- Badge 1: Ages -->
      <rect x="0" y="0" width="125" height="38" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
      <text x="16" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">👶 Ages 0-12+</text>

      <!-- Badge 2: Map -->
      <rect x="135" y="0" width="135" height="38" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
      <text x="151" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">🗺️ Map &amp; Filters</text>

      <!-- Badge 3: Free Outings -->
      <rect x="280" y="0" width="140" height="38" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
      <text x="296" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">🎉 Free Outings</text>

      <!-- Badge 4: Weekly Updates -->
      <rect x="430" y="0" width="145" height="38" rx="12" fill="#1E293B" stroke="#334155" stroke-width="1.5" />
      <text x="446" y="24" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="14" font-weight="600" fill="#E2E8F0">📅 Daily Updates</text>
    </g>

    <!-- Canonical URL Footer -->
    <text x="0" y="375" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="16" font-weight="700" fill="#6366F1">🔗 www.littledaysout.com</text>
  </g>
</svg>
"""

guard let data = svgString.data(using: .utf8),
      let image = NSImage(data: data) else {
    fputs("Error: Failed to load SVG\n", stderr)
    exit(1)
}

let rep = NSBitmapImageRep(bitmapDataPlanes: nil,
                            pixelsWide: width,
                            pixelsHigh: height,
                            bitsPerSample: 8,
                            samplesPerPixel: 4,
                            hasAlpha: true,
                            isPlanar: false,
                            colorSpaceName: .deviceRGB,
                            bytesPerRow: 0,
                            bitsPerPixel: 0)!

NSGraphicsContext.saveGraphicsState()
NSGraphicsContext.current = NSGraphicsContext(bitmapImageRep: rep)
image.draw(in: NSRect(x: 0, y: 0, width: width, height: height))
NSGraphicsContext.restoreGraphicsState()

guard let pngData = rep.representation(using: .png, properties: [:]) else {
    fputs("Error: Failed to create PNG representation\n", stderr)
    exit(1)
}

let outputPath = "/Users/ericlam/projects/elam03/kids-activity-scraper/public/og-image.png"
do {
    try pngData.write(to: URL(fileURLWithPath: outputPath))
    print("Successfully generated \(outputPath) (\(width)x\(height))")
} catch {
    fputs("Error writing PNG file: \(error)\n", stderr)
    exit(1)
}
