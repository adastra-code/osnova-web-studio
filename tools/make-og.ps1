Add-Type -AssemblyName System.Drawing
$ErrorActionPreference = "Stop"

$out = Join-Path $PSScriptRoot "..\assets\og"
New-Item -ItemType Directory -Force -Path $out | Out-Null

$bg = [System.Drawing.Color]::FromArgb(251, 246, 238)
$brown = [System.Drawing.Color]::FromArgb(62, 51, 43)
$peach = [System.Drawing.Color]::FromArgb(217, 167, 139)
$peachDark = [System.Drawing.Color]::FromArgb(189, 129, 100)
$muted = [System.Drawing.Color]::FromArgb(139, 122, 105)
$cream = [System.Drawing.Color]::FromArgb(255, 253, 248)
$tape = [System.Drawing.Color]::FromArgb(95, 217, 167, 139)

function Draw-Cat {
  param($gfx, $x, $y, $size, $color)

  $brush = New-Object System.Drawing.SolidBrush($color)
  $cx = $x + $size / 2
  $cy = $y + $size * 0.58
  $r = $size * 0.38
  $gfx.FillEllipse($brush, $cx - $r, $cy - $r, 2 * $r, 2 * $r)

  $earLeft = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(($cx - $r * 0.92), ($cy - $r * 0.55))),
    (New-Object System.Drawing.PointF(($cx - $r * 1.08), ($cy - $r * 1.55))),
    (New-Object System.Drawing.PointF(($cx - $r * 0.18), ($cy - $r * 1.02)))
  )
  $earRight = [System.Drawing.PointF[]]@(
    (New-Object System.Drawing.PointF(($cx + $r * 0.92), ($cy - $r * 0.55))),
    (New-Object System.Drawing.PointF(($cx + $r * 1.08), ($cy - $r * 1.55))),
    (New-Object System.Drawing.PointF(($cx + $r * 0.18), ($cy - $r * 1.02)))
  )
  $gfx.FillPolygon($brush, $earLeft)
  $gfx.FillPolygon($brush, $earRight)

  $eyePen = New-Object System.Drawing.Pen($cream, [Math]::Max(2, $size * 0.025))
  $eyePen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $eyePen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $gfx.DrawArc($eyePen, $cx - $r * 0.55, $cy - $r * 0.16, $r * 0.38, $r * 0.26, 20, 140)
  $gfx.DrawArc($eyePen, $cx + $r * 0.17, $cy - $r * 0.16, $r * 0.38, $r * 0.26, 20, 140)

  $nosePen = New-Object System.Drawing.Pen($cream, [Math]::Max(2, $size * 0.02))
  $gfx.DrawLine($nosePen, $cx, $cy + $r * 0.22, $cx - $r * 0.12, $cy + $r * 0.36)
  $gfx.DrawLine($nosePen, $cx, $cy + $r * 0.22, $cx + $r * 0.12, $cy + $r * 0.36)

  $whiskerPen = New-Object System.Drawing.Pen($color, [Math]::Max(1.5, $size * 0.015))
  $whiskerPen.StartCap = [System.Drawing.Drawing2D.LineCap]::Round
  $whiskerPen.EndCap = [System.Drawing.Drawing2D.LineCap]::Round
  $gfx.DrawLine($whiskerPen, $cx - $r * 0.95, $cy + $r * 0.15, $cx - $r * 1.55, $cy + $r * 0.02)
  $gfx.DrawLine($whiskerPen, $cx - $r * 0.95, $cy + $r * 0.32, $cx - $r * 1.55, $cy + $r * 0.42)
  $gfx.DrawLine($whiskerPen, $cx + $r * 0.95, $cy + $r * 0.15, $cx + $r * 1.55, $cy + $r * 0.02)
  $gfx.DrawLine($whiskerPen, $cx + $r * 0.95, $cy + $r * 0.32, $cx + $r * 1.55, $cy + $r * 0.42)
}

