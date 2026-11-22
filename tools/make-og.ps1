Add-Type -AssemblyName System.Drawing

$out = Join-Path $PSScriptRoot "..\assets\og"
New-Item -ItemType Directory -Force -Path $out | Out-Null

function New-OgImage {
  param(
    [string]$File,
    [string]$Title,
    [string]$Subtitle,
    [string]$Tag
  )

  $w = 1200
  $h = 630
  $bmp = New-Object System.Drawing.Bitmap($w, $h)
  $g = [System.Drawing.Graphics]::FromImage($bmp)
  $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
  $g.TextRenderingHint = [System.Drawing.Text.TextRenderingHint]::AntiAliasGridFit

  $bg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 13, 12))
  $g.FillRectangle($bg, 0, 0, $w, $h)

  $gridPen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(18, 244, 242, 235), 1)
  for ($x = 0; $x -lt $w; $x += 88) { $g.DrawLine($gridPen, $x, 0, $x, $h) }
  for ($y = 0; $y -lt $h; $y += 88) { $g.DrawLine($gridPen, 0, $y, $w, $y) }

  $lime = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(201, 247, 79))
  $white = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(244, 242, 235))
  $gray = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(170, 176, 165))
  $dim = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(120, 126, 117))

  $g.FillRectangle($lime, 72, 70, 8, 116)

  $logoFont = New-Object System.Drawing.Font("Segoe UI", 30, [System.Drawing.FontStyle]::Bold)
  $g.DrawString("ОСНОВА", $logoFont, $white, 100, 60)

  $tagFont = New-Object System.Drawing.Font("Consolas", 15)
  $g.DrawString($Tag.ToUpper(), $tagFont, $lime, 100, 112)

  $titleFont = New-Object System.Drawing.Font("Segoe UI", 50, [System.Drawing.FontStyle]::Bold)
  $maxWidth = 1010
  $words = $Title -split " "
  $lines = @()
  $line = ""
  foreach ($word in $words) {
    $candidate = if ($line.Length -eq 0) { $word } else { "$line $word" }
    $size = $g.MeasureString($candidate, $titleFont)
    if ($size.Width -gt $maxWidth -and $line.Length -gt 0) {
      $lines += $line
      $line = $word
    } else {
      $line = $candidate
    }
  }
  if ($line.Length -gt 0) { $lines += $line }

  $y = 205
  foreach ($textLine in $lines) {
    $g.DrawString($textLine, $titleFont, $white, 96, $y)
    $y += 66
  }

  $subFont = New-Object System.Drawing.Font("Segoe UI", 23)
  $g.DrawString($Subtitle, $subFont, $gray, 100, ($y + 18))

  $linePen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(40, 244, 242, 235), 1)
  $g.DrawLine($linePen, 96, 548, 1104, 548)

  $smallFont = New-Object System.Drawing.Font("Consolas", 15)
  $g.DrawString("osnova.studio", $smallFont, $white, 96, 566)
  $g.DrawString("Веб-студия полного цикла · Москва", $smallFont, $dim, 700, 566)

  $bmp.Save((Join-Path $out $File), [System.Drawing.Imaging.ImageFormat]::Png)
  $g.Dispose()
  $bmp.Dispose()
}

New-OgImage "home.png" "Сайты, которые приносят заявки" "Стратегия, дизайн, разработка и SEO в одной команде" "web studio · moscow"
New-OgImage "services.png" "Услуги веб-студии" "Сайты, интернет-магазины, SEO и поддержка" "услуги"
New-OgImage "razrabotka-saytov.png" "Разработка сайтов" "Корпоративные сайты, лендинги и B2B-порталы" "услуга · разработка"
New-OgImage "internet-magazin.png" "Интернет-магазины" "Каталог, оплата, доставка и интеграция с 1С" "услуга · e-commerce"
New-OgImage "seo-prodvizhenie.png" "SEO-продвижение" "Техническая база, семантика и контент" "услуга · seo"
New-OgImage "podderzhka-sayta.png" "Поддержка сайтов" "Мониторинг, обновления и развитие" "услуга · поддержка"
New-OgImage "cases.png" "Кейсы с цифрами" "Заявки, трафик и конверсия до и после" "портфолио"
New-OgImage "severny-potok.png" "Северный поток" "+62% заявок за 6 месяцев" "кейс · b2b"
New-OgImage "flora-market.png" "Flora Market" "+38% конверсии в заказ" "кейс · e-commerce"
New-OgImage "lab-7.png" "Лаборатория 7" "×3 заявок за 8 месяцев" "кейс · медицина"
New-OgImage "about.png" "О студии ОСНОВА" "Команда, принципы и процессы" "студия"
New-OgImage "blog.png" "Блог ОСНОВА" "Разработка, SEO и скорость без воды" "блог"
New-OgImage "contacts.png" "Обсудим проект" "Ответим в течение рабочего дня" "контакты"

# Apple touch icon 180x180
$icon = New-Object System.Drawing.Bitmap(180, 180)
$ig = [System.Drawing.Graphics]::FromImage($icon)
$ig.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$ibg = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(11, 13, 12))
$ig.FillRectangle($ibg, 0, 0, 180, 180)
$ipen = New-Object System.Drawing.Pen([System.Drawing.Color]::FromArgb(201, 247, 79), 7)
$ig.DrawLine($ipen, 45, 135, 45, 45)
$ig.DrawLine($ipen, 45, 45, 135, 45)
$ig.DrawLine($ipen, 135, 45, 135, 135)
$ig.DrawLine($ipen, 72, 135, 72, 72)
$ig.DrawLine($ipen, 72, 72, 108, 72)
$ig.DrawLine($ipen, 108, 72, 108, 135)
$icon.Save((Join-Path $PSScriptRoot "..\assets\apple-touch-icon.png"), [System.Drawing.Imaging.ImageFormat]::Png)
$ig.Dispose()
$icon.Dispose()

Write-Output "OG images done"