function New-OgImage {
  param([string]$File, [string]$Title, [string]$Subtitle, [string]$Tag)

  $w = 1200
  $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $gfx = [System.Drawing.Graphics]::FromImage($bmp)
  $gfx.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $gfx.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit
  $gfx.Clear($bg)

  $circleBrush = New-Object System.Drawing.SolidBrush($peach)
  $gfx.FillEllipse($circleBrush, 885, 78, 245, 245)
  Draw-Cat $gfx 915 96 185 $brown

  $tapeBrush = New-Object System.Drawing.SolidBrush($tape)
  $gfx.FillRectangle($tapeBrush, 72, 48, 92, 24)

  $logoFont = New-Object System.Drawing.Font("Segoe UI", 26, [System.Drawing.FontStyle]::Bold)
  $brownBrush = New-Object System.Drawing.SolidBrush($brown)
  $gfx.DrawString("ОСНОВА.", $logoFont, $brownBrush, 186, 44)
  $tagFont = New-Object System.Drawing.Font("Consolas", 13)
  $peachBrush = New-Object System.Drawing.SolidBrush($peachDark)
  $gfx.DrawString($Tag.ToUpper(), $tagFont, $peachBrush, 188, 82)

  $titleFont = New-Object System.Drawing.Font("Segoe UI", 46, [System.Drawing.FontStyle]::Bold)
  $maxWidth = 760
  $words = $Title -split " "
  $lines = @()
  $line = ""
  foreach ($word in $words) {
    $candidate = if ($line.Length -eq 0) { $word } else { "$line $word" }
    $size = $gfx.MeasureString($candidate, $titleFont)
    if ($size.Width -gt $maxWidth -and $line.Length -gt 0) {
      $lines += $line
      $line = $word
    } else {
      $line = $candidate
    }
  }
  if ($line.Length -gt 0) { $lines += $line }

  $y = 190
  foreach ($textLine in $lines) {
    $gfx.DrawString($textLine, $titleFont, $brownBrush, 78, $y)
    $y += 60
  }

  $subFont = New-Object System.Drawing.Font("Segoe UI", 20)
  $mutedBrush = New-Object System.Drawing.SolidBrush($muted)
  $gfx.DrawString($Subtitle, $subFont, $mutedBrush, 80, ($y + 18))

  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(45, 62, 51, 43), 1)
  $gfx.DrawLine($linePen, 80, 548, 1120, 548)
  $smallFont = New-Object System.Drawing.Font("Consolas", 14)
  $gfx.DrawString("osnova.studio", $smallFont, $brownBrush, 80, 566)
  $gfx.DrawString("уютная веб-студия · Москва", $smallFont, $mutedBrush, 780, 566)

  $bmp.Save((Join-Path $out $File), [System.Drawing.Imaging.ImageFormat]::Png)
  $gfx.Dispose()
  $bmp.Dispose()
}

New-OgImage "home.png" "Сайты, которые приносят заявки" "Стратегия, дизайн и разработка — бережно и с любовью к деталям" "уютная веб-студия"
New-OgImage "services.png" "Услуги веб-студии" "Сайты, магазины, SEO и поддержка — в одном тёплом месте" "услуги"
New-OgImage "razrabotka-saytov.png" "Разработка сайтов" "Корпоративные сайты, лендинги и B2B-порталы" "услуга · разработка"
New-OgImage "internet-magazin.png" "Интернет-магазины" "Каталог, оплата, доставка и интеграция с 1С" "услуга · e-commerce"
New-OgImage "seo-prodvizhenie.png" "SEO-продвижение" "Техническая база, семантика и контент" "услуга · seo"
New-OgImage "podderzhka-sayta.png" "Поддержка сайтов" "Мониторинг, обновления и бережное развитие" "услуга · поддержка"
New-OgImage "cases.png" "Кейсы с цифрами" "Заявки, трафик и конверсия до и после" "портфолио"
New-OgImage "severny-potok.png" "Северный поток" "+62% заявок за 6 месяцев" "кейс · b2b"
New-OgImage "flora-market.png" "Flora Market" "+38% конверсии в заказ" "кейс · e-commerce"
New-OgImage "lab-7.png" "Лаборатория 7" "×3 заявок за 8 месяцев" "кейс · медицина"
New-OgImage "about.png" "О студии ОСНОВА" "Команда, принципы и процессы" "студия"
New-OgImage "blog.png" "Блог ОСНОВА" "Разработка, SEO и скорость без воды" "блог"
New-OgImage "contacts.png" "Обсудим проект" "Ответим в течение рабочего дня" "контакты"

$icon = New-Object System.Drawing.Bitmap(180, 180)
$ig = [System.Drawing.Graphics]::FromImage($icon)
$ig.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ig.Clear($bg)
$ig.FillEllipse((New-Object System.Drawing.SolidBrush($peach)), 22, 22, 136, 136)
Draw-Cat $ig 42 40 96 $brown
$icon.Save((Join-Path $PSScriptRoot "..\assets\apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ig.Dispose()
$icon.Dispose()

Write-Output "Cozy OG images done"
